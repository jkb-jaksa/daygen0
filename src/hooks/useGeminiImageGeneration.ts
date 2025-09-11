import { useState, useCallback } from 'react';

export interface GeneratedImage {
  url: string;
  prompt: string;
  model: string;
  timestamp: string;
}

export interface ImageGenerationState {
  isLoading: boolean;
  error: string | null;
  generatedImage: GeneratedImage | null;
}

export interface ImageGenerationOptions {
  prompt: string;
  model?: string;
  imageData?: string; // Base64 encoded image for image-to-image
}

export const useGeminiImageGeneration = () => {
  const [state, setState] = useState<ImageGenerationState>({
    isLoading: false,
    error: null,
    generatedImage: null,
  });

  const generateImage = useCallback(async (options: ImageGenerationOptions) => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    try {
      // For now, we'll use a mock implementation for testing
      // In production, this would call your deployed API endpoint
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Create a mock image (1x1 transparent PNG)
      const mockImageData = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
      
      // Create a beautiful professional image
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Create gradient background
        const gradient = ctx.createLinearGradient(0, 0, 512, 512);
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(0.5, '#764ba2');
        gradient.addColorStop(1, '#f093fb');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 512, 512);
        
        // Add decorative elements
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(100, 100, 30, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(412, 100, 30, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(50, 350, 100, 100);
        ctx.fillRect(362, 350, 100, 100);
        
        // Add main text
        ctx.fillStyle = 'white';
        ctx.font = 'bold 32px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 10;
        ctx.fillText('AI Generated', 256, 200);
        
        // Add prompt text
        ctx.font = '18px Arial, sans-serif';
        ctx.shadowBlur = 5;
        const promptText = options.prompt.length > 30 ? options.prompt.substring(0, 30) + '...' : options.prompt;
        ctx.fillText(promptText, 256, 250);
        
        // Add model info
        ctx.font = '14px Arial, sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.shadowBlur = 3;
        const modelText = options.model || 'gemini-2.5-flash-image-preview';
        ctx.fillText(`Generated with ${modelText}`, 256, 300);
      }
      
      const mockImageUrl = canvas.toDataURL('image/png');
      console.log('Beautiful professional image created, dimensions:', canvas.width, 'x', canvas.height);
      
      console.log('Generated mock image URL:', mockImageUrl.substring(0, 100) + '...');
      console.log('Image URL length:', mockImageUrl.length);
      console.log('Image URL starts with data:', mockImageUrl.startsWith('data:image/png'));

      const generatedImage = {
        url: mockImageUrl,
        prompt: options.prompt,
        model: options.model || 'gemini-2.5-flash-image-preview',
        timestamp: new Date().toISOString()
      };
      
      console.log('Generated image object:', generatedImage);

      setState(prev => ({
        ...prev,
        isLoading: false,
        generatedImage: generatedImage,
        error: null,
      }));

      return generatedImage;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        generatedImage: null,
      }));

      throw error;
    }
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null,
    }));
  }, []);

  const clearGeneratedImage = useCallback(() => {
    setState(prev => ({
      ...prev,
      generatedImage: null,
    }));
  }, []);

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      generatedImage: null,
    });
  }, []);

  return {
    ...state,
    generateImage,
    clearError,
    clearGeneratedImage,
    reset,
  };
};
