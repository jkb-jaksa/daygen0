# DayGen

## Environment Setup

Create a `.env` file in the root directory with the following variables:

```bash
# Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here

# BFL API Configuration
BFL_API_KEY=your_bfl_api_key_here
BFL_API_BASE=https://api.bfl.ai
BFL_WEBHOOK_SECRET=your_webhook_secret_here

# OpenAI API Key for ChatGPT Image Generation
OPENAI_API_KEY=sk-your_openai_api_key_here

# Ideogram API Key for advanced image generation and editing
IDEOGRAM_API_KEY=your_ideogram_api_key_here

# Server Configuration
PORT=3000
NODE_ENV=development

# Base URL for webhooks (update for production)
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## 🎨 AI Image Generation Features

DayGen supports multiple AI models for image generation and editing:

### Supported Models
- **Gemini 2.5 Flash Image** - Best for image editing and manipulation
- **FLUX Pro 1.1** - High-quality text-to-image generation
- **FLUX Pro 1.1 Ultra** - Ultra-high quality 4MP+ generation
- **FLUX Kontext Pro/Max** - Advanced image editing with text prompts
- **ChatGPT Image** - Popular image generation model
- **Ideogram 3.0** - Advanced image generation, editing, and enhancement

### Ideogram 3.0 Features
- **Generate**: Text-to-image with aspect ratio control and style presets
- **Edit**: Image editing with mask support
- **Reframe**: Convert square images to any target resolution
- **Replace Background**: Automatic subject detection and background replacement
- **Upscale**: High-quality image upscaling with detail control
- **Describe**: Automatic image captioning and alt text generation

For detailed Ideogram integration documentation, see [IDEOGRAM_INTEGRATION.md](./IDEOGRAM_INTEGRATION.md).

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
  - `api/create-intent.ts:1` – Stripe Node function for `/api/create-intent`.
  - `vercel.json:1` – Routes all traffic through the Edge function; bypassed requests hit the original path.

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
