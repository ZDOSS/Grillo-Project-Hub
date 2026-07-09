import type { ProjectBundle } from "../domain/project";
import { createProjectBundle, type ModuleSection } from "../domain/project";
import { defaultStatuses, defaultBugStatuses, defaultPriorities } from "../domain/workflow";
import { defaultWorkItemTypes } from "../domain/work-item-type";
import { defaultSeverities } from "../domain/bug";
import { createWorkItem } from "../domain/work-item";
import { createDocument } from "../domain/document";
import { createLabel } from "../domain/label";
import { createMilestone } from "../domain/milestone";
import { createMember } from "../domain/member";
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

/** A richer, non-persistent sample workspace used by the dedicated demo route. */
export function buildDemoProject(name = "Demo Project"): ProjectBundle {
  const bundle = buildSoftwareProject(name);
  const now = nowTimestamp();
  const owner = createMember({ displayName: "Alex Rivera", color: "green" });
  const reviewer = createMember({ displayName: "Sam Chen", color: "blue" });
  const [mvp, polish] = bundle.core.milestones;
  const [welcome, firstTask] = bundle.core.items;
  const completedTask = {
    ...firstTask,
    title: "Confirm project goals",
    description: "Review the project brief and agree on the first release outcome.",
    statusId: "done",
    priorityId: "medium",
    assigneeId: reviewer.id,
    milestoneId: mvp.id,
    dueDate: dateOffset(now, -1),
    comments: [{
      id: generateId("comment"),
      authorId: reviewer.id,
      body: "Goals are aligned. I added the remaining launch questions to the project brief.",
      createdAt: now,
      updatedAt: now,
      parentCommentId: null
    }]
  };
  const activeTask = {
    ...welcome,
    title: "Polish the first-run workspace",
    statusId: "in-progress",
    priorityId: "high",
    assigneeId: owner.id,
    milestoneId: mvp.id,
    dueDate: dateOffset(now, 3),
    comments: [{
      id: generateId("comment"),
      authorId: owner.id,
      body: "The launcher copy is ready; next I am checking the mobile layout.",
      createdAt: now,
      updatedAt: now,
      parentCommentId: null
    }]
  };
  const bug = createWorkItem({
    projectId: bundle.project.id,
    typeId: "bug",
    title: "Save indicator overlaps actions on narrow screens",
    description: "At tablet widths the project actions wrap outside the header. Keep every save control visible and keyboard reachable.",
    statusId: "inbox",
    priorityId: "urgent",
    assigneeId: owner.id,
    milestoneId: mvp.id,
    dueDate: dateOffset(now, 2),
    now
  });
  bug.moduleData = {
    bug: {
      severityId: "major",
      reproductionSteps: [
        { id: generateId("step"), text: "Open the project at a tablet-sized viewport.", order: 1024 },
        { id: generateId("step"), text: "Inspect the project header actions.", order: 2048 }
      ],
      expectedBehavior: "All project actions remain visible or move into an accessible overflow menu.",
      actualBehavior: "Save and switch actions are clipped by the fixed-height header.",
      environment: "Hosted PWA, 1280 × 720",
      affectedVersion: "0.1.0"
    }
  };
  const launchDoc = createDocument({
    title: "Launch checklist",
    body: `# Launch checklist\n\n- Review [[item:${activeTask.id}|first-run workspace]]\n- Verify [[item:${bug.id}|responsive header fix]]\n- Publish release notes`,
    now
  });

  return {
    ...bundle,
    core: {
      ...bundle.core,
      members: [owner, reviewer],
      milestones: [
        { ...mvp, targetDate: dateOffset(now, 14) },
        { ...polish, targetDate: dateOffset(now, 30) }
      ],
      items: [activeTask, completedTask, bug],
      documents: [...bundle.core.documents, launchDoc]
    }
  };
}

function dateOffset(now: string, days: number): string {
  const date = new Date(now);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
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
          : type.defaultStatusId === "inbox"
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
