# daygen.ai — Agents Guide (agents.md)
_Last updated: 2025‑11‑02_

> **Purpose**: a compact, deterministic map of the DayGen frontend 
> **Important**: Image/video generation uses **provider‑specific** endpoints (no unified endpoint). Long‑running work is **job‑based**.

---

## 0) Agent Quickstart

### Run & Debug
- Dev (frontend): `pnpm dev`  
- Typecheck: `pnpm typecheck` · Lint: `pnpm lint` · Build: `pnpm build`  
- Backend base for local dev: set `VITE_API_BASE_URL=http://localhost:3000`

### Key Code Entrypoints
- Router shell: `src/App.tsx`
- Create (orchestrator): `src/components/create/Create-refactored.tsx` (374 lines, modular)
- Generation controller: `src/components/create/hooks/useCreateGenerationController.ts` (1,091 lines)
- Contexts: `src/components/create/contexts/{GenerationContext,GalleryContext}.tsx`
- API helpers: `src/utils/api.ts` (`getApiUrl`, `apiFetch`, `withTimeout`)

### Glossary
- **jobId**: server‑issued identifier for a queued generation; poll `/api/jobs/:jobId`.
- **providerOptions**: route‑specific options (e.g., aspect ratio, size, seed).
- **r2FileId/url**: asset reference stored in Cloudflare R2.

---

## 1) Hook → Endpoint Map

| Hook                              | Endpoint                      | Returns            | Notes |
|----------------------------------|-------------------------------|--------------------|-------|
| `useFluxImageGeneration`         | `POST /api/image/flux`        | `{ jobId }`        | poll `/api/jobs/:jobId` |
| `useGeminiImageGeneration`       | `POST /api/image/gemini`      | `{ jobId }`        | ″ |
| `useLumaImageGeneration`         | `POST /api/image/luma`        | `{ jobId }`        | ″ |
| `useRunwayImageGeneration`       | `POST /api/image/runway`      | `{ jobId }`        | ″ |
| `useChatGPTImageGeneration`      | `POST /api/image/chatgpt`     | `{ jobId }`        | ″ |
| `useIdeogramImageGeneration`     | `POST /api/image/ideogram`    | `{ jobId }`        | ″ |
| `useQwenImageGeneration`         | `POST /api/image/qwen`        | `{ jobId }`        | ″ |
| `useReveImageGeneration`         | `POST /api/image/reve`        | `{ jobId }`        | ″ |
| `useLumaVideoGeneration`         | `POST /api/video/luma`        | `{ jobId }`        | video generation |
| `useRunwayVideoGeneration`       | `POST /api/video/runway`      | `{ jobId }`        | ″ |
| `useHailuoVideoGeneration`       | `POST /api/video/hailuo`      | `{ jobId }`        | ″ |
| `useKlingVideoGeneration`        | `POST /api/video/kling`       | `{ jobId }`        | ″ |
| `useSeedanceVideoGeneration`     | `POST /api/video/seedance`    | `{ jobId }`        | ″ |
| `useVeoVideoGeneration`          | `POST /api/video/veo`         | `{ jobId }`        | ″ |
| `useWanVideoGeneration`          | `POST /api/video/wan`         | `{ jobId }`        | ″ |
| Poll job                         | `GET /api/jobs/:jobId`        | job status & result| `status: queued|running|succeeded|failed` |

Minimal example:
```ts
await apiFetch(getApiUrl('/api/image/flux'), {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'cinematic portrait',
    model: 'flux-2-pro',                    // provider‑appropriate id
    providerOptions: { width: 1024, height: 1024, safety_tolerance: 2 }, // optional
    references: []                        // optional
  })
});
```

---

## 2) Provider Payload Matrix (minimal)

| Provider  | Required fields          | Common `providerOptions`                         | Response shape (on success)        |
|----------|---------------------------|--------------------------------------------------|------------------------------------|
| flux     | `prompt`, `model`         | `width`, `height`, `safety_tolerance`, `prompt_upsampling`, `guidance`, `steps`, `input_image[_2..8]` | `{ jobId }` → poll → `{ images[] }` |
| gemini   | `prompt`, `model`         | `aspectRatio`, `safety`, `style`                 | `{ jobId }` → poll → `{ images[] }` |
| luma     | `prompt`, `model`         | `aspectRatio`, `quality`                         | `{ jobId }` → poll → `{ images[]|videos[] }` |
| runway   | `prompt`, `model`         | `aspectRatio`, `motion`, `duration` (video)      | `{ jobId }` → poll → `{ images[]|videos[] }` |
| qwen     | `prompt`, `model`         | `size`, `negativePrompt`, `watermark`            | `{ jobId }` → poll → `{ images[] }` |
| ideogram | `prompt`                  | `style`, `negativePrompt`                        | `{ jobId }` → poll → `{ images[] }` |
| chatgpt  | `prompt`, `model`         | `size`, `background`, `quality`                  | `{ jobId }` → poll → `{ images[] }` |
| reve     | `prompt`                  | `style`, `ratio`                                 | `{ jobId }` → poll → `{ images[] }` |

