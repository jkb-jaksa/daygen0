# daygen.ai — Frontend Architecture Map (agent.md)

> **Purpose**: Give you (and any AI agent) a compact, deterministic map of the DayGen frontend so you can trace how things work, extend features safely, and avoid spaghetti.

---

## 0) TL;DR mental model

- **Framework & build**: React + TypeScript + Vite. Routing via React Router with heavy **lazy loading** + `Suspense` to keep initial loads snappy.
- **Auth**: JWT. Token stored in `localStorage` and injected as `Authorization: Bearer <token>` on API calls.
- **API base URL**: Resolved at runtime by `src/utils/api.ts` using environment variables. In dev (without env), Vite **proxies** `/api` and `/health` to the local backend.
- **Create flow**: The **Create** experience is driven by a big component (`src/components/Create.tsx`) and a set of **provider-specific hooks** (e.g., `useGeminiImageGeneration`, `useFluxImageGeneration`, etc.). All actual generation hits **one backend endpoint**: `POST /api/unified-generate`.
- **Protected areas**: `/create/*` is gated behind `RequireAuth` (JWT required).
- **Storage**: Final assets live in Cloudflare R2 (served via public URLs), references saved in the backend DB; the frontend displays and manages them.

---

## 1) Key folders & what they do

```text
src/
├─ auth/                 # JWT context, auth types, auth UI
├─ components/           # Page-level & shared UI (Create, Edit, Explore, Navbar, etc.)
├─ hooks/                # Generation & data hooks per AI provider, gallery utilities
├─ routes/               # Route modules (CreateRoutes, GalleryRoutes, LearnLayout, ...)
├─ styles/               # Design system (layout, text, cards, buttons, glass, ...)
├─ utils/                # API URL resolver & helpers
└─ App.tsx               # App shell, router, lazy-loaded screens, guards
```

### Most “called” files
- **App shell**: `src/App.tsx`
- **Creation UI**: `src/components/Create.tsx` (main creation workflow)
- **Auth context**: `src/auth/AuthContext.tsx` (login/signup, `logOut`, current user, token handling)
- **API URL helper**: `src/utils/api.ts` (`getApiUrl`, `getBaseUrl`)
- **Generation hooks**: 
  - `src/hooks/useGeminiImageGeneration.ts`
  - `src/hooks/useFluxImageGeneration.ts`
  - `src/hooks/useRunwayImageGeneration.ts`
  - `src/hooks/useChatGPTImageGeneration.ts`
  - `src/hooks/useIdeogramImageGeneration.ts`
  - `src/hooks/useQwenImageGeneration.ts`
  - `src/hooks/useSeeDreamImageGeneration.ts`
  - `src/hooks/useReveImageGeneration.ts`

---

## 2) Routing map (what mounts where)

> **Note**: Many pages are lazy-loaded via `React.lazy` + `Suspense` for performance.

| Path | Element / Notes |
|------|------------------|
| `/` | Home (hero + CTA to Learn and Create) |
| `/learn` | `LearnLayout` with dynamic header |
| `/learn/use-cases` | UseCases |
| `/learn/tools` | ToolsSection |
| `/learn/prompts` | Prompts |
| `/learn/courses` | Courses |
| `/use-cases` | Redirects to `/learn/use-cases` |
| `/tools` | Redirects to `/learn/tools` |
| `/prompts` | Redirects to `/learn/prompts` |
| `/courses` | Redirects to `/learn/courses` |
| `/ai-tools` | ToolsSection (flat route) |
| `/ai-tools/:id` | Subpage (tool details) |
| `/explore` | Explore (community/gallery) |
| `/create/*` | **Protected** Create routes (RequireAuth) |
| `/job/:jobId` | Deep link for a specific generated item |
| `/gallery/*` | Gallery routes |
| `/upgrade` | Upgrade (pricing/plan) |
| `/privacy-policy` | PrivacyPolicy |
| `*` | Fallback → `/` |

---

## 3) Auth model

- **Sign up / login** (UI via Auth modal) → backend issues **JWT `accessToken`** + user payload.
- **Token storage**: `localStorage` key (see code) and **attached on every request** as `Authorization: Bearer <token>`.
- **Context**: `AuthContext` exposes `{ user, logOut, ... }` to components. Navbar, Create, etc. use it to gate actions and show user state.
- **Gating**: The `/create/*` routes render within `<RequireAuth>`; unauthenticated users are redirected to sign in.

### Minimal client contract

```ts
// Pseudocode
const token = getTokenFromAuthContextOrLocalStorage();
await fetch(`${getApiUrl()}/api/auth/me`, {
  headers: { Authorization: `Bearer ${token}` }
}); // returns profile incl. credits
```

---

## 4) Backend connection (frontend perspective)

> **Local backend directory (dev):** `desktop/daygen-backend`



### API base URL resolution

- The helper `src/utils/api.ts` provides `getApiUrl()` which resolves base in this order:
  1) `VITE_API_BASE_URL`
  2) fallback: `VITE_BASE_URL`
  3) else: **relative** `/api` (dev server proxy handles it)

### Dev proxy (Vite)

- `vite.config.ts` adds a dev **proxy** only if no API URL is configured:
  - Proxies `/api` and `/health` → `http://localhost:3001`
  - Lets you run `npm run dev` without changing code when backend is local

### Core endpoints you’ll see the frontend call

