import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { usePromptHistory } from '../../../hooks/usePromptHistory';
import { useSavedPrompts } from '../../../hooks/useSavedPrompts';
import { useAuth } from '../../../auth/useAuth';
import { STORAGE_CHANGE_EVENT } from '../../../utils/storageEvents';
import { loadSavedPrompts } from '../../../lib/savedPrompts';

type StyleOption = {
  id: string;
  name: string;
  prompt: string;
  image?: string;
};

type SelectedStylesMap = Record<string, Record<string, StyleOption[]>>;

export function usePromptHandlers(
  selectedStyles: SelectedStylesMap,
  // Deprecated: applyStyleToPrompt is no longer used, but kept for signature compatibility if needed
  // or we can remove it entirely if we update the caller. Let's keep it optional/ignored for now 
  // to minimize diff noise, or update signature.
  // Given the instruction "remove the logic", we'll ignore it.
  applyStyleToPrompt: (basePrompt: string) => string
) {
  const { user } = useAuth();
  const userKey = user?.id || user?.email || "anon";
  
  // Prompt state
  const [prompt, setPrompt] = useState<string>("");
  const [isPromptsDropdownOpen, setIsPromptsDropdownOpen] = useState(false);
  const [unsavePromptText, setUnsavePromptText] = useState<string | null>(null);
  
  // Prompt history and saved prompts
  const { history, addPrompt, removePrompt: removeRecentPrompt } = usePromptHistory(userKey, 10);
  const { savedPrompts, savePrompt, removePrompt, updatePrompt, isPromptSaved } = useSavedPrompts(userKey);
  
  // Track saved prompts refresh timestamp for forcing dropdown updates (only for cross-tab sync)
  const [savedPromptsRefreshKey, setSavedPromptsRefreshKey] = useState(0);
  const savedPromptsRef = useRef(savedPrompts);
  
  // Keep ref in sync
  useEffect(() => {
    savedPromptsRef.current = savedPrompts;
  }, [savedPrompts]);
  
  // Listen for saved prompts changes from cross-tab sync (not local updates)
  // Note: Local updates via savePrompt/removePrompt already update savedPrompts state reactively,
  // so we don't need to increment the refresh key for those. Only increment for cross-tab sync.
  // Also listen directly to storage change events to ensure we catch all updates
  useEffect(() => {
    const handleStorageChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ key: 'avatars' | 'products' | 'savedPrompts' }>;
      if (customEvent.detail?.key === 'savedPrompts') {
        // Force refresh by incrementing the key and reloading from localStorage
        const freshPrompts = loadSavedPrompts(userKey);
        // Only update if the data actually changed
        if (JSON.stringify(freshPrompts) !== JSON.stringify(savedPromptsRef.current)) {
          setSavedPromptsRefreshKey(prev => prev + 1);
        }
      }
    };
    
    window.addEventListener(STORAGE_CHANGE_EVENT, handleStorageChange);
    return () => {
      window.removeEventListener(STORAGE_CHANGE_EVENT, handleStorageChange);
    };
  }, [userKey]);
  
  // Force refresh saved prompts when dropdown opens to ensure latest data
  useEffect(() => {
    if (isPromptsDropdownOpen) {
      // Reload from localStorage when dropdown opens
      const freshPrompts = loadSavedPrompts(userKey);
      if (JSON.stringify(freshPrompts) !== JSON.stringify(savedPromptsRef.current)) {
        setSavedPromptsRefreshKey(prev => prev + 1);
      }
    }
  }, [isPromptsDropdownOpen, userKey]);
  
  // Copy notification state
  const [copyNotification, setCopyNotification] = useState<string | null>(null);
  
  // Apply style to prompt (No-op now)
  const applyStyleToPromptHandler = useCallback(
    (basePrompt: string) => {
      return basePrompt;
    },
    []
  );
  
  // Handle prompt change
  const handlePromptChange = useCallback((value: string) => {
    setPrompt(value);
  }, []);
  
  // Handle prompt submission
  const handlePromptSubmit = useCallback((finalPrompt: string) => {
    if (finalPrompt.trim()) {
      addPrompt(finalPrompt.trim());
    }
  }, [addPrompt]);
  
  // Handle save prompt (toggle: save if not saved, unsave if already saved)
  const handleSavePrompt = useCallback((promptText: string) => {
    const trimmed = promptText.trim();
    if (!trimmed) return;
    
    if (isPromptSaved(trimmed)) {
      // Find and remove the saved prompt
      const promptToRemove = savedPrompts.find(p => p.text.toLowerCase() === trimmed.toLowerCase());
      if (promptToRemove) {
        removePrompt(promptToRemove.id);
        setCopyNotification('Prompt removed!');
        setTimeout(() => setCopyNotification(null), 2000);
      }
    } else {
      // Save the prompt
      savePrompt(trimmed);
      setCopyNotification('Prompt saved!');
      setTimeout(() => setCopyNotification(null), 2000);
    }
  }, [savePrompt, isPromptSaved, savedPrompts, removePrompt]);
  
  // Handle unsave prompt
  const handleUnsavePrompt = useCallback((promptText: string) => {
    setUnsavePromptText(promptText);
  }, []);
  
  // Handle confirm unsave
  const handleConfirmUnsave = useCallback(() => {
    if (unsavePromptText) {
      const promptToRemove = savedPrompts.find(p => p.text === unsavePromptText);
      if (promptToRemove) {
        removePrompt(promptToRemove.id);
        setCopyNotification('Prompt removed!');
        setTimeout(() => setCopyNotification(null), 2000);
      }
      setUnsavePromptText(null);
    }
  }, [unsavePromptText, savedPrompts, removePrompt]);
  
  // Handle cancel unsave
  const handleCancelUnsave = useCallback(() => {
    setUnsavePromptText(null);
  }, []);
  
  // Handle prompts dropdown toggle
  const handlePromptsDropdownToggle = useCallback(() => {
    setIsPromptsDropdownOpen(prev => !prev);
  }, []);
  
  // Handle prompts dropdown close
  const handlePromptsDropdownClose = useCallback(() => {
    setIsPromptsDropdownOpen(false);
  }, []);
  
  // Handle recent prompt selection
  const handleRecentPromptSelect = useCallback((selectedPrompt: string) => {
    setPrompt(selectedPrompt);
    setIsPromptsDropdownOpen(false);
  }, []);
  
  // Handle saved prompt selection
  const handleSavedPromptSelect = useCallback((selectedPrompt: string) => {
    setPrompt(selectedPrompt);
    setIsPromptsDropdownOpen(false);
  }, []);
  
  // Handle remove recent prompt
  const handleRemoveRecentPrompt = useCallback((promptId: string) => {
    removeRecentPrompt(promptId);
  }, [removeRecentPrompt]);
  
  // Handle update saved prompt
  const handleUpdateSavedPrompt = useCallback((promptId: string, newText: string) => {
    updatePrompt(promptId, newText);
  }, [updatePrompt]);
  
  // Get final prompt (Raw prompt only, styles are no longer applied to text)
  const getFinalPrompt = useCallback(() => {
    return prompt;
  }, [prompt]);
  
  // Check if prompt is saved
  const isCurrentPromptSaved = useMemo(() => {
    return isPromptSaved(prompt.trim());
  }, [prompt, isPromptSaved]);
  
  // Get recent prompts (limited to 5 for dropdown)
  const recentPrompts = useMemo(() => {
    return history.slice(0, 5);
  }, [history]);
  
  // Get saved prompts (limited to 10 for dropdown)
  // Include refreshKey in dependencies to force recalculation when prompts are saved elsewhere
  const savedPromptsList = useMemo(() => {
    // When refresh key changes, reload from localStorage to ensure we have latest data
    if (savedPromptsRefreshKey > 0) {
      const freshPrompts = loadSavedPrompts(userKey);
      return freshPrompts.slice(0, 10);
    }
    return savedPrompts.slice(0, 10);
  }, [savedPrompts, savedPromptsRefreshKey, userKey]);
  
  return {
    // State
    prompt,
    isPromptsDropdownOpen,
    unsavePromptText,
    copyNotification,
    recentPrompts,
    savedPromptsList,
    savedPromptsRefreshKey,
    isCurrentPromptSaved,
    
    // Handlers
    handlePromptChange,
    handlePromptSubmit,
    handleSavePrompt,
    handleUnsavePrompt,
    handleConfirmUnsave,
    handleCancelUnsave,
    handlePromptsDropdownToggle,
    handlePromptsDropdownClose,
    handleRecentPromptSelect,
    handleSavedPromptSelect,
    handleRemoveRecentPrompt,
    handleUpdateSavedPrompt,
    getFinalPrompt,
    
    // Setters
    setPrompt,
    setCopyNotification,
  };
}
