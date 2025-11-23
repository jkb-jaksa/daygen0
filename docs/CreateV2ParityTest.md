# CreateV2 Parity Test Checklist

**Purpose**: Validate functional parity between Create.tsx (monolith) and CreateV2 (modular) before making CreateV2 the default.

**Test Method**: For each scenario, test both:
- **V1**: `/create/image` (no query param - uses Create.tsx)
- **V2**: `/create/image?v2=1` (uses CreateV2)

Record results side-by-side and note any differences.

---

## Prerequisites

- [ ] Frontend dev server running (`pnpm dev`)
- [ ] Backend reachable (VITE_API_BASE_URL or Vite proxy)
- [ ] Logged in with sufficient credits (at least 10 credits)
- [ ] Console open for error monitoring
- [ ] Browser DevTools Network tab open

---

## 1. Credit Flow Validation

### 1.1 Credit Decrement on Generation
- [ ] **V1**: Generate image → verify credits decrement by 1 in header
- [ ] **V2**: Generate image → verify credits decrement by 1 in header
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

### 1.2 Credit Display Consistency
- [ ] **V1**: Check credit display format in header (e.g., "X credits")
- [ ] **V2**: Check credit display format in header (must match V1)
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

### 1.3 Credit Exhaustion Handling (402 Error)
- [ ] **V1**: Generate when credits = 0 → verify error message shown
- [ ] **V2**: Generate when credits = 0 → verify error message shown (must match V1)
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

### 1.4 Credit Reconciliation
- [ ] **V1**: Generate → check billing logs match credit deduction
- [ ] **V2**: Generate → check billing logs match credit deduction
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

---

## 2. Deep-Link Flow Validation

### 2.1 Direct Job Navigation
- [ ] **V1**: Navigate to `/job/:jobId` → modal opens with image
- [ ] **V2**: Navigate to `/job/:jobId?v2=1` → modal opens with image
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

### 2.2 Page Refresh Persistence
- [ ] **V1**: Navigate to `/job/:jobId` → refresh page → modal reopens
- [ ] **V2**: Navigate to `/job/:jobId?v2=1` → refresh page → modal reopens
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

### 2.3 Modal Close Navigation
- [ ] **V1**: Open modal → close → URL returns to `/create/image`
- [ ] **V2**: Open modal → close → URL returns to `/create/image?v2=1`
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

### 2.4 Deep-Link Without Query Param
- [ ] **V1**: Navigate to `/job/:jobId` (no ?v2=1) → verify behavior
- [ ] **V2**: Navigate to `/job/:jobId` (no ?v2=1) → verify behavior
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

### 2.5 State Preservation on Navigation
- [ ] **V1**: Open modal → navigate away → back button → modal state preserved
- [ ] **V2**: Open modal → navigate away → back button → modal state preserved
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

---

## 3. Gallery Refresh Flow Validation

### 3.1 Auto-Refresh on Generation Completion
- [ ] **V1**: Generate image → wait for completion → image appears in grid automatically
- [ ] **V2**: Generate image → wait for completion → image appears in grid automatically
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

### 3.2 Manual Refresh Preservation
- [ ] **V1**: Apply filters → refresh page → filters preserved
- [ ] **V2**: Apply filters → refresh page → filters preserved
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

### 3.3 Selection Preservation on Refresh
- [ ] **V1**: Select images → refresh → selection preserved
- [ ] **V2**: Select images → refresh → selection preserved
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

### 3.4 Concurrent Generation Handling
- [ ] **V1**: Start 3 concurrent generations → verify all appear in grid when complete
- [ ] **V2**: Start 3 concurrent generations → verify all appear in grid when complete
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

### 3.5 Job Progress Tracking
- [ ] **V1**: Start generation → verify progress updates in progress list
- [ ] **V2**: Start generation → verify progress updates in progress list
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

---

## 4. Provider Coverage Validation

