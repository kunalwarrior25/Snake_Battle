import { db } from '../firebase/config';
import { ref, set, get, update, onValue, remove, child } from 'firebase/database';

export type GameMode = 'CLASSIC' | 'SPEED' | 'WALLS' | 'PORTAL' | 'ARENA';

export interface FirebasePlayer {
  id: string;
  name: string;
  isHost: boolean;
  score: number;
}

export interface FirebaseRoom {
  roomCode: string;
  players: FirebasePlayer[];
  status: 'waiting' | 'playing';
  gameMode?: GameMode;
}

class FirebaseService {
  // Create a new room with a random 6-character code
  async createRoom(playerName: string): Promise<string> {
    const roomCode = this.generateRoomCode();
    const roomRef = ref(db, `rooms/${roomCode}`);
    
    const snapshot = await get(roomRef);
    if (snapshot.exists()) {
      return this.createRoom(playerName);
    }

    const hostPlayer: FirebasePlayer = {
      id: `player_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: playerName,
      isHost: true,
      score: 0
    };

    const roomData: FirebaseRoom = {
      roomCode,
      players: [hostPlayer],
      status: 'waiting'
    };

    await set(roomRef, roomData);
    return roomCode;
  }

  // Join an existing room
  async joinRoom(roomCode: string, playerName: string): Promise<void> {
    const roomRef = ref(db, `rooms/${roomCode}`);
    const snapshot = await get(roomRef);

    if (!snapshot.exists()) {
      throw new Error("Room does not exist");
    }

    const roomData = snapshot.val() as FirebaseRoom;

    if (roomData.status === 'playing') {
      throw new Error("Game already in progress");
    }

    if (roomData.players.length >= 2) {
      const existingPlayer = roomData.players.find(p => p.name === playerName);
      if (existingPlayer) return; 
      throw new Error("Room is full");
    }

    const newPlayer: FirebasePlayer = {
      id: `player_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: playerName,
      isHost: false,
      score: 0
    };

    const updatedPlayers = [...roomData.players, newPlayer];
    await update(roomRef, { players: updatedPlayers });
  }

  // Leave a room
  async leaveRoom(roomCode: string, playerName: string): Promise<void> {
    const roomRef = ref(db, `rooms/${roomCode}`);
    const snapshot = await get(roomRef);

    if (!snapshot.exists()) return;

    const roomData = snapshot.val() as FirebaseRoom;
    const updatedPlayers = roomData.players.filter(p => p.name !== playerName);

    if (updatedPlayers.length === 0) {
      await remove(roomRef);
    } else {
      if (updatedPlayers.length > 0 && !updatedPlayers.some(p => p.isHost)) {
        updatedPlayers[0].isHost = true;
      }
      await update(roomRef, { players: updatedPlayers });
    }
  }

  // Listen to room updates
  listenToRoom(roomCode: string, callback: (room: FirebaseRoom | null) => void): () => void {
    const roomRef = ref(db, `rooms/${roomCode}`);
    const unsubscribe = onValue(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val());
      } else {
        callback(null);
      }
    });
    return unsubscribe;
  }

  // Start the game
  async startGame(roomCode: string): Promise<void> {
    const roomRef = ref(db, `rooms/${roomCode}`);
    await update(roomRef, { status: 'playing' });
  }

  // Update game mode
  async updateRoomMode(roomCode: string, mode: GameMode): Promise<void> {
    const roomRef = ref(db, `rooms/${roomCode}`);
    await update(roomRef, { gameMode: mode });
  }

  // Initialize game state (called by host)
  async initializeGameState(roomCode: string, initialFood: any[]): Promise<void> {
    const gameRef = ref(db, `rooms/${roomCode}/gameState`);
    await set(gameRef, {
      food: initialFood,
      winner: null
    });
  }

  // Send player move
  async updatePlayerMove(roomCode: string, playerName: string, direction: string): Promise<void> {
    const moveRef = ref(db, `rooms/${roomCode}/moves/${playerName}`);
    await set(moveRef, {
      direction,
      timestamp: Date.now()
    });
  }

  // Update food (when eaten)
  async updateFood(roomCode: string, foodIndex: number, newFood: any): Promise<void> {
    const foodRef = ref(db, `rooms/${roomCode}/gameState/food/${foodIndex}`);
    await set(foodRef, newFood);
  }

  // Update player score
  async updateScore(roomCode: string, playerName: string, newScore: number): Promise<void> {
    const scoreRef = ref(db, `rooms/${roomCode}/scores/${playerName}`);
    await set(scoreRef, newScore);
  }

  // Set winner
  async setWinner(roomCode: string, winnerName: string): Promise<void> {
    const winnerRef = ref(db, `rooms/${roomCode}/gameState/winner`);
    await set(winnerRef, winnerName);
  }

  // Listen to game changes
  listenToGame(roomCode: string, callbacks: {
    onMove: (playerName: string, direction: string) => void,
    onFoodUpdate: (food: any[]) => void,
    onScoreUpdate: (scores: Record<string, number>) => void,
    onWinner: (winner: string) => void
  }): () => void {
    const roomRef = ref(db, `rooms/${roomCode}`);
    
    const movesUnsub = onValue(child(roomRef, 'moves'), (snapshot) => {
      if (snapshot.exists()) {
        snapshot.forEach((child) => {
          callbacks.onMove(child.key!, child.val().direction);
        });
      }
    });

    const gameStateUnsub = onValue(child(roomRef, 'gameState'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        if (data.food) callbacks.onFoodUpdate(data.food);
        if (data.winner) callbacks.onWinner(data.winner);
      }
    });

    const scoresUnsub = onValue(child(roomRef, 'scores'), (snapshot) => {
      if (snapshot.exists()) {
        callbacks.onScoreUpdate(snapshot.val());
      }
    });

    return () => {
      movesUnsub();
      gameStateUnsub();
      scoresUnsub();
    };
  }

  // Generate random 6-character code
  private generateRoomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

export const firebaseService = new FirebaseService();