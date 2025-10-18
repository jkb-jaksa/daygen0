# Test Plan: Avatar Backend Fix

## ✅ Database Migration Complete

The database columns (`avatarId`, `avatarImageId`, `productId`) already exist in your R2File table. This means the migration was previously applied successfully.

## 🧪 Testing Steps

Now we need to test if everything is working correctly:

### Test 1: Verify Backend 500 Error is Fixed

**Expected**: The `/api/r2files` endpoint should now work without errors.

**Steps**:
1. Open your application in the browser
2. Open Browser DevTools (F12 or Cmd+Option+I)
3. Go to the Network tab
4. Navigate to `/create` page
5. Watch for the `/api/r2files` request
6. **Expected Result**: Status 200 (not 500)
7. **Expected Result**: Your gallery images should load and display

**If it fails**: Check the browser console for error messages and share them.

---

### Test 2: Verify Avatar Data is Being Sent

**Expected**: When generating with an avatar selected, the debug log should show avatar data.

**Steps**:
1. Open Browser DevTools Console tab
2. Go to `/create` page
3. Click on the Avatar icon to open avatar picker
4. Select an avatar from your saved avatars
5. Make sure the avatar appears in the prompt bar area
6. Enter a prompt (e.g., "portrait photo")
7. Select "Gemini 2.5 Flash Image" model
8. Click Generate

**What to look for in console**:
```javascript
[DEBUG] Avatar state before generation: {
  selectedAvatar: {id: "avatar-...", name: "...", ...},
  selectedAvatarId: "avatar-1234567890",  // ← Should NOT be undefined
  activeAvatarImageId: "avatar-img-...",   // ← Should NOT be null/undefined
  selectedProduct: null,
  selectedProductId: undefined
}
```

**Expected Result**: `selectedAvatarId` should have a value (not undefined)

**If avatar is still undefined**: We need to investigate why the avatar selection is being cleared.

---

### Test 3: Verify Avatar Data is Saved to Backend

**Expected**: The generated image should be saved with avatar information.

**Steps**:
1. After generating an image with an avatar (from Test 2)
2. Look for this console log:
```javascript
Generated image data being sent to backend: {
  imageUrl: "data:image/png;base64,...",
  avatarId: "avatar-1234567890",      // ← Should NOT be undefined
  avatarImageId: "avatar-img-...",    // ← Should NOT be undefined
  productId: undefined,
  model: "gemini-2.5-flash-image",
  prompt: "..."
}
```

**Expected Result**: `avatarId` and `avatarImageId` should have values (not undefined)

---

### Test 4: Verify Avatar Badge Displays

**Expected**: The avatar badge should appear on the generated image.

**Steps**:
1. After successful generation with avatar
2. Look at the generated image in the gallery
3. Hover over the image
4. **Expected Result**: You should see an avatar badge in the bottom-left corner showing the avatar's image/name

**If badge doesn't appear**: 
- Check if avatar data was saved (Test 3)
- Check browser console for any errors
- The badge might not display if avatar data is undefined

---

### Test 5: Verify Badge Persists After Refresh

**Expected**: Avatar badges should still display after page reload.

**Steps**:
1. Generate an image with avatar (if you haven't already)
2. Hard refresh the page (Cmd+Shift+R or Ctrl+Shift+F5)
3. Check the gallery
4. Hover over images that were created with avatars
5. **Expected Result**: Avatar badges should still appear

---

## 📊 Results Checklist

After testing, please report:

- [ ] Test 1: `/api/r2files` returns 200 (not 500)
- [ ] Test 1: Gallery images load correctly
- [ ] Test 2: `selectedAvatarId` is NOT undefined in debug log
- [ ] Test 3: `avatarId` is NOT undefined when sending to backend
- [ ] Test 4: Avatar badge appears on generated images
- [ ] Test 5: Avatar badge persists after page refresh

## 🐛 Troubleshooting

### If avatar data is still undefined:

**Possible causes**:
1. Avatar selection is being cleared before generation starts
2. Race condition between picker close and generation
3. Avatar state is not being properly set when avatar is selected

**Next debugging steps**:
1. Add logging to avatar picker close handler
2. Check if `selectedAvatar` state is being set when clicking an avatar
3. Verify timing between picker close and generation start

### If 500 error persists:

**Possible causes**:
1. Backend not redeployed with latest changes
2. Different database schema issue
3. Backend caching old code

**Next steps**:
1. Check backend deployment logs
2. Verify backend is running latest commit
3. Restart backend service

### If badges don't display but data is saved:

**Possible causes**:
1. Frontend not fetching avatar/product data from backend
2. Badge rendering logic has a bug
3. CSS/styling hiding the badge

**Next steps**:
1. Check if `useGalleryImages` is correctly parsing avatar data
2. Verify `avatarMap` is populated with avatars
3. Check browser console for rendering errors

## 📞 Report Template

When reporting results, please include:

```
Test 1 (500 Error): ✅ Fixed / ❌ Still broken
Test 2 (Avatar State): ✅ Has value / ❌ Still undefined
Test 3 (Backend Save): ✅ Saved / ❌ Still undefined
Test 4 (Badge Display): ✅ Displays / ❌ Not showing
Test 5 (Badge Persist): ✅ Persists / ❌ Disappears

Console logs:
[Paste the debug logs here]

Screenshots:
[Attach screenshots if helpful]
```

