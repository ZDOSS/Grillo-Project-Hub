// Tauri runtime entry. The Rust boundary is intentionally narrow:
//   - save_project / load_project / delete_project / list_projects_in_folder
//   - external-change events from a lightweight project-file watcher
//
// All other logic lives in the TypeScript shared core.

use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{atomic::{AtomicU64, Ordering}, Arc, Mutex};
use std::thread;
use std::time::Duration;
use tauri::{Emitter, Manager, State};

#[derive(Default)]
struct ProjectWatchState {
    generation: Arc<AtomicU64>,
    known_revisions: Arc<Mutex<HashMap<PathBuf, u32>>>,
}

fn content_revision(contents: &[u8]) -> u32 {
    contents.iter().fold(0x811c9dc5, |hash, byte| {
        (hash ^ u32::from(*byte)).wrapping_mul(0x01000193)
    })
}

fn file_revision(path: &Path) -> Option<u32> {
    fs::read(path).ok().map(|contents| content_revision(&contents))
}

fn key_for_project_path(path: &Path) -> Option<String> {
    path.file_name()
        .and_then(|name| name.to_str())
        .and_then(|name| name.strip_suffix(".pms.json"))
        .map(str::to_owned)
}

fn validated_project_path(path: &str) -> Result<PathBuf, String> {
    let candidate = PathBuf::from(path);
    if key_for_project_path(&candidate).is_none()
        || candidate.parent().and_then(Path::file_name).and_then(|name| name.to_str()) != Some(".pm-suite")
    {
        return Err("Project files must use a .pm-suite/<project-id>.pms.json path".to_string());
    }
    Ok(candidate)
}

fn find_renamed_project(parent: &Path, old_path: &Path, revision: u32) -> Option<PathBuf> {
    fs::read_dir(parent).ok()?.filter_map(Result::ok).find_map(|entry| {
        let candidate = entry.path();
        if candidate == old_path || key_for_project_path(&candidate).is_none() {
            return None;
        }
        (file_revision(&candidate) == Some(revision)).then_some(candidate)
    })
}

#[tauri::command]
fn save_project(path: String, contents: String, state: State<'_, ProjectWatchState>) -> Result<(), String> {
    let project_path = validated_project_path(&path)?;
    if let Some(parent) = project_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&project_path, contents.as_bytes()).map_err(|e| e.to_string())?;
    state
        .known_revisions
        .lock()
        .map_err(|_| "Project watch state is unavailable".to_string())?
        .insert(project_path, content_revision(contents.as_bytes()));
    Ok(())
}

#[tauri::command]
fn load_project(path: String) -> Result<String, String> {
    fs::read_to_string(validated_project_path(&path)?).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_project(path: String) -> Result<(), String> {
    match fs::remove_file(validated_project_path(&path)?) {
        Ok(()) => Ok(()),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn project_exists(path: String) -> bool {
    validated_project_path(&path).is_ok_and(|project_path| project_path.exists())
}

#[tauri::command]
fn list_projects_in_folder(folder: String) -> Result<Vec<String>, String> {
    let dir = PathBuf::from(&folder).join(".pm-suite");
    if !dir.exists() { return Ok(vec![]); }
    let mut out = vec![];
    for entry in fs::read_dir(dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let p = entry.path();
        if key_for_project_path(&p).is_some() {
            if let Some(name) = p.file_name().and_then(|e| e.to_str()) {
                out.push(name.to_string());
            }
        }
    }
    Ok(out)
}

#[tauri::command]
fn watch_project(
    app: tauri::AppHandle,
    path: String,
    key: String,
    state: State<'_, ProjectWatchState>,
) -> Result<(), String> {
    let generation = state.generation.fetch_add(1, Ordering::SeqCst) + 1;
    let generation_signal = Arc::clone(&state.generation);
    let known_revisions = Arc::clone(&state.known_revisions);
    let initial_path = validated_project_path(&path)?;
    let parent = initial_path
        .parent()
        .map(Path::to_path_buf)
        .ok_or_else(|| "Project path has no parent directory".to_string())?;

    if let Some(revision) = file_revision(&initial_path) {
        known_revisions
            .lock()
            .map_err(|_| "Project watch state is unavailable".to_string())?
            .insert(initial_path.clone(), revision);
    }

    thread::spawn(move || {
        let mut watched_path = initial_path;
        let mut watched_key = key;
        while generation_signal.load(Ordering::SeqCst) == generation {
            thread::sleep(Duration::from_millis(500));
            if generation_signal.load(Ordering::SeqCst) != generation {
                break;
            }

            let known_revision = known_revisions
                .lock()
                .ok()
                .and_then(|known| known.get(&watched_path).copied());
            match (known_revision, file_revision(&watched_path)) {
                (Some(previous_revision), None) => {
                    if let Some(renamed_path) = find_renamed_project(&parent, &watched_path, previous_revision) {
                        let Some(new_key) = key_for_project_path(&renamed_path) else { break };
                        if let Ok(mut known) = known_revisions.lock() {
                            known.remove(&watched_path);
                            known.insert(renamed_path.clone(), previous_revision);
                        }
                        let _ = app.emit("gph://external-change", serde_json::json!({
                            "type": "renamed",
                            "oldKey": watched_key.clone(),
                            "newKey": new_key.clone(),
                            "newRevision": previous_revision
                        }));
                        watched_path = renamed_path;
                        watched_key = new_key;
                    } else {
                        if let Ok(mut known) = known_revisions.lock() {
                            known.remove(&watched_path);
                        }
                        let _ = app.emit("gph://external-change", serde_json::json!({
                            "type": "deleted",
                            "key": watched_key.clone()
                        }));
                    }
                }
                (previous, Some(current_revision)) if previous != Some(current_revision) => {
                    if let Ok(mut known) = known_revisions.lock() {
                        known.insert(watched_path.clone(), current_revision);
                    }
                    let _ = app.emit("gph://external-change", serde_json::json!({
                        "type": "externalChange",
                        "key": watched_key.clone(),
                        "newRevision": current_revision
                    }));
                }
                _ => {}
            }
        }
    });
    Ok(())
}

#[tauri::command]
fn stop_project_watch(state: State<'_, ProjectWatchState>) {
    state.generation.fetch_add(1, Ordering::SeqCst);
}

pub fn run() {
    tauri::Builder::default()
        .manage(ProjectWatchState::default())
        .setup(|app| {
            // Main window is created from the configuration; nothing extra to do here.
            let _ = app.get_webview_window("main");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            save_project,
            load_project,
            delete_project,
            project_exists,
            list_projects_in_folder,
            watch_project,
            stop_project_watch
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::{content_revision, validated_project_path};

    #[test]
    fn content_revision_matches_the_shared_typescript_fingerprint() {
        assert_eq!(content_revision(b"hello"), 1_335_831_723);
    }

    #[test]
    fn project_commands_only_accept_pm_suite_json_paths() {
        assert!(validated_project_path("/tmp/work/.pm-suite/project_1.pms.json").is_ok());
        assert!(validated_project_path("/tmp/work/project_1.pms.json").is_err());
        assert!(validated_project_path("/tmp/work/.pm-suite/project_1.json").is_err());
        assert!(validated_project_path("/tmp/work/.pm-suite/nested/project_1.pms.json").is_err());
    }
}
