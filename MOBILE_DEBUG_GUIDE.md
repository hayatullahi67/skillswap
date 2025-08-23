# 🐛 Mobile Video Call Debugging Guide

## **Why Laptop-to-Mobile Calls Are Failing**

If laptop-to-mobile calls aren't working, mobile-to-mobile definitely won't work either. Here's how to debug and fix this:

## **🔍 Step-by-Step Debugging**

### **Step 1: Test Mobile Device Setup**
```javascript
// In your mobile browser console, run:
await peerClient.testMobileConnection()
```

**Expected Output:**
```
🧪 Testing mobile connection...
📱 Device: Mobile
🍎 iOS: true/false
🌐 Safari: true/false
🔐 Permissions: {video: true, audio: true}
🔗 Peer status: {open: true, id: "your-peer-id", destroyed: false}
📊 Local stream: {videoTracks: 1, audioTracks: 1, active: true}
```

### **Step 2: Check Console Logs During Call**
When you make a call from laptop to mobile, watch the mobile console for:

**✅ Good Signs:**
```
📞 ===== INCOMING CALL RECEIVED =====
📱 Call object: [object]
🎯 Setting up incoming call handler...
📱 Answering incoming call...
✅ Call answered successfully
🎉 ===== REMOTE STREAM RECEIVED =====
```

**❌ Bad Signs:**
```
❌ Cannot set incoming call handler: Peer not initialized
❌ Could not get local stream for incoming call
❌ Call error
```

### **Step 3: Common Mobile Issues & Fixes**

#### **Issue 1: "Peer not initialized"**
**Problem:** Mobile device hasn't properly initialized the peer connection
**Fix:** Ensure mobile device calls `peerClient.initialize(userId)` before receiving calls

#### **Issue 2: "No local stream"**
**Problem:** Mobile can't access camera/microphone
**Fix:** 
- Check browser permissions
- Ensure HTTPS (required for iOS)
- Try audio-only fallback

#### **Issue 3: "Call error"**
**Problem:** Network or ICE connection issues
**Fix:** 
- Check mobile network connection
- Verify TURN servers are accessible
- Try different network (WiFi vs mobile data)

## **🧪 Testing Checklist**

### **Before Making Call:**
- [ ] Mobile device has initialized peer client
- [ ] Mobile device has granted camera/microphone permissions
- [ ] Mobile device shows "Peer connection opened with ID: ..."
- [ ] Mobile device has local stream (video or audio)

### **During Call:**
- [ ] Laptop initiates call successfully
- [ ] Mobile receives incoming call notification
- [ ] Mobile answers call successfully
- [ ] Both devices show remote streams

### **After Call:**
- [ ] Check console for any error messages
- [ ] Verify both devices can see/hear each other
- [ ] Test call quality and stability

## **🚨 Critical Mobile Requirements**

### **iOS Safari:**
- ✅ **HTTPS required** (no HTTP)
- ✅ **User interaction required** before media access
- ✅ **Permissions must be granted** in browser settings

### **Android Chrome:**
- ✅ **Permissions granted** in app settings
- ✅ **WebRTC enabled** (should be by default)
- ✅ **No battery optimization** blocking background processes

### **General Mobile:**
- ✅ **Stable internet connection** (WiFi preferred)
- ✅ **Camera/microphone not used by other apps**
- ✅ **Browser not in background** during call

## **🔧 Quick Fixes to Try**

### **Fix 1: Restart Mobile Connection**
```javascript
// On mobile device:
await peerClient.restartConnection()
await peerClient.initialize('your-user-id')
```

### **Fix 2: Check Connection Health**
```javascript
// On mobile device:
const health = await peerClient.checkConnectionHealth()
console.log('Connection health:', health)
```

### **Fix 3: Force Audio-Only Mode**
```javascript
// On mobile device:
await peerClient.updateMediaConstraints(false, true) // video off, audio on
```

## **📱 Mobile-Specific Test Cases**

### **Test Case 1: Basic Call Setup**
1. Initialize peer on mobile
2. Initialize peer on laptop
3. Make call from laptop to mobile
4. Check mobile receives call
5. Check mobile can answer call

### **Test Case 2: Media Streams**
1. Verify mobile has local stream
2. Verify laptop has local stream
3. Check both devices receive remote streams
4. Test video and audio quality

### **Test Case 3: Network Handling**
1. Test on WiFi
2. Test on mobile data
3. Test with poor connection
4. Test reconnection after disconnection

## **🎯 Expected Results After Fixes**

- ✅ **Mobile receives incoming calls** from laptop
- ✅ **Mobile can answer calls** successfully
- ✅ **Both devices see/hear each other**
- ✅ **Calls are stable** on mobile networks
- ✅ **Graceful fallback** to audio-only if video fails

## **🚀 Next Steps**

1. **Run the debug test** on mobile device
2. **Check console logs** during call attempts
3. **Verify all requirements** are met
4. **Test with different mobile devices** if possible
5. **Implement fixes** based on error messages

## **📞 Still Not Working?**

If mobile calls still fail after following this guide:

1. **Check browser console** for specific error messages
2. **Verify network connectivity** on mobile device
3. **Test with different mobile browsers** (Chrome, Safari, Firefox)
4. **Check if TURN servers** are accessible from mobile
5. **Consider implementing** adaptive bitrate and connection quality monitoring

The enhanced debugging in the peer client should now give you much clearer information about what's failing on mobile devices!
