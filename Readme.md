# Grillo Project Hub

This repository is the planning and future implementation home for **Grillo Project Hub (GPH)**, a free, open source, hybrid day-one project management suite for practical software work.

The product direction is intentionally local-first, modular, and calm. It is meant to feel more structured than a simple board app, lighter than heavyweight enterprise tooling, and trustworthy about where user data lives.

Its visual direction is polished and friendly rather than sterile or novelty-driven, with balanced information density, subtle nature-inspired character, humanist readable typography, warm light and charcoal dark canvases, and equally considered light and dark themes.

## Current status

Right now this repository is in planning mode.

The current planning package lives in [docs/FullSpec.md](./docs/FullSpec.md) and the supporting research/spec files under [docs](./docs).

## Product direction

- hybrid from day one: hosted PWA plus packaged desktop app
- local-first data philosophy
- shared core across web and desktop
- modular and pluggable feature model
- kanban-first, but not kanban-only
- bug tracking, docs, roadmap, calendar, and exports as first-class planning concerns

## Contribution ethos

This project should grow by adding capability, not by adding clutter.

That means:

- prefer modular and pluggable designs over stuffing more behavior into the permanent core
- prefer clean defaults and opt-in power over always-on complexity
- prefer practical features that help real planning work over novelty or theme-driven additions
- preserve a calm interface and a beginner-safe path even as the system becomes more capable
- avoid PRs that mainly add ceremony, admin overhead, or configuration burden without clear user value
- preserve plugin-owned project data when a plugin is disabled or missing instead of treating it as disposable

When proposing a change, the default question should be:

`Does this make the tool more useful without making it noisier, heavier, or harder to understand?`

If the answer is no, it probably does not belong in the default product flow.

## Implementation expectations

As implementation begins, contributors should preserve these baseline rules:

- keep one shared domain model across web and desktop
- keep data portable and inspectable
- treat shared-file collaboration as the MVP collaboration model
- keep live sync and server-style collaboration out of the MVP path
- preserve plugin-owned data across disable/remove/re-enable cycles
- prefer a simple inspectable automation rule builder in MVP over a scripting-first automation surface
- treat comments as real project discussion in MVP, with Markdown, threads, edit history, and sane delete behavior
- keep notifications local-first in MVP rather than depending on a third-party service
- keep search local-first and expose equivalent search capability through the app and MCP/API surface
- pair session undo/redo with folder-backed backups or snapshots rather than relying on only one safety net
- use archive and project-level trash before permanent deletion; restore stable records intact and require a reference-impact review before anything is irreversibly purged
- keep import/export interoperable so users can leave without being trapped
- treat recurring tasks as a simple-first feature that can grow toward more advanced recurrence later
- keep assignment simple in MVP with one assignee per item and a straightforward `My Work` view, then expand later if needed
- keep labels simple in MVP with flat colored labels and archiving, then add optional grouping later only if it earns its keep
- keep milestones lightweight in MVP with simple progress and target-date support, then layer richer release behavior later only if it proves useful
- keep calendar lightweight in MVP as a date-based planning view, then add rescheduling and richer time behavior later only if it proves useful
- keep planning dates date-only and timezone-stable, with precise UTC timestamps and IANA timezones reserved for explicit reminders
- treat docs as a real day-one knowledge system with Markdown, organization, stable links, backlinks, safe internal embeds, and search
- expose one clear subtask level in MVP while using stable parent references that can support deeper hierarchy later
- keep MVP item relationships focused on `blocks`, derived `blocked by`, and `relates to`, with specialized link types added later
- keep checklists lightweight and reorderable, with an atomic command to promote an entry into a real subtask
- let board columns group workflow statuses, warn on WIP limits by default, and optionally enforce hard limits
- make the roadmap directly editable through the same validated date, milestone, and dependency commands used elsewhere
- provide bundled and user-created portable templates, safe attachment previews, predictable item duplication, and a core command palette
- allow customizable workflow statuses while mapping them to stable planned, active, completed, and canceled categories
- allow customizable priority names and colors while using stable numeric ranks for sorting, automation, and interchange
- use a customizable registry of stable work-item types that plugins can extend without owning or destroying core item data
- keep bug severity customizable, ranked, module-owned, and independent from general planning priority
- give bugs focused structured reproduction, expected/actual behavior, environment, and optional affected-version fields without bloating the default form
- exclude time, effort, story-point, and capacity estimates; consider AI/API cost forecasting later only if it can be transparent and genuinely defensible
- use test-first development where practical, especially for domain logic, storage contracts, migrations, and hybrid parity behavior
- ship first-party modules first, then add curated/signed plugins, and eventually offer an explicit disabled-by-default unrestricted local-plugin mode
- update `AI.md` when meaningful architectural or behavioral changes are made

## Primary docs

- [docs/FullSpec.md](./docs/FullSpec.md)
- [docs/specs/01-product-spec.md](./docs/specs/01-product-spec.md)
- [docs/specs/02-extension-and-module-spec.md](./docs/specs/02-extension-and-module-spec.md)
- [docs/specs/03-visual-and-interaction-design-spec.md](./docs/specs/03-visual-and-interaction-design-spec.md)
- [docs/specs/04-app-shell-and-core-screen-spec.md](./docs/specs/04-app-shell-and-core-screen-spec.md)
- [docs/specs/05-project-bundle-and-schema-spec.md](./docs/specs/05-project-bundle-and-schema-spec.md)
- [docs/specs/06-command-surface-spec.md](./docs/specs/06-command-surface-spec.md)
- [docs/plans/2026-06-10-hybrid-day-one-implementation-plan.md](./docs/plans/2026-06-10-hybrid-day-one-implementation-plan.md)

## Early contributor note

Before implementation begins in earnest, treat the planning docs as the current source of truth. If a PR changes the architecture or product rules meaningfully, the docs and `AI.md` should change with it.
