# Seedream 4.0 Setup Guide

This guide explains how to set up and configure Seedream 4.0 for image generation.

## Prerequisites

1. **BytePlus Account**: You need a BytePlus account to access the Seedream 4.0 API
2. **API Key**: Obtain your ARK_API_KEY from the BytePlus console

## Getting Your API Key

1. Visit [BytePlus Console](https://console.byteplus.com)
2. Sign up or log in to your account
3. Navigate to the ModelArk section under AI services
4. Create a new API key
5. Copy the access key ID and secret

## Environment Variables

Add the following environment variable to your `.env` file:

```env
ARK_API_KEY=your_api_key_here
ARK_BASE_URL=https://ark.ap-southeast.bytepluses.com/api/v3
```

## API Endpoints

The following endpoints are available for Seedream 4.0:

- `POST /api/image/seedream` - Generate images using Seedream 4.0
- `POST /api/unified-generate` - Unified generation endpoint (supports multiple models)

## Request Format

### Image Generation

```json
{
  "prompt": "A beautiful sunset over mountains",
  "model": "seedream-4.0",
  "providerOptions": {
    "size": "1024x1024",
    "n": 1
  }
}
```

### Parameters

- `prompt` (required): Text description of the image to generate
- `model`: Should be "seedream-4.0"
- `providerOptions.size`: Image dimensions (e.g., "1024x1024", "512x512")
- `providerOptions.n`: Number of images to generate (default: 1)

## Response Format

```json
{
  "images": [
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
  ]
}
```

## Testing

Run the test script to verify your setup:

```bash
node test-seedream.js
```

## Troubleshooting

### Common Issues

1. **500 Internal Server Error**
   - Check if `ARK_API_KEY` is set in your environment
   - Verify the API key is valid and has proper permissions
   - Check server logs for detailed error messages

2. **Authentication Errors**
   - Ensure your API key is correctly formatted
   - Verify the key hasn't expired
   - Check if you have the necessary permissions for Seedream 4.0

3. **API Endpoint Errors**
   - Verify the `ARK_BASE_URL` is correct
   - Check if the Seedream 4.0 model is available in your region
   - Ensure your account has access to the Seedream 4.0 model

### Debug Mode

Enable debug logging by setting:

```env
NODE_ENV=development
```

This will provide more detailed error messages in the server logs.

## Pricing

- Seedream 4.0 costs approximately $30 per 1,000 generations
- Check BytePlus pricing for current rates and any volume discounts
- Monitor your usage in the BytePlus console

## Support

- [BytePlus Documentation](https://docs.byteplus.com)
- [Seedream 4.0 API Reference](https://apidog.com/blog/seedream-4-0-how-access-its-api/)
- Check server logs for detailed error information
