# Recraft 3.0 Integration Guide

This document describes the Recraft 3.0 API integration for daygen.ai.

## Environment Setup

Add the following environment variables to your `.env` file:

```bash
# Recraft API Configuration
VITE_RECRAFT_API_KEY=your_recraft_api_key_here
VITE_RECRAFT_API_BASE=https://external.api.recraft.ai/v1
```

## API Endpoints

### 1. Text-to-Image Generation
- **Endpoint**: `/api/recraft/generate`
- **Method**: POST
- **Content-Type**: application/json

**Request Body:**
```json
{
  "prompt": "A beautiful landscape with mountains",
  "style": "realistic_image",
  "substyle": "photography",
  "model": "recraftv3",
  "size": "1024x1024",
  "n": 1,
  "negative_prompt": "blurry, low quality",
  "controls": {
    "artistic_level": 2,
    "colors": [{"rgb": [255, 0, 0]}],
    "background_color": {"rgb": [255, 255, 255]},
    "no_text": false
  },
  "text_layout": [
    {
      "text": "DAYGEN",
      "bbox": [[0.1, 0.1], [0.9, 0.1], [0.9, 0.25], [0.1, 0.25]]
    }
  ],
  "response_format": "url"
}
```

### 2. Image-to-Image Transformation
- **Endpoint**: `/api/recraft/image-to-image`
- **Method**: POST
- **Content-Type**: multipart/form-data

**Form Data:**
- `image`: File (required)
- `prompt`: string (required)
- `strength`: number (0-1, required)
- `style`: string (optional)
- `substyle`: string (optional)
- `model`: string (optional, default: recraftv3)
- `n`: number (optional, default: 1)
- `response_format`: string (optional, default: url)
- `negative_prompt`: string (optional)

### 3. Inpainting
- **Endpoint**: `/api/recraft/inpaint`
- **Method**: POST
- **Content-Type**: multipart/form-data

**Form Data:**
- `image`: File (required)
- `mask`: File (required, grayscale)
- `prompt`: string (required)
- `style`: string (optional)
- `substyle`: string (optional)
- `model`: string (optional, default: recraftv3)
- `n`: number (optional, default: 1)
- `response_format`: string (optional, default: url)
- `negative_prompt`: string (optional)

### 4. User Information
- **Endpoint**: `/api/recraft/user`
- **Method**: GET

Returns user credits and account information.

## Unified API Integration

Recraft is also integrated into the unified generation API at `/api/unified-generate`:

**Supported Models:**
- `recraft-v3` (default)
- `recraft-v2`

**Example Request:**
```json
{
  "model": "recraft-v3",
  "prompt": "A futuristic cityscape",
  "style": "digital_illustration",
  "size": "1280x1024",
  "controls": {
    "artistic_level": 3,
    "colors": [{"rgb": [0, 100, 200]}]
  }
}
```

## Client-Side Usage

### Basic Generation
```typescript
import { generateImage } from '@/lib/recraft-api';

const result = await generateImage({
  prompt: 'A beautiful sunset over mountains',
  style: 'realistic_image',
  size: '1024x1024',
  model: 'recraftv3'
});

console.log(result.data[0].url);
```

### Image-to-Image
```typescript
import { imageToImage } from '@/lib/recraft-api';

const result = await imageToImage(imageFile, {
  prompt: 'Make it winter scene',
  strength: 0.7,
  style: 'realistic_image'
});
```

### Inpainting
```typescript
import { inpaint } from '@/lib/recraft-api';

const result = await inpaint(imageFile, maskFile, {
  prompt: 'Add a tree here',
  style: 'realistic_image'
});
```

### Brand Integration
```typescript
import { generateImage, createBrandControls } from '@/lib/recraft-api';

const result = await generateImage({
  prompt: 'Modern logo design',
  style: 'vector_illustration',
  controls: createBrandControls(
    [[12, 112, 214], [240, 240, 240]], // Brand colors
    2, // Artistic level
    [255, 255, 255], // Background color
    false // Allow text
  )
});
```

### Text Layout (Recraft v3 only)
```typescript
import { generateImage, createTextLayout } from '@/lib/recraft-api';

const result = await generateImage({
  prompt: 'Poster with title and subtitle',
  style: 'digital_illustration',
  text_layout: [
    createTextLayout('DAYGEN', 0.1, 0.1, 0.9, 0.25),
    createTextLayout('AI', 0.1, 0.3, 0.3, 0.4)
  ]
});
```

## Available Styles

- `realistic_image` (default)
- `digital_illustration`
- `vector_illustration`
- `icon`
- `any`

## Supported Sizes

- `1024x1024` (default)
- `1280x1024`
- `1024x1280`
- `1152x896`
- `896x1152`
- `1216x832`
- `832x1216`
- `1344x768`
- `768x1344`
- `1536x640`
- `640x1536`

## Error Handling

The integration includes comprehensive error handling for:
- Invalid API keys (401)
- Rate limiting (429)
- Credit exhaustion (402)
- Invalid parameters (400)
- Server errors (500)

## Rate Limits

- Default: ~100 images/min/user
- Subject to change by Recraft

## Image Persistence

Recraft URLs are public and currently persisted ~24 hours. For long-term storage, download images and store them in your own storage system.

## Testing

Test the integration with curl:

```bash
# Text-to-image
curl -X POST https://your-domain.com/api/recraft/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt":"two race cars on a track","style":"digital_illustration","model":"recraftv3"}'

# User info
curl https://your-domain.com/api/recraft/user
```