### 4.1 Image Providers - Gemini
- [ ] **V1**: Select `Gemini 3 Pro` → generate → verify success
- [ ] **V2**: Select `Gemini 3 Pro` → generate → verify success
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

### 4.2 Image Providers - Flux
- [ ] **V1**: Select `Flux 1.1` → generate → verify success
- [ ] **V2**: Select `Flux 1.1` → generate → verify success
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

### 4.3 Image Providers - Reve
- [ ] **V1**: Select `Reve` → generate → verify success
- [ ] **V2**: Select `Reve` → generate → verify success
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

### 4.4 Image Providers - Ideogram
- [ ] **V1**: Select `Ideogram 3.0` → generate → verify success
- [ ] **V2**: Select `Ideogram 3.0` → generate → verify success
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

### 4.5 Image Providers - Qwen
- [ ] **V1**: Select `Qwen` → generate → verify success
- [ ] **V2**: Select `Qwen` → generate → verify success
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

### 4.6 Image Providers - Runway Gen-4
- [ ] **V1**: Select `Runway Gen-4` → generate → verify success
- [ ] **V2**: Select `Runway Gen-4` → generate → verify success
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

### 4.7 Image Providers - ChatGPT
- [ ] **V1**: Select `ChatGPT` → generate → verify success
- [ ] **V2**: Select `ChatGPT` → generate → verify success
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

### 4.8 Image Providers - Luma
- [ ] **V1**: Select `Luma` model → generate → verify success
- [ ] **V2**: Select `Luma` model → generate → verify success
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

### 4.9 Video Providers - Veo 3
- [ ] **V1**: Switch to video tab → select `Veo 3` → generate → verify success
- [ ] **V2**: Switch to video tab → select `Veo 3` → generate → verify success
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

### 4.10 Video Providers - Runway Gen-4 Video
- [ ] **V1**: Select `Runway Gen-4 (Video)` → generate → verify success
- [ ] **V2**: Select `Runway Gen-4 (Video)` → generate → verify success
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

### 4.11 Video Providers - Wan 2.2
- [ ] **V1**: Select `Wan 2.2 Video` → generate → verify success
- [ ] **V2**: Select `Wan 2.2 Video` → generate → verify success
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

### 4.12 Video Providers - Hailuo 02
- [ ] **V1**: Select `Hailuo 02` → generate → verify success
- [ ] **V2**: Select `Hailuo 02` → generate → verify success
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

### 4.13 Video Providers - Kling
- [ ] **V1**: Select `Kling` → generate → verify success
- [ ] **V2**: Select `Kling` → generate → verify success
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

### 4.14 Video Providers - Seedance 1.0 Pro
- [ ] **V1**: Select `Seedance 1.0 Pro` → generate → verify success
- [ ] **V2**: Select `Seedance 1.0 Pro` → generate → verify success
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

### 4.15 Video Providers - Luma Ray 2
- [ ] **V1**: Select `Luma Ray 2` → generate → verify success
- [ ] **V2**: Select `Luma Ray 2` → generate → verify success
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

### 4.16 Provider-Specific Options - Aspect Ratio
- [ ] **V1**: Select provider → change aspect ratio → generate → verify aspect ratio applied
- [ ] **V2**: Select provider → change aspect ratio → generate → verify aspect ratio applied
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

### 4.17 Provider-Specific Options - Batch Size
- [ ] **V1**: Select provider → change batch size → generate → verify batch size applied
- [ ] **V2**: Select provider → change batch size → generate → verify batch size applied
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

### 4.18 Provider-Specific Options - Temperature
- [ ] **V1**: Select provider → change temperature → generate → verify temperature applied
- [ ] **V2**: Select provider → change temperature → generate → verify temperature applied
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

---

## 5. Feature Parity Validation

### 5.1 Reference Images - Upload
- [ ] **V1**: Click upload → select image → verify preview appears
- [ ] **V2**: Click upload → select image → verify preview appears
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

### 5.2 Reference Images - Paste
- [ ] **V1**: Copy image → paste in prompt area → verify preview appears
- [ ] **V2**: Copy image → paste in prompt area → verify preview appears
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

