# Ideogram 3.0 Integration for daygen.ai

This document describes the complete integration of Ideogram 3.0 features into daygen.ai, including Generate, Edit, Reframe, Replace Background, Upscale, and Describe capabilities.

## 🎯 Features Implemented

### 1. Generate (Text-to-Image)
- **Endpoint**: `POST /api/ideogram/generate`
- **Features**: 
  - Aspect ratio support (1:1, 16:9, 9:16, 4:3, 3:4, 21:9)
  - Custom resolution support
  - Rendering speed options (TURBO, DEFAULT, QUALITY)
  - Multiple image generation (1-8 images)
  - Style presets and types
  - Negative prompts
  - Style and character reference images

### 2. Edit (Image + Mask)
- **Endpoint**: `POST /api/ideogram/edit`
- **Features**:
  - Image editing with mask support
  - Black areas in mask are edited
  - Style and rendering options
  - Multiple output images

### 3. Reframe (Square → Target Resolution)
- **Endpoint**: `POST /api/ideogram/reframe`
- **Features**:
  - Converts square images to any target resolution
  - Intelligent outpainting
  - Style and rendering options

### 4. Replace Background
- **Endpoint**: `POST /api/ideogram/replace-background`
- **Features**:
  - Automatic subject detection
  - Background replacement with prompts
  - Style and rendering options

### 5. Upscale
- **Endpoint**: `POST /api/ideogram/upscale`
- **Features**:
  - Image upscaling with quality control
  - Resemblance and detail parameters
  - Optional enhancement prompts

### 6. Describe (Image Captioning)
- **Endpoint**: `POST /api/ideogram/describe`
- **Features**:
  - Automatic image description
  - Multiple model versions (V_2, V_3)
  - Alt text generation

## 🏗️ Architecture

### Backend (Express.js)
- **SDK**: `src/lib/ideogram.ts` - Complete Ideogram API wrapper
- **Storage**: `src/lib/storage.ts` - Base64 conversion for ephemeral URLs (no external storage needed)
- **Endpoints**: Added to `server.js` with proper error handling and validation

### Frontend (React)
- **Hook**: `src/hooks/useIdeogramImageGeneration.ts` - React hook for all Ideogram features
- **Component**: `src/components/IdeogramTools.tsx` - Complete UI component
- **Integration**: Updated `src/components/Create.tsx` to support Ideogram generation

## 🔧 Setup Instructions

### 1. Environment Variables
Add this to your `.env` file:

```bash
# Ideogram API
IDEOGRAM_API_KEY=GLGrtoDvY2lk-AJ9zZ0-fKrfFSUAEFLBQfqDQZkLelfIRtgMEQ9kd6Ji3tsSX5iMw5IkrRBzAlFMLRp1qBgD4Q
```

### 2. Dependencies
The following packages are already installed:
- `undici` - For HTTP requests
- `form-data` - For multipart form data

**Note**: No external storage service (AWS S3, etc.) is required. Images are automatically converted to base64 data URLs for direct use.

