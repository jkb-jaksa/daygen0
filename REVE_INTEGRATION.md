# Reve Image Integration Guide

This document describes the integration of Reve image generation and editing capabilities into daygen.ai.

## Overview

Reve provides advanced text-to-image generation and image editing capabilities through their API. This integration adds Reve as a new model option in the daygen.ai interface.

## Features

- **Text-to-Image Generation**: Generate images from text prompts using Reve's models
- **Image Editing**: Edit existing images with text prompts and optional masks
- **Async Processing**: Jobs are processed asynchronously with polling for status updates
- **Reference Images**: Support for reference images to guide generation
- **Base64 Storage**: Generated images are converted to base64 data URLs for storage

## Environment Variables

Add the following environment variables to your `.env` file:

```bash
# Reve API Configuration
REVE_BASE_URL=https://api.reve.com
REVE_API_KEY=your_reve_api_key_here
REVE_PROJECT_ID=your_reve_project_id_here
REVE_WEBHOOK_SECRET=your_reve_webhook_secret_here
```

## API Endpoints

The integration adds the following API endpoints:

- `POST /api/reve/generate` - Text-to-image generation
- `POST /api/reve/edit` - Image editing with optional mask
- `POST /api/reve/remix` - Image remixing with reference images
- `GET /api/reve/jobs/:id` - Job status polling

### Reve API Endpoints

The integration uses the official Reve API endpoints:

- `POST https://api.reve.com/v1/image/create` - Generate images from text descriptions
- `POST https://api.reve.com/v1/image/edit` - Modify existing images using text instructions
- `POST https://api.reve.com/v1/image/remix` - Combine text prompts with reference images

### Reve API Endpoints Used

The integration calls the following Reve API endpoints:

- `POST https://reveai.pro/v1/submit` - Submit image generation request
- `GET https://reveai.pro/v1/status/{jobId}` - Check job status

## Usage

1. Select "Reve Image" from the model dropdown in the Create interface
2. Enter your prompt
3. Optionally upload reference images
4. Click "Generate" to start the generation process
5. The system will poll for completion and display the result

## Implementation Details

### Backend (server.js)
- Added Reve API client configuration
- Implemented async job creation and polling
- Added image download and base64 conversion
- Integrated with existing error handling

### Frontend (Create.tsx)
- Added Reve to the AI_MODELS array
- Integrated useReveImageGeneration hook
- Added Reve generation logic to handleGenerateImage
- Updated type definitions to include ReveGeneratedImage

### React Hook (useReveImageGeneration.ts)
- Implements async job creation and polling
- Handles both text-to-image and image editing
- Provides consistent interface with other image generation hooks
- Includes error handling and progress tracking

## Configuration

The Reve integration uses the following default settings:
- Model: "reve-image-1.0"
- Default size: 1024x1024
- Polling interval: 5 seconds
- Maximum polling attempts: 60 (5 minutes)

## Error Handling

The integration includes comprehensive error handling:
- API key validation
- Network error handling
- Timeout handling for long-running jobs
- User-friendly error messages

## Future Enhancements

- Webhook support for real-time updates
- Additional model variants
- Custom parameter configuration
- Batch processing support
