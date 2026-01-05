# Flask + Firebase Integration Guide

## 🐍 Combining Flask Backend with Firebase Real-time Multiplayer

This guide shows how to use both Flask (for player management, stats, leaderboards) and Firebase (for real-time multiplayer rooms).

## Architecture Overview

```
┌─────────────────┐
│   React App     │
└────┬──────┬─────┘
     │      │
     │      └─────────────┐
     │                    │
┌────▼──────┐     ┌──────▼──────┐
│   Flask   │     │   Firebase  │
│  Backend  │     │  Realtime   │
│           │     │   Database  │
└───────────┘     └─────────────┘
     │                    │
     │                    │
┌────▼────────────────────▼─────┐
│     Player Data & Rooms        │
└────────────────────────────────┘
```

### What Each System Handles

**Flask Backend** (Python):
- Player account creation
- Authentication
- High scores persistence
- Game statistics
- Leaderboards
- Player profiles
- Game history

**Firebase Realtime Database**:
- Room creation/joining
- Real-time player presence
- Live game state
- Instant synchronization
- Room code validation

## Flask Backend Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

Your `requirements.txt` should include:
```
Flask==3.1.0
Flask-CORS==4.0.0
firebase-admin==6.3.0  # For Firebase Admin SDK
```

### 2. Flask API Endpoints

Here's your complete Flask backend (`backend.py`):

```python
from flask import Flask, request, jsonify
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, db
import os

app = Flask(__name__)
CORS(app)

# Initialize Firebase Admin SDK (optional, for server-side Firebase access)
# Download service account key from Firebase Console
if os.path.exists('firebase-service-account.json'):
    cred = credentials.Certificate('firebase-service-account.json')
    firebase_admin.initialize_app(cred, {
        'databaseURL': 'https://your-project-default-rtdb.firebaseio.com'
    })

# In-memory database (replace with PostgreSQL/MySQL in production)
players = {}
game_sessions = []
player_id_counter = 1

# Player Management
@app.route('/api/players', methods=['POST'])
def create_player():
    global player_id_counter
    data = request.json
    player = {
        'id': player_id_counter,
        'name': data.get('name', f'Player{player_id_counter}'),
        'high_score': 0,
        'games_played': 0,
        'levels_completed': 0
    }
    players[player_id_counter] = player
    player_id_counter += 1
    return jsonify(player), 201

@app.route('/api/players/<int:player_id>', methods=['GET'])
def get_player(player_id):
    player = players.get(player_id)
    if player:
        return jsonify(player)
    return jsonify({'error': 'Player not found'}), 404

@app.route('/api/players/<int:player_id>', methods=['PUT'])
def update_player(player_id):
    player = players.get(player_id)
    if not player:
        return jsonify({'error': 'Player not found'}), 404
    
    data = request.json
    player.update({
        'high_score': max(player['high_score'], data.get('high_score', 0)),
        'games_played': player['games_played'] + 1,
        'levels_completed': max(player['levels_completed'], data.get('levels_completed', 0))
    })
    return jsonify(player)

# Game Sessions
@app.route('/api/game-sessions', methods=['POST'])
def save_game_session():
    data = request.json
    session = {
        'id': len(game_sessions) + 1,
        'player_id': data.get('player_id'),
        'game_mode': data.get('game_mode'),
        'score': data.get('score'),
        'level_reached': data.get('level_reached'),
        'timestamp': data.get('timestamp')
    }
    game_sessions.append(session)
    
    # Update player high score
    player_id = data.get('player_id')
    if player_id in players:
        players[player_id]['high_score'] = max(
            players[player_id]['high_score'],
            data.get('score', 0)
        )
    
    return jsonify(session), 201

# Leaderboard
@app.route('/api/leaderboard', methods=['GET'])
def get_leaderboard():
    game_mode = request.args.get('mode', 'all')
    
    # Filter sessions by game mode
    if game_mode != 'all':
        sessions = [s for s in game_sessions if s['game_mode'] == game_mode]
    else:
        sessions = game_sessions
    
    # Sort by score
    sorted_sessions = sorted(sessions, key=lambda x: x['score'], reverse=True)[:10]
    
    # Add player names
    leaderboard = []
    for session in sorted_sessions:
        player = players.get(session['player_id'], {})
        leaderboard.append({
            'rank': len(leaderboard) + 1,
            'player_name': player.get('name', 'Unknown'),
            'score': session['score'],
            'level': session.get('level_reached', 1),
            'game_mode': session['game_mode']
        })
    
    return jsonify(leaderboard)

# Server-side Firebase Room Management (optional)
@app.route('/api/rooms/<room_code>/validate', methods=['GET'])
def validate_room(room_code):
    """Validate if a room exists in Firebase"""
    try:
        ref = db.reference(f'rooms/{room_code}')
        room_data = ref.get()
        
        if room_data:
            return jsonify({
                'valid': True,
                'players': len(room_data.get('players', {})),
                'started': room_data.get('gameStarted', False)
            })
        return jsonify({'valid': False}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Health Check
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'ok',
        'players': len(players),
        'sessions': len(game_sessions)
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
```

