import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState, lazy } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookmarkIcon,
  Check,
  Film,
  LayoutDashboard,
  MessageCircle,
  Minus,
  Pencil,
  Package,
  Plus,
  Send,
  Settings,
  Shapes,
  Sparkles,
  Trash2,
  User,
  Wand2,
  X,
  Scan,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useAuth } from "../../auth/useAuth";
import { useFooter } from "../../contexts/useFooter";
import { buttons, glass, inputs, layout } from "../../styles/designSystem";
import { useChatSessions } from "../../hooks/useChatSessions";
import type { ChatMessage, ChatSession } from "../../hooks/useChatSessions";
import { usePromptHistory } from "../../hooks/usePromptHistory";
import { useSavedPrompts } from "../../hooks/useSavedPrompts";
import { PromptsDropdown } from "../PromptsDropdown";
import { AvatarPickerPortal } from "./AvatarPickerPortal";
import type { AvatarSelection, StoredAvatar } from "../avatars/types";
import { createAvatarRecord, normalizeStoredAvatars } from "../../utils/avatars";
import { getPersistedValue, setPersistedValue } from "../../lib/clientStorage";
import { getToolLogo, hasToolLogo } from "../../utils/toolLogos";
import { AspectRatioDropdown } from "../AspectRatioDropdown";
import type { AspectRatioOption, GeminiAspectRatio } from "../../types/aspectRatio";
import { GEMINI_ASPECT_RATIO_OPTIONS, QWEN_ASPECT_RATIO_OPTIONS } from "../../data/aspectRatios";

const AvatarCreationModal = lazy(() => import("../avatars/AvatarCreationModal"));
const SettingsMenu = lazy(() => import("./SettingsMenu"));

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const scheduleTimeout = (callback: () => void, delay: number) => {
  if (typeof window === "undefined") {
    return setTimeout(callback, delay);
  }
  return window.setTimeout(callback, delay);
};

const showHoverTooltip = (target: HTMLElement, tooltipId: string) => {
  if (typeof document === 'undefined') return;
  const tooltip = document.querySelector(`[data-tooltip-for="${tooltipId}"]`) as HTMLElement | null;
  if (!tooltip) return;
  const ownerCard = target.closest('.group') as HTMLElement | null;
  if (ownerCard) {
    const triggerRect = target.getBoundingClientRect();
    const cardRect = ownerCard.getBoundingClientRect();
    const relativeTop = triggerRect.top - cardRect.top;
    const relativeLeft = triggerRect.left - cardRect.left + triggerRect.width / 2;
    tooltip.style.top = `${relativeTop - 8}px`;
    tooltip.style.left = `${relativeLeft}px`;
    tooltip.style.transform = 'translateX(-50%) translateY(-100%)';
  }
  tooltip.classList.remove('opacity-0');
  tooltip.classList.add('opacity-100');
};

const hideHoverTooltip = (tooltipId: string) => {
  if (typeof document === 'undefined') return;
  const tooltip = document.querySelector(`[data-tooltip-for="${tooltipId}"]`) as HTMLElement | null;
  if (!tooltip) return;
  tooltip.classList.remove('opacity-100');
  tooltip.classList.add('opacity-0');
};

const REFERENCE_LIMIT = 3;

type ImageModelOption = {
  id: string;
  name: string;
  desc: string;
  Icon: LucideIcon;
};

