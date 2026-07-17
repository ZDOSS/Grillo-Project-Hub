import { useEffect, useRef, useSyncExternalStore } from "react";
import { ArrowLeft, ArrowRight, GraduationCap, Lightbulb } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "../components";
import {
  endNewUserTutorial,
  getNewUserTutorialSnapshot,
  setNewUserTutorialStep,
  subscribeToNewUserTutorial
} from "./tutorial-state";

export type NewUserTutorialStep = {
  description: string;
  label: string;
  nextLabel: string;
  route: string;
  title: string;
  tryThis: string;
};

const NEW_USER_TUTORIAL_STEPS: NewUserTutorialStep[] = [
  {
    label: "Overview",
    title: "See the whole project at a glance",
    description: "Overview turns project activity into a quick health check: what is moving, what is blocked, and what needs attention next.",
    tryThis: "Scan the status totals, upcoming work, and milestone progress in the tutorial project.",
    route: "/overview",
    nextLabel: "Open Board"
  },
  {
    label: "Board",
    title: "Move work through its workflow",
    description: "Board groups items by status so the team can see flow, open details, and move work forward without losing context.",
    tryThis: "Open a card to explore descriptions, labels, assignees, comments, and activity history.",
    route: "/board",
    nextLabel: "Open Backlog"
  },
  {
    label: "Backlog",
    title: "Prioritize what comes next",
    description: "Backlog gives planning work a quieter list view with priority, status, due dates, and ownership aligned for fast scanning.",
    tryThis: "Compare the urgent bug with the release work and decide what the team should pull next.",
    route: "/backlog",
    nextLabel: "Open Table"
  },
  {
    label: "Table",
    title: "Edit many details efficiently",
    description: "Table is the dense operational view for sorting, filtering, choosing columns, and updating selected work in bulk.",
    tryThis: "Select a row to reveal bulk edit controls, then open Columns to tailor the view.",
    route: "/table",
    nextLabel: "Open Roadmap"
  },
  {
    label: "Roadmap",
    title: "Plan milestones over time",
    description: "Roadmap connects milestones and scheduled work so release timing, scope, and dependencies stay visible.",
    tryThis: "Use a milestone grip with the pointer or arrow keys to adjust its target date.",
    route: "/roadmap",
    nextLabel: "Open Calendar"
  },
  {
    label: "Calendar",
    title: "See commitments by date",
    description: "Calendar places due work into a seven-day planning surface with an agenda for the details that matter now.",
    tryThis: "Choose a day to create a dated item, or open existing work from the agenda.",
    route: "/calendar",
    nextLabel: "Open Docs"
  },
  {
    label: "Docs",
    title: "Keep decisions beside delivery",
    description: "Docs stores project notes, briefs, and checklists next to the work they explain, including direct links back to items.",
    tryThis: "Open the Launch checklist and follow one of its linked work items.",
    route: "/docs",
    nextLabel: "Open Bug triage"
  },
  {
    label: "Bug triage",
    title: "Turn reports into actionable bugs",
    description: "Bug triage brings severity, reproduction steps, expected behavior, and disposition actions into one review flow.",
    tryThis: "Inspect the responsive-header report and review its severity and reproduction context.",
    route: "/bugs",
    nextLabel: "Open My work"
  },
  {
    label: "My work",
    title: "Focus each person on their queue",
    description: "My work groups assigned items around a selected team member so personal priorities stay clear without hiding project context.",
    tryThis: "Switch between Alex and Sam to see how the same project becomes a personal queue.",
    route: "/mywork",
    nextLabel: "Open Search"
  },
  {
    label: "Search & commands",
    title: "Find anything and move quickly",
    description: "Search finds project work and documents, while the command palette jumps to views and common actions from anywhere.",
    tryThis: "Search for \"first-run,\" then use Search commands in the header or press Ctrl K.",
    route: "/search",
    nextLabel: "Open Trash"
  },
  {
    label: "Trash",
    title: "Recover work before it is gone",
    description: "Trash keeps deleted items recoverable so cleanup does not immediately become permanent data loss.",
    tryThis: "Notice the restore path; permanent deletion stays a separate, deliberate action.",
    route: "/trash",
    nextLabel: "Open Settings"
  },
  {
    label: "Settings",
    title: "Shape Grillo around the project",
    description: "Settings controls workflows, item types, members, labels, views, automation, storage, and portable imports or exports.",
    tryThis: "Browse the tabs to see which parts are project structure and which parts help move or protect data.",
    route: "/settings",
    nextLabel: "Wrap up"
  },
  {
    label: "Complete",
    title: "You know your way around Grillo",
    description: "You have visited every core workspace surface. The tutorial project remains open, so you can keep experimenting with sample data.",
    tryThis: "Create an item with the C shortcut, use Ctrl K to jump views, or return to Projects when you are ready for your own workspace.",
    route: "/overview",
    nextLabel: "Finish tutorial"
  }
];

