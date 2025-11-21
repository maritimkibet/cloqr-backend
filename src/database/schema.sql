-- Users table
CREATE TABLE users (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_hash VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  campus VARCHAR(100) NOT NULL,
  avatar_url VARCHAR(255),
  blurred_photo_url VARCHAR(255),
  pin_hash VARCHAR(255),
  mode VARCHAR(20) DEFAULT 'dating',
  trust_score INTEGER DEFAULT 100,
  is_verified BOOLEAN DEFAULT false,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Profiles table
CREATE TABLE profiles (
  profile_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  year INTEGER,
  course VARCHAR(100),
  bio TEXT,
  interests JSONB,
  study_style VARCHAR(50),
  study_time VARCHAR(50),
  hobbies JSONB,
  personality JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Matches table
CREATE TABLE matches (
  match_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a UUID REFERENCES users(user_id) ON DELETE CASCADE,
  user_b UUID REFERENCES users(user_id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending',
  match_score INTEGER,
  matched_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_a, user_b)
);

-- Chats table
CREATE TABLE chats (
  chat_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) DEFAULT 'direct',
  name VARCHAR(100),
  created_by UUID REFERENCES users(user_id),
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chat members table
CREATE TABLE chat_members (
  chat_id UUID REFERENCES chats(chat_id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (chat_id, user_id)
);

-- Messages table (stored temporarily)
CREATE TABLE messages (
  message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES chats(chat_id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  content TEXT,
  type VARCHAR(20) DEFAULT 'text',
  is_one_time BOOLEAN DEFAULT false,
  viewed_by JSONB DEFAULT '[]',
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- QR Rooms table
CREATE TABLE qr_rooms (
  room_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES users(user_id),
  name VARCHAR(100) NOT NULL,
  qr_code VARCHAR(255) UNIQUE NOT NULL,
  room_type VARCHAR(50),
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Campus Verification QR Codes
CREATE TABLE campus_qr_codes (
  qr_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campus_name VARCHAR(100) NOT NULL,
  qr_code VARCHAR(255) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Room members table
CREATE TABLE room_members (
  room_id UUID REFERENCES qr_rooms(room_id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  burner_username VARCHAR(50),
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (room_id, user_id)
);

-- Swipes table
CREATE TABLE swipes (
  swipe_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  swiper_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  swiped_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  direction VARCHAR(10),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(swiper_id, swiped_id)
);

-- Reports table
CREATE TABLE reports (
  report_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES users(user_id),
  reported_id UUID REFERENCES users(user_id),
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Blocks table
CREATE TABLE blocks (
  block_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  blocked_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(blocker_id, blocked_id)
);

-- Campuses table
CREATE TABLE campuses (
  campus_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  campus_code VARCHAR(20) UNIQUE NOT NULL,
  location VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- OTP table
CREATE TABLE otps (
  otp_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_hash VARCHAR(255) NOT NULL,
  otp_code VARCHAR(6) NOT NULL,
  campus_id UUID REFERENCES campuses(campus_id),
  has_edu_email BOOLEAN DEFAULT false,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_users_campus ON users(campus);
CREATE INDEX idx_profiles_course ON profiles(course);
CREATE INDEX idx_matches_users ON matches(user_a, user_b);
CREATE INDEX idx_messages_chat ON messages(chat_id);
CREATE INDEX idx_messages_expires ON messages(expires_at);
CREATE INDEX idx_qr_rooms_expires ON qr_rooms(expires_at);
CREATE INDEX idx_otps_email ON otps(email_hash);
