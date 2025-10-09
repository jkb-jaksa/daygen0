import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookmarkIcon,
  Image as ImageIcon,
  LayoutDashboard,
  Loader2,
  MessageCircle,
  Package,
  Plus,
  Send,
  Sparkles,
  Users,
} from "lucide-react";

import { useAuth } from "../../auth/useAuth";
import { glass, layout } from "../../styles/designSystem";
import {
  ChatMessage,
  ChatSession,
  useChatSessions,
} from "../../hooks/useChatSessions";

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

const REFERENCE_LIMIT = 3;

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

const formatTimestamp = (iso: string) => {
  const date = new Date(iso);
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "numeric",
  }).format(date);
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
  const { storagePrefix } = useAuth();
  const {
    sessions,
    activeSessionId,
    selectSession,
    createSession,
    updateSession,
  } = useChatSessions(storagePrefix);

  const [input, setInput] = useState("");
  const [isAssistantTyping, setIsAssistantTyping] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [referencePreviews, setReferencePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  const focusTextarea = () => {
    textareaRef.current?.focus();
  };

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

  const handleGenerateImage = () => {
    if (!activeSession) return;
    const sessionId = activeSession.id;
    const createdAt = new Date().toISOString();
    const description = input.trim() || "Image generation";
    const seed = `${description}-${createdAt}`;
    const imageUrl = `https://picsum.photos/seed/${encodeURIComponent(seed)}/512/512`;

    setIsGeneratingImage(true);

    scheduleTimeout(() => {
      const message: ChatMessage = {
        id: createId(),
        role: "assistant",
        kind: "image",
        content: description,
        imageUrl,
        createdAt: new Date().toISOString(),
      };
      appendMessage(sessionId, message, description);
      setIsGeneratingImage(false);
    }, 800);
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
    <div className={`${layout.page} pt-24`}>
      <div className={`${layout.container} pb-6`}>
        <div className="relative z-0 flex h-[calc(100dvh-6rem)] w-full gap-6">
          <aside className={`${glass.prompt} hidden h-full w-72 flex-shrink-0 flex-col rounded-[24px] border border-theme-mid/40 bg-theme-black/40 p-4 lg:flex`}>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-theme-text" />
                <h2 className="text-base font-raleway font-medium text-theme-white">Chat history</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  const session = createSession();
                  selectSession(session.id);
                  setInput("");
                  setReferencePreviews([]);
                }}
                className={`${glass.prompt} grid size-7 place-items-center rounded-full text-theme-white transition-colors duration-150 hover:border-theme-text hover:text-theme-text`}
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
                      const lastMessage = session.messages[session.messages.length - 1];
                      return (
                        <button
                          key={session.id}
                          type="button"
                          onClick={() => {
                            selectSession(session.id);
                            setInput("");
                            setReferencePreviews([]);
                          }}
                          className={`w-full rounded-2xl px-3 py-2 text-left transition-colors duration-150 ${
                            isActive
                              ? "bg-theme-text/15 border border-theme-text/40 text-theme-white"
                              : "border border-transparent hover:border-theme-mid/40 hover:bg-theme-black/50 text-theme-light"
                          }`}
                          aria-pressed={isActive}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-raleway text-theme-white">
                              {session.title || "New chat"}
                            </span>
                            <span className="text-xs font-raleway text-theme-light">
                              {formatTimestamp(session.updatedAt)}
                            </span>
                          </div>
                          {lastMessage && (
                            <div className="mt-1 truncate text-xs font-raleway text-theme-light/80">
                              {lastMessage.kind === "image" ? "Image response" : lastMessage.content}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </aside>
          <section className="flex min-h-full flex-1 flex-col gap-4">
            <header className="flex items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-raleway font-light text-theme-white">
                  {activeSession?.title ?? "New chat"}
                </h1>
              </div>
              <button
                type="button"
                onClick={() => navigate("/create/image")}
                className={`${glass.prompt} inline-flex items-center gap-2 rounded-full border border-theme-mid/40 px-4 py-2 text-sm font-raleway text-theme-white transition-colors duration-150 hover:border-theme-text hover:text-theme-text`}
              >
                <LayoutDashboard className="h-4 w-4" />
                Platform mode
              </button>
            </header>
            <div className={`${glass.prompt} flex-1 overflow-hidden rounded-[24px] border border-theme-mid/40 bg-theme-black/40`}>
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
                          ? "bg-theme-text text-theme-black"
                          : "border border-theme-mid/40 bg-theme-black/70 text-theme-white"
                      }`}
                    >
                      {message.kind === "image" && message.imageUrl ? (
                        <div className="space-y-2">
                          <div className="text-xs uppercase tracking-wide text-theme-light">Generated image</div>
                          <img
                            src={message.imageUrl}
                            alt={message.content}
                            loading="lazy"
                            className="w-full max-w-md rounded-2xl border border-theme-mid/40 object-cover"
                          />
                          <p className="text-sm text-theme-white/80">{message.content}</p>
                        </div>
                      ) : (
                        <p>{message.content}</p>
                      )}
                    </div>
                  </div>
                ))}
                {isAssistantTyping && (
                  <div className="flex justify-start">
                    <div className="rounded-3xl border border-theme-mid/40 bg-theme-black/60 px-4 py-2 text-sm font-raleway text-theme-light">
                      Daygen is thinking…
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              <form onSubmit={handleSubmit} className="border-t border-theme-mid/30 px-4 py-4">
                <div
                  className={`rounded-[20px] px-4 py-3 ${glass.prompt}`}
                >
                  <div className="mb-2">
                    <textarea
                      ref={textareaRef}
                      placeholder="Ask anything or brainstorm ideas…"
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      onKeyDown={handleKeyDown}
                      rows={1}
                      className="w-full resize-none overflow-hidden bg-transparent text-base font-raleway text-theme-white placeholder:text-theme-light focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => navigate("/create/image")}
                        className={`${glass.prompt} inline-flex items-center gap-2 rounded-full border border-theme-mid/40 px-3 py-1.5 text-xs font-raleway text-theme-white transition-colors duration-150 hover:border-theme-text hover:text-theme-text`}
                      >
                        <LayoutDashboard className="h-3.5 w-3.5" />
                        Platform mode
                      </button>
                      <button
                        type="button"
                        onClick={handleReferenceClick}
                        className={`${glass.prompt} inline-flex items-center gap-2 rounded-full border border-theme-mid/40 px-3 py-1.5 text-xs font-raleway text-theme-white transition-colors duration-150 hover:border-theme-text hover:text-theme-text disabled:opacity-40`}
                        disabled={referencePreviews.length >= REFERENCE_LIMIT}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Reference
                      </button>
                      <button
                        type="button"
                        onClick={focusTextarea}
                        className={`${glass.prompt} inline-flex items-center gap-2 rounded-full border border-theme-mid/40 px-3 py-1.5 text-xs font-raleway text-theme-white/70 transition-colors duration-150 hover:border-theme-text hover:text-theme-text`}
                      >
                        <Users className="h-3.5 w-3.5" />
                        Avatars
                      </button>
                      <button
                        type="button"
                        onClick={focusTextarea}
                        className={`${glass.prompt} inline-flex items-center gap-2 rounded-full border border-theme-mid/40 px-3 py-1.5 text-xs font-raleway text-theme-white/70 transition-colors duration-150 hover:border-theme-text hover:text-theme-text`}
                      >
                        <Package className="h-3.5 w-3.5" />
                        Products
                      </button>
                      <button
                        type="button"
                        onClick={focusTextarea}
                        className={`${glass.prompt} inline-flex items-center gap-2 rounded-full border border-theme-mid/40 px-3 py-1.5 text-xs font-raleway text-theme-white/70 transition-colors duration-150 hover:border-theme-text hover:text-theme-text`}
                      >
                        <BookmarkIcon className="h-3.5 w-3.5" />
                        Saved prompts
                      </button>
                      {referencePreviews.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-raleway text-theme-light">
                            {referencePreviews.length}/{REFERENCE_LIMIT}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {referencePreviews.map((preview, index) => (
                              <div key={`${preview}-${index}`} className="relative">
                                <img
                                  src={preview}
                                  alt={`Reference ${index + 1}`}
                                  className="size-9 rounded-lg border border-theme-mid/40 object-cover"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeReference(index)}
                                  className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-theme-black/80 text-theme-white transition-colors duration-150 hover:bg-theme-black"
                                  aria-label="Remove reference"
                                >
                                  <span className="text-xs">×</span>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleGenerateImage}
                        className={`${glass.prompt} inline-flex items-center gap-2 rounded-full border border-theme-mid/40 px-4 py-2 text-sm font-raleway text-theme-white transition-colors duration-150 hover:border-theme-text hover:text-theme-text disabled:cursor-not-allowed disabled:opacity-60`}
                        disabled={isGeneratingImage}
                      >
                        {isGeneratingImage ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ImageIcon className="h-4 w-4" />
                        )}
                        Generate image
                      </button>
                      <button
                        type="submit"
                        className="inline-flex items-center gap-2 rounded-full bg-theme-text px-5 py-2 text-sm font-raleway font-medium text-theme-black transition-colors duration-150 hover:bg-theme-white disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={!input.trim()}
                      >
                        <Sparkles className="h-4 w-4" />
                        Send
                        <Send className="h-3.5 w-3.5" />
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
  </div>
  );
};

export default ChatMode;