> Treat the matrix as guidance; check each hook for the exact options currently wired.

---

## 3) Error Cheatsheet

| Scenario / code | Likely cause                          | UI behavior (suggested)                                |
|-----------------|---------------------------------------|--------------------------------------------------------|
| 401/403         | Missing/expired token                 | Prompt login; preserve prompt & references             |
| 402             | Credits exhausted                     | Show upgrade/credits CTA; keep `jobId` if present      |
| 429             | Rate limited                          | Exponential backoff & “Retry”                          |
| 5xx/provider    | Transient provider failure            | Suggest retry; keep state intact                       |
| Job `FAILED`    | Provider rejected / internal error    | Show inline error on the job card; allow re‑run        |
| Network abort   | Timeout/user navigate                 | Toast + keep draft inputs                              |

---

## 4) Job Lifecycle (client view)

1) POST `/api/image/<provider>` → `{ jobId }`  
2) Poll `GET /api/jobs/:jobId` until `status === "succeeded" | "failed"`  
3) On success: merge results into gallery; on fail: show error & allow retry  
4) Deep links: `/job/:jobId` route preselects the result in Create

---

## 5) Project Structure (frontend)

```text
src/
├─ auth/                 # JWT context, auth UI
├─ components/           # Page-level & shared UI
│  └─ create/            # Modular Create surface ✅ ACTIVE
│     ├─ Create-refactored.tsx        # Main orchestrator (374 lines)
│     ├─ contexts/
│     │  ├─ GenerationContext.tsx     # Model selection, provider settings, job tracking
│     │  ├─ GalleryContext.tsx        # Gallery state, filters, selection, deep-links
│     │  └─ hooks.ts                  # Context consumer hooks
│     ├─ hooks/
│     │  ├─ useCreateGenerationController.ts  # Orchestrates all providers (1,091 lines)
│     │  ├─ usePromptHandlers.ts      # Prompt state, history, saved prompts
│     │  ├─ useReferenceHandlers.ts   # File uploads, paste, drag-drop
│     │  ├─ useAvatarHandlers.ts      # Avatar CRUD & persistence
│     │  ├─ useProductHandlers.ts     # Product CRUD & persistence
│     │  ├─ useStyleHandlers.ts       # Style selection & application
│     │  └─ useGalleryActions.ts      # Download, share, delete, navigation
│     ├─ PromptForm.tsx               # Prompt input with controls
│     ├─ ModelSelector.tsx            # Model picker dropdown
│     ├─ ReferenceImages.tsx          # Reference image previews
│     ├─ ResultsGrid.tsx              # Gallery grid with thumbnails
│     ├─ FullImageModal.tsx           # Full-size image viewer
│     ├─ GenerationProgress.tsx       # Active job progress list
│     ├─ SettingsMenu.tsx             # Provider-specific settings
│     ├─ StyleSelectionModal.tsx      # Style picker modal
│     ├─ ImageActionMenu.tsx          # Single image actions
│     ├─ BulkActionsMenu.tsx          # Multi-select actions
│     ├─ GalleryFilters.tsx           # Gallery filter controls
│     ├─ GallerySelectionBar.tsx      # Bulk selection bar
│     ├─ GalleryPanel.tsx             # Sidebar for gallery view
│     ├─ CreateSidebar.tsx            # Category navigation sidebar
│     ├─ ComingSoonCategory.tsx       # Placeholder for text/audio
│     ├─ ChatMode.tsx                 # Alternative chat-based UI
│     ├─ layoutConstants.ts           # Layout tokens
│     ├─ sidebarData.ts               # Navigation data
│     ├─ types.ts                     # Shared types
│     └─ shared/                      # Reusable utilities
│        ├─ CustomDropdown.tsx
│        ├─ CustomMultiSelect.tsx
│        └─ MenuPortal.tsx
├─ hooks/                # Provider hooks (call /api/image/*), gallery/data hooks
├─ routes/               # Route modules (CreateRoutes, GalleryRoutes, LearnLayout, ...)
├─ styles/               # Design system
├─ utils/                # `getApiUrl`, `apiFetch`, `withTimeout`, helpers
└─ App.tsx               # App shell, router, lazy-loaded screens, guards
```

