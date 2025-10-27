# Create Surface Modularization Audit

## Scope
- Reviewed `src/components/create/*.tsx`, `src/components/create/contexts/*`, and `src/components/create/hooks/*`.
- Goal: catalog extracted responsibilities, highlight implementation gaps relative to the target modular create surface, and refresh Phase 1 action items with concrete guidance.

## Benefits of Modularization

### Performance Improvements
- **Faster Hot Reload**: Changes to individual components don't re-render the entire Create component
- **Reduced Re-render Scope**: Changing prompt doesn't re-render gallery grid
- **Lazy Loading**: Components load only when needed
- **Memoization**: Prevents unnecessary re-renders

### Developer Experience
- **Easier to Add Features**: Clear file to edit for each feature
- **Better Code Organization**: Logical separation of concerns
- **Improved Discoverability**: Easy to find specific functionality
- **Maintainable**: Smaller, focused components are easier to understand and modify

### Code Quality
- **Separation of Concerns**: Each component has a single responsibility
- **Reusability**: Components can be reused in other parts of the app
- **Testability**: Smaller components are easier to test
- **Type Safety**: Proper TypeScript interfaces for all components

## Extracted module inventory

### Context providers
| Module | Key responsibilities | Observed implementation | Status |
| --- | --- | --- | --- |
| `GenerationContext` | Centralizes model selection, per-provider knobs (aspect ratios, batch size, temperatures), and an `activeJobs` list for tracking running generations. | Reducer exposes setters for each control plus helpers for job bookkeeping, but no API orchestration or persistence back to the monolith yet. | **Foundation only – needs integration.**【F:src/components/create/contexts/GenerationContext.tsx†L5-L143】【F:src/components/create/contexts/GenerationContext.tsx†L187-L264】
| `GalleryContext` | Maintains gallery items, filters, selection/bulk state, portal anchors, and folder dialogs. | Comprehensive reducer + derived helpers exist; however the provider never ingests real data or synchronizes deep links, so consumer components have nothing to render. | **Foundation only – needs integration.**【F:src/components/create/contexts/GalleryContext.tsx†L1-L145】【F:src/components/create/contexts/GalleryContext.tsx†L204-L381】

### Hooks
| Hook | Responsibilities | Wiring status | Readiness |
| --- | --- | --- | --- |
| `usePromptHandlers` | Local prompt state, history + saved prompt storage, copy notifications, style application shim. | Fully implemented against shared prompt history/saved prompt hooks, but consumers pass placeholder style maps so prompts never leave the hook. | **Implementation ready; needs real inputs.**【F:src/components/create/hooks/usePromptHandlers.ts†L1-L108】【F:src/components/create/hooks/usePromptHandlers.ts†L134-L176】
| `useReferenceHandlers` | Manages reference uploads (file inputs, paste, drag-drop), preview URLs, and quota enforcement. | All event handlers exist, yet `PromptForm` passes no-op callbacks so nothing reaches generation requests. | **Implementation ready; needs orchestration.**【F:src/components/create/hooks/useReferenceHandlers.ts†L1-L118】【F:src/components/create/hooks/useReferenceHandlers.ts†L148-L214】
| `useAvatarHandlers` | CRUD for stored avatars, modal toggles, drag/drop, and persisted selection tied to auth. | Persists via `clientStorage` and exposes rich state, but no parent wiring triggers `loadStoredAvatars` or commits selections to requests. | **Implementation ready; needs lifecycle wiring.**【F:src/components/create/hooks/useAvatarHandlers.ts†L1-L136】【F:src/components/create/hooks/useAvatarHandlers.ts†L176-L260】
| `useProductHandlers` | Mirrors avatar handlers for stored products, including persistence and modal control. | Same pattern as avatars; never loaded or applied to prompts in current UI shell. | **Implementation ready; needs lifecycle wiring.**【F:src/components/create/hooks/useProductHandlers.ts†L1-L96】【F:src/components/create/hooks/useProductHandlers.ts†L124-L188】
| `useStyleHandlers` | Local style selection store, modal UX, and prompt string assembly. | Internally consistent, but modal consumers instantiate the hook in isolation so selections never inform `usePromptHandlers`. | **Implementation ready; needs shared store.**【F:src/components/create/hooks/useStyleHandlers.ts†L1-L120】【F:src/components/create/hooks/useStyleHandlers.ts†L146-L215】
| `useGalleryActions` | Navigation helpers, context menu toggles, downloads/sharing, and bulk mutations. | Download/share/delete helpers are usable, yet core gallery navigation is stubbed (`handleImageClick`, folder moves) and depends on gallery state that never populates. | **Partial – requires feature completion.**【F:src/components/create/hooks/useGalleryActions.ts†L1-L116】【F:src/components/create/hooks/useGalleryActions.ts†L118-L202】

