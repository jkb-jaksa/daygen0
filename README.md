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

# Qwen Image API (Alibaba Cloud DashScope) for text-to-image and image editing
DASHSCOPE_API_KEY=your_dashscope_api_key_here
DASHSCOPE_BASE=https://dashscope-intl.aliyuncs.com/api/v1

# Runway API Key for Gen-4 and Gen-4 Turbo models
RUNWAY_API_KEY=your_runway_api_key_here

# MiniMax Hailuo 02 Video Generation
MINIMAX_API_KEY=your_minimax_api_key_here
MINIMAX_GROUP_ID=your_minimax_group_id_here
# MINIMAX_BASE_URL=https://api.minimax.io

# Kling Video Generation (Text-to-Video)
KLING_ACCESS_KEY=your_kling_access_key_here
KLING_SECRET_KEY=your_kling_secret_key_here
# KLING_API_BASE_URL=https://api-singapore.klingai.com

# Seedream 3.0 API Key for high-quality image generation
ARK_API_KEY=your_ark_api_key_here
ARK_BASE=https://ark.ap-southeast.bytepluses.com/api/v3

# Reve API Key for text-to-image and image editing
REVE_API_KEY=your_reve_api_key_here
REVE_BASE_URL=https://api.reve.com
REVE_PROJECT_ID=your_reve_project_id_here
REVE_WEBHOOK_SECRET=your_reve_webhook_secret_here

# Recraft API Key for advanced image generation and editing
VITE_RECRAFT_API_KEY=your_recraft_api_key_here
VITE_RECRAFT_API_BASE=https://external.api.recraft.ai/v1

# Client-side environment variables
VITE_BFL_API_KEY=your_bfl_api_key_here
VITE_BFL_API_BASE=https://api.bfl.ai
VITE_BFL_WEBHOOK_SECRET=your_webhook_secret_here
VITE_SITE_PASSWORD=your_dev_password_here

# Server Configuration
PORT=3000
NODE_ENV=development

# Base URL for webhooks (update for production)
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## 🎨 AI Generation Features

DayGen supports multiple AI models for both image and video generation:

### 🖼️ Image Generation Models
- **Gemini 2.5 Flash Image** - Best for image editing and manipulation
- **FLUX Pro 1.1** - High-quality text-to-image generation
- **FLUX Pro 1.1 Ultra** - Ultra-high quality 4MP+ generation
- **FLUX Kontext Pro/Max** - Advanced image editing with text prompts
- **ChatGPT Image** - Popular image generation model
- **Ideogram 3.0** - Advanced image generation, editing, and enhancement
- **Qwen Image** - Alibaba Cloud's text-to-image and image editing model
- **Runway Gen-4** - Great image model with control & editing features
- **Runway Gen-4 Turbo** - Fast Runway generation with reference images
- **Seedream 3.0** - High-quality text-to-image generation with editing capabilities
- **Reve Image** - Great text-to-image and image editing
- **Recraft v3** - Advanced image generation with text layout and brand controls
- **Recraft v2** - High-quality image generation and editing
- **Luma Photon 1** - High-quality image generation with Photon
- **Luma Photon Flash 1** - Fast image generation with Photon Flash

### 🎬 Video Generation Models
- **Veo 3** - Google's advanced video generation model with cinematic quality
- **Runway Gen-4 (Video)** - Text-to-video using Gen-4 Turbo
- **Wan 2.2 Video** - Alibaba's Wan 2.2 text-to-video model
- **Hailuo 02** - MiniMax video with start & end frame control
- **Kling** - ByteDance's cinematic video model with hyper-realistic motion
- **Seedance 1.0 Pro (Video)** - Great quality text-to-video generation
- **Luma Ray 2** - High-quality video generation with Ray 2

### Gemini 2.5 Flash Image Features
- **Generate**: Text-to-image generation from descriptions
- **Edit**: Image-to-image editing with text prompts
- **High Quality**: Professional-grade image generation
- **Fast Processing**: Optimized for speed and efficiency
- **Multiple Formats**: Support for various image formats
- **Google Integration**: Seamless integration with Google AI services

### Ideogram 3.0 Features
- **Generate**: Text-to-image with aspect ratio control and style presets
- **Edit**: Image editing with mask support
- **Reframe**: Convert square images to any target resolution
- **Replace Background**: Automatic subject detection and background replacement
- **Upscale**: High-quality image upscaling with detail control
- **Describe**: Automatic image captioning and alt text generation

### Qwen Image Features
- **Generate**: Text-to-image with multiple aspect ratios (1:1, 16:9, 4:3, 3:4, 9:16)
- **Edit**: Image-to-image editing with text prompts
- **Prompt Extend**: Automatic enhancement of short prompts
- **Watermark Control**: Optional watermarking of generated images
- **High Quality**: Professional-grade image generation up to 1664×928 resolution

