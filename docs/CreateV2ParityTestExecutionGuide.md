# CreateV2 Parity Test Execution Guide

This guide provides step-by-step instructions for executing the parity tests between Create.tsx (V1) and CreateV2 (V2).

## Prerequisites

1. **Start the development environment**:
   ```bash
   # Start backend (if running locally)
   cd api && npm run dev
   
   # Start frontend
   pnpm dev
   ```

2. **Prepare test account**:
   - Ensure you have a test account with at least 10 credits
   - Log in to the application
   - Clear browser cache if needed

3. **Open browser DevTools**:
   - Open Console tab (for errors)
   - Open Network tab (for API calls)
   - Open Performance tab (for performance metrics)

## Test Execution Workflow

### Phase 1: Preparation

1. **Open two browser tabs/windows**:
   - Tab 1: `http://localhost:5173/create/image` (V1 - Create.tsx)
   - Tab 2: `http://localhost:5173/create/image?v2=1` (V2 - CreateV2)

2. **Open the test checklist**:
   - Reference: `docs/CreateV2ParityTest.md`
   - Open test results document: `docs/CreateV2ParityResults.md`

3. **Verify baseline**:
   - Both tabs load successfully
   - No console errors
   - Both show the same UI structure

### Phase 2: Credit Flow Tests (Section 1)

**Test 1.1: Credit Decrement on Generation**
1. Note current credit count in header (both tabs)
2. In V1 tab: Enter prompt "test image" → Select Gemini 3 Pro → Click Generate
3. Wait for completion → Verify credit decremented by 1
4. In V2 tab: Repeat same steps → Verify credit decremented by 1
5. Compare results → Record in results document

**Test 1.2-1.4**: Follow similar pattern for each test

### Phase 3: Deep-Link Tests (Section 2)

**Test 2.1: Direct Job Navigation**
1. Generate an image in V1 → Wait for completion
2. Copy the jobId from the URL or console
3. Navigate to `/job/:jobId` in new tab → Verify modal opens
4. Repeat with V2: Generate image → Navigate to `/job/:jobId?v2=1` → Verify modal opens
5. Compare behavior → Record results

**Test 2.2-2.5**: Follow similar pattern

### Phase 4: Gallery Refresh Tests (Section 3)

**Test 3.1: Auto-Refresh on Generation Completion**
1. Clear gallery in both tabs (delete all items if needed)
2. In V1: Generate image → Watch gallery → Verify image appears automatically
3. In V2: Generate image → Watch gallery → Verify image appears automatically
4. Compare timing and behavior → Record results

**Test 3.2-3.5**: Follow similar pattern

### Phase 5: Provider Coverage Tests (Section 4)

**Test 4.1: Gemini Provider**
1. In V1: Select Gemini 3 Pro → Enter prompt → Generate
2. Verify generation succeeds → Note any issues
3. In V2: Repeat same steps → Compare results
4. Record pass/fail status

**Repeat for each provider** (4.2-4.18):
- Test each image provider: Flux, Reve, Ideogram, Qwen, Runway, ChatGPT, Luma
- Test each video provider: Veo, Runway Video, Wan, Hailuo, Kling, Seedance, Luma
- Test provider-specific options: Aspect ratio, batch size, temperature

### Phase 6: Feature Parity Tests (Section 5)

**Test 5.1: Reference Images - Upload**
1. In V1: Click upload button → Select image file → Verify preview appears
2. In V2: Repeat same steps → Compare UI and behavior
3. Record results

**Test 5.2-5.27**: Follow similar pattern for each feature:
- Reference images (paste, drag-drop, multiple, clear)
- Avatar/Product selection and persistence
- Style selection and persistence
- Settings menu functionality
- Bulk actions (select, delete, share, public toggle)
- Image actions (download, share, like, delete)
- Prompt history (recent, saved, select)
- Navigation and category switching

### Phase 7: Error Handling Tests (Section 6)

**Test 6.1: Network Error Handling**
1. Open DevTools Network tab → Set to "Offline"
2. In V1: Attempt to generate → Verify error message shown
3. In V2: Repeat → Compare error messages
4. Record results

**Test 6.2-6.5**: 
- Test provider errors (invalid provider)
- Test rate limits (429 errors) - may require backend configuration
- Test server errors (5xx) - may require backend configuration
- Test job failures (cancel job or trigger failure)

### Phase 8: Performance Tests (Section 7)

