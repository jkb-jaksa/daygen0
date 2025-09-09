# DayGen

## Site Password Protection

This repo includes two layers of protection:

- Server-side (Vercel Edge Basic Auth) – for production security.
- Client-side gate – convenient for local/dev only.

Client gate usage (dev only)
- Run locally with: `VITE_SITE_PASSWORD=yourpassword npm run dev`
- The gate is automatically DISABLED in production builds; only the server-side Basic Auth applies live.
- The password is remembered for the tab session via `sessionStorage`. You can also unlock via `?pw=yourpassword`.

Note: Use the edge Basic Auth for real protection in production. The client gate is only for lightweight dev gating.

## Vercel Basic Auth (Edge)

This repo includes an Edge Function to protect the whole site on Vercel via HTTP Basic Auth.

- Files:
  - `api/auth.ts:1` – Edge function that enforces Basic Auth and proxies the request.
  - `vercel.json:1` – Routes all traffic through the Edge function, while keeping `backend/create-intent.ts:1` mapped to `/api/create-intent`.

- Configure credentials using environment variables (set in Vercel Project Settings → Environment Variables):
  - `BASIC_AUTH` in the form `username:password` (recommended), or
  - `BASIC_AUTH_USER` and `BASIC_AUTH_PASS` separately.

- Deployment behavior:
  - Only enforced on production: the Edge auth is bypassed for `VERCEL_ENV !== 'production'` (Preview and local dev).
  - If no credentials are set, the Edge function allows all traffic (no-op).
  - When credentials are set, production requests return `401` until the browser supplies valid Basic Auth credentials.
  - Valid requests are internally re-fetched with an `x-auth-checked: 1` header to bypass re-checking.

Tip: You can keep the client-side `VITE_SITE_PASSWORD` gate for local/dev while relying on Basic Auth in production.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      ...tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      ...tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      ...tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
