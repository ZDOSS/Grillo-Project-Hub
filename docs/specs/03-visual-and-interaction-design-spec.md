# Grillo Project Hub Visual and Interaction Design Spec

## Status

This document defines the approved visual foundation for Grillo Project Hub (GPH). Detailed tokens, component specifications, responsive behavior, and screen-level interaction states will be refined during the dedicated text-first design pass.

## Design brief

GPH should feel like a polished and friendly desktop productivity tool: capable enough for serious software work, approachable enough for a new engineer, and calm enough to use every day.

The interface must not feel:

- enterprise-heavy
- sterile or aggressively utilitarian
- toy-like
- themed around "vibe coding"
- overloaded with cards, pills, borders, or decorative containers
- dependent on dark mode for its personality

## Approved visual direction

- visual character: polished and friendly
- information density: balanced
- brand character: subtle cricket and nature references
- primary navigation: desktop sidebar plus project view bar
- accent direction: restrained natural green
- surfaces: lightly rounded and layered
- specification depth: full interaction and state planning, not visual styling alone
- typography direction: humanist and highly readable
- light canvas direction: warm off-white
- dark canvas direction: charcoal with a faint warm/green undertone
- work-item details: modal-first presentation
- dialog rule: dialogs for focused tasks, drawers for contextual editing
- icon style: simple outlined icons with selective filled active states
- empty-state tone: concise guidance with subtle cricket/nature illustration support
- sidebar collapse behavior: full, icon rail, or temporary overlay
- small-screen navigation: slide-over sidebar plus compact view switcher
- density shipping decision: balanced only in MVP, compact later
- accent policy: project accents decorate identity while green remains the main interaction color

## Brand expression

The name is **Grillo Project Hub**, shortened to **GPH** where space is constrained.

Brand references to crickets or nature should remain subtle:

- rhythm, cadence, signal, and attentive motion are stronger metaphors than literal insect decoration
- a small abstract cricket mark, wing rhythm, antenna curve, or field-line motif may inform identity exploration
- nature-inspired greens should be muted enough for sustained productivity use
- avoid mascots, cartoon insects, leaf-covered interfaces, or novelty copy in the core product
- project data and workflow should remain visually dominant over branding

## Theme philosophy

Light and dark modes are equal first-class themes.

Rules:

- neither theme is a simple inversion of the other
- both themes use the same semantic token names and hierarchy
- light mode should avoid glaring white expanses
- dark mode should avoid pure black expanses and low-contrast gray-on-gray controls
- the default light canvas should be a warm off-white rather than stark neutral white
- the default dark canvas should be charcoal with a faint warm or green undertone rather than blue-black
- green is an accent and interaction color, not the universal background
- project accent colors should shape project identity markers, highlights, and optional decorative touches without replacing the core interaction green
- statuses, priorities, severities, labels, warnings, errors, and success states must remain distinguishable without relying only on hue
- user-selected project colors must be mapped or adjusted to remain legible in both themes
- system theme detection is the initial default; explicit user choice overrides it

## Typography

Typography should feel readable, calm, and a little more human than a default developer dashboard.

Direction:

- use a humanist, highly readable sans direction for UI text
- prioritize clarity in dense planning views over editorial flair
- keep headings confident but not oversized
- avoid a cold geometric look that makes the app feel sterile
- avoid typography that feels playful, whimsical, or novelty-branded

Type system posture:

- one primary UI family is preferred for MVP
- a compact monospace companion may be used selectively for IDs, code-adjacent metadata, or diff views
- establish a consistent scale for app title, view title, section heading, body text, metadata, and compact labels
- preserve strong readability in both light and dark themes

## Density and spacing

Balanced density means:

- primary planning views show useful amounts of work without feeling cramped
- compact tables, backlogs, and boards remain scannable
- detail drawers and settings use more breathing room than dense data views
- density may vary by surface, but spacing follows one token system
- a future compact-density preference may be supported without redesigning components

The default interface should favor:

- clear 4/8-based spacing rhythm
- moderate row heights
- concise labels
- progressive disclosure for advanced settings
- restrained separators instead of a border around every region

MVP density rule:

- ship one balanced default density in MVP
- keep component sizing and spacing compatible with a later compact mode
- do not add a compact toggle in MVP if it weakens execution quality or slows implementation

## Shape and surface language

- use lightly rounded corners rather than sharp enterprise rectangles or oversized soft capsules
- reserve stronger elevation for temporary layers such as dialogs, menus, command palette, and drag states
- use subtle borders and tonal surface changes for persistent panels
- avoid nesting multiple card surfaces when spacing and headings can establish hierarchy
- pills are appropriate for labels, compact filters, and statuses, not for every button or navigation item

## Application shell

The primary shell uses:

