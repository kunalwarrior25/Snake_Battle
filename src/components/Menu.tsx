import { useState, useEffect } from 'react';

interface MenuProps {
  onSelectMode: (mode: 'snake' | 'roomlobby' | 'arena') => void;
  player: { name: string; high_score: number; games_played: number } | null;
  isConnected: boolean;
  version: 'desktop' | 'phone';
  onVersionChange: (v: 'desktop' | 'phone') => void;
  showControls: boolean;
  onControlsToggle: () => void;
}

const randomNames = [
  "🎮 Secret Mode",
  "👾 Mystery Challenge",
  "🔥 Impossible Quest",
  "⚡ Chaos Mode",
  "🌟 Ultimate Trial",
  "💀 Death Wish",
  "🎯 Pure Madness",
  "🚀 Insane Mode",
  "🎲 Random Chaos",
  "👹 Nightmare Mode",
  "🌈 Rainbow Rush",
  "⭐ Star Destroyer",
  "🔮 Mystic Path",
  "🎪 Circus Mode",
  "🏆 Champion's Test",
  "🎨 Color Blast",
  "🌀 Spiral Madness",
  "💎 Diamond League",
];

export function Menu({ onSelectMode, player, isConnected, version, onVersionChange, showControls, onControlsToggle }: MenuProps) {
  const [randomButtonName, setRandomButtonName] = useState(randomNames[0]);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * randomNames.length);
      setRandomButtonName(randomNames[randomIndex]);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            background: `radial-gradient(circle at ${mousePos.x}px ${mousePos.y}px, rgba(99, 102, 241, 0.4), transparent 40%)`,
          }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f1f_1px,transparent_1px),linear-gradient(to_bottom,#1f1f1f_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      {/* Floating Particles */}
      {[...Array(15)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 opacity-20 blur-xl animate-float"
          style={{
            width: `${Math.random() * 100 + 50}px`,
            height: `${Math.random() * 100 + 50}px`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${Math.random() * 10 + 10}s`,
          }}
        />
      ))}

      {/* Menu Content */}
      <div className="relative z-10 w-full max-w-2xl px-4 sm:px-6">
        {/* Title */}
        <div className="text-center mb-8 sm:mb-16 animate-fade-in">
          <div className="mb-4 sm:mb-6 relative">
            <h1 className="text-4xl sm:text-6xl md:text-8xl font-black mb-2 sm:mb-4 bg-gradient-to-r from-white via-indigo-200 to-white bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(99,102,241,0.5)] tracking-tight">
              YOU CAN'T
            </h1>
            <h1 className="text-4xl sm:text-6xl md:text-8xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(168,85,247,0.5)] tracking-tight animate-pulse">
              COMPLETE THIS
            </h1>
          </div>
          <p className="text-base sm:text-xl md:text-2xl text-gray-400 font-medium tracking-wide">
            ⚡ The Ultimate 2D Challenge ⚡
          </p>

          {/* Version Toggle */}
          <div className="mt-6 flex justify-center">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-full p-1 border border-slate-600/50">
              <button
                onClick={() => onVersionChange('desktop')}
                className={`px-4 py-2 rounded-full font-bold text-sm transition-all duration-300 ${
                  version === 'desktop'
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🖥️ Desktop
              </button>
              <button
                onClick={() => onVersionChange('phone')}
                className={`px-4 py-2 rounded-full font-bold text-sm transition-all duration-300 ${
                  version === 'phone'
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                📱 Phone
              </button>
            </div>
          </div>

          {/* Controller Toggle */}
          <div className="mt-4 flex justify-center">
            <button
              onClick={onControlsToggle}
              className={`px-6 py-3 rounded-xl font-bold text-sm transition-all duration-300 backdrop-blur-sm border ${
                showControls
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white border-purple-400/50 shadow-lg shadow-purple-500/50'
                  : 'bg-slate-800/50 text-slate-400 border-slate-600/50 hover:text-white hover:border-slate-400/50'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="text-xl">🎮</span>
                <span>Controls: {showControls ? 'ON' : 'OFF'}</span>
              </span>
            </button>
          </div>
        </div>

        {/* Menu Buttons */}
        <div className="space-y-4 sm:space-y-6 animate-slide-up">
          {/* Single Player Snake Game Button */}
          <button
            onClick={() => onSelectMode('snake')}
            className="group relative w-full py-4 sm:py-6 px-4 sm:px-8 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl sm:rounded-2xl font-bold text-lg sm:text-2xl text-white overflow-hidden transform transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_rgba(34,197,94,0.6)] active:scale-95"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex items-center justify-center gap-2 sm:gap-3">
              <span className="text-2xl sm:text-3xl">🐍</span>
              <span className="text-sm sm:text-base md:text-2xl">SINGLE PLAYER SNAKE</span>
            </div>
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700" />
          </button>

          {/* Room Lobby Button (Online Multiplayer) */}
          <button
            onClick={() => onSelectMode('roomlobby')}
            className="group relative w-full py-4 sm:py-6 px-4 sm:px-8 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 rounded-xl sm:rounded-2xl font-bold text-lg sm:text-2xl text-white overflow-hidden transform transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_rgba(6,182,212,0.6)] active:scale-95"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex items-center justify-center gap-2 sm:gap-3">
              <span className="text-2xl sm:text-3xl">🏠</span>
              <span className="text-sm sm:text-base md:text-2xl">ONLINE ROOMS</span>
            </div>
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700" />
          </button>

          {/* Arena Battle Button */}
          <button
            onClick={() => onSelectMode('arena')}
            className="group relative w-full py-4 sm:py-6 px-4 sm:px-8 bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 rounded-xl sm:rounded-2xl font-bold text-lg sm:text-2xl text-white overflow-hidden transform transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_rgba(220,38,38,0.6)] active:scale-95"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-red-400 via-orange-400 to-amber-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex items-center justify-center gap-2 sm:gap-3">
              <span className="text-2xl sm:text-3xl">⚔️</span>
              <span className="text-sm sm:text-base md:text-2xl">ARENA BATTLE</span>
            </div>
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700" />
          </button>

          {/* Random Name Button */}
          <button
            onClick={() => onSelectMode('snake')}
            className="group relative w-full py-4 sm:py-6 px-4 sm:px-8 bg-gradient-to-r from-slate-700 to-slate-800 border-2 border-white/20 rounded-xl sm:rounded-2xl font-bold text-lg sm:text-2xl text-white overflow-hidden transform transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:border-white/40 active:scale-95"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-slate-600 to-slate-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex items-center justify-center gap-2 sm:gap-3">
              <span className="animate-spin-slow inline-block text-xl sm:text-2xl">{randomButtonName.split(' ')[0]}</span>
              <span className="transition-all duration-500 text-sm sm:text-base md:text-2xl">{randomButtonName.split(' ').slice(1).join(' ')}</span>
            </div>
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700" />
          </button>
        </div>

        {/* Player Stats */}
        {player && (
          <div className="mt-8 p-6 bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-2xl">
                  👤
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">{player.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${isConnected ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                      {isConnected ? '● Online' : '● Offline'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-white/5 rounded-lg">
                <div className="text-2xl font-bold text-purple-400">{player.high_score}</div>
                <div className="text-xs text-gray-400">High Score</div>
              </div>
              <div className="text-center p-3 bg-white/5 rounded-lg">
                <div className="text-2xl font-bold text-indigo-400">{player.games_played}</div>
                <div className="text-xs text-gray-400">Games Played</div>
              </div>
            </div>
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-8 text-center space-y-2 animate-fade-in">
          <p className="text-sm text-gray-500 font-medium">
            ⚠️ Warning: This game is designed to be extremely challenging
          </p>
          <div className="flex justify-center gap-6 text-xs text-gray-600">
            <span>🎯 50+ Levels</span>
            <span>💀 Brutal Difficulty</span>
            <span>🏆 Leaderboards</span>
          </div>
          {player && (
            <p className="text-xs text-gray-400 mt-4">
              Player: {player.name}
            </p>
          )}
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-100px) rotate(180deg); }
        }
        
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slide-up {
          from { 
            opacity: 0;
            transform: translateY(30px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .animate-float {
          animation: float linear infinite;
        }
        
        .animate-fade-in {
          animation: fade-in 1s ease-out;
        }
        
        .animate-slide-up {
          animation: slide-up 0.8s ease-out 0.3s both;
        }

        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
      `}</style>
    </div>
  );
}