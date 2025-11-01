# CreateV1 vs CreateV2 Feature Comparison

**Last Updated**: 2025-10-30  
**Status**: Work in Progress - CreateV2 is significantly more complete than initial documentation suggested

## Quick Access

- **CreateV1 (Stable)**: `/create/image` - No query parameter
- **CreateV2 (Preview)**: `/create/image?v2=1` - Experimental modular architecture

## Summary

Recent commits (last 2 weeks) show that CreateV2 is much more complete than the outdated `REFACTORING_SUMMARY.md` suggested. The `useCreateGenerationController` hook (1,091 lines) was recently implemented and provides comprehensive provider integration. However, hands-on testing is still needed to verify end-to-end functionality.

## Feature Matrix

| Feature | CreateV1 (Create.tsx) | CreateV2 | Notes |
|---------|---------------------|----------|-------|
| **Core Architecture** | | | |
| File Size | ~10,657 lines (monolith) | ~264 lines + modular components | V2 is refactored into modules |
| Provider Integration | ✅ Full (13+ providers) | ✅ Full (via useCreateGenerationController) | Controller has 1,091 lines of provider logic |
| **Image Providers** | | | |
| Gemini 2.5 Flash | ✅ | ✅ | Implemented in controller |
| Flux 1.1 / Pro | ✅ | ✅ | Implemented in controller |
| Reve | ✅ | ✅ | Implemented in controller |
| Ideogram | ✅ | ✅ | Implemented in controller |
| Qwen | ✅ | ✅ | Implemented in controller |
| Runway Gen-4 | ✅ | ✅ | Implemented in controller |
| ChatGPT / DALL·E | ✅ | ✅ | Implemented in controller |
| Luma | ✅ | ✅ | Implemented in controller |
| **Video Providers** | | | |
| Veo 3 | ✅ | ✅ | Implemented in controller |
| Runway Gen-4 Video | ✅ | ✅ | Implemented in controller |
| Wan 2.2 | ✅ | ✅ | Implemented in controller |
| Hailuo 02 | ✅ | ✅ | Implemented in controller |
| Kling | ✅ | ✅ | Implemented in controller |
| Seedance 1.0 Pro | ✅ | ✅ | Implemented in controller |
| Luma Ray 2 | ✅ | ✅ | Implemented in controller |
| **Prompt Management** | | | |
| Prompt Input | ✅ | ✅ | Via PromptForm + controller |
| Prompt History | ✅ | ✅ | Via usePromptHandlers |
| Saved Prompts | ✅ | ✅ | Via usePromptHandlers |
| Style Application | ✅ | ✅ | Via useStyleHandlers |
| **Reference Images** | | | |
| Upload | ✅ | ✅ | Via useReferenceHandlers |
| Paste (Ctrl+V) | ✅ | ✅ | Via useReferenceHandlers |
| Drag & Drop | ✅ | ✅ | Via useReferenceHandlers |
| Multiple Files | ✅ | ✅ | Via useReferenceHandlers |
| Clear References | ✅ | ✅ | Via useReferenceHandlers |
| **Avatar & Product** | | | |
| Avatar Selection | ✅ | ✅ | Via useAvatarHandlers |
| Avatar Persistence | ✅ | ✅ | Via useAvatarHandlers |
| Product Selection | ✅ | ✅ | Via useProductHandlers |
| Product Persistence | ✅ | ✅ | Via useProductHandlers |
| **Advanced Settings** | | | |
| Aspect Ratio Control | ✅ | ✅ | Per-provider options |
| Batch Size | ✅ | ✅ | Via controller |
| Temperature | ✅ | ✅ | Via controller |
| Provider-Specific Options | ✅ | ✅ | Via SettingsMenu |
| Settings Menu | ✅ | ✅ | Full implementation |
| **Gallery & Results** | | | |
| Results Grid | ✅ | ✅ | ResultsGrid component |
| Image Thumbnails | ✅ | ✅ | Via GalleryContext |
| Selection (Single) | ✅ | ✅ | Via GalleryContext |
| Selection (Bulk) | ✅ | ✅ | Via GalleryContext |
| Full-Size Modal | ✅ | ✅ | FullImageModal component |
| Gallery Loading | ✅ | ✅ | Via useGalleryImages hook |
| Gallery Auto-Refresh | ✅ | ✅ | Via GalleryContext |
| **Gallery Actions** | | | |
| Download | ✅ | ✅ | Via useGalleryActions |
| Share | ✅ | ✅ | Via useGalleryActions |
| Like/Unlike | ✅ | ✅ | Via useGalleryActions |
| Delete | ✅ | ✅ | Via useGalleryActions |
| Public Toggle | ✅ | ✅ | Via useGalleryActions |
| **Bulk Actions** | | | |
| Multi-Select | ✅ | ✅ | Via GalleryContext |
| Bulk Delete | ✅ | ✅ | Via BulkActionsMenu |
| Bulk Share | ✅ | ✅ | Via BulkActionsMenu |
| Bulk Public Toggle | ✅ | ✅ | Via BulkActionsMenu |
| **Navigation** | | | |
| Deep-Link Support | ✅ | ✅ | `/job/:jobId` route |
| Deep-Link Hydration | ✅ | ✅ | Via GalleryContext |
| Category Switching | ✅ | ✅ | Via CreateSidebar |
| **Generation Tracking** | | | |
| Active Jobs | ✅ | ✅ | Via GenerationContext |
| Progress Tracking | ✅ | ✅ | Via GenerationProgress |
| Job Polling | ✅ | ✅ | Via provider hooks |
| Parallel Generations | ✅ | ✅ | Via controller |
| **Credit System** | | | |
| Credit Display | ✅ | ⚠️ Needs Verification | May require testing |
| Credit Decrement | ✅ | ⚠️ Needs Verification | May require testing |
| Credit Exhaustion (402) | ✅ | ⚠️ Needs Verification | May require testing |
| **Folder Management** | | | |
| Folder Creation | ✅ | ⚠️ UI exists, needs backend | V1 has partial support |
| Folder Navigation | ✅ | ⚠️ UI exists, needs backend | V1 has partial support |
| Move to Folder | ✅ | ⚠️ Stub implementation | V1/V2 both need work |
| **UI Components** | | | |
| CreateSidebar | ✅ | ✅ | Shared component |
| SettingsMenu | ✅ | ✅ | Shared component |
| ModelSelector | ✅ | ✅ | Separate in V2 |
| PromptForm | ✅ | ✅ | Refactored in V2 |
| ReferenceImages | ✅ | ✅ | Shared component |
| ResultsGrid | ✅ | ✅ | Separate in V2 |
| FullImageModal | ✅ | ✅ | Separate in V2 |
| GenerationProgress | ✅ | ✅ | Separate in V2 |
| ImageActionMenu | ✅ | ✅ | Shared component |
| BulkActionsMenu | ✅ | ✅ | Shared component |

