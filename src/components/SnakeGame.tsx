import { useEffect, useRef, useState } from 'react';
import { MobileControls } from './MobileControls';

interface SnakeGameProps {
  onBack: () => void;
  showControls?: boolean;
  initialMode?: 'ARENA';
}

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type GameMode = 'classic' | 'speed' | 'walls' | 'portal' | 'arena';
type GameState = 'menu' | 'playing' | 'paused' | 'gameover';

interface Position {
  x: number;
  y: number;
}

interface Food {
  position: Position;
  type: 'normal' | 'speed' | 'immortal';
  value: number;
}

interface Portal {
  entrance: Position;
  exit: Position;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

interface Enemy {
  id: number;
  x: number;
  y: number;
  type: 'monster';
}

interface Cannon {
  id: number;
  x: number;
  y: number;
  cooldown: number;
}

interface Projectile {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
}

export function SnakeGame({ onBack, showControls = true, initialMode }: SnakeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>('menu');
  const [selectedMode, setSelectedMode] = useState<GameMode>('classic');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [isImmortal, setIsImmortal] = useState(false);
  
  const gameLoopRef = useRef<number | undefined>(undefined);
  const snakeRef = useRef<Position[]>([{ x: 10, y: 10 }]);
  const directionRef = useRef<Direction>('RIGHT');
  const nextDirectionRef = useRef<Direction>('RIGHT');
  const foodRef = useRef<Food[]>([]);
  const speedRef = useRef(150);
  const lastMoveTimeRef = useRef(0);
  const wallsRef = useRef<Position[]>([]);
  const portalsRef = useRef<Portal[]>([]);
  const speedBoostRef = useRef(0);
  const immortalTimerRef = useRef(0);
  
  // Arena specific refs
  const enemiesRef = useRef<Enemy[]>([]);
  const cannonsRef = useRef<Cannon[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const cameraRef = useRef<Position>({ x: 0, y: 0 });
  
  // Animation Refs
  const particlesRef = useRef<Particle[]>([]);
  const globalTickRef = useRef(0);
  const screenShakeRef = useRef(0);

  const GRID_SIZE = 20;
  const ARENA_GRID_SIZE = 150;
  const CAMERA_VIEW_SIZE = 21;
  const CELL_SIZE = 25;

  // Load high score
  useEffect(() => {
    const saved = localStorage.getItem('snakeHighScore');
    if (saved) setHighScore(parseInt(saved));
  }, []);

  // Initialize with mode if provided
  useEffect(() => {
    if (initialMode === 'ARENA') {
      startGame('arena');
    }
  }, [initialMode]);

  const getCurrentGridSize = () => selectedMode === 'arena' ? ARENA_GRID_SIZE : GRID_SIZE;

  // Generate random position
  const getRandomPosition = (avoid: Position[] = []): Position => {
    const size = getCurrentGridSize();
    let position: Position;
    let attempts = 0;
    do {
      position = {
        x: Math.floor(Math.random() * size),
        y: Math.floor(Math.random() * size)
      };
      attempts++;
    } while (
      attempts < 100 &&
      (avoid.some(p => p.x === position.x && p.y === position.y) ||
      wallsRef.current.some(w => w.x === position.x && w.y === position.y))
    );
    return position;
  };

  // Spawn food (2 items always)
  const spawnFood = () => {
    const targetCount = selectedMode === 'arena' ? 20 : 2;
    const currentCount = foodRef.current.length;
    
    if (currentCount >= targetCount) return;

    const toAdd = targetCount - currentCount;
    const foods: Food[] = [];
    
    for (let i = 0; i < toAdd; i++) {
      const rand = Math.random();
      let type: Food['type'] = 'normal';
      let value = 10;

      if (rand < 0.05) {
        type = 'immortal'; // Yellow ball
        value = 50;
      } else if (rand < 0.15) {
        type = 'speed'; // Blue ball
        value = 15;
      }

      foods.push({
        position: getRandomPosition([...snakeRef.current, ...foodRef.current.map(f => f.position)]),
        type,
        value
      });
    }
    
    foodRef.current = [...foodRef.current, ...foods];
  };

  // Generate Arena Map
  const generateArena = () => {
    const size = ARENA_GRID_SIZE;
    const walls: Position[] = [];
    
    // Border walls
    for (let i = 0; i < size; i++) {
      walls.push({ x: i, y: 0 });
      walls.push({ x: i, y: size - 1 });
      walls.push({ x: 0, y: i });
      walls.push({ x: size - 1, y: i });
    }

    // Random structures
    for (let i = 0; i < 250; i++) {
      const start = {
        x: Math.floor(Math.random() * (size - 10) + 5),
        y: Math.floor(Math.random() * (size - 10) + 5)
      };
      const horizontal = Math.random() > 0.5;
      const length = Math.floor(Math.random() * 5 + 3);

      for (let j = 0; j < length; j++) {
        walls.push({
          x: horizontal ? start.x + j : start.x,
          y: horizontal ? start.y : start.y + j
        });
      }
    }
    wallsRef.current = walls;

    // Monsters (20)
    const enemies: Enemy[] = [];
    for (let i = 0; i < 20; i++) {
      const pos = getRandomPosition(walls);
      enemies.push({ id: i, x: pos.x, y: pos.y, type: 'monster' });
    }
    enemiesRef.current = enemies;

    // Cannons (7)
    const cannons: Cannon[] = [];
    for (let i = 0; i < 7; i++) {
      const pos = getRandomPosition(walls);
      cannons.push({ id: i, x: pos.x, y: pos.y, cooldown: Math.random() * 60 });
    }
    cannonsRef.current = cannons;
    
    projectilesRef.current = [];
  };

  // Generate walls for walls mode
  const generateWalls = () => {
    const walls: Position[] = [];
    const numWalls = 5 + Math.floor(level / 2);
    
    for (let i = 0; i < numWalls; i++) {
      const length = 2 + Math.floor(Math.random() * 4);
      const horizontal = Math.random() > 0.5;
      const start = getRandomPosition([...snakeRef.current, ...walls]);
      
      for (let j = 0; j < length; j++) {
        const wall = {
          x: horizontal ? start.x + j : start.x,
          y: horizontal ? start.y : start.y + j
        };
        if (wall.x >= 0 && wall.x < GRID_SIZE && wall.y >= 0 && wall.y < GRID_SIZE) {
          walls.push(wall);
        }
      }
    }
    wallsRef.current = walls;
  };

  // Generate portals
  const generatePortals = () => {
    const portals: Portal[] = [];
    const numPortals = 2 + Math.floor(level / 3);
    
    for (let i = 0; i < numPortals; i++) {
      const entrance = getRandomPosition([
        ...snakeRef.current,
        ...wallsRef.current,
        ...portals.flatMap(p => [p.entrance, p.exit])
      ]);
      const exit = getRandomPosition([
        ...snakeRef.current,
        ...wallsRef.current,
        entrance,
        ...portals.flatMap(p => [p.entrance, p.exit])
      ]);
      
      portals.push({ entrance, exit });
    }
    portalsRef.current = portals;
  };

  // Handle direction change from mobile controls
  const handleDirectionChange = (newDirection: Direction) => {
    if (gameState !== 'playing') return;
    
    const currentDir = nextDirectionRef.current;
    
    if (
      (newDirection === 'UP' && currentDir !== 'DOWN') ||
      (newDirection === 'DOWN' && currentDir !== 'UP') ||
      (newDirection === 'LEFT' && currentDir !== 'RIGHT') ||
      (newDirection === 'RIGHT' && currentDir !== 'LEFT')
    ) {
      nextDirectionRef.current = newDirection;
    }
  };

  // Start game
  const startGame = (mode: GameMode) => {
    setSelectedMode(mode);
    setScore(0);
    setLevel(1);
    
    const size = mode === 'arena' ? ARENA_GRID_SIZE : GRID_SIZE;
    snakeRef.current = [{ x: Math.floor(size / 2), y: Math.floor(size / 2) }];
    directionRef.current = 'RIGHT';
    nextDirectionRef.current = 'RIGHT';
    speedRef.current = mode === 'speed' ? 100 : 150;
    speedBoostRef.current = 0;
    immortalTimerRef.current = 0;
    setIsImmortal(false);
    wallsRef.current = [];
    portalsRef.current = [];
    particlesRef.current = [];
    enemiesRef.current = [];
    cannonsRef.current = [];
    projectilesRef.current = [];
    foodRef.current = [];
    globalTickRef.current = 0;
    screenShakeRef.current = 0;
    
    if (mode === 'walls') generateWalls();
    if (mode === 'portal') generatePortals();
    if (mode === 'arena') generateArena();

    spawnFood();
    setGameState('playing');
  };

  // Handle keyboard input
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (gameState === 'menu') return;

      if (e.key === 'Escape') {
        if (gameState === 'playing') {
          setGameState('paused');
        } else if (gameState === 'paused') {
          setGameState('playing');
        }
        return;
      }

      if (gameState !== 'playing') return;

      const key = e.key.toLowerCase();
      const currentDir = nextDirectionRef.current;

      if ((key === 'arrowup' || key === 'w') && currentDir !== 'DOWN') {
        nextDirectionRef.current = 'UP';
      } else if ((key === 'arrowdown' || key === 's') && currentDir !== 'UP') {
        nextDirectionRef.current = 'DOWN';
      } else if ((key === 'arrowleft' || key === 'a') && currentDir !== 'RIGHT') {
        nextDirectionRef.current = 'LEFT';
      } else if ((key === 'arrowright' || key === 'd') && currentDir !== 'LEFT') {
        nextDirectionRef.current = 'RIGHT';
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameState]);

  // Check collision
  const checkCollision = (head: Position): boolean => {
    const size = getCurrentGridSize();

    // Self collision (skip if immortal)
    if (!isImmortal && snakeRef.current.some(segment => segment.x === head.x && segment.y === head.y)) {
      return true;
    }

    // Wall collision
    if (selectedMode === 'classic' || selectedMode === 'walls' || selectedMode === 'arena') {
      if (!isImmortal) {
        if (head.x < 0 || head.x >= size || head.y < 0 || head.y >= size) {
          return true;
        }
        if (wallsRef.current.some(wall => wall.x === head.x && wall.y === head.y)) {
          return true;
        }
      }
    }

    return false;
  };

  // Game over
  const gameOver = () => {
    screenShakeRef.current = 20;
    setGameState('gameover');
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('snakeHighScore', score.toString());
    }
  };