**Test 7.1: Initial Load Time**
1. Close all tabs → Clear cache
2. Open V1 → Use Performance tab → Record Time to Interactive (TTI)
3. Close → Clear cache → Open V2 → Record TTI
4. Compare → Record results

**Test 7.2-7.5**:
- Hot reload performance (make code change, measure HMR time)
- Re-render scope (use React DevTools Profiler)
- Console errors (check for warnings/errors)
- Memory leaks (use Performance monitor over multiple generations)

### Phase 9: Accessibility Tests (Section 8)

**Test 8.1: Keyboard Navigation**
1. In V1: Tab through all interactive elements → Verify focus visible
2. In V2: Repeat → Compare behavior
3. Record results

**Test 8.2-8.3**:
- Screen reader support (use VoiceOver/NVDA)
- Focus management (test modals, dropdowns)

## Tips for Efficient Testing

### 1. Batch Similar Tests
- Test all image providers in one session
- Test all video providers in one session
- Test all reference image features together

### 2. Use Screenshots
- Capture screenshots for visual comparison
- Screenshot errors and edge cases
- Compare UI layouts side-by-side

### 3. Keep Notes
- Document any unexpected behavior immediately
- Note timing differences
- Record console errors/warnings

### 4. Test Order Matters
- Start with critical flows (credit, deep-links, gallery refresh)
- Then test provider coverage
- Finally test edge cases and error handling

### 5. Use Browser DevTools Effectively
- **Console**: Monitor errors and warnings
- **Network**: Verify API calls match between V1/V2
- **React DevTools**: Compare component trees and state
- **Performance**: Measure load times and re-renders

## Quick Test Script

For rapid smoke testing, focus on these critical paths:

1. **Credit Flow** (5 min)
   - Generate image → Verify credit decrement → Check billing

2. **Deep-Link** (5 min)
   - Generate → Click image → Verify URL change → Refresh → Verify modal reopens

3. **Gallery Refresh** (5 min)
   - Generate → Verify auto-refresh → Manual refresh → Verify state preserved

4. **Provider Coverage** (10 min)
   - Test Gemini, Flux, and one video provider
   - Verify provider-specific options work

5. **Feature Parity** (10 min)
   - Test reference images, avatar selection, settings menu
   - Test bulk actions and image actions

**Total Quick Test**: ~35 minutes

## Automated Checks (Optional)

While most tests require manual execution, you can verify some basics programmatically:

```bash
# Check for TypeScript errors
pnpm typecheck

# Check for linting errors
pnpm lint

# Verify both Create.tsx and CreateV2.tsx compile
# (Already done if typecheck passes)
```

## Recording Results

1. **As you test**: Mark checkboxes in `docs/CreateV2ParityTest.md`
2. **After each test**: Record results in `docs/CreateV2ParityResults.md`
3. **For failures**: 
   - Take screenshots
   - Copy console errors
   - Note steps to reproduce
   - Document in "Issues Found" section

## Common Issues to Watch For

1. **State Management**:
   - State not persisting between refreshes
   - State not syncing between components
   - URLs not updating correctly

2. **API Calls**:
   - Different endpoints called
   - Different request payloads
   - Different error handling

3. **UI Differences**:
   - Layout differences
   - Button placement
   - Modal behavior
   - Loading states

4. **Performance**:
   - Slower load times
   - More re-renders
   - Memory leaks

## When to Stop Testing

You can stop testing and move to fixes when:
- ✅ All critical flows (credit, deep-links, gallery refresh) pass
- ✅ No blocking bugs found
- ✅ Performance is acceptable
- ⚠️ Non-critical issues can be documented and fixed later

## Next Steps After Testing

1. **If all tests pass**: Proceed to make CreateV2 default
2. **If critical issues found**: Fix issues → Re-test affected areas
3. **If non-critical issues**: Document → Fix in follow-up PR
4. **If major issues**: Document → Team review → Decision on approach

---

## Test Execution Checklist

- [ ] Prerequisites met (dev server running, logged in, credits available)
- [ ] Two browser tabs open (V1 and V2)
- [ ] DevTools open (Console, Network, Performance)
- [ ] Test checklist open (`docs/CreateV2ParityTest.md`)
- [ ] Results document open (`docs/CreateV2ParityResults.md`)
- [ ] Screenshot folder created
- [ ] Ready to begin testing

**Start Testing**: Begin with Section 1 (Credit Flow) and work through sequentially.
