import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, X, MessageCircle, Sparkles, Settings, Wand2, Package, Shapes, Users, Palette } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { glass, buttons } from '../styles/designSystem';
import { useFormalImageGeneration, type FormalModel } from '../hooks/useFormalImageGeneration';
import { VersionGallery } from '../components/formal/VersionGallery';
import { PresetGrid, GroupedPresetGrid } from '../components/formal/PresetGrid';
import { FormalEditTabs } from '../components/formal/FormalEditTabs';
import { QuickAssetMenu } from '../components/shared/QuickAssetMenu';
import { 
  ALL_BACKGROUND_PRESETS, 
  ALL_EFFECTS_PRESETS, 
  ALL_ENHANCEMENT_PRESETS,
  BACKGROUND_PRESETS,
  getPresetsByCategory,
  type PresetCategory,
  type FormalPreset,
} from '../data/formalPresets';
import { debugError } from '../utils/debug';

const AI_MODELS = [
  { id: 'gemini' as const, name: 'Gemini 2.5 Flash', desc: 'Best for editing', Icon: Sparkles, accent: 'yellow' },
  { id: 'ideogram' as const, name: 'Ideogram 3.0', desc: 'Advanced editing', Icon: Package, accent: 'cyan' },
  { id: 'recraft' as const, name: 'Recraft', desc: 'Professional mockups', Icon: Shapes, accent: 'pink' },
] as const;

