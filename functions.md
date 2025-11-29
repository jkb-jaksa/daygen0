# FUNCTIONS.md — Daygen Frontend Function Reference

> Scope: **Frontend** codebase (core exported functions & hooks).  
> Format is optimized for LLM ingestion: consistent headings, terse bullets, predictable fields.

---

## Conventions
- **Signature**: TypeScript-style, return type at end.
- **Module**: Absolute path from `src/`.
- **Purpose**: One-liner describing what the function does.
- **Inputs**: Name → short description (optional/defaults noted).
- **Returns**: Type(s) and what they represent.
- **Notes**: Tricky behavior, side effects, or usage tips.

---

## API & Network
### `getApiUrl(path: string) -> string`
Builds full API URLs based on current environment variables.

### `getBaseUrl() -> string`
Normalizes frontend origin for local/production.

---

## Auth & Context
### `useAuth()`
Provides `{ user, token, logOut, signIn, signUp }`.

### `logOut()`
Clears token, resets session, and logs out globally.

### `getToken()`
Returns bearer token from `AuthContext` or localStorage.

---

## Error Handling
### `resolveApiErrorMessage(error, context?)`
Converts raw backend or fetch errors into readable UI text.

### `resolveAuthErrorMessage(error)`
Handles invalid credentials, expired tokens, or signup issues.

### `resolveGenerationCatchError(error)`
Maps image generation errors to messages shown in UI.

---

## Storage Utilities
### `getPersistedValue(prefix, key)`
Reads a JSON value from IndexedDB/localStorage.

### `setPersistedValue(prefix, key, value)`
Writes to local persistent storage.

### `removePersistedValue(prefix, key)`
Removes a specific value from storage.

### `estimateStorage()`
Queries storage quota/usage for cache management.

---

## Gallery
### `serializeGallery(records)`
Converts gallery items to plain JSON for saving.

### `hydrateStoredGallery(records)`
Rehydrates gallery data into app-friendly structure.

### `useGalleryImages()`
Fetches and merges gallery data from backend and cache.

---

## Hooks — Image Generation
### `useFluxImageGeneration()`
Generates images using Flux model; polls until completion.

### `useGeminiImageGeneration()`
Handles Gemini-based generation via unified endpoint.

### `useChatGPTImageGeneration()`
Image generation via OpenAI/ChatGPT image endpoint.

### `useQwenImageGeneration()`
Triggers Qwen image generation and waits for completion.

### `useReveImageGeneration()`
Polls until Rêve image generation completes.

---

## Models
### `normalizeModelId(id)`
Maps alternate model names to canonical IDs.

### `getModelInfo(id)`
Returns metadata for a specific model.

### `getModelDisplayName(id)`
Human-readable label for a model.

### `isModelAvailable(id)`
Returns `true` if the model is supported.

---

## Avatars & Products
### `deriveAvatarSlug(name)`
Generates a unique slug for an avatar.

### `normalizeStoredAvatars(list)`
Ensures avatar records are consistent and complete.

### `createAvatarRecord({...})`
Constructs new avatar record with unique ID.

### `deriveProductSlug(name)`
Generates slug for a product.

### `normalizeStoredProducts(list)`
Normalizes product records for UI display.

---

## Debug
### `debugLog(...args)`
Logs `[DEBUG]`-prefixed messages across environments.

### `debugWarn(...args)`
Logs `[WARN]`-prefixed warnings.

### `debugError(...args)`
Logs `[ERROR]` messages.

---

## Navigation
### `safeNext(path)`
Ensures navigation targets are valid app routes.

### `describePath(path)`
Generates human-friendly labels from routes.

---

## UI Helpers
### `useDropdownScrollLock(isOpen)`
Prevents body scroll while dropdowns are open.

### `createCardImageStyle(imageUrl)`
Returns CSS variables for background blur image.

---

*End of file.*
