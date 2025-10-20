const NETWORK_ERROR_PATTERNS = [
  'failed to fetch',
  'networkerror',
  'network request failed',
  'load failed',
  'network connection was lost',
];

export const OFFLINE_MESSAGE = "You're offline. Reconnect and retry.";
export const NETWORK_RETRY_MESSAGE = "We couldn't reach the server. Check your connection and try again.";
export const PLAN_LIMIT_MESSAGE = "You've hit your plan limit. Upgrade or try a lower-cost model.";
export const SESSION_EXPIRED_MESSAGE = "Your session expired. Log back in to continue.";
export const UPLOAD_FAILURE_MESSAGE = "We couldn't read that image. Re-upload or use a different format.";
export const DOWNLOAD_FAILURE_MESSAGE = "We couldn't download the file. Save image locally instead.";
export const GOOGLE_EMAIL_MESSAGE = "We couldn't read your Google email—try email login instead.";
export const INVALID_CREDENTIALS_MESSAGE = "Check your email & password, then try again.";

// Payment-related error messages
export const PAYMENT_FAILED_MESSAGE = "Your payment failed. Please check your payment method and try again.";
export const PAYMENT_CANCELLED_MESSAGE = "Payment was cancelled. No charges were made.";
export const PAYMENT_PROCESSING_MESSAGE = "Your payment is being processed. This may take a few minutes.";
export const INSUFFICIENT_CREDITS_MESSAGE = "You don't have enough credits. Purchase more credits to continue.";
export const SUBSCRIPTION_EXISTS_MESSAGE = "You already have an active subscription. Use the upgrade option instead.";
export const WEBHOOK_DELAY_MESSAGE = "Payment confirmation is taking longer than expected. Don't worry, we're processing it.";

export type AuthErrorContext = "login" | "signup" | "forgot-password" | "reset-password";

const AUTH_FALLBACK_MESSAGES: Record<AuthErrorContext, string> = {
  login: "We couldn’t log you in right now. Try again or reset your password.",
  signup: "We couldn’t create your account. Double-check your details and try again.",
  "forgot-password": "We couldn’t send that reset link. Try again or contact support.",
  "reset-password": "We couldn’t update your password. Request a new link or try again.",
};

const PLAN_LIMIT_PATTERNS = [
  "plan limit",
  "out of credits",
  "insufficient credit",
  "quota",
];

const SESSION_EXPIRED_PATTERNS = [
  "session expired",
  "token expired",
  "unauthorized",
  "not authenticated",
];

const GOOGLE_EMAIL_PATTERNS = [
  "google",
  "email",
];

const PAYMENT_ERROR_PATTERNS = [
  "payment failed",
  "card declined",
  "insufficient funds",
  "expired card",
  "invalid card",
  "payment method",
];

const SUBSCRIPTION_ERROR_PATTERNS = [
  "already have",
  "active subscription",
  "duplicate subscription",
  "subscription exists",
];

const WEBHOOK_DELAY_PATTERNS = [
  "webhook",
  "processing",
  "pending",
  "delayed",
];

export function isOffline(): boolean {
  return typeof navigator !== "undefined" && navigator && navigator.onLine === false;
}

export function getOfflineOrNetworkMessage(error?: unknown): string | null {
  if (isOffline()) {
    return OFFLINE_MESSAGE;
  }

  if (error instanceof Error) {
    const normalized = error.message.toLowerCase();
    if (NETWORK_ERROR_PATTERNS.some((pattern) => normalized.includes(pattern))) {
      return NETWORK_RETRY_MESSAGE;
    }
  }

  return null;
}

function normalizeMessage(message: string | null | undefined): string {
  return (message ?? "").trim();
}

function includesAll(haystack: string, needles: string[]): boolean {
  return needles.every((needle) => haystack.includes(needle));
}

export function resolveApiErrorMessage({
  status,
  message,
  fallback,
  context,
}: {
  status?: number;
  message?: string | null;
  fallback?: string;
  context?: "generation" | "download" | "upload" | "auth";
}): string {
  const normalizedMessage = normalizeMessage(message);
  const lower = normalizedMessage.toLowerCase();

  if (status === 401 || SESSION_EXPIRED_PATTERNS.some((pattern) => lower.includes(pattern))) {
    return SESSION_EXPIRED_MESSAGE;
  }

  if (status === 402 || status === 403 || status === 429 || PLAN_LIMIT_PATTERNS.some((pattern) => lower.includes(pattern))) {
    return PLAN_LIMIT_MESSAGE;
  }

  if (context === "download") {
    return normalizedMessage || DOWNLOAD_FAILURE_MESSAGE;
  }

  if (context === "upload") {
    return normalizedMessage || UPLOAD_FAILURE_MESSAGE;
  }

  if (normalizedMessage) {
    return normalizedMessage;
  }

  return fallback ?? "We couldn’t complete that request. Try again in a moment.";
}

