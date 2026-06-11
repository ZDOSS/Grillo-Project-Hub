// Tauri main entry. The Rust boundary is intentionally narrow:
//   - save_project / load_project / choose_folder
//   - external_change events when the OS filesystem watcher fires
//
// All other logic lives in the TypeScript shared core.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::PathBuf;
use tauri::Manager;

#[tauri::command]
fn save_project(path: String, contents: String) -> Result<(), String> {
    if let Some(parent) = std::path::Path::new(&path).parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&path, contents).map_err(|e| e.to_string())
}

#[tauri::command]
fn load_project(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn project_exists(path: String) -> bool {
    PathBuf::from(&path).exists()
}

#[tauri::command]
fn list_projects_in_folder(folder: String) -> Result<Vec<String>, String> {
    let dir = PathBuf::from(&folder).join(".pm-suite");
    if !dir.exists() { return Ok(vec![]); }
    let mut out = vec![];
    for entry in fs::read_dir(dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let p = entry.path();
        if p.extension().and_then(|e| e.to_str()) == Some("json") {
            if let Some(name) = p.file_name().and_then(|e| e.to_str()) {
                out.push(name.to_string());
            }
        }
    }
    Ok(out)
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            // Main window is created from the configuration; nothing extra to do here.
            let _ = app.get_webview_window("main");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            save_project,
            load_project,
            project_exists,
            list_projects_in_folder
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
