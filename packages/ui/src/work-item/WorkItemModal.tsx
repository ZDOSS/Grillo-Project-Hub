import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useProjectStore } from "../store/project-store";
import { getBugData, setBugData, type WorkItem, type BugItemData, type Relationship, type Attachment, type Reminder } from "@gph/core";
import { ConfirmDialog, InlineAlert, Modal } from "../components";
import { AttachmentPanel } from "./AttachmentPanel";
import { formatReminderDateTime, ReminderPanel } from "./ReminderPanel";

type RelationshipDraftType = "blocks" | "blockedBy" | "relatesTo";

const EMPTY_ITEMS: WorkItem[] = [];
const EMPTY_RELATIONSHIPS: Relationship[] = [];
const EMPTY_ATTACHMENTS: Attachment[] = [];
const EMPTY_REMINDERS: Reminder[] = [];

/**
 * Work-item detail route implementation.
 *
 *  - Opens when route is /item/:itemId
 *  - Edits title, description, status, priority, type, assignee, milestone, dates, labels
 *  - Edits bug-module data (severity, reproduction steps, expected/actual, environment, version) when applicable
 *  - Manages checklist, comments, relationships, attachments, activity
 *  - Subtask creation, conversion from checklist, archive/trash
 */
export function WorkItemModal() {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const bundle = useProjectStore((s) => s.bundle);
  const applyCommand = useProjectStore((s) => s.applyCommand);

  const item = useMemo<WorkItem | null>(() => {
    if (!bundle || !itemId) return null;
    return bundle.core.items.find((i) => i.id === itemId) ?? null;
  }, [bundle, itemId]);

  const [title, setTitle] = useState(item?.title ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [checklistText, setChecklistText] = useState("");
  const [commentText, setCommentText] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentBody, setEditingCommentBody] = useState("");
  const [relationshipType, setRelationshipType] = useState<RelationshipDraftType>("blocks");
  const [relationshipTargetId, setRelationshipTargetId] = useState("");
  const [relationshipError, setRelationshipError] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    setTitle(item?.title ?? "");
    setDescription(item?.description ?? "");
    setEditingCommentId(null);
    setEditingCommentBody("");
    setRelationshipTargetId("");
    setRelationshipError(null);
    setConfirmDeleteOpen(false);
  }, [item?.id]);

  const items = bundle?.core.items ?? EMPTY_ITEMS;
  const relationships = bundle?.core.relationships ?? EMPTY_RELATIONSHIPS;
  const itemIdForRelationships = item?.id ?? "";
  const itemsById = useMemo(
    () => new Map(items.map((entry) => [entry.id, entry])),
    [items]
  );
  const availableRelationshipTargets = useMemo(
    () =>
      items.filter(
        (candidate) =>
          candidate.id !== itemIdForRelationships &&
          !candidate.archived &&
          !candidate.trashedAt
      ),
    [items, itemIdForRelationships]
  );
  const activeRelationships = useMemo(
    () => relationships.filter((relationship) => !relationship.archived),
    [relationships]
  );
  const itemAttachments = useMemo(
    () =>
      (bundle?.core.attachments ?? EMPTY_ATTACHMENTS).filter(
        (attachment) =>
          !attachment.archived &&
          attachment.itemId === itemIdForRelationships
      ),
    [bundle?.core.attachments, itemIdForRelationships]
  );
  const itemReminders = useMemo(
    () =>
      (bundle?.core.reminders ?? EMPTY_REMINDERS)
        .filter(
          (reminder) =>
            !reminder.archived &&
            reminder.targetType === "workItem" &&
            reminder.targetId === itemIdForRelationships
        )
        .sort((a, b) => Date.parse(a.remindAt) - Date.parse(b.remindAt)),
    [bundle?.core.reminders, itemIdForRelationships]
  );
  const nextReminder = useMemo(() => {
    const now = Date.now();
    return itemReminders.find((reminder) => Date.parse(reminder.remindAt) >= now) ?? itemReminders[0] ?? null;
  }, [itemReminders]);
  const blocksRelationships = useMemo(
    () =>
      activeRelationships.filter(
        (relationship) =>
          relationship.type === "blocks" &&
          relationship.sourceItemId === itemIdForRelationships
      ),
    [activeRelationships, itemIdForRelationships]
  );
  const blockedByRelationships = useMemo(
    () =>
      activeRelationships.filter(
        (relationship) =>
          relationship.type === "blocks" &&
          relationship.targetItemId === itemIdForRelationships
      ),
    [activeRelationships, itemIdForRelationships]
  );
  const relatedRelationships = useMemo(
    () =>
      activeRelationships.filter(
        (relationship) =>
          relationship.type === "relatesTo" &&
          (relationship.sourceItemId === itemIdForRelationships ||
            relationship.targetItemId === itemIdForRelationships)
      ),
    [activeRelationships, itemIdForRelationships]
  );

  const close = () => navigate(-1);

  if (!bundle || !itemId) return null;
  if (!item) {
    return (
      <Modal
        title="Item not found"
        onClose={close}
        footer={<button className="btn btn-ghost" onClick={close}>Close</button>}
      >
        <p className="text-sm text-muted">This work item no longer exists.</p>
      </Modal>
    );
  }

  const statuses = bundle.core.statuses;
  const priorities = bundle.core.priorities;
  const types = bundle.core.itemTypes;
  const members = bundle.core.members;
  const labels = bundle.core.labels;
  const milestones = bundle.core.milestones;

  const bugModule = bundle.modules["builtin.bugs"];
  const applicableBugTypes: string[] = (bugModule?.config?.applicableTypeIds as string[]) ?? [];
  const severities = (bugModule?.config?.severities as Array<{ id: string; name: string; rank: number; color?: string | null }>) ?? [];
  const isBug = applicableBugTypes.includes(item.typeId);
  const bugData = getBugData(item);

  const saveField = (patch: Record<string, unknown>) => {
    applyCommand({ type: "item.update", projectId: bundle.project.id, itemId: item.id, patch });
  };

  const saveTitle = () => {
    if (title.trim() !== item.title) saveField({ title: title.trim() });
  };
  const saveDescription = () => {
    if (description !== item.description) saveField({ description });
  };

  const saveBugData = (next: BugItemData) => {
    const updated = setBugData(item, next);
    // route through generic update by setting moduleData
    applyCommand({
      type: "item.update",
      projectId: bundle.project.id,
      itemId: item.id,
      patch: { moduleData: updated.moduleData }
    });
  };

  const startCommentEdit = (commentId: string, body: string) => {
    setEditingCommentId(commentId);
    setEditingCommentBody(body);
  };

  const saveCommentEdit = () => {
    if (!editingCommentId || !editingCommentBody.trim()) return;
    const comment = item.comments.find((entry) => entry.id === editingCommentId);
    if (!comment) return;
    if (editingCommentBody === comment.body) return;
    applyCommand({
      type: "comment.edit",
      projectId: bundle.project.id,
      itemId: item.id,
      commentId: editingCommentId,
      body: editingCommentBody
    });
    setEditingCommentId(null);
    setEditingCommentBody("");
  };

  const addRelationship = () => {
    if (!relationshipTargetId) return;
    const sourceItemId = relationshipType === "blockedBy" ? relationshipTargetId : item.id;
    const targetItemId = relationshipType === "blockedBy" ? item.id : relationshipTargetId;
    try {
      applyCommand({
        type: "relationship.create",
        projectId: bundle.project.id,
        relationshipType: relationshipType === "relatesTo" ? "relatesTo" : "blocks",
        sourceItemId,
        targetItemId
      });
      setRelationshipTargetId("");
      setRelationshipError(null);
    } catch (error) {
      setRelationshipError(error instanceof Error ? error.message : "Could not add relationship");
    }
  };

  const removeRelationship = (relationshipId: string) => {
    try {
      applyCommand({ type: "relationship.delete", projectId: bundle.project.id, relationshipId });
      setRelationshipError(null);
    } catch (error) {
      setRelationshipError(error instanceof Error ? error.message : "Could not remove relationship");
    }
  };

  const addAttachment = (input: {
    dataUri: string | null;
    filename: string;
    mediaType: string;
    size: number;
  }) => {
    applyCommand({
      type: "attachment.add",
      projectId: bundle.project.id,
      itemId: item.id,
      filename: input.filename,
      mediaType: input.mediaType,
      size: input.size,
      dataUri: input.dataUri,
      storagePath: null
    });
  };

  const deleteAttachment = (attachmentId: string) => {
    applyCommand({ type: "attachment.delete", projectId: bundle.project.id, attachmentId });
  };

  const createReminder = (input: { message: string | null; remindAt: string; timeZone: string }) => {
    applyCommand({
      type: "reminder.create",
      projectId: bundle.project.id,
      targetType: "workItem",
      targetId: item.id,
      remindAt: input.remindAt,
      timeZone: input.timeZone,
      message: input.message
    });
  };

  const updateReminder = (
    reminderId: string,
    patch: { message: string | null; remindAt: string; timeZone: string }
  ) => {
    applyCommand({
      type: "reminder.update",
      projectId: bundle.project.id,
      reminderId,
      patch
    });
  };

  const deleteReminder = (reminderId: string) => {
    applyCommand({ type: "reminder.delete", projectId: bundle.project.id, reminderId });
  };

  const modalFooter = (
    <div className="item-detail-footer">
      <div className="row">
        <button className="btn btn-sm" onClick={() => {
          applyCommand({ type: "item.archive", projectId: bundle.project.id, itemId: item.id });
          close();
        }}>Archive</button>
        <button className="btn btn-sm" onClick={() => {
          applyCommand({ type: "item.trash", projectId: bundle.project.id, itemId: item.id });
          close();
        }}>Move to trash</button>
        <button className="btn btn-sm btn-danger" onClick={() => setConfirmDeleteOpen(true)}>Delete...</button>
      </div>
      <div className="row">
        <button className="btn btn-sm" onClick={() => {
          const r = applyCommand({ type: "item.duplicate", projectId: bundle.project.id, itemId: item.id });
          const newId = r.bundle.core.items[r.bundle.core.items.length - 1].id;
          navigate(`/item/${newId}`);
        }}>Duplicate</button>
        <button className="btn btn-sm btn-primary" onClick={close}>Done</button>
      </div>
    </div>
  );

  return (
    <>
      <Modal
        closeOnEscape={!confirmDeleteOpen}
        label={`Work item: ${item.title}`}
        onClose={close}
      size="work-item"
      title="Work item"
      footer={modalFooter}
    >
        <div className="item-detail-titlebar">
          <div className="col" style={{ gap: 2, flex: 1 }}>
            <span className="text-xs text-muted">
              {types.find((t) => t.id === item.typeId)?.name ?? "Item"} · #{item.id.slice(-6)}
            </span>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  saveTitle();
                  (e.target as HTMLInputElement).blur();
                }
              }}
              aria-label="Title"
              style={{ fontSize: "var(--font-size-lg)", fontWeight: 600 }}
            />
          </div>
        </div>

        <div className="item-detail-scroll">
          <div className="item-detail">
            <div className="item-detail-section">
              <div className="item-detail-grid">
                <label className="label label-row">
                  Status
                  <select className="select" value={item.statusId} onChange={(e) => saveField({ statusId: e.target.value })}>
                    {statuses.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </label>
                <label className="label label-row">
                  Priority
                  <select className="select" value={item.priorityId ?? ""} onChange={(e) => saveField({ priorityId: e.target.value || null })}>
                    <option value="">No priority</option>
                    {priorities.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.rank})</option>
                    ))}
                  </select>
                </label>
                <label className="label label-row">
                  Type
                  <select className="select" value={item.typeId} onChange={(e) => saveField({ typeId: e.target.value })}>
                    {types.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </label>
                <label className="label label-row">
                  Assignee
                  <select className="select" value={item.assigneeId ?? ""} onChange={(e) => saveField({ assigneeId: e.target.value || null })}>
                    <option value="">Unassigned</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>{m.displayName}</option>
                    ))}
                  </select>
                </label>
                <label className="label label-row">
                  Milestone
                  <select className="select" value={item.milestoneId ?? ""} onChange={(e) => saveField({ milestoneId: e.target.value || null })}>
                    <option value="">None</option>
                    {milestones.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </label>
                <label className="label label-row">
                  Start
                  <input className="input" type="date" value={item.startDate ?? ""} onChange={(e) => saveField({ startDate: e.target.value || null })} />
                </label>
                <label className="label label-row">
                  Due
                  <input className="input" type="date" value={item.dueDate ?? ""} onChange={(e) => saveField({ dueDate: e.target.value || null })} />
                </label>
                <label className="label label-row">
                  Labels
                  <select
                    className="select"
                    multiple
                    value={item.labelIds}
                    onChange={(e) => {
                      const opts = Array.from(e.target.selectedOptions).map((o) => o.value);
                      saveField({ labelIds: opts });
                    }}
                    style={{ minHeight: 80 }}
                  >
                    {labels.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="item-detail-reminder-summary">
                {nextReminder ? (
                  <>
                    <span className="tag tag-info">Next reminder: {formatReminderDateTime(nextReminder.remindAt)}</span>
                    {nextReminder.message && <span className="text-sm">{nextReminder.message}</span>}
                  </>
                ) : (
                  <span className="tag">No reminder scheduled</span>
                )}
              </div>
            </div>

            <div className="item-detail-section">
              <h3>Description</h3>
              <textarea
                className="textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={saveDescription}
                placeholder="Use Markdown for rich content…"
                rows={6}
              />
            </div>

            {isBug && (
              <div className="item-detail-section">
                <h3>Bug Report</h3>
                <div className="col" style={{ gap: 8 }}>
                  <label className="label label-row">
                    Severity
                    <select
                      className="select"
                      value={bugData?.severityId ?? ""}
                      onChange={(e) => saveBugData({
                        severityId: e.target.value || null,
                        reproductionSteps: bugData?.reproductionSteps ?? [],
                        expectedBehavior: bugData?.expectedBehavior ?? "",
                        actualBehavior: bugData?.actualBehavior ?? "",
                        environment: bugData?.environment ?? "",
                        affectedVersion: bugData?.affectedVersion ?? null
                      })}
                    >
                      <option value="">Unassessed</option>
                      {severities.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="label">Reproduction steps</label>
                  {(bugData?.reproductionSteps ?? []).map((s, idx) => (
                    <div key={s.id} className="row" style={{ gap: 4 }}>
                      <span className="text-xs text-muted">{idx + 1}.</span>
                      <input
                        className="input"
                        value={s.text}
                        onChange={(e) => {
                          const next = [...(bugData?.reproductionSteps ?? [])];
                          next[idx] = { ...next[idx], text: e.target.value };
                          saveBugData({
                            severityId: bugData?.severityId ?? null,
                            reproductionSteps: next,
                            expectedBehavior: bugData?.expectedBehavior ?? "",
                            actualBehavior: bugData?.actualBehavior ?? "",
                            environment: bugData?.environment ?? "",
                            affectedVersion: bugData?.affectedVersion ?? null
                          });
                        }}
                      />
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          const next = (bugData?.reproductionSteps ?? []).filter((_, i) => i !== idx);
                          saveBugData({
                            severityId: bugData?.severityId ?? null,
                            reproductionSteps: next,
                            expectedBehavior: bugData?.expectedBehavior ?? "",
                            actualBehavior: bugData?.actualBehavior ?? "",
                            environment: bugData?.environment ?? "",
                            affectedVersion: bugData?.affectedVersion ?? null
                          });
                        }}
                      >✕</button>
                    </div>
                  ))}
                  <button
                    className="btn btn-sm"
                    onClick={() => {
                      const next = [
                        ...(bugData?.reproductionSteps ?? []),
                        { id: `step_${Date.now().toString(36)}`, text: "", order: ((bugData?.reproductionSteps?.length ?? 0) + 1) * 1024 }
                      ];
                      saveBugData({
                        severityId: bugData?.severityId ?? null,
                        reproductionSteps: next,
                        expectedBehavior: bugData?.expectedBehavior ?? "",
                        actualBehavior: bugData?.actualBehavior ?? "",
                        environment: bugData?.environment ?? "",
                        affectedVersion: bugData?.affectedVersion ?? null
                      });
                    }}
                  >+ Add step</button>
                  <label className="label label-row">Expected</label>
                  <textarea className="textarea" rows={2} value={bugData?.expectedBehavior ?? ""} onChange={(e) => saveBugData({
                    severityId: bugData?.severityId ?? null,
                    reproductionSteps: bugData?.reproductionSteps ?? [],
                    expectedBehavior: e.target.value,
                    actualBehavior: bugData?.actualBehavior ?? "",
                    environment: bugData?.environment ?? "",
                    affectedVersion: bugData?.affectedVersion ?? null
                  })} />
                  <label className="label label-row">Actual</label>
                  <textarea className="textarea" rows={2} value={bugData?.actualBehavior ?? ""} onChange={(e) => saveBugData({
                    severityId: bugData?.severityId ?? null,
                    reproductionSteps: bugData?.reproductionSteps ?? [],
                    expectedBehavior: bugData?.expectedBehavior ?? "",
                    actualBehavior: e.target.value,
                    environment: bugData?.environment ?? "",
                    affectedVersion: bugData?.affectedVersion ?? null
                  })} />
                  <label className="label label-row">Environment</label>
                  <textarea className="textarea" rows={2} value={bugData?.environment ?? ""} onChange={(e) => saveBugData({
                    severityId: bugData?.severityId ?? null,
                    reproductionSteps: bugData?.reproductionSteps ?? [],
                    expectedBehavior: bugData?.expectedBehavior ?? "",
                    actualBehavior: bugData?.actualBehavior ?? "",
                    environment: e.target.value,
                    affectedVersion: bugData?.affectedVersion ?? null
                  })} />
                  <label className="label label-row">Affected version</label>
                  <input className="input" value={bugData?.affectedVersion ?? ""} onChange={(e) => saveBugData({
                    severityId: bugData?.severityId ?? null,
                    reproductionSteps: bugData?.reproductionSteps ?? [],
                    expectedBehavior: bugData?.expectedBehavior ?? "",
                    actualBehavior: bugData?.actualBehavior ?? "",
                    environment: bugData?.environment ?? "",
                    affectedVersion: e.target.value || null
                  })} />
                </div>
              </div>
            )}

            <div className="item-detail-section">
              <h3>Checklist ({item.checklist.filter((c) => c.completed).length}/{item.checklist.length})</h3>
              <div className="col" style={{ gap: 4 }}>
                {item.checklist.map((entry) => (
                  <div key={entry.id} className="checklist-row" data-completed={entry.completed}>
                    <input
                      type="checkbox"
                      checked={entry.completed}
                      onChange={() => applyCommand({ type: "item.toggleChecklistEntry", projectId: bundle.project.id, itemId: item.id, entryId: entry.id })}
                    />
                    <span style={{ flex: 1 }}>{entry.text}</span>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => applyCommand({ type: "item.convertChecklistToSubtask", projectId: bundle.project.id, itemId: item.id, entryId: entry.id })}
                      disabled={item.parentId !== null}
                      title={item.parentId !== null ? "Item is already a subtask" : "Convert to subtask"}
                    >↗ Subtask</button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        // soft delete: re-add as a removed entry by not persisting deletion in MVP, just hide via filter
                        // For MVP we just don't add delete command; user can complete the entry instead
                        // Better: implement delete via removeFromList
                        const next = item.checklist.filter((c) => c.id !== entry.id);
                        applyCommand({
                          type: "item.update",
                          projectId: bundle.project.id,
                          itemId: item.id,
                          patch: { checklist: next }
                        });
                      }}
                      aria-label="Delete checklist entry"
                    >✕</button>
                  </div>
                ))}
                <div className="row" style={{ gap: 4, marginTop: 4 }}>
                  <input
                    className="input"
                    value={checklistText}
                    onChange={(e) => setChecklistText(e.target.value)}
                    placeholder="Add checklist item…"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && checklistText.trim()) {
                        applyCommand({ type: "item.addChecklistEntry", projectId: bundle.project.id, itemId: item.id, text: checklistText.trim() });
                        setChecklistText("");
                      }
                    }}
                  />
                  <button
                    className="btn btn-sm"
                    onClick={() => {
                      if (!checklistText.trim()) return;
                      applyCommand({ type: "item.addChecklistEntry", projectId: bundle.project.id, itemId: item.id, text: checklistText.trim() });
                      setChecklistText("");
                    }}
                  >Add</button>
                </div>
              </div>
            </div>

            {item.parentId && (
              <div className="item-detail-section">
                <h3>Parent</h3>
                <ParentLink parentId={item.parentId} />
              </div>
            )}

            <div className="item-detail-section">
              <h3>Subtasks</h3>
              <SubtaskList itemId={item.id} />
              <AddSubtask parentId={item.id} disabled={item.parentId !== null} />
            </div>

            <div className="item-detail-section">
              <h3>Relationships</h3>
              <div className="relationship-layout">
                <div className="relationship-groups">
                  <RelationshipGroup
                    emptyLabel="No blocked items"
                    getItemId={(relationship) => relationship.targetItemId}
                    itemsById={itemsById}
                    onRemove={removeRelationship}
                    relationships={blocksRelationships}
                    title="Blocks"
                  />
                  <RelationshipGroup
                    emptyLabel="No blockers"
                    getItemId={(relationship) => relationship.sourceItemId}
                    itemsById={itemsById}
                    onRemove={removeRelationship}
                    relationships={blockedByRelationships}
                    title="Blocked by"
                  />
                  <RelationshipGroup
                    emptyLabel="No related items"
                    getItemId={(relationship) =>
                      relationship.sourceItemId === item.id ? relationship.targetItemId : relationship.sourceItemId
                    }
                    itemsById={itemsById}
                    onRemove={removeRelationship}
                    relationships={relatedRelationships}
                    title="Related"
                  />
                </div>
                <div className="relationship-form">
                  <label className="label">
                    Relationship type
                    <select
                      className="select"
                      value={relationshipType}
                      onChange={(event) => setRelationshipType(event.target.value as RelationshipDraftType)}
                    >
                      <option value="blocks">Blocks</option>
                      <option value="blockedBy">Blocked by</option>
                      <option value="relatesTo">Relates to</option>
                    </select>
                  </label>
                  <label className="label">
                    Relationship target
                    <select
                      className="select"
                      value={relationshipTargetId}
                      onChange={(event) => setRelationshipTargetId(event.target.value)}
                    >
                      <option value="">Select an item</option>
                      {availableRelationshipTargets.map((candidate) => (
                        <option key={candidate.id} value={candidate.id}>
                          {candidate.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="btn btn-sm"
                    disabled={!relationshipTargetId}
                    onClick={addRelationship}
                  >
                    Add relationship
                  </button>
                </div>
                {relationshipError && <InlineAlert tone="danger">{relationshipError}</InlineAlert>}
              </div>
            </div>

            <div className="item-detail-section">
              <h3>Attachments</h3>
              <AttachmentPanel
                attachments={itemAttachments}
                onAddAttachment={addAttachment}
                onDeleteAttachment={deleteAttachment}
              />
            </div>

            <div className="item-detail-section">
              <h3>Reminders</h3>
              <ReminderPanel
                onCreateReminder={createReminder}
                onDeleteReminder={deleteReminder}
                onUpdateReminder={updateReminder}
                reminders={itemReminders}
              />
            </div>

            <div className="item-detail-section">
              <h3>Comments</h3>
              <div className="col" style={{ gap: 8 }}>
                {item.comments.filter((c) => !c.deleted).map((c) => (
                  <div key={c.id} className="comment">
                    <div className="comment-meta">
                      <span>{members.find((m) => m.id === c.authorId)?.displayName ?? "Anonymous"}</span>
                      <span>·</span>
                      <span>{new Date(c.createdAt).toLocaleString()}</span>
                      {c.updatedAt !== c.createdAt && <span className="tag">edited</span>}
                    </div>
                    {editingCommentId === c.id ? (
                      <>
                        <textarea
                          aria-label="Edit comment"
                          className="textarea"
                          rows={3}
                          value={editingCommentBody}
                          onChange={(event) => setEditingCommentBody(event.target.value)}
                        />
                        <div className="row" style={{ gap: 4 }}>
                          <button
                            className="btn btn-primary btn-sm"
                            disabled={!editingCommentBody.trim() || editingCommentBody === c.body}
                            onClick={saveCommentEdit}
                          >
                            Save comment
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => {
                              setEditingCommentId(null);
                              setEditingCommentBody("");
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="comment-body">{c.body}</div>
                        <div className="row" style={{ gap: 4 }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => startCommentEdit(c.id, c.body)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => applyCommand({ type: "comment.delete", projectId: bundle.project.id, itemId: item.id, commentId: c.id })}
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                <div className="row" style={{ gap: 4 }}>
                  <textarea
                    aria-label="New comment"
                    className="textarea"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Write a comment (Markdown supported)…"
                    rows={3}
                  />
                </div>
                <div className="row" style={{ justifyContent: "flex-end" }}>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      if (!commentText.trim()) return;
                      applyCommand({ type: "comment.create", projectId: bundle.project.id, itemId: item.id, body: commentText.trim() });
                      setCommentText("");
                    }}
                  >Comment</button>
                </div>
              </div>
            </div>

            <div className="item-detail-section">
              <h3>Activity</h3>
              <div className="col" style={{ gap: 4 }}>
                {bundle.core.events
                  .filter((e) => e.itemId === item.id)
                  .slice(-20)
                  .reverse()
                  .map((e) => (
                    <div key={e.id} className="text-xs text-secondary">
                      <span className="mono">{e.type}</span> · {new Date(e.at).toLocaleString()} · <span className="text-muted">{e.source}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>

      </Modal>
      {confirmDeleteOpen && (
        <ConfirmDialog
          destructive
          confirmLabel="Delete item"
          message="This permanently removes the item, its comments, relationships, reminders, attachments, and document links. This cannot be undone."
          onCancel={() => setConfirmDeleteOpen(false)}
          onConfirm={() => {
            applyCommand({
              type: "item.permanentlyDelete",
              projectId: bundle.project.id,
              itemId: item.id
            });
            setConfirmDeleteOpen(false);
            close();
          }}
          title="Permanently delete work item"
        />
      )}
    </>
  );
}

function ParentLink({ parentId }: { parentId: string }) {
  const bundle = useProjectStore((s) => s.bundle);
  const parent = bundle?.core.items.find((i) => i.id === parentId);
  if (!parent) return <div className="text-muted text-sm">Parent not found</div>;
  return <Link to={`/item/${parent.id}`} className="tag tag-info">{parent.title}</Link>;
}

function SubtaskList({ itemId }: { itemId: string }) {
  const bundle = useProjectStore((s) => s.bundle);
  const children = bundle?.core.items.filter((i) => i.parentId === itemId && !i.trashedAt) ?? [];
  if (children.length === 0) return <div className="text-muted text-sm">No subtasks</div>;
  return (
    <div className="col" style={{ gap: 4 }}>
      {children.map((c) => (
        <Link key={c.id} to={`/item/${c.id}`} className="tag tag-info">{c.title}</Link>
      ))}
    </div>
  );
}

function RelationshipGroup({
  emptyLabel,
  getItemId,
  itemsById,
  onRemove,
  relationships,
  title
}: {
  emptyLabel: string;
  getItemId: (relationship: Relationship) => string;
  itemsById: Map<string, WorkItem>;
  onRemove: (relationshipId: string) => void;
  relationships: Relationship[];
  title: string;
}) {
  return (
    <div className="relationship-group">
      <div className="relationship-group-title">{title}</div>
      {relationships.length === 0 ? (
        <div className="text-muted text-sm">{emptyLabel}</div>
      ) : (
        <div className="relationship-list">
          {relationships.map((relationship) => {
            const relatedItem = itemsById.get(getItemId(relationship));
            const itemTitle = relatedItem?.title ?? "Unknown item";
            return (
              <div key={relationship.id} className="relationship-item">
                {relatedItem ? (
                  <Link to={`/item/${relatedItem.id}`} className="tag tag-info">
                    {itemTitle}
                  </Link>
                ) : (
                  <span className="tag">{itemTitle}</span>
                )}
                <button
                  aria-label={`Remove relationship to ${itemTitle}`}
                  className="btn btn-ghost btn-sm"
                  onClick={() => onRemove(relationship.id)}
                >
                  Remove
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AddSubtask({ parentId, disabled }: { parentId: string; disabled: boolean }) {
  const bundle = useProjectStore((s) => s.bundle);
  const applyCommand = useProjectStore((s) => s.applyCommand);
  const [text, setText] = useState("");
  if (!bundle) return null;
  return (
    <div className="row" style={{ gap: 4, marginTop: 6 }}>
      <input
        className="input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={disabled ? "Already a subtask" : "Add subtask…"}
        disabled={disabled}
        onKeyDown={(e) => {
          if (e.key === "Enter" && text.trim()) {
            applyCommand({ type: "item.create", projectId: bundle.project.id, typeId: bundle.project.defaultTypeId, title: text.trim(), parentId });
            setText("");
          }
        }}
      />
      <button
        className="btn btn-sm"
        disabled={disabled || !text.trim()}
        onClick={() => {
          if (!text.trim()) return;
          applyCommand({ type: "item.create", projectId: bundle.project.id, typeId: bundle.project.defaultTypeId, title: text.trim(), parentId });
          setText("");
        }}
      >Add</button>
    </div>
  );
}