1. a desktop-style left sidebar for workspace and project-level navigation
2. a project header for identity, persistence state, search, and high-value actions
3. a project view bar for switching among board, backlog, table, docs, roadmap, calendar, and added views
4. a central content canvas owned by the active view
5. contextual drawers, inspectors, menus, and dialogs layered over the active view

Shell requirements:

- the sidebar can collapse without making major destinations undiscoverable
- desktop sidebar states should support full width, icon rail, and temporary overlay behavior where useful
- `Add View` remains visible and understandable
- folder-backed, browser-local, and unsaved states are visible without dominating the interface
- search and the command palette are easy to reach by mouse and keyboard
- plugin-provided destinations follow the same navigation and command registration rules as built-in modules
- project content receives more visual weight than global chrome

Project header expectations:

- show project identity clearly without consuming excessive vertical space
- persistence and save-state messaging should be visible but quiet
- project accent color may appear in identity treatments, active project framing, or subtle decorative lines
- the default interaction color language stays green even when a project accent exists

View-switcher expectations:

- the project view bar should feel like a practical workspace switcher, not a marketing tab strip
- built-in and plugin-added views use the same visual affordances
- overflow behavior should stay understandable when many views are enabled

## Editing surfaces

Surface rules:

- work-item details open in a focused modal by default
- dialogs are preferred for creation, confirmation, focused editing, and high-attention tasks
- drawers are used for contextual editing, side inspectors, secondary panels, or supporting information that should not fully interrupt the current view
- full-page editing remains available where depth or screen size makes it clearly better, but it is not the default item-detail posture

Modal requirements:

- preserve enough background context that the user still understands where the item lives
- support deep scrolling and sectioning without becoming visually claustrophobic
- remain keyboard-accessible and mobile-aware

## Interaction specification requirements

Every major component and screen specification must include:

- default state
- hover and pressed states where relevant
- keyboard focus
- selected and active states
- disabled state
- loading state
- empty state
- validation and error state
- permission or capability limitation state where applicable
- external-file-change and pending-change state where applicable
- light and dark theme treatment
- reduced-motion behavior

Drag-and-drop surfaces must also specify:

- drag source
- valid target
- invalid target
- WIP warning
- WIP hard rejection
- keyboard-accessible equivalent
- undo feedback

## Motion

Motion should communicate state and spatial change, not decorate ordinary interaction.

Use motion for:

- opening or closing drawers and dialogs
- command-palette appearance
- card movement and roadmap resizing
- external-change and save-state transitions
- view changes where spatial continuity is useful

Avoid:

- constant ambient movement
- bouncing controls
- long easing that slows repetitive work
- animation that is required to understand state

Honor reduced-motion preferences with immediate or low-motion alternatives.

## Accessibility baseline

- target WCAG 2.2 AA contrast for text and interactive controls
- provide visible focus indicators in both themes
- make all primary flows keyboard-operable
- provide non-color indicators for workflow and validation state
- maintain readable contrast during drag, selection, hover, and disabled states
- use semantic headings, landmarks, labels, and status announcements
- ensure touch targets remain usable when the PWA runs on smaller touch devices

## Responsive posture

GPH is desktop-first but must remain usable as an installed or hosted PWA on smaller screens.

- desktop and large tablet layouts preserve the full sidebar and multi-panel workflow where space allows
- narrow layouts collapse navigation and avoid simultaneous dense panels
- small-screen navigation should use a slide-over sidebar plus a compact view switcher rather than forcing a mobile-style bottom navigation bar
- complex board, table, and roadmap views may use horizontal scrolling rather than destroying information structure
- mobile layouts prioritize review, search, capture, and focused item editing over reproducing every desktop arrangement
- responsive adaptation must not create a separate data model or reduced-permanence mode

## Icons and empty states

Icon direction:

- use simple outlined icons by default
- allow selective filled states for active, selected, or emphasized controls
- avoid fully solid iconography as the dominant visual language
- keep icon shapes clean and legible at small sizes

Empty-state direction:

- keep copy concise and practical
- include useful next actions where appropriate
- subtle cricket or nature illustrations are welcome when they support warmth without becoming the main attraction
- avoid oversized hero illustrations that crowd working screens
- empty states should reassure and orient, not advertise the brand to the user

## Remaining design work

The next design pass should finalize:

- exact typeface choices and type scale values
- exact light and dark neutral palette values
- semantic color tokens for status, severity, priority, warning, error, success, and selection
- precise sidebar widths, icon-rail sizing, and collapse transitions
- detailed project-header and view-bar measurements and token behavior
- exact work-item modal spacing, section density, and breakpoint behavior
- empty-state illustration style and usage boundaries
- responsive breakpoints and view-specific mobile adaptations

The screen-by-screen interaction model is now defined in `docs/specs/04-app-shell-and-core-screen-spec.md`.
