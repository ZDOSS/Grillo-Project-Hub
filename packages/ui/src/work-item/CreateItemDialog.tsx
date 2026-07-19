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
  const [milestoneId, setMilestoneId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
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
    setTitle("");
    setDescription("");
  }, [open, projectId]);

  useEffect(() => {
    if (!open || !projectId) return;
    const nextTypeId = prefill?.typeId ?? projectDefaultTypeId;
    setTypeId(nextTypeId);
    setStatusId(prefill?.statusId ?? defaultStatusIdForType(nextTypeId));
    setPriorityId(
      prefill && Object.prototype.hasOwnProperty.call(prefill, "priorityId")
        ? prefill.priorityId ?? ""
        : defaultPriorityIdForType(nextTypeId)
    );
    setAssigneeId(prefill?.assigneeId ?? "");
    setMilestoneId(prefill?.milestoneId ?? "");
    setStartDate(prefill?.startDate ?? "");
    setDueDate(prefill?.dueDate ?? "");
  }, [
    open,
    prefill?.assigneeId,
    prefill?.dueDate,
    prefill?.milestoneId,
    prefill?.priorityId,
    prefill?.startDate,
    prefill?.statusId,
    prefill?.typeId,
    projectDefaultTypeId,
    projectId,
    defaultPriorityIdForType,
    defaultStatusIdForType
  ]);

  if (!open || !bundle) return null;

  const types = bundle.core.itemTypes.filter((type) => !type.archived);
  const statuses = bundle.core.statuses.filter((status) => !status.archived);
  const priorities = bundle.core.priorities.filter((priority) => !priority.archived);
  const members = bundle.core.members.filter((member) => !member.archived);
  const milestones = bundle.core.milestones.filter((milestone) => !milestone.archived);
  const selectedTypeId = types.some((type) => type.id === typeId) ? typeId : (types[0]?.id ?? "");
  const typeWasReplaced = selectedTypeId !== typeId;
  const fallbackStatusId = defaultStatusIdForType(selectedTypeId);
  const preferredStatusId = typeWasReplaced ? fallbackStatusId : statusId;
  const selectedStatusId = statuses.some((status) => status.id === preferredStatusId)
    ? preferredStatusId
    : statuses.some((status) => status.id === fallbackStatusId)
      ? fallbackStatusId
      : (statuses[0]?.id ?? "");
  const fallbackPriorityId = defaultPriorityIdForType(selectedTypeId);
  const preferredPriorityId = typeWasReplaced ? fallbackPriorityId : priorityId;
  const selectedPriorityId = priorities.some((priority) => priority.id === preferredPriorityId)
    ? preferredPriorityId
    : priorities.some((priority) => priority.id === fallbackPriorityId)
      ? fallbackPriorityId
      : "";
  const selectedAssigneeId = members.some((member) => member.id === assigneeId) ? assigneeId : "";
  const selectedMilestoneId = milestones.some((milestone) => milestone.id === milestoneId)
    ? milestoneId
    : "";
  const invalidDateRange = Boolean(startDate && dueDate && startDate > dueDate);
  const missingWorkflowChoice = !selectedTypeId || !selectedStatusId;
  const canCreate = Boolean(title.trim()) && !invalidDateRange && !missingWorkflowChoice;

  const changeType = (nextTypeId: string) => {
    setTypeId(nextTypeId);
    setStatusId(defaultStatusIdForType(nextTypeId));
    setPriorityId(defaultPriorityIdForType(nextTypeId));
  };

  const commitFallbackType = () => {
    if (!typeWasReplaced) return;
    setTypeId(selectedTypeId);
    setStatusId(selectedStatusId);
    setPriorityId(selectedPriorityId);
  };

  const submit = () => {
    if (!canCreate) return;
    const r = applyCommand({
      type: "item.create",
      projectId: bundle.project.id,
      typeId: selectedTypeId,
      title: title.trim(),
      description: description.trim(),
      statusId: selectedStatusId,
      priorityId: selectedPriorityId || null,
      assigneeId: selectedAssigneeId || null,
      milestoneId: selectedMilestoneId || null,
      startDate: startDate || null,
      dueDate: dueDate || null
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
              <select className="select" value={selectedTypeId} onChange={(e) => changeType(e.target.value)}>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </label>
            <label className="label label-row">
              Status
              <select className="select" value={selectedStatusId} onChange={(e) => {
                commitFallbackType();
                setStatusId(e.target.value);
              }}>
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
              <select className="select" value={selectedPriorityId} onChange={(e) => {
                commitFallbackType();
                setPriorityId(e.target.value);
              }}>
                <option value="">No priority</option>
                {priorities.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
            <div className="form-grid form-grid-2">
              <label className="label">
                Start date
                <input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </label>
              <label className="label">
                Due date
                <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </label>
            </div>
            {invalidDateRange ? (
              <div className="form-error">Start date must not be later than due date.</div>
            ) : null}
            {missingWorkflowChoice ? (
              <div className="form-error">Restore at least one visible work item type and status in Settings before creating work.</div>
            ) : null}
            <label className="label label-row">
              Assignee
              <select className="select" value={selectedAssigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                <option value="">Unassigned</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>{member.displayName}</option>
                ))}
              </select>
            </label>
            <label className="label label-row">
              Milestone
              <select className="select" value={selectedMilestoneId} onChange={(e) => setMilestoneId(e.target.value)}>
                <option value="">No milestone</option>
                {milestones.map((milestone) => (
                  <option key={milestone.id} value={milestone.id}>{milestone.name}</option>
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
          <button className="btn btn-primary" onClick={submit} disabled={!canCreate}>Create</button>
        </div>
      </div>
    </div>
  );
}
