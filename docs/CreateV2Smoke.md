# Create v2 — Smoke Test (Gemini)

## Prereqs
- Frontend dev server running
- Backend reachable (VITE_API_BASE_URL or Vite proxy)
- Logged in with credits

## Steps
1. Navigate to `/create/image?v2=1`.
2. Enter a simple prompt (e.g., "cinematic portrait").
3. Ensure model is `Gemini 3 Pro` (`gemini-3.0-pro-image`).
4. Click Generate.
5. Observe a job appear in the progress list; progress should advance.
6. When complete, the image appears in the grid.
7. Click the new image; the URL should update to `/job/:jobId` and open the viewer.
8. Refresh the gallery with the banner action if needed; verify no errors.

## Expected
- Progress UI shows a queued → processing → completed flow.
- Gallery item is added and opens via `/job/:jobId`.
- No console errors; UI remains responsive.