export default function EditFormal() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Main state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<PresetCategory>('background');
  const [selectedPreset, setSelectedPreset] = useState<FormalPreset | null>(null);
  const [selectedModel, setSelectedModel] = useState<FormalModel>('gemini');
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isChatMode, setIsChatMode] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  
  // Asset upload state
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);
  const [referencePreviews, setReferencePreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  
  // Asset modals state
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isStyleModalOpen, setIsStyleModalOpen] = useState(false);
  
  // Use the formal image generation hook
  const {
    versions,
    selectedVersionId,
    isGenerating,
    error,
    generateImage,
    upscaleImage,
    selectVersion,
    clearError,
    clearVersions,
  } = useFormalImageGeneration();

  // Get current presets based on active tab
  const currentPresets = getPresetsByCategory(activeTab);
  
  // Background presets are grouped
  const backgroundGroups = [
    { label: 'Skyscrapers', presets: BACKGROUND_PRESETS.skyscrapers },
    { label: 'Office', presets: BACKGROUND_PRESETS.office },
    { label: 'Plain', presets: BACKGROUND_PRESETS.plain },
    { label: 'Custom', presets: [{ ...BACKGROUND_PRESETS.skyscrapers[0], id: 'custom', name: 'Custom', isCustom: true }] },
  ];

  // Handle file upload
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      clearVersions(); // Clear previous versions when new image is uploaded
    }
  }, [clearVersions]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) {
      const file = files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      clearVersions();
    }
  }, [clearVersions]);

  // Handle preset selection
  const handlePresetSelect = useCallback((presetId: string) => {
    if (presetId === 'custom') {
      setIsCustomMode(true);
      return;
    }
    
    const preset = currentPresets.find(p => p.id === presetId);
    if (preset) {
      setSelectedPreset(preset);
      setIsCustomMode(false);
      setCustomPrompt('');
    }
  }, [currentPresets]);

  // Handle image generation
  const handleGenerate = useCallback(async () => {
    if (!selectedFile || (!selectedPreset && !isCustomMode)) {
      return;
    }

    const preset = isCustomMode 
      ? { id: 'custom', name: 'Custom', category: activeTab, prompt: customPrompt, description: 'Custom prompt' }
      : selectedPreset!;

    await generateImage({
      imageFile: selectedFile,
      preset,
      model: selectedModel,
      customPrompt: isCustomMode ? customPrompt : undefined,
      referenceImages: referenceFiles,
    });
  }, [selectedFile, selectedPreset, isCustomMode, customPrompt, activeTab, selectedModel, referenceFiles, generateImage]);

  // Handle reference file upload
  const handleReferenceUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    if (imageFiles.length > 0) {
      setReferenceFiles(prev => [...prev, ...imageFiles].slice(0, 3));
      const newPreviews = imageFiles.map(f => URL.createObjectURL(f));
      setReferencePreviews(prev => [...prev, ...newPreviews].slice(0, 3));
    }
  }, []);

  // Handle upscale
  const handleUpscale = useCallback(async () => {
    if (selectedVersionId) {
      await upscaleImage(selectedVersionId);
    }
  }, [selectedVersionId, upscaleImage]);

  // Handle chat mode generation
  const handleChatGenerate = useCallback(async () => {
    if (!selectedFile || !chatMessage.trim()) {
      return;
    }

    const chatPreset: FormalPreset = {
      id: 'chat',
      name: 'Chat',
      category: 'background',
      prompt: chatMessage,
      description: 'Natural language edit',
    };

    await generateImage({
      imageFile: selectedFile,
      preset: chatPreset,
      model: selectedModel,
      customPrompt: chatMessage,
      referenceImages: referenceFiles,
    });
  }, [selectedFile, chatMessage, selectedModel, referenceFiles, generateImage]);

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      referencePreviews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [previewUrl, referencePreviews]);

  // Show upload interface if no image
  if (!selectedFile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-theme-black via-theme-dark to-theme-black flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-raleway font-bold text-theme-text mb-4">
              Formal Business Image Editor
            </h1>
            <p className="text-lg text-theme-white/80 font-raleway">
              Upload your image to get started with professional editing
            </p>
          </div>

          <div
            className={`${glass.prompt} rounded-3xl border-2 border-dashed transition-colors duration-200 ${
              isDragging ? 'border-theme-light bg-theme-light/10' : 'border-theme-mid'
            } p-12 text-center`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center gap-6">
              <div className="w-20 h-20 rounded-full bg-theme-light/20 flex items-center justify-center">
                <Upload className="w-10 h-10 text-theme-light" />
              </div>
              
              <div>
                <h3 className="text-xl font-raleway font-semibold text-theme-text mb-2">
                  Drop your image here
                </h3>
                <p className="text-theme-white/70 font-raleway">
                  or click to browse your files
                </p>
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`${buttons.primary} px-8 py-3 font-raleway`}
              >
                Choose Image
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>

          <div className="text-center mt-8">
            <button
              type="button"
              onClick={() => navigate('/')}
              className={`${buttons.ghost} font-raleway`}
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-theme-black via-theme-dark to-theme-black">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-theme-black/80 backdrop-blur-lg border-b border-theme-dark">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/')}
              className={`${buttons.ghost} font-raleway`}
            >
              ← Back to Home
            </button>
            
            <h1 className="text-xl font-raleway font-semibold text-theme-text">
              Formal Business Editor
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Model Selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
                className={`${glass.prompt} border border-theme-dark hover:border-theme-mid px-4 py-2 rounded-xl flex items-center gap-2 font-raleway text-sm transition-colors duration-200`}
              >
                {(() => {
                  const model = AI_MODELS.find(m => m.id === selectedModel);
                  const Icon = model?.Icon || Sparkles;
                  return (
                    <>
                      <Icon className={`w-4 h-4 text-${model?.accent}-400`} />
                      <span className="text-theme-text">{model?.name}</span>
                    </>
                  );
                })()}
              </button>

              {isModelMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-theme-black border border-theme-dark rounded-xl shadow-lg z-50">
                  <div className="p-2">
                    {AI_MODELS.map((model) => {
                      const Icon = model.Icon;
                      return (
                        <button
                          key={model.id}
                          type="button"
                          onClick={() => {
                            setSelectedModel(model.id);
                            setIsModelMenuOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 transition-colors duration-200 ${
                            selectedModel === model.id
                              ? 'bg-theme-light/20 text-theme-light'
                              : 'text-theme-white hover:bg-theme-dark'
                          }`}
                        >
                          <Icon className={`w-4 h-4 text-${model.accent}-400`} />
                          <div>
                            <div className="font-raleway font-medium">{model.name}</div>
                            <div className="text-xs text-theme-white/60">{model.desc}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Chat Mode Toggle */}
            <button
              type="button"
              onClick={() => setIsChatMode(!isChatMode)}
              className={`${buttons.ghost} ${isChatMode ? 'bg-theme-light/20 text-theme-light' : ''} font-raleway`}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Chat Mode
            </button>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Image Display */}
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="relative max-w-2xl">
              {(() => {
                const selectedVersion = versions.find(v => v.id === selectedVersionId);
                const displayUrl = selectedVersion?.url || previewUrl;
                
                return (
                  <div className="relative rounded-3xl overflow-hidden bg-theme-black border border-theme-mid">
                    <img
                      src={displayUrl}
                      alt="Edit preview"
                      className="w-full h-auto max-h-[600px] object-contain"
                    />
                    
                    {selectedVersion && (
                      <div className="absolute top-4 left-4 bg-theme-black/80 px-3 py-1 rounded-full">
                        <span className="text-sm font-raleway text-theme-white">
                          {selectedVersion.presetUsed}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Tabs and Controls */}
          <div className="border-t border-theme-dark bg-theme-black/50 backdrop-blur-lg">
            {isChatMode ? (
              /* Chat Mode Interface */
              <div className="p-6">
                <div className="max-w-4xl mx-auto">
                  <div className="flex gap-4">
                    <input
                      type="text"
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      placeholder="Describe what you want to change... (e.g., 'Replace background with studio look')"
                      className="flex-1 bg-theme-dark border border-theme-mid rounded-xl px-4 py-3 text-theme-text placeholder-theme-white/50 font-raleway focus:outline-none focus:border-theme-light"
                      onKeyDown={(e) => e.key === 'Enter' && handleChatGenerate()}
                    />
                    <button
                      type="button"
                      onClick={handleChatGenerate}
                      disabled={isGenerating || !chatMessage.trim()}
                      className={`${buttons.primary} px-6 py-3 font-raleway disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isGenerating ? 'Generating...' : 'Generate'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Normal Mode Interface */
              <div className="p-6">
                <div className="max-w-6xl mx-auto space-y-6">
                  {/* Tabs */}
                  <FormalEditTabs activeTab={activeTab} onTabChange={setActiveTab} />

                  {/* Preset Grid */}
                  {isCustomMode ? (
                    /* Custom Mode */
                    <div className={`${glass.prompt} rounded-2xl border border-theme-dark p-6`}>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-raleway font-semibold text-theme-text">
                          Custom Prompt
                        </h3>
                        <button
                          type="button"
                          onClick={() => setIsCustomMode(false)}
                          className={`${buttons.ghost} font-raleway text-sm`}
                        >
                          ← Back to Presets
                        </button>
                      </div>
                      
                      <div className="space-y-4">
                        <textarea
                          value={customPrompt}
                          onChange={(e) => setCustomPrompt(e.target.value)}
                          placeholder="Describe what you want to change in your image..."
                          className="w-full bg-theme-dark border border-theme-mid rounded-xl px-4 py-3 text-theme-text placeholder-theme-white/50 font-raleway focus:outline-none focus:border-theme-light resize-none"
                          rows={3}
                        />
                        
                        <div className="flex gap-3">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleReferenceUpload}
                            className="hidden"
                            id="reference-upload"
                          />
                          <label
                            htmlFor="reference-upload"
                            className={`${buttons.secondary} cursor-pointer font-raleway`}
                          >
                            📸 Add Reference
                          </label>
                          
                          <button
                            type="button"
                            onClick={handleGenerate}
                            disabled={isGenerating || !customPrompt.trim()}
                            className={`${buttons.primary} font-raleway disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {isGenerating ? 'Generating...' : 'Generate'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Preset Mode */
                    <div className={`${glass.prompt} rounded-2xl border border-theme-dark overflow-hidden`}>
                      {activeTab === 'background' ? (
                        <GroupedPresetGrid
                          groups={backgroundGroups}
                          selectedPresetId={selectedPreset?.id || null}
                          onSelectPreset={handlePresetSelect}
                          isGenerating={isGenerating}
                        />
                      ) : (
                        <PresetGrid
                          presets={currentPresets}
                          selectedPresetId={selectedPreset?.id || null}
                          onSelectPreset={handlePresetSelect}
                          isGenerating={isGenerating}
                        />
                      )}
                      
                      {/* Generate Button */}
                      {selectedPreset && (
                        <div className="p-4 border-t border-theme-dark">
                          <button
                            type="button"
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className={`${buttons.primary} w-full font-raleway disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {isGenerating ? 'Generating...' : `Apply ${selectedPreset.name}`}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Version Gallery */}
        {versions.length > 0 && (
          <>
            <VersionGallery
              versions={versions}
              selectedVersionId={selectedVersionId}
              onSelectVersion={selectVersion}
            />
            <VersionGallery
              versions={versions}
              selectedVersionId={selectedVersionId}
              onSelectVersion={selectVersion}
            />
          </>
        )}
        
        {/* Quick Asset Menu - Bottom Left */}
        <div className="fixed bottom-4 left-4 z-40 lg:hidden">
          <QuickAssetMenu
            onAvatarClick={() => setIsAvatarModalOpen(true)}
            onProductClick={() => setIsProductModalOpen(true)}
            onStyleClick={() => setIsStyleModalOpen(true)}
          />
        </div>
        
        {/* Desktop Quick Asset Menu - Bottom Left */}
        <div className="fixed bottom-4 left-4 z-40 hidden lg:block">
          <div className={`${glass.prompt} rounded-2xl border border-theme-dark p-3`}>
            <QuickAssetMenu
              onAvatarClick={() => setIsAvatarModalOpen(true)}
              onProductClick={() => setIsProductModalOpen(true)}
              onStyleClick={() => setIsStyleModalOpen(true)}
              className="flex-col gap-2"
            />
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="fixed bottom-4 left-4 right-4 z-50">
          <div className="bg-red-500/90 text-white px-4 py-3 rounded-xl border border-red-400/50 max-w-md mx-auto">
            <div className="flex items-center justify-between">
              <span className="font-raleway">{error}</span>
              <button
                type="button"
                onClick={clearError}
                className="ml-4 text-red-200 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
