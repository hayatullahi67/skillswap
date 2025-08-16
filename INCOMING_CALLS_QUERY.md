# Incoming Calls Query System

## How It Works

### 1. **Automatic Call Detection**
The system automatically checks for incoming calls in multiple ways:

#### A. Real-time Subscription (Primary)
```javascript
// Listens for new sessions where current user is the teacher
const teacherChannel = supabase
  .channel(`teacher-${user.id}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'sessions',
    filter: `host_id=eq.${user.id}`
  }, (payload) => {
    // Instantly shows incoming call UI
    setIncomingCall(payload.new)
    setCallState('incoming')
  })
```

#### B. Periodic Polling (Backup)
```javascript
// Checks every 5 seconds as backup
setInterval(() => {
  if (user && callState === 'idle') {
    checkForIncomingCalls()
  }
}, 5000)
```

#### C. Manual Check (User Triggered)
```javascript
// User can manually check for calls
<Button onClick={checkForIncomingCalls}>
  Check for Incoming Calls
</Button>
```

### 2. **The Core Query**
```sql
SELECT 
  id,
  learner_id,
  skill_name,
  created_at,
  expires_at,
  profiles.name as learner_name
FROM sessions
JOIN profiles ON sessions.learner_id = profiles.id
WHERE 
  host_id = $1                          -- Current user is the teacher
  AND status = 'pending'                -- Call is still waiting
  AND expires_at > NOW()                -- Call hasn't expired
ORDER BY created_at DESC
LIMIT 1;
```

### 3. **When a Call is Found**
```javascript
// Sets up the incoming call UI
setIncomingCall({
  sessionId: session.id,
  learnerName: session.profiles.name,
  skillName: session.skill_name,
  learnerId: session.learner_id
})
setCallState('incoming') // Shows Accept/Reject UI
```

### 4. **Accept/Reject Actions**

#### Accept Call:
```javascript
// Atomic update - prevents race conditions
const { data } = await supabase
  .from('sessions')
  .update({
    status: 'accepted',
    started_at: new Date().toISOString(),
    room_id: generateRoomId()
  })
  .eq('id', sessionId)
  .eq('status', 'pending')  // Only if still pending
  .select()
  .single()

if (data) {
  // Start video call
  startVideoCall(data.room_id)
}
```

#### Reject Call:
```javascript
await supabase
  .from('sessions')
  .update({
    status: 'rejected',
    ended_at: new Date().toISOString()
  })
  .eq('id', sessionId)
  .eq('status', 'pending')  // Only if still pending
```

### 5. **UI Flow**

```
Teacher on Live Page
        ↓
Automatic call checking starts
        ↓
Learner creates session → INSERT into sessions
        ↓
Real-time subscription triggers → checkForIncomingCalls()
        ↓
Query finds pending session → Shows Accept/Reject UI
        ↓
Teacher clicks Accept → Updates session → Both users connect
        ↓
Teacher clicks Reject → Updates session → Learner redirected to AI Tutorial
```

### 6. **Key Features**

✅ **Instant Notifications** - Real-time subscriptions for immediate alerts
✅ **Backup Polling** - Periodic checks in case real-time fails  
✅ **Manual Refresh** - Teachers can manually check for calls
✅ **Expiration Handling** - Calls timeout after 60 seconds
✅ **Race Condition Prevention** - Atomic updates with status checks
✅ **Graceful Fallbacks** - Redirects to AI tutorial if calls fail

### 7. **Testing the Query**

You can test the query directly in Supabase SQL Editor:

```sql
-- Replace 'your-user-id' with actual teacher's user ID
SELECT 
  s.id,
  s.learner_id,
  s.skill_name,
  s.created_at,
  s.expires_at,
  p.name as learner_name
FROM sessions s
JOIN profiles p ON s.learner_id = p.id
WHERE 
  s.host_id = 'your-user-id'
  AND s.status = 'pending'
  AND s.expires_at > NOW()
ORDER BY s.created_at DESC;
```

This system ensures teachers never miss incoming calls and provides multiple ways to detect them!