# FLUX Integration Guide for daygen.ai

This guide explains how to set up and use the FLUX image generation integration in your daygen.ai application.

## Environment Setup

Create a `.env` file in your project root with the following variables:

```env
# Existing Gemini API
GEMINI_API_KEY=your_gemini_api_key_here

# BFL API Configuration
BFL_API_KEY=your_bfl_api_key_here
BFL_API_BASE=https://api.eu.bfl.ai
BFL_WEBHOOK_SECRET=your_webhook_secret_here

# Application Configuration
NEXT_PUBLIC_BASE_URL=http://localhost:3000
PUBLIC_IS_DEV=true

# Storage Configuration (for production)
AWS_REGION=us-east-1
AWS_BUCKET=your-bucket-name
CDN_BASE_URL=https://your-cdn-domain.com
```

## Getting BFL API Key

1. Visit [BFL Console](https://console.bfl.ai)
2. Sign up for an account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key and add it to your `.env` file

## Available FLUX Models

The integration supports the following FLUX models:

- **FLUX Pro 1.1** (`flux-pro-1.1`) - Standard text-to-image generation
- **FLUX Pro 1.1 Ultra** (`flux-pro-1.1-ultra`) - Ultra-high quality 4MP+ generation
- **FLUX Kontext Pro** (`flux-kontext-pro`) - Image editing with text prompts
- **FLUX Kontext Max** (`flux-kontext-max`) - Highest quality image editing

## Features

### Text-to-Image Generation
- High-quality image generation from text prompts
- Support for custom dimensions (width/height)
- Aspect ratio control
- Seed control for reproducible results

### Image Editing (Kontext Models)
- Upload a base image for editing
- Use text prompts to describe desired changes
- Support for multiple reference images
- Maintains original image composition

### Real-time Progress
- Webhook-based completion notifications
- Polling fallback for reliability
- Progress indicators in the UI
- Job status tracking

## API Endpoints

### Generate Image
```
POST /api/flux/generate
```

**Request Body:**
```json
{
  "model": "flux-pro-1.1",
  "prompt": "A futuristic city skyline at sunset",
  "width": 1024,
  "height": 1024,
  "useWebhook": true
}
```

**Response:**
```json
{
  "id": "job-id",
  "pollingUrl": "https://api.eu.bfl.ai/v1/get_result/...",
  "model": "flux-pro-1.1",
  "status": "queued"
}
```

### Poll Job Status
```
GET /api/flux/result?pollingUrl=...
```

### Webhook Handler
```
POST /api/flux/webhook
```

## Usage in Frontend

The integration is already built into the Create component. Users can:

1. Select a FLUX model from the model selector
2. Enter a text prompt
3. For Kontext models, upload a base image
4. Click Generate to start the process
5. Monitor progress in real-time

## Production Considerations

### Webhook Security
- Implement proper webhook signature verification
- Use HTTPS for webhook URLs
- Rotate webhook secrets regularly

### Storage
- BFL delivery URLs expire in ~10 minutes
- Implement proper image storage (S3, R2, etc.)
- Use CDN for fast image delivery

### Rate Limits
- BFL allows up to 24 active tasks
- 6 tasks for flux-kontext-max
- Implement proper queuing for high traffic

### Error Handling
- Handle 402 (credits exceeded) gracefully
- Implement retry logic for 429 (rate limit)
- Provide clear error messages to users

## Testing

### Local Testing
1. Set up environment variables
2. Start the development server: `npm run dev`
3. Select a FLUX model
4. Generate an image with a test prompt

### cURL Examples

**FLUX Pro 1.1:**
```bash
curl -X POST "https://api.bfl.ai/v1/flux-pro-1.1" \
  -H "Content-Type: application/json" \
  -H "x-key: $BFL_API_KEY" \
  -d '{"prompt":"A futuristic city skyline at sunset", "width":1024, "height":1024}'
```

**FLUX Kontext Pro (Image Editing):**
```bash
curl -X POST "https://api.bfl.ai/v1/flux-kontext-pro" \
  -H "Content-Type: application/json" \
  -H "x-key: $BFL_API_KEY" \
  -d '{"prompt":"Turn the red jacket blue", "input_image":"<base64>", "aspect_ratio":"1:1"}'
```

## Troubleshooting

### Common Issues

1. **"BFL credits exceeded"** - Add credits to your BFL account
2. **"Rate limit reached"** - Wait for active tasks to complete
3. **"Invalid polling URL"** - Ensure you're using the exact URL returned by BFL
4. **Webhook not working** - Check webhook URL is accessible and HTTPS

### Debug Mode

Set `PUBLIC_IS_DEV=true` in your environment to enable debug logging.

## Support

For issues with:
- **BFL API**: Check [BFL Documentation](https://docs.bfl.ml)
- **Integration**: Check this guide and the code comments
- **Application**: Check the application logs and error messages
