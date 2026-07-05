import { useMemo, useState } from "react";
import { dispatchCommand, envelopeFor, type AutomationAction, type AutomationCondition, type AutomationRule, type AutomationTrigger } from "@gph/core";
import { InlineAlert } from "../../components";
import { useProjectStore } from "../../store/project-store";

type ActionChoice = "setPriority" | "addLabel" | "removeLabel" | "moveToStatus" | "assignMilestone" | "createSubtask" | "generateDoc";
type PreviewOutput = {
  matched: boolean;
  ruleName: string;
  actions: Array<{ type: string; summary: string }>;
  reason?: string;
};

export function AutomationSettings() {
  const bundle = useProjectStore((s) => s.bundle);
  const applyCommand = useProjectStore((s) => s.applyCommand);
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState<AutomationTrigger["type"]>("item.created");
  const [conditionTypeId, setConditionTypeId] = useState("");
  const [actionChoice, setActionChoice] = useState<ActionChoice>("addLabel");
  const [actionLabelId, setActionLabelId] = useState("");
  const [actionStatusId, setActionStatusId] = useState("");
  const [actionPriorityId, setActionPriorityId] = useState("");
  const [actionMilestoneId, setActionMilestoneId] = useState("");
  const [actionTitle, setActionTitle] = useState("");
  const [previewItemId, setPreviewItemId] = useState("");
  const [preview, setPreview] = useState<PreviewOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeItems = useMemo(() => bundle?.core.items.filter((item) => !item.trashedAt && !item.archived) ?? [], [bundle?.core.items]);

  if (!bundle) return null;

  const rules = (((bundle.modules["builtin.automation"]?.data as { rules?: AutomationRule[] } | undefined)?.rules) ?? []);
  const labels = bundle.core.labels.filter((label) => !label.archived);
  const statuses = bundle.core.statuses.filter((status) => !status.archived);
  const milestones = bundle.core.milestones.filter((milestone) => !milestone.archived);
  const conditionTypeValue = conditionTypeId || bundle.project.defaultTypeId;
  const labelValue = actionLabelId || labels[0]?.id || "";
  const statusValue = actionStatusId || bundle.project.defaultInitialStatusId;
  const priorityValue = actionPriorityId || bundle.core.priorities.find((priority) => !priority.archived)?.id || "";
  const milestoneValue = actionMilestoneId || milestones[0]?.id || "";
  const previewValue = previewItemId || activeItems[0]?.id || "";

  const buildRule = () => {
    const conditions: AutomationCondition[] = conditionTypeValue
      ? [{ type: "type.isOneOf", typeIds: [conditionTypeValue] }]
      : [];
    const actions: AutomationAction[] = [buildAction(actionChoice, {
      labelId: labelValue,
      statusId: statusValue,
      priorityId: priorityValue,
      milestoneId: milestoneValue,
      title: actionTitle
    })];
    return {
      name: name.trim(),
      trigger: { type: triggerType } as AutomationTrigger,
      conditions,
      actions
    };
  };

  const previewRule = () => {
    setError(null);
    try {
      const result = dispatchCommand(
        bundle,
        envelopeFor({
          type: "automationRule.dryRun",
          projectId: bundle.project.id,
          rule: buildRule(),
          itemId: previewValue || undefined
        }, "ui", null)
      );
      setPreview(result.output as PreviewOutput);
    } catch (err) {
      setPreview(null);
      setError(err instanceof Error ? err.message : "Unable to preview automation rule.");
    }
  };

  const saveRule = () => {
    setError(null);
    try {
      applyCommand({
        type: "automationRule.create",
        projectId: bundle.project.id,
        rule: buildRule()
      });
      setName("");
      setPreview(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save automation rule.");
    }
  };

  return (
    <div className="col" style={{ gap: 16, maxWidth: 980 }}>
      <div className="settings-panel">
        <h3>Automation rules</h3>
        <p className="text-sm text-secondary" style={{ marginTop: 0 }}>
          Rules run through the same command dispatcher as normal UI actions.
        </p>
        <div className="settings-grid settings-grid-automation">
          <label className="label">
            Rule name
            <input className="input" value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="label">
            Automation trigger
            <select className="select" value={triggerType} onChange={(event) => setTriggerType(event.target.value as AutomationTrigger["type"])}>
              <option value="item.created">Item created</option>
              <option value="item.updated">Item updated</option>
              <option value="item.statusChanged">Status changed</option>
              <option value="dueDate.changed">Due date changed</option>
              <option value="milestone.assigned">Milestone assigned</option>
            </select>
          </label>
          <label className="label">
            Condition type
            <select className="select" value={conditionTypeValue} onChange={(event) => setConditionTypeId(event.target.value)}>
              {bundle.core.itemTypes.filter((type) => !type.archived).map((type) => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
          </label>
          <label className="label">
            Automation action
            <select className="select" value={actionChoice} onChange={(event) => setActionChoice(event.target.value as ActionChoice)}>
              <option value="addLabel">Add label</option>
              <option value="removeLabel">Remove label</option>
              <option value="setPriority">Set priority</option>
              <option value="moveToStatus">Move status</option>
              <option value="assignMilestone">Assign milestone</option>
              <option value="createSubtask">Create subtask</option>
              <option value="generateDoc">Generate doc</option>
            </select>
          </label>
          {actionChoice === "addLabel" || actionChoice === "removeLabel" ? (
            <label className="label">
              Action label
              <select className="select" value={labelValue} onChange={(event) => setActionLabelId(event.target.value)}>
                {labels.map((label) => (
                  <option key={label.id} value={label.id}>{label.name}</option>
                ))}
              </select>
            </label>
          ) : null}
          {actionChoice === "moveToStatus" ? (
            <label className="label">
              Action status
              <select className="select" value={statusValue} onChange={(event) => setActionStatusId(event.target.value)}>
                {statuses.map((status) => (
                  <option key={status.id} value={status.id}>{status.name}</option>
                ))}
              </select>
            </label>
          ) : null}
          {actionChoice === "setPriority" ? (
            <label className="label">
              Action priority
              <select className="select" value={priorityValue} onChange={(event) => setActionPriorityId(event.target.value)}>
                {bundle.core.priorities.filter((priority) => !priority.archived).map((priority) => (
                  <option key={priority.id} value={priority.id}>{priority.name}</option>
                ))}
              </select>
            </label>
          ) : null}
          {actionChoice === "assignMilestone" ? (
            <label className="label">
              Action milestone
              <select className="select" value={milestoneValue} onChange={(event) => setActionMilestoneId(event.target.value)}>
                {milestones.map((milestone) => (
                  <option key={milestone.id} value={milestone.id}>{milestone.name}</option>
                ))}
              </select>
            </label>
          ) : null}
          {actionChoice === "createSubtask" || actionChoice === "generateDoc" ? (
            <label className="label">
              Action title
              <input className="input" value={actionTitle} onChange={(event) => setActionTitle(event.target.value)} />
            </label>
          ) : null}
          <label className="label">
            Preview item
            <select className="select" value={previewValue} onChange={(event) => setPreviewItemId(event.target.value)}>
              {activeItems.map((item) => (
                <option key={item.id} value={item.id}>{item.title}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn" onClick={previewRule}>Preview rule</button>
          <button className="btn btn-primary" onClick={saveRule}>Save automation rule</button>
        </div>
        {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}
        {preview ? (
          <div className="workspace-inline-note">
            {preview.matched
              ? preview.actions.map((action) => <div key={`${action.type}-${action.summary}`}>{action.summary}</div>)
              : preview.reason}
          </div>
        ) : null}
      </div>

      <div className="settings-table">
        <div className="settings-table-header settings-table-header-automation">
          <span>Rule</span>
          <span>Status</span>
          <span>Actions</span>
        </div>
        {rules.length === 0 ? (
          <div className="settings-table-empty">No automation rules yet.</div>
        ) : null}
        {rules.map((rule) => (
          <div key={rule.id} className="settings-table-row settings-table-row-automation">
            <div className="col" style={{ gap: 2 }}>
              <strong>{rule.name}</strong>
              <span className="text-xs text-muted">{rule.trigger.type} {"->"} {rule.actions.map((action) => action.type).join(", ")}</span>
            </div>
            <span className={`tag ${rule.enabled ? "tag-ok" : "tag-warn"}`}>{rule.enabled ? "Enabled" : "Disabled"}</span>
            <div className="settings-row-actions">
              <button
                className="btn btn-sm"
                onClick={() => applyCommand({
                  type: "automationRule.setEnabled",
                  projectId: bundle.project.id,
                  ruleId: rule.id,
                  enabled: !rule.enabled
                })}
              >
                {rule.enabled ? `Disable ${rule.name}` : `Enable ${rule.name}`}
              </button>
              <button
                className="btn btn-sm btn-danger"
                onClick={() => applyCommand({
                  type: "automationRule.delete",
                  projectId: bundle.project.id,
                  ruleId: rule.id
                })}
              >
                Delete {rule.name}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function buildAction(
  actionChoice: ActionChoice,
  values: { labelId: string; statusId: string; priorityId: string; milestoneId: string; title: string }
): AutomationAction {
  if (actionChoice === "setPriority") return { type: "setField", field: "priorityId", value: values.priorityId || null };
  if (actionChoice === "addLabel") return { type: "addLabel", labelId: values.labelId };
  if (actionChoice === "removeLabel") return { type: "removeLabel", labelId: values.labelId };
  if (actionChoice === "moveToStatus") return { type: "moveToStatus", statusId: values.statusId };
  if (actionChoice === "assignMilestone") return { type: "assignMilestone", milestoneId: values.milestoneId };
  if (actionChoice === "createSubtask") return { type: "createSubtask", title: values.title.trim() || "Follow-up task" };
  return { type: "generateDoc", title: values.title.trim() || "Generated note" };
}
