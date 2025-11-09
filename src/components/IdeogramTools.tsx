import React, { useState, useRef } from 'react';
import { useIdeogramImageGeneration } from '../hooks/useIdeogramImageGeneration';
import CircularProgressRing from './CircularProgressRing';
import { debugError } from '../utils/debug';
import { buttons, inputs, glass } from '../styles/designSystem';
import { AlertCircle } from 'lucide-react';
import MessageModal from './modals/MessageModal';

interface IdeogramToolsProps {
  onImageGenerated?: (images: unknown[]) => void;
}

export const IdeogramTools: React.FC<IdeogramToolsProps> = ({ onImageGenerated }) => {
  const {
    isLoading,
    error,
    generatedImages,
    progress,
    progressValue,
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

  // Message modal state
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    icon: React.ComponentType<{ className?: string }>;
    iconColor: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    icon: AlertCircle as React.ComponentType<{ className?: string }>,
    iconColor: 'text-theme-text'
  });

  // Helper function to show modal
  const showModal = (title: string, message: string, icon: React.ComponentType<{ className?: string }> = AlertCircle, iconColor: string = 'text-theme-text') => {
    setModalState({
      isOpen: true,
      title,
      message,
      icon,
      iconColor
    });
  };

  const closeModal = () => {
    setModalState(prev => ({ ...prev, isOpen: false }));
  };
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
      debugError('Generation failed:', err);
    }
  };

  const handleEdit = async () => {
    if (!selectedImage || !selectedMask) {
      showModal(
        'Missing Files',
        'Please select both image and mask files',
        AlertCircle,
        'text-orange-400'
      );
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
      debugError('Edit failed:', err);
    }
  };

  const handleReframe = async () => {
    if (!selectedImage) {
      showModal(
        'Missing File',
        'Please select an image file',
        AlertCircle,
        'text-orange-400'
      );
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
      debugError('Reframe failed:', err);
    }
  };

  const handleReplaceBackground = async () => {
    if (!selectedImage) {
      showModal(
        'Missing File',
        'Please select an image file',
        AlertCircle,
        'text-orange-400'
      );
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
      debugError('Replace background failed:', err);
    }
  };

  const handleUpscale = async () => {
    if (!selectedImage) {
      showModal(
        'Missing File',
        'Please select an image file',
        AlertCircle,
        'text-orange-400'
      );
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
      debugError('Upscale failed:', err);
    }
  };

  const handleDescribe = async () => {
    if (!selectedImage) {
      showModal(
        'Missing File',
        'Please select an image file',
        AlertCircle,
        'text-orange-400'
      );
      return;
    }

    try {
      const result = await describeImage({
        image: selectedImage!,
        model_version: 'V_3',
      });
      setDescriptions(result);
    } catch (err) {
      debugError('Describe failed:', err);
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
    <div className={`${glass.surface} w-full max-w-4xl mx-auto p-6 sm:p-8`}>
      <div className="mb-6 space-y-2">
        <h2 className="text-2xl font-medium text-theme-text font-raleway">Ideogram AI Tools</h2>
        <p className="text-theme-white/70 font-raleway">Advanced image generation, editing, and enhancement powered by Ideogram 3.0</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'generate' | 'edit' | 'reframe' | 'replace' | 'upscale' | 'describe')}
            className={`px-4 py-2 rounded-full font-raleway text-sm transition-colors border border-theme-dark ${
              activeTab === tab.id
                ? 'bg-[color:var(--theme-text)] text-theme-black shadow-[0_8px_24px_#b8c0c040]'
                : 'bg-theme-dark/60 text-theme-white/70 hover:text-theme-text hover:bg-theme-dark/80'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 rounded-lg border border-[color:rgba(243,36,54,0.4)] bg-[color:rgba(243,36,54,0.12)] p-4">
          <p className="text-[color:var(--brand-red)] font-raleway">{error}</p>
          <button
            onClick={clearError}
            className="mt-2 text-sm font-raleway text-[color:var(--brand-red)] hover:text-theme-text underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Progress Display */}
      {isLoading && (
        <div className="mb-4 rounded-lg border border-[color:rgba(255,118,0,0.45)] bg-[color:rgba(255,118,0,0.12)] p-4">
          <div className="flex items-center gap-4">
            <CircularProgressRing
              progress={
                typeof progressValue === 'number'
                  ? Math.max(0, Math.min(100, progressValue))
                  : 35
              }
              size={38}
              strokeWidth={3}
              showPercentage
              baseColor="rgba(255, 255, 255, 0.14)"
              textColor="var(--theme-white)"
              className="shrink-0"
            />
            <p className="text-theme-white/80 font-raleway text-sm">
              {progress ?? 'Working with Ideogram…'}
            </p>
          </div>
        </div>
      )}

      {/* Generate Tab */}
      {activeTab === 'generate' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-theme-white/80 mb-2 font-raleway">
              Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className={inputs.textarea}
              placeholder="Describe the image you want to generate..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-theme-white/80 mb-2 font-raleway">
                Aspect Ratio
              </label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                className={inputs.base}
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
                <label className="block text-sm font-medium text-theme-white/80 mb-2 font-raleway">
                  Resolution
                </label>
                <input
                  type="text"
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  className={inputs.base}
                  placeholder="e.g., 1024x1024"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-theme-white/80 mb-2 font-raleway">
                Rendering Speed
              </label>
              <select
                value={renderingSpeed}
                onChange={(e) => setRenderingSpeed(e.target.value as 'TURBO' | 'DEFAULT' | 'QUALITY')}
                className={inputs.base}
              >
                <option value="TURBO">Turbo (Fastest)</option>
                <option value="DEFAULT">Default (Balanced)</option>
                <option value="QUALITY">Quality (Best)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-theme-white/80 mb-2 font-raleway">
                Number of Images
              </label>
              <select
                value={numImages}
                onChange={(e) => setNumImages(Number(e.target.value))}
                className={inputs.base}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-theme-white/80 mb-2 font-raleway">
                Style Type
              </label>
              <select
                value={styleType}
                onChange={(e) => setStyleType(e.target.value as 'AUTO' | 'GENERAL' | 'REALISTIC' | 'DESIGN' | 'FICTION')}
                className={inputs.base}
              >
                <option value="AUTO">Auto</option>
                <option value="GENERAL">General</option>
                <option value="REALISTIC">Realistic</option>
                <option value="DESIGN">Design</option>
                <option value="FICTION">Fiction</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-theme-white/80 mb-2 font-raleway">
                Style Preset (Optional)
              </label>
              <input
                type="text"
                value={stylePreset}
                onChange={(e) => setStylePreset(e.target.value)}
                className={inputs.base}
                placeholder="e.g., photography, illustration"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-white/80 mb-2 font-raleway">
              Negative Prompt (Optional)
            </label>
            <input
              type="text"
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              className={inputs.base}
              placeholder="What you don't want in the image..."
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={isLoading || !prompt.trim()}
            className={`${buttons.primary} w-full justify-center`}
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
              <label className="block text-sm font-medium text-theme-white/80 mb-2 font-raleway">
                Image File
              </label>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className={`${inputs.base} cursor-pointer`}
              />
              {selectedImage && (
                <p className="mt-2 text-sm text-theme-white/60 font-raleway">
                  Selected: {selectedImage.name}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-theme-white/80 mb-2 font-raleway">
                Mask File (Black areas will be edited)
              </label>
              <input
                ref={maskInputRef}
                type="file"
                accept="image/*"
                onChange={handleMaskSelect}
                className={`${inputs.base} cursor-pointer`}
              />
              {selectedMask && (
                <p className="mt-2 text-sm text-theme-white/60 font-raleway">
                  Selected: {selectedMask.name}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-white/80 mb-2 font-raleway">
              Edit Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className={inputs.textarea}
              placeholder="Describe what you want to change in the masked areas..."
              rows={3}
            />
          </div>

          <button
            onClick={handleEdit}
            disabled={isLoading || !selectedImage || !selectedMask || !prompt.trim()}
            className={`${buttons.primary} w-full justify-center`}
          >
            {isLoading ? 'Editing...' : 'Edit Image'}
          </button>
        </div>
      )}

      {/* Reframe Tab */}
      {activeTab === 'reframe' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-theme-white/80 mb-2 font-raleway">
              Image File (Square image recommended)
            </label>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className={`${inputs.base} cursor-pointer`}
            />
            {selectedImage && (
              <p className="mt-2 text-sm text-theme-white/60 font-raleway">
                Selected: {selectedImage.name}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-white/80 mb-2 font-raleway">
              Target Resolution
            </label>
            <input
              type="text"
              value={targetResolution}
              onChange={(e) => setTargetResolution(e.target.value)}
              className={inputs.base}
              placeholder="e.g., 1536x512"
            />
          </div>

          <button
            onClick={handleReframe}
            disabled={isLoading || !selectedImage || !targetResolution.trim()}
            className={`${buttons.primary} w-full justify-center`}
          >
            {isLoading ? 'Reframing...' : 'Reframe Image'}
          </button>
        </div>
      )}

      {/* Replace Background Tab */}
      {activeTab === 'replace' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-theme-white/80 mb-2 font-raleway">
              Image File
            </label>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className={`${inputs.base} cursor-pointer`}
            />
            {selectedImage && (
              <p className="mt-2 text-sm text-theme-white/60 font-raleway">
                Selected: {selectedImage.name}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-white/80 mb-2 font-raleway">
              Background Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className={inputs.textarea}
              placeholder="Describe the new background you want..."
              rows={3}
            />
          </div>

          <button
            onClick={handleReplaceBackground}
            disabled={isLoading || !selectedImage || !prompt.trim()}
            className={`${buttons.primary} w-full justify-center`}
          >
            {isLoading ? 'Replacing Background...' : 'Replace Background'}
          </button>
        </div>
      )}

      {/* Upscale Tab */}
      {activeTab === 'upscale' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-theme-white/80 mb-2 font-raleway">
              Image File
            </label>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className={`${inputs.base} cursor-pointer`}
            />
            {selectedImage && (
              <p className="mt-2 text-sm text-theme-white/60 font-raleway">
                Selected: {selectedImage.name}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-theme-white/80 mb-2 font-raleway">
                Resemblance ({resemblance}%)
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={resemblance}
                onChange={(e) => setResemblance(Number(e.target.value))}
                className="range-brand w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-theme-white/80 mb-2 font-raleway">
                Detail ({detail}%)
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={detail}
                onChange={(e) => setDetail(Number(e.target.value))}
                className="range-brand w-full"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-white/80 mb-2 font-raleway">
              Enhancement Prompt (Optional)
            </label>
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className={inputs.base}
              placeholder="Describe how you want to enhance the image..."
            />
          </div>

          <button
            onClick={handleUpscale}
            disabled={isLoading || !selectedImage}
            className={`${buttons.primary} w-full justify-center`}
          >
            {isLoading ? 'Upscaling...' : 'Upscale Image'}
          </button>
        </div>
      )}

      {/* Describe Tab */}
      {activeTab === 'describe' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-theme-white/80 mb-2 font-raleway">
              Image File
            </label>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className={`${inputs.base} cursor-pointer`}
            />
            {selectedImage && (
              <p className="mt-2 text-sm text-theme-white/60 font-raleway">
                Selected: {selectedImage.name}
              </p>
            )}
          </div>

          <button
            onClick={handleDescribe}
            disabled={isLoading || !selectedImage}
            className={`${buttons.primary} w-full justify-center`}
          >
            {isLoading ? 'Describing...' : 'Describe Image'}
          </button>

          {descriptions.length > 0 && (
            <div className={`mt-4 p-4 rounded-lg ${glass.base}`}>
            <h3 className="text-lg font-medium text-theme-text mb-2 font-raleway">Descriptions:</h3>
              {descriptions.map((desc, index) => (
                <p key={index} className="text-theme-white/80 mb-2 font-raleway">{desc}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Generated Images Display */}
      {generatedImages.length > 0 && (
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-theme-text font-raleway">Generated Images</h3>
            <button
              onClick={clearGeneratedImages}
              className="text-sm text-theme-white/60 hover:text-theme-text underline font-raleway"
            >
              Clear All
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1">
            {generatedImages.map((image, index) => (
              <div key={index} className={`${glass.base} rounded-2xl overflow-hidden`}>
                <img
                  src={image.url}
                  alt={`Generated image ${index + 1}`}
                  className="w-full h-48 object-cover"
                />
                <div className="p-3">
                  <p className="text-sm text-theme-white/75 truncate font-raleway">{image.prompt}</p>
                  <p className="text-xs text-theme-white/50 mt-1 font-raleway">
                    {new Date(image.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Message Modal */}
      <MessageModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
        message={modalState.message}
        icon={modalState.icon}
        iconColor={modalState.iconColor}
      />
    </div>
  );
};
