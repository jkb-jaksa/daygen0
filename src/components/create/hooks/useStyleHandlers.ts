import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Users, Briefcase, Palette } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type StyleOption = {
  id: string;
  name: string;
  prompt: string;
  image?: string;
};

type StyleSectionId = "lifestyle" | "formal" | "artistic";
type StyleGender = "male" | "female" | "all";

type StyleSection = {
  id: StyleSectionId;
  name: string;
  image?: string;
  Icon: LucideIcon;
  options: StyleOption[];
};

type SelectedStylesMap = Record<StyleGender, Record<StyleSectionId, StyleOption[]>>;

const STYLE_SECTION_DEFINITIONS: readonly StyleSection[] = [
  { id: "lifestyle", name: "Lifestyle", Icon: Users, options: [] },
  { id: "formal", name: "Formal", Icon: Briefcase, options: [] },
  { id: "artistic", name: "Artistic", Icon: Palette, options: [] },
];

const STYLE_GENDER_OPTIONS: ReadonlyArray<{ id: StyleGender; label: string }> = [
  { id: "female", label: "Female" },
  { id: "male", label: "Male" },
  { id: "all", label: "All" },
];

// Lifestyle presets for female
const LIFESTYLE_STYLES_FEMALE: StyleOption[] = [
  {
    id: "female-lifestyle-black-suit-studio",
    name: "Black Suit Studio",
    prompt:
      "professional studio photography setup, black suit attire, clean minimalist background, professional lighting, high-end fashion photography style",
    image: "https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/presets/black_suit_studio setup.png",
  },
  {
    id: "female-lifestyle-french-balcony",
    name: "French Balcony",
    prompt:
      "elegant French balcony setting, charming Parisian architecture, wrought iron railings, romantic European atmosphere, natural daylight",
    image: "https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/presets/french_balcony.png",
  },
  {
    id: "female-lifestyle-boat-coastal-town",
    name: "Boat in Coastal Town",
    prompt:
      "charming coastal town setting, traditional fishing boat, waterfront architecture, maritime atmosphere, golden hour lighting, seaside lifestyle photography",
    image: "https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/presets/boat_in_coastal_town.png",
  },
  {
    id: "female-lifestyle-brick-wall",
    name: "Brick in the Wall",
    prompt:
      "urban street photography, exposed brick wall background, industrial aesthetic, gritty urban atmosphere, natural lighting, contemporary lifestyle photography",
    image: "https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/presets/brick_in_the_wall.png",
  },
  {
    id: "female-lifestyle-smoking-hot",
    name: "Smoking Hot",
    prompt:
      "dramatic lifestyle photography, warm lighting, sultry atmosphere, high contrast, fashion-forward styling, bold and confident mood",
    image: "https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/presets/smoking_hot.png",
  },
  {
    id: "female-lifestyle-sun-and-sea",
    name: "Sun and Sea",
    prompt:
      "beach lifestyle photography, sunny coastal setting, ocean waves, bright natural lighting, summer vibes, relaxed seaside atmosphere",
    image: "https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/presets/sun_and_sea.png",
  },
];

// Formal presets for female - placeholder for future presets
// Change id and name to change UI text
const FORMAL_STYLES_FEMALE: StyleOption[] = [
  {
    id: "female-formal-sitting-in-the-solone-chair",
    name: "Sitting in the solone chair",
    prompt: "replace woman with a person on the referenced image",
    image: "https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/presets/image.png",
  },
  {
    id: "female-formal-test2",
    name: "Test 2",
    prompt: "replace woman with a person on the referenced image",
    image: "https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/presets/f7687b88-f125-43b2-98fd-6440687476d1.png",
  },
  {
    id: "female-formal-test3",
    name: "Test 3",
    prompt: "replace woman with a person on the referenced image",
    image: "https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/presets/efe68d30-26c7-4803-a5f7-0c29b4d758ae.png",
  },
];

// Formal presets for male - placeholder for future presets
const FORMAL_STYLES_MALE: StyleOption[] = [
  // TODO: Add formal preset images here
  // Example:
  // {
  //   id: "male-formal-example",
  //   name: "Example Formal",
  //   prompt: "formal style description",
  //   image: "https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/presets/example.png",
  // },
];