### UI components
#### Prompt & controls surface
| Component | Role | Notable gaps | Status |
| --- | --- | --- | --- |
| `PromptForm` | Orchestrates prompt input, reference picker, model selection, style/product/avatar triggers, settings, and generate CTA. | Instantiates every hook with placeholders (`{}` style map, no-op callbacks), never forwards model/aspect changes, and even misses `useMemo` import for `finalPrompt`. | **Skeleton only – replace or rewrite.**【F:src/components/create/PromptForm.tsx†L1-L115】【F:src/components/create/PromptForm.tsx†L117-L187】
| `ModelSelector` | Dropdown for choosing image/video models. | Uses `useGeneration` setter but also expects an external `onModelChange`; missing `useMemo` import and lacks provider-specific constraints. | **Partial – needs cleanup & data.**【F:src/components/create/ModelSelector.tsx†L1-L74】【F:src/components/create/ModelSelector.tsx†L108-L164】
| `ReferenceImages` | Displays selected references plus avatar/product badges and clear/add actions. | Functional, but relies on upstream handlers to provide actual files (currently unused). | **Ready for reuse once data flows.**【F:src/components/create/ReferenceImages.tsx†L1-L84】【F:src/components/create/ReferenceImages.tsx†L86-L140】
| `SettingsMenu` | Mega-menu for provider-specific advanced options (Flux, Veo, Kling, etc.). | Rich prop contract defined, yet no caller supplies the required shape; never rendered with live data. | **UI complete; needs wiring & validation.**【F:src/components/create/SettingsMenu.tsx†L1-L115】【F:src/components/create/SettingsMenu.tsx†L117-L215】
| `StyleSelectionModal` | Modal UI for multi-section style selection. | Recreates `useStyleHandlers` locally, so selections do not persist to prompts or contexts. | **UI complete; needs shared state hookup.**【F:src/components/create/StyleSelectionModal.tsx†L1-L68】【F:src/components/create/StyleSelectionModal.tsx†L102-L158】
| `AvatarPickerPortal` | Anchored portal shell for avatar selection menus. | Handles positioning & scroll locking; ready as-is. | **Production-ready utility.**【F:src/components/create/AvatarPickerPortal.tsx†L1-L73】【F:src/components/create/AvatarPickerPortal.tsx†L75-L118】
| `ChatMode` | Standalone chat-oriented creation workflow with prompt history, sessions, and avatar/product tie-ins. | Large self-contained UI; still duplicates logic from monolith and predates new contexts (no reuse of `GenerationContext`/`GalleryContext`). | **Independent experiment – evaluate separately.**【F:src/components/create/ChatMode.tsx†L1-L96】【F:src/components/create/ChatMode.tsx†L98-L159】

