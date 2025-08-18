# Real-time Debugging Guide

## Common Issues Why Teacher Doesn't Receive Calls:

### 1. **Database Schema Issues**
- Missing columns in sessions table
- Run the migration script first!

### 2. **Real-time Not Enabled**
- Go to Supabase Dashboard → Settings → API
- Make sure "Enable Realtime" is ON
- Go to Database → Replication
- Enable replication for `sessions` table

### 3. **RLS Policies Blocking**
- Real-time subscriptions need proper RLS policies
- Check if teacher can SELECT from sessions table

### 4. **Teacher Not on Live Page**
- Real-time subscriptions only work when page is loaded
- Teacher must be on `/live` page to receive calls

### 5. **Network/Connection Issues**
- Check browser console for WebSocket errors
- Try refreshing both pages

## Debugging Steps:

### Step 1: Check Database Schema
```sql
-- Run in Supabase SQL Editor
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'sessions';
```

### Step 2: Test Manual Session Creation
```sql
-- Create test session
INSERT INTO sessions (host_id, learner_id, skill_name, mode, status)
VALUES ('teacher-user-id', 'learner-user-id', 'Test Skill', 'live', 'pending');
```

### Step 3: Check Real-time Status
- Open browser console on teacher's page
- Look for: "✅ Successfully subscribed to incoming calls"
- If not, check real-time configuration

### Step 4: Test with Debug Buttons
- Use "Test Session" button to create session to yourself
- Use "Check Pending" to see if sessions exist

### Step 5: Check RLS Policies
```sql
-- Check if user can see sessions
SELECT * FROM sessions WHERE host_id = 'your-user-id';
```

## Expected Console Output:

### When Learner Clicks "Start Session":
```
📝 Creating session with data: {...}
✅ Session created successfully: {...}
✅ Session verified in database: {...}
```

### When Teacher Should Receive Call:
```
🔔 INCOMING CALL DETECTED!
📞 Payload received: {...}
✅ Caller info: {...}
📞 Setting incoming call data: {...}
```

If you don't see these logs, the issue is with real-time setup!