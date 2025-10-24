import { useState, useCallback, useMemo } from 'react';
import { usePromptHistory } from '../../../hooks/usePromptHistory';
import { useSavedPrompts } from '../../../hooks/useSavedPrompts';
import { useAuth } from '../../../auth/useAuth';

type StyleOption = {
  id: string;
  name: string;
  prompt: string;
  previewGradient?: string;
  image?: string;
};

type SelectedStylesMap = Record<string, Record<string, StyleOption[]>>;

export function usePromptHandlers(
  selectedStyles: SelectedStylesMap,
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
  
  // Copy notification state
  const [copyNotification, setCopyNotification] = useState<string | null>(null);
  
  // Apply style to prompt
  const applyStyleToPromptHandler = useCallback(
    (basePrompt: string) => {
      return applyStyleToPrompt(basePrompt);
    },
    [applyStyleToPrompt]
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
  
  // Handle save prompt
  const handleSavePrompt = useCallback((promptText: string) => {
    if (promptText.trim() && !isPromptSaved(promptText.trim())) {
      savePrompt(promptText.trim());
      setCopyNotification('Prompt saved!');
      setTimeout(() => setCopyNotification(null), 2000);
    }
  }, [savePrompt, isPromptSaved]);
  
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
  
  // Get final prompt with styles applied
  const getFinalPrompt = useCallback(() => {
    return applyStyleToPromptHandler(prompt);
  }, [prompt, applyStyleToPromptHandler]);
  
  // Check if prompt is saved
  const isCurrentPromptSaved = useMemo(() => {
    return isPromptSaved(prompt.trim());
  }, [prompt, isPromptSaved]);
  
  // Get recent prompts (limited to 5 for dropdown)
  const recentPrompts = useMemo(() => {
    return history.slice(0, 5);
  }, [history]);
  
  // Get saved prompts (limited to 10 for dropdown)
  const savedPromptsList = useMemo(() => {
    return savedPrompts.slice(0, 10);
  }, [savedPrompts]);
  
  return {
    // State
    prompt,
    isPromptsDropdownOpen,
    unsavePromptText,
    copyNotification,
    recentPrompts,
    savedPromptsList,
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