#### Gallery & results surface
| Component | Role | Notable gaps | Status |
| --- | --- | --- | --- |
| `ResultsGrid` | Grid of generated assets with bulk mode affordances. | Selection/like/public toggles only log actions; relies on gallery state that never populates. | **Partial – needs live gallery + handlers.**【F:src/components/create/ResultsGrid.tsx†L1-L82】【F:src/components/create/ResultsGrid.tsx†L84-L160】
| `FullImageModal` | Fullscreen viewer with navigation, sharing, and moderation toggles. | References callbacks (`handlePrevious`/`handleNext`) before declaration (runtime crash) and depends on populated `GalleryContext`. | **Partial – requires ordering fix & data.**【F:src/components/create/FullImageModal.tsx†L1-L61】【F:src/components/create/FullImageModal.tsx†L63-L118】
| `ImageActionMenu` | Context menu for single asset actions. | Folder move still a stub, but download/share/delete/toggle integrate with gallery actions. | **Mostly ready; finish folder flow.**【F:src/components/create/ImageActionMenu.tsx†L1-L72】【F:src/components/create/ImageActionMenu.tsx†L74-L138】
| `BulkActionsMenu` | Bulk selection action list (delete/public/share). | Depends on `GalleryContext` selection; otherwise operational. | **Mostly ready; needs real selection state.**【F:src/components/create/BulkActionsMenu.tsx†L1-L66】【F:src/components/create/BulkActionsMenu.tsx†L68-L142】
| `GenerationProgress` | Lists active jobs with spinners. | Reads `activeJobs` but only logs clicks; dependency list uses `activeJobs.length` directly (React warning). | **Partial – needs orchestration polish.**【F:src/components/create/GenerationProgress.tsx†L1-L39】【F:src/components/create/GenerationProgress.tsx†L41-L83】
| `GalleryPanel` | Filter sidebar + folder management for gallery view. | Extensive UI scaffolding exists, yet without populated context nothing renders; folder actions need backend integration. | **UI complete; needs data + APIs.**【F:src/components/create/GalleryPanel.tsx†L1-L84】【F:src/components/create/GalleryPanel.tsx†L268-L335】

#### Shared layout & navigation
| Component/Utility | Role | Status |
| --- | --- | --- |
| `CreateSidebar` (+ `layoutConstants.ts`, `sidebarData.ts`) | Static navigation lists and layout tokens for create surface. | Ready for reuse; pure presentation. 【F:src/components/create/CreateSidebar.tsx†L1-L72】【F:src/components/create/layoutConstants.ts†L1-L40】
| `PromptHistoryPanel` | Standalone panel for saved/recent prompts (tests exist). | UI scaffold only; depends on prompt history hook similar to `PromptForm`. **Partial – needs integration.**【F:src/components/create/PromptHistoryPanel.tsx†L1-L60】

## Gap analysis vs. target module plan
- **No orchestration layer:** None of the new modules are wired together—`PromptForm` never hydrates `usePromptHandlers`, `useStyleHandlers`, or generation APIs, so the modular surface cannot replace `Create.tsx`.【F:src/components/create/PromptForm.tsx†L28-L72】
- **Gallery pipeline missing:** Although `GalleryContext` and related menus exist, there is no ingestion of job results, no polling, and key handlers still log placeholders, leaving the grid empty.【F:src/components/create/hooks/useGalleryActions.ts†L25-L40】【F:src/components/create/ResultsGrid.tsx†L24-L64】
- **Advanced settings contract unused:** `SettingsMenu` defines exhaustive per-provider props but nothing instantiates it, so provider-specific controls remain theoretical.【F:src/components/create/SettingsMenu.tsx†L1-L115】【F:src/components/create/PromptForm.tsx†L137-L174】
- **Modal/state duplication:** Components such as `StyleSelectionModal` and `PromptForm` each create their own handler instances, preventing shared state and deviating from the target plan of context-driven coordination.【F:src/components/create/StyleSelectionModal.tsx†L10-L46】【F:src/components/create/PromptForm.tsx†L24-L48】

## Migration Safety & Current State

### Current Implementation Status
- **Production file**: `src/components/Create.tsx` (10,657 lines) ✅ ACTIVE
- **Refactor skeleton**: Was `Create.refactor-plan.tsx` (now removed) ⚠️ INCOMPLETE
- **Status**: Audit complete; refactoring on hold

### What Exists
- Modular contexts and hooks have been extracted but are NOT wired together
- Components are skeletons/placeholders without real data flows
- No actual generation API calls implemented
- Missing prompt management, reference handling, and deep-linking

### Estimated Effort to Complete
- **50-100 hours** of development + testing to fully implement the modular architecture

## Next Steps (If Refactoring Resumed)
1. Implement actual generation API calls in all provider hooks
2. Wire up prompt management and application
3. Implement reference image handling
4. Add deep-linking support for `/job/:jobId` routes
5. Test refactored components thoroughly
6. Gradually migrate to the new architecture
7. Remove old Create.tsx once verified
8. Add additional optimizations as needed