## Detailed Comparison

### Architecture Differences

**CreateV1 (Monolith)**:
- Single file component (~10,657 lines)
- All state management within component
- Direct hook usage for each provider
- Handler functions defined inline
- Gallery management inline

**CreateV2 (Modular)**:
- Main component (~264 lines)
- Context-driven state (`GenerationContext`, `GalleryContext`)
- Centralized controller (`useCreateGenerationController`)
- Modular hooks (`usePromptHandlers`, `useReferenceHandlers`, etc.)
- Shared UI components

### Recent Developments

Based on recent commits (last 2 weeks):
1. `useCreateGenerationController` was implemented (1,091 lines)
2. All provider hooks integrated into controller
3. Gallery persistence and deep-link hydration added
4. Job lifecycle centralized
5. Comprehensive settings support added

### What Needs Testing

The following features need hands-on verification in CreateV2:

- [ ] Credit flow (decrement, display, exhaustion handling)
- [ ] Deep-link hydration (`/job/:jobId`)
- [ ] Gallery auto-refresh on generation completion
- [ ] Reference image upload/paste/drag-drop
- [ ] Avatar/product selection and persistence
- [ ] Style application to prompts
- [ ] Settings menu with provider-specific options
- [ ] Full generation cycle (prompt → job → result)
- [ ] Parallel generation handling
- [ ] Error handling (network, provider failures, rate limits)

## Known Issues

### CreateV1
- Large file size makes it difficult to maintain
- Performance could be better with re-render optimization
- Some folder management features incomplete

### CreateV2
- Documentation is outdated (REFACTORING_SUMMARY.md says "skeleton only")
- Needs hands-on testing to verify end-to-end functionality
- Folder management still stubbed (but same as V1)
- May have edge cases not yet discovered

## Migration Path

### Current Status
- V1 is production-stable
- V2 is feature-complete but needs testing
- Both accessible simultaneously via `?v2=1` query parameter

### Recommended Next Steps
1. **Smoke Test CreateV2** - Verify all critical flows work
2. **Document Any Issues** - Log bugs or missing functionality
3. **Fix Critical Bugs** - Address any blocking issues
4. **Gradual Rollout** - Use feature flag for beta users
5. **Full Migration** - Make V2 default once validated

## Performance Comparison

### Bundle Size
- V1: Monolith (large initial load)
- V2: Lazy-loaded modules (smaller initial load, code splitting)

### Hot Reload
- V1: Changes trigger full component re-render
- V2: Only affected modules re-render (faster development)

### Re-render Scope
- V1: State changes may trigger gallery re-render
- V2: Context isolation reduces unnecessary re-renders

## Conclusion

CreateV2 is significantly more complete than initially documented. Recent commits show a substantial amount of work has been done. The primary gap is in testing and verification, not implementation. Both versions are accessible, but V1 should remain the default until V2 is thoroughly tested.

### Recommendation
1. Keep V1 as production default
2. Test V2 thoroughly using the parity test checklist
3. Fix any bugs found during testing
4. Gradually migrate users to V2 with feature flag
5. Update documentation to reflect actual status







