-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    online BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Groups table
CREATE TABLE IF NOT EXISTS groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    creator_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Group members table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS group_members (
    group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (group_id, user_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    sender_username VARCHAR(255) NOT NULL,
    receiver_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'TEXT',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (receiver_id IS NOT NULL OR group_id IS NOT NULL)
);

-- Calls table for call history
CREATE TABLE IF NOT EXISTS calls (
    id SERIAL PRIMARY KEY,
    caller_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    caller_username VARCHAR(255) NOT NULL,
    receiver_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    receiver_username VARCHAR(255),
    group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
    is_group_call BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) NOT NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    duration_seconds INTEGER,
    CHECK (receiver_id IS NOT NULL OR group_id IS NOT NULL)
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_group ON messages(group_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_calls_caller ON calls(caller_id);
CREATE INDEX IF NOT EXISTS idx_calls_receiver ON calls(receiver_id);
CREATE INDEX IF NOT EXISTS idx_calls_group ON calls(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
