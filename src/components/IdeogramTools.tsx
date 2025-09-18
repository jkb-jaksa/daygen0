import React, { useState, useRef } from 'react';
import { useIdeogramImageGeneration } from '../hooks/useIdeogramImageGeneration';

interface IdeogramToolsProps {
  onImageGenerated?: (images: any[]) => void;
}

export const IdeogramTools: React.FC<IdeogramToolsProps> = ({ onImageGenerated }) => {
  const {
    isLoading,
    error,
    generatedImages,
    progress,
    generateImage,
    editImage,
    reframeImage,
    replaceBackground,
    upscaleImage,
    describeImage,
    clearError,
    clearGeneratedImages
  } = useIdeogramImageGeneration();

  const [activeTab, setActiveTab] = useState<'generate' | 'edit' | 'reframe' | 'replace' | 'upscale' | 'describe'>('generate');
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [resolution, setResolution] = useState('1024x1024');
  const [renderingSpeed, setRenderingSpeed] = useState<'TURBO' | 'DEFAULT' | 'QUALITY'>('DEFAULT');
  const [numImages, setNumImages] = useState(1);
  const [stylePreset, setStylePreset] = useState('');
  const [styleType, setStyleType] = useState<'AUTO' | 'GENERAL' | 'REALISTIC' | 'DESIGN' | 'FICTION'>('AUTO');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [targetResolution, setTargetResolution] = useState('1536x512');
  const [resemblance, setResemblance] = useState(60);
  const [detail, setDetail] = useState(90);
  const [descriptions, setDescriptions] = useState<string[]>([]);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const maskInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedMask, setSelectedMask] = useState<File | null>(null);

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
    }
  };

  const handleMaskSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedMask(file);
    }
  };

  const handleGenerate = async () => {
    try {
      const options = {
        prompt,
        aspect_ratio: aspectRatio !== 'custom' ? aspectRatio : undefined,
        resolution: aspectRatio === 'custom' ? resolution : undefined,
        rendering_speed: renderingSpeed,
        num_images: numImages,
        style_preset: stylePreset || undefined,
        style_type: styleType,
        negative_prompt: negativePrompt || undefined,
      };
      
      const images = await generateImage(options);
      onImageGenerated?.(images);
    } catch (err) {
      console.error('Generation failed:', err);
    }
  };

  const handleEdit = async () => {
    if (!selectedImage || !selectedMask) {
      alert('Please select both image and mask files');
      return;
    }

    try {
      const images = await editImage({
        image: selectedImage,
        mask: selectedMask,
        prompt,
        rendering_speed: renderingSpeed,
        num_images: numImages,
        style_preset: stylePreset || undefined,
        style_type: styleType,
      });
      onImageGenerated?.(images);
    } catch (err) {
      console.error('Edit failed:', err);
    }
  };

  const handleReframe = async () => {
    if (!selectedImage) {
      alert('Please select an image file');
      return;
    }

    try {
      const images = await reframeImage({
        image: selectedImage,
        resolution: targetResolution,
        rendering_speed: renderingSpeed,
        num_images: numImages,
        style_preset: stylePreset || undefined,
      });
      onImageGenerated?.(images);
    } catch (err) {
      console.error('Reframe failed:', err);
    }
  };

  const handleReplaceBackground = async () => {
    if (!selectedImage) {
      alert('Please select an image file');
      return;
    }

    try {
      const images = await replaceBackground({
        image: selectedImage,
        prompt,
        rendering_speed: renderingSpeed,
        num_images: numImages,
        style_preset: stylePreset || undefined,
      });
      onImageGenerated?.(images);
    } catch (err) {
      console.error('Replace background failed:', err);
    }
  };

  const handleUpscale = async () => {
    if (!selectedImage) {
      alert('Please select an image file');
      return;
    }

    try {
      const images = await upscaleImage({
        image: selectedImage,
        resemblance,
        detail,
        prompt: prompt || undefined,
      });
      onImageGenerated?.(images);
    } catch (err) {
      console.error('Upscale failed:', err);
    }
  };

  const handleDescribe = async () => {
    if (!selectedImage) {
      alert('Please select an image file');
      return;
    }

    try {
      const result = await describeImage({
        image: selectedImage,
        model_version: 'V_3',
      });
      setDescriptions(result.map((d: any) => d.text));
    } catch (err) {
      console.error('Describe failed:', err);
    }
  };

  const tabs = [
    { id: 'generate', label: 'Generate', icon: '🎨' },
    { id: 'edit', label: 'Edit', icon: '✏️' },
    { id: 'reframe', label: 'Reframe', icon: '🖼️' },
    { id: 'replace', label: 'Replace BG', icon: '🔄' },
    { id: 'upscale', label: 'Upscale', icon: '⬆️' },
    { id: 'describe', label: 'Describe', icon: '📝' },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-gray-900 rounded-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Ideogram AI Tools</h2>
        <p className="text-gray-300">Advanced image generation, editing, and enhancement powered by Ideogram 3.0</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-orange-500 text-black'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-900/20 border border-red-500/50 rounded-lg">
          <p className="text-red-400">{error}</p>
          <button
            onClick={clearError}
            className="mt-2 text-sm text-red-300 hover:text-red-200 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Progress Display */}
      {isLoading && progress && (
        <div className="mb-4 p-4 bg-blue-900/20 border border-blue-500/50 rounded-lg">
          <p className="text-blue-400">{progress}</p>
        </div>
      )}

      {/* Generate Tab */}
      {activeTab === 'generate' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400"
              placeholder="Describe the image you want to generate..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Aspect Ratio
              </label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white"
              >
                <option value="1:1">1:1 (Square)</option>
                <option value="16:9">16:9 (Widescreen)</option>
                <option value="9:16">9:16 (Portrait)</option>
                <option value="4:3">4:3 (Standard)</option>
                <option value="3:4">3:4 (Portrait)</option>
                <option value="21:9">21:9 (Ultra-wide)</option>
                <option value="custom">Custom Resolution</option>
              </select>
            </div>

            {aspectRatio === 'custom' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Resolution
                </label>
                <input
                  type="text"
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                  placeholder="e.g., 1024x1024"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Rendering Speed
              </label>
              <select
                value={renderingSpeed}
                onChange={(e) => setRenderingSpeed(e.target.value as any)}
                className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white"
              >
                <option value="TURBO">Turbo (Fastest)</option>
                <option value="DEFAULT">Default (Balanced)</option>
                <option value="QUALITY">Quality (Best)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Number of Images
              </label>
              <select
                value={numImages}
                onChange={(e) => setNumImages(Number(e.target.value))}
                className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Style Type
              </label>
              <select
                value={styleType}
                onChange={(e) => setStyleType(e.target.value as any)}
                className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white"
              >
                <option value="AUTO">Auto</option>
                <option value="GENERAL">General</option>
                <option value="REALISTIC">Realistic</option>
                <option value="DESIGN">Design</option>
                <option value="FICTION">Fiction</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Style Preset (Optional)
              </label>
              <input
                type="text"
                value={stylePreset}
                onChange={(e) => setStylePreset(e.target.value)}
                className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                placeholder="e.g., photography, illustration"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Negative Prompt (Optional)
            </label>
            <input
              type="text"
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400"
              placeholder="What you don't want in the image..."
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={isLoading || !prompt.trim()}
            className="w-full py-3 px-6 bg-orange-500 text-black font-bold rounded-lg hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Generating...' : 'Generate Image'}
          </button>
        </div>
      )}

      {/* Edit Tab */}
      {activeTab === 'edit' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Image File
              </label>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white"
              />
              {selectedImage && (
                <p className="mt-2 text-sm text-gray-400">
                  Selected: {selectedImage.name}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Mask File (Black areas will be edited)
              </label>
              <input
                ref={maskInputRef}
                type="file"
                accept="image/*"
                onChange={handleMaskSelect}
                className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white"
              />
              {selectedMask && (
                <p className="mt-2 text-sm text-gray-400">
                  Selected: {selectedMask.name}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Edit Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400"
              placeholder="Describe what you want to change in the masked areas..."
              rows={3}
            />
          </div>

          <button
            onClick={handleEdit}
            disabled={isLoading || !selectedImage || !selectedMask || !prompt.trim()}
            className="w-full py-3 px-6 bg-orange-500 text-black font-bold rounded-lg hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Editing...' : 'Edit Image'}
          </button>
        </div>
      )}

      {/* Reframe Tab */}
      {activeTab === 'reframe' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Image File (Square image recommended)
            </label>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white"
            />
            {selectedImage && (
              <p className="mt-2 text-sm text-gray-400">
                Selected: {selectedImage.name}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Target Resolution
            </label>
            <input
              type="text"
              value={targetResolution}
              onChange={(e) => setTargetResolution(e.target.value)}
              className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400"
              placeholder="e.g., 1536x512"
            />
          </div>

          <button
            onClick={handleReframe}
            disabled={isLoading || !selectedImage || !targetResolution.trim()}
            className="w-full py-3 px-6 bg-orange-500 text-black font-bold rounded-lg hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Reframing...' : 'Reframe Image'}
          </button>
        </div>
      )}

      {/* Replace Background Tab */}
      {activeTab === 'replace' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Image File
            </label>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white"
            />
            {selectedImage && (
              <p className="mt-2 text-sm text-gray-400">
                Selected: {selectedImage.name}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Background Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400"
              placeholder="Describe the new background you want..."
              rows={3}
            />
          </div>

          <button
            onClick={handleReplaceBackground}
            disabled={isLoading || !selectedImage || !prompt.trim()}
            className="w-full py-3 px-6 bg-orange-500 text-black font-bold rounded-lg hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Replacing Background...' : 'Replace Background'}
          </button>
        </div>
      )}

      {/* Upscale Tab */}
      {activeTab === 'upscale' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Image File
            </label>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white"
            />
            {selectedImage && (
              <p className="mt-2 text-sm text-gray-400">
                Selected: {selectedImage.name}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Resemblance ({resemblance}%)
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={resemblance}
                onChange={(e) => setResemblance(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Detail ({detail}%)
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={detail}
                onChange={(e) => setDetail(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Enhancement Prompt (Optional)
            </label>
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400"
              placeholder="Describe how you want to enhance the image..."
            />
          </div>

          <button
            onClick={handleUpscale}
            disabled={isLoading || !selectedImage}
            className="w-full py-3 px-6 bg-orange-500 text-black font-bold rounded-lg hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Upscaling...' : 'Upscale Image'}
          </button>
        </div>
      )}

      {/* Describe Tab */}
      {activeTab === 'describe' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Image File
            </label>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white"
            />
            {selectedImage && (
              <p className="mt-2 text-sm text-gray-400">
                Selected: {selectedImage.name}
              </p>
            )}
          </div>

          <button
            onClick={handleDescribe}
            disabled={isLoading || !selectedImage}
            className="w-full py-3 px-6 bg-orange-500 text-black font-bold rounded-lg hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Describing...' : 'Describe Image'}
          </button>

          {descriptions.length > 0 && (
            <div className="mt-4 p-4 bg-gray-800 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-2">Descriptions:</h3>
              {descriptions.map((desc, index) => (
                <p key={index} className="text-gray-300 mb-2">{desc}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Generated Images Display */}
      {generatedImages.length > 0 && (
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white">Generated Images</h3>
            <button
              onClick={clearGeneratedImages}
              className="text-sm text-gray-400 hover:text-gray-300 underline"
            >
              Clear All
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {generatedImages.map((image, index) => (
              <div key={index} className="bg-gray-800 rounded-lg overflow-hidden">
                <img
                  src={image.url}
                  alt={`Generated image ${index + 1}`}
                  className="w-full h-48 object-cover"
                />
                <div className="p-3">
                  <p className="text-sm text-gray-300 truncate">{image.prompt}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(image.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