export function resolveAuthErrorMessage(error: unknown, context: AuthErrorContext, options?: { rawMessage?: string | null }): string {
  const offlineMessage = getOfflineOrNetworkMessage(error);
  if (offlineMessage) {
    return offlineMessage;
  }

  const raw = options?.rawMessage ?? (error instanceof Error ? error.message : null);
  const normalizedRaw = normalizeMessage(raw);
  const lower = normalizedRaw.toLowerCase();

  if (!normalizedRaw) {
    return AUTH_FALLBACK_MESSAGES[context];
  }

  if (lower.includes("invalid email or password")) {
    return INVALID_CREDENTIALS_MESSAGE;
  }

  if (lower.includes("email is already registered") || lower.includes("already exists")) {
    return "An account with this email already exists. Try logging in instead.";
  }

  if (lower.includes("valid email")) {
    return "Enter a valid email address to continue.";
  }

  if (lower.includes("password must be at least")) {
    return "Password must be at least 8 characters long.";
  }

  if (includesAll(lower, GOOGLE_EMAIL_PATTERNS)) {
    return GOOGLE_EMAIL_MESSAGE;
  }

  if (lower.includes("reset token")) {
    return "This reset link is invalid or expired. Request a new one.";
  }

  if (lower.includes("passwords do not match")) {
    return "Passwords do not match. Re-enter them and try again.";
  }

  if (lower.includes("not found") && context === "forgot-password") {
    return "We can’t find an account with that email. Try a different email or sign up.";
  }

  return normalizedRaw || AUTH_FALLBACK_MESSAGES[context];
}

export function resolveGoogleCredentialError(message?: string | null): string {
  const normalized = normalizeMessage(message);
  const lower = normalized.toLowerCase();
  if (includesAll(lower, GOOGLE_EMAIL_PATTERNS)) {
    return GOOGLE_EMAIL_MESSAGE;
  }
  return normalized || GOOGLE_EMAIL_MESSAGE;
}

export function resolveGenerationCatchError(error: unknown, fallback?: string): string {
  const offlineMessage = getOfflineOrNetworkMessage(error);
  if (offlineMessage) {
    return offlineMessage;
  }
  if (error instanceof Error && normalizeMessage(error.message)) {
    return error.message;
  }
  return fallback ?? "We couldn't generate that. Try again in a moment.";
}

export function resolvePaymentErrorMessage(error: unknown, context?: "subscription" | "credits" | "general"): string {
  const offlineMessage = getOfflineOrNetworkMessage(error);
  if (offlineMessage) {
    return offlineMessage;
  }

  const raw = error instanceof Error ? error.message : String(error);
  const normalized = normalizeMessage(raw);
  const lower = normalized.toLowerCase();

  if (!normalized) {
    return PAYMENT_FAILED_MESSAGE;
  }

  // Check for subscription-specific errors
  if (context === "subscription" && SUBSCRIPTION_ERROR_PATTERNS.some(pattern => lower.includes(pattern))) {
    return SUBSCRIPTION_EXISTS_MESSAGE;
  }

  // Check for credit-related errors
  if (lower.includes("insufficient") && lower.includes("credit")) {
    return INSUFFICIENT_CREDITS_MESSAGE;
  }

  // Check for payment method errors
  if (PAYMENT_ERROR_PATTERNS.some(pattern => lower.includes(pattern))) {
    return PAYMENT_FAILED_MESSAGE;
  }

  // Check for webhook delay patterns
  if (WEBHOOK_DELAY_PATTERNS.some(pattern => lower.includes(pattern))) {
    return WEBHOOK_DELAY_MESSAGE;
  }

  // Check for cancellation
  if (lower.includes("cancelled") || lower.includes("canceled")) {
    return PAYMENT_CANCELLED_MESSAGE;
  }

  return normalized || PAYMENT_FAILED_MESSAGE;
}

export function resolveSubscriptionErrorMessage(error: unknown): string {
  return resolvePaymentErrorMessage(error, "subscription");
}

export function resolveCreditErrorMessage(error: unknown): string {
  return resolvePaymentErrorMessage(error, "credits");
}
