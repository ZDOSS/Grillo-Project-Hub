import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProjectStore } from "../store/project-store";
import { closeCreateItem, getCreateItemPrefill, subscribeCreateItem, subscribeCreateItemPrefill, isCreateItemOpen } from "../commands/palette-bus";

/**
 * Create-item dialog. Modal-first for focused work; opens with `C` shortcut or palette.
 */
export function CreateItemDialog() {
  const bundle = useProjectStore((s) => s.bundle);
  const applyCommand = useProjectStore((s) => s.applyCommand);
  const [open, setOpen] = useState(isCreateItemOpen());
  const [prefill, setPrefill] = useState(getCreateItemPrefill());
  const [title, setTitle] = useState("");
  const [typeId, setTypeId] = useState("task");
  const [description, setDescription] = useState("");
  const [priorityId, setPriorityId] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => subscribeCreateItem(setOpen), []);
  useEffect(() => subscribeCreateItemPrefill(setPrefill), []);

  useEffect(() => {
    if (open) {
      setTitle("");
      setDescription("");
      setPriorityId("");
      setTypeId(prefill?.typeId ?? "task");
    }
  }, [open, prefill?.typeId]);

  if (!open || !bundle) return null;

  const types = bundle.core.itemTypes;
  const priorities = bundle.core.priorities;

  const submit = () => {
    if (!title.trim()) return;
    const r = applyCommand({
      type: "item.create",
      projectId: bundle.project.id,
      typeId,
      title: title.trim(),
      description: description.trim(),
      priorityId: priorityId || null
    });
    closeCreateItem();
    const newId = r.bundle.core.items[r.bundle.core.items.length - 1].id;
    navigate(`/item/${newId}`);
  };

  return (
    <div className="modal-backdrop" onClick={() => closeCreateItem()}>
      <div className="modal" role="dialog" aria-label="Create work item" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <strong>New work item</strong>
          <button className="btn btn-ghost btn-sm" onClick={() => closeCreateItem()} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">
          <div className="col">
            <label className="label label-row">
              Type
              <select className="select" value={typeId} onChange={(e) => setTypeId(e.target.value)}>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </label>
            <label className="label label-row">
              Title
              <input
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    submit();
                  }
                }}
                placeholder="Short, action-oriented title…"
                autoFocus
              />
            </label>
            <label className="label label-row">
              Priority
              <select className="select" value={priorityId} onChange={(e) => setPriorityId(e.target.value)}>
                <option value="">No priority</option>
                {priorities.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
            <label className="label label-row">
              Description
              <textarea
                className="textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description (Markdown supported)…"
                rows={4}
              />
            </label>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={() => closeCreateItem()}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={!title.trim()}>Create</button>
        </div>
      </div>
    </div>
  );
}
