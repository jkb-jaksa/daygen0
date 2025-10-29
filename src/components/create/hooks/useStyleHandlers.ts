import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

type StyleOption = {
  id: string;
  name: string;
  prompt: string;
  previewGradient?: string;
  image?: string;
};

type StyleSectionId = "lifestyle" | "formal" | "artistic";
type StyleGender = "male" | "female" | "unisex";

type SelectedStylesMap = Record<StyleGender, Record<StyleSectionId, StyleOption[]>>;

const STYLE_SECTION_DEFINITIONS: ReadonlyArray<{ id: StyleSectionId; name: string; image: string }> = [
  { id: "lifestyle", name: "Lifestyle", image: "/lifestyle images.png" },
  { id: "formal", name: "Formal", image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=900&q=80" },
  { id: "artistic", name: "Artistic", image: "/artistic images.png" },
];

const STYLE_GENDER_OPTIONS: ReadonlyArray<{ id: StyleGender; label: string }> = [
  { id: "female", label: "Female" },
  { id: "male", label: "Male" },
  { id: "unisex", label: "All" },
];

const createEmptyStyleSectionSelection = (): Record<StyleSectionId, StyleOption[]> => ({
  lifestyle: [],
  formal: [],
  artistic: [],
});

const createEmptySelectedStyles = (): SelectedStylesMap => ({
  female: createEmptyStyleSectionSelection(),
  male: createEmptyStyleSectionSelection(),
  unisex: createEmptyStyleSectionSelection(),
});

const cloneSelectedStyles = (styles: SelectedStylesMap): SelectedStylesMap => ({
  female: { ...styles.female },
  male: { ...styles.male },
  unisex: { ...styles.unisex },
});

const findFirstSelectedStyle = (styles: SelectedStylesMap): { gender: StyleGender; sectionId: StyleSectionId } | null => {
  for (const [gender, sections] of Object.entries(styles)) {
    for (const [sectionId, sectionStyles] of Object.entries(sections)) {
      if (sectionStyles.length > 0) {
        return { gender: gender as StyleGender, sectionId: sectionId as StyleSectionId };
      }
    }
  }
  return null;
};

export function useStyleHandlers() {
  // Style selection state
  const [selectedStyles, setSelectedStyles] = useState<SelectedStylesMap>(() => createEmptySelectedStyles());
  const [isStyleModalOpen, setIsStyleModalOpen] = useState(false);
  const [tempSelectedStyles, setTempSelectedStyles] = useState<SelectedStylesMap>(() => createEmptySelectedStyles());
  const [activeStyleGender, setActiveStyleGender] = useState<StyleGender>("unisex");
  const [activeStyleSection, setActiveStyleSection] = useState<StyleSectionId>("lifestyle");
  const [isStyleButtonHovered, setIsStyleButtonHovered] = useState(false);
  
  // Refs
  const stylesButtonRef = useRef<HTMLButtonElement | null>(null);
  
  // Initialize temp selection when modal opens
  useEffect(() => {
    if (!isStyleModalOpen || typeof document === 'undefined') {
      return;
    }

    // Initialize temp selection with current selection
    setTempSelectedStyles(cloneSelectedStyles(selectedStyles));

    const firstSelection = findFirstSelectedStyle(selectedStyles);
    if (firstSelection) {
      setActiveStyleGender(firstSelection.gender);
      setActiveStyleSection(firstSelection.sectionId);
    } else {
      setActiveStyleGender("unisex");
      setActiveStyleSection(STYLE_SECTION_DEFINITIONS[0]?.id ?? "lifestyle");
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsStyleModalOpen(false);
        if (stylesButtonRef.current) {
          stylesButtonRef.current.focus();
        }
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isStyleModalOpen, selectedStyles]);
  
  // Apply style to prompt
  const applyStyleToPrompt = useCallback(
    (basePrompt: string) => {
      const selectedPrompts = Object.values(selectedStyles)
        .flatMap(sections => Object.values(sections).flat())
        .map(style => style.prompt.trim())
        .filter(Boolean);

      if (selectedPrompts.length === 0) {
        return basePrompt;
      }

      const formattedPrompts = selectedPrompts
        .map((prompt, index) => `${index + 1}. ${prompt}`)
        .join("\n");

      return `${basePrompt}\n\nStyle:\n${formattedPrompts}`;
    },
    [selectedStyles],
  );
  
  // Focus style button
  const focusStyleButton = useCallback(() => {
    if (stylesButtonRef.current) {
      stylesButtonRef.current.focus();
    }
  }, []);
  
  // Get selected styles list
  const selectedStylesList = useMemo(
    () =>
      Object.values(selectedStyles).flatMap(sections =>
        Object.values(sections).flat(),
      ),
    [selectedStyles],
  );
  
  // Get total selected styles count
  const totalSelectedStyles = selectedStylesList.length;
  
  // Get total temp selected styles count
  const totalTempSelectedStyles = useMemo(
    () =>
      Object.values(tempSelectedStyles).reduce(
        (count, sections) =>
          count + Object.values(sections).reduce((sectionCount, styles) => sectionCount + styles.length, 0),
        0,
      ),
    [tempSelectedStyles],
  );
  
  // Get active style section data
  const activeStyleSectionData = useMemo(
    () => {
      // This would need to be implemented based on the actual style sections data
      // For now, return a placeholder
      return {
        id: activeStyleSection,
        name: STYLE_SECTION_DEFINITIONS.find(s => s.id === activeStyleSection)?.name ?? "Unknown",
        options: [],
      };
    },
    [activeStyleSection],
  );
  
  // Get selected styles label
  const selectedStylesLabel = useMemo(() => {
    if (totalSelectedStyles === 0) {
      return null;
    }

    if (totalSelectedStyles === 1) {
      return selectedStylesList[0]?.name ?? null;
    }

    if (totalSelectedStyles === 2) {
      const [first, second] = selectedStylesList;
      return `${first?.name ?? ""}, ${second?.name ?? ""}`.trim();
    }

    const [first, second] = selectedStylesList;
    return `${first?.name ?? ""}, ${second?.name ?? ""} + ${totalSelectedStyles - 2} more`.trim();
  }, [selectedStylesList, totalSelectedStyles]);
  
  // Get first selected style
  const firstSelectedStyle = useMemo(() => {
    if (totalSelectedStyles === 0) return null;
    return selectedStylesList[0] ?? null;
  }, [selectedStylesList, totalSelectedStyles]);
  
  // Handle toggle temp style
  const handleToggleTempStyle = useCallback((gender: StyleGender, sectionId: StyleSectionId, style: StyleOption) => {
    setTempSelectedStyles(prev => {
      const sectionStyles = prev[gender][sectionId];
      const exists = sectionStyles.some(option => option.id === style.id);
      const updatedSectionStyles = exists
        ? sectionStyles.filter(option => option.id !== style.id)
        : [...sectionStyles, style];

      return {
        ...prev,
        [gender]: {
          ...prev[gender],
          [sectionId]: updatedSectionStyles,
        },
      };
    });
  }, []);
  
  // Handle apply styles
  const handleApplyStyles = useCallback(() => {
    setSelectedStyles(cloneSelectedStyles(tempSelectedStyles));
    setIsStyleModalOpen(false);
    focusStyleButton();
  }, [tempSelectedStyles, focusStyleButton]);
  
  // Handle clear styles
  const handleClearStyles = useCallback(() => {
    setSelectedStyles(createEmptySelectedStyles());
    setTempSelectedStyles(createEmptySelectedStyles());
    setActiveStyleGender("unisex");
    setActiveStyleSection("lifestyle");
    setIsStyleModalOpen(false);
    focusStyleButton();
  }, [focusStyleButton]);
  
  // Handle style modal open
  const handleStyleModalOpen = useCallback(() => {
    setIsStyleModalOpen(true);
  }, []);
  
  // Handle style modal close
  const handleStyleModalClose = useCallback(() => {
    setIsStyleModalOpen(false);
    focusStyleButton();
  }, [focusStyleButton]);
  
  // Handle active style gender change
  const handleActiveStyleGenderChange = useCallback((gender: StyleGender) => {
    setActiveStyleGender(gender);
  }, []);
  
  // Handle active style section change
  const handleActiveStyleSectionChange = useCallback((sectionId: StyleSectionId) => {
    setActiveStyleSection(sectionId);
  }, []);
  
  return {
    // State
    selectedStyles,
    isStyleModalOpen,
    tempSelectedStyles,
    activeStyleGender,
    activeStyleSection,
    isStyleButtonHovered,
    selectedStylesList,
    totalSelectedStyles,
    totalTempSelectedStyles,
    activeStyleSectionData,
    selectedStylesLabel,
    firstSelectedStyle,
    
    // Refs
    stylesButtonRef,
    
    // Handlers
    applyStyleToPrompt,
    focusStyleButton,
    handleToggleTempStyle,
    handleApplyStyles,
    handleClearStyles,
    handleStyleModalOpen,
    handleStyleModalClose,
    handleActiveStyleGenderChange,
    handleActiveStyleSectionChange,
    
    // Setters
    setSelectedStyles,
    setIsStyleModalOpen,
    setTempSelectedStyles,
    setActiveStyleGender,
    setActiveStyleSection,
    setIsStyleButtonHovered,
    
    // Constants
    STYLE_SECTION_DEFINITIONS,
    STYLE_GENDER_OPTIONS,
  };
}

export type StyleHandlers = ReturnType<typeof useStyleHandlers>;
