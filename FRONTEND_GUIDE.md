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
  "model": "flux-2-pro",
  "providerOptions": {}
}
```

---

## Design System

**Full Guide**: See [DESIGN_GUIDELINES.md](./DESIGN_GUIDELINES.md) for comprehensive patterns.

### Quick Patterns

```tsx
import { buttons, cards, glass, inputs, iconButtons } from "../styles/designSystem";

// PRIMARY BUTTON (most common)
<button className="btn btn-white font-raleway text-base font-medium parallax-large">
  Action
</button>

// SEMANTIC BUTTON (Pro tier only)
<button className="btn btn-cyan font-raleway text-base font-medium parallax-large">
  Subscribe to Pro
</button>

// GHOST BUTTON (secondary)
<button className="btn btn-ghost font-raleway text-base font-medium parallax-large">
  Cancel
</button>

// INTERACTIVE CARD
<div className={`${cards.shell} p-6 parallax-small mouse-glow`}>
  Card content
</div>

// MODAL CONTAINER
<div className={`${glass.surface} rounded-2xl p-6`}>
  Modal content
</div>

// INPUT FIELD
<input className={inputs.compact} />

// ICON BUTTON
<button className={iconButtons.sm}>
  <Icon className="w-4 h-4" />
</button>
```

### Key Rules

1. **Typography**: Only `font-normal` (body) and `font-medium` (emphasis) - NO `font-bold`
2. **Buttons**: Always `rounded-full` with `font-medium` text
3. **Cards**: Use `${cards.shell}` (includes `rounded-[28px]`)
4. **Primary CTA**: Always `btn-white` (colorful buttons only for semantic purposes)
5. **Spacing**: Design tokens for layout, Tailwind for components (hybrid)
6. **Colors**: Always use theme tokens (`text-theme-*`, `bg-theme-*`)

### Border Radius Standards

| Element | Radius |
|---------|--------|
| Buttons | `rounded-full` |
| Cards | `rounded-[28px]` |
| Modals | `rounded-2xl` |
| Inputs | `rounded-xl` |
| Small boxes | `rounded-lg` |

### When to Use Design System vs Custom

**Use Design System** (`${utility}`):
- Buttons: `${buttons.primary}`, `${buttons.ghost}`
- Cards: `${cards.shell}`
- Layout: `${layout.container}`, `${layout.sectionPadding}`
- Glass effects: `${glass.surface}`, `${glass.promptDark}`
- Inputs: `${inputs.compact}`
- Icon buttons: `${iconButtons.sm}`

**Use Custom/Tailwind**:
- Unique component spacing: `p-6`, `gap-4`, `mb-2`
- Grid layouts: `grid-cols-2`, `gap-2`
- Positioning: `absolute`, `relative`, `fixed`
- Flex layouts: `flex`, `items-center`, `justify-between`
- Responsive utilities: `sm:hidden`, `lg:flex`

---

## Useful Conventions

- Single source of API base: `src/utils/api.ts`
- Keep side effects in small hooks; keep components visual
- Clean up event listeners; include deps in `useEffect`
- Lazy-load route modules for performance
- **Follow design system** for all UI components

---

## References

- **Design system**: [DESIGN_GUIDELINES.md](./DESIGN_GUIDELINES.md)
- **Technical standards**: [docs/DESIGN_STANDARDS.md](./docs/DESIGN_STANDARDS.md)
- Full frontend map: `./agents.md`
- Backend guide: `../daygen-backend/docs/BACKEND_GUIDE.md`

