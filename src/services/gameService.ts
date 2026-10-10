import axios from 'axios';
import { config } from '../config/env';
import { Game } from '../types/game';

const RAWG_BASE_URL = 'https://api.rawg.io/api';
const RELEASED_AFTER = '2015-01-01';
const MAX_PAGE = 100;
const MAX_ATTEMPTS = 3;

export class GameService {
  private apiKey: string;

  constructor() {
    if (!config.rawgApiKey) {
      throw new Error('RAWG_API_KEY is missing. Add it to your .env file or repository secrets.');
    }
    this.apiKey = config.rawgApiKey;
  }

  async getRandomGame(historyService?: { has: (id: number) => boolean }): Promise<Game | null> {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const game = await this.tryRandomPage(historyService);
      if (game) {
        return game;
      }
      console.log(`No suitable game found (attempt ${attempt}/${MAX_ATTEMPTS}), trying another page...`);
    }
    return null;
  }

  private async tryRandomPage(historyService?: { has: (id: number) => boolean }): Promise<Game | null> {
    const page = Math.floor(Math.random() * MAX_PAGE) + 1;
    const today = new Date().toISOString().slice(0, 10);

    const response = await axios.get(`${RAWG_BASE_URL}/games`, {
      params: {
        key: this.apiKey,
        dates: `${RELEASED_AFTER},${today}`,
        ordering: '-rating',
        page_size: 20,
        page: page
      }
    });

    const games: Game[] = response.data.results ?? [];

    for (const basicGame of shuffle(games)) {
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

    return null;
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

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
