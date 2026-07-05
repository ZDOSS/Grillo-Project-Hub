import { useProjectStore } from "../../store/project-store";

export function WorkflowSettings() {
  const bundle = useProjectStore((s) => s.bundle);
  const applyCommand = useProjectStore((s) => s.applyCommand);

  if (!bundle) return null;

  const bugsModule = bundle.modules["builtin.bugs"];
  const requireSeverityOrPriority = bugsModule?.config?.requireSeverityOrPriority === true;

  return (
    <div className="col" style={{ gap: 12, maxWidth: 720 }}>
      <h3>Workflow guardrails</h3>
      <p className="text-sm text-secondary" style={{ margin: 0 }}>
        Keep lightweight rules close to the workflow they protect.
      </p>
      <label className="workspace-source">
        <span className="row" style={{ alignItems: "center" }}>
          <input
            type="checkbox"
            aria-label="Require severity or priority before bugs leave intake"
            checked={requireSeverityOrPriority}
            onChange={(event) => applyCommand({
              type: "bugTriage.updateConfig",
              projectId: bundle.project.id,
              patch: { requireSeverityOrPriority: event.target.checked }
            })}
          />
          <strong>Require severity or priority before bugs leave intake</strong>
        </span>
        <span className="text-sm text-secondary">
          Intake bugs can still be created quickly, but accepting or declining them requires one useful triage signal.
        </span>
      </label>
    </div>
  );
}