  // Spawn particles
  const spawnParticles = (x: number, y: number, color: string, count = 10) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x: x * CELL_SIZE + CELL_SIZE / 2,
        y: y * CELL_SIZE + CELL_SIZE / 2,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        life: 1.0,
        color,
        size: Math.random() * 5 + 2
      });
    }
  };

  // Update Camera
  const updateCamera = () => {
    if (selectedMode !== 'arena') return;
    const head = snakeRef.current[0];
    const halfView = Math.floor(CAMERA_VIEW_SIZE / 2);
    
    // Smooth camera target
    let targetX = head.x - halfView;
    let targetY = head.y - halfView;

    // Clamp to bounds
    targetX = Math.max(0, Math.min(targetX, ARENA_GRID_SIZE - CAMERA_VIEW_SIZE));
    targetY = Math.max(0, Math.min(targetY, ARENA_GRID_SIZE - CAMERA_VIEW_SIZE));

    cameraRef.current = { x: targetX, y: targetY };
  };

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const gameLoop = (timestamp: number) => {
      globalTickRef.current++;
      const size = getCurrentGridSize();
      
      // Decay screen shake
      if (screenShakeRef.current > 0.5) {
        screenShakeRef.current *= 0.9;
      } else {
        screenShakeRef.current = 0;
      }

      // Update particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.05;
        p.size *= 0.95;
        if (p.life <= 0) {
          particlesRef.current.splice(i, 1);
        }
      }

      // Arena Logic: Enemies & Cannons
      if (selectedMode === 'arena') {
        // Update Projectiles
        for (let i = projectilesRef.current.length - 1; i >= 0; i--) {
          const p = projectilesRef.current[i];
          p.x += p.dx;
          p.y += p.dy;

          // Remove if out of bounds or hits wall
          if (p.x < 0 || p.x >= size || p.y < 0 || p.y >= size || 
              wallsRef.current.some(w => w.x === Math.round(p.x) && w.y === Math.round(p.y))) {
            projectilesRef.current.splice(i, 1);
            continue;
          }

          // Check collision with snake
          if (!isImmortal) {
            const head = snakeRef.current[0];
            const dist = Math.hypot(p.x - head.x, p.y - head.y);
            if (dist < 1) {
              gameOver();
              return;
            }
          }
        }

        // Update Cannons
        if (globalTickRef.current % 10 === 0) { // Check every 10 ticks to save perf
           cannonsRef.current.forEach(cannon => {
             if (Math.random() < 0.02) { // Fire chance
                const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
                const dir = dirs[Math.floor(Math.random() * 4)];
                projectilesRef.current.push({
                  id: Math.random(),
                  x: cannon.x,
                  y: cannon.y,
                  dx: dir[0] * 0.5,
                  dy: dir[1] * 0.5
                });
             }
           });
        }

        // Update Monsters
        if (globalTickRef.current % 15 === 0) {
          enemiesRef.current.forEach(enemy => {
            const head = snakeRef.current[0];
            const dx = head.x - enemy.x;
            const dy = head.y - enemy.y;
            const dist = Math.hypot(dx, dy);

            if (dist < 10) { // Chase range
               if (Math.abs(dx) > Math.abs(dy)) {
                 enemy.x += dx > 0 ? 1 : -1;
               } else {
                 enemy.y += dy > 0 ? 1 : -1;
               }
            } else {
               // Random move
               if (Math.random() < 0.3) {
                 const move = [[0, 1], [0, -1], [1, 0], [-1, 0]][Math.floor(Math.random() * 4)];
                 enemy.x += move[0];
                 enemy.y += move[1];
               }
            }
            
            // Collision with snake
            if (enemy.x === head.x && enemy.y === head.y) {
              if (isImmortal) {
                // Destroy enemy
                enemiesRef.current = enemiesRef.current.filter(e => e.id !== enemy.id);
                spawnParticles(enemy.x, enemy.y, '#ef4444', 20);
                setScore(s => s + 100);
                screenShakeRef.current = 10;
              } else {
                gameOver();
                return;
              }
            }
          });
        }
      }

      updateCamera();

      const deltaTime = timestamp - lastMoveTimeRef.current;
      const currentSpeed = speedBoostRef.current > 0 ? speedRef.current * 0.6 : speedRef.current;

      if (deltaTime >= currentSpeed) {
        lastMoveTimeRef.current = timestamp;
        
        directionRef.current = nextDirectionRef.current;

        // Calculate new head position
        const head = { ...snakeRef.current[0] };
        
        switch (directionRef.current) {
          case 'UP': head.y -= 1; break;
          case 'DOWN': head.y += 1; break;
          case 'LEFT': head.x -= 1; break;
          case 'RIGHT': head.x += 1; break;
        }

        // Wrap logic
        if (selectedMode === 'speed' || selectedMode === 'portal' || isImmortal) {
          if (head.x < 0) head.x = size - 1;
          if (head.x >= size) head.x = 0;
          if (head.y < 0) head.y = size - 1;
          if (head.y >= size) head.y = 0;
        }

        // Portal logic
        if (selectedMode === 'portal') {
          const portal = portalsRef.current.find(
            p => p.entrance.x === head.x && p.entrance.y === head.y
          );
          if (portal) {
            head.x = portal.exit.x;
            head.y = portal.exit.y;
          }
        }

        // Check collision
        if (checkCollision(head)) {
          gameOver();
          return;
        }

        // Add new head
        snakeRef.current.unshift(head);

        // Check food collision
        let ateFood = false;
        for (let i = foodRef.current.length - 1; i >= 0; i--) {
          const food = foodRef.current[i];
          if (head.x === food.position.x && head.y === food.position.y) {
            ateFood = true;
            setScore(prev => prev + food.value);

            let particleColor = '#10b981';
            if (food.type === 'speed') particleColor = '#3b82f6';
            if (food.type === 'immortal') particleColor = '#fbbf24';
            spawnParticles(head.x, head.y, particleColor, 15);

            if (food.type === 'speed') {
              speedBoostRef.current = 420;
              screenShakeRef.current = 5;
            } else if (food.type === 'immortal') {
              setIsImmortal(true);
              immortalTimerRef.current = 600;
              screenShakeRef.current = 10;
            } else {
              screenShakeRef.current = 2;
            }

            foodRef.current.splice(i, 1);
            break;
          }
        }

        spawnFood();

        // Level up
        if (ateFood && snakeRef.current.length % 5 === 0) {
          setLevel(prev => prev + 1);
          if (speedRef.current > 50) speedRef.current -= 10;
          if (selectedMode === 'walls') generateWalls();
          if (selectedMode === 'portal') generatePortals();
        }

        if (!ateFood) {
          snakeRef.current.pop();
        }

        // Timers
        if (speedBoostRef.current > 0) speedBoostRef.current--;
        if (immortalTimerRef.current > 0) {
          immortalTimerRef.current--;
          if (immortalTimerRef.current <= 0) setIsImmortal(false);
        }
      }

      render();
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState, selectedMode, isImmortal]);

  // Render game
  const render = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderSize = selectedMode === 'arena' ? CAMERA_VIEW_SIZE : GRID_SIZE;
    const viewX = selectedMode === 'arena' ? cameraRef.current.x : 0;
    const viewY = selectedMode === 'arena' ? cameraRef.current.y : 0;

    // Clear
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    
    // Scale for camera view
    if (selectedMode === 'arena') {
       // Since the canvas size is constant (GRID_SIZE * CELL_SIZE), we need to scale if the view size is different
       // But here we keep canvas size same and just render what's in view
       // To match pixel ratio:
       const scale = GRID_SIZE / CAMERA_VIEW_SIZE; 
       ctx.scale(scale, scale);
    }

    if (screenShakeRef.current > 0) {
      const dx = (Math.random() - 0.5) * screenShakeRef.current;
      const dy = (Math.random() - 0.5) * screenShakeRef.current;
      ctx.translate(dx, dy);
    }

    // Grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= renderSize; x++) {
      ctx.moveTo(x * CELL_SIZE, 0);
      ctx.lineTo(x * CELL_SIZE, renderSize * CELL_SIZE);
    }
    for (let y = 0; y <= renderSize; y++) {
      ctx.moveTo(0, y * CELL_SIZE);
      ctx.lineTo(renderSize * CELL_SIZE, y * CELL_SIZE);
    }
    ctx.stroke();

    // Helper to check visibility and transform coordinates
    const isVisible = (x: number, y: number) => {
      if (selectedMode !== 'arena') return true;
      return x >= viewX && x < viewX + renderSize && y >= viewY && y < viewY + renderSize;
    };

    const transform = (x: number, y: number) => {
      if (selectedMode !== 'arena') return { x: x * CELL_SIZE, y: y * CELL_SIZE };
      return { x: (x - viewX) * CELL_SIZE, y: (y - viewY) * CELL_SIZE };
    };

    const drawGridRect = (x: number, y: number, color: string, outline?: string) => {
      if (!isVisible(x, y)) return;
      const p = transform(x, y);
      
      ctx.fillStyle = color;
      ctx.fillRect(p.x + 1, p.y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
      
      if (outline) {
        ctx.strokeStyle = outline;
        ctx.strokeRect(p.x + 1, p.y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
      }
    };

    const drawCircle = (x: number, y: number, color: string, glow = false) => {
      if (!isVisible(x, y)) return;
      const p = transform(x, y);
      const cx = p.x + CELL_SIZE / 2;
      const cy = p.y + CELL_SIZE / 2;
      
      if (glow) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = color;
      }
      ctx.fillStyle = color;
      ctx.beginPath();
      let radius = CELL_SIZE / 2 - 2;
      if (glow) {
        radius += Math.sin(globalTickRef.current * 0.1) * 2;
      }
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    };

    // Draw Particles (need to transform)
    particlesRef.current.forEach(p => {
       // Particles are stored in pixel coords relative to world, so we need to adjust
       // Actually I stored them relative to screen index... let's fix
       // The spawnParticles used x, y indices to create pixel coords.
       // So we need to subtract camera offset in pixels
       let px = p.x;
       let py = p.y;
       if (selectedMode === 'arena') {
         px -= viewX * CELL_SIZE;
         py -= viewY * CELL_SIZE;
       }
       
       // Only draw if on screen
       if (px >= 0 && px <= canvas.width && py >= 0 && py <= canvas.height) {
         ctx.fillStyle = p.color;
         ctx.globalAlpha = p.life;
         ctx.beginPath();
         ctx.arc(px, py, p.size, 0, Math.PI * 2);
         ctx.fill();
         ctx.globalAlpha = 1.0;
       }
    });

    // Draw Walls
    wallsRef.current.forEach(w => drawGridRect(w.x, w.y, '#ef4444', '#dc2626'));

    // Draw Portals
    portalsRef.current.forEach(p => {
      drawGridRect(p.entrance.x, p.entrance.y, '#3b82f6');
      drawGridRect(p.exit.x, p.exit.y, '#a855f7');
    });

    // Draw Food
    foodRef.current.forEach(f => {
      let fc = '#10b981';
      if (f.type === 'speed') fc = '#3b82f6';
      if (f.type === 'immortal') fc = '#fbbf24';
      drawCircle(f.position.x, f.position.y, fc, true);
    });

    // Draw Enemies
    enemiesRef.current.forEach(e => {
       drawGridRect(e.x, e.y, '#b91c1c', '#991b1b');
       // Draw eyes
       if (isVisible(e.x, e.y)) {
         const p = transform(e.x, e.y);
         ctx.fillStyle = '#fff';
         ctx.fillRect(p.x + 5, p.y + 5, 5, 5);
         ctx.fillRect(p.x + 15, p.y + 5, 5, 5);
       }
    });

    // Draw Cannons
    cannonsRef.current.forEach(c => {
       drawGridRect(c.x, c.y, '#4b5563', '#374151'); // Gray
    });

    // Draw Projectiles
    projectilesRef.current.forEach(p => {
       const x = Math.floor(p.x);
       const y = Math.floor(p.y);
       if (isVisible(x, y)) {
          // Correction for transform expecting int grid coords, but we want smooth
          // transform does (x-viewX)*CELL
          const smoothX = (p.x - viewX) * CELL_SIZE + CELL_SIZE/2;
          const smoothY = (p.y - viewY) * CELL_SIZE + CELL_SIZE/2;
          
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(smoothX, smoothY, 4, 0, Math.PI * 2);
          ctx.fill();
       }
    });

    // Draw Snake
    snakeRef.current.forEach((s, i) => {
      let color = isImmortal ? '#fbbf24' : (i === 0 ? '#10b981' : '#059669');
      if (speedBoostRef.current > 0 && !isImmortal) color = '#3b82f6';
      
      if (i === 0) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = color;
      }

      drawGridRect(s.x, s.y, color);
      ctx.shadowBlur = 0;
      
      if (i === 0 && isVisible(s.x, s.y)) {
        const p = transform(s.x, s.y);
        // Actually drawGridRect calculates px, py. We need raw coords for eyes.
        // Let's reuse p.x and p.y from transform
        
        ctx.fillStyle = '#fff';
        if (Math.floor(globalTickRef.current / 100) % 10 !== 0) {
           // Simple eyes
           ctx.beginPath();
           ctx.arc(p.x + 8, p.y + 8, 3, 0, Math.PI*2);
           ctx.arc(p.x + 18, p.y + 8, 3, 0, Math.PI*2);
           ctx.fill();
        }
      }
    });

    ctx.restore();
  };

  const canvasSize = GRID_SIZE * CELL_SIZE;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden text-white">
      
      {gameState === 'menu' && (
        <div className="w-full max-w-4xl px-4 z-10 text-center">
          <h1 className="text-4xl font-black mb-8 text-green-400">🐍 SNAKE BATTLE</h1>
          <div className="flex flex-wrap justify-center gap-4 max-w-2xl mx-auto">
            <button onClick={() => startGame('classic')} className="p-6 bg-gradient-to-br from-green-600 to-green-800 rounded-xl hover:scale-105 transition-transform font-bold">
              🎮 Classic
            </button>
            <button onClick={() => startGame('speed')} className="p-6 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl hover:scale-105 transition-transform font-bold">
              ⚡ Speed
            </button>
            <button onClick={() => startGame('walls')} className="p-6 bg-gradient-to-br from-red-600 to-red-800 rounded-xl hover:scale-105 transition-transform font-bold">
              🧱 Walls
            </button>
            <button onClick={() => startGame('portal')} className="p-6 bg-gradient-to-br from-purple-600 to-purple-800 rounded-xl hover:scale-105 transition-transform font-bold">
              🌀 Portal
            </button>
            <button onClick={() => startGame('arena')} className="p-6 bg-gradient-to-br from-orange-600 to-amber-700 rounded-xl hover:scale-105 transition-transform font-bold shadow-lg shadow-orange-500/20">
              ⚔️ Arena Battle
            </button>
          </div>
          <button onClick={onBack} className="mt-8 text-slate-400 hover:text-white transition-colors">
            ← Back to Main Menu
          </button>
        </div>
      )}

      {(gameState === 'playing' || gameState === 'paused') && (
        <div className="relative">
          {/* Top Stats Bar */}
          <div className="absolute -top-16 left-0 right-0 flex justify-between items-center bg-slate-900/80 p-3 rounded-xl backdrop-blur-md border border-slate-700">
            <button onClick={onBack} className="text-sm font-bold text-red-400 hover:text-red-300">EXIT</button>
            <div className="flex gap-6">
              <div className="text-center">
                <div className="text-xs text-slate-500">SCORE</div>
                <div className="font-bold text-xl">{score}</div>
              </div>
              {selectedMode !== 'arena' && (
                <div className="text-center">
                  <div className="text-xs text-slate-500">LEVEL</div>
                  <div className="font-bold text-xl text-blue-400">{level}</div>
                </div>
              )}
              <div className="text-center">
                <div className="text-xs text-slate-500">BEST</div>
                <div className="font-bold text-xl text-yellow-400">{highScore}</div>
              </div>
            </div>
            <div className="flex gap-2">
              {isImmortal && <span className="text-yellow-400 animate-pulse text-xl">🛡️</span>}
              {speedBoostRef.current > 0 && <span className="text-blue-400 animate-pulse text-xl">⚡</span>}
            </div>
          </div>

          <canvas
            ref={canvasRef}
            width={canvasSize}
            height={canvasSize}
            className="bg-black border-4 border-slate-700 rounded-xl shadow-2xl"
            style={{ imageRendering: 'pixelated', maxWidth: '95vw', maxHeight: '80vh' }}
          />
          
          {/* Minimap for Arena */}
          {selectedMode === 'arena' && (
            <div className="absolute bottom-4 right-4 w-32 h-32 bg-black/80 border border-slate-600 rounded-lg overflow-hidden opacity-80">
              <div className="relative w-full h-full">
                {/* Snake Dot */}
                <div 
                  className="absolute w-1.5 h-1.5 bg-green-500 rounded-full"
                  style={{ 
                    left: `${(snakeRef.current[0]?.x / ARENA_GRID_SIZE) * 100}%`,
                    top: `${(snakeRef.current[0]?.y / ARENA_GRID_SIZE) * 100}%`
                  }}
                />
                {/* Enemies Dots */}
                {enemiesRef.current.map(e => (
                   <div 
                      key={e.id}
                      className="absolute w-1 h-1 bg-red-500 rounded-full"
                      style={{ 
                        left: `${(e.x / ARENA_GRID_SIZE) * 100}%`,
                        top: `${(e.y / ARENA_GRID_SIZE) * 100}%`
                      }}
                   />
                ))}
              </div>
            </div>
          )}

          {gameState === 'paused' && (
            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center rounded-xl backdrop-blur-sm">
              <h2 className="text-4xl font-bold mb-4 text-white">⏸️ PAUSED</h2>
              <p className="text-slate-400">Press ESC to resume</p>
            </div>
          )}
        </div>
      )}

      {gameState === 'gameover' && (
        <div className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center z-50 backdrop-blur-md">
          <h2 className="text-6xl font-black text-red-500 mb-4 animate-bounce">💀 GAME OVER</h2>
          <p className="text-3xl mb-2 text-white">Score: <span className="text-green-400">{score}</span></p>
          <div className="flex gap-4 mt-8">
            <button onClick={() => startGame(selectedMode)} className="px-8 py-4 bg-green-600 hover:bg-green-500 rounded-xl font-bold text-xl transition-colors shadow-lg shadow-green-600/20">
              🔄 Replay
            </button>
            <button onClick={() => setGameState('menu')} className="px-8 py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-xl transition-colors shadow-lg shadow-blue-600/20">
              📋 Menu
            </button>
          </div>
        </div>
      )}

      {gameState === 'playing' && showControls && (
        <MobileControls onDirectionChange={handleDirectionChange} />
      )}
    </div>
  );
}