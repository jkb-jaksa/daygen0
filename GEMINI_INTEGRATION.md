# Google Gemini API Integration

This document explains how to set up and use the Google Gemini API integration for image generation in the daygen platform.

## Setup Instructions

### 1. Get Your Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Navigate to the API section
4. Generate an API key for the Gemini API

### 2. Configure Environment Variables

1. Copy your API key
2. Open the `.env` file in the project root
3. Replace `your_gemini_api_key_here` with your actual API key:

```env
VITE_GEMINI_API_KEY=your_actual_api_key_here
```

### 3. Deploy API Endpoint

The API endpoint `/api/generate-image.ts` needs to be deployed to Vercel or your preferred serverless platform. Make sure to set the `GEMINI_API_KEY` environment variable in your deployment environment.

## Features

### Image Generation
- **Text-to-Image**: Generate images from text prompts
- **Image-to-Image**: Modify existing images with text prompts
- **Multiple Models**: Support for various AI models including Gemini 2.5 Flash

### UI Features
- **Interactive Model Selection**: Choose from different AI models
- **Real-time Loading States**: Visual feedback during generation
- **Error Handling**: User-friendly error messages
- **Image Preview**: View generated and uploaded images
- **Responsive Design**: Works on desktop and mobile

## Usage

1. Navigate to the `/create` page
2. Enter a text prompt describing what you want to create
3. Optionally upload an image for image-to-image generation
4. Select your preferred AI model
5. Click "Generate" to create the image
6. View and download the generated image

## API Endpoints

### POST /api/generate-image

Generates an image using the Gemini API.

**Request Body:**
```json
{
  "prompt": "A beautiful sunset over mountains",
  "model": "gemini-2.5-flash-image-preview",
  "imageData": "data:image/jpeg;base64,..." // Optional for image-to-image
}
```

**Response:**
```json
{
  "success": true,
  "image": {
    "url": "data:image/png;base64,...",
    "prompt": "A beautiful sunset over mountains",
    "model": "gemini-2.5-flash-image-preview",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

## Troubleshooting

### Common Issues

1. **API Key Not Set**: Make sure your `VITE_GEMINI_API_KEY` is properly set in the `.env` file
2. **CORS Errors**: Ensure the API endpoint is deployed and accessible
3. **Rate Limiting**: Check your Gemini API usage limits
4. **Model Not Available**: Some models may not be available in all regions

### Error Messages

- `"Gemini API key not configured"`: Check your environment variables
- `"Failed to generate image"`: Check your API key and network connection
- `"Prompt is required"`: Make sure to enter a text prompt

## Development

### Local Development

1. Install dependencies: `npm install`
2. Set up environment variables
3. Run development server: `npm run dev`
4. Deploy API endpoint to Vercel: `vercel deploy`

### Testing

The integration includes comprehensive error handling and loading states. Test with various prompts and image combinations to ensure reliability.

## Security Notes

- Never expose your API key in client-side code
- Use environment variables for all sensitive configuration
- Implement rate limiting in production
- Validate all user inputs before sending to the API