## Phase 1 action items
| Module(s) | Recommendation | Rationale |
| --- | --- | --- |
| `AvatarPickerPortal`, `CreateSidebar`, `layoutConstants.ts`, `sidebarData.ts`, `ReferenceImages` | **Reuse** | Pure presentation/portal utilities already production-quality; simply import into the new shell. | 
| `GenerationContext`, `GalleryContext`, `usePromptHandlers`, `useReferenceHandlers`, `useAvatarHandlers`, `useProductHandlers`, `useStyleHandlers`, `SettingsMenu`, `StyleSelectionModal`, `ImageActionMenu`, `BulkActionsMenu`, `GalleryPanel`, `GenerationProgress`, `ResultsGrid`, `FullImageModal` | **Expand** | Logic exists but needs real data sources, shared state, and bug fixes (e.g., handler wiring, missing imports, folder/API integrations) before shipping. | 
| `PromptForm`, `ModelSelector`, orchestration glue for generation requests | **Replace/Rewrite** | Current stubs prevent any end-to-end flow; reimplement around real contexts and hooks, importing only the reusable leaf components. | 
| `ChatMode`, `PromptHistoryPanel` | **Evaluate separately** | Parallel experiments not aligned with planned modular surface; decide whether to fold in or postpone. | 

## Phased Execution Guardrails & Validation (When Work Resumes)

### Phase 0 – Baseline Guardrails
- Capture current Create monolith behavior with parity logs or screenshots covering credit consumption, deep-link routing, and gallery refresh states before any refactor branches diverge.
- Establish the smoke test checklist (see below) and record baseline results.
- Run `pnpm typecheck`, `pnpm lint`, and the Create smoke tests to confirm the baseline passes before beginning implementation work.

### Phase 1 – Context & Data Layer Extraction
- As contexts and hooks are extracted, re-run `pnpm typecheck`, `pnpm lint`, and the Create smoke tests to ensure no regressions in credit flow, deep-link hydration, or gallery refresh triggers.
- Update parity evidence (logs or screenshots) if the refactor introduces new instrumentation or UI affordances touching those flows.

### Phase 2 – UI Component Modularization
- After restructuring UI components, re-run `pnpm typecheck`, `pnpm lint`, and the Create smoke tests.
- Capture updated screenshots/logs for any views whose layout or messaging changes to streamline QA review.

### Phase 3 – Integration & Feature Flag Readiness
- Once the modular stack is wired behind a feature flag, execute `pnpm typecheck`, `pnpm lint`, and the Create smoke tests in both monolith and modular modes.
- Collect side-by-side parity evidence (logs or annotated screenshots) for the credit flow, deep-link handling, and gallery refresh behavior while the flag is off vs. on.

### Phase 4 – Parity Validation & Launch Checklist
- Prior to enabling the feature flag for users, run `pnpm typecheck`, `pnpm lint`, and the Create smoke tests as part of the final sign-off.
- Review the smoke test outputs against the captured parity logs/screenshots to confirm functional equivalence and attach them to the rollout ticket for QA.
- Only enable the feature flag after QA validates the documented parity artifacts.

### Create Smoke Test Checklist
- **Credit flow**: Start a generation, confirm credit decrement, observe completion, and verify credits reconcile in the account header and billing logs.
- **Deep links**: Navigate directly to `/job/:jobId` for a recent generation, verify the modal or selection state hydrates correctly, and ensure back navigation returns to Create without state loss.
- **Gallery refresh**: From Create, trigger a new generation and confirm the gallery auto-refreshes with the new asset; validate manual refresh also preserves filters and selection.

Include any supplemental automation or scripted checks that cover these scenarios in CI so the smoke tests can be invoked alongside `pnpm typecheck` and `pnpm lint`.

## Expected Outcomes
- **Create.tsx**: 10,596 lines → ~500 lines (95% reduction)
- **Faster Development**: Hot reload improvements
- **Better Performance**: Reduced re-render scope
- **Easier Maintenance**: Clear component boundaries
- **Enhanced UX**: Smoother interactions with optimized components

The refactoring would transform a monolithic component into a well-architected, performant, and maintainable system while preserving all existing functionality.

*Last updated: automated audit generated during repository review.*