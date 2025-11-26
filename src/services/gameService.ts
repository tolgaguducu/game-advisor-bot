import axios from 'axios';
import { config } from '../config/env';
import { Game } from '../types/game';

const RAWG_BASE_URL = 'https://api.rawg.io/api';

export class GameService {
  private apiKey: string;

  constructor() {
    this.apiKey = config.rawgApiKey;
    if (!this.apiKey) {
      console.warn('RAWG API Key is missing! Please check your .env file.');
    }
  }

  async getRandomGame(historyService?: { has: (id: number) => boolean }): Promise<Game | null> {
    try {
      const page = Math.floor(Math.random() * 100) + 1;
      
      const response = await axios.get(`${RAWG_BASE_URL}/games`, {
        params: {
          key: this.apiKey,
          dates: '2015-01-01,2025-11-23',
          ordering: '-rating',
          page_size: 20,
          page: page
        }
      });

      const games = response.data.results;
      if (games && games.length > 0) {
        const shuffledGames = games.sort(() => 0.5 - Math.random());

        for (const basicGame of shuffledGames.slice(0, 5)) {
          if (historyService && historyService.has(basicGame.id)) {
            console.log(`Skipping ${basicGame.name} (already recommended)...`);
            continue;
          }

          const details = await this.getGameDetails(basicGame.id);
          if (details && details.description_raw) {
            return details;
          }
          console.log(`Skipping ${basicGame.name} due to missing description...`);
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching random game:', error);
      return null;
    }
  }

  async getGameDetails(id: number): Promise<Game | null> {
    try {
      const response = await axios.get(`${RAWG_BASE_URL}/games/${id}`, {
        params: {
          key: this.apiKey
        }
      });
      return response.data as Game;
    } catch (error) {
      console.error(`Error fetching details for game ${id}:`, error);
      return null;
    }
  }
}
