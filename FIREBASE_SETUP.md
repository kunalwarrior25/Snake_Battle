# Firebase Setup Instructions

## 🔥 Setting up Firebase for Multiplayer Snake Game

### Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project"
3. Enter a project name (e.g., "snake-game-multiplayer")
4. Follow the setup wizard
5. Enable Google Analytics (optional)

### Step 2: Enable Realtime Database

1. In your Firebase project, go to "Build" > "Realtime Database"
2. Click "Create Database"
3. Choose a location (closest to your users)
4. Start in **test mode** for development (or set up security rules)
5. Your database URL will look like: `https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com`

### Step 3: Get Your Firebase Configuration

1. In Firebase Console, click the gear icon ⚙️ > "Project settings"
2. Scroll down to "Your apps" section
3. Click the web icon `</>` to add a web app
4. Register your app with a nickname (e.g., "Snake Game Web")
5. Copy the `firebaseConfig` object

It will look like this:
```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project-default-rtdb.firebaseio.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123..."
};
```

### Step 4: Update `src/firebase.ts` (recommended: use environment variables)

You can either paste your Firebase config directly into `src/firebase.ts` (quick and dirty), or store values in environment variables (recommended for security).

If you prefer environment variables, create a `.env` file based on `.env.example` and add your `VITE_FIREBASE_*` values:

```
VITE_FIREBASE_API_KEY=YOUR_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=YOUR_PROJECT_ID.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET=YOUR_PROJECT_ID.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=YOUR_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID=YOUR_APP_ID
```

`src/firebase.ts` will read these `VITE_FIREBASE_*` values automatically when present; if they are missing it will fall back to the current values in source (not recommended for production).
### Step 5: Set Up Security Rules (Important!)

For development, you can use these permissive rules:

1. Go to "Realtime Database" > "Rules" tab
2. Replace with:

```json
{
  "rules": {
    "rooms": {
      "$roomCode": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

⚠️ **For production**, use more secure rules:

```json
{
  "rules": {
    "rooms": {
      "$roomCode": {
        ".read": true,
        ".write": "!data.exists() || data.child('players').hasChild(auth.uid)"
      }
    }
  }
}
```

### Step 6: Build and Run

```bash
npm install
npm run dev
```

## 🎮 How It Works

### Room System
- **Create Room**: Generates a unique 6-character code and stores it in Firebase
- **Join Room**: Players join using the room code
- **Real-time Updates**: Firebase automatically syncs player joins/leaves
- **Auto-start**: Game starts when host clicks "Start Game"

### Database Structure

```
rooms/
  ├── ABC123/
  │   ├── code: "ABC123"
  │   ├── hostId: "player1"
  │   ├── gameStarted: false
  │   ├── maxPlayers: 2
  │   ├── createdAt: 1234567890
  │   └── players/
  │       ├── player1/
  │       │   ├── id: 1
  │       │   ├── name: "Player1"
  │       │   ├── high_score: 100
  │       │   └── games_played: 5
  │       └── player2/
  │           ├── id: 2
  │           ├── name: "Player2"
  │           ├── high_score: 80
  │           └── games_played: 3
```

## 🔐 Security Best Practices

1. **Never commit your Firebase config to public repos**
   - Add `.env` file to `.gitignore`
   - Use environment variables for sensitive data

2. **Set up proper authentication** (optional)
   - Enable Firebase Authentication
   - Use Anonymous Auth or Email/Password

3. **Implement proper security rules**
   - Restrict write access to room creators/players
   - Validate data structure
   - Prevent unauthorized deletions

## 🌐 Deploy to Production

### Using Firebase Hosting

```bash
npm run build
firebase init hosting
firebase deploy
```

## 🐛 Troubleshooting

### "Permission denied" error
- Check your Realtime Database security rules
- Make sure they allow read/write access

### "Firebase not initialized" error
- Verify your `firebaseConfig` is correct
- Check that `databaseURL` is included

### Rooms not updating in real-time
- Check your internet connection
- Verify Firebase Realtime Database is enabled
- Check browser console for errors

## 📚 Additional Resources

- [Firebase Realtime Database Documentation](https://firebase.google.com/docs/database)
- [Firebase Security Rules](https://firebase.google.com/docs/database/security)
- [Firebase Web SDK](https://firebase.google.com/docs/web/setup)

## 🎉 You're All Set!

Now players can create rooms, share codes, and play multiplayer Snake in real-time!