# Avatar System Documentation

A hybrid system that handles persistent identities ("Avatars") with special singleton logic for the user's "Me" persona.

## 1. Architecture & Components

- **Frontend**: 
  - `src/components/Avatars.tsx` (UI/Routing)
  - `src/components/create/hooks/useAvatarHandlers.ts` (State management, API calls)
- **Backend**: 
  - `src/avatars/avatars.service.ts` (Business Logic)
  - `src/avatars/avatars.controller.ts` (API Endpoints)
- **Database**: 
  - `Avatar` table (metadata, flags)
  - `R2File` table (linked images)

## 2. The "Me" Persona (Singleton)

The "Me" avatar is a unique concept in the system where a user can only have **one** avatar designated as themselves.

### Creation Flow
1. **Trigger**: User interacts with the "Add Yourself" card in the UI.
2. **Frontend State**: `Avatars.tsx` sets an internal flag `isAddMeFlow = true`.
3. **API Payload**: When saving, the frontend sends `{ ..., isMe: true }` to `POST /api/avatars`.
4. **Backend Enforcement**:
   - The `avatars.service.ts` intercepts the request.
   - It executes a batch update to unset `isMe` on **all** existing avatars for that user.
   - It then creates (or updates) the target avatar with `isMe: true`.

### Routing & Retrieval
- **Route**: `/app/me`
- **Resolution**: The frontend checks the URL slug. If it is `me`, it filters the loaded avatar list for the one where `{ isMe: true }`. This allows the "Me" section to be persistent even if the underlying avatar ID or slug changes.

## 3. Data Model

### Avatar Table
- `id`: Unique CUID.
- `name`: Display name.
- `slug`: URL-friendly identifier.
- `isMe` (Boolean): The critical flag for the "Me" persona.
- `imageUrl`: Quick reference to the primary image URL.

### R2File Table (Images)
Replaces the legacy `AvatarImage` table.
- `avatarId`: Foreign key to `Avatar`.
- `url`: Cloudflare R2 URL.
- `isPrimary` (Boolean): Determines which image is shown on cards and thumbnails.

## 4. Common Workflows

### Standard Creation
- Triggered via "Create Character".
- Payload sends `{ isMe: false }`.

### Explicitly Setting "Me"
- Endpoint: `POST /api/avatars/:id/set-me`
- Logic: Backend swaps the `isMe` flags ensuring only the target ID has it set to true.

### Setting Primary Image
- Endpoint: `POST /api/avatars/:id/images/:imageId/set-primary`
- Logic: Updates `R2File.isPrimary` for the image and syncs `Avatar.imageUrl` for performance.
