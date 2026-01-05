// API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface Player {
  id?: number;
  name: string;
  high_score: number;
  games_played: number;
  levels_completed: number;
  created_at?: string;
}

export interface GameSession {
  id?: number;
  player_id: number;
  mode: 'single' | 'multi';
  score: number;
  level_reached: number;
  completed: boolean;
  duration: number;
  created_at?: string;
}

export interface Leaderboard {
  player_name: string;
  high_score: number;
  levels_completed: number;
}

class GameAPI {
  // Player endpoints
  async createPlayer(name: string): Promise<Player> {
    const response = await fetch(`${API_BASE_URL}/players`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) throw new Error('Failed to create player');
    return response.json();
  }

  async getPlayer(playerId: number): Promise<Player> {
    const response = await fetch(`${API_BASE_URL}/players/${playerId}`);
    if (!response.ok) throw new Error('Failed to get player');
    return response.json();
  }

  async updatePlayer(playerId: number, data: Partial<Player>): Promise<Player> {
    const response = await fetch(`${API_BASE_URL}/players/${playerId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update player');
    return response.json();
  }

  // Game session endpoints
  async createSession(sessionData: Omit<GameSession, 'id' | 'created_at'>): Promise<GameSession> {
    const response = await fetch(`${API_BASE_URL}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sessionData),
    });
    if (!response.ok) throw new Error('Failed to create session');
    return response.json();
  }

  async getPlayerSessions(playerId: number): Promise<GameSession[]> {
    const response = await fetch(`${API_BASE_URL}/sessions/player/${playerId}`);
    if (!response.ok) throw new Error('Failed to get sessions');
    return response.json();
  }

  // Leaderboard endpoints
  async getLeaderboard(limit: number = 10): Promise<Leaderboard[]> {
    const response = await fetch(`${API_BASE_URL}/leaderboard?limit=${limit}`);
    if (!response.ok) throw new Error('Failed to get leaderboard');
    return response.json();
  }

  // Statistics
  async getGameStats(): Promise<{
    total_players: number;
    total_games: number;
    total_score: number;
    avg_score: number;
  }> {
    const response = await fetch(`${API_BASE_URL}/stats`);
    if (!response.ok) throw new Error('Failed to get stats');
    return response.json();
  }
}

export const gameApi = new GameAPI();