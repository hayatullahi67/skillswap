# Complete Call Flow Implementation

## 📞 Call Flow Diagram

```
LEARNER SIDE                    SUPABASE                    TEACHER SIDE
============                    ========                    ============

1. Click "Start Session"
   ↓
2. Create session record
   status: 'pending'            INSERT into sessions        
   expires_at: +60s             ↓
   ↓                           Real-time trigger
3. Show "Calling..."            ↓                          4. Receive notification
   with Cancel button           ↓                             Show Accept/Reject UI
   ↓                           ↓                             ↓
   Wait for response...         ↓                          5. Teacher clicks Accept
                               ↓                             ↓
                               UPDATE sessions              6. Update session:
                               status: 'accepted'              status: 'accepted'
                               room_id: 'room-123'             started_at: now()
                               ↓                               room_id: generated
                               Real-time trigger               ↓
                               ↓                            7. Start video call
8. Receive "accepted"          ↓                             ↓
   ↓                          ↓                            Connect to room
9. Start video call           ↓
   ↓                         ↓
10. Connect to same room      ↓
    ↓                        ↓
11. 🎥 VIDEO CALL ACTIVE 🎥  ↓                           12. 🎥 VIDEO CALL ACTIVE 🎥
    ↓                        ↓                               ↓
    Either user clicks       ↓                               Either user clicks
    "End Call"               ↓                               "End Call"
    ↓                        ↓                               ↓
13. UPDATE sessions          ↓                           14. UPDATE sessions
    status: 'ended'          ↓                               status: 'ended'
    ended_at: now()          ↓                               ended_at: now()
    ↓                        ↓                               ↓
    Real-time trigger        ↓                               Real-time trigger
    ↓                        ↓                               ↓
15. Both users see           ↓                           16. Both users see
    "Call Ended"             ↓                               "Call Ended"
    ↓                        ↓                               ↓
16. Return to idle state     ↓                           17. Return to idle state
```

## 🔄 Real-time Subscriptions

### Teacher Subscription (Incoming Calls)
```javascript
supabase
  .channel(`teacher-${user.id}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'sessions',
    filter: `host_id=eq.${user.id}`
  }, (payload) => {
    // Show incoming call UI
    setIncomingCall(payload.new)
    setCallState('incoming')
  })
```

### Learner Subscription (Call Status Updates)
```javascript
supabase
  .channel(`learner-${user.id}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'sessions',
    filter: `learner_id=eq.${user.id}`
  }, (payload) => {
    if (payload.new.status === 'accepted') {
      startVideoCall(payload.new.room_id)
    } else if (payload.new.status === 'rejected') {
      showRejectedMessage()
    }
  })
```

## 📊 Session Status Flow

```
pending → accepted → ended
   ↓         ↓
rejected   cancelled
```

### Status Meanings:
- **pending**: Call is waiting for teacher response
- **accepted**: Teacher accepted, video call starting
- **rejected**: Teacher declined the call
- **cancelled**: Learner cancelled before teacher responded
- **ended**: Call finished normally

## 🎯 Key Implementation Features

### ✅ Atomic Updates
```javascript
// Only update if still pending (prevents race conditions)
const { data } = await supabase
  .from('sessions')
  .update({ status: 'accepted', room_id: roomId })
  .eq('id', sessionId)
  .eq('status', 'pending')  // Critical: only if still pending
  .select()
  .single()

if (!data) {
  // Session was already handled by someone else
  return { error: 'Session already handled' }
}
```

### ✅ Real-time Notifications
- **Instant updates** via Supabase real-time
- **Both users notified** simultaneously
- **No page refresh** required

### ✅ Timeout Handling
```javascript
// Calls expire after 60 seconds
expires_at: new Date(Date.now() + 60 * 1000).toISOString()

// Query only non-expired calls
.gt('expires_at', new Date().toISOString())
```

### ✅ Error Handling
- **Graceful fallbacks** to AI tutorial
- **Cleanup on errors** (disconnect peer, reset state)
- **User feedback** via toast notifications

## 🚀 Video Call Integration

### Room Generation
```javascript
const roomId = `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
```

### PeerJS Connection
```javascript
// Both users connect to same room
await peerClient.initialize(`${user.id}-${roomId}`)
const stream = await peerClient.getLocalStream()
// Start video call...
```

## 🔧 Database Schema Required

```sql
CREATE TABLE sessions (
  id bigserial PRIMARY KEY,
  host_id uuid REFERENCES profiles(id),     -- Teacher
  learner_id uuid REFERENCES profiles(id),  -- Caller
  skill_name text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','cancelled','ended')),
  room_id text,                             -- Video room ID
  created_at timestamp DEFAULT now(),
  started_at timestamp,                     -- When accepted
  ended_at timestamp,                       -- When finished
  expires_at timestamp                      -- Call timeout
);
```

This implementation provides a complete WhatsApp-like calling experience with real-time notifications, proper state management, and robust error handling! 🎉