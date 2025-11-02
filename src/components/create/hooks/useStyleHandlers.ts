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

type StyleSection = {
  id: StyleSectionId;
  name: string;
  image: string;
  options: StyleOption[];
};

type SelectedStylesMap = Record<StyleGender, Record<StyleSectionId, StyleOption[]>>;

const STYLE_GRADIENTS: readonly string[] = [
  "linear-gradient(135deg, rgba(244,114,182,0.35) 0%, rgba(59,130,246,0.55) 100%)",
  "linear-gradient(135deg, rgba(251,191,36,0.35) 0%, rgba(79,70,229,0.55) 100%)",
  "linear-gradient(135deg, rgba(56,189,248,0.4) 0%, rgba(99,102,241,0.6) 50%, rgba(236,72,153,0.45) 100%)",
  "linear-gradient(135deg, rgba(148,163,184,0.35) 0%, rgba(226,232,240,0.6) 100%)",
  "linear-gradient(135deg, rgba(110,231,183,0.35) 0%, rgba(103,232,249,0.5) 100%)",
  "linear-gradient(135deg, rgba(251,191,36,0.4) 0%, rgba(248,113,113,0.5) 60%, rgba(96,165,250,0.45) 100%)",
  "linear-gradient(135deg, rgba(217,119,6,0.4) 0%, rgba(180,83,9,0.5) 100%)",
  "linear-gradient(135deg, rgba(236,72,153,0.45) 0%, rgba(168,85,247,0.5) 50%, rgba(14,165,233,0.4) 100%)",
  "linear-gradient(135deg, rgba(251,207,232,0.45) 0%, rgba(196,181,253,0.5) 50%, rgba(165,243,252,0.4) 100%)",
  "linear-gradient(135deg, rgba(30,64,175,0.5) 0%, rgba(59,130,246,0.45) 50%, rgba(248,113,113,0.4) 100%)",
];

const STYLE_SECTION_DEFINITIONS: readonly StyleSection[] = [
  { id: "lifestyle", name: "Lifestyle", image: "/lifestyle images.png", options: [] },
  { id: "formal", name: "Formal", image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=900&q=80", options: [] },
  { id: "artistic", name: "Artistic", image: "/artistic images.png", options: [] },
];

const STYLE_GENDER_OPTIONS: ReadonlyArray<{ id: StyleGender; label: string }> = [
  { id: "female", label: "Female" },
  { id: "male", label: "Male" },
  { id: "unisex", label: "All" },
];

const LIFESTYLE_STYLES_UNISEX: StyleOption[] = [
  {
    id: "unisex-lifestyle-black-suit-studio",
    name: "Black Suit Studio",
    prompt:
      "professional studio photography setup, black suit attire, clean minimalist background, professional lighting, high-end fashion photography style",
    image: "/black_suit_studio setup.png",
  },
  {
    id: "unisex-lifestyle-french-balcony",
    name: "French Balcony",
    prompt:
      "elegant French balcony setting, charming Parisian architecture, wrought iron railings, romantic European atmosphere, natural daylight",
    image: "/french_balcony.png",
  },
  {
    id: "unisex-lifestyle-boat-coastal-town",
    name: "Boat in Coastal Town",
    prompt:
      "charming coastal town setting, traditional fishing boat, waterfront architecture, maritime atmosphere, golden hour lighting, seaside lifestyle photography",
    image: "/boat_in_coastal_town.png",
  },
  {
    id: "unisex-lifestyle-brick-wall",
    name: "Brick in the Wall",
    prompt:
      "urban street photography, exposed brick wall background, industrial aesthetic, gritty urban atmosphere, natural lighting, contemporary lifestyle photography",
    image: "/brick_in_the_wall.png",
  },
  {
    id: "unisex-lifestyle-smoking-hot",
    name: "Smoking Hot",
    prompt:
      "dramatic lifestyle photography, warm lighting, sultry atmosphere, high contrast, fashion-forward styling, bold and confident mood",
    image: "/smoking_hot.png",
  },
  {
    id: "unisex-lifestyle-sun-and-sea",
    name: "Sun and Sea",
    prompt:
      "beach lifestyle photography, sunny coastal setting, ocean waves, bright natural lighting, summer vibes, relaxed seaside atmosphere",
    image: "/sun_and_sea.png",
  },
];

const createPlaceholderStyles = (
  gender: StyleGender,
  sectionId: StyleSectionId,
  sectionName: string,
): StyleOption[] =>
  Array.from({ length: 20 }, (_, index) => {
    const gradient = STYLE_GRADIENTS[index % STYLE_GRADIENTS.length];
    const label = `${sectionName} Style ${index + 1}`;
    return {
      id: `${gender}-${sectionId}-${index + 1}`,
      name: label,
      prompt: `${gender} ${sectionName.toLowerCase()} inspired placeholder prompt ${index + 1}`,
      previewGradient: gradient,
    };
  });

const createLifestyleStyles = (gender: StyleGender): StyleOption[] => {
  if (gender === "unisex") {
    return LIFESTYLE_STYLES_UNISEX;
  }
  return createPlaceholderStyles(gender, "lifestyle", "Lifestyle");
};

const createStyleSectionsForGender = (gender: StyleGender): StyleSection[] =>
  STYLE_SECTION_DEFINITIONS.map(({ id, name, image }) => ({
    id,
    name,
    image,
    options: id === "lifestyle" ? createLifestyleStyles(gender) : createPlaceholderStyles(gender, id, name),
  }));

const STYLE_SECTIONS_BY_GENDER: Record<StyleGender, StyleSection[]> = {
  male: createStyleSectionsForGender("male"),
  female: createStyleSectionsForGender("female"),
  unisex: createStyleSectionsForGender("unisex"),
};

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
  female: {
    lifestyle: [...styles.female.lifestyle],
    formal: [...styles.female.formal],
    artistic: [...styles.female.artistic],
  },
  male: {
    lifestyle: [...styles.male.lifestyle],
    formal: [...styles.male.formal],
    artistic: [...styles.male.artistic],
  },
  unisex: {
    lifestyle: [...styles.unisex.lifestyle],
    formal: [...styles.unisex.formal],
    artistic: [...styles.unisex.artistic],
  },
});

