import tkinter as tk
from tkinter import messagebox
import random
from enum import Enum
from dataclasses import dataclass
import json
import os

# --- Configuration & Data Structures ---

class Direction(Enum):
    UP = (0, -1)
    DOWN = (0, 1)
    LEFT = (-1, 0)
    RIGHT = (1, 0)

class GameMode(Enum):
    CLASSIC = "Classic"
    SPEED = "Speed"
    WALLS = "Walls"
    PORTAL = "Portal"

@dataclass
class Position:
    x: int
    y: int
    
    def __add__(self, other):
        return Position(self.x + other[0], self.y + other[1])
    
    def __eq__(self, other):
        if not isinstance(other, Position): return False
        return self.x == other.x and self.y == other.y

# --- Main Game Engine ---

class SnakeGame:
    def __init__(self, root, mode=GameMode.CLASSIC):
        self.root = root
        self.mode = mode
        
        # Mobile-friendly grid (slightly smaller for better visibility)
        self.grid_size = 18
        self.cell_size = 20
        self.canvas_size = self.grid_size * self.cell_size
        
        # Game state
        self.snake = [Position(9, 9)]
        self.direction = Direction.RIGHT
        self.next_direction = Direction.RIGHT
        self.food = []
        self.score = 0
        self.high_score = self.load_high_score()
        self.game_over = False
        self.paused = False
        self.walls = []
        self.portals = []
        
        self.current_speed = 180 if mode == GameMode.SPEED else 220
        
        self.setup_ui()
        self.spawn_food()
        if mode == GameMode.WALLS: self.spawn_walls()
        if mode == GameMode.PORTAL: self.spawn_portals()
        
    def setup_ui(self):
        self.main_frame = tk.Frame(self.root, bg='#1a1a2e')
        self.main_frame.pack(fill=tk.BOTH, expand=True)

        # 1. Header (Scoreboard)
        header = tk.Frame(self.main_frame, bg='#161625', height=50)
        header.pack(fill=tk.X)
        
        self.score_label = tk.Label(header, text=f"Score: {self.score}", font=('Arial', 12, 'bold'), fg='#4ade80', bg='#161625')
        self.score_label.pack(side=tk.LEFT, padx=20, pady=10)
        
        self.hs_label = tk.Label(header, text=f"Best: {self.high_score}", font=('Arial', 12), fg='#fbbf24', bg='#161625')
        self.hs_label.pack(side=tk.RIGHT, padx=20)

        # 2. Game Canvas
        self.canvas = tk.Canvas(
            self.main_frame, width=self.canvas_size, height=self.canvas_size,
            bg='#0f0f1e', highlightthickness=2, highlightbackground='#334155'
        )
        self.canvas.pack(pady=15)

        # 3. SPLIT MOBILE CONTROLS
        ctrl_container = tk.Frame(self.main_frame, bg='#1a1a2e')
        ctrl_container.pack(fill=tk.X, side=tk.BOTTOM, pady=20)

        # Button Visual Style
        btn_opts = {
            'font': ('Arial', 22, 'bold'),
            'width': 4,
            'height': 1,
            'bg': '#2d3748',
            'fg': 'white',
            'activebackground': '#4ade80',
            'bd': 0,
            'relief': 'flat'
        }

        # LEFT SIDE: Vertical Controls (Up/Down)
        left_side = tk.Frame(ctrl_container, bg='#1a1a2e')
        left_side.pack(side=tk.LEFT, padx=30)
        
        tk.Button(left_side, text="▲", command=lambda: self.change_direction(Direction.UP), **btn_opts).pack(pady=5)
        tk.Button(left_side, text="▼", command=lambda: self.change_direction(Direction.DOWN), **btn_opts).pack(pady=5)

        # RIGHT SIDE: Horizontal Controls (Left/Right)
        right_side = tk.Frame(ctrl_container, bg='#1a1a2e')
        right_side.pack(side=tk.RIGHT, padx=30)
        
        tk.Button(right_side, text="◀", command=lambda: self.change_direction(Direction.LEFT), **btn_opts).pack(side=tk.LEFT, padx=5)
        tk.Button(right_side, text="▶", command=lambda: self.change_direction(Direction.RIGHT), **btn_opts).pack(side=tk.LEFT, padx=5)

        # Utility Buttons
        util_frame = tk.Frame(self.main_frame, bg='#1a1a2e')
        util_frame.pack(side=tk.BOTTOM)
        tk.Button(util_frame, text="PAUSE", font=('Arial', 10), bg='#4a5568', fg='white', command=self.toggle_pause).pack(side=tk.LEFT, padx=10)

    def change_direction(self, new_dir):
        opp = {Direction.UP: Direction.DOWN, Direction.DOWN: Direction.UP,
               Direction.LEFT: Direction.RIGHT, Direction.RIGHT: Direction.LEFT}
        if new_dir != opp.get(self.direction):
            self.next_direction = new_dir

    def spawn_food(self):
        while True:
            pos = Position(random.randint(0, self.grid_size-1), random.randint(0, self.grid_size-1))
            if pos not in self.snake and pos not in self.walls:
                self.food = [pos]
                break

    def spawn_walls(self):
        for _ in range(8):
            pos = Position(random.randint(0, self.grid_size-1), random.randint(0, self.grid_size-1))
            if pos not in self.snake: self.walls.append(pos)

    def spawn_portals(self):
        self.portals = [Position(2, 2), Position(self.grid_size-3, self.grid_size-3)]

    def update(self):
        if self.game_over or self.paused: return
        
        self.direction = self.next_direction
        head = self.snake[0]
        new_head = head + self.direction.value

        # Mode Logic: Portal
        if self.mode == GameMode.PORTAL and new_head in self.portals:
            p_idx = self.portals.index(new_head)
            new_head = self.portals[1 - p_idx]

        # Mode Logic: Wrap around for Speed/Portal
        if self.mode in [GameMode.SPEED, GameMode.PORTAL]:
            new_head.x %= self.grid_size
            new_head.y %= self.grid_size

        # Collision Check
        if self.check_collision(new_head):
            self.end_game()
            return

        self.snake.insert(0, new_head)
        
        if new_head in self.food:
            self.score += 10
            self.spawn_food()
            self.current_speed = max(80, self.current_speed - 5)
        else:
            self.snake.pop()

        self.draw()
        self.score_label.config(text=f"Score: {self.score}")
        self.root.after(self.current_speed, self.update)

    def check_collision(self, pos):
        if self.mode in [GameMode.CLASSIC, GameMode.WALLS]:
            if pos.x < 0 or pos.x >= self.grid_size or pos.y < 0 or pos.y >= self.grid_size: return True
        if pos in self.walls or pos in self.snake[1:]: return True
        return False

    def draw(self):
        self.canvas.delete('all')
        # Draw Food
        for f in self.food:
            x, y = f.x * self.cell_size, f.y * self.cell_size
            self.canvas.create_oval(x+2, y+2, x+self.cell_size-2, y+self.cell_size-2, fill='#4ade80', outline='white')
        # Draw Snake
        for i, s in enumerate(self.snake):
            x, y = s.x * self.cell_size, s.y * self.cell_size
            color = '#60a5fa' if i == 0 else '#3b82f6'
            self.canvas.create_rectangle(x, y, x+self.cell_size, y+self.cell_size, fill=color, outline='#1e3a8a')
        # Draw Walls
        for w in self.walls:
            x, y = w.x * self.cell_size, w.y * self.cell_size
            self.canvas.create_rectangle(x, y, x+self.cell_size, y+self.cell_size, fill='#4b5563')
        # Draw Portals
        for i, p in enumerate(self.portals):
            x, y = p.x * self.cell_size, p.y * self.cell_size
            c = '#a855f7' if i == 0 else '#ec4899'
            self.canvas.create_oval(x, y, x+self.cell_size, y+self.cell_size, outline=c, width=2)

    def toggle_pause(self):
        self.paused = not self.paused
        if not self.paused: self.update()

    def end_game(self):
        self.game_over = True
        if self.score > self.high_score: self.save_high_score()
        messagebox.showinfo("Game Over", f"Final Score: {self.score}")
        self.root.quit()

    def load_high_score(self):
        try:
            if os.path.exists('snake_highscores.json'):
                with open('snake_highscores.json', 'r') as f:
                    scores = json.load(f)
                    return scores.get(self.mode.value, 0)
        except:
            pass
        return 0

    def save_high_score(self):
        try:
            scores = {}
            if os.path.exists('snake_highscores.json'):
                with open('snake_highscores.json', 'r') as f:
                    scores = json.load(f)
            
            scores[self.mode.value] = self.high_score
            
            with open('snake_highscores.json', 'w') as f:
                json.dump(scores, f)
        except:
            pass

# --- Main Entry ---
if __name__ == "__main__":
    root = tk.Tk()
    root.title("Snake Mobile")
    root.geometry("400x750") # Set for mobile-like aspect ratio
    game = SnakeGame(root, GameMode.CLASSIC)
    game.update()
    root.mainloop()