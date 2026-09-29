# Fixed Boundary and Separate Entrances Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the user's saved 72-point Hengdian outline with every installation and remove cross-entry navigation.

**Architecture:** The backend owns one versioned polygon snapshot and serves it through the existing overview-boundary read API. Both front-end routes render that API response; no browser flow calls AMap AOI or edits the fixed outline.

**Tech Stack:** Node.js 24, Fastify, SQLite, React 19, Vite, Ant Design 6, Less.

**Spec:** `docs/superpowers/specs/2026-09-29-fixed-boundary-and-region-community-admin-design.md`

## Global Constraints

- Work from `/Users/chengjie/Work/mine/hdMap`; file paths below are relative to it.
- Preserve all existing SQLite business records and the historical `overview_boundary` row.
- Keep direct `/` and local-only `/admin` routing for development; remove both UI cross-links.
- The fixed 72-point outline must work without an AOI entitlement or copying the Mac database to Windows.

## Review Focus

- Missing database row on a new Windows installation still returns the bundled 72 points: Task 1 test.
- Existing database row differs from the snapshot but cannot override it: Task 1 test.
- A malformed bundled polygon fails startup/test rather than rendering a blank map: Task 1 test.
- AMap AOI privilege failure cannot affect the home outline: Task 2 browser check.
- Direct local `/admin` remains available while LAN `/admin` stays denied: Task 3 backend test.

---

### Task 1: Bundle and serve the frozen polygon

**Files:**
- Create: `hd-property-sales-end/src/data/hengdian-boundary.json`
- Modify: `hd-property-sales-end/src/app.ts`
- Test: `hd-property-sales-end/src/app.test.ts`

**Interfaces:**
- Produces: `GET /api/map/overview-boundary -> { polygon: [number, number][], updatedAt?: string }` from bundled data. `PUT /api/admin/map/overview-boundary` no longer changes it.

- [ ] **Step 1: Write failing tests** asserting 72 points on `:memory:` and on a database with a different old row; no AOI key needed; the old PUT returns 404/405 and GET is unchanged. Add a snapshot validity check for finite coordinate pairs, expected bounds, and point count.
- [ ] **Step 2: Run the backend tests** with Node 24; expect failure while GET reads the database and PUT succeeds.
- [ ] **Step 3: Copy `overview_boundary.id=hengdian` from `/Users/chengjie/.hd-property-sales/hdmap.sqlite` as JSON without rounding; import it in `app.ts` with Node 24 JSON import attributes (`with { type: 'json' }`), validate once at startup, serve it from GET, and remove the PUT handler. `resolveJsonModule` already causes TypeScript to include the imported JSON in `dist`.**
- [ ] **Step 4: Run `npm run typecheck && npm test && npm run build` in `hd-property-sales-end`; expect all pass.**
- [ ] **Step 5: Commit only this task's backend files.**

### Task 2: Show the same outline on both pages

**Files:**
- Modify: `hd-property-sales-front/src/MapView.tsx`, `hd-property-sales-front/src/App.tsx`, `hd-property-sales-front/src/api.ts`
- Test: browser check of `/` and `/admin`

**Interfaces:**
- Consumes: Task 1 `GET /api/map/overview-boundary`.
- Produces: `MapView` draws `overviewBoundary` in both contexts; no `api.hengdianAoi()` call.

- [ ] **Step 1: Record a browser baseline** of the current home page when AOI is unavailable and identify the existing outline prop path.
- [ ] **Step 2: Load the overview boundary for the display route in `App.tsx`; pass it to `MapView`, make `MapView` draw only that source, and remove the AOI request/error copy. Remove unused AOI client API after its last caller is gone.**
- [ ] **Step 3: Run `npm run build && npm test` in `hd-property-sales-front`; expect pass.**
- [ ] **Step 4: In the browser, inspect `/` and `/admin`: same outline visible; no AOI error.**
- [ ] **Step 5: Commit only this task's front-end files.**

### Task 3: Separate entry navigation

**Files:**
- Modify: `hd-property-sales-front/src/App.tsx`, `hd-property-sales-front/src/admin/AdminApp.tsx`, `hd-property-sales-end/src/app.test.ts`
- Test: browser check plus existing local/LAN route test

**Interfaces:**
- Produces: no `打开展示端` button in `/admin` and no `打开管理端` button in `/`; route handlers remain.

- [ ] **Step 1: Add a backend regression assertion** that local `GET /admin` works and a LAN-address request returns 403; run it and confirm current behavior.
- [ ] **Step 2: Remove the two header links without changing routing or the local-only management hook.**
- [ ] **Step 3: Build both repositories and check both routes in the browser, including direct navigation to `/admin`.**
- [ ] **Step 4: Commit only this task's files.**
