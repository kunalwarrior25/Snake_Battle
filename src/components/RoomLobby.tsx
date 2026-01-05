import { useState, useEffect } from 'react';
import { firebaseService, FirebaseRoom, GameMode } from '../services/firebaseService';
import type { Player } from '../api/gameApi';

interface RoomLobbyProps {
  onBack: () => void;
  onStartGame: (roomCode: string, players: any[]) => void;
  currentPlayer: Player | null;
}

export function RoomLobby({ onBack, onStartGame, currentPlayer }: RoomLobbyProps) {
  const [mode, setMode] = useState<'menu' | 'create' | 'join' | 'lobby'>('menu');
  const [roomCode, setRoomCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [currentRoom, setCurrentRoom] = useState<FirebaseRoom | null>(null);
  const [error, setError] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Listen to room updates
  useEffect(() => {
    if (!roomCode) return;

    const unsubscribe = firebaseService.listenToRoom(roomCode, (roomData) => {
      setCurrentRoom(roomData);
      
      if (roomData && roomData.status === 'playing') {
        onStartGame(roomData.roomCode, roomData.players);
      }
      
      // If room is deleted (host left or empty)
      if (!roomData && mode === 'lobby') {
        setMode('menu');
        setRoomCode('');
        setCurrentRoom(null);
        setError('Room was closed');
      }
    });

    return () => unsubscribe();
  }, [roomCode, mode, onStartGame]);

  // Create a new room
  const handleCreateRoom = async () => {
    if (!currentPlayer) return;
    
    setLoading(true);
    setError('');
    try {
      const code = await firebaseService.createRoom(currentPlayer.name);
      setRoomCode(code);
      setMode('lobby');
    } catch (err) {
      setError('Failed to create room. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Join existing room
  const handleJoinRoom = async () => {
    if (!currentPlayer) return;
    
    if (!inputCode.trim()) {
      setError('Please enter a room code');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const code = inputCode.toUpperCase();
      await firebaseService.joinRoom(code, currentPlayer.name);
      setRoomCode(code);
      setMode('lobby');
      setInputCode('');
    } catch (err: any) {
      setError(err.message || 'Failed to join room');
    } finally {
      setLoading(false);
    }
  };

  // Copy room code to clipboard
  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // Start the game (host only)
  const handleStartGame = async () => {
    if (!currentRoom || !currentPlayer) return;

    const playerCount = currentRoom.players.length;
    if (playerCount < 2) {
      setError('Need at least 2 players to start!');
      return;
    }

    setLoading(true);
    try {
      await firebaseService.startGame(roomCode);
    } catch (err) {
      setError('Failed to start game');
      console.error(err);
      setLoading(false);
    }
  };

  // Leave room
  const handleLeaveRoom = async () => {
    if (roomCode && currentPlayer) {
      await firebaseService.leaveRoom(roomCode, currentPlayer.name);
    }
    
    setMode('menu');
    setCurrentRoom(null);
    setRoomCode('');
    setError('');
  };

  // Check if current player is host
  const isHost = currentRoom?.players.find(p => p.name === currentPlayer?.name && p.isHost);
  const playersList = currentRoom ? currentRoom.players : [];

  const handleModeChange = async (newMode: GameMode) => {
    if (!currentRoom || !isHost) return;
    try {
      await firebaseService.updateRoomMode(roomCode, newMode);
    } catch (err) {
      console.error('Failed to update mode', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 opacity-20">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
              }}
            />
          ))}
        </div>
      </div>

      <div className="relative z-10 max-w-2xl w-full">
        {/* Main Menu */}
        {mode === 'menu' && (
          <div className="bg-slate-900/80 backdrop-blur-xl rounded-3xl p-8 border border-slate-700/50 shadow-2xl">
            <h1 className="text-5xl font-black text-center mb-3 bg-gradient-to-r from-emerald-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              🐍 Real-Time Multiplayer
            </h1>
            <p className="text-slate-400 text-center mb-8">Create or join a room - powered by Socket.IO ⚡</p>

            {currentPlayer && (
              <div className="bg-slate-800/50 rounded-xl p-4 mb-6 border border-slate-700/50">
                <p className="text-sm text-slate-400">Playing as:</p>
                <p className="text-xl font-bold text-white">{currentPlayer.name}</p>
                <p className="text-sm text-emerald-400">High Score: {currentPlayer.high_score || 0}</p>
              </div>
            )}

            {error && (
              <div className="bg-red-500/20 border border-red-500 rounded-xl p-3 mb-6 text-red-300 text-center">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <button
                onClick={handleCreateRoom}
                disabled={loading}
                className="w-full py-4 px-8 bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white font-bold text-xl rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '⏳ Creating...' : '🎮 Create Room'}
              </button>

              <button
                onClick={() => setMode('join')}
                disabled={loading}
                className="w-full py-4 px-8 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold text-xl rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                🔗 Join Room
              </button>

              <button
                onClick={onBack}
                className="w-full py-4 px-8 bg-slate-700 hover:bg-slate-600 text-white font-bold text-xl rounded-xl transition-all duration-200"
              >
                ← Back to Menu
              </button>
            </div>
          </div>
        )}

        {/* Join Room */}
        {mode === 'join' && (
          <div className="bg-slate-900/80 backdrop-blur-xl rounded-3xl p-8 border border-slate-700/50 shadow-2xl">
            <h2 className="text-4xl font-black text-center mb-6 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Join Room
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Enter Room Code
                </label>
                <input
                  type="text"
                  value={inputCode}
                  onChange={(e) => {
                    setInputCode(e.target.value.toUpperCase());
                    setError('');
                  }}
                  placeholder="ABC123"
                  maxLength={6}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white text-2xl font-bold text-center tracking-widest focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50"
                />
              </div>

              {error && (
                <div className="bg-red-500/20 border border-red-500 rounded-xl p-3 text-red-300 text-center">
                  {error}
                </div>
              )}

              <button
                onClick={handleJoinRoom}
                disabled={loading}
                className="w-full py-4 px-8 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold text-xl rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '⏳ Joining...' : 'Join Game'}
              </button>

              <button
                onClick={() => {
                  setMode('menu');
                  setInputCode('');
                  setError('');
                }}
                disabled={loading}
                className="w-full py-4 px-8 bg-slate-700 hover:bg-slate-600 text-white font-bold text-xl rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Back
              </button>
            </div>
          </div>
        )}

        {/* Lobby */}
        {mode === 'lobby' && currentRoom && (
          <div className="bg-slate-900/80 backdrop-blur-xl rounded-3xl p-8 border border-slate-700/50 shadow-2xl">
            <h2 className="text-4xl font-black text-center mb-6 bg-gradient-to-r from-emerald-400 to-purple-400 bg-clip-text text-transparent">
              🔥 Room Lobby
            </h2>

            {/* Game Mode Selection */}
            {isHost ? (
               <div className="mb-6">
                 <p className="text-sm text-slate-300 mb-2">Game Mode</p>
                 <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                   {(['CLASSIC', 'SPEED', 'WALLS', 'PORTAL', 'ARENA'] as GameMode[]).map((m) => (
                     <button
                       key={m}
                       onClick={() => handleModeChange(m)}
                       className={`p-2 rounded-lg text-xs font-bold transition-all ${
                         (currentRoom.gameMode || 'CLASSIC') === m
                           ? 'bg-blue-600 text-white shadow-lg scale-105'
                           : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                       }`}
                     >
                       {m}
                     </button>
                   ))}
                 </div>
               </div>
            ) : (
               <div className="mb-6 bg-slate-800/50 rounded-lg p-3 text-center">
                 <p className="text-xs text-slate-400 uppercase tracking-widest">Game Mode</p>
                 <p className="text-xl font-bold text-white">
                   {currentRoom.gameMode || 'CLASSIC'}
                 </p>
               </div>
            )}

            {/* Room Code Display */}
            <div className="bg-gradient-to-r from-emerald-500/20 to-blue-500/20 border-2 border-emerald-400/50 rounded-2xl p-6 mb-6">
              <p className="text-sm text-slate-300 text-center mb-2">Room Code</p>
              <div className="flex items-center justify-center gap-4">
                <p className="text-4xl font-black text-white tracking-widest">{roomCode}</p>
                <button
                  onClick={handleCopyCode}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-bold transition-all"
                >
                  {copySuccess ? '✓ Copied!' : '📋 Copy'}
                </button>
              </div>
              <p className="text-xs text-slate-400 text-center mt-2">Share this code with your friend</p>
            </div>

            {/* Players List */}
            <div className="space-y-3 mb-6">
              <p className="text-lg font-bold text-white mb-3">
                Players ({playersList.length}/2)
              </p>
              
              {playersList.map((player, index) => (
                <div
                  key={player.id}
                  className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-blue-400' : 'bg-pink-400'} animate-pulse`} />
                    <div>
                      <p className="font-bold text-white">
                        {player.name}
                        {player.isHost && (
                          <span className="ml-2 text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full border border-yellow-500/50">
                            👑 HOST
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-400">Score: {player.score || 0}</p>
                    </div>
                  </div>
                  {player.name === currentPlayer?.name && (
                    <span className="text-sm text-emerald-400 font-bold">YOU</span>
                  )}
                </div>
              ))}

              {/* Empty Slots */}
              {Array.from({ length: 2 - playersList.length }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="bg-slate-800/30 rounded-xl p-4 border border-dashed border-slate-700/50 text-center"
                >
                  <p className="text-slate-500">Waiting for player...</p>
                </div>
              ))}
            </div>

            {error && (
              <div className="bg-yellow-500/20 border border-yellow-500 rounded-xl p-3 text-yellow-300 text-center mb-4">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              {isHost ? (
                <button
                  onClick={handleStartGame}
                  disabled={playersList.length < 2 || loading}
                  className={`w-full py-4 px-8 font-bold text-xl rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg
                    ${playersList.length >= 2 && !loading
                      ? 'bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white hover:shadow-emerald-500/50'
                      : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    }`}
                >
                  {loading ? '⏳ Starting...' : playersList.length >= 2 ? '🚀 Start Game' : 'Waiting for players...'}
                </button>
              ) : (
                <div className="bg-blue-500/20 border border-blue-500 rounded-xl p-4 text-blue-300 text-center">
                  <p className="font-bold">Waiting for host to start the game...</p>
                  <div className="flex justify-center gap-2 mt-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                  </div>
                </div>
              )}

              <button
                onClick={handleLeaveRoom}
                disabled={loading}
                className="w-full py-4 px-8 bg-slate-700 hover:bg-slate-600 text-white font-bold text-xl rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '⏳ Leaving...' : '← Leave Room'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}