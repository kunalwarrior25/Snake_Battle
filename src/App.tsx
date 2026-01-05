import { useState, useEffect } from 'react';
import { Menu } from './components/Menu';
import { SnakeGame } from './components/SnakeGame';
import { RoomLobby } from './components/RoomLobby';
import { MultiplayerSnakeGame } from './components/MultiplayerSnakeGame';
import { gameApi, Player } from './api/gameApi';

export function App() {
  const [gameMode, setGameMode] = useState<'menu' | 'snake' | 'roomlobby' | 'multiplayer' | 'arena'>('menu');
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // Multiplayer state
  const [activeRoomCode, setActiveRoomCode] = useState('');
  const [activeRoomPlayers, setActiveRoomPlayers] = useState<any[]>([]);
  
  // UI state
  const [version, setVersion] = useState<'desktop' | 'phone'>(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    return isMobile ? 'phone' : 'desktop';
  });
  const [showControls, setShowControls] = useState(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    return isMobile;
  });

  // Check backend connection and create/load player
  useEffect(() => {
    const initializePlayer = async () => {
      try {
        const savedPlayerId = localStorage.getItem('playerId');
        
        if (savedPlayerId) {
          const player = await gameApi.getPlayer(parseInt(savedPlayerId));
          setCurrentPlayer(player);
        } else {
          const randomName = `Player${Math.floor(Math.random() * 10000)}`;
          const player = await gameApi.createPlayer(randomName);
          localStorage.setItem('playerId', player.id!.toString());
          setCurrentPlayer(player);
        }
        setIsConnected(true);
      } catch (error) {
        console.log('Backend not connected, running in offline mode');
        setIsConnected(false);
        setCurrentPlayer({
          id: -1,
          name: `Guest${Math.floor(Math.random() * 9000) + 1000}`,
          high_score: 0,
          games_played: 0,
          levels_completed: 0
        });
      }
    };

    initializePlayer();
  }, []);

  const handleBackToMenu = () => {
    setGameMode('menu');
  };

  const handleStartRoomGame = (roomCode: string, players: any[]) => {
    setActiveRoomCode(roomCode);
    setActiveRoomPlayers(players);
    setGameMode('multiplayer');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-x-hidden">
      {gameMode === 'menu' && (
        <Menu 
          onSelectMode={setGameMode} 
          player={currentPlayer}
          isConnected={isConnected}
          version={version}
          onVersionChange={setVersion}
          showControls={showControls}
          onControlsToggle={() => setShowControls(!showControls)}
        />
      )}
      {(gameMode === 'snake' || gameMode === 'arena') && (
        <SnakeGame 
          onBack={handleBackToMenu} 
          showControls={showControls} 
          initialMode={gameMode === 'arena' ? 'ARENA' : undefined}
        />
      )}
      {gameMode === 'roomlobby' && (
        <RoomLobby
          onBack={handleBackToMenu}
          onStartGame={handleStartRoomGame}
          currentPlayer={currentPlayer}
        />
      )}
      {gameMode === 'multiplayer' && (
        <MultiplayerSnakeGame
          roomCode={activeRoomCode}
          players={activeRoomPlayers}
          currentPlayerName={currentPlayer?.name || ''}
          onBack={handleBackToMenu}
          showControls={showControls}
        />
      )}
    </div>
  );
}