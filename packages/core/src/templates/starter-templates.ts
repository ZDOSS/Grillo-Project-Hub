import type { ProjectBundle } from "../domain/project";
import { createProjectBundle, type ModuleSection } from "../domain/project";
import { defaultStatuses, defaultBugStatuses, defaultPriorities } from "../domain/workflow";
import { defaultWorkItemTypes } from "../domain/work-item-type";
import { defaultSeverities } from "../domain/bug";
import { createWorkItem } from "../domain/work-item";
import { createDocument } from "../domain/document";
import { createLabel } from "../domain/label";
import { createMilestone } from "../domain/milestone";
import { createBoardView, createBacklogView, createTableView } from "../domain/view";
import { nowTimestamp } from "../domain/dates";
import { generateId } from "../domain/ids";

/**
 * Starter templates: bundled presets for the most common project shapes.
 *
 *  - Simple Kanban: minimal board with 3 columns.
 *  - Software project: board, backlog, table, bugs, docs, roadmap, calendar, milestones.
 *  - Bug tracker: bug workflow statuses, severity-driven.
 *  - Release planner: milestone-driven.
 */

export type TemplateId = "simple-kanban" | "software-project" | "bug-tracker" | "release-planner";

export type TemplateDescriptor = {
  id: TemplateId;
  name: string;
  description: string;
};

export function listTemplates(): TemplateDescriptor[] {
  return [
    { id: "simple-kanban", name: "Simple Kanban", description: "A clean three-column board for everyday work." },
    { id: "software-project", name: "Software Project", description: "Board, backlog, table, bugs, docs, roadmap, milestones, calendar." },
    { id: "bug-tracker", name: "Bug Tracker", description: "Bug workflow with severities and reproduction fields." },
    { id: "release-planner", name: "Release Planner", description: "Milestone-driven planning for shipping." }
  ];
}

export function buildProjectFromTemplate(templateId: TemplateId, name: string): ProjectBundle {
  switch (templateId) {
    case "simple-kanban":
      return buildSimpleKanban(name);
    case "software-project":
      return buildSoftwareProject(name);
    case "bug-tracker":
      return buildBugTracker(name);
    case "release-planner":
      return buildReleasePlanner(name);
  }
}

function withHiddenViews(bundle: ProjectBundle, hiddenViewIds: string[]): ProjectBundle {
  return {
    ...bundle,
    projectSettings: {
      ...bundle.projectSettings,
      hiddenViewIds
    }
  };
}

function buildSimpleKanban(name: string): ProjectBundle {
  const bundle = createProjectBundle({ name });
  const now = nowTimestamp();
  const board = createBoardView({
    name: "Board",
    columns: [
      { name: "To Do", statusIds: ["inbox", "ready"], defaultDropStatusId: "ready", order: 1024 },
      { name: "Doing", statusIds: ["in-progress"], defaultDropStatusId: "in-progress", order: 2048, wipLimit: 5, wipMode: "warn" },
      { name: "Done", statusIds: ["done"], defaultDropStatusId: "done", order: 4096 }
    ]
  });
  const sample = createWorkItem({ projectId: bundle.project.id, typeId: "task", title: "Welcome to your board", statusId: "ready", now });
  sample.description = "Drag cards across columns. Open a card to edit details, add subtasks, or convert checklist items into tasks.";
  const sample2 = createWorkItem({ projectId: bundle.project.id, typeId: "task", title: "Add your first task", statusId: "inbox", now });
  return withHiddenViews({
    ...bundle,
    core: {
      ...bundle.core,
      items: [sample, sample2],
      labels: [createLabel({ name: "quick win", color: "green" })],
      documents: [createDocument({ title: "Getting Started", body: `Welcome to your project. This is a doc — open it from the Docs view.\n\nTry [[item:${sample.id}]] or refer to other docs with [[doc:welcome]].`, now })]
    },
    modules: {
      ...bundle.modules,
      "builtin.kanban": {
        schemaVersion: 1,
        enabled: true,
        config: {},
        data: { views: { [board.id]: board }, placements: {} }
      }
    },
    projectSettings: { ...bundle.projectSettings, defaultViewId: board.id }
  }, ["bugs", "docs", "roadmap", "calendar", "mywork"]);
}