const IMAGE_MODEL_OPTIONS: ReadonlyArray<ImageModelOption> = [
  {
    id: "gemini-2.5-flash-image",
    name: "Gemini 2.5 Flash",
    desc: "Best image editing.",
    Icon: Sparkles,
  },
  {
    id: "flux-1.1",
    name: "Flux 1.1",
    desc: "High-quality text-to-image generation and editing.",
    Icon: Wand2,
  },
  {
    id: "reve-image",
    name: "Reve",
    desc: "Great text-to-image and image editing.",
    Icon: Sparkles,
  },
  {
    id: "ideogram",
    name: "Ideogram 3.0",
    desc: "Advanced image generation, editing, and enhancement.",
    Icon: Package,
  },
  {
    id: "recraft",
    name: "Recraft",
    desc: "Great for text, icons and mockups.",
    Icon: Shapes,
  },
  {
    id: "qwen-image",
    name: "Qwen",
    desc: "Great image editing.",
    Icon: Wand2,
  },
  {
    id: "runway-gen4",
    name: "Runway Gen-4",
    desc: "Great image model. Great control & editing features",
    Icon: Film,
  },
  {
    id: "chatgpt-image",
    name: "ChatGPT",
    desc: "Popular image model.",
    Icon: Sparkles,
  },
  {
    id: "luma-photon-1",
    name: "Luma Photon 1",
    desc: "High-quality image generation with Photon.",
    Icon: Sparkles,
  },
  {
    id: "luma-photon-flash-1",
    name: "Luma Photon Flash 1",
    desc: "Fast image generation with Photon Flash.",
    Icon: Sparkles,
  },
] as const;

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const formatDateHeading = (isoDate: string) => {
  const date = new Date(isoDate);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (isSameDay(date, today)) return "Today";
  if (isSameDay(date, yesterday)) return "Yesterday";

  const formatter = new Intl.DateTimeFormat(undefined, {
    month: "long",
    day: "numeric",
    year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
  return formatter.format(date);
};


const deriveTitle = (value: string) => {
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned) return "New chat";
  return cleaned.length > 42 ? `${cleaned.slice(0, 42)}…` : cleaned;
};

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

type GroupedSessions = {
  key: string;
  label: string;
  sessions: ChatSession[];
};

const ChatMode: React.FC = () => {
  const navigate = useNavigate();
  const { storagePrefix, user } = useAuth();
  const { setFooterVisible } = useFooter();
  const {
    sessions,
    activeSessionId,
    selectSession,
    createSession,
    updateSession,
    deleteSession,
  } = useChatSessions(storagePrefix);

  const userKey = user?.id || user?.email || "anon";
  const { history, addPrompt, removePrompt: removeRecentPrompt } = usePromptHistory(userKey, 10);
  const { savedPrompts, savePrompt, removePrompt, updatePrompt } = useSavedPrompts(userKey);

  const [input, setInput] = useState("");
  const [isAssistantTyping, setIsAssistantTyping] = useState(false);
  const [referencePreviews, setReferencePreviews] = useState<string[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [chatNameDraft, setChatNameDraft] = useState("");
  const [chatToRename, setChatToRename] = useState<ChatSession | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [chatToDelete, setChatToDelete] = useState<ChatSession | null>(null);
  const [storedAvatars, setStoredAvatars] = useState<StoredAvatar[]>([]);
  const [selectedAvatar, setSelectedAvatar] = useState<StoredAvatar | null>(null);
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);
  const [storedProducts, setStoredProducts] = useState<StoredAvatar[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<StoredAvatar | null>(null);
  const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);
  const [isPromptsDropdownOpen, setIsPromptsDropdownOpen] = useState(false);
  const [isAvatarCreationModalOpen, setIsAvatarCreationModalOpen] = useState(false);
  const [avatarSelection, setAvatarSelection] = useState<AvatarSelection | null>(null);
  const [avatarName, setAvatarName] = useState("");
  const [avatarUploadError, setAvatarUploadError] = useState<string | null>(null);
  const [isDraggingAvatar, setIsDraggingAvatar] = useState(false);
  const [batchSize, setBatchSize] = useState<number>(1);
  const [selectedModel, setSelectedModel] = useState<string>("gemini-2.5-flash-image");
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAspectRatioMenuOpen, setIsAspectRatioMenuOpen] = useState(false);
  const [fluxModel, setFluxModel] = useState<"flux-pro-1.1" | "flux-pro-1.1-ultra" | "flux-kontext-pro" | "flux-kontext-max">(
    "flux-pro-1.1",
  );
  const [recraftModel, setRecraftModel] = useState<"recraft-v3" | "recraft-v2">("recraft-v3");
  const [runwayModel, setRunwayModel] = useState<"runway-gen4" | "runway-gen4-turbo">("runway-gen4");
  const [temperature, setTemperature] = useState<number>(1);
  const [outputLength, setOutputLength] = useState<number>(8192);
  const [topP, setTopP] = useState<number>(1);
  const [geminiAspectRatio, setGeminiAspectRatio] = useState<GeminiAspectRatio>("1:1");
  const [qwenSize, setQwenSize] = useState<string>("1328*1328");
  const [qwenPromptExtend, setQwenPromptExtend] = useState<boolean>(true);
  const [qwenWatermark, setQwenWatermark] = useState<boolean>(false);
  const [lumaPhotonModel, setLumaPhotonModel] = useState<"luma-photon-1" | "luma-photon-flash-1">("luma-photon-1");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const promptsButtonRef = useRef<HTMLButtonElement>(null);
  const avatarButtonRef = useRef<HTMLButtonElement>(null);
  const productButtonRef = useRef<HTMLButtonElement>(null);
  const settingsRef = useRef<HTMLButtonElement>(null);
  const modelSelectorRef = useRef<HTMLButtonElement>(null);
  const aspectRatioButtonRef = useRef<HTMLButtonElement>(null);

  const currentModel = useMemo(() => {
    return IMAGE_MODEL_OPTIONS.find(model => model.id === selectedModel) ?? IMAGE_MODEL_OPTIONS[0];
  }, [selectedModel]);

  const isGeminiModel = selectedModel === "gemini-2.5-flash-image";
  const isFluxModel = selectedModel === "flux-1.1";
  const isRunwayImageModel = selectedModel === "runway-gen4";
  const isRecraftModel = selectedModel === "recraft";
  const isQwenModel = selectedModel === "qwen-image";
  const isLumaPhotonImageModel =
    selectedModel === "luma-photon-1" || selectedModel === "luma-photon-flash-1";

  const aspectRatioConfig = useMemo<{
    options: ReadonlyArray<AspectRatioOption>;
    selectedValue: string;
    onSelect: (value: string) => void;
  } | null>(() => {
    if (isGeminiModel) {
      return {
        options: GEMINI_ASPECT_RATIO_OPTIONS,
        selectedValue: geminiAspectRatio,
        onSelect: value => setGeminiAspectRatio(value as GeminiAspectRatio),
      };
    }

    if (isQwenModel) {
      return {
        options: QWEN_ASPECT_RATIO_OPTIONS,
        selectedValue: qwenSize,
        onSelect: setQwenSize,
      };
    }

    return null;
  }, [isGeminiModel, geminiAspectRatio, isQwenModel, qwenSize]);

  useEffect(() => {
    if (!aspectRatioConfig) {
      setIsAspectRatioMenuOpen(false);
    }
  }, [aspectRatioConfig]);

  useEffect(() => {
    setFooterVisible(false);
    return () => setFooterVisible(true);
  }, [setFooterVisible]);

  const activeSession = useMemo(() => {
    if (!sessions.length) return undefined;
    return sessions.find(session => session.id === activeSessionId) ?? sessions[0];
  }, [sessions, activeSessionId]);

  useEffect(() => {
    if (!activeSessionId && sessions[0]) {
      selectSession(sessions[0].id);
    }
  }, [activeSessionId, sessions, selectSession]);

  useEffect(() => {
    if (!messagesEndRef.current) return;
    messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [activeSession?.messages.length, isAssistantTyping]);

  useEffect(() => {
    let isMounted = true;

    const loadAvatars = async () => {
      if (!storagePrefix) {
        if (isMounted) {
          setStoredAvatars([]);
          setSelectedAvatar(null);
        }
        return;
      }

      try {
        const stored = await getPersistedValue<StoredAvatar[]>(storagePrefix, "avatars");
        if (!isMounted) return;

        const normalized = normalizeStoredAvatars(stored ?? [], { ownerId: user?.id ?? undefined });
        setStoredAvatars(normalized);

        const needsPersist =
          (stored?.length ?? 0) !== normalized.length ||
          (stored ?? []).some((avatar, index) => {
            const normalizedAvatar = normalized[index];
            if (!normalizedAvatar) return true;
            return avatar.slug !== normalizedAvatar.slug || avatar.ownerId !== normalizedAvatar.ownerId;
          });

        if (needsPersist) {
          await setPersistedValue(storagePrefix, "avatars", normalized);
        }
      } catch {
        if (isMounted) {
          setStoredAvatars([]);
        }
      }
    };

    void loadAvatars();

    return () => {
      isMounted = false;
    };
  }, [storagePrefix, user?.id]);

  useEffect(() => {
    if (!selectedAvatar) return;
    const match = storedAvatars.find(avatar => avatar.id === selectedAvatar.id);
    if (!match) {
      setSelectedAvatar(null);
    } else if (match !== selectedAvatar) {
      setSelectedAvatar(match);
    }
  }, [selectedAvatar, storedAvatars]);

  useEffect(() => {
    let isMounted = true;

    const loadProducts = async () => {
      if (!storagePrefix) {
        if (isMounted) {
          setStoredProducts([]);
          setSelectedProduct(null);
        }
        return;
      }

      try {
        const stored = await getPersistedValue<StoredAvatar[]>(storagePrefix, "products");
        if (!isMounted) return;

        const normalized = normalizeStoredAvatars(stored ?? [], { ownerId: user?.id ?? undefined });
        setStoredProducts(normalized);

        const needsPersist =
          (stored?.length ?? 0) !== normalized.length ||
          (stored ?? []).some((product, index) => {
            const normalizedProduct = normalized[index];
            if (!normalizedProduct) return true;
            return product.slug !== normalizedProduct.slug || product.ownerId !== normalizedProduct.ownerId;
          });

        if (needsPersist) {
          await setPersistedValue(storagePrefix, "products", normalized);
        }
      } catch {
        if (isMounted) {
          setStoredProducts([]);
        }
      }
    };

    void loadProducts();

    return () => {
      isMounted = false;
    };
  }, [storagePrefix, user?.id]);

  useEffect(() => {
    if (!selectedProduct) return;
    const match = storedProducts.find(product => product.id === selectedProduct.id);
    if (!match) {
      setSelectedProduct(null);
    } else if (match !== selectedProduct) {
      setSelectedProduct(match);
    }
  }, [selectedProduct, storedProducts]);

  const groupedSessions = useMemo(() => {
    const groups = new Map<string, typeof sessions>();
    sessions.forEach(session => {
      const key = session.updatedAt.slice(0, 10);
      const list = groups.get(key);
      if (list) {
        list.push(session);
      } else {
        groups.set(key, [session]);
      }
    });

    return Array.from(groups.entries())
      .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
      .map<GroupedSessions>(([key, items]) => ({
        key,
        label: formatDateHeading(key),
        sessions: items,
      }));
  }, [sessions]);

  const handleReferenceClick = () => {
    fileInputRef.current?.click();
  };

  const handleReferenceSelected: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;

    const nextFiles = files.slice(0, Math.max(0, REFERENCE_LIMIT - referencePreviews.length));
    if (!nextFiles.length) {
      event.target.value = "";
      return;
    }

    try {
      const previews = await Promise.all(nextFiles.map(readFileAsDataUrl));
      setReferencePreviews(prev => [...prev, ...previews].slice(0, REFERENCE_LIMIT));
    } catch (error) {
      console.warn("Failed to load reference", error);
    } finally {
      event.target.value = "";
    }
  };

  const removeReference = (index: number) => {
    setReferencePreviews(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleAvatarSelect = useCallback((avatar: StoredAvatar) => {
    setSelectedAvatar(avatar);
    setIsAvatarPickerOpen(false);
  }, []);

  const clearSelectedAvatar = useCallback(() => {
    setSelectedAvatar(null);
  }, []);

  const handleAvatarDelete = useCallback(
    async (avatar: StoredAvatar) => {
      if (!window.confirm(`Remove ${avatar.name}?`)) return;

      const updated = storedAvatars.filter(item => item.id !== avatar.id);
      setStoredAvatars(updated);
      if (selectedAvatar?.id === avatar.id) {
        setSelectedAvatar(null);
      }

      if (storagePrefix) {
        try {
          await setPersistedValue(storagePrefix, "avatars", updated);
        } catch {
          // ignore persistence errors in chat mode
        }
      }
    },
    [selectedAvatar, storedAvatars, storagePrefix],
  );

  const handleProductSelect = useCallback((product: StoredAvatar) => {
    setSelectedProduct(product);
    setIsProductPickerOpen(false);
  }, []);

  const clearSelectedProduct = useCallback(() => {
    setSelectedProduct(null);
  }, []);

  const handleProductDelete = useCallback(
    async (product: StoredAvatar) => {
      if (!window.confirm(`Remove ${product.name}?`)) return;

      const updated = storedProducts.filter(item => item.id !== product.id);
      setStoredProducts(updated);
      if (selectedProduct?.id === product.id) {
        setSelectedProduct(null);
      }

      if (storagePrefix) {
        try {
          await setPersistedValue(storagePrefix, "products", updated);
        } catch {
          // ignore persistence errors in chat mode
        }
      }
    },
    [selectedProduct, storedProducts, storagePrefix],
  );

  const validateAvatarFile = useCallback((file: File): string | null => {
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return "Please choose a JPEG, PNG, or WebP image file.";
    }

    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return "File size must be less than 50MB.";
    }

    if (file.size === 0) {
      return "The selected file is empty.";
    }

    return null;
  }, []);

  const getImageDimensions = useCallback((file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => {
        reject(new Error("Failed to load image"));
      };
      img.src = URL.createObjectURL(file);
    });
  }, []);

  const processAvatarImageFile = useCallback(
    async (file: File) => {
      const validationError = validateAvatarFile(file);
      if (validationError) {
        setAvatarUploadError(validationError);
        return;
      }

      try {
        const { width, height } = await getImageDimensions(file);
        const maxDimension = 8192;
        const minDimension = 64;

        if (width > maxDimension || height > maxDimension) {
          setAvatarUploadError(`Image dimensions (${width}x${height}) are too large. Maximum allowed: ${maxDimension}x${maxDimension}.`);
          return;
        }

        if (width < minDimension || height < minDimension) {
          setAvatarUploadError(`Image dimensions (${width}x${height}) are too small. Minimum required: ${minDimension}x${minDimension}.`);
          return;
        }
      } catch {
        setAvatarUploadError("We couldn’t read that image. Re-upload or use a different format.");
        return;
      }

      setAvatarUploadError(null);

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result === "string") {
          setAvatarSelection({ imageUrl: result, source: "upload" });
        }
      };
      reader.onerror = () => {
        setAvatarUploadError("We couldn’t read that image. Re-upload or use a different format.");
      };
      reader.readAsDataURL(file);
    },
    [getImageDimensions, validateAvatarFile],
  );

  const handleSaveNewAvatar = useCallback(async () => {
    if (!avatarSelection || !avatarName.trim() || !storagePrefix) return;

    const record = createAvatarRecord({
      name: avatarName.trim(),
      imageUrl: avatarSelection.imageUrl,
      source: avatarSelection.source,
      sourceId: avatarSelection.sourceId,
      ownerId: user?.id ?? undefined,
      existingAvatars: storedAvatars,
    });

    const updated = [record, ...storedAvatars];
    setStoredAvatars(updated);
    setSelectedAvatar(record);

    try {
      await setPersistedValue(storagePrefix, "avatars", updated);
    } catch {
      // ignore persistence errors
    }

    setIsAvatarCreationModalOpen(false);
    setAvatarName("");
    setAvatarSelection(null);
    setAvatarUploadError(null);
    setIsDraggingAvatar(false);
  }, [avatarName, avatarSelection, storagePrefix, storedAvatars, user?.id]);

  const resetAvatarCreationPanel = useCallback(() => {
    setIsAvatarCreationModalOpen(false);
    setAvatarName("");
    setAvatarSelection(null);
    setAvatarUploadError(null);
    setIsDraggingAvatar(false);
  }, []);

  const handleProductUpload: React.ChangeEventHandler<HTMLInputElement> = async event => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async loadEvent => {
      const imageUrl = loadEvent.target?.result as string;
      const createdAt = new Date().toISOString();
      const imageId = `avatar-img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const record: StoredAvatar = {
        id: `product-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        slug: `product-${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, ""),
        imageUrl,
        createdAt,
        source: "upload",
        published: false,
        ownerId: user?.id,
        primaryImageId: imageId,
        images: [
          {
            id: imageId,
            url: imageUrl,
            createdAt,
            source: "upload",
          },
        ],
      };

      const updated = [record, ...storedProducts];
      setStoredProducts(updated);
      setSelectedProduct(record);

      if (storagePrefix) {
        try {
          await setPersistedValue(storagePrefix, "products", updated);
        } catch {
          // ignore persistence errors
        }
      }
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const handleSaveRecentPrompt = useCallback(
    (text: string) => {
      savePrompt(text);
    },
    [savePrompt],
  );

  const focusTextarea = () => {
    textareaRef.current?.focus();
  };

  const openCreateModal = () => {
    setChatNameDraft("");
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = useCallback(() => {
    setIsCreateModalOpen(false);
    setChatNameDraft("");
  }, []);

  const confirmCreateChat = useCallback(() => {
    const session = createSession();
    const trimmed = chatNameDraft.trim();
    if (trimmed) {
      const now = new Date().toISOString();
      updateSession(session.id, current => ({
        ...current,
        title: deriveTitle(trimmed),
        updatedAt: now,
      }));
    }
    selectSession(session.id);
    setInput("");
    setReferencePreviews([]);
    closeCreateModal();
    textareaRef.current?.focus();
  }, [chatNameDraft, closeCreateModal, createSession, selectSession, updateSession]);

  const openRenameModal = (session: ChatSession) => {
    setChatToRename(session);
    setRenameDraft(session.title === "New chat" ? "" : session.title);
  };

  const closeRenameModal = useCallback(() => {
    setChatToRename(null);
    setRenameDraft("");
  }, []);

  const confirmRenameChat = useCallback(() => {
    if (!chatToRename) return;
    const trimmed = renameDraft.trim();
    const nextTitle = trimmed ? deriveTitle(trimmed) : "New chat";
    const now = new Date().toISOString();
    updateSession(chatToRename.id, current => ({
      ...current,
      title: nextTitle,
      updatedAt: now,
    }));
    closeRenameModal();
  }, [chatToRename, closeRenameModal, renameDraft, updateSession]);

  const openDeleteModal = (session: ChatSession) => {
    setChatToDelete(session);
  };

  const closeDeleteModal = useCallback(() => {
    setChatToDelete(null);
  }, []);

  const confirmDeleteChat = useCallback(() => {
    if (!chatToDelete) return;
    deleteSession(chatToDelete.id);
    if (activeSessionId === chatToDelete.id) {
      setInput("");
      setReferencePreviews([]);
    }
    closeDeleteModal();
  }, [activeSessionId, chatToDelete, closeDeleteModal, deleteSession]);

  useEffect(() => {
    const hasModalOpen = isCreateModalOpen || chatToRename !== null || chatToDelete !== null;
    if (!hasModalOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (chatToRename) {
          closeRenameModal();
        } else if (chatToDelete) {
          closeDeleteModal();
        } else if (isCreateModalOpen) {
          closeCreateModal();
        }
      } else if (event.key === "Enter") {
        if (chatToRename) {
          confirmRenameChat();
        } else if (chatToDelete) {
          confirmDeleteChat();
        } else if (isCreateModalOpen) {
          confirmCreateChat();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [chatToRename, chatToDelete, isCreateModalOpen, closeCreateModal, closeDeleteModal, closeRenameModal, confirmCreateChat, confirmDeleteChat, confirmRenameChat]);

  const appendMessage = (sessionId: string, message: ChatMessage, titleFallback?: string) => {
    updateSession(sessionId, session => {
      const nextTitle =
        session.messages.length === 0 || session.title === "New chat"
          ? deriveTitle(titleFallback ?? message.content)
          : session.title;

      return {
        ...session,
        title: nextTitle,
        updatedAt: message.createdAt,
        messages: [...session.messages, message],
      };
    });
  };

  const handleSend = () => {
    if (!activeSession || !input.trim()) return;
    const sessionId = activeSession.id;
    const content = input.trim();
    const createdAt = new Date().toISOString();

    const userMessage: ChatMessage = {
      id: createId(),
      role: "user",
      kind: "text",
      content,
      createdAt,
    };

    appendMessage(sessionId, userMessage);
    addPrompt(content);
    setInput("");
    setReferencePreviews([]);
    setIsAssistantTyping(true);

    scheduleTimeout(() => {
      const response: ChatMessage = {
        id: createId(),
        role: "assistant",
        kind: "text",
        content: "Here's a thought: try combining your idea with one of your references for added depth.",
        createdAt: new Date().toISOString(),
      };
      appendMessage(sessionId, response);
      setIsAssistantTyping(false);
    }, 650);
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    handleSend();
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={`${layout.page} pt-[calc(var(--nav-h,4rem)+16px)]`}>
      {(isCreateModalOpen || chatToRename || chatToDelete) && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-theme-black/80 py-12"
          role="dialog"
          aria-modal="true"
        >
          {isCreateModalOpen && (
            <div
              className={`${glass.promptDark} rounded-2xl w-full max-w-sm min-w-[28rem] px-6 py-12 transition-colors duration-200`}
            >
              <div className="text-center space-y-4">
                <div className="space-y-3">
                  <MessageCircle className="default-orange-icon mx-auto" />
                  <h3 className="text-xl font-raleway font-light text-theme-text">Start new chat</h3>
                  <p className="text-base font-raleway font-light text-theme-white">
                    Name your conversation to keep things organized.
                  </p>
                  <input
                    type="text"
                    value={chatNameDraft}
                    onChange={event => setChatNameDraft(event.target.value)}
                    placeholder="Chat title"
                    className={`${inputs.compact} text-theme-text`}
                    autoFocus
                  />
                </div>
                <div className="flex justify-center gap-3">
                  <button type="button" onClick={closeCreateModal} className={buttons.ghost}>
                    Cancel
                  </button>
                  <button type="button" onClick={confirmCreateChat} className={buttons.primary}>
                    Create chat
                  </button>
                </div>
              </div>
            </div>
          )}
          {chatToRename && (
            <div
              className={`${glass.promptDark} rounded-2xl w-full max-w-sm min-w-[28rem] px-6 py-12 transition-colors duration-200`}
            >
              <div className="text-center space-y-4">
                <div className="space-y-3">
                  <Pencil className="default-orange-icon mx-auto" />
                  <h3 className="text-xl font-raleway font-light text-theme-text">Rename chat</h3>
                  <p className="text-base font-raleway font-light text-theme-white">
                    Give this chat a new name to make it easier to find later.
                  </p>
                  <input
                    type="text"
                    value={renameDraft}
                    onChange={event => setRenameDraft(event.target.value)}
                    placeholder="Chat title"
                    className={`${inputs.compact} text-theme-text`}
                    autoFocus
                  />
                </div>
                <div className="flex justify-center gap-3">
                  <button type="button" onClick={closeRenameModal} className={buttons.ghost}>
                    Cancel
                  </button>
                  <button type="button" onClick={confirmRenameChat} className={buttons.primary}>
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}
          {chatToDelete && (
            <div
              className={`${glass.promptDark} rounded-2xl w-full max-w-sm min-w-[28rem] px-6 py-12 transition-colors duration-200`}
            >
              <div className="text-center space-y-4">
                <div className="space-y-3">
                  <Trash2 className="default-orange-icon mx-auto" />
                  <h3 className="text-xl font-raleway font-light text-theme-text">Delete chat</h3>
                  <p className="text-base font-raleway font-light text-theme-white">
                    Are you sure you want to delete “{chatToDelete.title || "New chat"}”? This action cannot be undone.
                  </p>
                </div>
                <div className="flex justify-center gap-3">
                  <button type="button" onClick={closeDeleteModal} className={buttons.ghost}>
                    Cancel
                  </button>
                  <button type="button" onClick={confirmDeleteChat} className={buttons.primary}>
                    Delete chat
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      <div className={`${layout.container} pb-6`}>
        <div className="relative z-0 flex h-[calc(100dvh-6rem)] w-full gap-3">
          <aside className="hidden h-full w-56 flex-shrink-0 flex-col rounded-2xl border border-theme-dark bg-theme-black p-4 lg:flex">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-theme-white" />
                <h2 className="text-base font-raleway font-light text-theme-white">History</h2>
              </div>
              <button
                type="button"
                onClick={openCreateModal}
                className="grid size-7 place-items-center rounded-full text-theme-white transition-colors duration-150 hover:text-theme-text"
                aria-label="Start a new chat"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pr-1">
              {groupedSessions.map(group => (
                <div key={group.key} className="mb-6">
                  <div className="mb-2 text-xs font-raleway uppercase tracking-wide text-theme-light">
                    {group.label}
                  </div>
                  <div className="space-y-1">
                    {group.sessions.map(session => {
                      const isActive = session.id === activeSession?.id;
                      return (
                        <button
                          key={session.id}
                          type="button"
                          onClick={() => {
                            selectSession(session.id);
                            setInput("");
                            setReferencePreviews([]);
                          }}
                          className={`group w-full rounded-2xl px-3 py-2 text-left transition-colors duration-150 ${
                            isActive
                              ? "bg-theme-dark border border-theme-mid text-theme-text"
                              : "border border-transparent hover:border-theme-dark hover:bg-theme-black text-theme-light"
                          }`}
                          aria-pressed={isActive}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className={`truncate text-sm font-raleway font-light ${isActive ? "text-theme-text" : "text-theme-white"}`}>
                              {session.title || "New chat"}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={event => {
                                  event.stopPropagation();
                                  openRenameModal(session);
                                }}
                                className={`grid size-6 place-items-center rounded-full opacity-0 transition-opacity duration-150 group-hover:opacity-100 ${
                                  isActive ? "text-theme-text hover:text-theme-white" : "text-theme-light hover:text-theme-text"
                                }`}
                                aria-label="Rename chat"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={event => {
                                  event.stopPropagation();
                                  openDeleteModal(session);
                                }}
                                className={`grid size-6 place-items-center rounded-full opacity-0 transition-opacity duration-150 group-hover:opacity-100 ${
                                  isActive ? "text-theme-text hover:text-theme-white" : "text-theme-light hover:text-theme-text"
                                }`}
                                aria-label="Delete chat"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </aside>
          <section className="flex min-h-full flex-1 flex-col gap-4">
            <div className="flex-1 overflow-hidden rounded-2xl border border-theme-dark bg-theme-black">
              <div className="flex h-full flex-col">
                <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
                  {activeSession?.messages.map(message => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[min(720px,90%)] rounded-3xl px-4 py-3 text-sm font-raleway leading-relaxed ${
                        message.role === "user"
                          ? "bg-theme-dark text-theme-text"
                          : "bg-theme-black text-theme-white"
                      }`}
                    >
                      {message.kind === "image" && message.imageUrl ? (
                        <div className="space-y-2">
                          <div className="text-xs uppercase tracking-wide text-theme-light">Generated image</div>
                          <img
                            src={message.imageUrl}
                            alt={message.content}
                            loading="lazy"
                            className="w-full max-w-md rounded-2xl border border-theme-dark object-cover"
                          />
                          <p className="text-sm text-theme-white">{message.content}</p>
                        </div>
                      ) : (
                        <p>{message.content}</p>
                      )}
                    </div>
                  </div>
                ))}
                {isAssistantTyping && (
                  <div className="flex justify-start">
                    <div className="rounded-3xl border border-theme-dark bg-theme-black px-4 py-2 text-sm font-raleway text-theme-light">
                      Daygen is thinking…
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              <form onSubmit={handleSubmit} className="border-t border-theme-dark px-4 py-4">
                <div className={`rounded-2xl px-4 py-3 ${glass.prompt}`}>
                  <div className="mb-1">
                    <textarea
                      ref={textareaRef}
                      placeholder="Describe what you want to create..."
                      value={input}
                      onChange={event => setInput(event.target.value)}
                      onKeyDown={handleKeyDown}
                      rows={1}
                      className="h-[36px] w-full resize-none overflow-hidden rounded-lg border-0 bg-transparent px-3 py-2 font-raleway text-base text-theme-text placeholder:text-theme-light focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2 px-3">
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => navigate("/create/image")}
                          className={`${glass.promptBorderless} grid h-8 w-8 place-items-center rounded-full text-xs font-raleway text-theme-white transition-colors duration-200 hover:bg-theme-text/20 hover:text-theme-text`}
                          aria-label="Platform mode"
                          onMouseEnter={(e) => {
                            showHoverTooltip(e.currentTarget, 'platform-mode-tooltip');
                          }}
                          onMouseLeave={() => {
                            hideHoverTooltip('platform-mode-tooltip');
                          }}
                        >
                          <LayoutDashboard className="h-3 w-3" />
                        </button>
                        <div
                          data-tooltip-for="platform-mode-tooltip"
                          className="absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full whitespace-nowrap rounded-lg bg-theme-black border border-theme-mid px-2 py-1 text-xs text-theme-white opacity-0 shadow-lg z-[70] pointer-events-none hidden lg:block"
                          style={{ left: '50%', transform: 'translateX(-50%) translateY(-100%)', top: '0px' }}
                        >
                          Platform Mode
                        </div>
                      </div>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={handleReferenceClick}
                          className={`${glass.promptBorderless} grid h-8 w-8 place-items-center rounded-full text-xs font-raleway text-theme-white transition-colors duration-200 hover:bg-theme-text/20 hover:text-theme-text disabled:cursor-not-allowed disabled:opacity-60`}
                          disabled={referencePreviews.length >= REFERENCE_LIMIT}
                          aria-label="Add reference"
                          onMouseEnter={(e) => {
                            showHoverTooltip(e.currentTarget, 'reference-tooltip-chat');
                          }}
                          onMouseLeave={() => {
                            hideHoverTooltip('reference-tooltip-chat');
                          }}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      <div
                        data-tooltip-for="reference-tooltip-chat"
                        className="absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full whitespace-nowrap rounded-lg bg-theme-black border border-theme-mid px-2 py-1 text-xs text-theme-white opacity-0 shadow-lg z-[70] pointer-events-none"
                        style={{ left: '50%', transform: 'translateX(-50%) translateY(-100%)', top: '0px' }}
                      >
                        Reference Image
                      </div>
                      </div>
                      <button
                        ref={avatarButtonRef}
                        type="button"
                        onClick={() => setIsAvatarPickerOpen(prev => !prev)}
                        className={`${glass.promptBorderless} flex h-8 items-center justify-center gap-2 rounded-full px-2 text-xs font-raleway text-theme-white transition-colors duration-200 hover:bg-theme-text/20 hover:text-theme-text lg:px-3`}
                        aria-label="Choose avatar"
                      >
                        <User className="h-3.5 w-3.5" />
                        <span className="hidden whitespace-nowrap text-sm lg:inline">Avatar</span>
                      </button>
                      {selectedAvatar && (
                        <div className="flex items-center gap-2">
                          <div className="hidden text-sm font-raleway text-theme-light lg:block">Avatar:</div>
                          <div className="relative">
                            <img
                              src={selectedAvatar.imageUrl}
                              alt={selectedAvatar.name}
                              loading="lazy"
                              decoding="async"
                              className="h-9 w-9 rounded-lg border border-theme-dark object-cover"
                            />
                            <button
                              type="button"
                              onClick={clearSelectedAvatar}
                              className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-theme-black text-theme-white transition-colors duration-150 hover:bg-theme-dark"
                              aria-label="Remove avatar"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      )}
                      <button
                        ref={productButtonRef}
                        type="button"
                        onClick={() => setIsProductPickerOpen(prev => !prev)}
                        className={`${glass.promptBorderless} flex h-8 items-center justify-center gap-2 rounded-full px-2 text-xs font-raleway text-theme-white transition-colors duration-200 hover:bg-theme-text/20 hover:text-theme-text lg:px-3`}
                        aria-label="Choose product"
                      >
                        <Package className="h-3.5 w-3.5" />
                        <span className="hidden whitespace-nowrap text-sm lg:inline">Product</span>
                      </button>
                      {selectedProduct && (
                        <div className="flex items-center gap-2">
                          <div className="hidden text-sm font-raleway text-theme-light lg:block">Product:</div>
                          <div className="relative">
                            <img
                              src={selectedProduct.imageUrl}
                              alt={selectedProduct.name}
                              loading="lazy"
                              decoding="async"
                              className="h-9 w-9 rounded-lg border border-theme-dark object-cover"
                            />
                            <button
                              type="button"
                              onClick={clearSelectedProduct}
                              className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-theme-black text-theme-white transition-colors duration-150 hover:bg-theme-dark"
                              aria-label="Remove product"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      )}
                      <div className="relative">
                        <button
                          ref={promptsButtonRef}
                          type="button"
                          onClick={() => setIsPromptsDropdownOpen(prev => !prev)}
                          className={`${glass.promptBorderless} grid h-8 w-8 place-items-center rounded-full text-xs font-raleway text-theme-white transition-colors duration-200 hover:bg-theme-text/20 hover:text-theme-text`}
                          aria-label="Saved prompts"
                          onMouseEnter={(e) => {
                            showHoverTooltip(e.currentTarget, 'prompts-tooltip-chat');
                          }}
                          onMouseLeave={() => {
                            hideHoverTooltip('prompts-tooltip-chat');
                          }}
                        >
                          <BookmarkIcon className="h-3.5 w-3.5" />
                        </button>
                        <div
                          data-tooltip-for="prompts-tooltip-chat"
                          className="absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full whitespace-nowrap rounded-lg bg-theme-black border border-theme-mid px-2 py-1 text-xs text-theme-white opacity-0 shadow-lg z-[70] pointer-events-none"
                          style={{ left: '50%', transform: 'translateX(-50%) translateY(-100%)', top: '0px' }}
                        >
                          Your Prompts
                        </div>
                      </div>
                      {referencePreviews.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="hidden text-sm font-raleway text-theme-light lg:block">
                            Reference ({referencePreviews.length}/{REFERENCE_LIMIT}):
                          </span>
                          <div className="flex items-center gap-1.5">
                            {referencePreviews.map((preview, index) => (
                              <div key={`${preview}-${index}`} className="relative">
                                <img
                                  src={preview}
                                  alt={`Reference ${index + 1}`}
                                  loading="lazy"
                                  decoding="async"
                                  className="h-9 w-9 rounded-lg border border-theme-dark object-cover"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeReference(index)}
                                  className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-theme-black text-theme-white transition-colors duration-150 hover:bg-theme-dark"
                                  aria-label="Remove reference"
                                >
                                  <span className="text-xs">×</span>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <AvatarPickerPortal
                        anchorRef={avatarButtonRef}
                        open={isAvatarPickerOpen}
                        onClose={() => setIsAvatarPickerOpen(false)}
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="text-base font-raleway text-theme-text">Your Avatars</div>
                            <button
                              type="button"
                              className="inline-flex size-7 items-center justify-center rounded-full border border-theme-dark bg-theme-black text-theme-white transition-colors duration-200 hover:text-theme-text"
                              onClick={() => {
                                setIsAvatarPickerOpen(false);
                                setIsAvatarCreationModalOpen(true);
                                setAvatarName("");
                              }}
                              aria-label="Create a new Avatar"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          {storedAvatars.length > 0 ? (
                            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                              {storedAvatars.map(avatar => {
                                const isActive = selectedAvatar?.id === avatar.id;
                                return (
                                  <div
                                    key={avatar.id}
                                    className="flex w-full items-center gap-3 rounded-2xl border border-theme-dark px-3 py-2 transition-colors duration-200 group hover:border-theme-dark hover:bg-theme-text/10"
                                  >
                                    <button
                                      type="button"
                                      onClick={() => handleAvatarSelect(avatar)}
                                      className={`flex flex-1 items-center gap-3 ${
                                        isActive ? "text-theme-text" : "text-theme-white"
                                      }`}
                                    >
                                      <img
                                        src={avatar.imageUrl}
                                        alt={avatar.name}
                                        loading="lazy"
                                        className="h-10 w-10 rounded-lg object-cover"
                                      />
                                      <div className="min-w-0 flex-1 text-left">
                                        <p className="truncate text-sm font-raleway text-theme-white">{avatar.name}</p>
                                      </div>
                                      {isActive && <Check className="h-4 w-4 text-theme-text" />}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={event => {
                                        event.stopPropagation();
                                        void handleAvatarDelete(avatar);
                                      }}
                                      className="opacity-0 transition-opacity duration-200 hover:bg-theme-text/10 rounded-full p-1 group-hover:opacity-100"
                                      title="Delete Avatar"
                                      aria-label="Delete Avatar"
                                    >
                                      <Trash2 className="h-3 w-3 text-theme-white hover:text-theme-text" />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="rounded-2xl border border-theme-dark bg-theme-black p-4 text-sm font-raleway text-theme-light">
                              You haven't saved any Avatars yet. Visit the Avatars page to create one.
                            </div>
                          )}
                          {storedAvatars.length === 0 && (
                            <button
                              type="button"
                              className="w-full inline-flex items-center justify-start gap-1 rounded-full px-3 py-1 text-xs font-raleway font-medium transition-colors duration-200 text-theme-white hover:text-theme-text"
                              onClick={() => {
                                navigate("/create/avatars");
                                setIsAvatarPickerOpen(false);
                              }}
                            >
                              <User className="h-4 w-4" />
                              Go to Avatars
                            </button>
                          )}
                        </div>
                      </AvatarPickerPortal>
                      <AvatarPickerPortal
                        anchorRef={productButtonRef}
                        open={isProductPickerOpen}
                        onClose={() => setIsProductPickerOpen(false)}
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="text-base font-raleway text-theme-text">Your Products</div>
                            <label htmlFor="chat-product-upload">
                              <button
                                type="button"
                                className="inline-flex size-7 items-center justify-center rounded-full border border-theme-dark bg-theme-black text-theme-white transition-colors duration-200 hover:text-theme-text"
                                aria-label="Add a new Product"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </label>
                            <input
                              id="chat-product-upload"
                              type="file"
                              accept="image/*"
                              onChange={handleProductUpload}
                              className="hidden"
                            />
                          </div>
                          {storedProducts.length > 0 ? (
                            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                              {storedProducts.map(product => {
                                const isActive = selectedProduct?.id === product.id;
                                return (
                                  <div
                                    key={product.id}
                                    className="flex w-full items-center gap-3 rounded-2xl border border-theme-dark px-3 py-2 transition-colors duration-200 group hover:border-theme-dark hover:bg-theme-text/10"
                                  >
                                    <button
                                      type="button"
                                      onClick={() => handleProductSelect(product)}
                                      className={`flex flex-1 items-center gap-3 ${
                                        isActive ? "text-theme-text" : "text-theme-white"
                                      }`}
                                    >
                                      <img
                                        src={product.imageUrl}
                                        alt={product.name}
                                        loading="lazy"
                                        className="h-10 w-10 rounded-lg object-cover"
                                      />
                                      <div className="min-w-0 flex-1 text-left">
                                        <p className="truncate text-sm font-raleway text-theme-white">{product.name}</p>
                                      </div>
                                      {isActive && <Check className="h-4 w-4 text-theme-text" />}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={event => {
                                        event.stopPropagation();
                                        void handleProductDelete(product);
                                      }}
                                      className="opacity-0 transition-opacity duration-200 hover:bg-theme-text/10 rounded-full p-1 group-hover:opacity-100"
                                      title="Delete Product"
                                      aria-label="Delete Product"
                                    >
                                      <Trash2 className="h-3 w-3 text-theme-white hover:text-theme-text" />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="rounded-2xl border border-theme-dark bg-theme-black p-4 text-sm font-raleway text-theme-light">
                              You haven't added any Products yet. Click the + button above to add one.
                            </div>
                          )}
                        </div>
                      </AvatarPickerPortal>
                        <PromptsDropdown
                          isOpen={isPromptsDropdownOpen}
                          onClose={() => setIsPromptsDropdownOpen(false)}
                          anchorEl={promptsButtonRef.current}
                          recentPrompts={history}
                          savedPrompts={savedPrompts}
                          onSelectPrompt={text => {
                            setInput(text);
                            focusTextarea();
                          }}
                          onRemoveSavedPrompt={removePrompt}
                          onRemoveRecentPrompt={removeRecentPrompt}
                          onUpdateSavedPrompt={updatePrompt}
                          onAddSavedPrompt={savePrompt}
                      onSaveRecentPrompt={handleSaveRecentPrompt}
                    />
                      <button
                        ref={modelSelectorRef}
                        type="button"
                        onClick={() => setIsModelSelectorOpen(prev => !prev)}
                        className={`${glass.promptBorderless} flex h-8 items-center justify-center gap-2 rounded-full px-2 text-xs font-raleway text-theme-white transition-colors duration-200 hover:bg-theme-text/20 hover:text-theme-text lg:px-3`}
                        aria-haspopup="listbox"
                        aria-expanded={isModelSelectorOpen}
                      >
                        {hasToolLogo(currentModel.name) ? (
                          <img
                            src={getToolLogo(currentModel.name)!}
                            alt={`${currentModel.name} logo`}
                            loading="lazy"
                            decoding="async"
                            className="h-4 w-4 flex-shrink-0 rounded object-contain"
                          />
                        ) : (
                          <currentModel.Icon className="h-4 w-4 flex-shrink-0" />
                        )}
                        <span className="hidden xl:inline whitespace-nowrap text-sm text-theme-text">
                          {currentModel.name}
                        </span>
                      </button>
                      <AvatarPickerPortal
                        anchorRef={modelSelectorRef}
                        open={isModelSelectorOpen}
                        onClose={() => setIsModelSelectorOpen(false)}
                      >
                        <div className="space-y-2">
                          {IMAGE_MODEL_OPTIONS.map(model => {
                            const isActive = model.id === selectedModel;
                            return (
                              <button
                                key={model.id}
                                type="button"
                                onClick={() => {
                                  setSelectedModel(model.id);
                                  setIsModelSelectorOpen(false);
                                }}
                                className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left transition-colors duration-150 ${
                                  isActive
                                    ? "border-theme-text bg-theme-text/10 text-theme-text"
                                    : "border-theme-dark text-theme-white hover:border-theme-text/40 hover:bg-theme-text/10"
                                }`}
                              >
                                {hasToolLogo(model.name) ? (
                                  <img
                                    src={getToolLogo(model.name)!}
                                    alt={`${model.name} logo`}
                                    loading="lazy"
                                    decoding="async"
                                    className="h-5 w-5 flex-shrink-0 rounded object-contain"
                                  />
                                ) : (
                                  <model.Icon
                                    className={`h-5 w-5 flex-shrink-0 ${isActive ? "text-theme-text" : "text-theme-white"}`}
                                  />
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className={`truncate text-sm font-raleway ${isActive ? "text-theme-text" : "text-theme-white"}`}>
                                    {model.name}
                                  </div>
                                  <div className="truncate text-xs font-raleway text-theme-light">{model.desc}</div>
                                </div>
                                {isActive && <Check className="h-4 w-4 flex-shrink-0 text-theme-text" />}
                              </button>
                            );
                          })}
                        </div>
                      </AvatarPickerPortal>
                      <button
                        ref={settingsRef}
                        type="button"
                        onClick={() => setIsSettingsOpen(prev => !prev)}
                        className={`${glass.promptBorderless} grid h-8 w-8 place-items-center rounded-full p-0 text-theme-white transition-colors duration-200 hover:bg-theme-text/20 hover:text-theme-text`}
                        aria-label="Settings"
                      >
                        <Settings className="h-4 w-4" />
                      </button>
                      {isSettingsOpen && (
                        <Suspense fallback={null}>
                          <SettingsMenu
                            anchorRef={settingsRef}
                            open={isSettingsOpen}
                            onClose={() => setIsSettingsOpen(false)}
                            common={{
                              batchSize,
                              onBatchSizeChange: value => setBatchSize(value),
                              min: 1,
                              max: 4,
                            }}
                            flux={{
                              enabled: isFluxModel,
                              model: fluxModel,
                              onModelChange: setFluxModel,
                            }}
                            veo={{
                              enabled: false,
                              aspectRatio: "16:9",
                              onAspectRatioChange: () => {},
                              model: "veo-3.0-generate-001",
                              onModelChange: () => {},
                              negativePrompt: "",
                              onNegativePromptChange: () => {},
                              seed: undefined,
                              onSeedChange: () => {},
                            }}
                            hailuo={{
                              enabled: false,
                              duration: 8,
                              onDurationChange: () => {},
                              resolution: "768P",
                              onResolutionChange: () => {},
                              promptOptimizer: false,
                              onPromptOptimizerChange: () => {},
                              fastPretreatment: false,
                              onFastPretreatmentChange: () => {},
                              watermark: false,
                              onWatermarkChange: () => {},
                              firstFrame: null,
                              onFirstFrameChange: () => {},
                              lastFrame: null,
                              onLastFrameChange: () => {},
                            }}
                            wan={{
                              enabled: false,
                              size: "",
                              onSizeChange: () => {},
                              negativePrompt: "",
                              onNegativePromptChange: () => {},
                              promptExtend: false,
                              onPromptExtendChange: () => {},
                              watermark: false,
                              onWatermarkChange: () => {},
                              seed: "",
                              onSeedChange: () => {},
                            }}
                            seedance={{
                              enabled: false,
                              mode: "t2v",
                              onModeChange: () => {},
                              ratio: "16:9",
                              onRatioChange: () => {},
                              duration: 8,
                              onDurationChange: () => {},
                              resolution: "1080p",
                              onResolutionChange: () => {},
                              fps: 24,
                              onFpsChange: () => {},
                              cameraFixed: false,
                              onCameraFixedChange: () => {},
                              seed: "",
                              onSeedChange: () => {},
                              firstFrame: null,
                              onFirstFrameChange: () => {},
                              lastFrame: null,
                              onLastFrameChange: () => {},
                            }}
                            recraft={{
                              enabled: isRecraftModel,
                              model: recraftModel,
                              onModelChange: setRecraftModel,
                            }}
                            runway={{
                              enabled: isRunwayImageModel,
                              model: runwayModel,
                              onModelChange: setRunwayModel,
                            }}
                            gemini={{
                              enabled: isGeminiModel,
                              temperature,
                              onTemperatureChange: setTemperature,
                              outputLength,
                              onOutputLengthChange: setOutputLength,
                              topP,
                              onTopPChange: setTopP,
                              aspectRatio: geminiAspectRatio,
                              onAspectRatioChange: setGeminiAspectRatio,
                            }}
                            qwen={{
                              enabled: isQwenModel,
                              size: qwenSize,
                              onSizeChange: setQwenSize,
                              promptExtend: qwenPromptExtend,
                              onPromptExtendChange: setQwenPromptExtend,
                              watermark: qwenWatermark,
                              onWatermarkChange: setQwenWatermark,
                            }}
                            kling={{
                              enabled: false,
                              model: "kling-v2.1-master",
                              onModelChange: () => {},
                              aspectRatio: "16:9",
                              onAspectRatioChange: () => {},
                              duration: 5,
                              onDurationChange: () => {},
                              mode: "standard",
                              onModeChange: () => {},
                              cfgScale: 5,
                              onCfgScaleChange: () => {},
                              negativePrompt: "",
                              onNegativePromptChange: () => {},
                              cameraType: "none",
                              onCameraTypeChange: () => {},
                              cameraConfig: {
                                horizontal: 0,
                                vertical: 0,
                                pan: 0,
                                tilt: 0,
                                roll: 0,
                                zoom: 0,
                              },
                              onCameraConfigChange: () => {},
                              statusMessage: null,
                            }}
                            lumaPhoton={{
                              enabled: isLumaPhotonImageModel,
                              model: lumaPhotonModel,
                              onModelChange: setLumaPhotonModel,
                            }}
                            lumaRay={{
                              enabled: false,
                              variant: "luma-ray-2",
                              onVariantChange: () => {},
                            }}
                          />
                        </Suspense>
                      )}
                      {aspectRatioConfig && (
                        <div className="relative">
                          <button
                            ref={aspectRatioButtonRef}
                            type="button"
                            onClick={() => setIsAspectRatioMenuOpen(prev => !prev)}
                            className={`${glass.promptBorderless} grid h-8 w-8 place-items-center rounded-full text-xs font-raleway text-theme-white transition-colors duration-200 hover:bg-theme-text/20 hover:text-theme-text`}
                            aria-label="Aspect ratio"
                            onMouseEnter={(event) => {
                              showHoverTooltip(event.currentTarget, 'aspect-ratio-tooltip-chat');
                            }}
                            onMouseLeave={() => {
                              hideHoverTooltip('aspect-ratio-tooltip-chat');
                            }}
                          >
                            <Scan className="h-3.5 w-3.5" />
                          </button>
                          <div
                            data-tooltip-for="aspect-ratio-tooltip-chat"
                            className="absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full whitespace-nowrap rounded-lg bg-theme-black border border-theme-mid px-2 py-1 text-xs text-theme-white opacity-0 shadow-lg z-[70] pointer-events-none"
                            style={{ left: '50%', transform: 'translateX(-50%) translateY(-100%)', top: '0px' }}
                          >
                            Aspect Ratio
                          </div>
                          <AspectRatioDropdown
                            anchorRef={aspectRatioButtonRef}
                            open={isAspectRatioMenuOpen}
                            onClose={() => setIsAspectRatioMenuOpen(false)}
                            options={aspectRatioConfig.options}
                            selectedValue={aspectRatioConfig.selectedValue}
                            onSelect={aspectRatioConfig.onSelect}
                          />
                        </div>
                      )}
                      <div className="relative hidden lg:block">
                        <div
                          role="group"
                          aria-label="Batch size"
                          className={`${glass.promptBorderless} flex h-8 items-center gap-0 rounded-full px-2 text-n-text`}
                          onMouseEnter={(e) => {
                            showHoverTooltip(e.currentTarget, 'batch-size-tooltip-chat');
                          }}
                          onMouseLeave={() => {
                            hideHoverTooltip('batch-size-tooltip-chat');
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => setBatchSize(prev => Math.max(1, prev - 1))}
                            disabled={batchSize === 1}
                            aria-label="Decrease batch size"
                            className="grid size-6 place-items-center rounded-full text-n-text transition-colors duration-200 hover:bg-n-text/20 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="min-w-[1.25rem] text-center text-sm font-raleway text-n-text">{batchSize}</span>
                          <button
                            type="button"
                            onClick={() => setBatchSize(prev => Math.min(4, prev + 1))}
                            disabled={batchSize === 4}
                            aria-label="Increase batch size"
                            className="grid size-6 place-items-center rounded-full text-n-text transition-colors duration-200 hover:bg-n-text/20 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div
                          data-tooltip-for="batch-size-tooltip-chat"
                          className="absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full whitespace-nowrap rounded-lg bg-theme-black border border-theme-mid px-2 py-1 text-xs text-theme-white opacity-0 shadow-lg z-[70] pointer-events-none"
                          style={{ left: '50%', transform: 'translateX(-50%) translateY(-100%)', top: '0px' }}
                        >
                          Batch size
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        className="btn btn-white btn-compact font-raleway text-base font-medium parallax-large disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={!input.trim()}
                      >
                        <Send className="h-4 w-4" />
                        Send
                      </button>
                    </div>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleReferenceSelected}
                  className="hidden"
                />
              </form>
            </div>
          </div>
        </section>
      </div>
    </div>
    <Suspense fallback={null}>
      <AvatarCreationModal
        open={isAvatarCreationModalOpen}
        selection={avatarSelection}
        uploadError={avatarUploadError}
        isDragging={isDraggingAvatar}
        avatarName={avatarName}
        disableSave={!avatarSelection || !avatarName.trim()}
        galleryImages={[]}
        hasGalleryImages={false}
        onClose={resetAvatarCreationPanel}
        onAvatarNameChange={setAvatarName}
        onSave={handleSaveNewAvatar}
        onSelectFromGallery={imageUrl => setAvatarSelection({ imageUrl, source: "gallery", sourceId: imageUrl })}
        onClearSelection={() => {
          setAvatarSelection(null);
          setAvatarUploadError(null);
        }}
        onProcessFile={processAvatarImageFile}
        onDragStateChange={setIsDraggingAvatar}
        onUploadError={setAvatarUploadError}
      />
    </Suspense>
  </div>
  );
};

export default ChatMode;
