# Quick Start: Accessing V1 and V2

**Last Updated**: 2025-10-30

## Overview

Both Create V1 (stable production version) and Create V2 (experimental modular version) are accessible simultaneously for testing and comparison.

## Quick Access

### V1 (Stable Production)
- **URL**: `/create/image` (no query parameters)
- **File**: `src/components/Create.tsx` (~10,657 lines)
- **Status**: Production-ready
- **Badge**: Green "V1 (Stable)" in development mode

### V2 (Experimental Preview)
- **URL**: `/create/image?v2=1` ⚠️ **Must use `?` (question mark), NOT `/` (slash)**
- **Correct**: `/create/image?v2=1` ✅
- **Wrong**: `/create/image/v2=1` ❌ (will not work)
- **File**: `src/components/create/CreateV2.tsx` (~264 lines + modular components)
- **Status**: Feature-complete, needs testing
- **Badge**: Blue "V2 (Preview)" in development mode

## How It Works

The routing in `src/routes/CreateRoutes.tsx` checks for the `?v2=1` query parameter:
- If present: renders `CreateV2`
- If absent: renders `Create` (V1)

Both versions are wrapped in the same providers (`GenerationProvider` and `GalleryProvider`) for consistency.

## Development Indicators

When running in development mode (`pnpm dev`):
- **V1**: Green badge in top-right corner shows "V1 (Stable)"
- **V2**: Blue badge in top-right corner shows "V2 (Preview)"

These badges help distinguish versions during side-by-side testing.

### Dev Toggle (quick switch)
- In V1, a small link appears in the top-right: "Switch to V2 (Preview)". It navigates to the same path with `?v2=1`.
- In V2, a small link appears in the top-right: "Switch to V1 (Stable)". It removes `v2` from the URL.
- The toggle is only visible in development mode.

## Testing Both Versions

### Side-by-Side Comparison
1. Open browser tab 1: Navigate to `/create/image` (V1)
2. Open browser tab 2: Navigate to `/create/image?v2=1` (V2)
3. Test the same flows in both versions
4. Compare behavior and functionality

### Key Areas to Test
- **Generation**: Try different providers (Gemini, Flux, etc.)
- **Gallery**: Upload references, view results, open full-size modal
- **Settings**: Change aspect ratios, batch sizes, temperatures
- **Avatars & Products**: Select and apply
- **Styles**: Apply style presets
- **Deep Links**: Navigate to `/job/:jobId`

## Documentation

- [CreateV1vsV2FeatureComparison.md](./CreateV1vsV2FeatureComparison.md) - Detailed feature-by-feature comparison
- [CreateV2Status.md](./CreateV2Status.md) - Current implementation status
- [CreateV2ParityTest.md](./CreateV2ParityTest.md) - Testing checklist
- [REFACTORING_SUMMARY.md](../REFACTORING_SUMMARY.md) - Outdated audit (with warning banner)

## Migration Path

### Current State (2025-10-30)
- V1 is production default
- V2 is accessible via `?v2=1` flag
- Both versions coexist

### Planned Migration
1. Test V2 thoroughly using parity test checklist
2. Fix any bugs or missing features found during testing
3. Gradually roll out V2 to beta users
4. Monitor for issues
5. Make V2 default for all users
6. Eventually remove V1 code

## Troubleshooting

### ❌ URL Not Working? Common Mistakes

**Wrong URL format:**
- ❌ `/create/image/v2=1` - Using `/` instead of `?`
- ✅ `/create/image?v2=1` - Correct format with `?`

**The `v2=1` must be a query parameter (after `?`), not a path segment (after `/`)**

### Not seeing the version badge?
- Make sure you're running in development mode (`pnpm dev`)
- Badges only show in dev mode, not in production builds

### Want to ensure you're on V1?
- Check URL has NO query parameters: `/create/image`
- Look for green "V1 (Stable)" badge

### Want to ensure you're on V2?
- Check URL has `?v2=1`: `/create/image?v2=1` (with question mark `?`)
- Look for blue "V2 (Preview)" badge
- If you navigate to V2 without the parameter, it will automatically add it

### Routing issues?
- Check browser console for errors
- Verify `src/routes/CreateRoutes.tsx` is up to date
- Confirm `src/App.tsx` has `/create/*` route
- Try navigating directly: type `/create/image?v2=1` in the address bar

## Notes

- Recent commits (last 2 weeks) significantly advanced V2 implementation
- `useCreateGenerationController` (1,091 lines) provides comprehensive provider integration
- Both versions share many components (`SettingsMenu`, `ImageActionMenu`, etc.)
- V2 uses modular architecture with contexts and hooks
- V1 is monolithic but stable and well-tested