- `POST /api/auth/signup` → `{ accessToken, user }`  
- `POST /api/auth/login` → `{ accessToken, user }`  
- `GET /api/auth/me` → current user (requires `Authorization: Bearer ...`)  
- `PATCH /api/users/me` → profile updates (requires Bearer)  
- `POST /api/unified-generate` → **one endpoint for all models** (requires Bearer)  
- `GET /health` → quick backend status

> **Security posture**: No provider API keys in the frontend. Credits and enforcement happen on the backend.

---

## 5) How image generation flows (end to end)

1) User enters prompt & selects a **model** in Create.  
2) The relevant **hook** (e.g., `useFluxImageGeneration`) formats a request payload.  
3) Client calls `POST /api/unified-generate` with JWT in `Authorization` header.  
4) Backend validates token and **credits**, deducts one credit, calls the provider, stores the result in R2 + DB.  
5) Response returns either base64/dataUrl or public URLs; UI updates gallery and selection.  
6) Deep links (`/job/:jobId`) navigate directly to a specific result when available.

**Payload sketch**

```jsonc
POST /api/unified-generate
{
  "prompt": "A surreal rainy city at night",
  "model": "flux-pro", // or gemini-flash-2.5, runway-gen4, ideogram, qwen-image, seedream-3.0, chatgpt-image, reve-image, ...
  "imageBase64": "data:image/png;base64,...",      // optional
  "references": ["data:image/png;base64,..."],     // optional
  "providerOptions": { /* per-model advanced options */ }
}
```

---

## 6) The Create surface (what lives there)

- **Prompt bar** with live controls and model switcher
- **Gallery & Inspirations** panels with keyboard navigation (prev/next), modals, and robust event cleanup
- **Credit-aware** UX (disable actions / show messages when credits are out)
- **Jobs deep-linking**: when opened on `/job/:jobId`, Create can hydrate the exact selection

**Pitfalls avoided recently**
- Fixed temporal-dead-zone bugs by hoisting navigation callbacks and wrapping them in `useCallback`
- Reduced hook dependency warnings and ensured event listeners are cleaned up
- Large UI is split by route modules (`CreateRoutes`, `GalleryRoutes`) for readability

---

## 7) Environment variables (frontend)

```bash
# Dev / Production
VITE_API_BASE_URL=https://<your-backend-host>   # main way to point the frontend
# Optional:
VITE_BASE_URL=https://<fallback-host>           # legacy/fallback support
VITE_SITE_PASSWORD=<optional-password>          # if enabled by backend
```

- **Local backend**: set `VITE_API_BASE_URL=http://localhost:3001` and run both servers.
- With neither `VITE_API_BASE_URL` nor `VITE_BASE_URL` set, dev server uses **proxy** for `/api` and `/health`.

---

## 8) Add a new AI provider (frontend checklist)

1) Pick or create a **hook** in `src/hooks/` (mirror the pattern of existing hooks).  
2) The hook should call the **same** `POST /api/unified-generate` endpoint, passing a distinct `model` value and any `providerOptions`.  
3) Add UI controls in **Create** (model selector, options form).  
4) (Optional) Expose it in `/learn/tools` and `/ai-tools` if it’s a headline feature.  
5) Validate: can sign in, can generate, credit decrements, item shows in gallery, deep-link works.

---

## 9) Conventions that keep code clean

- **Only one place decides API base URL** → `src/utils/api.ts`
- **Only one endpoint for generation** → simplifies UI and reduces branching
- **Auth token is always read from context** → avoid prop-drilling tokens
- **Lazy-load routes** for speed; keep page shells light
- **Prefer small hooks** over massive components for side-effectful logic
- **Clean up event listeners** and put all dependencies in `useEffect` arrays
- **Name routes & paths clearly** so future redirects/aliases remain obvious

---

## 10) Quick trace examples (copy/paste for agents)

**Get current user & credits**
```ts
const token = getToken();
const res = await fetch(`${getApiUrl()}/api/auth/me`, {
  headers: { Authorization: `Bearer ${token}` }
});
const me = await res.json();
```

**Generate an image (Flux)**
```ts
await fetch(`${getApiUrl()}/api/unified-generate`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({
    prompt: 'cinematic portrait, 35mm, soft light',
    model: 'flux-pro'
  })
});
```

**Navigate to Learn → Tools**
```tsx
<NavLink to="/learn/tools">Tools</NavLink>
```

---

## 11) Where frontend meets backend (single-page summary)

- **Auth**: `/api/auth/signup`, `/api/auth/login`, `/api/auth/me`
- **Generation**: `/api/unified-generate`
- **Users**: `/api/users/me`
- **Health**: `/health`
- **JWT**: always `Authorization: Bearer <token>`
- **Credits**: enforced server-side; frontend just reflects state
- **Assets**: delivered from R2 via public URLs and listed in gallery

---

## 12) Next steps (if you’re onboarding yourself)

- Run frontend with the **cloud backend** (`VITE_API_BASE_URL` set) and confirm: sign up → credits (3) → generate → see in gallery.
- Then try **local backend** (set `VITE_API_BASE_URL=http://localhost:3001`) to iterate on APIs quickly.
- If you touch Create, keep logic in **hooks** where possible; keep the component visual.
- When adding routes, prefer **nested routes** inside `routes/` and gate protected areas with `RequireAuth`.

---

*End of file.*