### 3. API Key Setup
1. Get your Ideogram API key from [developer.ideogram.ai](https://developer.ideogram.ai)
2. Add it to your environment variables
3. The API key is used in the `authHeaders()` function in `src/lib/ideogram.ts`

## 🚀 Usage Examples

### Generate Image
```javascript
const { generateImage } = useIdeogramImageGeneration();

const images = await generateImage({
  prompt: "A beautiful sunset over mountains",
  aspect_ratio: "16:9",
  rendering_speed: "TURBO",
  num_images: 2,
  style_type: "REALISTIC"
});
```

### Edit Image
```javascript
const { editImage } = useIdeogramImageGeneration();

const images = await editImage({
  image: imageFile,
  mask: maskFile,
  prompt: "Replace the sky with a starry night",
  rendering_speed: "DEFAULT"
});
```

### Reframe Image
```javascript
const { reframeImage } = useIdeogramImageGeneration();

const images = await reframeImage({
  image: squareImageFile,
  resolution: "1536x512",
  rendering_speed: "QUALITY"
});
```

### Replace Background
```javascript
const { replaceBackground } = useIdeogramImageGeneration();

const images = await replaceBackground({
  image: portraitFile,
  prompt: "Clean studio white background",
  rendering_speed: "DEFAULT"
});
```

### Upscale Image
```javascript
const { upscaleImage } = useIdeogramImageGeneration();

const images = await upscaleImage({
  image: lowResImageFile,
  resemblance: 60,
  detail: 90,
  prompt: "Enhance the details and sharpness"
});
```

### Describe Image
```javascript
const { describeImage } = useIdeogramImageGeneration();

const descriptions = await describeImage({
  image: imageFile,
  model_version: "V_3"
});
```

## 🧪 Testing

### Run the Test Script
```bash
node test-ideogram.js
```

This will test:
- Generate endpoint with a simple prompt
- Describe endpoint with a test image
- Verify API connectivity and response format

### Manual Testing
1. Start the server: `npm run dev`
2. Open the Create page in your browser
3. Select "Ideogram" from the model dropdown
4. Enter a prompt and generate an image
5. Test other features using the IdeogramTools component

## 🔒 Security Features

### API Key Protection
- Ideogram API key is never exposed to the frontend
- All API calls go through the Express.js backend
- Proper error handling and validation

### File Upload Security
- File type validation (images only)
- File size limits (10MB max per Ideogram API)
- Proper multipart form handling

### Ephemeral URL Handling
- All Ideogram URLs are immediately downloaded and converted to base64 data URLs
- No ephemeral URLs are exposed to the frontend
- Images are stored directly in the application state and localStorage

## 📊 Performance Considerations

### Rate Limiting
- Ideogram has a default limit of 10 concurrent requests
- Implemented proper error handling for rate limits
- Consider implementing client-side rate limiting for production

### Image Storage
- All generated images are converted to base64 data URLs
- Images are stored in browser localStorage and application state
- Automatic compression to reduce storage size
- No external storage service required

### Caching
- Consider implementing Redis caching for frequently requested images
- Cache API responses where appropriate
- Implement proper cache invalidation

## 🐛 Troubleshooting

### Common Issues

1. **"Ideogram API key not configured"**
   - Check that `IDEOGRAM_API_KEY` is set in your environment variables
   - Restart the server after adding the key

2. **"Image conversion failed"**
   - Check that the Ideogram API is returning valid image URLs
   - Verify network connectivity to Ideogram's servers

3. **"Generation failed"**
   - Check the server logs for detailed error messages
   - Verify your Ideogram API key is valid and has credits
   - Check rate limits and try again

4. **CORS Issues**
   - Ensure the server is running on the correct port
   - Check that the frontend is making requests to the correct API endpoints

### Debug Mode
Enable debug logging by setting:
```bash
DEBUG=ideogram:*
```

## 🔄 Future Enhancements

### Planned Features
1. **Batch Processing**: Process multiple images simultaneously
2. **Advanced Style Controls**: More granular style and preset options
3. **Image History**: Track and manage generated images
4. **Webhook Support**: Real-time updates for long-running operations
5. **Cost Tracking**: Monitor API usage and costs

### Integration Improvements
1. **Database Storage**: Store image metadata in a database
2. **User Management**: Per-user image galleries and history
3. **Advanced UI**: More sophisticated editing tools
4. **Mobile Support**: Responsive design for mobile devices

## 📚 API Reference

### Ideogram SDK Functions

#### `ideogramGenerate(options)`
Generate images from text prompts.

**Parameters:**
- `prompt` (string, required): Text description of the image
- `aspect_ratio` (string, optional): Aspect ratio (e.g., "16:9")
- `resolution` (string, optional): Custom resolution (e.g., "1024x1024")
- `rendering_speed` (string, optional): "TURBO" | "DEFAULT" | "QUALITY"
- `num_images` (number, optional): Number of images to generate (1-8)
- `seed` (number, optional): Random seed for reproducible results
- `style_preset` (string, optional): Style preset name
- `style_type` (string, optional): "AUTO" | "GENERAL" | "REALISTIC" | "DESIGN" | "FICTION"
- `negative_prompt` (string, optional): What to avoid in the image

#### `ideogramEdit(params)`
Edit images using masks.

**Parameters:**
- `image` (FilePart, required): Image file to edit
- `mask` (FilePart, required): Mask file (black areas will be edited)
- `prompt` (string, required): Description of the edit
- `rendering_speed` (string, optional): Rendering speed
- `seed` (number, optional): Random seed
- `num_images` (number, optional): Number of output images
- `style_preset` (string, optional): Style preset
- `style_type` (string, optional): Style type

#### `ideogramReframe(params)`
Reframe square images to target resolution.

**Parameters:**
- `image` (FilePart, required): Square image to reframe
- `resolution` (string, required): Target resolution (e.g., "1536x512")
- `rendering_speed` (string, optional): Rendering speed
- `seed` (number, optional): Random seed
- `num_images` (number, optional): Number of output images
- `style_preset` (string, optional): Style preset

#### `ideogramReplaceBg(params)`
Replace image backgrounds.

**Parameters:**
- `image` (FilePart, required): Image with subject to preserve
- `prompt` (string, required): Description of new background
- `rendering_speed` (string, optional): Rendering speed
- `seed` (number, optional): Random seed
- `num_images` (number, optional): Number of output images
- `style_preset` (string, optional): Style preset

#### `ideogramUpscale(params)`
Upscale images with quality control.

**Parameters:**
- `image` (FilePart, required): Image to upscale
- `image_request` (object, optional): Upscaling parameters
  - `resemblance` (number, optional): How much to resemble original (0-100)
  - `detail` (number, optional): Detail level (0-100)
  - `prompt` (string, optional): Enhancement description

#### `ideogramDescribe(image, modelVersion)`
Generate image descriptions.

**Parameters:**
- `image` (FilePart, required): Image to describe
- `modelVersion` (string, optional): "V_2" | "V_3" (default: "V_3")

## 🤝 Contributing

When contributing to the Ideogram integration:

1. **Follow the existing code style** and patterns
2. **Add proper error handling** for all new features
3. **Include tests** for new functionality
4. **Update documentation** for any API changes
5. **Test thoroughly** with different image types and sizes

## 📄 License

This integration follows the same license as the main daygen.ai project.

---

For more information about Ideogram's API, visit [developer.ideogram.ai](https://developer.ideogram.ai/api-reference/api-reference/generate-v3).
