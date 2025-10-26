# DayGen Frontend Guide

> One-page practical guide for developing the DayGen frontend. For the full architecture map, see `./agents.md`.

---

## Quick Start

```bash
npm ci
npm run dev
```

API base resolution (`src/utils/api.ts`):

1) `VITE_API_BASE_URL` → 2) `VITE_BASE_URL` → 3) dev proxy to `/api` and `/health`.

---

## Environment

```env
VITE_API_BASE_URL=http://localhost:3000
# optional
VITE_BASE_URL=https://fallback
VITE_SITE_PASSWORD=
```

Set `VITE_API_BASE_URL` to your backend URL (local or cloud).

---

## Routing (high level)

| Path | Notes |
|------|------|
| `/` | Home |
| `/learn/*` | Learn pages (use-cases, tools, prompts, courses) |
| `/explore` | Gallery/Explore |
| `/create/*` | Protected create flow (requires JWT) |
| `/job/:jobId` | Deep link to generated item |
| `/gallery/*` | Gallery routes |
| `/upgrade` | Pricing/plan |

---

## Auth Model

- JWT stored in `localStorage`; attached as `Authorization: Bearer <token>`.
- `src/auth/AuthContext.tsx` exposes `{ user, logOut, ... }`.
- Protected routes wrapped by `RequireAuth`.

Minimal client request:

```ts
const token = getToken();
await fetch(`${getApiUrl()}/api/auth/me`, {
  headers: { Authorization: `Bearer ${token}` }
});
```

---

## Create Flow (providers)

- Main surface: `src/components/Create.tsx`
- Provider hooks call backend routes:
  - `POST /api/image/gemini`
  - `POST /api/image/flux`
  - `POST /api/image/ideogram`
  - `POST /api/image/runway`
  - `POST /api/image/recraft`
  - `POST /api/image/reve`
  - `POST /api/image/luma`
  - `POST /api/image/qwen`
  - `POST /api/image/seedream`

Payload sketch:

```jsonc
{
  "prompt": "cinematic portrait",
  "model": "flux-pro",
  "providerOptions": {}
}
```

---

## Useful Conventions

- Single source of API base: `src/utils/api.ts`
- Keep side effects in small hooks; keep components visual
- Clean up event listeners; include deps in `useEffect`
- Lazy-load route modules for performance

---

## References

- Full frontend map: `./agents.md`
- Backend guide: `../daygen-backend/docs/BACKEND_GUIDE.md`


