# Campus Connect Backend

## Setup

1. Install dependencies:
```bash
npm install
```

2. Setup PostgreSQL database:
```bash
createdb campus_connect
psql campus_connect < src/database/schema.sql
```

3. Setup Redis:
```bash
# Install Redis and start the server
redis-server
```

4. Configure environment:
```bash
cp .env.example .env
# Edit .env with your credentials
```

5. Run the server:
```bash
npm run dev
```

## API Endpoints

### Auth
- POST /api/auth/send-otp
- POST /api/auth/verify-otp
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/setup-pin
- POST /api/auth/verify-pin

### Profile
- GET /api/profile
- PUT /api/profile
- POST /api/profile/avatar
- POST /api/profile/photo
- POST /api/profile/report
- POST /api/profile/block

### Matching
- GET /api/match/queue
- POST /api/match/swipe
- GET /api/match/matches
- GET /api/match/study-partners

### Chat
- GET /api/chat
- POST /api/chat/create
- GET /api/chat/:chatId/messages
- POST /api/chat/:chatId/message
- POST /api/chat/:chatId/photo
- POST /api/chat/:chatId/screenshot

### Rooms
- POST /api/rooms/create
- GET /api/rooms
- POST /api/rooms/join
- POST /api/rooms/leave

## Socket.io Events

### Client -> Server
- join_chat
- send_message
- typing
- screenshot_detected
- join_room
- room_message

### Server -> Client
- new_message
- user_typing
- screenshot_alert
- room_message