export function NewUserTutorial({ activeProjectId }: { activeProjectId: string | null }) {
  const state = useSyncExternalStore(
    subscribeToNewUserTutorial,
    getNewUserTutorialSnapshot,
    getNewUserTutorialSnapshot
  );
  const location = useLocation();
  const navigate = useNavigate();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const lastStepIndex = NEW_USER_TUTORIAL_STEPS.length - 1;
  const stepIndex = Math.min(state.stepIndex, lastStepIndex);
  const step = NEW_USER_TUTORIAL_STEPS[stepIndex];
  const tutorialProjectAvailable = Boolean(activeProjectId && activeProjectId === state.projectId);

  useEffect(() => {
    if (state.active && !tutorialProjectAvailable) {
      endNewUserTutorial();
    }
  }, [state.active, tutorialProjectAvailable]);

  useEffect(() => {
    if (!state.active || stepIndex === lastStepIndex) return;
    const routeStepIndex = NEW_USER_TUTORIAL_STEPS
      .slice(0, lastStepIndex)
      .findIndex((entry) => entry.route === location.pathname);
    if (routeStepIndex >= 0 && routeStepIndex !== stepIndex) {
      setNewUserTutorialStep(routeStepIndex);
    }
  }, [lastStepIndex, location.pathname, state.active, stepIndex]);

  useEffect(() => {
    if (state.active) titleRef.current?.focus();
  }, [state.active, stepIndex]);

  if (!state.active || !tutorialProjectAvailable) return null;

  const goToStep = (nextStepIndex: number) => {
    const boundedIndex = Math.max(0, Math.min(nextStepIndex, lastStepIndex));
    setNewUserTutorialStep(boundedIndex);
    navigate(NEW_USER_TUTORIAL_STEPS[boundedIndex].route);
  };

  const advance = () => {
    if (stepIndex === lastStepIndex) {
      endNewUserTutorial();
      return;
    }
    goToStep(stepIndex + 1);
  };

  return (
    <aside
      aria-label="New user tutorial"
      className="new-user-tutorial"
      data-step={step.label.toLowerCase().replaceAll(" ", "-")}
      role="dialog"
    >
      <header className="new-user-tutorial-header">
        <div className="new-user-tutorial-brand">
          <span className="new-user-tutorial-icon" aria-hidden="true">
            <GraduationCap />
          </span>
          <div className="col" style={{ gap: 1 }}>
            <span className="text-xs text-muted">Guided demo</span>
            <strong>New user tutorial</strong>
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={endNewUserTutorial}>Exit tutorial</Button>
      </header>

      <div
        aria-label="Tutorial progress"
        aria-valuemax={NEW_USER_TUTORIAL_STEPS.length}
        aria-valuemin={1}
        aria-valuenow={stepIndex + 1}
        className="new-user-tutorial-progress"
        role="progressbar"
      >
        <span style={{ width: `${((stepIndex + 1) / NEW_USER_TUTORIAL_STEPS.length) * 100}%` }} />
      </div>

      <div className="new-user-tutorial-body" aria-live="polite">
        <div className="row-between new-user-tutorial-step-meta">
          <span className="tutorial-step-label">{step.label}</span>
          <span className="text-xs text-muted">Step {stepIndex + 1} of {NEW_USER_TUTORIAL_STEPS.length}</span>
        </div>
        <h2 id="new-user-tutorial-title" ref={titleRef} tabIndex={-1}>{step.title}</h2>
        <p className="text-sm text-secondary">{step.description}</p>
        <div className="new-user-tutorial-try">
          <Lightbulb aria-hidden="true" />
          <div>
            <strong>Try this</strong>
            <p>{step.tryThis}</p>
          </div>
        </div>
      </div>

      <footer className="new-user-tutorial-footer">
        <Button
          disabled={stepIndex === 0}
          icon={<ArrowLeft />}
          onClick={() => goToStep(stepIndex - 1)}
          size="sm"
        >
          Back
        </Button>
        <Button
          onClick={advance}
          size="sm"
          trailingIcon={stepIndex === lastStepIndex ? undefined : <ArrowRight />}
          variant="primary"
        >
          {step.nextLabel}
        </Button>
      </footer>
    </aside>
  );
}
