# Snake Battle - Flask Backend

## Setup Instructions

### 1. Create a virtual environment
```bash
cd backend
python -m venv venv
```

### 2. Activate the virtual environment

**Windows:**
```bash
venv\Scripts\activate
```

**Mac/Linux:**
```bash
source venv/bin/activate
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Set up environment variables
```bash
cp .env.example .env
# Edit .env and update SECRET_KEY
```

### 5. Run the Flask server
```bash
python app.py
```

The server will run on `http://localhost:5000`

## API Endpoints

### Health Check
- `GET /api/health` - Check if API is running

### Players
- `POST /api/players` - Create a new player
  ```json
  { "name": "PlayerName" }
  ```
- `GET /api/players/<id>` - Get player by ID
- `PUT /api/players/<id>` - Update player stats
- `GET /api/players` - Get all players

### Game Sessions
- `POST /api/sessions` - Create a new game session
  ```json
  {
    "player_id": 1,
    "mode": "single",
    "score": 1500,
    "level_reached": 3,
    "completed": false,
    "duration": 180
  }
  ```
- `GET /api/sessions/player/<id>` - Get all sessions for a player
- `GET /api/sessions` - Get all sessions (last 100)

### Leaderboard
- `GET /api/leaderboard?limit=10` - Get top players

### Statistics
- `GET /api/stats` - Get global game statistics
- `GET /api/stats/player/<id>` - Get player-specific statistics

## Database

The app uses SQLite by default (stored in `game.db`). You can change to PostgreSQL or MySQL by updating the `DATABASE_URL` in `.env`.

### Tables
- **players**: Stores player information and high scores
- **game_sessions**: Stores individual game session data