function buildSoftwareProject(name: string): ProjectBundle {
  const bundle = buildSimpleKanban(name);
  // Add milestones, labels, automation, etc.
  const now = nowTimestamp();
  const m1 = createMilestone({ name: "v0.1 MVP", targetDate: null });
  const m2 = createMilestone({ name: "v0.2 Polish", targetDate: null });
  const doc1 = createDocument({ title: "Architecture", body: "# Architecture\n\nThe project uses a shared core package, browser and desktop adapters, and a validated command surface.", now });
  const doc2 = createDocument({ title: "Roadmap", body: "# Roadmap\n\n- Phase 0: Foundation\n- Phase 1: Domain model\n- Phase 2: MVP planning experience", now });
  return withHiddenViews({
    ...bundle,
    core: {
      ...bundle.core,
      milestones: [m1, m2],
      documents: [...bundle.core.documents, doc1, doc2],
      labels: [
        ...bundle.core.labels,
        createLabel({ name: "frontend", color: "blue" }),
        createLabel({ name: "backend", color: "purple" }),
        createLabel({ name: "infra", color: "orange" })
      ]
    }
  }, []);
}

function buildBugTracker(name: string): ProjectBundle {
  const bundle = createProjectBundle({ name });
  // Swap workflow to bug statuses
  const bugStatuses = defaultBugStatuses();
  const now = nowTimestamp();
  const board = createBoardView({
    name: "Triage Board",
    columns: [
      { name: "Intake", statusIds: ["new", "confirmed"], defaultDropStatusId: "confirmed", order: 1024 },
      { name: "Ready", statusIds: ["ready"], defaultDropStatusId: "ready", order: 2048 },
      { name: "In Progress", statusIds: ["in-progress"], defaultDropStatusId: "in-progress", order: 3072, wipLimit: 4, wipMode: "warn" },
      { name: "Fixing", statusIds: ["fixed"], defaultDropStatusId: "fixed", order: 3584 },
      { name: "Closed", statusIds: ["verified", "closed", "wont-fix"], defaultDropStatusId: "verified", order: 4608 }
    ]
  });
  const sample = createWorkItem({ projectId: bundle.project.id, typeId: "bug", title: "Sample bug: login fails silently", statusId: "new", now });
  sample.description = "After pressing login, the form briefly shows a spinner, then nothing happens.";
  sample.moduleData = {
    bug: {
      severityId: "major",
      reproductionSteps: [
        { id: generateId("step"), text: "Open the login page.", order: 1024 },
        { id: generateId("step"), text: "Enter invalid credentials.", order: 2048 },
        { id: generateId("step"), text: "Click **Login**.", order: 3072 }
      ],
      expectedBehavior: "An error message is shown.",
      actualBehavior: "Nothing happens; the spinner disappears without explanation.",
      environment: "Chrome 122, Windows 11",
      affectedVersion: "0.1.0"
    }
  };
  return withHiddenViews({
    ...bundle,
    project: {
      ...bundle.project,
      defaultTypeId: "bug",
      defaultInitialStatusId: "new",
      defaultCompletedStatusId: "verified"
    },
    core: {
      ...bundle.core,
      statuses: bugStatuses,
      itemTypes: bundle.core.itemTypes.map((type) => (
        type.id === "bug"
          ? { ...type, defaultStatusId: "new" }
          : type
      )),
      items: [sample]
    },
    modules: {
      ...bundle.modules,
      "builtin.kanban": {
        schemaVersion: 1,
        enabled: true,
        config: {},
        data: { views: { [board.id]: board }, placements: {} }
      }
    },
    projectSettings: { ...bundle.projectSettings, defaultViewId: board.id }
  }, ["backlog", "roadmap", "calendar", "mywork"]);
}

function buildReleasePlanner(name: string): ProjectBundle {
  const bundle = buildSoftwareProject(name);
  const now = nowTimestamp();
  const m1 = createMilestone({ name: "Kickoff", targetDate: null });
  const m2 = createMilestone({ name: "Beta", targetDate: null });
  const m3 = createMilestone({ name: "GA", targetDate: null });
  return withHiddenViews({
    ...bundle,
    core: {
      ...bundle.core,
      milestones: [m1, m2, m3],
      documents: [
        ...bundle.core.documents,
        createDocument({ title: "Release Process", body: "# Release Process\n\n1. Cut a release branch.\n2. Run smoke tests.\n3. Tag the release.\n4. Publish notes.", now })
      ]
    }
  }, ["bugs", "mywork"]);
}