### 5.3 Reference Images - Drag & Drop
- [ ] **V1**: Drag image file → drop in prompt area → verify preview appears
- [ ] **V2**: Drag image file → drop in prompt area → verify preview appears
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

### 5.4 Reference Images - Multiple Files
- [ ] **V1**: Upload multiple reference images → verify all previews appear
- [ ] **V2**: Upload multiple reference images → verify all previews appear
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

### 5.5 Reference Images - Clear
- [ ] **V1**: Upload reference → click clear → verify preview removed
- [ ] **V2**: Upload reference → click clear → verify preview removed
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

### 5.6 Avatar Selection
- [ ] **V1**: Click Avatar button → select avatar → verify badge appears
- [ ] **V2**: Click Avatar button → select avatar → verify badge appears
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

### 5.7 Avatar Persistence
- [ ] **V1**: Select avatar → refresh page → avatar selection preserved
- [ ] **V2**: Select avatar → refresh page → avatar selection preserved
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

### 5.8 Product Selection
- [ ] **V1**: Click Product button → select product → verify badge appears
- [ ] **V2**: Click Product button → select product → verify badge appears
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

### 5.9 Product Persistence
- [ ] **V1**: Select product → refresh page → product selection preserved
- [ ] **V2**: Select product → refresh page → product selection preserved
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

### 5.10 Style Selection
- [ ] **V1**: Click Style button → select styles → verify styles applied to prompt
- [ ] **V2**: Click Style button → select styles → verify styles applied to prompt
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

### 5.11 Style Persistence
- [ ] **V1**: Select styles → refresh page → styles preserved
- [ ] **V2**: Select styles → refresh page → styles preserved
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

### 5.12 Settings Menu - Open/Close
- [ ] **V1**: Click Settings button → menu opens → click outside → menu closes
- [ ] **V2**: Click Settings button → menu opens → click outside → menu closes
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

### 5.13 Settings Menu - Provider Options Display
- [ ] **V1**: Select provider → open settings → verify provider-specific options shown
- [ ] **V2**: Select provider → open settings → verify provider-specific options shown
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

### 5.14 Settings Menu - Option Changes Persist
- [ ] **V1**: Change settings → generate → verify settings applied
- [ ] **V2**: Change settings → generate → verify settings applied
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

### 5.15 Bulk Actions - Select Multiple
- [ ] **V1**: Select 3 images → verify bulk actions menu appears
- [ ] **V2**: Select 3 images → verify bulk actions menu appears
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

### 5.16 Bulk Actions - Delete
- [ ] **V1**: Select multiple → bulk delete → verify images removed
- [ ] **V2**: Select multiple → bulk delete → verify images removed
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

### 5.17 Bulk Actions - Share
- [ ] **V1**: Select multiple → bulk share → verify share dialog opens
- [ ] **V2**: Select multiple → bulk share → verify share dialog opens
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

### 5.18 Bulk Actions - Public Toggle
- [ ] **V1**: Select multiple → toggle public → verify state changes
- [ ] **V2**: Select multiple → toggle public → verify state changes
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

### 5.19 Image Actions - Download
- [ ] **V1**: Open image menu → download → verify download starts
- [ ] **V2**: Open image menu → download → verify download starts
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

### 5.20 Image Actions - Share
- [ ] **V1**: Open image menu → share → verify share dialog opens
- [ ] **V2**: Open image menu → share → verify share dialog opens
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

### 5.21 Image Actions - Like
- [ ] **V1**: Open image menu → like → verify like state changes
- [ ] **V2**: Open image menu → like → verify like state changes
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

### 5.22 Image Actions - Delete
- [ ] **V1**: Open image menu → delete → verify image removed
- [ ] **V2**: Open image menu → delete → verify image removed
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

### 5.23 Prompt History - Recent Prompts
- [ ] **V1**: Generate with prompt → verify prompt appears in history
- [ ] **V2**: Generate with prompt → verify prompt appears in history
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

