# ?? Testing Guide - Firebase Video Sync

## Quick Test (No Setup Required)

Want to see if the basic functionality works? Follow these steps:

### 1. Test Local Mode (Works Immediately)

1. Open `index.html` in your browser
2. Click any of the controller videos
3. Select a video file from your computer
4. Video should play immediately
5. Refresh the page - **video is gone** (expected without Firebase)

**Result:** ? Videos work locally but don't persist

---

### 2. Test Firebase Setup

#### Step 1: Open Test Page
1. Open `firebase-test.html` in your browser
2. Look at the status indicators

#### Step 2: Check Results

**If you see:** `? Firebase not configured`
- This is expected if you haven't set up Firebase yet
- Follow `FIREBASE-SETUP.md` to configure

**If you see:** `? Firebase connected successfully!`
- Great! Firebase is configured correctly
- All tests should pass

---

## Full Integration Test

Once Firebase is configured, test the complete flow:

### Test 1: Single Device Upload

1. **Open** `index.html` in your browser
2. **Look** for green "? Sync Active" badge in top-left
3. **Click** the first controller video
4. **Select** a video file
5. **Watch** progress bar appear
6. **Verify** video plays after upload

**Expected Results:**
- ? Progress bar shows 0% ? 100%
- ? "? Upload Complete!" message appears
- ? Video plays smoothly
- ? Console shows "Video uploaded and synced successfully!"

---

### Test 2: Cross-Device Sync

1. **Open** `index.html` on Device A (e.g., your computer)
2. **Upload** a video (follow Test 1)
3. **Open** `index.html` on Device B (e.g., your phone)
4. **Wait** 2-3 seconds for page to load
5. **Verify** the video you uploaded appears on Device B

**Expected Results:**
- ? Video loads automatically on Device B
- ? No need to refresh
- ? Same video plays on both devices

---

### Test 3: Real-Time Updates

1. **Open** `index.html` on two devices side-by-side
2. **On Device A:** Upload a new video (replace controller video 2)
3. **On Device B:** Watch it update automatically

**Expected Results:**
- ? Device B shows "? Video Updated" notification
- ? Video changes without refresh
- ? Update happens within 1-2 seconds

---

### Test 4: Modal Video Sync

1. **Open** `index.html`
2. **Click** "Open Your Gift ??" button
3. **Click** the video in the modal
4. **Upload** a new video
5. **Close** modal and reopen
6. **Open** same page on another device

**Expected Results:**
- ? New video persists after closing modal
- ? Video syncs to other devices
- ? Video plays with controls

---

## Troubleshooting Tests

### Test 5: Offline Behavior

1. **Upload** a video while online
2. **Disconnect** internet
3. **Refresh** page

**Expected Results:**
- ? Videos load from localStorage
- ? Page still works
- ?? Can't upload new videos (expected)

---

### Test 6: Large File Upload

1. **Select** a video larger than 50MB
2. **Try** to upload

**Expected Results:**
- ? Upload should fail (security rule)
- ? Error message in console
- ? App doesn't crash

---

### Test 7: Multiple Uploads

1. **Upload** video to controller slot 1
2. **Immediately upload** video to controller slot 2
3. **Then upload** to controller slot 3

**Expected Results:**
- ? All three uploads work independently
- ? Progress bars show for each
- ? All videos sync correctly

---

## Browser Console Checks

Open DevTools (F12) and check console messages:

### When Firebase is Configured:
```
? Firebase initialized successfully
? Firebase video sync enabled
? Video uploaded and synced successfully!
```

### When Firebase is NOT Configured:
```
?? Firebase not configured - using local-only mode
?? Video saved locally (Firebase not configured)
```

### On Video Sync:
```
?? Video loadeddata, readyState= 4
```

---

## Performance Tests

### Test 8: Page Load Speed

1. **Clear** browser cache
2. **Refresh** `index.html`
3. **Time** how long until videos appear

**Expected Results:**
- ? Page loads in <3 seconds (fast internet)
- ? Controller videos autoplay
- ? No lag or stuttering

---

### Test 9: Upload Speed

1. **Select** a 10MB video
2. **Upload** and track time

**Expected Results:**
- ? Upload completes in <30 seconds (fast internet)
- ? Progress bar updates smoothly
- ? No browser freeze

---

## Edge Cases

### Test 10: Invalid File Type

1. **Click** a video to upload
2. **Select** an image file (not video)

**Expected Results:**
- ?? Browser may reject file (file picker filters)
- ?? If uploaded, video player shows error
- ? App doesn't crash

---

### Test 11: Network Interruption

1. **Start** uploading large video
2. **Disconnect** internet mid-upload
3. **Reconnect** internet

**Expected Results:**
- ? Upload fails with error
- ? Error message shown
- ? Can retry upload

---

### Test 12: Browser Compatibility

Test on multiple browsers:
- [ ] Chrome/Edge (Desktop)
- [ ] Firefox (Desktop)
- [ ] Safari (Desktop/Mac)
- [ ] Chrome (Mobile/Android)
- [ ] Safari (Mobile/iOS)

**Expected Results:**
- ? Works on all modern browsers
- ? Videos play smoothly
- ? Upload works on all platforms

---

## Firebase Console Checks

### Verify Storage:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Storage**
4. Look in **videos/** folder

**Expected Results:**
- ? Uploaded videos appear as `.mp4` files
- ? File names include timestamp
- ? Can preview videos directly

---

### Verify Database:

1. Go to **Realtime Database**
2. Look at **customVideos** node
3. Expand to see entries

**Expected Results:**
```json
{
  "customVideos": {
    "controller1": {
      "url": "https://firebasestorage...",
      "timestamp": 1234567890123
    },
    "controller2": { ... },
    "gamer": { ... }
  }
}
```

---

## Success Criteria

All tests passed? ? You're ready to go!

- ? Videos upload successfully
- ? Cross-device sync works
- ? Real-time updates happen
- ? Progress bars display
- ? Errors handled gracefully
- ? Works on multiple browsers
- ? Firebase Storage shows videos
- ? Database contains URLs

---

## If Tests Fail

### Upload Fails
1. Check Firebase Storage rules
2. Verify file size (<50MB)
3. Check browser console for errors

### Sync Doesn't Work
1. Check Firebase Realtime Database rules
2. Verify both devices have internet
3. Check if listener is attached (console logs)

### Videos Don't Load
1. Check Firebase Storage CORS settings
2. Verify URLs in database are valid
3. Try accessing URL directly in browser

---

## Quick Checklist

Before considering setup complete:

- [ ] Firebase test page shows all green ?
- [ ] Can upload videos on one device
- [ ] Videos appear on other devices
- [ ] Progress bar works
- [ ] Sync indicator appears
- [ ] Console shows no errors
- [ ] Works without Firebase (fallback)
- [ ] All original features still work

---

**All tests passing? Congratulations! ?? Your cross-device video sync is working perfectly!**
