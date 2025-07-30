# Call-Off Issues Troubleshooting Guide

## Issues Fixed

### 1. Focus Management (Aria-Hidden) Issues ✅
- Added `disableEnforceFocus` to all Dialog components
- This prevents MUI from enforcing focus within dialogs that might be hidden
- Fixed in: CreateCallOffWizard, EditCallOffDialog, CallOffDetailView, ConfirmationDialog

### 2. Enhanced Error Handling ✅
- Added try-catch blocks to all call-off handlers
- Added console logging for debugging
- Enhanced API error logging

## If Problems Persist

### Clear Browser Cache and State
1. **Hard Refresh**: Press `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
2. **Clear Local Storage**: 
   - Open DevTools (F12)
   - Go to Application > Local Storage
   - Clear all entries for localhost:5175
3. **Clear Session Storage**:
   - Application > Session Storage
   - Clear all entries

### Check for "/mui/call-offs" Route Issue
If you see "No routes matched location '/mui/call-offs'":

1. **Browser Extensions**: Disable React DevTools or other extensions temporarily
2. **Check Network Tab**: Look for any redirects in DevTools Network tab
3. **Check Console**: Look for any routing-related errors
4. **Clear React Query Cache**: 
   ```javascript
   // In browser console:
   localStorage.removeItem('react-query-cache')
   ```

### Test Individual Components
1. **Test API directly**: 
   ```bash
   curl -X GET "https://supply-chain-app-development.up.railway.app/api/call-offs"
   ```

2. **Check Component Rendering**:
   - Open each dialog individually
   - Check browser console for errors
   - Monitor network requests

### Development Commands
```bash
# Clear npm cache
npm cache clean --force

# Restart dev server
cd frontend
rm -rf node_modules/.vite
npm run dev
```

## Expected Behavior After Fixes
- ✅ Create Call-Off button should open wizard without errors
- ✅ Edit buttons should open edit dialog without aria-hidden warnings
- ✅ All dialogs should handle focus properly
- ✅ Console logging will help identify specific issues
- ✅ No more "/mui/call-offs" routing errors (if cache cleared)

## If Issues Still Occur
Check browser console for:
1. New error messages (now with better logging)
2. Network request failures
3. React Query errors
4. Focus management warnings

The enhanced error handling and logging will help pinpoint the exact issue location.