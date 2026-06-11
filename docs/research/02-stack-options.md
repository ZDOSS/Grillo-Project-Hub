# Stack Options

## How to read this

These are intentionally presented as viable options, not a final choice. The spec package assumes we want to preserve optionality while still narrowing toward a sensible default.

## Shared technical needs regardless of framework

- strong client-side state management
- durable local storage
- PWA support
- drag-and-drop support
- good accessibility support
- fast static hosting build
- desktop packaging from day one
- plugin/module system that can evolve safely

## Option A: React + Vite + IndexedDB/OPFS + Tauri from day one

### Summary

This is the most practical default choice if the project wants broad contributor familiarity, strong long-term ecosystem coverage, and a shared web-plus-desktop core from the first release.

### Suggested shape

- frontend: React
- build tool: Vite
- routing: React Router or TanStack Router
- local persistence: IndexedDB, with OPFS or folder-backed export/workspace support where available
- drag and drop: dnd-kit or similar
- desktop wrapper: Tauri from the initial release

### Benefits

- familiar to a very large contributor base
- strong ecosystem for boards, editors, tables, accessibility, and testing
- Vite keeps setup lean
- easy to ship as a static PWA
- supports a shared frontend core for both the hosted PWA and the packaged desktop app

### Downsides

- easy to over-engineer
- plugin architecture needs discipline or the app can become hook soup
- React itself is a library, so architecture choices need to be made explicitly

### Best fit

- strongest choice if contributor friendliness and flexibility matter most

## Option B: Vue 3 + Vite + Pinia + Tauri from day one

### Summary

This is a strong middle path if you want an approachable, progressively adoptable framework with less ceremony than many React setups.

### Suggested shape

- frontend: Vue 3
- build tool: Vite
- routing: Vue Router
- state: Pinia
- local persistence: IndexedDB / OPFS
- desktop wrapper: Tauri from the initial release

### Benefits

- official site positions Vue as approachable, performant, and versatile
- incrementally adoptable architecture
- pleasant component model for a modular UI
- Pinia and Vue Router give a more opinionated baseline than raw React

### Downsides

- smaller hiring/contributor pool than React in some communities
- fewer drop-in examples for some niche software engineering workflows
- still needs clear architecture rules for extension safety

### Best fit

- great if you want clarity and lower cognitive overhead without sacrificing capability

## Option C: Svelte + Vite / SvelteKit + Tauri from day one

### Summary

This is the leanest-feeling frontend option and could make the app feel especially fast and clean, but it narrows contributor familiarity a bit.

### Suggested shape

- frontend: Svelte or SvelteKit
- persistence: IndexedDB / OPFS
- desktop wrapper: Tauri from the initial release

### Benefits

- small-feeling UI code
- great runtime footprint
- very pleasant for interactive interfaces
- strong fit for a fast local-first app

### Downsides

- smaller contributor pool than React
- fewer off-the-shelf examples for complex plugin architectures
- some teams may be less comfortable extending it

### Best fit

- excellent if performance, simplicity, and developer ergonomics are weighted above contributor familiarity

## Desktop packaging options

### Tauri

Tauri describes itself as small, fast, secure, cross-platform, frontend-independent, and able to use the OS web renderer. That makes it a strong fit for a hybrid day-one app that needs folder access, native packaging, and a smaller desktop footprint without splitting the frontend.

Benefits:

- smaller package size profile
- strong fit for optional native capabilities
- keeps the web frontend reusable

Downsides:

- introduces Rust into the contributor story
- more moving parts than a pure PWA

### Electron

Electron remains the most familiar desktop web-app shell and uses Chromium + Node.js in one binary.

Benefits:

- huge ecosystem
- many contributors already understand the model
- broad native integration possibilities

Downsides:

- heavier resource footprint
- easier to accidentally ship a large app for a relatively simple use case

## Hosting implications

GitHub Pages is a static hosting service. That strongly favors a frontend architecture that can run fully client-side with no required server runtime, while still sharing code with a packaged desktop app.

Implication:

- the default product should assume local persistence, desktop filesystem adapters, optional import/export, and optional external sync backends rather than a required built-in server

## Recommendation

### Recommended default

Option A:

- React
- Vite
- IndexedDB as the default local database
- OPFS or folder-backed enhancements where browser support allows
- Tauri from day one as the desktop distribution layer

### Why

- lowest adoption risk
- easiest contributor onboarding
- strongest shared-core path to both PWA and desktop from the start
- easiest path to a modular extension ecosystem

### Recommended backup choice

Option B with Vue 3 if you want a calmer, more guided frontend architecture.

## Sources

- React: https://react.dev/
- Vue: https://vuejs.org/
- Svelte: https://svelte.dev/
- Vite guide: https://vite.dev/guide/
- Tauri: https://tauri.app/
- Electron docs: https://www.electronjs.org/docs/latest/
