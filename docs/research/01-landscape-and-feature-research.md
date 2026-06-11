# Landscape And Feature Research

## Goal of the research

Identify which parts of adjacent tools are actually worth borrowing for a modern open source project manager aimed at practical day-to-day work, especially for software projects, without drifting too far into heavyweight enterprise process.

## High-level market read

There is still room for a tool that is:

- lighter than Jira
- more structured than Trello
- more beginner-friendly than many self-hosted PM tools
- more local-first and export-friendly than most SaaS-first products
- more modular than single-opinionated board apps

The gap is not "another enterprise ALM suite." The gap is "a clean, trustworthy workbench for planning and tracking software work that still feels human-scaled."

## What established tools suggest

### Trello-style lessons

Trello remains strong because boards, lists, cards, checklists, due dates, labels, and extensions are easy to understand. Its core lesson is that drag-and-drop planning works well when the unit of work is small and the UI stays simple.

Implication for this project:

- Kanban should be first-class on day one.
- Card/task detail should remain lightweight by default.
- Optional power should be layered in, not forced immediately.

### GitHub Issues/Projects lessons

GitHub's current planning tools show the value of flexible issues plus multiple views. Official docs describe Projects as an adaptable table, board, and roadmap with filtering, sorting, grouping, custom fields, charts, templates, and automation. GitHub Issues docs also emphasize bugs, ideas, tasks, sub-issues, dependencies, labels, milestones, and tight integration with implementation work.

Implication for this project:

- The core work item should support both task and issue use cases.
- Multiple views over one shared data model matter more than separate disconnected modules.
- Hierarchy and dependencies are important, but should stay readable.

### Jira lessons

Jira's feature pages still center around planning, tracking, workflows, dependencies, automation, multiple views, reporting, and integrations. The value is not the complexity itself; it is the ability to adapt the tool to different team habits.

Implication for this project:

- Configurable workflows matter.
- Automation matters.
- Templates matter.
- We should stop well before "admin maze" territory.

### OpenProject lessons

OpenProject's official feature pages show a broad spread: work packages, hierarchies, dependencies, Gantt charts, Kanban boards, backlogs, sprint boards, time tracking, wiki, meetings, and roadmaps. This is useful mainly as a warning and a menu:

- warning: broad scope can become heavy fast
- menu: some features are genuinely useful when kept optional

Implication for this project:

- Gantt/timeline should exist, but not dominate the app.
- Wiki/docs and roadmap views are worth supporting.
- Heavy budgeting/cost features should not be core.

### Kanboard lessons

Kanboard's official site is refreshingly direct: visualize work, limit work in progress, drag-and-drop tasks, search/filter, subtasks, comments, Markdown, and automatic actions. Its plugin ecosystem also proves that extensibility is a strong differentiator for self-hosted/open source tools.

Implication for this project:

- Simple workflows can still be powerful.
- WIP limits are worth including.
- Automation rules are valuable even in a lightweight tool.
- Plugin architecture should be designed early, not bolted on later.

### Taiga lessons

Taiga is one of the better known open source agile tools because it balances backlog, scrum, kanban, integrations, and import/export. It signals that open source users do want "real product workflow" features, not only bare boards.

Implication for this project:

- Backlog + board is a practical pairing.
- Import/export and migration paths matter for adoption.
- Software-oriented workflows are a strength, not a niche mistake.

## Practical feature categories worth keeping

### Definitely core

- Kanban boards
- backlog / inbox
- issue and bug tracking
- list / table views
- task detail with comments, subtasks, labels, assignee, due dates, status
- milestones / releases
- dependencies
- saved filters / saved views
- project docs / notes
- export and import
- dark mode and light mode
- offline/local persistence

### Worth adding early if done lightly

- roadmap / timeline view
- lightweight Gantt view
- recurring tasks
- simple automation rules
- templates
- keyboard shortcuts
- activity feed / history
- attachments
- Git-aware issue linking

### Worth making optional modules or later phases

- sprint planning
- burndown
- calendar view
- desktop shell
- multi-project portfolio view
- notifications
- team permissions
- webhooks and integrations

### Probably not core for the first release

- budgeting
- cost reporting
- resource capacity management
- enterprise permission matrices
- ITSM/service desk workflows
- large-scale SAFe-style planning
- CRM-ish features

### Product decision after research

Although story points, effort estimates, and capacity estimates are common in existing project-management products, this project intentionally excludes them from the built-in product model.

Reasons:

- time and effort forecasts are too unreliable to deserve first-class authority in this product
- AI-assisted development makes traditional effort estimates even less stable across tools, models, contributors, and workflows
- target dates and real constraints can still be represented without pretending they predict effort

A future optional AI/API cost-forecast module may be investigated, but only if it can expose provider/model assumptions, pricing provenance, uncertainty ranges, confidence, and meaningful validation. If it cannot, the feature should not ship.

## Recommended product shape

The product should be:

- task-first instead of process-first
- local-first instead of account-first
- modular instead of monolithic
- friendly to solo users but not locked to solo use
- software-work-aware without pretending every user is a scrum team

This suggests a shared "work item" model with multiple views:

- Board
- Backlog
- List
- Roadmap
- Docs
- My Work
- Bugs / Triage

## Recommended core work item fields

- id
- title
- description
- type
- status
- priority
- assignee
- reporter / creator
- labels / tags
- milestone
- parent
- children / subtasks
- dependencies
- created at
- updated at
- due date
- start date
- checklist
- comments
- attachments
- custom fields

## UX takeaways

- New users should be able to start with a default board and never think about configuration if they do not want to.
- Advanced users should be able to reshape statuses, fields, views, automations, and modules.
- "Bug" should not feel like an afterthought. Software users need triage, severity, reproduction notes, and fix-state tracking.
- Timeline/Gantt should be visually useful but optional, not the main worldview.

## Product positioning recommendation

Suggested positioning:

"A free, open source, local-first project planning and issue tracking suite for real software work."

That is stronger than "Jira clone" and less fluffy than "vibe coding workspace."

## Sources

- GitHub Projects docs: https://docs.github.com/en/issues/planning-and-tracking-with-projects/learning-about-projects/about-projects
- GitHub Issues docs: https://docs.github.com/en/issues/tracking-your-work-with-issues/about-issues
- GitHub milestones docs: https://docs.github.com/en/issues/using-labels-and-milestones-to-track-work/about-milestones
- Jira features: https://www.atlassian.com/software/jira/features
- OpenProject features: https://www.openproject.org/collaboration-software-features/
- Kanboard home: https://kanboard.org/
- Kanboard plugins: https://kanboard.org/plugins.html
