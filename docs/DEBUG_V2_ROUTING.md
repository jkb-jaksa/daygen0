# Debugging V2 Routing Issues

## Quick Test

1. **Open browser console** (F12 or Cmd+Option+I)
2. **Navigate to**: `/create/image?v2=1` (make sure to use `?` not `/`)
3. **Check console logs** - you should see:
   - `[CreateRoutes] useIsCreateV2:` with `isV2: true`
   - `[CreateRoutes] Render:` with `component: 'CreateV2'`
   - Blue badge in top-right corner: "V2 (Preview)"

## What to Check

### 1. URL Format
- ✅ Correct: `/create/image?v2=1`
- ❌ Wrong: `/create/image/v2=1`
- ❌ Wrong: `/create/image?v2=1&other=param` (should still work but test)

### 2. Console Logs
When you navigate to `/create/image?v2=1`, check for:
```javascript
[CreateRoutes] useIsCreateV2: {
  search: "?v2=1",
  pathname: "/create/image",
  isV2: true
}

[CreateRoutes] Render: {
  pathname: "/create/image",
  search: "?v2=1",
  isV2: true,
  component: "CreateV2"
}
```

If `isV2` is `false`, the query parameter isn't being read correctly.

### 3. Visual Indicators
- **V1**: Green badge "V1 (Stable)" (if on `/create/image` without `?v2=1`)
- **V2**: Blue badge "V2 (Preview)" (if on `/create/image?v2=1`)

### 4. Component Loading
If CreateV2 fails to load, check:
- Browser console for errors
- Network tab for failed module imports
- Check if `src/components/create/CreateV2.tsx` exists and exports correctly

## Common Issues

### Issue: Always Shows V1
**Possible causes:**
1. Query parameter not in URL (check address bar)
2. URLSearchParams not parsing correctly
3. Routing happening before query param is read

**Fix:**
- Manually type `/create/image?v2=1` in address bar
- Check console logs to see what `location.search` contains

### Issue: Component Not Loading
**Possible causes:**
1. CreateV2.tsx has a syntax error
2. Lazy loading is failing
3. Import path is wrong

**Fix:**
- Check browser console for import errors
- Run `pnpm typecheck` to verify no TypeScript errors
- Check Network tab for 404 on CreateV2 chunk

### Issue: Redirects Losing Query Param
**Possible causes:**
1. Navigation not preserving search params
2. Auth cleanup removing v2=1

**Fix:**
- Check if auth params are being cleaned (should preserve v2=1)
- Verify navigation calls include search params

## Manual Test Steps

1. **Clear browser cache** and reload
2. **Open console** (F12)
3. **Navigate directly**: Type `/create/image?v2=1` in address bar
4. **Press Enter**
5. **Check console** for debug logs
6. **Check badge** in top-right corner
7. **Try generating an image** to verify it's actually V2

## Expected Behavior

### When on `/create/image?v2=1`:
- Console shows `isV2: true`
- Blue "V2 (Preview)" badge appears
- CreateV2 component renders
- All V2-specific features work

### When on `/create/image`:
- Console shows `isV2: false`
- Green "V1 (Stable)" badge appears  
- Create component renders
- V1 features work

## Still Not Working?

If it's still not working after checking all of the above:

1. **Check the exact URL** in the browser address bar
2. **Copy the console logs** showing what's happening
3. **Check Network tab** for any failed or redirected requests
4. **Verify CreateV2.tsx** exists and has no errors
5. **Try hard refresh**: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

## Contact Points

If the issue persists:
- Share browser console logs
- Share the exact URL you're using
- Share any error messages
- Check if `src/routes/CreateRoutes.tsx` matches the expected code












