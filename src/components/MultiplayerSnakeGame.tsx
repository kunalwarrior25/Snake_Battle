import { useEffect, useRef, useState } from 'react';
import { firebaseService, GameMode } from '../services/firebaseService';
import { MobileControls } from './MobileControls';
import { db } from '../firebase/config';
import { ref, onValue, set, get } from 'firebase/database';

interface MultiplayerSnakeGameProps {
  roomCode: string;
  players: any[];
  currentPlayerName: string;
  onBack: () => void;
  showControls?: boolean;
}

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

interface Position {
  x: number;
  y: number;
}

interface PlayerState {
  snake: Position[];
  direction: Direction;
  score: number;
  name: string;
  color: string;
  alive: boolean;
}

interface Enemy {
  id: number;
  x: number;
  y: number;
}

interface Cannon {
  id: number;
  x: number;
  y: number;
}

interface Projectile {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
}

interface FoodItem {
  x: number;
  y: number;
  type: string;
  value: number;
}

export function MultiplayerSnakeGame({ roomCode, players, currentPlayerName, onBack, showControls = true }: MultiplayerSnakeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [timeLeft, setTimeLeft] = useState(120);
  const [winner, setWinner] = useState<string | null>(null);
  const [gameMode, setGameMode] = useState<GameMode>('CLASSIC');
  const [isReady, setIsReady] = useState(false);
  
  const isHost = players.find(p => p.name === currentPlayerName)?.isHost;
  const player1 = players.find(p => p.isHost);
  const player2 = players.find(p => !p.isHost);
  
  const GRID_SIZE = 20;
  const ARENA_GRID_SIZE = 200;
  const CAMERA_VIEW_SIZE = 21;
  const CELL_SIZE = 25;

  // Game State Refs
  const gameModeRef = useRef<GameMode>('CLASSIC');
  const gameStateRef = useRef({
    p1: { 
      snake: [{ x: 5, y: 10 }], 
      direction: 'RIGHT' as Direction, 
      score: 0, 
      name: player1?.name || 'P1', 
      color: '#3b82f6', 
      alive: true 
    } as PlayerState,
    p2: { 
      snake: [{ x: 15, y: 10 }], 
      direction: 'LEFT' as Direction, 
      score: 0, 
      name: player2?.name || 'P2', 
      color: '#ec4899', 
      alive: true 
    } as PlayerState,
    food: [] as FoodItem[],
    particles: [] as { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number }[],
    walls: [] as Position[],
    enemies: [] as Enemy[],
    cannons: [] as Cannon[],
    projectiles: [] as Projectile[],
    gameActive: true
  });

  const cameraRef = useRef({ x: 0, y: 0 });
  const globalTickRef = useRef(0);
  const screenShakeRef = useRef(0);
  const [, setTick] = useState(0);

  // Fetch game mode first
  useEffect(() => {
    const fetchGameMode = async () => {
      try {
        const roomRef = ref(db, `rooms/${roomCode}`);
        const snapshot = await get(roomRef);
        if (snapshot.exists()) {
          const data = snapshot.val();
          const mode = data.gameMode || 'CLASSIC';
          setGameMode(mode);
          gameModeRef.current = mode;
          
          // Initialize positions based on mode
          const gridSize = mode === 'ARENA' ? ARENA_GRID_SIZE : GRID_SIZE;
          
          // Set different starting positions for each player
          gameStateRef.current.p1.snake = [{ 
            x: Math.floor(gridSize * 0.25), 
            y: Math.floor(gridSize / 2) 
          }];
          gameStateRef.current.p2.snake = [{ 
            x: Math.floor(gridSize * 0.75), 
            y: Math.floor(gridSize / 2) 
          }];
          
          setIsReady(true);
        }
      } catch (err) {
        console.error('Error fetching game mode:', err);
        setIsReady(true);
      }
    };
    
    fetchGameMode();
  }, [roomCode]);

  // Initialize game state after mode is set
  useEffect(() => {
    if (!isReady) return;
    
    const mode = gameModeRef.current;
    const gridSize = mode === 'ARENA' ? ARENA_GRID_SIZE : GRID_SIZE;
    
    // Host initializes the game
    if (isHost) {
      // Initialize Food
      const foodCount = mode === 'ARENA' ? 20 : 2;
      const newFood: FoodItem[] = [];
      for (let i = 0; i < foodCount; i++) {
        const rand = Math.random();
        newFood.push({
          x: Math.floor(Math.random() * gridSize),
          y: Math.floor(Math.random() * gridSize),
          type: rand < 0.7 ? 'normal' : rand < 0.85 ? 'speed' : 'immortal',
          value: rand < 0.7 ? 10 : rand < 0.85 ? 15 : 50
        });
      }
      firebaseService.initializeGameState(roomCode, newFood);
      
      // Initialize Arena elements
      if (mode === 'ARENA') {
        // Generate walls
        const walls: Position[] = [];
        for (let i = 0; i < 300; i++) {
          walls.push({
            x: Math.floor(Math.random() * gridSize),
            y: Math.floor(Math.random() * gridSize)
          });
        }
        
        // Generate enemies
        const enemies: Enemy[] = [];
        for (let i = 0; i < 20; i++) {
          enemies.push({
            id: i,
            x: Math.floor(Math.random() * gridSize),
            y: Math.floor(Math.random() * gridSize)
          });
        }
        
        // Generate cannons
        const cannons: Cannon[] = [];
        for (let i = 0; i < 7; i++) {
          cannons.push({
            id: i,
            x: Math.floor(Math.random() * gridSize),
            y: Math.floor(Math.random() * gridSize)
          });
        }
        
        // Sync to Firebase
        const arenaRef = ref(db, `rooms/${roomCode}/arena`);
        set(arenaRef, { walls, enemies, cannons });
      }
      
      // Sync initial player positions
      const posRef = ref(db, `rooms/${roomCode}/positions`);
      set(posRef, {
        p1: gameStateRef.current.p1.snake,
        p2: gameStateRef.current.p2.snake
      });
    }
  }, [isReady, isHost, roomCode]);

  // Listen to game updates
  useEffect(() => {
    if (!isReady) return;

    // Listen to food updates
    const unsubscribe = firebaseService.listenToGame(roomCode, {
      onMove: (playerName, direction) => {
        if (playerName === player1?.name) {
          gameStateRef.current.p1.direction = direction as Direction;
        }
        if (playerName === player2?.name) {
          gameStateRef.current.p2.direction = direction as Direction;
        }
      },
      onFoodUpdate: (food) => {
        if (food) gameStateRef.current.food = food;
      },
      onScoreUpdate: (scores) => {
        if (scores[player1?.name || '']) {
          gameStateRef.current.p1.score = scores[player1?.name || ''];
        }
        if (scores[player2?.name || '']) {
          gameStateRef.current.p2.score = scores[player2?.name || ''];
        }
      },
      onWinner: (winnerName) => {
        gameStateRef.current.gameActive = false;
        setWinner(winnerName);
      }
    });

    // Listen to player positions
    const posRef = ref(db, `rooms/${roomCode}/positions`);
    const posUnsub = onValue(posRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        if (data.p1) gameStateRef.current.p1.snake = data.p1;
        if (data.p2) gameStateRef.current.p2.snake = data.p2;
      }
    });

    // Listen to arena elements
    if (gameModeRef.current === 'ARENA') {
      const arenaRef = ref(db, `rooms/${roomCode}/arena`);
      const arenaUnsub = onValue(arenaRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          if (data.walls) gameStateRef.current.walls = data.walls;
          if (data.enemies) gameStateRef.current.enemies = data.enemies;
          if (data.cannons) gameStateRef.current.cannons = data.cannons;
        }
      });
      
      return () => {
        unsubscribe();
        posUnsub();
        arenaUnsub();
      };
    }

    // Timer
    const timerInterval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerInterval);
          gameStateRef.current.gameActive = false;
          const p1Score = gameStateRef.current.p1.score;
          const p2Score = gameStateRef.current.p2.score;
          const winnerName = p1Score > p2Score ? (player1?.name || 'P1') : p1Score < p2Score ? (player2?.name || 'P2') : 'Tie';
          setWinner(winnerName);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      unsubscribe();
      posUnsub();
      clearInterval(timerInterval);
    };
  }, [isReady, roomCode, player1, player2]);

  // Keyboard Input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gameStateRef.current.gameActive) return;
      
      let newDir: Direction | null = null;
      const key = e.key.toLowerCase();
      
      if (key === 'arrowup' || key === 'w') newDir = 'UP';
      if (key === 'arrowdown' || key === 's') newDir = 'DOWN';
      if (key === 'arrowleft' || key === 'a') newDir = 'LEFT';
      if (key === 'arrowright' || key === 'd') newDir = 'RIGHT';

      if (newDir) {
        const isP1 = currentPlayerName === player1?.name;
        const me = isP1 ? gameStateRef.current.p1 : gameStateRef.current.p2;
        
        // Prevent reversing
        const opposite: Record<Direction, Direction> = { UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT' };
        if (newDir !== opposite[me.direction]) {
          me.direction = newDir;
          firebaseService.updatePlayerMove(roomCode, currentPlayerName, newDir);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPlayerName, roomCode, player1]);

  // Mobile Controls
  const handleMobileDirection = (dir: Direction) => {
    if (!gameStateRef.current.gameActive) return;
    
    const isP1 = currentPlayerName === player1?.name;
    const me = isP1 ? gameStateRef.current.p1 : gameStateRef.current.p2;
    
    const opposite: Record<Direction, Direction> = { UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT' };
    if (dir !== opposite[me.direction]) {
      me.direction = dir;
      firebaseService.updatePlayerMove(roomCode, currentPlayerName, dir);
    }
  };

  // Game Loop
  useEffect(() => {
    if (!isReady) return;
    
    let animationFrameId: number;
    let lastTime = 0;
    const mode = gameModeRef.current;
    const GAME_SPEED = mode === 'SPEED' ? 100 : 150;
    const gridSize = mode === 'ARENA' ? ARENA_GRID_SIZE : GRID_SIZE;

    const gameLoop = (timestamp: number) => {
      if (!gameStateRef.current.gameActive) {
        render();
        return;
      }
      
      globalTickRef.current++;
      
      // Screen shake decay
      if (screenShakeRef.current > 0.5) {
        screenShakeRef.current *= 0.9;
      } else {
        screenShakeRef.current = 0;
      }

      // Update particles
      gameStateRef.current.particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.05;
        p.size *= 0.95;
      });
      gameStateRef.current.particles = gameStateRef.current.particles.filter(p => p.life > 0);

      // Arena: Update projectiles and cannons (local simulation for smoothness)
      if (mode === 'ARENA') {
        // Move projectiles
        gameStateRef.current.projectiles.forEach(p => {
          p.x += p.dx;
          p.y += p.dy;
        });
        gameStateRef.current.projectiles = gameStateRef.current.projectiles.filter(p => 
          p.x >= 0 && p.x < gridSize && p.y >= 0 && p.y < gridSize
        );

        // Cannons fire
        if (globalTickRef.current % 9 === 0) { // ~1/7 second at 60fps
          gameStateRef.current.cannons.forEach(c => {
            // Fire in all 4 directions
            const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
            dirs.forEach(d => {
              gameStateRef.current.projectiles.push({
                id: Math.random(),
                x: c.x,
                y: c.y,
                dx: d[0] * 0.5,
                dy: d[1] * 0.5
              });
            });
          });
        }

        // Move enemies (local simulation)
        if (globalTickRef.current % 20 === 0) {
          const state = gameStateRef.current;
          const me = currentPlayerName === player1?.name ? state.p1 : state.p2;
          const myHead = me.snake[0];
          
          state.enemies.forEach(e => {
            // Chase player if close
            const dist = Math.abs(e.x - myHead.x) + Math.abs(e.y - myHead.y);
            if (dist < 30) {
              if (e.x < myHead.x) e.x++;
              else if (e.x > myHead.x) e.x--;
              if (e.y < myHead.y) e.y++;
              else if (e.y > myHead.y) e.y--;
            } else {
              // Random movement
              const r = Math.random();
              if (r < 0.25) e.x++;
              else if (r < 0.5) e.x--;
              else if (r < 0.75) e.y++;
              else e.y--;
            }
            e.x = Math.max(0, Math.min(gridSize - 1, e.x));
            e.y = Math.max(0, Math.min(gridSize - 1, e.y));
          });
        }
      }

      // Update game state at fixed intervals
      if (timestamp - lastTime >= GAME_SPEED) {
        lastTime = timestamp;
        update();
        setTick(t => t + 1);
      }

      render();
      animationFrameId = requestAnimationFrame(gameLoop);
    };

    const update = () => {
      const state = gameStateRef.current;
      const isP1 = currentPlayerName === player1?.name;
      const me = isP1 ? state.p1 : state.p2;
      const opponent = isP1 ? state.p2 : state.p1;

      if (!me.alive) return;

      // Calculate new head position
      const head = { ...me.snake[0] };
      switch (me.direction) {
        case 'UP': head.y -= 1; break;
        case 'DOWN': head.y += 1; break;
        case 'LEFT': head.x -= 1; break;
        case 'RIGHT': head.x += 1; break;
      }

      // Wrap around (Speed, Portal, Arena)
      if (mode === 'SPEED' || mode === 'PORTAL' || mode === 'ARENA') {
        if (head.x < 0) head.x = gridSize - 1;
        if (head.x >= gridSize) head.x = 0;
        if (head.y < 0) head.y = gridSize - 1;
        if (head.y >= gridSize) head.y = 0;
      } else {
        // Classic/Walls: wall collision
        if (head.x < 0 || head.x >= gridSize || head.y < 0 || head.y >= gridSize) {
          me.alive = false;
          firebaseService.setWinner(roomCode, opponent.name);
          return;
        }
      }

      // Self collision
      if (me.snake.some(s => s.x === head.x && s.y === head.y)) {
        me.alive = false;
        firebaseService.setWinner(roomCode, opponent.name);
        return;
      }

      // Opponent collision
      if (opponent.alive && opponent.snake.some(s => s.x === head.x && s.y === head.y)) {
        me.alive = false;
        firebaseService.setWinner(roomCode, opponent.name);
        return;
      }

      // Wall collision (Walls mode)
      if (mode === 'WALLS' && state.walls.some(w => w.x === head.x && w.y === head.y)) {
        me.alive = false;
        firebaseService.setWinner(roomCode, opponent.name);
        return;
      }

      // Arena hazards
      if (mode === 'ARENA') {
        // Enemy collision
        if (state.enemies.some(e => Math.abs(e.x - head.x) < 1 && Math.abs(e.y - head.y) < 1)) {
          me.alive = false;
          screenShakeRef.current = 20;
          firebaseService.setWinner(roomCode, opponent.name);
          return;
        }
        
        // Projectile collision
        if (state.projectiles.some(p => Math.abs(p.x - head.x) < 1 && Math.abs(p.y - head.y) < 1)) {
          me.alive = false;
          screenShakeRef.current = 20;
          firebaseService.setWinner(roomCode, opponent.name);
          return;
        }
        
        // Wall collision in arena
        if (state.walls.some(w => w.x === head.x && w.y === head.y)) {
          me.alive = false;
          firebaseService.setWinner(roomCode, opponent.name);
          return;
        }
      }

      // Move snake
      me.snake.unshift(head);

      // Check food collision
      const foodIdx = state.food.findIndex(f => f.x === head.x && f.y === head.y);
      if (foodIdx !== -1) {
        const food = state.food[foodIdx];
        me.score += food.value;
        
        // Spawn particles
        for (let i = 0; i < 15; i++) {
          state.particles.push({
            x: head.x * CELL_SIZE + CELL_SIZE / 2,
            y: head.y * CELL_SIZE + CELL_SIZE / 2,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            life: 1.0,
            color: food.type === 'speed' ? '#3b82f6' : food.type === 'immortal' ? '#facc15' : '#10b981',
            size: Math.random() * 5 + 2
          });
        }
        
        // Update Firebase
        const newFood = {
          x: Math.floor(Math.random() * gridSize),
          y: Math.floor(Math.random() * gridSize),
          type: Math.random() < 0.7 ? 'normal' : Math.random() < 0.5 ? 'speed' : 'immortal',
          value: 10
        };
        firebaseService.updateFood(roomCode, foodIdx, newFood);
        firebaseService.updateScore(roomCode, currentPlayerName, me.score);
      } else {
        me.snake.pop();
      }

      // Sync position to Firebase
      const posKey = isP1 ? 'p1' : 'p2';
      const posRef = ref(db, `rooms/${roomCode}/positions/${posKey}`);
      set(posRef, me.snake);

      // Update camera for Arena
      if (mode === 'ARENA') {
        let tx = head.x - Math.floor(CAMERA_VIEW_SIZE / 2);
        let ty = head.y - Math.floor(CAMERA_VIEW_SIZE / 2);
        tx = Math.max(0, Math.min(tx, gridSize - CAMERA_VIEW_SIZE));
        ty = Math.max(0, Math.min(ty, gridSize - CAMERA_VIEW_SIZE));
        cameraRef.current = { x: tx, y: ty };
      }
    };

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const mode = gameModeRef.current;
      const viewSize = mode === 'ARENA' ? CAMERA_VIEW_SIZE : GRID_SIZE;
      const canvasWidth = viewSize * CELL_SIZE;
      const canvasHeight = viewSize * CELL_SIZE;
      
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      // Background
      ctx.fillStyle = mode === 'ARENA' ? '#0a0a0f' : '#0f172a';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      const viewX = mode === 'ARENA' ? cameraRef.current.x : 0;
      const viewY = mode === 'ARENA' ? cameraRef.current.y : 0;

      // Helpers
      const transform = (x: number, y: number) => ({
        x: (x - viewX) * CELL_SIZE,
        y: (y - viewY) * CELL_SIZE
      });
      const isVisible = (x: number, y: number) => 
        x >= viewX && x < viewX + viewSize && y >= viewY && y < viewY + viewSize;

      // Apply screen shake
      ctx.save();
      if (screenShakeRef.current > 0) {
        ctx.translate(
          (Math.random() - 0.5) * screenShakeRef.current,
          (Math.random() - 0.5) * screenShakeRef.current
        );
      }

      // Grid
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      for (let i = 0; i <= viewSize; i++) {
        ctx.beginPath();
        ctx.moveTo(i * CELL_SIZE, 0);
        ctx.lineTo(i * CELL_SIZE, canvasHeight);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * CELL_SIZE);
        ctx.lineTo(canvasWidth, i * CELL_SIZE);
        ctx.stroke();
      }

      // Draw Walls
      if (mode === 'WALLS' || mode === 'ARENA') {
        ctx.fillStyle = '#475569';
        gameStateRef.current.walls.forEach(w => {
          if (isVisible(w.x, w.y)) {
            const p = transform(w.x, w.y);
            ctx.fillRect(p.x, p.y, CELL_SIZE, CELL_SIZE);
          }
        });
      }

      // Draw Enemies (Arena)
      if (mode === 'ARENA') {
        ctx.fillStyle = '#ef4444';
        gameStateRef.current.enemies.forEach(e => {
          if (isVisible(e.x, e.y)) {
            const p = transform(e.x, e.y);
            ctx.beginPath();
            ctx.arc(p.x + CELL_SIZE / 2, p.y + CELL_SIZE / 2, CELL_SIZE / 2 - 2, 0, Math.PI * 2);
            ctx.fill();
            // Eyes
            ctx.fillStyle = 'white';
            ctx.fillRect(p.x + 5, p.y + 8, 4, 4);
            ctx.fillRect(p.x + 16, p.y + 8, 4, 4);
            ctx.fillStyle = '#ef4444';
          }
        });
      }

      // Draw Cannons (Arena)
      if (mode === 'ARENA') {
        gameStateRef.current.cannons.forEach(c => {
          if (isVisible(c.x, c.y)) {
            const p = transform(c.x, c.y);
            ctx.fillStyle = '#374151';
            ctx.fillRect(p.x + 2, p.y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
            ctx.fillStyle = '#1f2937';
            ctx.fillRect(p.x + 8, p.y + 8, CELL_SIZE - 16, CELL_SIZE - 16);
          }
        });
      }

      // Draw Projectiles (Arena)
      if (mode === 'ARENA') {
        ctx.fillStyle = '#f87171';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 10;
        gameStateRef.current.projectiles.forEach(proj => {
          if (isVisible(Math.floor(proj.x), Math.floor(proj.y))) {
            const p = transform(proj.x, proj.y);
            ctx.beginPath();
            ctx.arc(p.x + CELL_SIZE / 2, p.y + CELL_SIZE / 2, 5, 0, Math.PI * 2);
            ctx.fill();
          }
        });
        ctx.shadowBlur = 0;
      }

      // Draw Food
      gameStateRef.current.food.forEach(f => {
        if (f && isVisible(f.x, f.y)) {
          const p = transform(f.x, f.y);
          const pulse = Math.sin(globalTickRef.current * 0.1) * 2;
          
          if (f.type === 'speed') {
            ctx.fillStyle = '#3b82f6';
          } else if (f.type === 'immortal') {
            ctx.fillStyle = '#facc15';
          } else {
            ctx.fillStyle = '#10b981';
          }
          
          ctx.beginPath();
          ctx.arc(p.x + CELL_SIZE / 2, p.y + CELL_SIZE / 2, CELL_SIZE / 2 - 2 + pulse, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Draw Particles
      gameStateRef.current.particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.beginPath();
        ctx.arc(p.x - viewX * CELL_SIZE, p.y - viewY * CELL_SIZE, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // Draw Players
      [gameStateRef.current.p1, gameStateRef.current.p2].forEach(player => {
        if (!player.alive) return;
        
        player.snake.forEach((s, i) => {
          if (!isVisible(s.x, s.y)) return;
          
          const p = transform(s.x, s.y);
          ctx.fillStyle = player.color;
          
          // Rounded rectangle
          const r = 4;
          ctx.beginPath();
          ctx.roundRect(p.x + 1, p.y + 1, CELL_SIZE - 2, CELL_SIZE - 2, r);
          ctx.fill();
          
          // Head
          if (i === 0) {
            ctx.fillStyle = 'white';
            // Eyes based on direction
            let ex1 = p.x + 6, ey1 = p.y + 8;
            let ex2 = p.x + 16, ey2 = p.y + 8;
            
            if (player.direction === 'UP') {
              ey1 = p.y + 5; ey2 = p.y + 5;
            } else if (player.direction === 'DOWN') {
              ey1 = p.y + 14; ey2 = p.y + 14;
            } else if (player.direction === 'LEFT') {
              ex1 = p.x + 4; ex2 = p.x + 12;
            } else if (player.direction === 'RIGHT') {
              ex1 = p.x + 10; ex2 = p.x + 18;
            }
            
            ctx.beginPath();
            ctx.arc(ex1, ey1, 3, 0, Math.PI * 2);
            ctx.arc(ex2, ey2, 3, 0, Math.PI * 2);
            ctx.fill();
          }
        });
      });

      // Minimap for Arena
      if (mode === 'ARENA') {
        const mapSize = 80;
        const mapX = canvasWidth - mapSize - 10;
        const mapY = canvasHeight - mapSize - 10;
        const scale = mapSize / ARENA_GRID_SIZE;
        
        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(mapX, mapY, mapSize, mapSize);
        ctx.strokeStyle = '#475569';
        ctx.strokeRect(mapX, mapY, mapSize, mapSize);
        
        // Camera view
        ctx.strokeStyle = '#fbbf24';
        ctx.strokeRect(
          mapX + viewX * scale,
          mapY + viewY * scale,
          CAMERA_VIEW_SIZE * scale,
          CAMERA_VIEW_SIZE * scale
        );
        
        // Players on minimap
        const p1Head = gameStateRef.current.p1.snake[0];
        const p2Head = gameStateRef.current.p2.snake[0];
        
        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.arc(mapX + p1Head.x * scale, mapY + p1Head.y * scale, 3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#ec4899';
        ctx.beginPath();
        ctx.arc(mapX + p2Head.x * scale, mapY + p2Head.y * scale, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    };

    animationFrameId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isReady, currentPlayerName, roomCode, player1, player2]);

  // Loading state
  if (!isReady) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">🎮</div>
          <p className="text-white text-xl">Loading Game...</p>
          <p className="text-slate-400 text-sm mt-2">Room: {roomCode}</p>
        </div>
      </div>
    );
  }

  const mode = gameModeRef.current;
  const viewSize = mode === 'ARENA' ? CAMERA_VIEW_SIZE : GRID_SIZE;
  const CANVAS_WIDTH = viewSize * CELL_SIZE;
  const CANVAS_HEIGHT = viewSize * CELL_SIZE;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden">
      
      {/* HUD */}
      <div className="w-full max-w-[600px] flex items-center justify-between px-4 py-2 bg-slate-900/90 backdrop-blur-md border-b border-slate-700/50 absolute top-0 z-20 shadow-xl rounded-b-xl">
        <div className="flex flex-col items-start">
          <span className={`text-sm font-bold ${currentPlayerName === player1?.name ? 'text-white' : 'text-slate-400'}`}>
            {player1?.name || 'P1'} {currentPlayerName === player1?.name && '(YOU)'}
          </span>
          <span className="text-2xl font-black text-blue-400 leading-none">{gameStateRef.current.p1.score}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-xs text-slate-500 mb-1">{gameMode}</span>
          <div className={`text-3xl font-black tracking-widest ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </div>
          <span className="text-[10px] text-slate-500 font-mono tracking-widest">ROOM: {roomCode}</span>
        </div>
        <div className="flex flex-col items-end">
          <span className={`text-sm font-bold ${currentPlayerName === player2?.name ? 'text-white' : 'text-slate-400'}`}>
            {player2?.name || 'P2'} {currentPlayerName === player2?.name && '(YOU)'}
          </span>
          <span className="text-2xl font-black text-pink-400 leading-none">{gameStateRef.current.p2.score}</span>
        </div>
      </div>

      <div className="relative mt-16">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="border-2 sm:border-4 border-slate-700 rounded-lg shadow-2xl bg-slate-900"
          style={{ imageRendering: 'pixelated', maxWidth: '95vw', maxHeight: '75vh' }}
        />
        {winner && (
          <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center rounded-lg backdrop-blur-md z-50">
            <h2 className="text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-6 text-center px-4">
              {winner === 'Tie' ? "IT'S A TIE!" : `${winner} WINS!`}
            </h2>
            <div className="flex gap-4 mb-4">
              <div className="text-center">
                <p className="text-blue-400 font-bold">{player1?.name}</p>
                <p className="text-2xl text-white">{gameStateRef.current.p1.score}</p>
              </div>
              <div className="text-3xl text-slate-500">vs</div>
              <div className="text-center">
                <p className="text-pink-400 font-bold">{player2?.name}</p>
                <p className="text-2xl text-white">{gameStateRef.current.p2.score}</p>
              </div>
            </div>
            <button 
              onClick={onBack} 
              className="px-8 py-3 bg-white text-slate-900 font-bold text-lg rounded-full hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.3)]"
            >
              Back to Menu
            </button>
          </div>
        )}
      </div>

      {showControls && <MobileControls onDirectionChange={handleMobileDirection} />}
    </div>
  );
}