### Runway Gen-4 Features
- **Generate**: High-quality text-to-image generation
- **Edit**: Advanced image editing with precise control
- **Reference Images**: Use reference images to guide generation
- **Style Transfer**: Apply artistic styles to generated images
- **High Resolution**: Generate images up to 4MP resolution

### Seedream 3.0 Features
- **Generate**: High-quality text-to-image generation
- **Edit**: Image editing with text prompts
- **Style Control**: Multiple artistic styles and presets
- **Aspect Ratios**: Support for various aspect ratios
- **Fast Generation**: Optimized for speed and quality

### Reve Image Features
- **Generate**: Text-to-image generation from descriptions
- **Edit**: Modify existing images using text instructions
- **Remix**: Combine text prompts with reference images
- **Async Processing**: Jobs processed asynchronously with status polling
- **Base64 Storage**: Images stored as base64 data URLs

### FLUX Features
- **FLUX Pro 1.1**: Standard high-quality text-to-image generation
- **FLUX Pro 1.1 Ultra**: Ultra-high quality 4MP+ generation
- **FLUX Kontext Pro/Max**: Advanced image editing with text prompts
- **Custom Dimensions**: Support for custom width/height settings
- **Aspect Ratio Control**: Flexible aspect ratio options
- **Webhook Integration**: Asynchronous processing with status updates
- **Multiple Models**: Choose between different FLUX model variants
- **High Resolution**: Generate images up to 4MP resolution

### Recraft Features
- **Generate**: Text-to-image generation with multiple styles and controls
- **Image-to-Image**: Transform existing images with text prompts
- **Inpainting**: Edit specific regions of images using masks
- **Text Layout**: Position text elements precisely in generated images (v3 only)
- **Brand Controls**: Specify colors, artistic levels, and background colors
- **Vectorization**: Convert images to vector graphics
- **Background Removal**: Automatic subject detection and background removal
- **Upscaling**: High-quality image enhancement and upscaling
- **Multiple Styles**: Realistic, digital illustration, vector, and icon styles

## 🎬 Video Generation Features

### Veo 3 Features
- **Text-to-Video**: Generate cinematic videos from text descriptions
- **High Quality**: Professional-grade video generation up to 1080p
- **Cinematic Motion**: Natural physics and realistic human motion
- **Sound Integration**: Videos include synchronized audio
- **Multiple Aspect Ratios**: Support for 16:9, 9:16, and 1:1 formats
- **Negative Prompts**: Exclude unwanted elements from generation

### Kling Features
- **Text-to-Video**: Generate videos from text prompts
- **Model Options**: Kling V2.1 Master (latest) and V2 Master
- **Aspect Ratios**: 16:9, 9:16, and 1:1 support
- **Duration Control**: 5 or 10 second videos
- **Generation Modes**: Standard (720p/24fps) and Professional (1080p/48fps)
- **Camera Movement**: Advanced camera control with preset movements
- **CFG Scale**: Creativity control from 0-1
- **Negative Prompts**: Fine-tune generation with exclusion prompts

### Runway Gen-4 Video Features
- **Text-to-Video**: Generate videos using Gen-4 Turbo
- **High Quality**: Professional video generation
- **Multiple Formats**: Support for various aspect ratios
- **Fast Generation**: Optimized for speed and quality
- **Style Control**: Apply artistic styles to generated videos

### Wan 2.2 Video Features
- **Text-to-Video**: Alibaba's advanced text-to-video generation
- **High Quality**: 5-second high-quality clips
- **Multiple Aspect Ratios**: Flexible format support
- **Fast Processing**: Optimized generation pipeline

### Hailuo 02 Features
- **Text-to-Video**: MiniMax video generation with frame control
- **Start/End Frame Control**: Specify first and last frames
- **Resolution Options**: Multiple quality settings
- **Duration Control**: Customizable video length
- **Watermark Options**: Optional branding control

### Seedance 1.0 Pro Video Features
- **Text-to-Video**: High-quality text-to-video generation
- **Multiple Formats**: Support for various aspect ratios
- **Professional Quality**: High-resolution output
- **Fast Generation**: Optimized processing

### Luma Ray 2 Features
- **Text-to-Video**: High-quality video generation with Ray 2
- **Multiple Resolutions**: Support for various quality settings
- **Duration Control**: Customizable video length
- **Style Options**: Multiple generation presets

For detailed integration documentation, see:
- [GEMINI_INTEGRATION.md](./GEMINI_INTEGRATION.md)
- [FLUX_INTEGRATION_GUIDE.md](./FLUX_INTEGRATION_GUIDE.md)
- [IDEOGRAM_INTEGRATION.md](./IDEOGRAM_INTEGRATION.md)
- [REVE_INTEGRATION.md](./REVE_INTEGRATION.md)
- [RECRAFT_INTEGRATION.md](./RECRAFT_INTEGRATION.md)
- [RUNWAY_INTEGRATION.md](./RUNWAY_INTEGRATION.md)

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
