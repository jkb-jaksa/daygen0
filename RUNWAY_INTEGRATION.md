# Runway Integration for daygen.ai

This document explains how to set up and use the Runway API integration for image generation in the daygen platform.

## Setup Instructions

### 1. Get Your Runway API Key

1. Visit [Runway Developer Portal](https://docs.dev.runwayml.com/)
2. Sign up for a developer account
3. Navigate to the API section
4. Generate an API key for the Runway API

### 2. Configure Environment Variables

1. Copy your API key
2. Open the `.env` file in the project root
3. Add the following environment variable:

```env
RUNWAY_API_KEY=your_actual_api_key_here
```

### 3. Deploy API Endpoint

The API endpoint `/api/runway/image` is already integrated into the existing server.js file. Make sure to set the `RUNWAY_API_KEY` environment variable in your deployment environment.

## Features

### Image Generation
- **Text-to-Image**: Generate images from text prompts using Runway Gen-4
- **Reference Images**: Support for up to 3 reference images for style guidance
- **Multiple Models**: Support for both `gen4_image` and `gen4_image_turbo` models
- **Aspect Ratios**: Configurable aspect ratios (default: 1920:1080)
- **Seed Support**: Optional seed parameter for reproducible results

### UI Features
- **Model Selection**: Choose between Runway Gen-4 and Gen-4 Turbo
- **Reference Image Upload**: Upload up to 3 reference images
- **Real-time Loading States**: Visual feedback during generation
- **Error Handling**: User-friendly error messages for task failures
- **Image Preview**: View generated images with download options

## Usage

1. Navigate to the `/create` page
2. Select "Runway Gen-4" or "Runway Gen-4 Turbo" from the model dropdown
3. Enter a text prompt describing what you want to create
4. Optionally upload reference images for style guidance
5. Click "Generate" to create the image
6. View and download the generated image

## API Endpoints

### POST /api/runway/image

Generates an image using the Runway API.

**Request Body:**
```json
{
  "prompt": "A beautiful sunset over mountains",
  "model": "gen4_image",
  "ratio": "1920:1080",
  "seed": 12345,
  "references": ["data:image/jpeg;base64,..."]
}
```

**Response:**
```json
{
  "dataUrl": "data:image/png;base64,...",
  "contentType": "image/png",
  "taskId": "task_123",
  "meta": {
    "ratio": "1920:1080",
    "seed": 12345,
    "refs": 1,
    "model": "gen4_image"
  }
}
```

## Model Differences

- **Runway Gen-4**: Standard image generation, works with or without reference images
- **Runway Gen-4 Turbo**: Faster generation, requires at least 1 reference image

## Error Handling

The integration includes comprehensive error handling:
- **Task Failures**: Runway task failures are caught and displayed with user-friendly messages
- **Rate Limiting**: Proper handling of rate limit errors
- **Network Issues**: Graceful handling of network connectivity problems
- **Validation**: Input validation for prompts and reference images

## Technical Details

- **SDK**: Uses the official `@runwayml/sdk` package
- **Timeout**: 5-minute timeout for image generation tasks
- **Reference Images**: Supports up to 3 reference images in base64 data URL format
- **Output**: Images are downloaded and converted to base64 data URLs for immediate display
- **Storage**: No external storage required - images are stored as base64 data URLs

## Troubleshooting

### Common Issues

1. **API Key Not Configured**: Ensure `RUNWAYML_API_SECRET` is set in your environment
2. **Task Failures**: Check the error message for specific failure reasons (moderation, invalid input, etc.)
3. **Reference Image Issues**: Ensure reference images are valid image files and properly encoded
4. **Timeout Errors**: Large or complex prompts may take longer to process

### Debug Information

The server logs include detailed information about:
- API request parameters
- Task creation and status
- Error details and stack traces
- Generation timing and performance

## Future Enhancements

- **Video Generation**: Foundation is laid for future video generation features
- **More Aspect Ratios**: Additional aspect ratio options
- **Batch Generation**: Support for generating multiple images at once
- **Advanced Controls**: More fine-grained control over generation parameters