// Artistic presets for female - placeholder for future presets
const ARTISTIC_STYLES_FEMALE: StyleOption[] = [
  // TODO: Add artistic preset images here
  // Example:
  // {
  //   id: "female-artistic-example",
  //   name: "Example Artistic",
  //   prompt: "artistic style description",
  //   image: "https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/presets/example.png",
  // },
];

// Artistic presets for male - placeholder for future presets
const ARTISTIC_STYLES_MALE: StyleOption[] = [
  // TODO: Add artistic preset images here
  // Example:
  // {
  //   id: "male-artistic-example",
  //   name: "Example Artistic",
  //   prompt: "artistic style description",
  //   image: "https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/presets/example.png",
  // },
];

const createPlaceholderStyles = (
  gender: StyleGender,
  sectionId: StyleSectionId,
  sectionName: string,
): StyleOption[] =>
  Array.from({ length: 20 }, (_, index) => {
    const label = `${sectionName} Style ${index + 1}`;
    return {
      id: `${gender}-${sectionId}-${index + 1}`,
      name: label,
      prompt: `${gender} ${sectionName.toLowerCase()} inspired placeholder prompt ${index + 1}`,
    };
  });

const createLifestyleStyles = (gender: StyleGender): StyleOption[] => {
  if (gender === "female") {
    return LIFESTYLE_STYLES_FEMALE;
  }
  if (gender === "male") {
    return createPlaceholderStyles(gender, "lifestyle", "Lifestyle");
  }
  // "all" - combine both male and female
  return [...LIFESTYLE_STYLES_FEMALE, ...createPlaceholderStyles("male", "lifestyle", "Lifestyle")];
};

const createFormalStyles = (gender: StyleGender): StyleOption[] => {
  if (gender === "female") {
    return FORMAL_STYLES_FEMALE;
  }
  if (gender === "male") {
    return FORMAL_STYLES_MALE;
  }
  // "all" - combine both male and female
  return [...FORMAL_STYLES_FEMALE, ...FORMAL_STYLES_MALE];
};

const createArtisticStyles = (gender: StyleGender): StyleOption[] => {
  if (gender === "female") {
    return ARTISTIC_STYLES_FEMALE;
  }
  if (gender === "male") {
    return ARTISTIC_STYLES_MALE;
  }
  // "all" - combine both male and female
  return [...ARTISTIC_STYLES_FEMALE, ...ARTISTIC_STYLES_MALE];
};

const createStyleSectionsForGender = (gender: StyleGender): StyleSection[] =>
  STYLE_SECTION_DEFINITIONS.map(({ id, name, Icon }) => {
    let options: StyleOption[] = [];
    if (id === "lifestyle") {
      options = createLifestyleStyles(gender);
    } else if (id === "formal") {
      options = createFormalStyles(gender);
    } else if (id === "artistic") {
      options = createArtisticStyles(gender);
    } else {
      options = createPlaceholderStyles(gender, id, name);
    }
    
    return {
      id,
      name,
      Icon,
      options,
    };
  });

const STYLE_SECTIONS_BY_GENDER: Record<StyleGender, StyleSection[]> = {
  male: createStyleSectionsForGender("male"),
  female: createStyleSectionsForGender("female"),
  all: createStyleSectionsForGender("all"),
};

const createEmptyStyleSectionSelection = (): Record<StyleSectionId, StyleOption[]> => ({
  lifestyle: [],
  formal: [],
  artistic: [],
});

const createEmptySelectedStyles = (): SelectedStylesMap => ({
  female: createEmptyStyleSectionSelection(),
  male: createEmptyStyleSectionSelection(),
  all: createEmptyStyleSectionSelection(),
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
  all: {
    lifestyle: [...styles.all.lifestyle],
    formal: [...styles.all.formal],
    artistic: [...styles.all.artistic],
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
  const [activeStyleGender, setActiveStyleGender] = useState<StyleGender>("all");
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
      setActiveStyleGender("all");
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
      Icon: sectionDefinition?.Icon,
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
    const nextSelectedStyles = cloneSelectedStyles(tempSelectedStyles);
    setSelectedStyles(nextSelectedStyles);
    setIsStyleModalOpen(false);
    focusStyleButton();
    return getOrderedSelectedStyles(nextSelectedStyles);
  }, [tempSelectedStyles, focusStyleButton]);
  
  // Handle clear styles
  const handleClearStyles = useCallback(() => {
    setSelectedStyles(createEmptySelectedStyles());
    setTempSelectedStyles(createEmptySelectedStyles());
    setActiveStyleGender("all");
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
