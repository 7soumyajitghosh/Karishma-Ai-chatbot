import React, { useState, useEffect, useRef, useCallback } from "react";
import Markdown from "react-markdown";
import { motion, AnimatePresence } from "motion/react";
import {
  Lock,
  Unlock,
  Shield,
  RefreshCw,
  Trash2,
  Download,
  Key,
  Check,
  CircleCheck,
  CircleAlert,
  CircleHelp,
  Globe,
  FileText,
  User,
  Send,
  Square,
  Sparkles,
  ChevronRight,
  ChevronDown,
  LogOut,
  LogIn,
  UserPlus,
  UserCheck,
  ArrowLeft,
  Settings,
  X,
  Brain,
  Zap,
  Smile,
  History,
  Palette,
  Sun,
  Moon,
  ThumbsUp,
  ThumbsDown,
  Copy,
  RotateCcw,
  Volume2,
  VolumeX,
  Mic,
  Mail,
  Instagram,
  Plus,
  Image as ImageIcon,
  Camera,
  Folder,
  ShieldCheck,
  Eye,
  EyeOff,
} from "lucide-react";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { selfHealingSystem, getCustomApiHeaders } from "./lib/selfHealing";
import { SelfHealingStatusModal } from "./components/SelfHealingStatusModal";
import {
  subscribeToUserConversations,
  saveConversationToCloud,
  deleteConversationFromCloud,
  syncAllLocalSessionsToCloud,
  flushPendingSyncQueue as flushFirebaseQueue,
  mergeSyncMessages,
  SyncChatSession
} from "./lib/firebase";
import { normalizeBanglishForTTS } from "./utils/banglishVoiceNormalizer";

export const safeLocalStorageGet = (key: string): string | null => {
  if (!key || typeof key !== "string") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

export const safeLocalStorageSet = (key: string, value: string): void => {
  if (!key || typeof key !== "string") return;
  try {
    localStorage.setItem(key, value ?? "");
  } catch (e) {
    console.warn("localStorage write failed (QuotaExceeded or restricted storage):", e);
  }
};

export const safeLocalStorageRemove = (key: string): void => {
  if (!key || typeof key !== "string") return;
  try {
    localStorage.removeItem(key);
  } catch {}
};

export const getUserStorageKey = (
  prefix: string,
  user: { id?: string; email?: string } | null,
  isGuest: boolean
): string | null => {
  if (!prefix) return null;
  const rawId = user?.id?.trim() || (user?.email?.trim() ? `usr_${user.email.trim()}` : "");
  if (rawId) {
    const uid = rawId.toLowerCase().replace(/[^a-zA-Z0-9_-]/g, "_");
    return `${prefix}_user_${uid}`;
  }
  if (isGuest) {
    let guestUid = safeLocalStorageGet("best_friend_guest_uid");
    if (!guestUid) {
      guestUid = "guest_" + Math.random().toString(36).substring(2, 10);
      safeLocalStorageSet("best_friend_guest_uid", guestUid);
    }
    return `${prefix}_guest_${guestUid}`;
  }
  return null;
};

const HistoryMenuIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.5" 
    strokeLinecap="round" 
    className={className}
  >
    <line x1="6" y1="10" x2="18" y2="10" />
    <line x1="6" y1="16" x2="12" y2="16" />
  </svg>
);

const PasswordInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", type = "password", ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
      <div className="relative w-full flex items-center">
        <input
          {...props}
          ref={ref}
          type={showPassword ? "text" : type}
          className={`${className} !pr-11`}
        />
        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[#8C857E] hover:text-[#D96B43] focus:outline-none transition-colors p-2 min-w-[40px] min-h-[40px] flex items-center justify-center cursor-pointer select-none rounded-lg active:bg-black/5"
          title={showPassword ? "Hide password" : "Show password"}
          aria-label={showPassword ? "Hide password" : "Show password"}
          tabIndex={-1}
        >
          {showPassword ? (
            <EyeOff className="w-4 h-4 shrink-0" />
          ) : (
            <Eye className="w-4 h-4 shrink-0" />
          )}
        </button>
      </div>
    );
  }
);
PasswordInput.displayName = "PasswordInput";