const findFirstSelectedStyle = (styles: SelectedStylesMap): { gender: StyleGender; sectionId: StyleSectionId } | null => {
  for (const { id: gender } of STYLE_GENDER_OPTIONS) {
    const sections = styles[gender];
    for (const { id: sectionId } of STYLE_SECTION_DEFINITIONS) {
      if (sections[sectionId].length > 0) {
        return { gender, sectionId };
      }
    }
  }
  return null;
};

const getStyleSectionsForGender = (gender: StyleGender): StyleSection[] => STYLE_SECTIONS_BY_GENDER[gender];

const getStyleSectionOptions = (gender: StyleGender, sectionId: StyleSectionId): StyleOption[] => {
  const section = getStyleSectionsForGender(gender).find(item => item.id === sectionId);
  return section?.options ?? [];
};

const getOrderedSelectedStyles = (styles: SelectedStylesMap): StyleOption[] => {
  const ordered: StyleOption[] = [];
  for (const { id: gender } of STYLE_GENDER_OPTIONS) {
    const sections = styles[gender];
    for (const { id: sectionId } of STYLE_SECTION_DEFINITIONS) {
      ordered.push(...sections[sectionId]);
    }
  }
  return ordered;
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
      const selectedPrompts = getOrderedSelectedStyles(selectedStyles)
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
  const selectedStylesList = useMemo(() => getOrderedSelectedStyles(selectedStyles), [selectedStyles]);
  
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
  const activeStyleSectionData = useMemo(() => {
    const sectionDefinition = STYLE_SECTION_DEFINITIONS.find(section => section.id === activeStyleSection);
    const options = getStyleSectionOptions(activeStyleGender, activeStyleSection);
    return {
      id: activeStyleSection,
      name: sectionDefinition?.name ?? "Unknown",
      image: sectionDefinition?.image ?? "",
      options,
    };
  }, [activeStyleGender, activeStyleSection]);
  
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
    setActiveStyleSection(prevSection => {
      const sections = tempSelectedStyles[gender];
      const firstWithSelection = STYLE_SECTION_DEFINITIONS.find(section => sections[section.id].length > 0)?.id;
      if (firstWithSelection) {
        return firstWithSelection;
      }

      if (sections[prevSection]) {
        return prevSection;
      }

      return STYLE_SECTION_DEFINITIONS[0]?.id ?? "lifestyle";
    });
  }, [tempSelectedStyles]);
  
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