### 5.24 Prompt History - Saved Prompts
- [ ] **V1**: Save prompt → verify appears in saved prompts list
- [ ] **V2**: Save prompt → verify appears in saved prompts list
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

### 5.25 Prompt History - Select from History
- [ ] **V1**: Open prompts dropdown → select saved prompt → verify applied to form
- [ ] **V2**: Open prompts dropdown → select saved prompt → verify applied to form
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

### 5.26 Sidebar Navigation
- [ ] **V1**: Click sidebar items → verify navigation works
- [ ] **V2**: Click sidebar items → verify navigation works
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

### 5.27 Category Switching
- [ ] **V1**: Switch between image/video/gallery → verify state resets appropriately
- [ ] **V2**: Switch between image/video/gallery → verify state resets appropriately
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

---

## 6. Error Handling Validation

### 6.1 Network Error Handling
- [ ] **V1**: Disconnect network → generate → verify error message shown
- [ ] **V2**: Disconnect network → generate → verify error message shown
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

### 6.2 Provider Error Handling
- [ ] **V1**: Generate with invalid provider → verify error message shown
- [ ] **V2**: Generate with invalid provider → verify error message shown
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

### 6.3 Rate Limit Handling (429)
- [ ] **V1**: Trigger rate limit → verify retry/backoff behavior
- [ ] **V2**: Trigger rate limit → verify retry/backoff behavior
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

### 6.4 Server Error Handling (5xx)
- [ ] **V1**: Trigger server error → verify error message shown
- [ ] **V2**: Trigger server error → verify error message shown
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

### 6.5 Job Failure Handling
- [ ] **V1**: Start generation → job fails → verify error displayed in UI
- [ ] **V2**: Start generation → job fails → verify error displayed in UI
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

---

## 7. Performance & UX Validation

### 7.1 Initial Load Time
- [ ] **V1**: Measure time to interactive (TTI)
- [ ] **V2**: Measure time to interactive (TTI) - should be comparable or better
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

### 7.2 Hot Reload Performance
- [ ] **V1**: Make code change → measure HMR update time
- [ ] **V2**: Make code change → measure HMR update time - should be faster
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

### 7.3 Re-render Scope
- [ ] **V1**: Change prompt → verify gallery doesn't re-render
- [ ] **V2**: Change prompt → verify gallery doesn't re-render
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

### 7.4 Console Errors
- [ ] **V1**: Complete full flow → check console for errors/warnings
- [ ] **V2**: Complete full flow → check console for errors/warnings (should be same or fewer)
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

### 7.5 Memory Leaks
- [ ] **V1**: Run multiple generations → check memory usage
- [ ] **V2**: Run multiple generations → check memory usage (should be comparable)
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

---

## 8. Accessibility Validation

### 8.1 Keyboard Navigation
- [ ] **V1**: Navigate entire flow with keyboard only
- [ ] **V2**: Navigate entire flow with keyboard only
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

### 8.2 Screen Reader Support
- [ ] **V1**: Test with screen reader → verify all interactive elements announced
- [ ] **V2**: Test with screen reader → verify all interactive elements announced
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

### 8.3 Focus Management
- [ ] **V1**: Open modals → verify focus trapped correctly
- [ ] **V2**: Open modals → verify focus trapped correctly
- [ ] **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- [ ] **Notes**: 

---

## Test Execution Summary

**Total Test Cases**: 100+

**Execution Date**: _______________

**Tester**: _______________

**Overall Status**: 
- [ ] All critical flows pass
- [ ] Ready for feature flag removal
- [ ] Requires fixes before proceeding
- [ ] Needs team review

**Critical Issues Found**: _______________

**Acceptable Differences**: _______________

**Recommendation**: 
- [ ] Proceed with making CreateV2 default
- [ ] Fix critical issues first
- [ ] Defer decision pending review

---

## Notes

_Use this section to document any observations, edge cases, or unexpected behaviors discovered during testing._