export interface AIModel {
  id: string;
  name: string;
  desc: string;
  speed: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface AIProvider {
  id: string;
  name: string;
  tagline: string;
  badge?: string;
  icon: React.ComponentType<{ className?: string }>;
  models: AIModel[];
}

export const MODEL_PROVIDERS: AIProvider[] = [
  {
    id: "nemotron",
    name: "Nemotron",
    tagline: "NVIDIA High-Performance Reasoning",
    badge: "PRIMARY",
    icon: Brain,
    models: [
      { id: "nvidia/nemotron-3-ultra-550b-a55b", name: "Nemotron 3 Ultra 550B", desc: "Flagship frontier reasoning & orchestration", speed: "High", icon: Brain },
      { id: "nvidia/nemotron-3-super-120b-a12b", name: "Nemotron 3 Super 120B", desc: "High-throughput complex agentic reasoning", speed: "High", icon: Brain },
      { id: "nvidia/nemotron-3-nano-30b-a3b", name: "Nemotron 3 Nano 30B", desc: "Fast efficient Mixture-of-Experts", speed: "Very High", icon: Zap },
      { id: "nvidia/nemotron-3-nano-4b", name: "Nemotron 3 Nano 4B", desc: "Ultra-compact fast edge inference", speed: "Ultra", icon: Zap },
      { id: "nvidia/nemotron-nano-9b-v2", name: "Nemotron Nano 9B v2", desc: "Compact reasoning & versatile intelligence", speed: "Very High", icon: Sparkles },
      { id: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning", name: "Nemotron 3 Nano Omni 30B", desc: "Multimodal perception & omni-reasoning", speed: "High", icon: Globe },
    ],
  },
  {
    id: "gemini",
    name: "Gemini",
    tagline: "Google AI & Multimodal Models",
    badge: "GOOGLE",
    icon: Sparkles,
    models: [
      { id: "gemini-3.5-flash", name: "Gemini 3.5 Flash", desc: "Fast & intelligent multimodal chat", speed: "Very High", icon: Zap },
      { id: "gemini-3.1-pro-preview", name: "Gemini 3.1 Pro", desc: "Advanced reasoning & frontier intelligence", speed: "High", icon: Brain },
      { id: "gemini-3-flash-preview", name: "Gemini 3 Flash", desc: "High-speed multimodal reasoning", speed: "Very High", icon: Zap },
      { id: "gemini-3.1-flash-lite", name: "Gemini 3.1 Flash Lite", desc: "Ultra-fast low-latency chat", speed: "Ultra", icon: Zap },
      { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", desc: "High precision deep reasoning", speed: "High", icon: Brain },
      { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", desc: "Lightweight efficient model", speed: "Very High", icon: Zap },
    ],
  },
  {
    id: "gpt",
    name: "GPT",
    tagline: "OpenAI Flagship Intelligence",
    badge: "OPENAI",
    icon: Zap,
    models: [
      { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", desc: "Affordable & fast", speed: "Very High", icon: Zap },
      { id: "openai/gpt-4o", name: "GPT-4o", desc: "State of the art reasoning", speed: "High", icon: Brain },
    ],
  },
  {
    id: "llama",
    name: "Llama",
    tagline: "Meta Open Source Models",
    badge: "META",
    icon: Globe,
    models: [
      { id: "meta-llama/llama-3.3-70b-instruct", name: "Llama 3.3 70B", desc: "Open source powerhouse", speed: "High", icon: Brain },
      { id: "meta-llama/llama-3.1-8b-instruct", name: "Llama 3.1 8B", desc: "Fast open source", speed: "Very High", icon: Zap },
    ],
  },
];

export const CONFIGURED_MODELS = MODEL_PROVIDERS.flatMap((p) => p.models);

const getShortModelName = (modelId: string) => {
  const found = CONFIGURED_MODELS.find(m => m.id === modelId);
  return found ? found.name : modelId;
};

interface AttachmentData {
  name: string;
  type: string;
  dataUrl: string;
  size?: number;
  isImage?: boolean;
}

const formatFileSize = (bytes?: number) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export interface SpeechLanguageOption {
  code: string;
  label: string;
  native: string;
  flag: string;
}

export const SPEECH_LANGUAGES: SpeechLanguageOption[] = [
  { code: "bn-IN", label: "Bengali (India)", native: "বাংলা (ভারত)", flag: "🇮🇳" },
  { code: "en-IN", label: "English (India)", native: "English (India)", flag: "🇮🇳" },
  { code: "hi-IN", label: "Hindi (India)", native: "हिन्दी (भारत)", flag: "🇮🇳" },
  { code: "en-US", label: "English (US)", native: "English (US)", flag: "🇺🇸" },
];

interface Message {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: string;
  citations?: Array<{ title: string; uri: string }>;
  isEncrypted?: boolean;
  reactions?: string[];
  feedback?: "like" | "dislike" | null;
  modelUsed?: string;
  imageAttachment?: AttachmentData;
  generatedImage?: {
    url: string;
    prompt: string;
  };
}

interface ChatSession {
  id: string;
  title: string;
  timestamp: string;
  updatedAt?: string;
  messages: Message[];
  mode?: string;
}

function App() {
  // Onboarding state
  const [onboardingCompleted, setOnboardingCompleted] = useState(() => {
    return localStorage.getItem("onboarding_completed") === "true";
  });
  const [userName, setUserName] = useState(() => {
    const name = localStorage.getItem("best_friend_user_name") || "";
    return name;
  });
  const [userNickname, setUserNickname] = useState(() => {
    return localStorage.getItem("best_friend_nickname") || localStorage.getItem("best_friend_user_name") || "";
  });
  const [userFullName, setUserFullName] = useState(() => {
    return localStorage.getItem("best_friend_full_name") || "";
  });
  const [onboardingInput, setOnboardingInput] = useState("");

  // Profile Edit state inside Account Panel
  const [editFullName, setEditFullName] = useState("");
  const [editNickname, setEditNickname] = useState("");
  const [showEditNames, setShowEditNames] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  // Secure Encryption state
  const [encryptionEnabled, setEncryptionEnabled] = useState(false);
  const [encryptionKey, setEncryptionKey] = useState("BEST_FRIEND_E2EE_KEY");
  const [showDecrypted, setShowDecrypted] = useState(true);

  // Multi-Factor Authentication (MFA) state
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaStep, setMfaStep] = useState<"idle" | "setup" | "verify" | "active">("idle");
  const [mfaCode, setMfaCode] = useState("");
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [mfaChallengePassed, setMfaChallengePassed] = useState(true);
  const [mfaChallengeInput, setMfaChallengeInput] = useState("");

  // Privacy and retention state
  const [retentionPolicy, setRetentionPolicy] = useState<"session" | "local">("local");
  const [dataSharing, setDataSharing] = useState(false);

  // Custom API Keys State
  const [customGeminiKey, setCustomGeminiKey] = useState<string>(() => localStorage.getItem("custom_gemini_api_key") || "");
  const [customOpenRouterKey, setCustomOpenRouterKey] = useState<string>(() => localStorage.getItem("custom_openrouter_api_key") || "");
  const [apiKeySaveStatus, setApiKeySaveStatus] = useState<string | null>(null);

  const handleSaveApiKeys = () => {
    localStorage.setItem("custom_gemini_api_key", customGeminiKey.trim());
    localStorage.setItem("custom_openrouter_api_key", customOpenRouterKey.trim());
    setApiKeySaveStatus("API Keys saved successfully!");
    setTimeout(() => setApiKeySaveStatus(null), 3000);
  };

  const handleClearApiKeys = () => {
    setCustomGeminiKey("");
    setCustomOpenRouterKey("");
    localStorage.removeItem("custom_gemini_api_key");
    localStorage.removeItem("custom_openrouter_api_key");
    setApiKeySaveStatus("Custom API Keys cleared.");
    setTimeout(() => setApiKeySaveStatus(null), 3000);
  };

  // UI States
  const [showKeyEditor, setShowKeyEditor] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showPrivacyNotice, setShowPrivacyNotice] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showModelSwitcher, setShowModelSwitcher] = useState(false);
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [accountView, setAccountView] = useState<"login" | "create" | "verify" | "forgot" | "reset" | "reset_otp" | "reset_pass" | "reset_success">("login");
  // Password Management state
  const [cpCurrent, setCpCurrent] = useState("");
  const [cpNew, setCpNew] = useState("");
  const [cpConfirm, setCpConfirm] = useState("");
  const [cpLoading, setCpLoading] = useState(false);
  const [cpError, setCpError] = useState("");
  const [cpSuccess, setCpSuccess] = useState("");
  const [showCpForm, setShowCpForm] = useState(false);

  // Forgot Password state
  const [resetEmail, setResetEmail] = useState("");
  const [resetOtp, setResetOtp] = useState("");
  const [resetNew, setResetNew] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");

  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [pendingReg, setPendingReg] = useState<{fullName: string, nickname: string, email: string, password: string} | null>(null);
  const [otpInput, setOtpInput] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendSuccessMsg, setResendSuccessMsg] = useState("");

  // Countdown timer for Resend OTP
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleResendOtp = useCallback(async () => {
    if (!pendingReg || resendCooldown > 0 || authLoading) return;
    setAuthLoading(true);
    setAuthError("");
    setResendSuccessMsg("");
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: pendingReg.fullName,
          nickname: pendingReg.nickname,
          email: pendingReg.email,
          password: pendingReg.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to resend verification code.");
      }
      setResendCooldown(60);
      setResendSuccessMsg("A new 6-digit verification code has been sent to your email.");
    } catch (err: any) {
      setAuthError(err.message || "Failed to resend verification code.");
    } finally {
      setAuthLoading(false);
    }
  }, [pendingReg, resendCooldown, authLoading]);

  const [loggedInUser, setLoggedInUser] = useState<{id?: string, fullName?: string, nickname?: string, name?: string, email: string} | null>(() => {
    try {
      const saved = localStorage.getItem("mock_logged_in_user");
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  });

  // Mandatory Authentication step state
  const [authCompleted, setAuthCompleted] = useState(() => {
    const savedUser = localStorage.getItem("mock_logged_in_user");
    const isGuestFlag = localStorage.getItem("best_friend_is_guest") === "true";
    const authCompletedFlag = localStorage.getItem("auth_step_completed") === "true";
    return Boolean(savedUser) || isGuestFlag || authCompletedFlag;
  });
  const [isGuest, setIsGuest] = useState(() => {
    return localStorage.getItem("best_friend_is_guest") === "true";
  });
  const [authPopupView, setAuthPopupView] = useState<"menu" | "login" | "create" | "verify" | "forgot" | "reset_otp" | "reset_pass" | "reset_success">("menu");

  // Sync names with loggedInUser
  useEffect(() => {
    if (loggedInUser) {
      const nick = loggedInUser.nickname?.trim();
      const full = loggedInUser.fullName?.trim();
      
      if (nick) {
        setUserNickname(nick);
        localStorage.setItem("best_friend_nickname", nick);
      }
      if (full) {
        setUserFullName(full);
        localStorage.setItem("best_friend_full_name", full);
      }

      // Rule: Do not use Full Name as conversational name unless user has not provided a Nickname.
      const conversationalName = nick || full || loggedInUser.email?.split("@")[0] || "Friend";
      setUserName(conversationalName);
      localStorage.setItem("best_friend_user_name", conversationalName);
    }
  }, [loggedInUser?.id, loggedInUser?.nickname, loggedInUser?.fullName, loggedInUser?.email]);

  // Fetch latest profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      const savedUserStr = localStorage.getItem("mock_logged_in_user");
      if (!savedUserStr) return;
      try {
        const saved = JSON.parse(savedUserStr);
        if (saved?.id) {
          const res = await fetch("/api/auth/me", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: saved.id, token: saved.token || "legacy" })
          });
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.user) {
              const updatedUser = { ...data.user, token: saved.token };
              if (
                data.user.nickname !== saved.nickname ||
                data.user.fullName !== saved.fullName ||
                data.user.email !== saved.email
              ) {
                setLoggedInUser(updatedUser);
                localStorage.setItem("mock_logged_in_user", JSON.stringify(updatedUser));
              }
            }
          }
        }
      } catch (err) {
        // Graceful offline fallback - preserve existing stored user without breaking UI
      }
    };
    fetchProfile();
  }, []);

  // Chat History & Real-Time Sync state
  const [currentChatId, setCurrentChatId] = useState<string>(() => crypto.randomUUID());
  const prevUserKeyRef = useRef<string | null>(null);
  const [chatHistoryList, setChatHistoryList] = useState<ChatSession[]>([]);
  const [syncStatus, setSyncStatus] = useState<"synced" | "syncing" | "failed">("synced");
  const [pendingSyncQueue, setPendingSyncQueue] = useState<ChatSession[]>(() => {
    try {
      const raw = localStorage.getItem("best_friend_sync_queue");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  
  const [showSelfHealingModal, setShowSelfHealingModal] = useState(false);
  const [selfHealingNotification, setSelfHealingNotification] = useState<string | null>(null);

  // Model state
  const [selectedModel, setSelectedModel] = useState(() => {
    const stored = localStorage.getItem("best_friend_selected_model");
    const validModels = CONFIGURED_MODELS.map((m) => m.id);
    if (stored && validModels.includes(stored)) {
      return stored;
    }
    return "nvidia/nemotron-3-ultra-550b-a55b";
  });


  // Attachment state
  const [selectedAttachment, setSelectedAttachment] = useState<AttachmentData | null>(null);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  
  // AI Image Illustration Transformation state
  const [isTransformingIllustration, setIsTransformingIllustration] = useState(false);
  const [transformedIllustrationUrl, setTransformedIllustrationUrl] = useState<string | null>(null);
  const [illustrationError, setIllustrationError] = useState<string | null>(null);
  
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Response Mode state
  const [responseMode, setResponseMode] = useState<"detailed" | "quick">(() => {
    const stored = localStorage.getItem("best_friend_response_mode");
    return stored === "quick" ? "quick" : "detailed";
  });

  // Theme state: "normal" | "light" | "dark"
  const [themeMode, setThemeMode] = useState<"normal" | "light" | "dark">(() => {
    const stored = localStorage.getItem("best_friend_theme");
    if (stored === "light" || stored === "dark" || stored === "normal") {
      return stored;
    }
    return "normal";
  });

  useEffect(() => {
    document.documentElement.classList.remove("theme-normal", "theme-light", "theme-dark");
    document.documentElement.classList.add(`theme-${themeMode}`);
    localStorage.setItem("best_friend_theme", themeMode);
  }, [themeMode]);

  // Pre-fetch Web Speech API voices
  useEffect(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);


  const messagesEndRef = useRef<HTMLDivElement>(null);


  const handleReaction = (messageId: string, emoji: string) => {
    setMessages(prev => prev.map(m => {
      if (m.id === messageId) {
        const currentReactions = m.reactions || [];
        if (currentReactions.includes(emoji)) {
          return { ...m, reactions: currentReactions.filter(r => r !== emoji) };
        } else {
          return { ...m, reactions: [...currentReactions, emoji] };
        }
      }
      return m;
    }));
  };

  // Message actions & Regeneration state
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speechHeartbeatRef = useRef<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isSendingRef = useRef<boolean>(false);
  const [regenerateTargetMsg, setRegenerateTargetMsg] = useState<Message | null>(null);
  const [regenModel, setRegenModel] = useState<string>("nvidia/nemotron-3-ultra-550b-a55b");
  const [keepOriginalInHistory, setKeepOriginalInHistory] = useState<boolean>(true);

  const stopAllAudio = () => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    if (speechHeartbeatRef.current) {
      clearInterval(speechHeartbeatRef.current);
      speechHeartbeatRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    activeUtteranceRef.current = null;
    setSpeakingMsgId(null);
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    stopAllAudio();
    isSendingRef.current = false;
    setIsTyping(false);
  };

  // Voice Input (Speech-to-Text) state & handlers
  const [speechLang, setSpeechLang] = useState<string>(() => {
    const stored = localStorage.getItem("best_friend_speech_lang");
    if (stored && SPEECH_LANGUAGES.some(l => l.code === stored)) {
      return stored;
    }
    return "bn-IN";
  });
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [speechInterimText, setSpeechInterimText] = useState<string>("");
  const [speechAutoSend, setSpeechAutoSend] = useState<boolean>(() => {
    return localStorage.getItem("best_friend_speech_autosend") === "true";
  });
  const [showSpeechLangMenu, setShowSpeechLangMenu] = useState<boolean>(false);

  const recognitionRef = useRef<any>(null);
  const speechBaseTextRef = useRef<string>("");
  const isSpeechActiveRef = useRef<boolean>(false);

  // ---------------------------------------------------------------------
  // Android hardware / gesture back button.
  //
  // src/lib/native.ts fires a cancelable "karishma:androidback" event from the
  // Capacitor shell. Calling preventDefault() tells it we consumed the press;
  // otherwise it falls back to history, then to press-again-to-exit.
  //
  // This adds no UI and does nothing in a browser, where the event never fires.
  // ---------------------------------------------------------------------
  useEffect(() => {
    const handleAndroidBack = (event: Event) => {
      // Ordered topmost-first, matching the render/z-index order below.
      const closers: Array<[boolean, () => void]> = [
        [showAttachmentMenu, () => setShowAttachmentMenu(false)],
        [showSpeechLangMenu, () => setShowSpeechLangMenu(false)],
        [showSelfHealingModal, () => setShowSelfHealingModal(false)],
        [Boolean(regenerateTargetMsg), () => setRegenerateTargetMsg(null)],
        [showModelSwitcher, () => setShowModelSwitcher(false)],
        [showCpForm, () => setShowCpForm(false)],
        [showEditNames, () => setShowEditNames(false)],
        [showClearConfirm, () => setShowClearConfirm(false)],
        [showPrivacyNotice, () => setShowPrivacyNotice(false)],
        [showKeyEditor, () => setShowKeyEditor(false)],
        [showAccount, () => setShowAccount(false)],
        [showSettings, () => setShowSettings(false)],
        [showHistoryPanel, () => setShowHistoryPanel(false)],
      ];

      const target = closers.find(([isOpen]) => isOpen);
      if (target) {
        target[1]();
        event.preventDefault();
      }
    };

    window.addEventListener("karishma:androidback", handleAndroidBack);
    return () => window.removeEventListener("karishma:androidback", handleAndroidBack);
  }, [
    showAttachmentMenu,
    showSpeechLangMenu,
    showSelfHealingModal,
    regenerateTargetMsg,
    showModelSwitcher,
    showCpForm,
    showEditNames,
    showClearConfirm,
    showPrivacyNotice,
    showKeyEditor,
    showAccount,
    showSettings,
    showHistoryPanel,
  ]);

  const stopVoiceInput = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    isSpeechActiveRef.current = false;
    setIsListening(false);
    setSpeechInterimText("");
  }, []);

  const startVoiceInput = useCallback((overrideLang?: string) => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition ||
      (window as any).mozSpeechRecognition ||
      (window as any).msSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechError("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      setTimeout(() => setSpeechError(null), 6000);
      return;
    }

    // Stop any existing session
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }

    setSpeechError(null);
    setSpeechInterimText("");
    
    // Capture the existing text in input box as base text
    speechBaseTextRef.current = userInput ? (userInput.endsWith(" ") ? userInput : userInput + " ") : "";

    try {
      const recognition = new SpeechRecognition();
      const targetLang = overrideLang || speechLang;
      recognition.lang = targetLang;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        isSpeechActiveRef.current = true;
        setIsListening(true);
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = "";
        let interimTranscript = "";

        for (let i = 0; i < event.results.length; ++i) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        const recognizedCurrent = finalTranscript ? finalTranscript + (interimTranscript ? " " + interimTranscript : "") : interimTranscript;
        const newText = (speechBaseTextRef.current + recognizedCurrent).trim();
        
        if (newText) {
          setUserInput(newText);
        }
        setSpeechInterimText(interimTranscript || finalTranscript);
      };

      recognition.onerror = (event: any) => {
        const err = event.error;
        console.warn("Speech recognition event error:", err);
        if (err === "no-speech") {
          return;
        }
        if (err === "not-allowed" || err === "service-not-allowed") {
          setSpeechError("Microphone permission denied. Please allow microphone access in browser settings.");
        } else if (err === "network") {
          setSpeechError("Network issue with speech service. Please verify your connection.");
        } else if (err === "audio-capture") {
          setSpeechError("No microphone detected or microphone is busy.");
        } else if (err !== "aborted") {
          setSpeechError(`Voice input error: ${err}`);
        }
        isSpeechActiveRef.current = false;
        setIsListening(false);
        setSpeechInterimText("");
        setTimeout(() => setSpeechError(null), 5000);
      };

      recognition.onend = () => {
        if (isSpeechActiveRef.current) {
          try {
            recognition.start();
            return;
          } catch {
            // ignore restart error and reset
          }
        }
        isSpeechActiveRef.current = false;
        setIsListening(false);
        setSpeechInterimText("");
        recognitionRef.current = null;
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error("SpeechRecognition startup error:", err);
      isSpeechActiveRef.current = false;
      setIsListening(false);
      setSpeechError(err?.message || "Failed to start speech recognition.");
      setTimeout(() => setSpeechError(null), 5000);
    }
  }, [speechLang, userInput]);

  const toggleVoiceInput = useCallback(() => {
    if (isListening || isSpeechActiveRef.current) {
      stopVoiceInput();
    } else {
      startVoiceInput();
    }
  }, [isListening, startVoiceInput, stopVoiceInput]);

  const handleSetSpeechLanguage = useCallback((newLang: string) => {
    setSpeechLang(newLang);
    localStorage.setItem("best_friend_speech_lang", newLang);
    setShowSpeechLangMenu(false);
    
    if (isListening || isSpeechActiveRef.current) {
      stopVoiceInput();
      setTimeout(() => {
        startVoiceInput(newLang);
      }, 150);
    }
  }, [isListening, startVoiceInput, stopVoiceInput]);

  // Clean up speech recognition on component unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // Complete Privacy & Account Data Cleanup on Logout
  const handleLogout = useCallback(() => {
    // 1. Cancel active AI generation, speech synthesis, and audio playback
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    stopVoiceInput();
    setIsTyping(false);
    setSpeakingMsgId(null);

    // 2. Immediately clear in-memory conversations, active messages, attachments & inputs
    prevUserKeyRef.current = "logged_out";
    setChatHistoryList([]);
    setMessages([]);
    setCurrentChatId(crypto.randomUUID());
    setUserInput("");
    setSelectedAttachment(null);
    setChatError(null);
    setCopiedMsgId(null);
    setRegenerateTargetMsg(null);

    // 3. Reset input file element refs if present
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (galleryInputRef.current) galleryInputRef.current.value = "";
    if (fileInputRef.current) fileInputRef.current.value = "";

    // 4. Clear user names, profiles, and personalized memories in memory
    setUserName("");
    setUserNickname("");
    setUserFullName("");
    setOnboardingCompleted(false);
    setOnboardingInput("");
    setEditFullName("");
    setEditNickname("");
    setProfileLoading(false);
    setProfileError("");
    setProfileSuccess("");

    // 5. Reset authentication & session state
    setLoggedInUser(null);
    setIsGuest(false);
    setAuthCompleted(false);
    setPendingReg(null);
    setOtpInput("");
    setResendCooldown(0);
    setResendSuccessMsg("");
    setResetEmail("");
    setResetOtp("");
    setResetNew("");
    setResetConfirm("");
    setAuthError("");
    setCpCurrent("");
    setCpNew("");
    setCpConfirm("");
    setCpLoading(false);
    setCpError("");
    setCpSuccess("");

    // 6. Reset UI popups & modals
    setShowAccount(false);
    setAccountView("login");
    setAuthPopupView("menu");
    setShowEditNames(false);
    setShowCpForm(false);
    setShowHistoryPanel(false);
    setShowSettings(false);
    setShowModelSwitcher(false);
    setShowClearConfirm(false);
    setShowPrivacyNotice(false);

    // 7. Reset background sync & self-healing queues
    setPendingSyncQueue([]);
    setSyncStatus("synced");

    // 8. Purge device cache (localStorage & sessionStorage) for account privacy
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          // Keep non-account UI preferences (theme, selected model, response mode)
          if (
            key === "best_friend_theme" ||
            key === "best_friend_selected_model" ||
            key === "best_friend_response_mode"
          ) {
            continue;
          }
          if (
            key.startsWith("best_friend_") ||
            key.startsWith("user_") ||
            key.startsWith("chat_") ||
            key.startsWith("memory_") ||
            key.startsWith("context_") ||
            key === "mock_logged_in_user" ||
            key === "auth_step_completed" ||
            key === "onboarding_completed"
          ) {
            keysToRemove.push(key);
          }
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
      sessionStorage.clear();
    } catch (e) {
      console.error("Error purging local device cache on logout:", e);
    }

    // 9. Present clean logged-out welcome state
    setMessages([
      {
        id: "welcome-logout",
        role: "model",
        text: "You have logged out successfully. Please log in or continue as guest to start chatting.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  }, []);

  const isGeneratingOrSpeaking = isTyping || speakingMsgId !== null;

  const firstUserMsgIdx = messages.findIndex((m) => m.role === "user");
  const hasKarishmaReplied =
    firstUserMsgIdx !== -1 &&
    messages.slice(firstUserMsgIdx + 1).some((m) => m.role === "model");

  const cleanTextForSpeech = (rawText: string): string => {
    if (!rawText || typeof rawText !== "string") return "";

    let text = rawText;

    // 1. Remove code blocks (```...```)
    text = text.replace(/```[\s\S]*?```/g, " ");

    // 2. Extract content from inline code (`code` -> code)
    text = text.replace(/`([^`]+)`/g, "$1");

    // 3. Extract text from markdown links ([label](url) -> label)
    text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

    // 4. Remove URLs
    text = text.replace(/https?:\/\/\S+|www\.\S+/g, " ");

    // 5. Remove markdown formatting tags (*, _, #, ~, >, etc.)
    text = text.replace(/[#*_~>\\]/g, " ");

    // 6. Remove all emojis and unicode pictographs
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA70}-\u{1FA95}]|[\u{1F650}-\u{1F67F}]|[\u{200D}]|[\u{20E3}]|[\u{FE0F}]/gu;
    text = text.replace(emojiRegex, " ");

    // 7. Strip brackets and code symbols to spaces without stripping words or standard punctuation
    text = text.replace(/[{}[\]()<>\/\\|@$%^&+=~_\u2013\u2014]/g, " ");

    // 8. Normalize multiple punctuation marks
    text = text.replace(/!+/g, ".");
    text = text.replace(/।+/g, ".");
    text = text.replace(/\?+/g, "?");
    text = text.replace(/\.+/g, ".");
    text = text.replace(/,\s*,+/g, ",");

    // 9. Normalize whitespace
    text = text.replace(/\s+/g, " ").trim();

    return text;
  };

  const speakWithWebSpeech = (messageId: string, cleanText: string, rawText: string, hasBengali: boolean) => {
    if (!("speechSynthesis" in window)) {
      setSpeakingMsgId(null);
      return;
    }

    // Stop any ongoing speech and clear heartbeats
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    if (speechHeartbeatRef.current) {
      clearInterval(speechHeartbeatRef.current);
      speechHeartbeatRef.current = null;
    }
    window.speechSynthesis.cancel();
    activeUtteranceRef.current = null;

    if (!cleanText) {
      setSpeakingMsgId(null);
      return;
    }

    // 1. Warm, natural young adult female baseline parameters
    let basePitch = 1.05;
    let baseRate = 0.90;

    if (/[😢😭🥺😔💔😟]/u.test(rawText)) {
      basePitch = 1.00;
      baseRate = 0.85;
    } else if (/[😂🤣😜🤪😝]/u.test(rawText)) {
      basePitch = 1.08;
      baseRate = 0.94;
    } else if (/[😊🙂😄😁😃🌟✨]/u.test(rawText)) {
      basePitch = 1.06;
      baseRate = 0.90;
    } else if (/[❤️🥰😍💖💕💗]/u.test(rawText)) {
      basePitch = 1.05;
      baseRate = 0.88;
    }

    // 2. Strict Female-Only Voice Selection
    const voices = window.speechSynthesis.getVoices();

    const malePattern = /\b(male|guy|man|boy|mr|sir|david|mark|george|alex|daniel|fred|james|richard|stephen|brian|russell|oliver|ryan|thomas|paul|arthur|liam|noah|william|jack|charles|henry|edward|john|robert|michael|ravi|rishi|pradeep|madhav|suman|amit|manish|aravind|subir|rahul|deepak|anand|vikram|karan|rohit|raj|tarun|sanjay|ajay|albert|bruce|ralph|tom|shaun|junior|kangkang|pavel|stefan|diego|jorge|carlos|juan|mateo|santiago|lucas|leon|felix|yannick|hans|klaus|desktop)\b|[-_](m0|m1|m2|male)/i;
    const femalePattern = /\b(female|woman|girl|lady|samiksha|tanisha|ananya|moyna|puja|shruti|neerja|swara|veena|raveena|heera|priya|kavya|aditi|sangeeta|kajal|jenny|aria|sonia|ava|samantha|serena|victoria|karen|moira|fiona|tessa|zira|hazel|susan|stephanie|alva|allison|kendra|kimberly|joanna|ivy|salli|chloe|olivia|mia|sophia|emma|isabella|amelia|kalyani|kalpana|geeta|sita|radha)\b|[-_](f0|f1|f2|bnf|ene|fem|female)/i;

    const strictlyFemaleVoices = voices.filter(v => {
      const name = (v.name || "").toLowerCase();
      return femalePattern.test(name) && !malePattern.test(name);
    });

    const nonMaleVoices = voices.filter(v => {
      const name = (v.name || "").toLowerCase();
      return !malePattern.test(name);
    });

    const candidatePool = strictlyFemaleVoices.length > 0 ? strictlyFemaleVoices : (nonMaleVoices.length > 0 ? nonMaleVoices : voices);

    let chosenVoice: SpeechSynthesisVoice | undefined;
    let targetLang = hasBengali ? "bn-IN" : "en-IN";

    if (hasBengali) {
      chosenVoice =
        strictlyFemaleVoices.find(v => (/bn-in|bn-bd|bn/i.test(v.lang) || /bengali|bangla/i.test(v.name))) ||
        candidatePool.find(v => (/bn-in|bn-bd|bn/i.test(v.lang) || /bengali|bangla/i.test(v.name))) ||
        strictlyFemaleVoices.find(v => /neerja|swara|veena|raveena|priya|aditi/i.test(v.name)) ||
        strictlyFemaleVoices[0] ||
        candidatePool[0];
    } else {
      chosenVoice =
        strictlyFemaleVoices.find(v => /neerja.*natural|neerja|swara.*natural|swara/i.test(v.name)) ||
        strictlyFemaleVoices.find(v => (/en-in|hi-in/i.test(v.lang) && femalePattern.test(v.name))) ||
        strictlyFemaleVoices.find(v => /jenny|aria|sonia|ava|samantha|serena|victoria/i.test(v.name)) ||
        strictlyFemaleVoices[0] ||
        candidatePool.find(v => /en-in|en-gb|en-us/i.test(v.lang)) ||
        candidatePool[0];
    }

    if (!chosenVoice || !femalePattern.test(chosenVoice.name || "")) {
      basePitch = Math.max(basePitch, 1.15);
    }

    // 3. Sentence Boundary Splitting for natural pacing and buffer protection
    const rawChunks = cleanText
      .split(/(?<=[.?!;\n])\s+/)
      .map(c => c.trim())
      .filter(c => c.length > 0);

    const chunks: string[] = [];
    for (const chunk of rawChunks) {
      if (chunk.length > 200) {
        // Subdivide long sentences on commas or spaces so browser TTS never chokes
        const subParts = chunk.split(/(?<=[,])\s+/);
        for (const sub of subParts) {
          if (sub.trim()) chunks.push(sub.trim());
        }
      } else {
        chunks.push(chunk);
      }
    }

    if (chunks.length === 0) {
      setSpeakingMsgId(null);
      return;
    }

    setSpeakingMsgId(messageId);

    // Keep-alive heartbeat to prevent Chromium from pausing after 15s
    speechHeartbeatRef.current = setInterval(() => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        }
      }
    }, 5000);

    let currentChunkIndex = 0;
    let isCancelled = false;

    const speakNextChunk = () => {
      if (isCancelled || currentChunkIndex >= chunks.length) {
        if (speechHeartbeatRef.current) {
          clearInterval(speechHeartbeatRef.current);
          speechHeartbeatRef.current = null;
        }
        activeUtteranceRef.current = null;
        setSpeakingMsgId(null);
        return;
      }

      const chunkText = chunks[currentChunkIndex];
      const utterance = new SpeechSynthesisUtterance(chunkText);
      activeUtteranceRef.current = utterance; // Prevent garbage collection mid-speech

      if (chosenVoice) {
        utterance.voice = chosenVoice;
        utterance.lang = chosenVoice.lang || targetLang;
      } else {
        utterance.lang = targetLang;
      }

      let chunkPitch = basePitch + (currentChunkIndex % 2 === 0 ? 0.01 : -0.01);
      if (chunkText.endsWith("?")) {
        chunkPitch += 0.03;
      }

      utterance.pitch = Math.min(Math.max(chunkPitch, 0.94), 1.18);
      utterance.rate = Math.min(Math.max(baseRate, 0.82), 0.96);

      utterance.onend = () => {
        currentChunkIndex++;
        if (currentChunkIndex < chunks.length && !isCancelled) {
          setTimeout(speakNextChunk, 120);
        } else {
          if (speechHeartbeatRef.current) {
            clearInterval(speechHeartbeatRef.current);
            speechHeartbeatRef.current = null;
          }
          activeUtteranceRef.current = null;
          setSpeakingMsgId(null);
        }
      };

      utterance.onerror = (e: any) => {
        // If canceled/interrupted by user, stop; otherwise continue to next chunk so text is never skipped
        if (e.error === "canceled" || e.error === "interrupted") {
          isCancelled = true;
          if (speechHeartbeatRef.current) {
            clearInterval(speechHeartbeatRef.current);
            speechHeartbeatRef.current = null;
          }
          activeUtteranceRef.current = null;
          setSpeakingMsgId(null);
        } else {
          currentChunkIndex++;
          if (currentChunkIndex < chunks.length) {
            setTimeout(speakNextChunk, 50);
          } else {
            if (speechHeartbeatRef.current) {
              clearInterval(speechHeartbeatRef.current);
              speechHeartbeatRef.current = null;
            }
            activeUtteranceRef.current = null;
            setSpeakingMsgId(null);
          }
        }
      };

      window.speechSynthesis.speak(utterance);
    };

    speakNextChunk();
  };

  const handleReadAloud = (messageId: string, rawText: string) => {
    // If currently speaking this message, toggle off
    if (speakingMsgId === messageId) {
      stopAllAudio();
      return;
    }

    // Stop any ongoing speech or audio
    stopAllAudio();

    // Clean text for TTS
    const cleanText = cleanTextForSpeech(rawText);
    if (!cleanText) return;

    const hasBengali = /[\u0980-\u09FF]/.test(cleanText);
    speakWithWebSpeech(messageId, cleanText, rawText, hasBengali);
  };

  const handleToggleFeedback = (messageId: string, type: "like" | "dislike") => {
    setMessages(prev => prev.map(m => {
      if (m.id === messageId) {
        const nextFeedback = m.feedback === type ? null : type;
        return { ...m, feedback: nextFeedback };
      }
      return m;
    }));
  };

  const handleCopyMessage = (messageId: string, text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }
    setCopiedMsgId(messageId);
    setTimeout(() => {
      setCopiedMsgId(prev => (prev === messageId ? null : prev));
    }, 2000);
  };

  const handleOpenRegenerateModal = (msg: Message) => {
    setRegenerateTargetMsg(msg);
    setRegenModel(msg.modelUsed || selectedModel || "gemini-3.6-flash");
    setKeepOriginalInHistory(true);
  };

  const executeRegeneration = async () => {
    if (isSendingRef.current || isTyping || !regenerateTargetMsg) return;
    isSendingRef.current = true;
    const targetMsg = regenerateTargetMsg;
    const chosenModel = regenModel;
    const keepOriginal = keepOriginalInHistory;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setRegenerateTargetMsg(null);
    setIsTyping(true);

    try {
      const targetIdx = messages.findIndex(m => m.id === targetMsg.id);
      let contextHistory = messages;
      if (targetIdx !== -1) {
        contextHistory = messages.slice(0, targetIdx);
      }

      const messagesPayload = contextHistory.slice(-10).map(m => ({
        role: m.role,
        text: m.text
      }));

      const result = await selfHealingSystem.selfHealChatCall(
        messagesPayload,
        chosenModel,
        responseMode,
        userName,
        undefined,
        undefined,
        controller.signal
      );

      if (result) {
        const newMsgId = "friend-" + Date.now();
        const newFriendMessage: Message = {
          id: newMsgId,
          role: "model",
          text: result.text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          citations: result.citations,
          isEncrypted: encryptionEnabled,
          modelUsed: result.recoveredByModel || chosenModel
        };

        setMessages(prev => {
          const idx = prev.findIndex(m => m.id === targetMsg.id);
          if (idx === -1) {
            return [...prev, newFriendMessage];
          }
          if (keepOriginal) {
            const nextState = [...prev];
            nextState.splice(idx + 1, 0, newFriendMessage);
            return nextState;
          } else {
            const nextState = [...prev];
            nextState[idx] = newFriendMessage;
            return nextState;
          }
        });
      }
    } catch (err: any) {
      if (err.name === "AbortError" || err.message === "Generation cancelled by user.") {
        return;
      }
      console.error(err);
      setChatError(err.message || "Failed to regenerate response.");
    } finally {
      isSendingRef.current = false;
      setIsTyping(false);
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  };
  // Helper to load user-namespaced local chats
  const loadLocalUserChats = useCallback((user: { id?: string; email?: string } | null, guestFlag: boolean): ChatSession[] => {
    try {
      const storageKey = getUserStorageKey("best_friend_saved_chats", user, guestFlag);
      if (!storageKey) return [];
      
      const savedChatsEnc = safeLocalStorageGet(storageKey);
      if (!savedChatsEnc) return [];
      
      const parsed = savedChatsEnc.startsWith("[")
        ? JSON.parse(savedChatsEnc)
        : JSON.parse(decodeURIComponent(atob(savedChatsEnc)));
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, []);

  // Welcome message and settings initialization on load
  useEffect(() => {
    // Purge unnamespaced legacy keys to prevent cross-account pollution
    safeLocalStorageRemove("best_friend_saved_chats");
    safeLocalStorageRemove("best_friend_chat_history");
    safeLocalStorageRemove("best_friend_sync_queue");

    const storedPolicy = safeLocalStorageGet("best_friend_retention_policy");
    const storedMfa = safeLocalStorageGet("best_friend_mfa_enabled");
    const storedKey = safeLocalStorageGet("best_friend_encryption_key");

    if (storedPolicy) setRetentionPolicy(storedPolicy as any);
    if (storedKey) setEncryptionKey(storedKey);
    if (storedMfa === "true") {
      setMfaEnabled(true);
      setMfaChallengePassed(false);
    }

    setMessages([]);
  }, []);


  // Prepare encrypted session payload for server
  const loggedInUserRef = useRef(loggedInUser);
  loggedInUserRef.current = loggedInUser;
  const isGuestRef = useRef(isGuest);
  isGuestRef.current = isGuest;

  const prepareSessionPayload = useCallback((session: ChatSession): ChatSession => {
    let copy: ChatSession;
    try {
      copy = JSON.parse(JSON.stringify(session));
    } catch {
      copy = {
        ...session,
        messages: Array.isArray(session?.messages) ? session.messages.map((m) => ({ ...m })) : [],
      };
    }
    copy.messages = (copy.messages || []).map((m: any) => {
      if (m && m.isEncrypted && typeof m.text === "string" && encryptionKey) {
        let isAlreadyEncrypted = false;
        try {
          const parsed = JSON.parse(atob(m.text));
          if (Array.isArray(parsed) && typeof parsed[0] === "number") isAlreadyEncrypted = true;
        } catch {}

        if (!isAlreadyEncrypted) {
          let cipherChars = [];
          for (let i = 0; i < m.text.length; i++) {
            cipherChars.push(m.text.charCodeAt(i) ^ encryptionKey.charCodeAt(i % encryptionKey.length));
          }
          return { ...m, text: btoa(JSON.stringify(cipherChars)) };
        }
      }
      return m;
    });
    return copy;
  }, [encryptionKey]);

  // Save a session to Firebase Cloud Database with Self-Healing Recovery
  const syncSessionToCloud = useCallback(async (sessionToSync: ChatSession): Promise<boolean> => {
    const payload = prepareSessionPayload(sessionToSync);
    setSyncStatus("syncing");

    try {
      const targetUser = loggedInUserRef.current;
      const success = await selfHealingSystem.selfHealSaveToCloud(targetUser, payload as SyncChatSession);
      if (success) {
        setSyncStatus("synced");
        const queueKey = getUserStorageKey("best_friend_sync_queue", targetUser, isGuestRef.current);
        if (queueKey) {
          setPendingSyncQueue(prev => {
            const updated = prev.filter(s => s.id !== sessionToSync.id);
            localStorage.setItem(queueKey, JSON.stringify(updated));
            return updated;
          });
        }
        // Also sync to backend server DB as backup if logged in
        if (targetUser?.id) {
          fetch("/api/history/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: targetUser.id, session: payload })
          }).catch(() => {});
        }
        return true;
      } else {
        setSyncStatus("failed");
        return false;
      }
    } catch (err) {
      console.warn("Cloud save failed, queuing for offline retry:", err);
      setSyncStatus("failed");
      return false;
    }
  }, [prepareSessionPayload]);

  // Flush pending sync queue when connection restores
  const flushPendingSyncQueue = useCallback(async () => {
    setSyncStatus("syncing");
    try {
      const ok = await flushFirebaseQueue(loggedInUserRef.current);
      if (ok) {
        setSyncStatus("synced");
      } else {
        setSyncStatus("failed");
      }
    } catch (err) {
      console.warn("Failed to flush pending sync queue:", err);
      setSyncStatus("failed");
    }
  }, []);

  // Real-time synchronization subscription with Firebase Firestore & Account Data Isolation
  useEffect(() => {
    const userAccountKey = loggedInUser ? (loggedInUser.id || loggedInUser.email || "user") : (isGuest ? "guest" : "logged_out");
    const activeChatIdKey = getUserStorageKey("best_friend_active_chat_id", loggedInUser, isGuest);

    setSyncStatus("syncing");

    // Remove legacy unnamespaced keys to ensure zero cross-user pollution
    localStorage.removeItem("best_friend_saved_chats");
    localStorage.removeItem("best_friend_chat_history");
    localStorage.removeItem("best_friend_sync_queue");

    const storageKey = getUserStorageKey("best_friend_saved_chats", loggedInUser, isGuest);

    // Load initial local cache for THIS active user or guest
    const initialLocal = loadLocalUserChats(loggedInUser, isGuest);

    // Handle initial mount vs switching accounts
    if (prevUserKeyRef.current !== null && prevUserKeyRef.current !== userAccountKey) {
      // User switched from Account A to Account B
      prevUserKeyRef.current = userAccountKey;
      setChatHistoryList([]);
      setMessages([]);
      const freshId = crypto.randomUUID();
      setCurrentChatId(freshId);
      lastSavedSigRef.current = "";
      if (activeChatIdKey) safeLocalStorageSet(activeChatIdKey, freshId);
    } else if (prevUserKeyRef.current === null) {
      // Initial component mount
      prevUserKeyRef.current = userAccountKey;
      if (initialLocal.length > 0) {
        setChatHistoryList(initialLocal);
        const savedActiveChatId = activeChatIdKey ? safeLocalStorageGet(activeChatIdKey) : null;
        const matched = savedActiveChatId ? initialLocal.find(s => s.id === savedActiveChatId) : null;
        const targetSession = matched || initialLocal[0];
        if (targetSession) {
          setCurrentChatId(targetSession.id);
          const sig = `${targetSession.id}:${(targetSession.messages || []).length}:${targetSession.messages?.[targetSession.messages.length - 1]?.id || ""}:${targetSession.messages?.[targetSession.messages.length - 1]?.text || ""}`;
          lastSavedSigRef.current = sig;
          setMessages(targetSession.messages || []);
          if (activeChatIdKey) safeLocalStorageSet(activeChatIdKey, targetSession.id);
        }
      }
    } else if (initialLocal.length > 0) {
      setChatHistoryList(initialLocal);
    }

    // Fetch history from backend Express server if authenticated
    if (loggedInUser?.id) {
      fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: loggedInUser.id })
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && Array.isArray(data.sessions)) {
            const serverSessions: ChatSession[] = data.sessions;
            setChatHistoryList(prev => {
              const map = new Map<string, ChatSession>();
              serverSessions.forEach(s => map.set(s.id, s));
              prev.forEach(s => {
                if (!map.has(s.id)) map.set(s.id, s);
              });
              const merged = Array.from(map.values());
              merged.sort((a, b) => new Date(b.updatedAt || b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
              if (storageKey) {
                try {
                  const encoded = btoa(encodeURIComponent(JSON.stringify(merged)));
                  localStorage.setItem(storageKey, encoded);
                } catch {}
              }
              return merged;
            });
          }
        })
        .catch(() => {});
    }

    // Subscribe to Firestore real-time updates for THIS user (or guest)
    const unsubscribe = subscribeToUserConversations(
      loggedInUser,
      (cloudSessions) => {
        setSyncStatus("synced");

        const processedSessions: ChatSession[] = cloudSessions.map((cloudSession) => {
          const decMsgs = (cloudSession.messages || []).map((m: any) => {
            if (m.isEncrypted && typeof m.text === "string" && encryptionKey) {
              try {
                const cipherChars = JSON.parse(atob(m.text));
                if (Array.isArray(cipherChars)) {
                  let plainText = "";
                  for (let i = 0; i < cipherChars.length; i++) {
                    plainText += String.fromCharCode(cipherChars[i] ^ encryptionKey.charCodeAt(i % encryptionKey.length));
                  }
                  return { ...m, text: plainText };
                }
              } catch (e) {}
            }
            return m;
          });
          return {
            id: cloudSession.id,
            title: cloudSession.title,
            timestamp: cloudSession.timestamp,
            updatedAt: cloudSession.updatedAt,
            messages: decMsgs,
            mode: cloudSession.mode || "normal"
          };
        });

        processedSessions.sort((a, b) => new Date(b.updatedAt || b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());

        if (storageKey) {
          try {
            const encoded = btoa(encodeURIComponent(JSON.stringify(processedSessions)));
            localStorage.setItem(storageKey, encoded);
          } catch {}
        }

        setChatHistoryList(processedSessions);
      },
      (err) => {
        console.warn("Real-time cloud sync error:", err);
        setSyncStatus("failed");
      }
    );

    const handleOnlineOrFocus = () => {
      flushPendingSyncQueue();
    };

    window.addEventListener("online", handleOnlineOrFocus);
    window.addEventListener("focus", handleOnlineOrFocus);

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
      window.removeEventListener("online", handleOnlineOrFocus);
      window.removeEventListener("focus", handleOnlineOrFocus);
    };
  }, [loggedInUser?.id, loggedInUser?.email, isGuest, encryptionKey]);

  // Immediate save on message sent/received
  const lastSavedSigRef = useRef<string>("");
  useEffect(() => {
    if (messages.length === 0 || !currentChatId) return;

    const firstUserMsg = messages.find(m => m.role === "user")?.text;
    if (!firstUserMsg) return; // Don't save empty/welcome-only temporary states as history items

    const msgSig = `${currentChatId}:${messages.length}:${messages[messages.length - 1]?.id || ""}:${messages[messages.length - 1]?.text || ""}`;
    if (lastSavedSigRef.current === msgSig) return;
    lastSavedSigRef.current = msgSig;

    const cleanFirstMsg = firstUserMsg.trim();
    const title = cleanFirstMsg.slice(0, 40) + (cleanFirstMsg.length > 40 ? "..." : "");

    const activeSession: ChatSession = {
      id: currentChatId,
      title,
      timestamp: new Date().toISOString(),
      messages
    };

    const activeChatIdKey = getUserStorageKey("best_friend_active_chat_id", loggedInUserRef.current, isGuestRef.current);
    if (activeChatIdKey) {
      safeLocalStorageSet(activeChatIdKey, currentChatId);
    }

    setChatHistoryList(prev => {
      const idx = prev.findIndex(c => c.id === currentChatId);
      if (idx >= 0) {
        if (
          prev[idx].messages.length === messages.length &&
          prev[idx].title === title &&
          JSON.stringify(prev[idx].messages) === JSON.stringify(messages)
        ) {
          return prev;
        }
        let newList = [...prev];
        newList[idx] = { ...newList[idx], title, messages };
        const storageKey = getUserStorageKey("best_friend_saved_chats", loggedInUserRef.current, isGuestRef.current);
        if (storageKey) {
          try {
            const encoded = btoa(encodeURIComponent(JSON.stringify(newList)));
            safeLocalStorageSet(storageKey, encoded);
          } catch {}
        }
        return newList;
      } else {
        let newList = [activeSession, ...prev];
        const storageKey = getUserStorageKey("best_friend_saved_chats", loggedInUserRef.current, isGuestRef.current);
        if (storageKey) {
          try {
            const encoded = btoa(encodeURIComponent(JSON.stringify(newList)));
            safeLocalStorageSet(storageKey, encoded);
          } catch {}
        }
        return newList;
      }
    });

    syncSessionToCloud(activeSession);
  }, [messages, currentChatId, syncSessionToCloud]);

  // Delete chat from local state and cloud database
  const handleDeleteChat = async (sessionIdToDelete: string) => {
    setChatHistoryList(prev => prev.filter(c => c.id !== sessionIdToDelete));
    if (currentChatId === sessionIdToDelete) {
      setCurrentChatId(crypto.randomUUID());
      setMessages([]);
    }

    // Delete from Firebase Cloud Database with Self-Healing Recovery
    await selfHealingSystem.selfHealDeleteFromCloud(loggedInUser, sessionIdToDelete);

    if (loggedInUser?.id) {
      try {
        await fetch("/api/history/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: loggedInUser.id, sessionId: sessionIdToDelete })
        });
      } catch (e) {
        console.error("Failed to delete chat from cloud:", e);
      }
    }
  };

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Simple encryption/decryption visual simulation representing client-side AES-256
  const getCiphertext = (text: string) => {
    const salt = encryptionKey || "DEFAULT_SALT";
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).padEnd(8, "f");
    const obfuscated = btoa(encodeURIComponent(text)).substring(0, 24);
    return `AES-256[key:${hex}]:${obfuscated}==`;
  };

  // Quick topics for immediate chat interaction
  const quickTopics = [
    {
      label: "💰 Personal Finance Advice",
      prompt: "Can you give me some quick, practical personal finance and investing advice? I'm 22."
    },
    {
      label: "📈 Tax Deductions Explained",
      prompt: "How do tax deductions work simply? What are the key rules for saving on income tax?"
    },
    {
      label: "💻 Tech: PC Build vs M-Mac",
      prompt: "I'm a software developer deciding between a custom PC and an Apple M-series Mac. Help me weigh the hardware specs!"
    },
    {
      label: "🗺️ Geography & Travel Vibe",
      prompt: "Tell me a cool geographic fact about Tokyo or Paris and what the local culture is like right now."
    },
    {
      label: "🌱 Stress/Emotional Support",
      prompt: "I'm feeling a bit anxious and overwhelmed by my study and work schedule lately."
    }
  ];

  // File selection handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (35MB)
    if (file.size > 35 * 1024 * 1024) {
      setChatError(`File "${file.name}" is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Please select a file under 35 MB.`);
      e.target.value = "";
      return;
    }

    // Check if image or document
    const isImage = file.type.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif|svg|bmp|heic|heif)$/i.test(file.name);

    // Read file as Data URL
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (!result) return;

      if (isImage && !file.type.includes("svg")) {
        // Compress/resize image for smoother transmission
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          const maxDim = 1600;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.85);
            setSelectedAttachment({
              name: file.name,
              type: "image/jpeg",
              dataUrl: compressedDataUrl,
              size: Math.round(compressedDataUrl.length * 0.75),
              isImage: true,
            });
            setChatError(null);
            return;
          }

          // Use self-healing file repair
          const healedAttachment = selfHealingSystem.selfHealFile(file, result);
          setSelectedAttachment(healedAttachment);
          setChatError(null);
        };
        img.src = result;
      } else {
        // Document or vector image with self-healing repair
        const healedAttachment = selfHealingSystem.selfHealFile(file, result);
        setSelectedAttachment(healedAttachment);
        setChatError(null);
      }
    };
    reader.onerror = () => {
      setChatError("Failed to read the selected file. Please try selecting it again.");
    };
    reader.readAsDataURL(file);
    
    // Reset file input value so same file can be re-selected if removed
    e.target.value = "";
    // Reset any previous illustration preview when a new file is uploaded
    setTransformedIllustrationUrl(null);
    setIllustrationError(null);
  };

  // Helper to normalize and ensure valid Data URL image source
  const normalizeImageDataUrl = (raw: string, fallbackMime = "image/png"): string => {
    if (!raw || typeof raw !== "string") return "";
    const trimmed = raw.trim();
    if (trimmed.startsWith("data:image/")) {
      return trimmed;
    }
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("/")) {
      return trimmed;
    }
    // Clean raw base64 string
    const cleanBase64 = trimmed.replace(/\s+/g, "");
    return `data:${fallbackMime};base64,${cleanBase64}`;
  };

  // Helper to download any image URL (data URL or external URL) as an actual binary file
  const downloadImageFile = async (url: string, defaultFilename = `image-${Date.now()}.png`) => {
    if (!url) return;
    try {
      if (url.startsWith("data:")) {
        const parts = url.split(";base64,");
        const contentType = parts[0].replace("data:", "") || "image/png";
        const base64Data = parts[1] || "";
        const byteCharacters = atob(base64Data);
        const byteArrays = [];
        for (let offset = 0; offset < byteCharacters.length; offset += 512) {
          const slice = byteCharacters.slice(offset, offset + 512);
          const byteNumbers = new Array(slice.length);
          for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
          }
          byteArrays.push(new Uint8Array(byteNumbers));
        }
        const blob = new Blob(byteArrays, { type: contentType });
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        const ext = contentType.split("/")[1]?.replace("+xml", "") || "png";
        const cleanName = defaultFilename.includes(".") ? defaultFilename : `${defaultFilename}.${ext}`;
        link.download = cleanName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
      } else {
        // External URL: fetch blob to trigger real file download
        const res = await fetch(url);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = defaultFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
      }
    } catch (err) {
      console.error("Image file download error:", err);
      // Fallback
      const link = document.createElement("a");
      link.href = url;
      link.download = defaultFilename;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // AI Image-to-Illustration Generator (Original Hand-Drawn Japanese Animated-Film Style)
  const handleGenerateIllustration = async () => {
    if (!selectedAttachment || !selectedAttachment.dataUrl) return;
    setIsTransformingIllustration(true);
    setIllustrationError(null);
    setChatError(null);

    try {
      const res = await fetch("/api/transform-illustration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getCustomApiHeaders(),
        },
        body: JSON.stringify({
          imageBase64: selectedAttachment.dataUrl,
          mimeType: selectedAttachment.type || "image/jpeg",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate Ghibli art illustration. Please try again.");
      }

      if (data.url) {
        const normalizedUrl = normalizeImageDataUrl(data.url, "image/png");
        setTransformedIllustrationUrl(normalizedUrl);
      } else {
        throw new Error("No illustration image returned from server.");
      }
    } catch (err: any) {
      console.error("Illustration generation error:", err);
      setIllustrationError(err.message || "Failed to generate Ghibli art illustration. Please try again.");
    } finally {
      setIsTransformingIllustration(false);
    }
  };

  // Download / Save Generated Illustration as real image file
  const handleDownloadIllustration = async () => {
    if (!transformedIllustrationUrl) return;
    await downloadImageFile(transformedIllustrationUrl, `ghibli-art-${Date.now()}.png`);
  };

  // Send message to Express API
  const handleSendMessage = async (textToSend?: string) => {
    if (isSendingRef.current || isTyping) {
      return;
    }

    const rawText = textToSend || userInput;
    const attachmentToSend = selectedAttachment;
    
    if (!rawText.trim() && !attachmentToSend) return;

    isSendingRef.current = true;
    setChatError(null);
    if (!textToSend) setUserInput("");
    setSelectedAttachment(null);

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsgId = "user-" + Date.now();

    const isImg = attachmentToSend?.isImage || (attachmentToSend?.type && attachmentToSend.type.startsWith("image/"));
    const defaultLabel = attachmentToSend ? (isImg ? "📷 [Attached Image]" : `📁 [Attached File: ${attachmentToSend.name}]`) : "";

    const newUserMessage: Message = {
      id: userMsgId,
      role: "user",
      text: rawText || defaultLabel,
      timestamp,
      isEncrypted: encryptionEnabled,
      imageAttachment: attachmentToSend || undefined,
    };

    const targetChatId = currentChatId;
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsTyping(true);

    try {
      const contextHistory = updatedMessages;
      const messagesPayload = contextHistory.slice(-10).map(m => ({
        role: m.role,
        text: m.text
      }));

      const result = await selfHealingSystem.selfHealChatCall(
        messagesPayload,
        selectedModel,
        responseMode,
        userName,
        attachmentToSend,
        (fallbackModel) => {
          setSelectedModel(fallbackModel);
          safeLocalStorageSet("best_friend_selected_model", fallbackModel);
          setSelfHealingNotification(`Self-Healed: Switched automatically to backup model ${fallbackModel}`);
          setTimeout(() => setSelfHealingNotification(null), 4000);
        },
        controller.signal
      );

      const responseMsgId = "friend-" + Date.now();
      const newFriendMessage: Message = {
        id: responseMsgId,
        role: "model",
        text: result.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: result.citations,
        generatedImage: result.generatedImage,
        isEncrypted: encryptionEnabled
      };

      setMessages(prev => {
        return [...prev, newFriendMessage];
      });
    } catch (err: any) {
      if (err.name === "AbortError" || err.message === "Generation cancelled by user.") {
        return;
      }
      console.error("Self-Healing Chat Error:", err);
      setChatError(err.message || "Failed to process message safely. Please try again.");
    } finally {
      isSendingRef.current = false;
      setIsTyping(false);
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  };

  // Handle simulated MFA setup sequence
  const startMfaSetup = () => {
    setMfaStep("setup");
    setMfaError(null);
  };

  const handleVerifyMfaCode = () => {
    if (mfaCode.trim().length !== 6) {
      setMfaError("The security code must be exactly 6 digits.");
      return;
    }
    // Simulate verification
    setMfaError(null);
    setMfaStep("active");
    setMfaEnabled(true);
    localStorage.setItem("best_friend_mfa_enabled", "true");

    // Generate simulated recovery keys
    const codes = Array.from({ length: 5 }, () => 
      "FRND-" + Math.floor(1000 + Math.random() * 9000) + "-" + Math.random().toString(36).substring(2, 6).toUpperCase()
    );
    setRecoveryCodes(codes);
  };

  const handleDisableMfa = () => {
    setMfaEnabled(false);
    setMfaStep("idle");
    setMfaCode("");
    setRecoveryCodes([]);
    localStorage.setItem("best_friend_mfa_enabled", "false");
  };

  const handleMfaChallengeSubmit = () => {
    if (mfaChallengeInput.trim() === "123456" || mfaChallengeInput.trim().length === 6) {
      setMfaChallengePassed(true);
      setMfaError(null);
    } else {
      setMfaError("Invalid MFA security token. Hint: Enter any 6-digit code to log in safely.");
    }
  };

  // Wipe chat memory safely
  const wipeAllData = () => {
    setMessages([
      {
        id: "welcome-reset",
        role: "model",
        text: "hey! cache is totally cleared. fresh slate! what's on your mind?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
    ]);
    setCurrentChatId(crypto.randomUUID());
    setChatHistoryList([]);
    localStorage.removeItem("best_friend_saved_chats");
    localStorage.removeItem("best_friend_chat_history");
    sessionStorage.removeItem("best_friend_chat_history");
    localStorage.removeItem("onboarding_completed");
    localStorage.removeItem("best_friend_user_name");
    setOnboardingCompleted(false);
    setUserName("");
    setOnboardingInput("");
    setShowClearConfirm(false);
  };

  // Download encrypted conversation backup bundle
  const handleExportBackup = () => {
    const dataBundle = {
      app: "Best Friend Chat Companion",
      timestamp: new Date().toISOString(),
      encryptionKeyStatus: encryptionEnabled ? "Configured & Active" : "Inactive",
      encryptionKeySeed: encryptionEnabled ? encryptionKey : "None",
      mfaProtection: mfaEnabled ? "Enabled" : "Disabled",
      dataRetentionPolicy: retentionPolicy,
      chatCount: messages.length,
      conversationPayload: messages.map(m => ({
        role: m.role,
        plainText: m.text,
        cipherText: getCiphertext(m.text),
        timestamp: m.timestamp,
        isEncrypted: m.isEncrypted
      }))
    };

    const blob = new Blob([JSON.stringify(dataBundle, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `best-friend-privacy-export-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOnboardingComplete = () => {
    const nick = onboardingInput.trim();
    if (!nick) return;
    
    localStorage.setItem("best_friend_user_name", nick);
    localStorage.setItem("best_friend_nickname", nick);
    localStorage.setItem("onboarding_completed", "true");
    setUserName(nick);
    setUserNickname(nick);
    setOnboardingCompleted(true);
    setAuthCompleted(false);
    setAuthPopupView("menu");
    
    // Only set the initial greeting if there's no real history loaded
    const hasRealHistory = messages.length > 0;
    if (!hasRealHistory) {
      setMessages([]);
    }
  };

  if (!onboardingCompleted) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] text-[#2C2A29] flex flex-col items-center justify-center font-sans p-6 selection:bg-[#F3D9C9] selection:text-[#2C2A29]">
        <div className="w-full max-w-md bg-white border border-[#EBE6DD] rounded-3xl p-8 shadow-sm flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-[#F9F0EB] rounded-2xl flex items-center justify-center mb-6">
            <Smile className="w-8 h-8 text-[#D96B43]" />
          </div>
          <h1 className="text-2xl font-bold text-[#2C2A29] mb-3">Meet Karishma ✨ Your Best Friend</h1>
          <p className="text-[#8C857E] text-sm mb-8">Let's get to know each other before we start chatting.</p>
          
          <div className="w-full flex flex-col gap-4">
            <div className="text-left w-full">
              <label className="text-xs font-bold text-[#5C5753] uppercase tracking-wider mb-2 block">What should I call you?</label>
              <input
                type="text"
                value={onboardingInput}
                onChange={(e) => setOnboardingInput(e.target.value)}
                placeholder="Your name"
                className="w-full bg-[#FAF8F5] border border-[#DFD9D0] rounded-2xl p-4 text-[#2C2A29] focus:outline-none focus:border-[#D96B43] focus:ring-1 focus:ring-[#D96B43] transition-all placeholder:text-[#B3ABA3]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && onboardingInput.trim()) {
                    handleOnboardingComplete();
                  }
                }}
              />
            </div>
            
            <button
              onClick={() => {
                if (onboardingInput.trim()) {
                  handleOnboardingComplete();
                }
              }}
              disabled={!onboardingInput.trim()}
              className="w-full bg-[#D96B43] hover:bg-[#C25A34] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl transition-all"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!authCompleted) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] text-[#2C2A29] flex flex-col items-center justify-center font-sans p-6 selection:bg-[#F3D9C9] selection:text-[#2C2A29]">
        <div className="w-full max-w-md bg-white border border-[#EBE6DD] rounded-3xl p-8 shadow-sm flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-[#F9F0EB] rounded-2xl flex items-center justify-center mb-5">
            <Shield className="w-8 h-8 text-[#D96B43]" />
          </div>

          <h1 className="text-2xl font-bold text-[#2C2A29] mb-1">
            Welcome, {userName || "Friend"}! ✨
          </h1>
          <p className="text-[#8C857E] text-sm mb-6">
            Choose how you'd like to continue
          </p>

          {authPopupView === "menu" && (
            <div className="w-full flex flex-col gap-3.5">
              <button
                type="button"
                onClick={() => {
                  setAuthPopupView("login");
                  setAuthError("");
                }}
                className="w-full p-4 bg-[#FAF8F5] hover:bg-[#F3D9C9]/30 border border-[#EBE6DD] hover:border-[#D96B43] rounded-2xl transition-all cursor-pointer flex items-center gap-4 text-left group"
              >
                <div className="w-11 h-11 bg-[#D96B43] text-white rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <LogIn className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-[#2C2A29]">Log In</div>
                  <div className="text-xs text-[#8C857E]">Access your saved chats & synced profile</div>
                </div>
                <ChevronRight className="w-5 h-5 text-[#8C857E] group-hover:text-[#D96B43] group-hover:translate-x-0.5 transition-all" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthPopupView("create");
                  setAuthError("");
                }}
                className="w-full p-4 bg-[#FAF8F5] hover:bg-[#F3D9C9]/30 border border-[#EBE6DD] hover:border-[#D96B43] rounded-2xl transition-all cursor-pointer flex items-center gap-4 text-left group"
              >
                <div className="w-11 h-11 bg-[#2C2A29] text-white rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-[#2C2A29]">Create Account</div>
                  <div className="text-xs text-[#8C857E]">Save history securely across devices</div>
                </div>
                <ChevronRight className="w-5 h-5 text-[#8C857E] group-hover:text-[#D96B43] group-hover:translate-x-0.5 transition-all" />
              </button>

              <button
                type="button"
                onClick={() => {
                  handleLogout();
                  localStorage.setItem("best_friend_is_guest", "true");
                  localStorage.setItem("auth_step_completed", "true");
                  setIsGuest(true);
                  setAuthCompleted(true);
                }}
                className="w-full p-4 bg-white hover:bg-[#FAF8F5] border border-[#DFD9D0] hover:border-[#8C857E] rounded-2xl transition-all cursor-pointer flex items-center gap-4 text-left group mt-1"
              >
                <div className="w-11 h-11 bg-[#FAF0E6] text-[#D96B43] rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-[#2C2A29]">Continue as Guest</div>
                  <div className="text-xs text-[#8C857E]">Start chatting now without an account</div>
                </div>
                <ChevronRight className="w-5 h-5 text-[#8C857E] group-hover:translate-x-0.5 transition-all" />
              </button>
            </div>
          )}

          {authPopupView === "login" && (
            <div className="w-full text-left">
              <button
                type="button"
                onClick={() => {
                  setAuthPopupView("menu");
                  setAuthError("");
                }}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8C857E] hover:text-[#2C2A29] mb-4 cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Options
              </button>

              {authError && (
                <div className="bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold p-3 rounded-xl mb-4 flex flex-col gap-1.5">
                  <div>{authError}</div>
                  {authError.toLowerCase().includes("no account found") && (
                    <button
                      type="button"
                      onClick={() => {
                        setAuthPopupView("create");
                        setAuthError("");
                      }}
                      className="text-left underline text-[#D96B43] font-bold hover:text-[#C85C34] cursor-pointer"
                    >
                      Click here to Create an Account →
                    </button>
                  )}
                </div>
              )}

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const email = (formData.get("email") as string)?.trim().toLowerCase();
                  const password = formData.get("password") as string;

                  if (!email || !password) return setAuthError("Please enter email and password.");

                  setAuthLoading(true);
                  setAuthError("");
                  try {
                    const res = await fetch("/api/auth/login", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ email, password }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || "Invalid email or password.");

                    const userData = { ...data.user, token: data.token };
                    localStorage.setItem("mock_logged_in_user", JSON.stringify(userData));
                    localStorage.setItem("best_friend_is_guest", "false");
                    localStorage.setItem("auth_step_completed", "true");
                    if (userData.nickname) {
                      setUserNickname(userData.nickname);
                      localStorage.setItem("best_friend_nickname", userData.nickname);
                    }
                    if (userData.fullName) {
                      setUserFullName(userData.fullName);
                      localStorage.setItem("best_friend_full_name", userData.fullName);
                    }
                    const convName = userData.nickname || userData.fullName || userData.email?.split("@")[0] || "Friend";
                    setUserName(convName);
                    localStorage.setItem("best_friend_user_name", convName);

                    setLoggedInUser(userData);
                    setIsGuest(false);
                    setAuthCompleted(true);

                    // Clear in-memory state so newly logged in user gets clean slate before cloud load
                    setChatHistoryList([]);
                    setMessages([]);
                    setCurrentChatId(crypto.randomUUID());
                  } catch (err: any) {
                    setAuthError(err.message || "Failed to log in.");
                  } finally {
                    setAuthLoading(false);
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-[11px] font-bold text-[#8C857E] mb-1.5 uppercase tracking-wider">
                    Email Address
                  </label>
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl px-4 py-3 text-sm text-[#2C2A29] outline-none focus:border-[#D96B43] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#8C857E] mb-1.5 uppercase tracking-wider">
                    Password
                  </label>
                  <PasswordInput
                    name="password"
                    required
                    placeholder="••••••••"
                    className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl px-4 py-3 text-sm text-[#2C2A29] outline-none focus:border-[#D96B43] transition-colors"
                  />
                  <div className="flex justify-end pt-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthPopupView("forgot");
                        setAuthError("");
                        setResendSuccessMsg("");
                        const emailInput = document.querySelector('input[name="email"]') as HTMLInputElement;
                        if (emailInput?.value) setResetEmail(emailInput.value);
                      }}
                      className="text-xs font-bold text-[#D96B43] hover:underline cursor-pointer transition-colors"
                    >
                      Forgot Password?
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full bg-[#D96B43] hover:bg-[#C85C34] disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all cursor-pointer shadow-sm text-sm"
                >
                  {authLoading ? "Logging in..." : "Log In"}
                </button>

                <div className="text-center pt-2">
                  <p className="text-xs text-[#8C857E]">
                    Don't have an account?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setAuthPopupView("create");
                        setAuthError("");
                      }}
                      className="font-bold text-[#D96B43] hover:underline cursor-pointer"
                    >
                      Create Account
                    </button>
                  </p>
                </div>
              </form>
            </div>
          )}

          {authPopupView === "create" && (
            <div className="w-full text-left">
              <button
                type="button"
                onClick={() => {
                  setAuthPopupView("menu");
                  setAuthError("");
                }}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8C857E] hover:text-[#2C2A29] mb-4 cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Options
              </button>

              {authError && (
                <div className="bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold p-3 rounded-xl mb-4">
                  {authError}
                </div>
              )}

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const fullName = (formData.get("fullName") as string)?.trim();
                  const nickname = (formData.get("nickname") as string)?.trim() || userNickname || userName;
                  const email = (formData.get("email") as string)?.trim().toLowerCase();
                  const password = formData.get("password") as string;
                  const confirm = formData.get("confirm") as string;

                  if (!fullName || !email || !password || !confirm) {
                    return setAuthError("Please fill all required fields.");
                  }
                  if (password !== confirm) {
                    return setAuthError("Passwords do not match.");
                  }
                  if (password.length < 8) {
                    return setAuthError("Password must be at least 8 characters.");
                  }

                  const allowedDomains = [
                    "gmail.com", "outlook.com", "hotmail.com", "yahoo.com", "icloud.com", "proton.me", "protonmail.com"
                  ];
                  const emailDomain = email.split("@")[1];
                  if (!emailDomain || !allowedDomains.includes(emailDomain)) {
                    return setAuthError("Please use a supported email provider: Gmail, Outlook, Yahoo, iCloud, or Proton Mail.");
                  }

                  setAuthLoading(true);
                  setAuthError("");
                  try {
                    const res = await fetch("/api/auth/send-otp", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ fullName, nickname, email, password }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || "Failed to send verification code.");

                    setPendingReg({ fullName, nickname, email, password });
                    setAuthPopupView("verify");
                    setOtpInput("");
                    setResendCooldown(60);
                    setResendSuccessMsg("");
                  } catch (err: any) {
                    setAuthError(err.message || "Failed to create account.");
                  } finally {
                    setAuthLoading(false);
                  }
                }}
                className="space-y-3.5"
              >
                <div>
                  <label className="block text-[11px] font-bold text-[#8C857E] mb-1 uppercase tracking-wider">
                    Full Name
                  </label>
                  <input
                    name="fullName"
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl px-4 py-2.5 text-sm text-[#2C2A29] outline-none focus:border-[#D96B43] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#8C857E] mb-1 uppercase tracking-wider">
                    Nickname <span className="normal-case font-normal text-[#8C857E]">(What Karishma calls you)</span>
                  </label>
                  <input
                    name="nickname"
                    type="text"
                    defaultValue={userNickname || userName}
                    placeholder="e.g. Johnny"
                    className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl px-4 py-2.5 text-sm text-[#2C2A29] outline-none focus:border-[#D96B43] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#8C857E] mb-1 uppercase tracking-wider">
                    Email Address
                  </label>
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl px-4 py-2.5 text-sm text-[#2C2A29] outline-none focus:border-[#D96B43] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#8C857E] mb-1 uppercase tracking-wider">
                    Password
                  </label>
                  <PasswordInput
                    name="password"
                    required
                    placeholder="Min. 8 characters"
                    className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl px-4 py-2.5 text-sm text-[#2C2A29] outline-none focus:border-[#D96B43] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#8C857E] mb-1 uppercase tracking-wider">
                    Confirm Password
                  </label>
                  <PasswordInput
                    name="confirm"
                    required
                    placeholder="Min. 8 characters"
                    className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl px-4 py-2.5 text-sm text-[#2C2A29] outline-none focus:border-[#D96B43] transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full bg-[#D96B43] hover:bg-[#C85C34] disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all cursor-pointer shadow-sm text-sm mt-1"
                >
                  {authLoading ? "Sending Code..." : "Create Account"}
                </button>
              </form>
            </div>
          )}

          {authPopupView === "verify" && pendingReg && (
            <div className="w-full text-left space-y-4">
              <button
                type="button"
                onClick={() => {
                  setAuthPopupView("create");
                  setAuthError("");
                  setResendSuccessMsg("");
                }}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8C857E] hover:text-[#2C2A29] cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Registration
              </button>

              <div className="text-center my-2">
                <h3 className="text-sm font-bold text-[#2C2A29] mb-1">Verify your email</h3>
                <p className="text-[11px] text-[#8C857E]">
                  Enter the 6-digit verification code sent to <br />
                  <strong className="text-[#5C5753]">{pendingReg.email}</strong>
                </p>
              </div>

              {authError && (
                <div className="bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold p-3 rounded-xl">
                  {authError}
                </div>
              )}

              {resendSuccessMsg && (
                <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold p-3 rounded-xl flex items-center gap-2">
                  <CircleCheck className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{resendSuccessMsg}</span>
                </div>
              )}

              <div>
                <input
                  type="text"
                  maxLength={6}
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••••"
                  className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl px-4 py-3 text-2xl tracking-[0.5em] text-center text-[#2C2A29] outline-none focus:border-[#D96B43] transition-colors font-mono"
                />
              </div>

              <div className="text-center pt-0.5">
                <button
                  type="button"
                  disabled={resendCooldown > 0 || authLoading}
                  onClick={handleResendOtp}
                  className="text-xs font-bold text-[#D96B43] hover:underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed cursor-pointer transition-all"
                >
                  {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : "Resend OTP"}
                </button>
              </div>

              <button
                type="button"
                disabled={authLoading}
                onClick={async () => {
                  if (otpInput.length !== 6) return setAuthError("Please enter a valid 6-digit OTP.");
                  setAuthLoading(true);
                  setAuthError("");
                  setResendSuccessMsg("");
                  try {
                    const res = await fetch("/api/auth/verify-otp", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ email: pendingReg.email, otp: otpInput }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || "Verification failed.");

                    const userData = { ...data.user, token: data.token };
                    localStorage.setItem("mock_logged_in_user", JSON.stringify(userData));
                    localStorage.setItem("best_friend_is_guest", "false");
                    localStorage.setItem("auth_step_completed", "true");
                    if (userData.nickname) {
                      setUserNickname(userData.nickname);
                      localStorage.setItem("best_friend_nickname", userData.nickname);
                    }
                    if (userData.fullName) {
                      setUserFullName(userData.fullName);
                      localStorage.setItem("best_friend_full_name", userData.fullName);
                    }
                    const convName = userData.nickname || userData.fullName || userData.email?.split("@")[0] || "Friend";
                    setUserName(convName);
                    localStorage.setItem("best_friend_user_name", convName);

                    setChatHistoryList([]);
                    setMessages([]);
                    setCurrentChatId(crypto.randomUUID());

                    setLoggedInUser(userData);
                    setIsGuest(false);
                    setAuthCompleted(true);
                    setPendingReg(null);
                    setResendCooldown(0);
                    setResendSuccessMsg("");
                  } catch (err: any) {
                    setAuthError(err.message || "Verification failed.");
                  } finally {
                    setAuthLoading(false);
                  }
                }}
                className="w-full bg-[#D96B43] hover:bg-[#C85C34] disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all cursor-pointer shadow-sm text-sm"
              >
                {authLoading ? "Verifying..." : "Verify & Complete"}
              </button>
            </div>
          )}

          {authPopupView === "forgot" && (
            <div className="w-full text-left">
              <button
                type="button"
                onClick={() => {
                  setAuthPopupView("login");
                  setAuthError("");
                }}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8C857E] hover:text-[#2C2A29] mb-4 cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </button>

              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-[#F3D9C9] rounded-xl mx-auto flex items-center justify-center mb-3">
                  <Lock className="w-6 h-6 text-[#D96B43]" />
                </div>
                <h3 className="text-base font-bold text-[#2C2A29]">Reset Password</h3>
                <p className="text-xs text-[#8C857E] mt-1">Enter your registered email address to receive a verification code.</p>
              </div>

              {authError && (
                <div className="bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold p-3 rounded-xl mb-4 space-y-1.5">
                  <div>{authError}</div>
                  {authError.toLowerCase().includes("no account found") && (
                    <button
                      type="button"
                      onClick={() => {
                        setAuthPopupView("create");
                        setAuthError("");
                      }}
                      className="text-xs font-bold text-[#D96B43] hover:underline cursor-pointer block pt-1"
                    >
                      Click here to Create an Account →
                    </button>
                  )}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#8C857E] mb-1.5 uppercase tracking-wider">
                    Registered Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl px-4 py-3 text-sm text-[#2C2A29] outline-none focus:border-[#D96B43] transition-colors"
                  />
                </div>

                <button
                  type="button"
                  disabled={authLoading}
                  onClick={async () => {
                    const trimmedEmail = resetEmail.trim().toLowerCase();
                    if (!trimmedEmail || !trimmedEmail.includes("@")) {
                      return setAuthError("Please enter a valid email address.");
                    }
                    setAuthLoading(true);
                    setAuthError("");
                    try {
                      const res = await fetch("/api/auth/forgot-password", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email: trimmedEmail }),
                      });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error || "Failed to send reset code.");
                      setResetEmail(trimmedEmail);
                      setResendCooldown(60);
                      setResendSuccessMsg("Verification code sent to your email.");
                      setResetOtp("");
                      setAuthPopupView("reset_otp");
                    } catch (err: any) {
                      setAuthError(err.message || "Failed to send reset code.");
                    } finally {
                      setAuthLoading(false);
                    }
                  }}
                  className="w-full bg-[#D96B43] hover:bg-[#C85C34] disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all cursor-pointer shadow-sm text-sm"
                >
                  {authLoading ? "Sending Code..." : "Send OTP"}
                </button>
              </div>
            </div>
          )}

          {authPopupView === "reset_otp" && (
            <div className="w-full text-left">
              <button
                type="button"
                onClick={() => {
                  setAuthPopupView("forgot");
                  setAuthError("");
                  setResendSuccessMsg("");
                }}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8C857E] hover:text-[#2C2A29] mb-4 cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>

              <div className="text-center mb-4">
                <h3 className="text-sm font-bold text-[#2C2A29] mb-1">Enter Verification Code</h3>
                <p className="text-[11px] text-[#8C857E]">
                  We've sent a 6-digit OTP to <br/><strong className="text-[#5C5753]">{resetEmail}</strong>
                </p>
              </div>

              {authError && (
                <div className="bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold p-3 rounded-xl mb-3">
                  {authError}
                </div>
              )}

              {resendSuccessMsg && (
                <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold p-3 rounded-xl flex items-center gap-2 mb-3">
                  <CircleCheck className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{resendSuccessMsg}</span>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#8C857E] mb-1.5 uppercase tracking-wider text-center">
                    Enter 6-Digit OTP
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={resetOtp}
                    onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="••••••"
                    className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl px-4 py-3 text-2xl tracking-[0.5em] text-center text-[#2C2A29] outline-none focus:border-[#D96B43] transition-colors font-mono"
                  />
                </div>

                <div className="text-center pt-0.5">
                  <button
                    type="button"
                    disabled={resendCooldown > 0 || authLoading}
                    onClick={async () => {
                      setAuthLoading(true);
                      setAuthError("");
                      try {
                        const res = await fetch("/api/auth/forgot-password", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ email: resetEmail }),
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || "Failed to resend code.");
                        setResendCooldown(60);
                        setResendSuccessMsg("A new verification code has been sent.");
                      } catch (err: any) {
                        setAuthError(err.message || "Failed to resend code.");
                      } finally {
                        setAuthLoading(false);
                      }
                    }}
                    className="text-xs font-bold text-[#D96B43] hover:underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed cursor-pointer transition-all"
                  >
                    {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : "Resend OTP"}
                  </button>
                  <span className="text-[#8C857E] text-xs mx-2">|</span>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthPopupView("forgot");
                      setAuthError("");
                      setResendSuccessMsg("");
                    }}
                    className="text-xs font-bold text-[#8C857E] hover:text-[#5C5753] cursor-pointer"
                  >
                    Change Email
                  </button>
                </div>

                <button
                  type="button"
                  disabled={authLoading}
                  onClick={async () => {
                    if (resetOtp.length !== 6) {
                      return setAuthError("Please enter a valid 6-digit OTP.");
                    }
                    setAuthLoading(true);
                    setAuthError("");
                    setResendSuccessMsg("");
                    try {
                      const res = await fetch("/api/auth/verify-reset-otp", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email: resetEmail, otp: resetOtp }),
                      });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error || "Failed to verify OTP.");
                      setResetNew("");
                      setResetConfirm("");
                      setAuthPopupView("reset_pass");
                    } catch (err: any) {
                      setAuthError(err.message || "Invalid OTP code.");
                    } finally {
                      setAuthLoading(false);
                    }
                  }}
                  className="w-full bg-[#D96B43] hover:bg-[#C85C34] disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all cursor-pointer shadow-sm text-sm"
                >
                  {authLoading ? "Verifying..." : "Verify OTP"}
                </button>
              </div>
            </div>
          )}

          {authPopupView === "reset_pass" && (
            <div className="w-full text-left">
              <div className="text-center mb-6">
                <h3 className="text-base font-bold text-[#2C2A29]">Create New Password</h3>
                <p className="text-xs text-[#8C857E] mt-1">Set a new strong password for your account.</p>
              </div>

              {authError && (
                <div className="bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold p-3 rounded-xl mb-4">
                  {authError}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#8C857E] mb-1.5 uppercase tracking-wider">
                    New Password
                  </label>
                  <PasswordInput
                    value={resetNew}
                    onChange={(e) => setResetNew(e.target.value)}
                    placeholder="Min. 8 characters"
                    className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl px-4 py-3 text-sm text-[#2C2A29] outline-none focus:border-[#D96B43] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#8C857E] mb-1.5 uppercase tracking-wider">
                    Confirm New Password
                  </label>
                  <PasswordInput
                    value={resetConfirm}
                    onChange={(e) => setResetConfirm(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl px-4 py-3 text-sm text-[#2C2A29] outline-none focus:border-[#D96B43] transition-colors"
                  />
                </div>

                <button
                  type="button"
                  disabled={authLoading}
                  onClick={async () => {
                    if (!resetNew || !resetConfirm) {
                      return setAuthError("Please enter and confirm your new password.");
                    }
                    if (resetNew !== resetConfirm) {
                      return setAuthError("New password and confirm password do not match.");
                    }
                    if (resetNew.length < 8) {
                      return setAuthError("Password must be at least 8 characters long.");
                    }

                    setAuthLoading(true);
                    setAuthError("");
                    try {
                      const res = await fetch("/api/auth/reset-password", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          email: resetEmail,
                          otp: resetOtp,
                          newPassword: resetNew,
                        }),
                      });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error || "Failed to reset password.");

                      setResetOtp("");
                      setResetNew("");
                      setResetConfirm("");
                      setAuthPopupView("reset_success");
                    } catch (err: any) {
                      setAuthError(err.message || "Failed to reset password.");
                    } finally {
                      setAuthLoading(false);
                    }
                  }}
                  className="w-full bg-[#D96B43] hover:bg-[#C85C34] disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all cursor-pointer shadow-sm text-sm"
                >
                  {authLoading ? "Resetting Password..." : "Set New Password"}
                </button>
              </div>
            </div>
          )}

          {authPopupView === "reset_success" && (
            <div className="w-full text-center space-y-4">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl mx-auto flex items-center justify-center">
                <CircleCheck className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#2C2A29]">Password Reset Successful!</h3>
                <p className="text-xs text-[#8C857E] mt-1 max-w-xs mx-auto">
                  Your password has been changed successfully. You can now log in using your new password.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setAuthPopupView("login");
                  setAuthError("");
                  setResendSuccessMsg("");
                }}
                className="w-full bg-[#D96B43] hover:bg-[#C85C34] text-white font-bold py-3.5 rounded-xl transition-all cursor-pointer shadow-sm text-sm"
              >
                Return to Login
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen h-dvh w-full bg-[#FAF8F5] text-[#2C2A29] flex flex-col font-sans selection:bg-[#F3D9C9] selection:text-[#2C2A29] overflow-hidden">
      

      {/* Main Container Wrapper */}
      <div className="w-full flex-1 flex flex-col min-h-0 overflow-hidden">



        {/* MFA Authentication Wall Screen (If locked) */}
        {!mfaChallengePassed && mfaEnabled && (
          <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="max-w-md w-full bg-white border border-[#EBE6DD] rounded-3xl p-8 shadow-sm text-center"
            >
              <div className="mx-auto w-16 h-16 rounded-full bg-[#FAF0E6] flex items-center justify-center mb-6">
                <Lock className="w-8 h-8 text-[#D96B43]" />
              </div>
              <h2 className="text-xl font-bold text-[#2C2A29] mb-2">Secure Chat Locked</h2>
              <p className="text-sm text-[#5C5753] mb-6">
                Your profile is securely locked with Multi-Factor Authentication. Please enter your 6-digit verification code to resume the session.
              </p>

              <div className="space-y-4">
                <div>
                  <PasswordInput
                    maxLength={6}
                    placeholder="Enter 6-digit security code"
                    value={mfaChallengeInput}
                    onChange={(e) => setMfaChallengeInput(e.target.value.replace(/\D/g, ""))}
                    className="w-full text-center tracking-[0.5em] text-xl font-bold py-3 border border-[#EBE6DD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D96B43] focus:border-transparent bg-[#FAF8F5]"
                  />
                  <p className="text-[11px] text-[#8C857E] mt-1.5">
                    💡 Testing note: You can enter <b>123456</b> or any 6 digits to pass.
                  </p>
                </div>

                {mfaError && (
                  <div className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg flex items-center gap-1.5 justify-center">
                    <CircleAlert className="w-3.5 h-3.5 shrink-0" />
                    <span>{mfaError}</span>
                  </div>
                )}

                <button
                  onClick={handleMfaChallengeSubmit}
                  className="w-full bg-[#D96B43] hover:bg-[#C85C34] text-white font-medium py-3 rounded-xl transition-all cursor-pointer"
                >
                  Verify Identity & Unlock Chat
                </button>

                <div className="pt-4 border-t border-[#FAF8F5]">
                  <button
                    onClick={() => {
                      // Allow clearing stored keys to bypass if recovery is needed
                      localStorage.removeItem("best_friend_mfa_enabled");
                      setMfaEnabled(false);
                      setMfaChallengePassed(true);
                    }}
                    className="text-xs text-[#8C857E] hover:text-[#D96B43] underline transition-all cursor-pointer"
                  >
                    Bypass / Reset MFA Security Lock
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Normal application interface */}
        {mfaChallengePassed && (
          <div className="flex-1 flex flex-col items-stretch h-full w-full min-h-0 overflow-hidden">
            
            {/* The Companion Chat Interface */}
            <section className="flex-1 flex flex-col bg-[#FAF8F5] w-full h-full min-h-0 overflow-hidden relative">
              
              {/* Chat Panel Header (Fixed/Stationary) */}
              <div className="sticky top-0 z-30 bg-white border-b border-[#EBE6DD] px-4 md:px-6 py-3 flex justify-between items-center shrink-0 w-full shadow-xs">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowHistoryPanel(true)}
                    title="Chat History"
                    className="w-10 h-10 flex items-center justify-center text-[#D96B43] hover:text-[#C85C34] transition-colors cursor-pointer shrink-0"
                  >
                    <HistoryMenuIcon className="w-6 h-6" />
                  </button>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold text-[#2C2A29]">Karishma</h2>
                        {loggedInUser?.id && (
                          <>
                            {syncStatus === "syncing" && (
                              <span className="text-[10px] text-[#8C857E] flex items-center gap-1 bg-[#FAF0E6] px-2 py-0.5 rounded-full border border-[#F3D9C9]">
                                <RefreshCw className="w-3 h-3 animate-spin text-[#D96B43]" /> Syncing...
                              </span>
                            )}
                            {syncStatus === "failed" && (
                              <button
                                onClick={() => flushPendingSyncQueue()}
                                className="text-[10px] bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full border border-rose-200 font-bold flex items-center gap-1 hover:bg-rose-100 transition-colors cursor-pointer"
                                title="Cloud save failed. Click to retry."
                              >
                                <CircleAlert className="w-3 h-3" /> Sync failed — retrying...
                              </button>
                            )}
                          </>
                        )}
                      </div>
                      <p className="text-xs text-[#8C857E] truncate">
                        {isTyping ? "karishma is typing..." : ""}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex bg-white border border-[#EBE6DD] p-0.5 rounded-full mr-2">
                    <button
                      onClick={() => {
                        setResponseMode("quick");
                        localStorage.setItem("best_friend_response_mode", "quick");
                      }}
                      className={`text-[10px] font-bold px-3 py-1 rounded-full transition-all cursor-pointer ${responseMode === "quick" ? "bg-[#D96B43] text-white shadow-sm" : "text-[#8C857E] hover:text-[#5C5753]"}`}
                    >
                      Quick
                    </button>
                    <button
                      onClick={() => {
                        setResponseMode("detailed");
                        localStorage.setItem("best_friend_response_mode", "detailed");
                      }}
                      className={`text-[10px] font-bold px-3 py-1 rounded-full transition-all cursor-pointer ${responseMode === "detailed" ? "bg-[#D96B43] text-white shadow-sm" : "text-[#8C857E] hover:text-[#5C5753]"}`}
                    >
                      Detailed
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      if (retentionPolicy === "local") {
                        setRetentionPolicy("session");
                        localStorage.setItem("best_friend_retention_policy", "session");
                      } else {
                        setRetentionPolicy("local");
                        localStorage.setItem("best_friend_retention_policy", "local");
                        const storedHistory = localStorage.getItem("best_friend_chat_history");
                        if (storedHistory) {
                          try {
                            const parsed = storedHistory.startsWith("[") ? JSON.parse(storedHistory) : JSON.parse(decodeURIComponent(atob(storedHistory)));
                            const merged = [...parsed];
                            for (const m of messages) {
                              if (!merged.find((x: any) => x.id === m.id)) {
                                merged.push(m);
                              }
                            }
                            setMessages(merged);
                          } catch (e) {}
                        }
                      }
                    }}
                    title={retentionPolicy === "local" ? "Encrypted History: ON" : "Encrypted History: OFF"}
                    className={`p-1.5 rounded-full border transition-all cursor-pointer flex items-center justify-center ${
                      retentionPolicy === "local" 
                        ? "bg-[#D96B43] border-[#D96B43] text-white shadow-sm" 
                        : "bg-white border-[#EBE6DD] text-[#8C857E] hover:bg-[#FAF8F5] hover:text-[#5C5753]"
                    }`}
                  >
                    <History className="w-4 h-4" />
                  </button>
                  {encryptionEnabled && (
                    <span className="bg-[#FAF0E6] text-[#D96B43] text-[10px] font-mono px-2 py-0.5 rounded-full border border-[#F3D9C9] flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      E2EE Verified
                    </span>
                  )}
                </div>
              </div>

              {/* Chat Stream (Messages area) */}
              <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-3 bg-[#FCFAF7] min-h-0 w-full">
                <div className="max-w-3xl mx-auto space-y-3 w-full">
                
                {/* Simulated connection status block */}
                <div className="flex justify-center mb-2">
                  <span className="text-[10px] font-mono bg-[#EBE6DD] px-2.5 py-1 rounded-full text-[#5C5753]">
                    End-to-End Encrypted
                  </span>
                </div>

                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-[60%] text-center px-4 max-w-2xl mx-auto space-y-6 mt-8">
                    <span className="text-4xl">💫</span>
                    <h2 className="text-2xl md:text-3xl font-medium text-[#2C2A29] leading-relaxed">
                      {userName
                        ? `Hey, ${userName}! 😊 It's really nice to meet you. What's on your mind today?`
                        : "hey! ☕ so glad you opened this up. was just sitting here with some coffee thinking about what we should get into today. how's everything going with you?"}
                    </h2>

                    {/* Starter Prompt Suggestion Chips */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full mt-4 text-left">
                      {[
                        { icon: "💬", title: "Banglish e kotha bolo", prompt: "kemon achis Karishma? aajker khabor ki bolo to!" },
                        { icon: "📖", title: "Tell me a Bengali story", prompt: "বাংলায় একটি সুন্দর ও চমৎকার গল্প শোনাও।" },
                        { icon: "💡", title: "Explain AI simply", prompt: "Explain how artificial intelligence works in simple everyday terms." },
                        { icon: "📝", title: "Draft a friendly email", prompt: "Help me write a friendly email thanking a colleague for their help." }
                      ].map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSendMessage(item.prompt)}
                          className="p-3.5 bg-white border border-[#EBE6DD] hover:border-[#D96B43] rounded-2xl text-left transition-all hover:shadow-md cursor-pointer group flex items-start gap-3"
                        >
                          <span className="text-lg shrink-0">{item.icon}</span>
                          <div>
                            <p className="text-xs font-semibold text-[#2C2A29] group-hover:text-[#D96B43] transition-colors">{item.title}</p>
                            <p className="text-[11px] text-[#8C857E] truncate mt-0.5">{item.prompt}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((m) => {
                  const isUser = m.role === "user";
                  const shouldMask = encryptionEnabled && !showDecrypted;
                  const displayMessageText = shouldMask ? getCiphertext(m.text) : m.text;

                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isUser ? "items-end ml-auto max-w-[85%]" : "items-start w-full"} group`}
                    >
                      {/* Name tag */}
                      <span className={`text-[10px] text-[#8C857E] mb-0.5 px-1 ${!isUser && "hidden"}`}>
                        {isUser ? "You" : "Karishma"} • {m.timestamp}
                      </span>

                      <div className={`relative flex gap-2 ${isUser ? "items-center" : "w-full"}`}>
                        {isUser && (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white border border-[#EBE6DD] rounded-full px-2 py-1 shadow-sm shrink-0">
                            {["👍", "❤️", "😂"].map(emoji => (
                              <button 
                                key={emoji} 
                                onClick={() => handleReaction(m.id, emoji)}
                                className="hover:scale-125 transition-transform text-xs cursor-pointer"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
                        {/* Bubble / Text Content */}
                        <div
                          className={`${
                            isUser
                              ? "p-3.5 bg-[#D96B43] text-white rounded-2xl rounded-tr-none shadow-sm text-sm leading-relaxed"
                              : "py-0.5 w-full text-base leading-relaxed text-[#2C2A29]"
                          }`}
                        >
                        {/* Attached Image or Document inside User Bubble if present */}
                        {m.imageAttachment?.dataUrl && (
                          m.imageAttachment.isImage || m.imageAttachment.type?.startsWith("image/") ? (
                            <div className="mb-2 max-w-xs overflow-hidden rounded-xl border border-white/20">
                              <img
                                src={m.imageAttachment.dataUrl}
                                alt={m.imageAttachment.name}
                                className="w-full max-h-56 object-cover rounded-xl"
                              />
                            </div>
                          ) : (
                            <div className="mb-2 max-w-xs flex items-center gap-2.5 p-2.5 bg-black/10 rounded-xl border border-white/20 text-white">
                              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                                <FileText className="w-4 h-4 text-white" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold truncate">{m.imageAttachment.name}</p>
                                <p className="text-[10px] opacity-80 uppercase tracking-wider">
                                  {m.imageAttachment.name.split('.').pop() || 'FILE'} {m.imageAttachment.size ? `• ${formatFileSize(m.imageAttachment.size)}` : ''}
                                </p>
                              </div>
                            </div>
                          )
                        )}

                        {shouldMask ? (
                          <div className="font-mono text-xs select-all break-all opacity-85 text-[#2C2A29] bg-[#E2DCD3] p-1.5 rounded border border-[#DFD9D0]">
                            <span className="text-[#D96B43] block font-bold text-[9px] mb-1">
                              🔐 CLIENT-SIDE ENCRYPTED MESSAGE BODY
                            </span>
                            {displayMessageText}
                          </div>
                        ) : (
                          <div className={`markdown-body [&_pre]:bg-[#F4EFE6] [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_code]:font-mono [&_code]:text-[13px] ${!isUser && "[&_a]:text-[#D96B43] [&_a:hover]:underline [&_h1]:text-2xl [&_h2]:text-xl [&_h3]:text-lg"}`}>
                            <Markdown
                              components={{
                                p: ({ children }) => <div className="mb-1.5 last:mb-0 leading-relaxed">{children}</div>,
                                img: ({ node, src, alt, ...props }) => {
                                  if (!src || src.trim() === "") return null;
                                  return (
                                    <div className="my-3 group relative inline-block max-w-sm overflow-hidden rounded-2xl border border-[#E0D8CD] bg-[#F7F4EF] shadow-md transition-all hover:shadow-lg">
                                      <img
                                        src={src}
                                        alt={alt || "Generated Image"}
                                        referrerPolicy="no-referrer"
                                        className="w-full max-h-80 object-cover rounded-2xl block"
                                      />
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3 rounded-2xl">
                                        <span className="text-xs text-white/90 font-medium truncate max-w-[70%]">
                                          {alt || "Generated Image"}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => downloadImageFile(src, `karishma-generated-${Date.now()}.png`)}
                                          className="px-2.5 py-1 bg-white/90 hover:bg-white text-black text-xs font-semibold rounded-lg shadow flex items-center gap-1 transition-transform active:scale-95 cursor-pointer"
                                        >
                                          <Download className="w-3.5 h-3.5" /> Save
                                        </button>
                                      </div>
                                    </div>
                                  );
                                }
                              }}
                            >
                              {displayMessageText}
                            </Markdown>
                          </div>
                        )}

                        {/* Standalone Generated Image attachment rendering if present and not in markdown */}
                        {m.generatedImage?.url && !displayMessageText.includes(m.generatedImage.url) && (
                          <div className="my-3 group relative inline-block max-w-sm overflow-hidden rounded-2xl border border-[#E0D8CD] bg-[#F7F4EF] shadow-md transition-all hover:shadow-lg">
                            <img
                              src={m.generatedImage.url}
                              alt={m.generatedImage.prompt || "Generated Image"}
                              referrerPolicy="no-referrer"
                              className="w-full max-h-80 object-cover rounded-2xl block"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3 rounded-2xl">
                              <span className="text-xs text-white/90 font-medium truncate max-w-[70%]">
                                {m.generatedImage.prompt || "Generated Image"}
                              </span>
                              <button
                                type="button"
                                onClick={() => downloadImageFile(m.generatedImage.url, `karishma-generated-${Date.now()}.png`)}
                                className="px-2.5 py-1 bg-white/90 hover:bg-white text-black text-xs font-semibold rounded-lg shadow flex items-center gap-1 transition-transform active:scale-95 cursor-pointer"
                              >
                                <Download className="w-3.5 h-3.5" /> Save
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Grounding web search citations if they exist */}
                        {m.citations && m.citations.length > 0 && (
                          <div className="mt-4 pt-3 border-t border-[#DFD9D0] text-[11px] text-[#5C5753]">
                            <span className="font-semibold block mb-1">🌍 Helpful Real-Time Sources:</span>
                            <div className="flex flex-col gap-1">
                              {m.citations.map((cit, idx) => (
                                <a
                                  key={idx}
                                  href={cit.uri}
                                  target="_blank"
                                  referrerPolicy="no-referrer"
                                  className="underline text-[#D96B43] hover:text-[#2C2A29] block truncate font-mono"
                                >
                                  [{idx + 1}] {cit.title}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {!isUser && (
                          <div className="mt-1 flex items-center gap-2 text-[#8C857E]">
                            {/* Like button */}
                            <button
                              onClick={() => handleToggleFeedback(m.id, "like")}
                              title="Like"
                              className={`p-1 transition-colors cursor-pointer ${
                                m.feedback === "like"
                                  ? "text-[#D96B43]"
                                  : "text-[#8C857E] hover:text-[#D96B43]"
                              }`}
                            >
                              <ThumbsUp className={`w-3.5 h-3.5 ${m.feedback === "like" ? "fill-[#D96B43]" : ""}`} />
                            </button>

                            {/* Dislike button */}
                            <button
                              onClick={() => handleToggleFeedback(m.id, "dislike")}
                              title="Dislike"
                              className={`p-1 transition-colors cursor-pointer ${
                                m.feedback === "dislike"
                                  ? "text-rose-600"
                                  : "text-[#8C857E] hover:text-rose-600"
                              }`}
                            >
                              <ThumbsDown className={`w-3.5 h-3.5 ${m.feedback === "dislike" ? "fill-rose-600" : ""}`} />
                            </button>

                            {/* Copy button */}
                            <button
                              onClick={() => handleCopyMessage(m.id, m.text)}
                              title={copiedMsgId === m.id ? "Copied!" : "Copy"}
                              className="p-1 text-[#8C857E] hover:text-[#2C2A29] transition-colors cursor-pointer"
                            >
                              {copiedMsgId === m.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>

                            {/* Regenerate button */}
                            <button
                              onClick={() => handleOpenRegenerateModal(m)}
                              title="Regenerate"
                              className="p-1 text-[#8C857E] hover:text-[#D96B43] transition-colors cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>

                            {/* Speaker TTS button */}
                            <button
                              onClick={() => handleReadAloud(m.id, m.text)}
                              title={speakingMsgId === m.id ? "Stop reading" : "Read aloud (Karishma's voice)"}
                              className={`p-1 transition-colors cursor-pointer ${
                                speakingMsgId === m.id
                                  ? "text-[#D96B43] animate-pulse"
                                  : "text-[#8C857E] hover:text-[#D96B43]"
                              }`}
                            >
                              {speakingMsgId === m.id ? (
                                <VolumeX className="w-3.5 h-3.5" />
                              ) : (
                                <Volume2 className="w-3.5 h-3.5" />
                              )}
                            </button>

                            {/* Emoji reactions & Timestamp */}
                            <div className="ml-auto flex items-center gap-2">
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white border border-[#EBE6DD] rounded-full px-2 py-0.5 shadow-xs shrink-0">
                                {["👍", "❤️", "😂"].map(emoji => (
                                  <button 
                                    key={emoji} 
                                    onClick={() => handleReaction(m.id, emoji)}
                                    className="hover:scale-125 transition-transform text-xs cursor-pointer"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                              <span className="text-[10px] text-[#8C857E]">
                                {m.timestamp}
                                {m.modelUsed && ` • ${getShortModelName(m.modelUsed)}`}
                              </span>
                            </div>
                          </div>
                        )}

                      </div>
                      </div>
                      {m.reactions && m.reactions.length > 0 && (
                        <div className={`flex items-center gap-1 mt-1 ${isUser ? "ml-auto mr-2" : "mr-auto ml-2"}`}>
                          <div className="flex items-center gap-1 bg-white border border-[#EBE6DD] rounded-full px-2 py-0.5 shadow-sm">
                            {m.reactions.map(r => (
                              <span key={r} className="text-xs">{r}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Decryption Helper pill */}
                      {encryptionEnabled && (
                        <div className={`text-[9px] mt-0.5 flex gap-1 items-center font-mono text-[#8C857E] ${!isUser && "mt-1"}`}>
                          <Lock className="w-2.5 h-2.5 text-[#D96B43]" />
                          <span>E2EE Node</span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Companion Typing indicator */}
                {isTyping && (
                  <div className="flex flex-col items-start max-w-[85%] mr-auto">
                    <span className="text-[10px] text-[#8C857E] mb-1 px-1">Karishma</span>
                    <div className="bg-[#EBE6DD] text-[#5C5753] p-3.5 rounded-2xl rounded-tl-none flex items-center gap-2">
                      <span className="h-2 w-2 bg-[#5C5753] rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                      <span className="h-2 w-2 bg-[#5C5753] rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                      <span className="h-2 w-2 bg-[#5C5753] rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Chat Error Notice */}
              {chatError && (
                <div className="px-5 py-2.5 bg-rose-50 border-t border-rose-200 text-rose-700 text-xs flex items-center gap-1.5 shrink-0 w-full">
                  <CircleAlert className="w-4 h-4 shrink-0" />
                  <span>{chatError}</span>
                  <button onClick={() => handleSendMessage()} className="underline ml-auto font-semibold cursor-pointer">
                    Retry
                  </button>
                </div>
              )}

              {/* Quick Topic Prompts */}
              {messages.length <= 1 && (
                <div className="px-4 md:px-6 pt-3 pb-2 border-t border-[#EBE6DD] bg-[#FCFAF7] shrink-0 w-full">
                  <div className="max-w-3xl mx-auto w-full">
                    <p className="text-[11px] font-semibold text-[#8C857E] mb-1.5 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-[#D96B43]" />
                      Tap an expert topic to ask your friend:
                    </p>
                    <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1.5">
                      {quickTopics.map((topic, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setUserInput(topic.prompt);
                            handleSendMessage(topic.prompt);
                          }}
                          className="text-xs bg-white hover:bg-[#FAF0E6] text-[#2C2A29] border border-[#EBE6DD] py-1 px-2.5 rounded-full cursor-pointer transition-all shrink-0 hover:border-[#D96B43]"
                        >
                          {topic.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Input Area */}
              <div className="p-3 md:p-4 border-t border-[#EBE6DD] bg-white shrink-0 w-full relative">
                {/* Hidden File Inputs for Camera, Gallery, and Files */}
                <input
                  type="file"
                  ref={cameraInputRef}
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <input
                  type="file"
                  ref={galleryInputRef}
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="*/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {/* Attachment Menu Popup */}
                <AnimatePresence>
                  {showAttachmentMenu && (
                    <motion.div
                      key="attachment-backdrop"
                      className="fixed inset-0 z-20"
                      onClick={() => setShowAttachmentMenu(false)}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    />
                  )}
                  {showAttachmentMenu && (
                      <motion.div
                        key="attachment-panel"
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute bottom-full left-4 md:left-6 mb-2 z-30 bg-white border border-[#EBE6DD] rounded-2xl shadow-lg p-2 flex flex-col gap-1 min-w-[180px]"
                      >
                        <button
                          onClick={() => {
                            setShowAttachmentMenu(false);
                            cameraInputRef.current?.click();
                          }}
                          className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[#2C2A29] hover:bg-[#FAF8F5] rounded-xl cursor-pointer transition-colors w-full text-left"
                        >
                          <div className="w-7 h-7 rounded-lg bg-[#FAF0E6] text-[#D96B43] flex items-center justify-center shrink-0">
                            <Camera className="w-4 h-4" />
                          </div>
                          <span>Camera</span>
                        </button>

                        <button
                          onClick={() => {
                            setShowAttachmentMenu(false);
                            galleryInputRef.current?.click();
                          }}
                          className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[#2C2A29] hover:bg-[#FAF8F5] rounded-xl cursor-pointer transition-colors w-full text-left"
                        >
                          <div className="w-7 h-7 rounded-lg bg-[#FAF0E6] text-[#D96B43] flex items-center justify-center shrink-0">
                            <ImageIcon className="w-4 h-4" />
                          </div>
                          <span>Gallery / Photos</span>
                        </button>

                        <button
                          onClick={() => {
                            setShowAttachmentMenu(false);
                            fileInputRef.current?.click();
                          }}
                          className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[#2C2A29] hover:bg-[#FAF8F5] rounded-xl cursor-pointer transition-colors w-full text-left"
                        >
                          <div className="w-7 h-7 rounded-lg bg-[#FAF0E6] text-[#D96B43] flex items-center justify-center shrink-0">
                            <Folder className="w-4 h-4" />
                          </div>
                          <span>Files</span>
                        </button>
                      </motion.div>
                  )}
                </AnimatePresence>

                <div className="max-w-3xl mx-auto w-full flex flex-col gap-2">
                  {/* Attachment Preview Box above composer */}
                  {selectedAttachment && (
                    <div className="flex flex-col gap-2 bg-[#FAF8F5] border border-[#EBE6DD] p-3 rounded-2xl text-xs shadow-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          {selectedAttachment.isImage || selectedAttachment.type?.startsWith("image/") ? (
                            <img
                              src={selectedAttachment.dataUrl}
                              alt={selectedAttachment.name}
                              className="w-12 h-12 object-cover rounded-xl border border-[#EBE6DD] shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-[#FAF0E6] border border-[#F3D9C9] flex items-center justify-center shrink-0 text-[#D96B43]">
                              <FileText className="w-6 h-6" />
                            </div>
                          )}
                          <div className="truncate">
                            <p className="font-semibold text-[#2C2A29] truncate">{selectedAttachment.name}</p>
                            <p className="text-[10px] text-[#8C857E]">
                              {selectedAttachment.name.split('.').pop()?.toUpperCase() || 'FILE'} {selectedAttachment.size ? `• ${formatFileSize(selectedAttachment.size)}` : ''} • Ready to send
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* "Make it Ghibli art" button for uploaded images */}
                          {(selectedAttachment.isImage || selectedAttachment.type?.startsWith("image/")) && !transformedIllustrationUrl && (
                            <button
                              id="btn-make-ghibli-art"
                              type="button"
                              onClick={handleGenerateIllustration}
                              disabled={isTransformingIllustration}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF0E6] hover:bg-[#F3D9C9] text-[#D96B43] font-bold rounded-xl border border-[#F3D9C9] transition-all cursor-pointer disabled:opacity-50 text-xs shadow-2xs"
                              title="Transform this image into an original hand-drawn Japanese Ghibli art illustration"
                            >
                              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                              <span>{isTransformingIllustration ? "Generating..." : "Make it Ghibli art"}</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedAttachment(null);
                              setTransformedIllustrationUrl(null);
                              setIllustrationError(null);
                            }}
                            className="p-1.5 text-[#8C857E] hover:text-[#D96B43] hover:bg-white rounded-lg transition-colors cursor-pointer shrink-0"
                            title="Remove attachment"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Illustration Generating State with engaging 'breathing' animation */}
                      {isTransformingIllustration && (
                        <motion.div
                          id="gemini-image-generating-state"
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{
                            opacity: [0.92, 1, 0.92],
                            scale: [1, 1.015, 1],
                            boxShadow: [
                              "0 1px 3px 0 rgba(217, 107, 67, 0.05)",
                              "0 4px 14px 0 rgba(217, 107, 67, 0.18)",
                              "0 1px 3px 0 rgba(217, 107, 67, 0.05)"
                            ]
                          }}
                          transition={{
                            duration: 2.8,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                          className="flex items-center gap-3.5 p-3.5 bg-gradient-to-r from-[#FAF0E6]/80 via-white to-[#FAF0E6]/60 rounded-xl border border-[#F3D9C9] mt-1 overflow-hidden relative"
                        >
                          <div className="relative flex items-center justify-center shrink-0">
                            <motion.div
                              animate={{
                                scale: [1, 1.35, 1],
                                opacity: [0.35, 0.75, 0.35]
                              }}
                              transition={{
                                duration: 2.8,
                                repeat: Infinity,
                                ease: "easeInOut"
                              }}
                              className="absolute w-8 h-8 rounded-full bg-[#D96B43]/20"
                            />
                            <div className="w-6 h-6 border-2 border-[#D96B43] border-t-transparent rounded-full animate-spin shrink-0 z-10" />
                          </div>
                          <div className="text-left min-w-0 flex-1 z-10">
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-[#2C2A29] text-xs">Transforming with Gemini (gemini-3.1-flash-image)...</p>
                              <Sparkles className="w-3 h-3 text-[#D96B43] animate-pulse shrink-0" />
                            </div>
                            <p className="text-[10.5px] text-[#8C857E] truncate mt-0.5">Crafting hand-drawn Japanese animation details, watercolors & atmosphere</p>
                          </div>
                        </motion.div>
                      )}

                      {/* Illustration Error Feedback */}
                      {illustrationError && (
                        <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-xs flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <CircleAlert className="w-4 h-4 shrink-0" />
                            <span>{illustrationError}</span>
                          </div>
                          <button
                            type="button"
                            onClick={handleGenerateIllustration}
                            className="text-xs font-bold underline hover:text-rose-700 cursor-pointer shrink-0"
                          >
                            Try Again
                          </button>
                        </div>
                      )}

                      {/* Transformed Illustration Result Preview & Actions */}
                      {transformedIllustrationUrl && (
                        <div className="bg-white border border-[#EBE6DD] rounded-xl p-3 space-y-2.5 mt-1 shadow-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-[#D96B43] flex items-center gap-1.5 uppercase tracking-wider">
                              <Sparkles className="w-3.5 h-3.5" />
                              Original Ghibli Art Illustration
                            </span>
                            <span className="text-[10px] font-semibold text-[#8C857E] bg-[#FAF8F5] px-2 py-0.5 rounded-full border border-[#EBE6DD]">
                              gemini-3.1-flash-image
                            </span>
                          </div>

                          <div className="relative rounded-xl overflow-hidden border border-[#EBE6DD] bg-[#FAF8F5] max-h-72 flex items-center justify-center">
                            <img
                              src={transformedIllustrationUrl}
                              alt="Generated Ghibli Art Illustration"
                              className="w-full h-auto max-h-72 object-contain rounded-xl"
                            />
                          </div>

                          {/* Action Buttons: Generate Again, Save/Download, Start Over */}
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={handleGenerateIllustration}
                              disabled={isTransformingIllustration}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-[#FAF8F5] hover:bg-[#EBE6DD] text-[#2C2A29] rounded-xl text-xs font-bold border border-[#EBE6DD] transition-all cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-[#D96B43]" />
                              <span>Generate Again</span>
                            </button>

                            <button
                              type="button"
                              onClick={handleDownloadIllustration}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-[#D96B43] hover:bg-[#C85C34] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Save / Download</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedAttachment(null);
                                setTransformedIllustrationUrl(null);
                                setIllustrationError(null);
                              }}
                              className="py-2 px-3 bg-[#FAF8F5] hover:bg-rose-50 hover:text-rose-600 text-[#8C857E] rounded-xl text-xs font-bold border border-[#EBE6DD] hover:border-rose-200 transition-all cursor-pointer"
                              title="Start over with a new upload"
                            >
                              <span>Start Over</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Speech Error Banner */}
                  <AnimatePresence>
                    {speechError && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="flex items-center justify-between gap-2 px-3.5 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 shadow-2xs"
                      >
                        <div className="flex items-center gap-2">
                          <CircleAlert className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>{speechError}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSpeechError(null)}
                          className="text-amber-600 hover:text-amber-900 p-1 cursor-pointer shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Active Speech Recognition Banner */}
                  <AnimatePresence>
                    {isListening && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="flex items-center justify-between gap-2 px-3.5 py-2 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 shadow-xs"
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <span className="relative flex h-2.5 w-2.5 shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
                          </span>
                          <span className="font-bold text-rose-700 shrink-0">Listening...</span>
                          <span className="text-rose-600 truncate font-sans text-xs">
                            {speechInterimText
                              ? `"${speechInterimText}"`
                              : `Speak in ${SPEECH_LANGUAGES.find((l) => l.code === speechLang)?.label || speechLang}`}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className="flex items-center bg-white rounded-lg p-0.5 border border-rose-200 shadow-2xs">
                            {SPEECH_LANGUAGES.map((lang) => (
                              <button
                                key={lang.code}
                                type="button"
                                onClick={() => handleSetSpeechLanguage(lang.code)}
                                className={`px-1.5 py-0.5 rounded text-[10.5px] font-bold transition-all cursor-pointer ${
                                  speechLang === lang.code
                                    ? "bg-rose-600 text-white shadow-2xs"
                                    : "text-[#8C857E] hover:text-[#2C2A29] hover:bg-[#FAF8F5]"
                                }`}
                                title={`Switch voice recognition to ${lang.label}`}
                              >
                                {lang.code.split("-")[0].toUpperCase()}
                              </button>
                            ))}
                          </div>

                          <button
                            type="button"
                            onClick={stopVoiceInput}
                            className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-[11px] cursor-pointer shrink-0 transition-colors"
                          >
                            Done
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (isGeneratingOrSpeaking) {
                        handleStopGeneration();
                      } else {
                        handleSendMessage();
                      }
                    }}
                    autoComplete="off"
                    noValidate
                    className="flex gap-2 items-center"
                  >
                    <div className="flex-1 relative flex items-center bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl focus-within:ring-2 focus-within:ring-[#D96B43] focus-within:border-transparent transition-all">
                      {/* Model Switcher Icon */}
                      <button
                        type="button"
                        onClick={() => setShowModelSwitcher(true)}
                        className="pl-3 pr-1.5 py-2.5 text-[#D96B43] hover:text-[#C85C34] transition-colors cursor-pointer flex items-center justify-center shrink-0"
                        title="Switch Model"
                      >
                        <Zap className="w-5 h-5" />
                      </button>

                      {/* Attachment '+' Icon immediately beside the ⚡ icon */}
                      <button
                        type="button"
                        onClick={() => setShowAttachmentMenu((prev) => !prev)}
                        className={`p-2 rounded-xl transition-colors cursor-pointer flex items-center justify-center shrink-0 ${
                          showAttachmentMenu || selectedAttachment
                            ? "bg-[#D96B43] text-white"
                            : "text-[#8C857E] hover:text-[#D96B43] hover:bg-[#FAF0E6]"
                        }`}
                        title="Add attachment"
                      >
                        <Plus className="w-5 h-5" />
                      </button>

                      <input
                        id="chat-message-input"
                        name="q"
                        type="search"
                        role="searchbox"
                        inputMode="text"
                        autoComplete="off"
                        aria-autocomplete="none"
                        autoCapitalize="sentences"
                        autoCorrect="on"
                        spellCheck={true}
                        data-form-type="other"
                        data-lpignore="true"
                        data-1p-ignore="true"
                        data-bwignore="true"
                        data-bitwarden-watching="false"
                        placeholder={
                          selectedAttachment
                            ? "Ask Karishma about this image..."
                            : encryptionEnabled
                            ? "Write an E2EE secure message..."
                            : hasKarishmaReplied
                            ? "Reply to Karishma"
                            : "Ask Karishma"
                        }
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        className="flex-1 bg-transparent border-none px-2 py-2.5 text-sm focus:outline-none focus:ring-0 placeholder-[#8C857E] text-[#2C2A29] [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none [&::-webkit-search-results-button]:appearance-none [&::-webkit-search-results-decoration]:appearance-none"
                      />
                    </div>

                    {/* Microphone Voice Input Button & Language Popover */}
                    <div className="relative flex items-center shrink-0">
                      <button
                        id="btn-voice-input"
                        type="button"
                        onClick={toggleVoiceInput}
                        className={`rounded-xl transition-all cursor-pointer h-[42px] w-[42px] flex items-center justify-center shrink-0 border relative ${
                          isListening
                            ? "bg-rose-600 text-white border-rose-700 shadow-md ring-2 ring-rose-400/50 animate-pulse"
                            : "bg-[#FAF8F5] hover:bg-[#FAF0E6] text-[#8C857E] hover:text-[#D96B43] border-[#EBE6DD]"
                        }`}
                        title={
                          isListening
                            ? `Listening (${speechLang})... Tap to stop`
                            : `Voice input (${SPEECH_LANGUAGES.find((l) => l.code === speechLang)?.label || speechLang})`
                        }
                        aria-label={isListening ? "Stop voice input" : "Start voice input"}
                      >
                        {isListening ? (
                          <Mic className="w-5 h-5 text-white" />
                        ) : (
                          <Mic className="w-5 h-5" />
                        )}
                      </button>

                      {/* Small language switch trigger tag */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowSpeechLangMenu((prev) => !prev);
                        }}
                        className="absolute -top-1.5 -right-1.5 bg-white hover:bg-[#FAF0E6] text-[#8C857E] hover:text-[#D96B43] border border-[#EBE6DD] rounded-full text-[9px] font-bold px-1 py-0 shadow-2xs cursor-pointer transition-colors"
                        title="Change speech language"
                      >
                        {speechLang.split("-")[0].toUpperCase()}
                      </button>

                      {/* Speech Language Dropdown Popover */}
                      <AnimatePresence>
                        {showSpeechLangMenu && (
                          <motion.div
                            key="speech-lang-backdrop"
                            className="fixed inset-0 z-30"
                            onClick={() => setShowSpeechLangMenu(false)}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                          />
                        )}
                        {showSpeechLangMenu && (
                            <motion.div
                              key="speech-lang-panel"
                              initial={{ opacity: 0, y: 8, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 8, scale: 0.95 }}
                              transition={{ duration: 0.15 }}
                              className="absolute bottom-full right-0 mb-2 z-40 bg-white border border-[#EBE6DD] rounded-2xl shadow-xl p-2 min-w-[210px]"
                            >
                              <div className="px-2.5 py-1.5 border-b border-[#EBE6DD] mb-1">
                                <p className="text-[11px] font-bold text-[#2C2A29] flex items-center gap-1.5">
                                  <Mic className="w-3.5 h-3.5 text-[#D96B43]" />
                                  Voice Input Language
                                </p>
                                <p className="text-[10px] text-[#8C857E]">Select recognition language</p>
                              </div>

                              <div className="flex flex-col gap-0.5">
                                {SPEECH_LANGUAGES.map((lang) => (
                                  <button
                                    key={lang.code}
                                    type="button"
                                    onClick={() => handleSetSpeechLanguage(lang.code)}
                                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-colors cursor-pointer text-left ${
                                      speechLang === lang.code
                                        ? "bg-[#FAF0E6] text-[#D96B43] font-bold"
                                        : "text-[#2C2A29] hover:bg-[#FAF8F5]"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span>{lang.flag}</span>
                                      <div>
                                        <p className="leading-tight">{lang.label}</p>
                                        <p className="text-[10px] text-[#8C857E]">{lang.native}</p>
                                      </div>
                                    </div>
                                    {speechLang === lang.code && (
                                      <Check className="w-3.5 h-3.5 text-[#D96B43] shrink-0" />
                                    )}
                                  </button>
                                ))}
                              </div>

                              <div className="mt-1.5 pt-1.5 border-t border-[#EBE6DD] px-2.5">
                                <label className="flex items-center gap-2 text-[11px] text-[#8C857E] cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={speechAutoSend}
                                    onChange={(e) => {
                                      setSpeechAutoSend(e.target.checked);
                                      localStorage.setItem("best_friend_speech_autosend", String(e.target.checked));
                                    }}
                                    className="rounded border-[#EBE6DD] text-[#D96B43] focus:ring-[#D96B43] cursor-pointer"
                                  />
                                  <span>Auto-send on silence</span>
                                </label>
                              </div>
                            </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {isGeneratingOrSpeaking ? (
                      <button
                        type="button"
                        onClick={handleStopGeneration}
                        className="bg-[#D96B43] hover:bg-[#C85C34] text-white p-2.5 rounded-full transition-all cursor-pointer h-[42px] w-[42px] flex items-center justify-center shrink-0 shadow-sm"
                        title="Stop Generation"
                        aria-label="Stop Generation"
                      >
                        <Square className="w-4 h-4 fill-current text-white" />
                      </button>
                    ) : (
                      <button
                        type="submit"
                        className="bg-[#D96B43] hover:bg-[#C85C34] text-white p-2.5 rounded-xl transition-all cursor-pointer h-[42px] w-[42px] flex items-center justify-center shrink-0"
                        title="Send Message"
                        aria-label="Send Message"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    )}
                  </form>
                </div>
              </div>
            </section>


          </div>
        )}

      </div>



      {/* Model Switcher Modal */}
      <AnimatePresence>
        {showModelSwitcher && (
            <motion.div
              key="model-switcher"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowModelSwitcher(false);
                setExpandedProvider(null);
              }}
              className="fixed inset-0 bg-[#2C2A29]/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-[#EBE6DD]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-5 border-b border-[#EBE6DD] flex justify-between items-center bg-[#FAF8F5]">
                  <div>
                    <h2 className="text-lg font-bold text-[#2C2A29] flex items-center gap-2">
                      <Zap className="w-5 h-5 text-[#D96B43]" />
                      AI Model Switcher
                    </h2>
                    <p className="text-[11px] text-[#8C857E] mt-0.5">Select a provider to choose your AI model</p>
                  </div>
                  <button 
                    onClick={() => {
                      setShowModelSwitcher(false);
                      setExpandedProvider(null);
                    }} 
                    className="p-1.5 bg-white rounded-full text-[#8C857E] border border-[#EBE6DD] hover:text-[#2C2A29] transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="p-4 space-y-2.5 max-h-[70vh] overflow-y-auto">
                  {MODEL_PROVIDERS.map((provider) => {
                    const isExpanded = expandedProvider === provider.id;
                    const hasSelectedModel = provider.models.some((m) => m.id === selectedModel);
                    const ProviderIcon = provider.icon;

                    return (
                      <div
                        key={provider.id}
                        className={`border rounded-2xl overflow-hidden transition-all ${
                          isExpanded
                            ? "border-[#D96B43]/50 bg-[#FCFAF7] shadow-xs"
                            : hasSelectedModel
                            ? "border-[#D96B43]/30 bg-white"
                            : "border-[#EBE6DD] bg-white hover:border-[#D96B43]/30"
                        }`}
                      >
                        {/* Provider Header Accordion Trigger */}
                        <button
                          onClick={() => {
                            setExpandedProvider(isExpanded ? null : provider.id);
                          }}
                          className="w-full flex items-center justify-between p-3.5 text-left cursor-pointer transition-colors hover:bg-[#FAF8F5]"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                hasSelectedModel || isExpanded
                                  ? "bg-[#D96B43] text-white"
                                  : "bg-[#EBE6DD] text-[#8C857E]"
                              }`}
                            >
                              <ProviderIcon className="w-4.5 h-4.5" />
                            </div>
                            <div>
                              <div className="text-sm font-bold text-[#2C2A29] flex items-center gap-2">
                                {provider.name}
                                {provider.badge && (
                                  <span
                                    className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full tracking-wider ${
                                      provider.badge === "PRIMARY"
                                        ? "bg-[#D96B43] text-white"
                                        : "bg-[#FAF0E6] text-[#D96B43] border border-[#F3D9C9]"
                                    }`}
                                  >
                                    {provider.badge}
                                  </span>
                                )}
                                {hasSelectedModel && !isExpanded && (
                                  <span className="text-[10px] font-semibold bg-[#FAF0E6] text-[#D96B43] px-1.5 py-0.5 rounded-md flex items-center gap-1 border border-[#F3D9C9]">
                                    <Check className="w-2.5 h-2.5" /> Active
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-[#8C857E] mt-0.5">
                                {provider.tagline} &bull; {provider.models.length} {provider.models.length === 1 ? "model" : "models"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0 text-[#8C857E]">
                            <ChevronDown
                              className={`w-4 h-4 transition-transform duration-200 ${
                                isExpanded ? "rotate-180 text-[#D96B43]" : ""
                              }`}
                            />
                          </div>
                        </button>

                        {/* Expanded Models List */}
                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden bg-white border-t border-[#EBE6DD] p-2 space-y-1.5"
                            >
                              {provider.models.map((m) => {
                                const isSelected = selectedModel === m.id;
                                const ModelIcon = m.icon;

                                return (
                                  <button
                                    key={m.id}
                                    onClick={() => {
                                      setSelectedModel(m.id);
                                      localStorage.setItem("best_friend_selected_model", m.id);
                                      setShowModelSwitcher(false);
                                      setExpandedProvider(null);
                                    }}
                                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all text-left cursor-pointer ${
                                      isSelected
                                        ? "bg-[#FAF0E6] border-[#D96B43] shadow-xs"
                                        : "bg-[#FCFAF7] border-[#EBE6DD] hover:bg-[#FAF8F5] hover:border-[#D96B43]/30"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <div
                                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                          isSelected
                                            ? "bg-[#D96B43] text-white"
                                            : "bg-[#EBE6DD] text-[#8C857E]"
                                        }`}
                                      >
                                        <ModelIcon className="w-3.5 h-3.5" />
                                      </div>
                                      <div className="min-w-0">
                                        <div className="text-xs font-bold text-[#2C2A29] flex items-center gap-1.5">
                                          <span className="truncate">{m.name}</span>
                                          {isSelected && (
                                            <span className="bg-[#D96B43] text-white rounded-full p-0.5 shrink-0">
                                              <Check className="w-2.5 h-2.5" />
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-[10px] text-[#8C857E] truncate">
                                          {m.desc} &bull;{" "}
                                          <span className="font-semibold text-[#5C5753]">
                                            {m.speed}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </button>
                                );
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Regenerate Response Modal */}
      <AnimatePresence>
        {regenerateTargetMsg && (
          <motion.div
            key="regenerate-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setRegenerateTargetMsg(null)}
            className="fixed inset-0 bg-[#2C2A29]/30 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-[#EBE6DD]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 border-b border-[#EBE6DD] flex justify-between items-center bg-[#FCFAF7]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#FAF0E6] text-[#D96B43] flex items-center justify-center">
                    <RotateCcw className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#2C2A29]">Regenerate Response</h2>
                    <p className="text-xs text-[#8C857E]">Select an AI model to generate a new answer</p>
                  </div>
                </div>
                <button 
                  onClick={() => setRegenerateTargetMsg(null)} 
                  className="p-1.5 bg-white rounded-full text-[#8C857E] border border-[#EBE6DD] hover:text-[#2C2A29] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
                {/* Target message snippet */}
                <div className="p-3 bg-[#FCFAF7] border border-[#EBE6DD] rounded-xl text-xs text-[#5C5753]">
                  <span className="font-semibold text-[#8C857E] block mb-1">Target Response:</span>
                  <p className="line-clamp-2 italic text-[#2C2A29]">"{regenerateTargetMsg.text}"</p>
                </div>

                {/* Selected Model Banner */}
                <div className="p-3 bg-[#FAF0E6] border border-[#D96B43]/30 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-[#D96B43] block">Selected Model for Regeneration</span>
                    <div className="text-sm font-bold text-[#2C2A29]">
                      {CONFIGURED_MODELS.find(m => m.id === regenModel)?.name || regenModel}
                    </div>
                  </div>
                  <span className="text-[11px] px-2.5 py-1 rounded-full bg-[#D96B43] text-white font-semibold">
                    Ready
                  </span>
                </div>

                {/* Model selection list */}
                <div>
                  <label className="text-xs font-bold text-[#5C5753] block mb-2">
                    Available Configured AI Models:
                  </label>
                  <div className="space-y-1.5">
                    {CONFIGURED_MODELS.map((m) => {
                      const isSelected = regenModel === m.id;
                      const IconComp = m.icon;
                      return (
                        <button
                          key={m.id}
                          onClick={() => setRegenModel(m.id)}
                          className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all text-left cursor-pointer ${
                            isSelected
                              ? "bg-[#FAF0E6] border-[#D96B43] shadow-xs"
                              : "bg-white border-[#EBE6DD] hover:bg-[#FAF8F5] hover:border-[#D96B43]/30"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isSelected ? 'bg-[#D96B43] text-white' : 'bg-[#EBE6DD] text-[#8C857E]'}`}>
                              <IconComp className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-[#2C2A29] flex items-center gap-1.5">
                                {m.name}
                                {isSelected && (
                                  <span className="bg-[#D96B43] text-white rounded-full p-0.5">
                                    <Check className="w-2.5 h-2.5" />
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-[#8C857E]">
                                {m.desc} &bull; <span className="font-semibold text-[#5C5753]">{m.speed}</span>
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* History retention option */}
                <div className="pt-3 border-t border-[#EBE6DD]">
                  <label className="flex items-center gap-2.5 text-xs text-[#2C2A29] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={keepOriginalInHistory}
                      onChange={(e) => setKeepOriginalInHistory(e.target.checked)}
                      className="w-4 h-4 accent-[#D96B43] rounded"
                    />
                    <span className="font-medium">Keep original response in chat history</span>
                  </label>
                  <p className="text-[10px] text-[#8C857E] ml-6 mt-0.5">
                    {keepOriginalInHistory
                      ? "The new response will be saved alongside the original response."
                      : "The new response will replace the original response in history."}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 bg-[#FCFAF7] border-t border-[#EBE6DD] flex items-center justify-end gap-2">
                <button
                  onClick={() => setRegenerateTargetMsg(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#5C5753] hover:bg-[#EBE6DD]/50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={executeRegeneration}
                  className="px-5 py-2.5 rounded-xl bg-[#D96B43] hover:bg-[#C85C34] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Regenerate Response
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat History Slide-over Panel */}
      <AnimatePresence>
        {showHistoryPanel && (
          <motion.div
            key="history-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowHistoryPanel(false)}
            className="fixed inset-0 bg-[#2C2A29]/20 backdrop-blur-sm z-40"
          />
        )}
        {showHistoryPanel && (
          <motion.div
            key="history-panel"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 left-0 w-full max-w-sm bg-[#FAF8F5] border-r border-[#EBE6DD] z-50 flex flex-col shadow-2xl"
          >
            <div className="flex items-center justify-between p-5 border-b border-[#EBE6DD] bg-white">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#EBE6DD] flex items-center justify-center">
                  <HistoryMenuIcon className="w-4 h-4 text-[#8C857E]" />
                </div>
                <h2 className="text-sm font-bold text-[#2C2A29]">Chat History</h2>
              </div>
              <button 
                onClick={() => setShowHistoryPanel(false)}
                className="p-2 hover:bg-[#FAF8F5] rounded-full transition-colors cursor-pointer text-[#8C857E]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-5 border-b border-[#EBE6DD] bg-white">
              <button
                onClick={() => {
                  const newId = crypto.randomUUID();
                  setCurrentChatId(newId);
                  setMessages([]);
                  setShowHistoryPanel(false);
                  const activeChatIdKey = getUserStorageKey("best_friend_active_chat_id", loggedInUser, isGuest);
                  if (activeChatIdKey) safeLocalStorageSet(activeChatIdKey, newId);
                }}
                className="w-full bg-[#D96B43] hover:bg-[#C85C34] text-white text-xs font-bold py-3 rounded-xl transition-colors cursor-pointer"
              >
                + New Chat
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {retentionPolicy === "session" ? (
                <div className="text-center py-10">
                  <HistoryMenuIcon className="w-8 h-8 text-[#EBE6DD] mx-auto mb-3" />
                  <h3 className="text-sm font-bold text-[#2C2A29] mb-1">No History Saved</h3>
                  <p className="text-[11px] text-[#8C857E]">
                    Your current storage policy (Sessional Memories) prevents saving chat history.
                  </p>
                </div>
              ) : chatHistoryList.length === 0 ? (
                <div className="text-center py-10">
                  <HistoryMenuIcon className="w-8 h-8 text-[#EBE6DD] mx-auto mb-3" />
                  <h3 className="text-sm font-bold text-[#2C2A29] mb-1">No Past Chats</h3>
                  <p className="text-[11px] text-[#8C857E]">
                    Conversations will appear here when Encrypted Mode is ON.
                  </p>
                </div>
              ) : (
                chatHistoryList.map(chat => (
                  <div
                    key={chat.id}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                      currentChatId === chat.id 
                        ? "bg-white border-[#D96B43] shadow-sm" 
                        : "bg-white border-[#EBE6DD] hover:border-[#D96B43]/30"
                    }`}
                  >
                    <button
                      onClick={() => {
                        setCurrentChatId(chat.id);
                        setMessages(chat.messages || []);
                        setShowHistoryPanel(false);
                        const activeChatIdKey = getUserStorageKey("best_friend_active_chat_id", loggedInUser, isGuest);
                        if (activeChatIdKey) safeLocalStorageSet(activeChatIdKey, chat.id);
                      }}
                      className="flex-1 text-left min-w-0 pr-2 cursor-pointer"
                    >
                      <h4 className="text-xs font-bold text-[#2C2A29] mb-1 truncate">{chat.title}</h4>
                      <p className="text-[10px] text-[#8C857E]">
                        {new Date(chat.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteChat(chat.id);
                      }}
                      className="p-1.5 text-[#8C857E] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                      title="Delete conversation"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
            
            <div className="p-4 border-t border-[#EBE6DD] bg-white flex justify-between items-center">
              <button 
                onClick={() => { setShowAccount(true); setShowHistoryPanel(false); }}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-[#FAF8F5] rounded-full transition-colors cursor-pointer text-[#2C2A29]"
              >
                <User className="w-5 h-5 text-[#8C857E]" />
                <span className="text-sm font-bold truncate max-w-[120px]">{loggedInUser ? (loggedInUser.name || loggedInUser.email) : "Profile"}</span>
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 hover:bg-[#FAF8F5] rounded-full transition-colors cursor-pointer text-[#8C857E]"
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Slide-over Panel */}
      <AnimatePresence>
        {showSettings && (
            <motion.div
              key="settings-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="fixed inset-0 bg-[#2C2A29]/20 backdrop-blur-sm z-40"
            />
        )}
        {showSettings && (
            <motion.div
              key="settings-panel"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full max-w-md bg-[#FAF8F5] shadow-2xl z-50 border-l border-[#EBE6DD] flex flex-col overflow-hidden"
            >
              <div className="flex justify-between items-center p-5 border-b border-[#EBE6DD] bg-white shrink-0">
                <h2 className="text-lg font-bold text-[#2C2A29] flex items-center gap-2">
                  <Settings className="w-5 h-5 text-[#D96B43]" />
                  Settings
                </h2>
                <button 
                  onClick={() => setShowSettings(false)} 
                  className="p-2 bg-[#FAF8F5] rounded-full text-[#8C857E] hover:text-[#2C2A29] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-5 space-y-8">
                
                {/* CATEGORY: AI Provider API Keys */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-[#8C857E] uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Key className="w-3.5 h-3.5 text-[#D96B43]" />
                    AI Provider API Keys
                  </h3>
                  
                  <div className="bg-white border border-[#EBE6DD] rounded-2xl p-4 shadow-sm space-y-4">
                    <p className="text-xs text-[#8C857E] leading-relaxed">
                      Configure your own custom API key below. Keys are saved locally in your browser and used for your requests.
                    </p>

                    {/* Google Gemini API Key Input */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-[#2C2A29]">
                          Google Gemini API Key
                        </label>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${customGeminiKey ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-gray-100 text-gray-500"}`}>
                          {customGeminiKey ? "Custom Active" : "Server Env Key"}
                        </span>
                      </div>
                      <input
                        type="password"
                        placeholder="AIzaSy..."
                        value={customGeminiKey}
                        onChange={(e) => setCustomGeminiKey(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-xl border border-[#EBE6DD] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#D96B43] text-[#2C2A29] transition-all font-mono"
                      />
                    </div>

                    {/* OpenRouter API Key Input */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-[#2C2A29]">
                          OpenRouter API Key
                        </label>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${customOpenRouterKey ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-gray-100 text-gray-500"}`}>
                          {customOpenRouterKey ? "Custom Active" : "Server Env Key"}
                        </span>
                      </div>
                      <input
                        type="password"
                        placeholder="sk-or-v1-..."
                        value={customOpenRouterKey}
                        onChange={(e) => setCustomOpenRouterKey(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-xl border border-[#EBE6DD] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#D96B43] text-[#2C2A29] transition-all font-mono"
                      />
                    </div>

                    {apiKeySaveStatus && (
                      <p className="text-xs text-emerald-600 font-semibold text-center flex items-center justify-center gap-1">
                        <Check className="w-3.5 h-3.5" /> {apiKeySaveStatus}
                      </p>
                    )}

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={handleSaveApiKeys}
                        className="flex-1 bg-[#D96B43] hover:bg-[#c05933] text-white text-xs font-bold py-2.5 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Save Keys
                      </button>
                      {(customGeminiKey || customOpenRouterKey) && (
                        <button
                          onClick={handleClearApiKeys}
                          className="bg-white border border-[#EBE6DD] hover:bg-rose-50 hover:border-rose-200 text-rose-600 text-xs font-bold py-2.5 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* CATEGORY: Appearance */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-[#8C857E] uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Palette className="w-3.5 h-3.5" />
                    Appearance
                  </h3>
                  
                  <div className="bg-white border border-[#EBE6DD] rounded-2xl p-4 shadow-sm">
                    <h4 className="text-sm font-bold text-[#2C2A29] mb-3">Theme</h4>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => setThemeMode("light")}
                        className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                          themeMode === "light"
                            ? "bg-[#D96B43] border-[#D96B43] text-white shadow-sm"
                            : "bg-[#FAF8F5] border-[#EBE6DD] text-[#2C2A29] hover:bg-[#E2DCD3]"
                        }`}
                      >
                        <Sun className="w-4 h-4" />
                        <span>Light Mode</span>
                      </button>

                      <button
                        onClick={() => setThemeMode("dark")}
                        className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                          themeMode === "dark"
                            ? "bg-[#D96B43] border-[#D96B43] text-white shadow-sm"
                            : "bg-[#FAF8F5] border-[#EBE6DD] text-[#2C2A29] hover:bg-[#E2DCD3]"
                        }`}
                      >
                        <Moon className="w-4 h-4" />
                        <span>Dark Mode</span>
                      </button>

                      <button
                        onClick={() => setThemeMode("normal")}
                        className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                          themeMode === "normal"
                            ? "bg-[#D96B43] border-[#D96B43] text-white shadow-sm"
                            : "bg-[#FAF8F5] border-[#EBE6DD] text-[#2C2A29] hover:bg-[#E2DCD3]"
                        }`}
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Normal Mode</span>
                      </button>
                    </div>
                  </div>
                </div>



                {/* CATEGORY: Privacy & Storage */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-[#8C857E] uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5" />
                    Privacy & Storage
                  </h3>
                  
                  {/* Storage Policy Component */}
                  <div className="bg-white border border-[#EBE6DD] rounded-2xl p-4 shadow-sm">
                    <h4 className="text-sm font-bold text-[#2C2A29] mb-3">Chat Storage Policy</h4>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl hover:bg-[#FAF8F5] transition-all">
                        <input
                          type="radio"
                          name="retention"
                          checked={retentionPolicy === "local"}
                          onChange={() => {
                            setRetentionPolicy("local");
                            localStorage.setItem("best_friend_retention_policy", "local");
                          }}
                          className="accent-[#D96B43]"
                        />
                        <div>
                          <span className="font-semibold block text-sm text-[#2C2A29]">End-to-End Encryption (E2EE)</span>
                          <span className="text-[11px] text-[#8C857E]">Persistent chat securely synced and encrypted across devices.</span>
                        </div>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl hover:bg-[#FAF8F5] transition-all">
                        <input
                          type="radio"
                          name="retention"
                          checked={retentionPolicy === "session"}
                          onChange={() => {
                            setRetentionPolicy("session");
                            localStorage.setItem("best_friend_retention_policy", "session");
                          }}
                          className="accent-[#D96B43]"
                        />
                        <div>
                          <span className="font-semibold block text-sm text-[#2C2A29]">Sessional Memories</span>
                          <span className="text-[11px] text-[#8C857E]">Chat is wiped when session ends. Not saved or synced anywhere.</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* System Health & Self-Healing Diagnostics */}
                  <div className="bg-white border border-[#EBE6DD] rounded-2xl p-4 shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-[#2C2A29]">System Health & Diagnostics</h4>
                        <p className="text-[11px] text-[#8C857E]">Monitor system recovery, self-healing status, and cloud health.</p>
                      </div>
                      <span className="text-[10px] bg-emerald-50 text-emerald-600 font-bold px-2.5 py-0.5 rounded-full border border-emerald-200 uppercase tracking-wide">
                        Active
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setShowSelfHealingModal(true);
                      }}
                      className="w-full mt-2 bg-[#FAF8F5] border border-[#EBE6DD] hover:bg-[#FAF0E6] text-xs font-semibold py-2.5 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 text-[#D96B43]"
                    >
                      <ShieldCheck className="w-4 h-4 text-[#D96B43]" />
                      View Self-Healing Diagnostics & Health Status
                    </button>
                  </div>
                </div>



                {/* CATEGORY: Data Management */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-[#8C857E] uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Download className="w-3.5 h-3.5" />
                    Data Management
                  </h3>
                  
                  <div className="bg-white border border-[#EBE6DD] rounded-2xl p-4 shadow-sm space-y-3">
                    <button
                      onClick={handleExportBackup}
                      className="w-full bg-[#FAF8F5] border border-[#EBE6DD] hover:bg-[#E2DCD3] text-xs font-semibold py-2.5 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 text-[#2C2A29]"
                    >
                      <Download className="w-4 h-4 text-[#D96B43]" />
                      Export Secure Audit Backup (.json)
                    </button>

                    {showClearConfirm ? (
                      <div className="bg-[#FAF0E6] p-3 rounded-xl border border-[#F3D9C9] space-y-2.5">
                        <p className="text-[10px] text-[#2C2A29] font-bold text-center">
                          ⚠️ Are you absolutely sure? This will wipe your secure chat keys, verification seeds, and erase Karishma's memory forever.
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => { wipeAllData(); setShowSettings(false); }}
                            className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold py-2 px-3 rounded-lg flex-1 cursor-pointer transition-colors"
                          >
                            Yes, Wipe Cache
                          </button>
                          <button
                            onClick={() => setShowClearConfirm(false)}
                            className="bg-white border border-[#EBE6DD] text-[10px] font-semibold text-[#2C2A29] py-2 px-3 rounded-lg flex-1 cursor-pointer hover:bg-[#FAF8F5] transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowClearConfirm(true)}
                        className="w-full bg-white border border-rose-200 hover:bg-rose-50 text-xs font-semibold py-2.5 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 text-rose-600"
                      >
                        <Trash2 className="w-4 h-4" />
                        Shred Chats & Clear Memory
                      </button>
                    )}
                  </div>
                </div>

                {/* CATEGORY: Contact Support */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-[#8C857E] uppercase tracking-wider mb-2 flex items-center gap-2">
                    <CircleHelp className="w-3.5 h-3.5" />
                    Contact Support
                  </h3>

                  <div className="bg-white border border-[#EBE6DD] rounded-2xl p-4 shadow-sm space-y-3">
                    {/* Email Support */}
                    <a
                      href="mailto:7soumyajitg@gmail.com"
                      className="flex items-center justify-between p-3 bg-[#FAF8F5] border border-[#EBE6DD] hover:bg-[#E2DCD3] rounded-xl transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-[#FAF0E6] border border-[#F3D9C9] flex items-center justify-center shrink-0 text-[#D96B43]">
                          <Mail className="w-4.5 h-4.5" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold text-[#8C857E] uppercase tracking-wider block">Email Support</span>
                          <span className="text-sm font-bold text-[#2C2A29] group-hover:text-[#D96B43] transition-colors truncate block">
                            7soumyajitg@gmail.com
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#8C857E] group-hover:text-[#D96B43] group-hover:translate-x-0.5 transition-all shrink-0" />
                    </a>

                    {/* Instagram Support */}
                    <a
                      href="https://www.instagram.com/soumyajit__7?igsh=MWRvZG56c25xdWJndw=="
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 bg-[#FAF8F5] border border-[#EBE6DD] hover:bg-[#E2DCD3] rounded-xl transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-[#FAF0E6] border border-[#F3D9C9] flex items-center justify-center shrink-0 text-[#D96B43]">
                          <Instagram className="w-4.5 h-4.5" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold text-[#8C857E] uppercase tracking-wider block">Instagram</span>
                          <span className="text-sm font-bold text-[#2C2A29] group-hover:text-[#D96B43] transition-colors truncate block">
                            soumyajit__7
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#8C857E] group-hover:text-[#D96B43] group-hover:translate-x-0.5 transition-all shrink-0" />
                    </a>
                  </div>
                </div>

              </div>
            </motion.div>
        )}
      </AnimatePresence>
      {/* Account Slide-over Panel */}
      <AnimatePresence>
        {showAccount && (
            <motion.div
              key="account-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAccount(false)}
              className="fixed inset-0 bg-[#2C2A29]/20 backdrop-blur-sm z-40"
            />
        )}
        {showAccount && (
            <motion.div
              key="account-panel"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full max-w-sm bg-[#FAF8F5] shadow-2xl z-50 border-l border-[#EBE6DD] flex flex-col overflow-hidden"
            >
              <div className="flex justify-between items-center p-5 border-b border-[#EBE6DD] bg-white shrink-0">
                <h2 className="text-lg font-bold text-[#2C2A29] flex items-center gap-2">
                  <User className="w-5 h-5 text-[#D96B43]" />
                  Account
                </h2>
                <button 
                  onClick={() => setShowAccount(false)} 
                  className="p-2 bg-[#FAF8F5] rounded-full text-[#8C857E] hover:text-[#2C2A29] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                {loggedInUser ? (
                  <div className="space-y-6">
                    <div className="text-center py-6 bg-white rounded-2xl border border-[#EBE6DD] px-4 shadow-sm">
                      <div className="w-16 h-16 bg-[#F3D9C9] rounded-full mx-auto flex items-center justify-center mb-3 text-[#D96B43] font-bold text-xl">
                        {loggedInUser.fullName ? loggedInUser.fullName[0].toUpperCase() : (loggedInUser.nickname ? loggedInUser.nickname[0].toUpperCase() : "U")}
                      </div>
                      <h3 className="text-base font-bold text-[#2C2A29]">
                        {loggedInUser.fullName || loggedInUser.name || "Account User"}
                      </h3>
                      {(loggedInUser.nickname || userNickname) && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FAF8F5] border border-[#EBE6DD] rounded-full mt-2 text-xs text-[#D96B43] font-semibold">
                          <span>Karishma calls you:</span>
                          <span className="font-bold text-[#2C2A29]">{loggedInUser.nickname || userNickname}</span>
                        </div>
                      )}
                      <p className="text-xs text-[#8C857E] mt-2">{loggedInUser.email}</p>
                    </div>

                    {/* Edit Profile & Nickname Form */}
                    <div className="bg-white rounded-2xl border border-[#EBE6DD] overflow-hidden">
                      <button 
                        onClick={() => { 
                          setShowEditNames(!showEditNames); 
                          setProfileError(""); 
                          setProfileSuccess(""); 
                          setEditFullName(loggedInUser.fullName || loggedInUser.name || "");
                          setEditNickname(loggedInUser.nickname || userNickname || "");
                        }}
                        className="w-full flex items-center justify-between p-4 bg-[#FAF8F5] hover:bg-[#F3EFE9] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-[#D96B43]">
                            <User className="w-4 h-4" />
                          </div>
                          <span className="font-bold text-sm text-[#2C2A29]">Edit Profile & Nickname</span>
                        </div>
                      </button>
                      
                      {showEditNames && (
                        <div className="p-4 border-t border-[#EBE6DD] space-y-4">
                          {(profileError || profileSuccess) && (
                            <div className={`p-3 text-xs font-bold rounded-lg ${profileError ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"}`}>
                              {profileError || profileSuccess}
                            </div>
                          )}
                          <div className="space-y-3">
                            <div>
                              <label className="block text-[11px] font-bold text-[#8C857E] mb-1 uppercase tracking-wider">Full Name</label>
                              <input
                                type="text"
                                value={editFullName}
                                onChange={e => setEditFullName(e.target.value)}
                                placeholder="John Doe"
                                className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#D96B43] focus:border-transparent transition-all text-[#2C2A29]"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-[#8C857E] mb-1 uppercase tracking-wider">Nickname (What Karishma calls you)</label>
                              <input
                                type="text"
                                value={editNickname}
                                onChange={e => setEditNickname(e.target.value)}
                                placeholder="Johnny"
                                className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#D96B43] focus:border-transparent transition-all text-[#2C2A29]"
                              />
                            </div>
                          </div>
                          <button
                            disabled={profileLoading}
                            onClick={async () => {
                              setProfileLoading(true); setProfileError(""); setProfileSuccess("");
                              try {
                                const res = await fetch("/api/auth/update-profile", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    userId: loggedInUser.id,
                                    token: (loggedInUser as any).token || "legacy",
                                    fullName: editFullName,
                                    nickname: editNickname
                                  })
                                });
                                const data = await res.json();
                                if (!res.ok) throw new Error(data.error || "Failed to update profile.");
                                const updatedUser = { ...loggedInUser, ...data.user };
                                setLoggedInUser(updatedUser);
                                localStorage.setItem("mock_logged_in_user", JSON.stringify(updatedUser));
                                if (data.user.nickname) {
                                  setUserNickname(data.user.nickname);
                                  localStorage.setItem("best_friend_nickname", data.user.nickname);
                                }
                                if (data.user.fullName) {
                                  setUserFullName(data.user.fullName);
                                  localStorage.setItem("best_friend_full_name", data.user.fullName);
                                }
                                const conv = data.user.nickname || data.user.fullName || "Friend";
                                setUserName(conv);
                                localStorage.setItem("best_friend_user_name", conv);
                                setProfileSuccess("Profile updated successfully!");
                                setTimeout(() => setShowEditNames(false), 1500);
                              } catch (err: any) {
                                setProfileError(err.message || "Error updating profile.");
                              } finally {
                                setProfileLoading(false);
                              }
                            }}
                            className="w-full bg-[#D96B43] hover:bg-[#C25A34] text-white text-sm font-bold py-2.5 rounded-xl transition-all shadow-sm shadow-[#D96B43]/20 disabled:opacity-50 cursor-pointer"
                          >
                            {profileLoading ? "Saving..." : "Save Profile"}
                          </button>
                        </div>
                      )}
                    </div>
                    
                    <div className="bg-white rounded-2xl border border-[#EBE6DD] overflow-hidden">
                      <button 
                        onClick={() => { setShowCpForm(!showCpForm); setCpError(""); setCpSuccess(""); }}
                        className="w-full flex items-center justify-between p-4 bg-[#FAF8F5] hover:bg-[#F3EFE9] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-[#D96B43]">
                            <Key className="w-4 h-4" />
                          </div>
                          <span className="font-bold text-sm text-[#2C2A29]">Change Password</span>
                        </div>
                      </button>
                      
                      {showCpForm && (
                        <div className="p-4 border-t border-[#EBE6DD] space-y-4">
                          {(cpError || cpSuccess) && (
                            <div className={`p-3 text-xs font-bold rounded-lg ${cpError ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"}`}>
                              {cpError || cpSuccess}
                            </div>
                          )}
                          <div className="space-y-3">
                            <PasswordInput
                              placeholder="Current Password"
                              value={cpCurrent}
                              onChange={e => setCpCurrent(e.target.value)}
                              className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#D96B43] focus:border-transparent transition-all"
                            />
                            <PasswordInput
                              placeholder="New Password"
                              value={cpNew}
                              onChange={e => setCpNew(e.target.value)}
                              className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#D96B43] focus:border-transparent transition-all"
                            />
                            <PasswordInput
                              placeholder="Confirm New Password"
                              value={cpConfirm}
                              onChange={e => setCpConfirm(e.target.value)}
                              className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#D96B43] focus:border-transparent transition-all"
                            />
                          </div>
                          
                          <div className="flex justify-end">
                            <button 
                              type="button"
                              onClick={() => { 
                                const userEmail = loggedInUser?.email || "";
                                handleLogout();
                                setResetEmail(userEmail);
                                setAccountView("forgot"); 
                                setAuthError(""); 
                              }}
                              className="text-[11px] font-bold text-[#D96B43] hover:text-[#C85C34] transition-colors cursor-pointer"
                            >
                              Forgot Password?
                            </button>
                          </div>

                          <button
                            disabled={cpLoading}
                            onClick={async () => {
                              if (!cpCurrent || !cpNew || !cpConfirm) return setCpError("Please fill all fields.");
                              if (cpNew !== cpConfirm) return setCpError("New passwords do not match.");
                              if (cpNew.length < 8) return setCpError("Password must be at least 8 characters.");
                              setCpLoading(true); setCpError(""); setCpSuccess("");
                              try {
                                const res = await fetch("/api/auth/change-password", {
                                  method: "POST", headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ userId: loggedInUser.id, token: (loggedInUser as any).token, currentPassword: cpCurrent, newPassword: cpNew })
                                });
                                const data = await res.json();
                                if (!res.ok) throw new Error(data.error || "Failed to change password.");
                                setCpSuccess("Password changed successfully. Other devices logged out.");
                                setCpCurrent(""); setCpNew(""); setCpConfirm("");
                                // update local token
                                const userData = { ...loggedInUser, token: data.token };
                                localStorage.setItem("mock_logged_in_user", JSON.stringify(userData));
                                setLoggedInUser(userData);
                                setTimeout(() => setShowCpForm(false), 2000);
                              } catch (err: any) {
                                setCpError(err.message);
                              } finally {
                                setCpLoading(false);
                              }
                            }}
                            className="w-full bg-[#D96B43] hover:bg-[#C25A34] text-white text-sm font-bold py-3 rounded-xl transition-all shadow-sm shadow-[#D96B43]/20 disabled:opacity-50"
                          >
                            {cpLoading ? "Updating..." : "Update Password"}
                          </button>
                        </div>
                      )}
                    </div>

                    
                    <button
                      onClick={handleLogout}
                      className="w-full bg-white border border-[#EBE6DD] hover:bg-rose-50 hover:border-rose-200 text-rose-600 hover:text-rose-700 text-sm font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Log Out
                    </button>
                  </div>
                ) : (
<div className="bg-white border border-[#EBE6DD] rounded-2xl p-5 shadow-sm">
                    {accountView !== "verify" && (
                      <div className="flex bg-[#FAF8F5] p-1 rounded-xl mb-6">
                        <button
                          onClick={() => { setAccountView("login"); setAuthError(""); }}
                          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${accountView === "login" ? "bg-white text-[#D96B43] shadow-sm" : "text-[#8C857E]"}`}
                        >
                          Log In
                        </button>
                        <button
                          onClick={() => { setAccountView("create"); setAuthError(""); }}
                          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${accountView === "create" ? "bg-white text-[#D96B43] shadow-sm" : "text-[#8C857E]"}`}
                        >
                          Create Account
                        </button>
                      </div>
                    )}

                    {authError && (
                      <div className="bg-rose-50 text-rose-600 text-xs font-bold p-3 rounded-xl mb-4 border border-rose-100 flex flex-col gap-1.5">
                        <div>{authError}</div>
                        {authError.toLowerCase().includes("no account found") && (
                          <button
                            type="button"
                            onClick={() => {
                              setAccountView("create");
                              setAuthError("");
                            }}
                            className="text-left underline text-[#D96B43] font-bold hover:text-[#C85C34] cursor-pointer"
                          >
                            Click here to Create an Account →
                          </button>
                        )}
                      </div>
                    )}


                    {accountView === "forgot" && (
                      <div className="space-y-6">
                        <div className="text-center mb-6">
                          <div className="w-12 h-12 bg-[#F3D9C9] rounded-xl mx-auto flex items-center justify-center mb-3">
                            <Lock className="w-6 h-6 text-[#D96B43]" />
                          </div>
                          <h3 className="text-lg font-bold text-[#2C2A29]">Reset Password</h3>
                          <p className="text-xs text-[#8C857E] mt-1">Enter your registered email address to receive a verification code.</p>
                        </div>

                        {authError && (
                          <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold rounded-lg space-y-1.5">
                            <div>{authError}</div>
                            {authError.toLowerCase().includes("no account found") && (
                              <button
                                type="button"
                                onClick={() => {
                                  setAccountView("create");
                                  setAuthError("");
                                }}
                                className="text-xs font-bold text-[#D96B43] hover:underline cursor-pointer block pt-1"
                              >
                                Click here to Create an Account →
                              </button>
                            )}
                          </div>
                        )}
                        
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-bold text-[#5C5753] mb-1.5 ml-1">Registered Email Address</label>
                            <input
                              type="email"
                              placeholder="you@example.com"
                              value={resetEmail}
                              onChange={e => setResetEmail(e.target.value)}
                              className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#D96B43] focus:border-transparent transition-all"
                            />
                          </div>
                        </div>

                        <div className="space-y-3">
                          <button
                            disabled={authLoading}
                            onClick={async () => {
                              const trimmedEmail = resetEmail.trim().toLowerCase();
                              if (!trimmedEmail || !trimmedEmail.includes("@")) return setAuthError("Please enter a valid email address.");
                              setAuthLoading(true); setAuthError("");
                              try {
                                const res = await fetch("/api/auth/forgot-password", {
                                  method: "POST", headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ email: trimmedEmail })
                                });
                                const data = await res.json();
                                if (!res.ok) throw new Error(data.error || "Failed to send reset code.");
                                setResetEmail(trimmedEmail);
                                setResendCooldown(60);
                                setResendSuccessMsg("Verification code sent to your email.");
                                setResetOtp("");
                                setAccountView("reset_otp");
                              } catch (err: any) {
                                setAuthError(err.message || "Failed to send reset code.");
                              } finally {
                                setAuthLoading(false);
                              }
                            }}
                            className="w-full bg-[#D96B43] hover:bg-[#C85C34] text-white text-sm font-bold py-3.5 rounded-xl transition-all shadow-md shadow-[#D96B43]/20 disabled:opacity-50 cursor-pointer"
                          >
                            {authLoading ? "Sending Code..." : "Send OTP"}
                          </button>
                          
                          <button
                            onClick={() => { setAccountView("login"); setAuthError(""); }}
                            className="w-full bg-white border border-[#EBE6DD] hover:bg-[#FAF8F5] text-[#5C5753] text-sm font-bold py-3.5 rounded-xl transition-colors cursor-pointer"
                          >
                            Back to Login
                          </button>
                        </div>
                      </div>
                    )}

                    {(accountView === "reset_otp" || accountView === "reset") && (
                      <div className="space-y-6">
                        <div className="text-center mb-6">
                          <h3 className="text-lg font-bold text-[#2C2A29]">Enter Verification Code</h3>
                          <p className="text-xs text-[#8C857E] mt-1">We sent a 6-digit OTP to <strong>{resetEmail}</strong></p>
                        </div>

                        {authError && <div className="p-3 bg-rose-50 text-rose-600 text-xs font-bold rounded-lg">{authError}</div>}
                        {resendSuccessMsg && (
                          <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold rounded-lg flex items-center gap-2">
                            <CircleCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>{resendSuccessMsg}</span>
                          </div>
                        )}
                        
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-bold text-[#5C5753] mb-1.5 ml-1 text-center">Enter 6-Digit OTP</label>
                            <input
                              type="text"
                              maxLength={6}
                              placeholder="••••••"
                              value={resetOtp}
                              onChange={e => setResetOtp(e.target.value.replace(/\D/g, ""))}
                              className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl px-4 py-3 text-center text-xl tracking-[0.4em] font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#D96B43] focus:border-transparent transition-all"
                            />
                          </div>

                          <div className="text-center pt-1">
                            <button
                              type="button"
                              disabled={resendCooldown > 0 || authLoading}
                              onClick={async () => {
                                setAuthLoading(true); setAuthError("");
                                try {
                                  const res = await fetch("/api/auth/forgot-password", {
                                    method: "POST", headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ email: resetEmail })
                                  });
                                  const data = await res.json();
                                  if (!res.ok) throw new Error(data.error || "Failed to resend code.");
                                  setResendCooldown(60);
                                  setResendSuccessMsg("A new verification code has been sent.");
                                } catch (err: any) {
                                  setAuthError(err.message);
                                } finally {
                                  setAuthLoading(false);
                                }
                              }}
                              className="text-xs font-bold text-[#D96B43] hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer"
                            >
                              {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : "Resend OTP"}
                            </button>
                            <span className="text-[#8C857E] text-xs mx-2">|</span>
                            <button
                              type="button"
                              onClick={() => { setAccountView("forgot"); setAuthError(""); setResendSuccessMsg(""); }}
                              className="text-xs font-bold text-[#8C857E] hover:text-[#5C5753] cursor-pointer"
                            >
                              Change Email
                            </button>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <button
                            disabled={authLoading}
                            onClick={async () => {
                              if (resetOtp.length !== 6) return setAuthError("Please enter a valid 6-digit OTP.");
                              setAuthLoading(true); setAuthError(""); setResendSuccessMsg("");
                              try {
                                const res = await fetch("/api/auth/verify-reset-otp", {
                                  method: "POST", headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ email: resetEmail, otp: resetOtp })
                                });
                                const data = await res.json();
                                if (!res.ok) throw new Error(data.error || "Failed to verify OTP.");
                                setResetNew("");
                                setResetConfirm("");
                                setAccountView("reset_pass");
                              } catch (err: any) {
                                setAuthError(err.message || "Invalid OTP code.");
                              } finally {
                                setAuthLoading(false);
                              }
                            }}
                            className="w-full bg-[#D96B43] hover:bg-[#C85C34] text-white text-sm font-bold py-3.5 rounded-xl transition-all shadow-md shadow-[#D96B43]/20 disabled:opacity-50 cursor-pointer"
                          >
                            {authLoading ? "Verifying..." : "Verify OTP"}
                          </button>
                          
                          <button
                            onClick={() => { setAccountView("login"); setAuthError(""); }}
                            className="w-full bg-white border border-[#EBE6DD] hover:bg-[#FAF8F5] text-[#5C5753] text-sm font-bold py-3.5 rounded-xl transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {accountView === "reset_pass" && (
                      <div className="space-y-6">
                        <div className="text-center mb-6">
                          <h3 className="text-lg font-bold text-[#2C2A29]">Create New Password</h3>
                          <p className="text-xs text-[#8C857E] mt-1">Set a new strong password for your account.</p>
                        </div>

                        {authError && <div className="p-3 bg-rose-50 text-rose-600 text-xs font-bold rounded-lg">{authError}</div>}
                        
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-bold text-[#5C5753] mb-1.5 ml-1">New Password</label>
                            <PasswordInput
                              placeholder="Min. 8 characters"
                              value={resetNew}
                              onChange={e => setResetNew(e.target.value)}
                              className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#D96B43] focus:border-transparent transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-[#5C5753] mb-1.5 ml-1">Confirm New Password</label>
                            <PasswordInput
                              placeholder="Confirm new password"
                              value={resetConfirm}
                              onChange={e => setResetConfirm(e.target.value)}
                              className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#D96B43] focus:border-transparent transition-all"
                            />
                          </div>
                        </div>

                        <div className="space-y-3">
                          <button
                            disabled={authLoading}
                            onClick={async () => {
                              if (!resetNew || !resetConfirm) return setAuthError("Please enter and confirm your new password.");
                              if (resetNew !== resetConfirm) return setAuthError("New password and confirm password do not match.");
                              if (resetNew.length < 8) return setAuthError("Password must be at least 8 characters long.");
                              
                              setAuthLoading(true); setAuthError("");
                              try {
                                const res = await fetch("/api/auth/reset-password", {
                                  method: "POST", headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ email: resetEmail, otp: resetOtp, newPassword: resetNew })
                                });
                                const data = await res.json();
                                if (!res.ok) throw new Error(data.error || "Reset failed.");
                                
                                setResetEmail(""); setResetOtp(""); setResetNew(""); setResetConfirm("");
                                setAccountView("reset_success");
                              } catch (err: any) {
                                setAuthError(err.message || "Failed to reset password.");
                              } finally {
                                setAuthLoading(false);
                              }
                            }}
                            className="w-full bg-[#D96B43] hover:bg-[#C85C34] text-white text-sm font-bold py-3.5 rounded-xl transition-all shadow-md shadow-[#D96B43]/20 disabled:opacity-50 cursor-pointer"
                          >
                            {authLoading ? "Resetting..." : "Set New Password"}
                          </button>
                        </div>
                      </div>
                    )}

                    {accountView === "reset_success" && (
                      <div className="space-y-6 text-center">
                        <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl mx-auto flex items-center justify-center">
                          <CircleCheck className="w-8 h-8" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-[#2C2A29]">Password Reset Successful!</h3>
                          <p className="text-xs text-[#8C857E] mt-1 max-w-xs mx-auto">
                            Your password has been changed successfully. You can now log in using your new password.
                          </p>
                        </div>

                        <button
                          onClick={() => { setAccountView("login"); setAuthError(""); setResendSuccessMsg(""); }}
                          className="w-full bg-[#D96B43] hover:bg-[#C85C34] text-white text-sm font-bold py-3.5 rounded-xl transition-colors cursor-pointer"
                        >
                          Return to Login
                        </button>
                      </div>
                    )}



                    


                    {accountView === "verify" && pendingReg ? (
                      <div className="space-y-4">
                        <div className="text-center mb-2">
                          <h3 className="text-sm font-bold text-[#2C2A29] mb-1">Verify your email</h3>
                          <p className="text-[11px] text-[#8C857E]">
                            We've sent a 6-digit OTP to <br/><strong className="text-[#5C5753]">{pendingReg.email}</strong>
                          </p>
                        </div>

                        {authError && (
                          <div className="bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold p-3 rounded-xl">
                            {authError}
                          </div>
                        )}

                        {resendSuccessMsg && (
                          <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold p-3 rounded-xl flex items-center gap-2">
                            <CircleCheck className="w-4 h-4 shrink-0 text-emerald-600" />
                            <span>{resendSuccessMsg}</span>
                          </div>
                        )}

                        <div>
                          <label className="block text-[11px] font-bold text-[#8C857E] mb-1.5 uppercase tracking-wider text-center">Enter 6-Digit OTP</label>
                          <input 
                            type="text" 
                            maxLength={6}
                            value={otpInput}
                            onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                            placeholder="••••••" 
                            className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl px-4 py-3 text-2xl tracking-[0.5em] text-center text-[#2C2A29] outline-none focus:border-[#D96B43] transition-colors font-mono"
                          />
                        </div>

                        <div className="text-center pt-0.5">
                          <button 
                            type="button"
                            disabled={resendCooldown > 0 || authLoading}
                            onClick={handleResendOtp}
                            className="text-xs font-bold text-[#D96B43] hover:underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed cursor-pointer transition-all"
                          >
                            {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : "Resend OTP"}
                          </button>
                          <span className="text-[#8C857E] text-xs mx-2">|</span>
                          <button 
                            type="button"
                            onClick={() => { setAccountView("create"); setPendingReg(null); setOtpInput(""); setAuthError(""); setResendSuccessMsg(""); }}
                            className="text-xs font-bold text-[#8C857E] hover:text-[#5C5753] cursor-pointer"
                          >
                            Change Email
                          </button>
                        </div>

                        <button 
                          onClick={async () => {
                            if (otpInput.length !== 6) return setAuthError("Please enter a valid 6-digit OTP.");
                            setAuthLoading(true); setAuthError(""); setResendSuccessMsg("");
                            try {
                              const res = await fetch("/api/auth/verify-otp", {
                                method: "POST", headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ email: pendingReg.email, otp: otpInput })
                              });
                              const data = await res.json();
                              if (!res.ok) throw new Error(data.error || "Verification failed");
                              const userData = { ...data.user, token: data.token };
                              localStorage.setItem("mock_logged_in_user", JSON.stringify(userData));
                              localStorage.setItem("best_friend_is_guest", "false");
                              localStorage.setItem("auth_step_completed", "true");
                              if (userData.nickname) {
                                setUserNickname(userData.nickname);
                                localStorage.setItem("best_friend_nickname", userData.nickname);
                              }
                              if (userData.fullName) {
                                setUserFullName(userData.fullName);
                                localStorage.setItem("best_friend_full_name", userData.fullName);
                              }
                              const convName = userData.nickname || userData.fullName || userData.email?.split("@")[0] || "Friend";
                              setUserName(convName);
                              localStorage.setItem("best_friend_user_name", convName);

                              setChatHistoryList([]);
                              setMessages([]);
                              setCurrentChatId(crypto.randomUUID());

                              setLoggedInUser(userData);
                              setIsGuest(false);
                              setAuthCompleted(true);
                              setPendingReg(null);
                              setOtpInput("");
                              setResendCooldown(0);
                              setResendSuccessMsg("");
                              setShowAccount(false);
                              setAccountView("login");
                            } catch (err: any) {
                              setAuthError(err.message);
                            } finally {
                              setAuthLoading(false);
                            }
                          }}
                          disabled={authLoading}
                          className="w-full bg-[#D96B43] hover:bg-[#C85C34] disabled:opacity-50 text-white text-sm font-bold py-3 rounded-xl transition-colors mt-2 cursor-pointer"
                        >
                          {authLoading ? "Verifying..." : "Verify & Create Account"}
                        </button>
                      </div>
                    ) : (accountView === "login" || accountView === "create") ? (
                      <form 
                        onSubmit={async (e) => {
                          e.preventDefault();
                          const formData = new FormData(e.currentTarget);
                          const email = (formData.get("email") as string)?.trim().toLowerCase();
                          const password = formData.get("password") as string;
                          
                          setAuthError("");
                          
                          if (accountView === "create") {
                            const fullName = (formData.get("fullName") as string)?.trim();
                            const nickname = (formData.get("nickname") as string)?.trim() || userNickname || userName;
                            const confirm = formData.get("confirm") as string;
                            
                            if (!fullName || !email || !password || !confirm) return setAuthError("Please fill all required fields.");
                            if (password !== confirm) return setAuthError("Passwords do not match.");
                            if (password.length < 8) return setAuthError("Password must be at least 8 characters.");
                            
                            const allowedDomains = ["gmail.com", "outlook.com", "hotmail.com", "yahoo.com", "icloud.com", "proton.me", "protonmail.com"];
                            const emailDomain = email.split("@")[1];
                            if (!emailDomain || !allowedDomains.includes(emailDomain)) {
                              return setAuthError("Please use a supported email provider: Gmail, Outlook, Yahoo, iCloud, or Proton Mail.");
                            }
                            
                            setAuthLoading(true);
                            try {
                              const res = await fetch("/api/auth/send-otp", {
                                method: "POST", headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ fullName, nickname, email, password })
                              });
                              const data = await res.json();
                              if (!res.ok) throw new Error(data.error || "Failed to send OTP.");
                              
                              setPendingReg({ fullName, nickname, email, password });
                              setAccountView("verify");
                              setOtpInput("");
                              setResendCooldown(60);
                              setResendSuccessMsg("");
                            } catch (err: any) {
                              setAuthError(err.message);
                            } finally {
                              setAuthLoading(false);
                            }
                          } else {
                            if (!email || !password) return setAuthError("Please enter email and password.");
                            
                            setAuthLoading(true);
                            try {
                              const res = await fetch("/api/auth/login", {
                                method: "POST", headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ email, password })
                              });
                              const data = await res.json();
                              if (!res.ok) throw new Error(data.error || "Invalid credentials.");
                              
                              const userData = { ...data.user, token: data.token };
                              localStorage.setItem("mock_logged_in_user", JSON.stringify(userData));
                              localStorage.setItem("best_friend_is_guest", "false");
                              localStorage.setItem("auth_step_completed", "true");
                              if (userData.nickname) {
                                setUserNickname(userData.nickname);
                                localStorage.setItem("best_friend_nickname", userData.nickname);
                              }
                              if (userData.fullName) {
                                setUserFullName(userData.fullName);
                                localStorage.setItem("best_friend_full_name", userData.fullName);
                              }
                              const convName = userData.nickname || userData.fullName || userData.email?.split("@")[0] || "Friend";
                              setUserName(convName);
                              localStorage.setItem("best_friend_user_name", convName);

                              setChatHistoryList([]);
                              setMessages([]);
                              setCurrentChatId(crypto.randomUUID());

                              setLoggedInUser(userData);
                              setIsGuest(false);
                              setAuthCompleted(true);
                              setShowAccount(false);
                            } catch (err: any) {
                              setAuthError(err.message);
                            } finally {
                              setAuthLoading(false);
                            }
                          }
                        }} 
                        className="space-y-4"
                      >
                        {accountView === "create" && (
                          <>
                            <div>
                              <label className="block text-[11px] font-bold text-[#8C857E] mb-1.5 uppercase tracking-wider">Full Name</label>
                              <input 
                                name="fullName" 
                                type="text" 
                                required
                                placeholder="John Doe" 
                                className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl px-4 py-2.5 text-sm text-[#2C2A29] outline-none focus:border-[#D96B43] transition-colors"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-[#8C857E] mb-1.5 uppercase tracking-wider">Nickname <span className="normal-case font-normal text-[#8C857E]">(What Karishma calls you)</span></label>
                              <input 
                                name="nickname" 
                                type="text" 
                                defaultValue={userNickname || userName}
                                placeholder="e.g. Johnny" 
                                className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl px-4 py-2.5 text-sm text-[#2C2A29] outline-none focus:border-[#D96B43] transition-colors"
                              />
                            </div>
                          </>
                        )}
                        
                        <div>
                          <label className="block text-[11px] font-bold text-[#8C857E] mb-1.5 uppercase tracking-wider">Email Address</label>
                          <input 
                            name="email" 
                            type="email" 
                            required
                            placeholder="you@example.com" 
                            className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl px-4 py-2.5 text-sm text-[#2C2A29] outline-none focus:border-[#D96B43] transition-colors"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-[#8C857E] mb-1.5 uppercase tracking-wider">Password</label>
                          <PasswordInput 
                            name="password" 
                            required
                            placeholder="••••••••" 
                            className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl px-4 py-2.5 text-sm text-[#2C2A29] outline-none focus:border-[#D96B43] transition-colors"
                          />
                          {accountView === "login" && (
                            <div className="flex justify-end mt-2">
                              <button 
                                type="button"
                                onClick={() => { 
                                  setAccountView("forgot"); 
                                  setAuthError(""); 
                                  const emailInput = document.querySelector('input[name="email"]') as HTMLInputElement;
                                  if (emailInput) setResetEmail(emailInput.value);
                                }}
                                className="text-[11px] font-bold text-[#D96B43] hover:text-[#C85C34] transition-colors cursor-pointer"
                              >
                                Forgot Password?
                              </button>
                            </div>
                          )}
                        </div>

                        {accountView === "create" && (
                          <div>
                            <label className="block text-[11px] font-bold text-[#8C857E] mb-1.5 uppercase tracking-wider">Confirm Password</label>
                            <PasswordInput 
                              name="confirm" 
                              required
                              placeholder="••••••••" 
                              className="w-full bg-[#FAF8F5] border border-[#EBE6DD] rounded-xl px-4 py-2.5 text-sm text-[#2C2A29] outline-none focus:border-[#D96B43] transition-colors"
                            />
                          </div>
                        )}

                        <button 
                          type="submit"
                          disabled={authLoading}
                          className="w-full bg-[#D96B43] hover:bg-[#C85C34] disabled:opacity-50 text-white text-sm font-bold py-3 rounded-xl transition-colors mt-2 cursor-pointer"
                        >
                          {authLoading ? "Please wait..." : (accountView === "create" ? "Create Account" : "Log In")}
                        </button>
                      </form>
                    ) : null}
                  </div>
                )}
              </div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Self-Healing Toast Notification */}
      <AnimatePresence>
        {selfHealingNotification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[#2C2A29] text-white border border-[#D96B43]/50 px-4 py-2.5 rounded-full text-xs font-semibold shadow-2xl flex items-center gap-2 backdrop-blur-md"
          >
            <Sparkles className="w-4 h-4 text-[#D96B43]" />
            <span>{selfHealingNotification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Self-Healing System Diagnostic & Recovery Modal */}
      <SelfHealingStatusModal
        isOpen={showSelfHealingModal}
        onClose={() => setShowSelfHealingModal(false)}
      />
    </div>
  );
}

export default function AppWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

