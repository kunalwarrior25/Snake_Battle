# 🐍 Snake Battle - You Can't Complete This!

An advanced multiplayer Snake game with **React (Web)**, **Python Desktop GUI**, **Firebase** (Real-time Multiplayer), and **Flask** (Backend API).

## 📁 Project Structure

```
Snake-Battle/
│
├── backend/              # Flask Python backend
│   ├── app.py           # Main Flask application
│   ├── requirements.txt # Python dependencies
│   ├── .env.example     # Environment variables template
│   └── README.md        # Backend documentation
│
├── frontend/
│   ├── desktop-version/ # Python GUI games (Tkinter/PyQt)
│   │   ├── gui_tkinter_snake.py
│   │   └── (More GUI files...)
│   │
│   └── phone-version/   # React web app (works on mobile too!)
│       ├── src/
│       ├── public/
│       └── (Web app files in root...)
│
├── run.py              # Main runner - starts both backend & frontend
├── .firebaserc         # Firebase configuration
├── .gitignore          # Git ignore rules
├── database.rules.json # Firebase security rules
├── firebase.json       # Firebase hosting config
├── package.json        # Node.js dependencies
├── package-lock.json   # Locked dependencies
├── README.md           # This file!
└── requirements.txt    # Python requirements
```

![Snake Game](https://img.shields.io/badge/Game-Snake-green)
![React](https://img.shields.io/badge/React-18-blue)
![Firebase](https://img.shields.io/badge/Firebase-Realtime-orange)
![Flask](https://img.shields.io/badge/Flask-Python-red)

## 🎮 Features

### **Single Player Mode** 🎯
- **4 Game Modes**:
  - 🎮 **Classic** - Traditional snake, hit walls = game over
  - ⚡ **Speed** - Fast-paced with edge wrapping
  - 🧱 **Walls** - Random obstacles to avoid
  - 🌀 **Portal** - Teleport through portals!

- **Food Types**:
  - 🟢 Normal (10 points)
  - 🟡 Golden (50 points - rare!)
  - 🔵 Speed Boost (15 points + temp speed)
  - 🟣 Slow Down (5 points, slows you down)

- **Progressive Difficulty**:
  - Levels increase every 5 foods
  - Speed increases with levels
  - New obstacles spawn

### **Local Multiplayer** 👥
- **2 players on same keyboard**
- Player 1: WASD controls
- Player 2: Arrow keys
- 2-minute competitive timer
- Real-time score tracking
- Collision detection between players

### **Online Multiplayer Rooms** 🔥
- **Firebase-powered real-time rooms**
- Create rooms with 6-character codes
- Share codes with friends
- Live player join notifications
- Host controls game start
- Auto-sync across all players

### **Flask Backend Integration** 🐍
- Player account system
- High score persistence
- Game statistics tracking
- Leaderboards
- Game session history

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Python 3.8+ (for Flask backend)
- Firebase account (for multiplayer)

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd snake-game

# Install frontend dependencies
npm install

# Install backend dependencies (optional)
pip install -r requirements.txt
```

### Run Development Server

```bash
# Start React app
npm run dev

# In another terminal, start Flask backend (optional)
python backend.py
```

Visit `http://localhost:5173`

## 📁 Project Structure

```
├── src/
│   ├── components/
│   │   ├── Menu.tsx              # Main menu
│   │   ├── SnakeGame.tsx         # Single player game
│   │   ├── MultiSnakeGame.tsx    # Local multiplayer
│   │   └── RoomLobby.tsx         # Online multiplayer lobby
│   ├── services/
│   │   └── firebaseService.ts    # Firebase operations
│   ├── api/
│   │   └── gameApi.ts            # Flask API client
│   ├── firebase.ts               # Firebase config
│   └── App.tsx                   # Main app component
├── backend.py                     # Flask backend server
├── requirements.txt               # Python dependencies
├── FIREBASE_SETUP.md             # Firebase setup guide
├── FLASK_INTEGRATION.md          # Backend integration guide
└── README.md                      # This file
```

## 🔧 Configuration

### Firebase Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Realtime Database
3. Get your configuration from Project Settings
4. Update `src/firebase.ts` with your config

See [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) for detailed instructions.

### Flask Backend Setup

1. Configure your database (SQLite/PostgreSQL/MySQL)
2. Update environment variables
3. Run migrations if needed

See [FLASK_INTEGRATION.md](./FLASK_INTEGRATION.md) for detailed instructions.

## 🎯 Controls

### Single Player
- **Arrow Keys** or **WASD** - Move snake
- **ESC** - Pause/Resume

### Local Multiplayer
- **Player 1**: W (up), S (down), A (left), D (right)
- **Player 2**: ↑ (up), ↓ (down), ← (left), → (right)
- **ESC** - Pause/Resume

## 🏗️ Tech Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Vite** - Build tool
- **Canvas API** - Game rendering

### Backend
- **Firebase Realtime Database** - Real-time sync
- **Flask** - Python web framework
- **Flask-CORS** - Cross-origin requests

## 📊 Features Breakdown

| Feature | Single Player | Local MP | Online MP |
|---------|--------------|----------|-----------|
| Real-time gameplay | ✅ | ✅ | ✅ |
| High scores | ✅ | ✅ | ✅ |
| Multiple modes | ✅ | ❌ | ❌ |
| Food variety | ✅ | ✅ | ✅ |
| Leaderboards | ✅ | ✅ | ✅ |
| Room codes | ❌ | ❌ | ✅ |
| Remote play | ❌ | ❌ | ✅ |

## 🎨 Design Features

- **Dark Theme** - Easy on the eyes
- **Gradient Accents** - Modern look
- **Smooth Animations** - Polished feel
- **Particle Effects** - Visual feedback
- **Responsive Design** - Works on all screens
- **Glassmorphism** - Frosted glass effects

## 📈 Performance

- **60 FPS** gameplay
- **Optimized rendering** with Canvas
- **Efficient state management**
- **Real-time updates** < 100ms latency
- **Build size**: ~532 KB (150 KB gzipped)

## 🔐 Security

- Firebase Security Rules configured
- CORS enabled for Flask
- Environment variables for secrets
- Input validation on all forms
- Sanitized player data

## 🚢 Deployment

### Deploy Frontend
```bash
npm run build
# Upload dist/ to Vercel, Netlify, or Firebase Hosting
```

### Deploy Backend
```bash
# Deploy to Heroku, Railway, or DigitalOcean
git push heroku main
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is open source and available under the MIT License.

## 🎯 Future Enhancements

- [ ] AI opponent mode
- [ ] Power-ups system
- [ ] Custom skins/themes
- [ ] Tournament mode
- [ ] Spectator mode
- [ ] Chat system
- [ ] Replay system
- [ ] Mobile app version
- [ ] Achievement system
- [ ] Seasonal events

## 🐛 Known Issues

- None currently! Report bugs in the Issues section.

## 💡 Tips & Tricks

1. **Plan ahead** - Look at the food position before moving
2. **Use edges** - In wrap modes, use screen edges strategically
3. **Chase gold** - Golden food is rare but worth 50 points!
4. **Speed boost** - Use wisely to escape tight spots
5. **Portal play** - In portal mode, learn the entrance/exit pairs

## 📞 Support

For questions or issues:
- Open an issue on GitHub
- Check the documentation files
- Review Firebase and Flask setup guides

## 🙏 Acknowledgments

- Built with ❤️ using React and Firebase
- Inspired by classic Snake games
- Modern design inspired by glassmorphism trends

---

**Made with 🐍 and ☕ | Happy Gaming!**