---

## 5a) Create Surface Architecture

The Create surface has been refactored from a monolithic 10,657-line component into a modular architecture totaling ~1,500 lines across focused modules.

### Data Flow

```
User Input
  ↓
PromptForm + Controls
  ↓
useCreateGenerationController (orchestrator)
  ↓
Provider Hooks (useFluxImageGeneration, useGeminiImageGeneration, etc.)
  ↓
POST /api/image/<provider> → { jobId }
  ↓
GenerationContext (tracks active jobs)
  ↓
Poll /api/jobs/:jobId
  ↓
GalleryContext (merges results)
  ↓
ResultsGrid + FullImageModal
```

### Key Components

- **Create-refactored.tsx** (374 lines): Main orchestrator component that wires contexts, routing, and UI layout
- **useCreateGenerationController** (1,091 lines): Single-responsibility hook that orchestrates all 13+ provider integrations, reference handling, and settings
- **GenerationContext**: Manages model selection, provider-specific settings, and active job tracking
- **GalleryContext**: Manages gallery items, filters, selection state, and deep-link hydration for `/job/:jobId`

### Benefits

- **95% size reduction**: 10,657 lines → 374 lines (orchestrator) + 1,091 lines (controller)
- **Faster hot reload**: Changes to individual components don't re-render entire surface
- **Clear boundaries**: Each hook/component has single responsibility
- **Easier maintenance**: Find and modify features in dedicated files

---

## 6) Routing map

> Many pages are lazy‑loaded via `React.lazy` + `Suspense` for performance.

| Path            | Element / Notes                                  |
|-----------------|---------------------------------------------------|
| `/`             | Home (hero + CTA to Learn and Create)            |
| `/learn`        | `LearnLayout` with dynamic header                 |
| `/learn/use-cases` | UseCases                                      |
| `/learn/tools`  | ToolsSection                                      |
| `/learn/prompts`| Prompts                                           |
| `/learn/courses`| Courses                                           |
| `/use-cases`    | Redirect → `/learn/use-cases`                     |
| `/tools`        | Redirect → `/learn/tools`                         |
| `/prompts`      | Redirect → `/learn/prompts`                       |
| `/courses`      | Redirect → `/learn/courses`                       |
| `/ai-tools`     | ToolsSection (flat route)                         |
| `/ai-tools/:id` | Subpage (tool details)                            |
| `/explore`      | Explore (community/gallery)                       |
| `/create/*`     | **Protected** Create routes (`RequireAuth`)       |
| `/job/:jobId`   | Deep link for a specific generated item           |
| `/gallery/*`    | Gallery routes                                    |
| `/upgrade`      | Upgrade (pricing/plan)                            |
| `/privacy-policy` | PrivacyPolicy                                   |
| `*`             | Fallback → `/`                                    |

---

## 7) Auth model

- Sign up / login → backend issues **JWT `accessToken`** + user payload  
- Token stored in `localStorage` and added as `Authorization: Bearer <token>`  
- `<RequireAuth>` gates `/create/*`  
- Minimal client check:
```ts
const token = getTokenFromAuthContextOrLocalStorage();
await apiFetch(getApiUrl('/api/auth/me'), {
  headers: { Authorization: `Bearer ${token}` }
});
```

---

## 8) API utilities

- **`getApiUrl(path)`** — builds full URL for proxied vs. absolute calls  
- **`apiFetch(url, opts)`** — fetch with standardized error mapping & optional retries  
- **`withTimeout(signal?, ms=120_000)`** — returns an `AbortSignal` that auto‑aborts (optionally chained)

### Dev proxy (Vite)
- If no API base is configured, the dev server **proxies** `/api` and `/health` to your local backend (default `http://localhost:3000`).

---

## 9) Add a new provider (frontend checklist)

1) Add/clone a hook in `src/hooks/` (follow the existing pattern)  
2) Call **`POST /api/image/<provider>`** with a distinct `model` and any `providerOptions`  
3) Wire it into **Create** (ModelSelector + options form)  
4) Validate: Sign in → generate → credit decrements → gallery item appears → deep‑link works

---

## 10) Common tasks (recipes)

- **Open a generated item from a share**: navigate to `/job/:jobId` to hydrate selection in Create  
- **Throttle requests**: use `withTimeout` + controller to cancel on navigation  
- **Persist small UI state**: use storage helpers (e.g., `setPersistedValue`) in `utils`

---

*End of file.*
