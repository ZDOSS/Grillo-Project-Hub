import { useCallback, useEffect, useState } from "react";
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
  const [typeId, setTypeId] = useState(bundle?.project.defaultTypeId ?? "task");
  const [statusId, setStatusId] = useState("");
  const [description, setDescription] = useState("");
  const [priorityId, setPriorityId] = useState<string>("");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const navigate = useNavigate();
  const itemTypes = bundle?.core.itemTypes;
  const projectDefaultInitialStatusId = bundle?.project.defaultInitialStatusId ?? "";
  const projectDefaultTypeId = bundle?.project.defaultTypeId ?? "task";
  const projectId = bundle?.project.id;

  useEffect(() => subscribeCreateItem(setOpen), []);
  useEffect(() => subscribeCreateItemPrefill(setPrefill), []);

  const defaultStatusIdForType = useCallback((nextTypeId: string) => {
    const typeDef = itemTypes?.find((type) => type.id === nextTypeId);
    return typeDef?.defaultStatusId ?? projectDefaultInitialStatusId;
  }, [itemTypes, projectDefaultInitialStatusId]);

  const defaultPriorityIdForType = useCallback((nextTypeId: string) => {
    const typeDef = itemTypes?.find((type) => type.id === nextTypeId);
    return typeDef?.defaultPriorityId ?? "";
  }, [itemTypes]);

  useEffect(() => {
    if (!open || !projectId) return;
    const nextTypeId = prefill?.typeId ?? projectDefaultTypeId;
    setTitle("");
    setDescription("");
    setTypeId(nextTypeId);
    setStatusId(prefill?.statusId ?? defaultStatusIdForType(nextTypeId));
    setPriorityId(
      prefill && Object.prototype.hasOwnProperty.call(prefill, "priorityId")
        ? prefill.priorityId ?? ""
        : defaultPriorityIdForType(nextTypeId)
    );
    setAssigneeId(prefill?.assigneeId ?? "");
  }, [
    open,
    prefill?.assigneeId,
    prefill?.priorityId,
    prefill?.statusId,
    prefill?.typeId,
    projectDefaultTypeId,
    projectId,
    defaultPriorityIdForType,
    defaultStatusIdForType
  ]);

  if (!open || !bundle) return null;

  const types = bundle.core.itemTypes;
  const statuses = bundle.core.statuses;
  const priorities = bundle.core.priorities;
  const members = bundle.core.members.filter((member) => !member.archived);

  const changeType = (nextTypeId: string) => {
    setTypeId(nextTypeId);
    setStatusId(defaultStatusIdForType(nextTypeId));
    setPriorityId(defaultPriorityIdForType(nextTypeId));
  };

  const submit = () => {
    if (!title.trim()) return;
    const r = applyCommand({
      type: "item.create",
      projectId: bundle.project.id,
      typeId,
      title: title.trim(),
      description: description.trim(),
      statusId: statusId || undefined,
      priorityId: priorityId || null,
      assigneeId: assigneeId || null
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
              <select className="select" value={typeId} onChange={(e) => changeType(e.target.value)}>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </label>
            <label className="label label-row">
              Status
              <select className="select" value={statusId} onChange={(e) => setStatusId(e.target.value)}>
                {statuses.map((status) => (
                  <option key={status.id} value={status.id}>{status.name}</option>
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
              Assignee
              <select className="select" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                <option value="">Unassigned</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>{member.displayName}</option>
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
