-- Add WebRTC Signals Table to existing SkillSwap database
-- Run this in your Supabase SQL editor

-- 6. WebRTC Signals Table
create table if not exists webrtc_signals (
    id bigserial primary key,
    session_id bigint references sessions(id) on delete cascade,
    from_peer_id text not null,
    to_peer_id text not null,
    signal_data jsonb not null,
    signal_type text not null, -- 'offer', 'answer', 'ice-candidate'
    processed boolean default false,
    created_at timestamp default now()
);

-- Enable Row Level Security
alter table webrtc_signals enable row level security;

-- WebRTC Signals: Users can manage signals for their sessions
create policy "Users can view signals for their sessions" on webrtc_signals
    for select using (
        exists (
            select 1 from sessions 
            where sessions.id = webrtc_signals.session_id 
            and (sessions.host_id = auth.uid() or sessions.learner_id = auth.uid())
        )
    );

create policy "Users can insert signals for their sessions" on webrtc_signals
    for insert with check (
        exists (
            select 1 from sessions 
            where sessions.id = webrtc_signals.session_id 
            and (sessions.host_id = auth.uid() or sessions.learner_id = auth.uid())
        )
    );

create policy "Users can update signals for their sessions" on webrtc_signals
    for update using (
        exists (
            select 1 from sessions 
            where sessions.id = webrtc_signals.session_id 
            and (sessions.host_id = auth.uid() or sessions.learner_id = auth.uid())
        )
    );

-- Create index for better performance
create index if not exists idx_webrtc_signals_session_to_peer on webrtc_signals(session_id, to_peer_id, processed);
create index if not exists idx_webrtc_signals_created_at on webrtc_signals(created_at);