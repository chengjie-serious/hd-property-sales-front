# Sale and Rent Listing Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Manage sale and rent listings from their own two-tab page, with row editing and the requested filters and flags.

**Architecture:** Listing flags live on each listing row. Existing create-home multipart flow remains the sole create path; a new multipart update path changes one listing and its shared room location atomically while retaining unchanged media. The front end uses a reusable listing form plus a pure filter function and keeps all listing actions out of community detail.

**Tech Stack:** Node.js 24, Fastify, Drizzle/SQLite, Sharp, React 19, Vite, Ant Design 6, Less.

**Spec:** `docs/superpowers/specs/2026-09-29-fixed-boundary-and-region-community-admin-design.md`

## Global Constraints

- Work from `/Users/chengjie/Work/mine/hdMap`; file paths below are relative to it.
- Execute after the community-admin plan removes the listing form from community detail.
- Keep one menu and exactly two top Tabs, `售房` and `租赁`; no all-type Tab.
- Keep main image required for new listings and six detail images maximum; unchanged images survive edits.
- Room position is shared by sale and rent listings; listing fields and flags remain per listing.

## Review Focus

- Editing a sale row does not change the rent price, state or images: Task 2 test.
- Changing a shared room location updates both listings without creating duplicates: Task 2 test.
- An image-processing or database failure leaves the prior listing and files usable: Task 2 test.
- Old SQLite listings migrate flags to false and still appear in the correct Tab: Task 1 test.
- Combined search/region/community/floor/status/flag filters use AND semantics: Task 3 domain test.

---

### Task 1: Persist listing labels and expose them through APIs

**Files:**
- Modify: `hd-property-sales-end/src/db/schema.ts`, `hd-property-sales-end/src/db/open-database.ts`, `hd-property-sales-end/src/routes/listings.ts`, `hd-property-sales-end/src/routes/homes.ts`
- Test: `hd-property-sales-end/src/app.test.ts`

**Interfaces:**
- Produces: listing JSON has `isGoodPrice:boolean`, `isUrgentSale:boolean`; home create input accepts the flags, with urgent-sale rejected/forced false for rent.

- [ ] **Step 1: Add failing tests** for old-row migration defaults, sale good-price/urgent flags, rent good-price, and rent urgent-sale rejection.
- [ ] **Step 2: Run backend tests; expect missing-column/input assertions to fail.**
- [ ] **Step 3: Add SQLite columns with defaults, migration checks and creation/serialization handling in both legacy and unified create routes.**
- [ ] **Step 4: Run backend typecheck, tests and build; expect pass.**
- [ ] **Step 5: Commit only this task's backend files.**

### Task 2: Update a selected listing in one request

**Files:**
- Modify: `hd-property-sales-end/src/routes/homes.ts`, `hd-property-sales-end/src/app.ts`
- Test: `hd-property-sales-end/src/app.test.ts`

**Interfaces:**
- Produces: `PUT /api/admin/homes/:listingId` multipart with `data` JSON, optional replacement `mainImage`, `floorplanImage`, `detailImages`, and `data.removedDetailMediaIds`/`data.removeFloorplanImage`; returns one updated listing. Missing files retain current media. Location changes resolve/create building/unit/room and move every listing sharing the old room, while only the target listing's own fields/media change.

- [ ] **Step 1: Add failing tests** for edit preload data, price/flag update, shared room move (including default-room pointer), duplicate destination, retain media when no files are sent, explicit image removal, six-image cap, and failure rollback/cleanup.
- [ ] **Step 2: Run backend tests; expect 404 on the new PUT route.**
- [ ] **Step 3: Implement multipart validation, targeted media replacement and the database transaction; reuse image conversion and file cleanup from create without duplicating the full route.**
- [ ] **Step 4: Run backend typecheck, tests and build; expect pass.**
- [ ] **Step 5: Commit only this task's backend files.**

### Task 3: Two-tab listing UI and full filters

**Files:**
- Create: `hd-property-sales-front/src/admin/ListingEditor.tsx`, `hd-property-sales-front/src/domain/filter-admin-listings.ts`, `hd-property-sales-front/src/domain/filter-admin-listings.test.ts`
- Modify: `hd-property-sales-front/src/admin/ListingsPage.tsx`, `hd-property-sales-front/src/api.ts`, `hd-property-sales-front/src/style.less`
- Test: domain filter test plus browser check

**Interfaces:**
- Consumes: Tasks 1–2 listing shape and unified create/update APIs.
- Produces: `filterAdminListings(listings, {type,keywords,regionIds,communityIds,floors,status,goodPriceOnly,urgentSaleOnly})` and `ListingEditor` for create or selected-row edit.

- [ ] **Step 1: Write failing pure tests** for community fuzzy search, multi-region/community intersection, floor, status including draft in All, good-price and sale-only urgent filters.
- [ ] **Step 2: Run front-end tests; expect helper tests to fail.**
- [ ] **Step 3: Implement the filter helper and `ListingsPage` with sale/rent Tabs, search, multi-select region/community, floor/status column filters and flag filters; keep row actions from triggering the edit dialog.**
- [ ] **Step 4: Move the existing one-save home form into `ListingEditor`; clicking a row preloads and edits only that listing, while “新增房屋” creates from the current Tab with optional both-type choice. Show retained image previews and new replacements.**
- [ ] **Step 5: Run front-end tests/build and browser-check creation, one-row edit, filter combinations and both Tabs.**
- [ ] **Step 6: Commit only this task's front-end files.**
