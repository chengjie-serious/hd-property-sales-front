# Region and Community Administration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the overview/community split with one map-backed region/community page and one-save community management.

**Architecture:** `CommunitiesPage` owns the region tree, map and quick-actions dialog; focused components own the community form and table. A single backend community write transaction updates the row and amenity links, while existing batch-region and deletion routes retain their data rules.

**Tech Stack:** Node.js 24, Fastify, Drizzle/SQLite, React 19, Vite, Ant Design 6, Less.

**Spec:** `docs/superpowers/specs/2026-09-29-fixed-boundary-and-region-community-admin-design.md`

## Global Constraints

- Work from `/Users/chengjie/Work/mine/hdMap`; file paths below are relative to it.
- Execute after the fixed-boundary plan so maps consume the bundled outline.
- Keep tree-top add buttons outside scrolling content and preserve the parent-path sticky behavior.
- Community detail contains community data only, with one save request for all editable fields and facility links.
- Preserve IDs and existing active-to-discarded/permanent-delete rules.

## Review Focus

- Reassigning a community outside the target polygon changes nothing: Task 1 test.
- A nonexistent facility ID prevents the entire community update: Task 1 test.
- Batch discard clears `isHot` on every selected community: Task 1 test.
- Table search followed by batch action affects checked IDs only, not all filtered rows: Task 3 browser check.
- Sticky parent path does not cover add buttons or point to removed nodes: Task 4 domain test/browser check.

---

### Task 1: Save complete community data atomically

**Files:**
- Modify: `hd-property-sales-end/src/app.ts`
- Test: `hd-property-sales-end/src/app.test.ts`

**Interfaces:**
- Produces: `POST /api/admin/communities` and `PUT /api/admin/communities/:communityId` accept `{regionId,name,address,longitude,latitude,deliveryDate,summary,buildingCount,referenceSalePrice,isHot,visible,amenityIds}` and return the updated community. POST remains compatible with omitted optional attributes. Batch-region with `regionId:null` clears `isHot`.

- [ ] **Step 1: Write failing tests** for one-create/one-update saving every field and amenity link, invalid facility rollback, boundary validation, and batch-discard hot reset.
- [ ] **Step 2: Run backend tests; expect the new update and batch-hot assertions to fail.**
- [ ] **Step 3: Add one shared input validator and one SQLite transaction for community row plus `amenity_communities` changes; update POST and add PUT, then clear hot in bulk discard.**
- [ ] **Step 4: Run `npm run typecheck && npm test && npm run build` in the backend; expect pass.**
- [ ] **Step 5: Commit only this task's backend files.**

### Task 2: One community form, no listing form in its detail

**Files:**
- Create: `hd-property-sales-front/src/admin/CommunityEditor.tsx`
- Modify: `hd-property-sales-front/src/admin/CommunitiesPage.tsx`, `hd-property-sales-front/src/api.ts`
- Test: browser check of create and edit dialogs

**Interfaces:**
- Consumes: Task 1 community POST/PUT.
- Produces: `CommunityEditor` props `{community?: Community; regions: Region[]; amenities: Amenity[]; actualBuildingCount: number; onSaved: () => Promise<void>}`; a single submit saves all fields and amenity IDs.

- [ ] **Step 1: Remove `UnifiedHomeForm` from community detail and place all existing community attributes, hot status and amenity links in `CommunityEditor` according to attachment 1. Keep read-only actual building count separate from editable planned count.**
- [ ] **Step 2: Wire create/edit to one API request each; keep map click and place search for coordinates, and show validation errors without closing the form.**
- [ ] **Step 3: Build the front end and inspect a community detail and edit form in the browser; confirm only one save control and no listing form.**
- [ ] **Step 4: Commit only this task's front-end files.**

### Task 3: Quick-actions community table

**Files:**
- Create: `hd-property-sales-front/src/admin/CommunityQuickActions.tsx`
- Modify: `hd-property-sales-front/src/admin/CommunitiesPage.tsx`, `hd-property-sales-front/src/style.less`
- Test: browser checks for search, selection, batch move/discard and row actions

**Interfaces:**
- Consumes: `api.assignCommunities(ids, regionId|null)`, `api.deleteCommunity(id)`, and `CommunityEditor` from Task 2.
- Produces: a page-header `快速操作` button opening the complete community table.

- [ ] **Step 1: Replace the page-header add button with `快速操作`; create the dialog with name/address fuzzy search, selected-ID batch move/discard, all community columns, and per-row edit/delete.**
- [ ] **Step 2: Make active-row delete move to discarded, discarded-row delete request permanent-delete confirmation; disable invalid bulk actions and surface backend boundary errors.**
- [ ] **Step 3: Build and inspect both nonempty and empty selections in the browser; verify selecting two filtered rows only changes those two IDs.**
- [ ] **Step 4: Commit only this task's front-end files.**

### Task 4: Merge region management into the map tree

**Files:**
- Create: `hd-property-sales-front/src/admin/RegionEditor.tsx`, `hd-property-sales-front/src/domain/tree-ancestor-path.ts`, `hd-property-sales-front/src/domain/tree-ancestor-path.test.ts`
- Modify: `hd-property-sales-front/src/admin/AdminApp.tsx`, `hd-property-sales-front/src/admin/CommunitiesPage.tsx`, `hd-property-sales-front/src/style.less`
- Test: tree-path domain test and browser map/tree checks

**Interfaces:**
- Produces: roots are region nodes plus discarded station; `getAncestorPath(firstVisibleKey, parentByKey)` returns current parent keys; region create/edit/delete/draw happens in this page.

- [ ] **Step 1: Add failing pure tests** for ancestor paths across region→community→building→unit→floor→room, collapsed nodes and a deleted node.
- [ ] **Step 2: Run front-end tests; expect the helper tests to fail.**
- [ ] **Step 3: Implement the helper and controlled tree expansion/scroll; keep `新增片区` and `新增小区` above the scroll container and show the current parent path at its top.**
- [ ] **Step 4: Move region CRUD and polygon drawing from `OverviewPage` to `RegionEditor` in `CommunitiesPage`; remove overview menu and active/hot roots/table, preserve discarded-station batch UI and map selection.**
- [ ] **Step 5: Run front-end test/build; inspect sticky path, region draw/edit and community map focus in the browser.**
- [ ] **Step 6: Commit only this task's files.**

### Task 5: Show linked community names for facilities

**Files:**
- Modify: `hd-property-sales-front/src/admin/FacilitiesPage.tsx`
- Test: browser check with facilities linked to two communities

**Interfaces:**
- Consumes: existing `Amenity.communityIds` and `Community.id/name`.
- Produces: facility table and selector display names; saves IDs unchanged.

- [ ] **Step 1: Map each linked ID to a community name, display readable names with overflow handling, and preserve edit form IDs.**
- [ ] **Step 2: Build and inspect a multi-community facility in the browser; no ID or count should replace its names.**
- [ ] **Step 3: Commit this one-file change.**