### 3. Run Flask Backend

```bash
python backend.py
```

Server will run on `http://localhost:5000`

## Frontend Integration

The React app is already set up to connect to Flask! Check `src/api/gameApi.ts`:

```typescript
const API_URL = 'http://localhost:5000/api';

export const gameApi = {
  createPlayer: async (name: string) => { ... },
  getPlayer: async (id: number) => { ... },
  updatePlayer: async (id: number, data: any) => { ... },
  saveGameSession: async (session: GameSession) => { ... },
  getLeaderboard: async (mode?: string) => { ... }
};
```

## Complete Workflow

### 1. Player Creates Account (Flask)
```
Player opens app → React calls Flask API
→ Flask creates player account
→ Returns player ID
→ Stored in localStorage
```

### 2. Player Creates Multiplayer Room (Firebase)
```
Player clicks "Create Room"
→ React calls firebaseService.createRoom()
→ Firebase generates room code
→ Room stored in Firebase Realtime Database
```

### 3. Another Player Joins (Firebase)
```
Player enters room code
→ React calls firebaseService.joinRoom()
→ Firebase validates and adds player
→ Both players see updates in real-time
```

### 4. Game Ends (Both Systems)
```
Game over → React saves to Flask:
  - Final score
  - Level reached
  - Player stats update

And optionally to Firebase:
  - Room cleanup
  - Final game state
```

## Environment Variables

Create a `.env` file:

```env
# Flask Backend
FLASK_API_URL=http://localhost:5000/api

# Firebase Config
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your_project-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

Update `src/firebase.ts` to use environment variables:

```typescript
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};
```

## Production Deployment

### Deploy Flask to Heroku/Railway

```bash
# Create Procfile
web: gunicorn backend:app

# Deploy
git push heroku main
```

### Deploy React + Firebase to Vercel/Netlify

```bash
npm run build
# Upload dist/ folder to hosting service
```

## Benefits of This Architecture

✅ **Flask** handles:
- Persistent player data
- Complex queries
- Server-side validation
- Database management

✅ **Firebase** handles:
- Real-time synchronization
- Low latency updates
- Room management
- Instant messaging

✅ **Best of both worlds**:
- Scalable backend (Flask)
- Real-time multiplayer (Firebase)
- Offline-capable (localStorage fallback)

## Cost Considerations

**Firebase Free Tier**:
- 1 GB stored
- 10 GB/month downloaded
- 100 simultaneous connections

**Flask Hosting**:
- Heroku: Free tier available
- Railway: Free tier available
- DigitalOcean: $5/month

## 🎉 You're Ready!

Your game now has:
- ✅ Python Flask backend for data management
- ✅ Firebase for real-time multiplayer
- ✅ React frontend with smooth integration
- ✅ Persistent player stats
- ✅ Real-time room synchronization