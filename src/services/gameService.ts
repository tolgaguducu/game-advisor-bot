import axios from 'axios';
import { config } from '../config/env';
import { Game } from '../types/game';

const RAWG_BASE_URL = 'https://api.rawg.io/api';
const RELEASED_AFTER = '2010-01-01';
const PAGE_SIZE = 40;
const MAX_ATTEMPTS = 8;

// Popular days: critically acclaimed games that players also liked, ordered by how many RAWG users have them.
const MIN_METACRITIC = 80;
const POPULAR_MIN_RATING = 3.5;
const POPULAR_MIN_RATINGS_COUNT = 50;

// Hidden gem days: well-rated by players, but outside the most popular ~800 games.
const HIDDEN_GEM_DAYS = [3, 6]; // Wednesday, Saturday (UTC)
const HIDDEN_GEM_MIN_RATING = 4.0;
const HIDDEN_GEM_MIN_RATINGS_COUNT = 30;
const HIDDEN_GEM_PAGES = { min: 20, max: 250 };

const EXCLUDED_TAGS = ['sexual-content', 'hentai', 'nsfw'];
const MOBILE_PLATFORMS = ['ios', 'android'];

export type RecommendationMode = 'popular' | 'hidden-gem';

interface Strategy {
  params: Record<string, string>;
  pages: { min: number; max: number };
  accepts: (game: Game) => boolean;
}

const STRATEGIES: Record<RecommendationMode, Strategy> = {
  'popular': {
    params: { metacritic: `${MIN_METACRITIC},100` },
    pages: { min: 1, max: Infinity },
    accepts: game =>
      game.rating >= POPULAR_MIN_RATING &&
      (game.ratings_count ?? 0) >= POPULAR_MIN_RATINGS_COUNT,
  },
  'hidden-gem': {
    params: {},
    pages: HIDDEN_GEM_PAGES,
    accepts: game =>
      game.rating >= HIDDEN_GEM_MIN_RATING &&
      (game.ratings_count ?? 0) >= HIDDEN_GEM_MIN_RATINGS_COUNT &&
      (game.metacritic ?? 0) < MIN_METACRITIC &&
      !game.tags?.some(tag => tag.slug === 'free-to-play'),
  },
};

type History = { has: (id: number) => boolean };

export class GameService {
  private apiKey: string;

  constructor() {
    if (!config.rawgApiKey) {
      throw new Error('RAWG_API_KEY is missing. Add it to your .env file or repository secrets.');
    }
    this.apiKey = config.rawgApiKey;
  }

  async getRandomGame(historyService?: History, mode: RecommendationMode = todaysMode()): Promise<Game | null> {
    console.log(`🎯 Mode: ${mode}`);
    const game = await this.findGame(STRATEGIES[mode], historyService);
    if (game || mode === 'popular') {
      return game;
    }

    console.log('No hidden gem found, falling back to a popular game...');
    return this.findGame(STRATEGIES['popular'], historyService);
  }

  private async findGame(strategy: Strategy, historyService?: History): Promise<Game | null> {
    const total = await this.listGames(strategy, 1, 1);
    const lastPage = Math.min(strategy.pages.max, Math.ceil(total.count / PAGE_SIZE));
    const firstPage = Math.min(strategy.pages.min, lastPage);

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const page = firstPage + Math.floor(Math.random() * (lastPage - firstPage + 1));
      const { results } = await this.listGames(strategy, page, PAGE_SIZE);

      const candidates = shuffle(results).filter(game => isSuitable(game) && strategy.accepts(game));
      for (const candidate of candidates) {
        if (historyService && historyService.has(candidate.id)) {
          console.log(`Skipping ${candidate.name} (already recommended)...`);
          continue;
        }

        const details = await this.getGameDetails(candidate.id);
        if (details && details.description_raw) {
          return details;
        }
        console.log(`Skipping ${candidate.name} due to missing description...`);
      }
      console.log(`No suitable game on page ${page} (attempt ${attempt}/${MAX_ATTEMPTS})...`);
    }

    return null;
  }

  private async listGames(strategy: Strategy, page: number, pageSize: number): Promise<{ count: number; results: Game[] }> {
    const today = new Date().toISOString().slice(0, 10);
    const response = await axios.get(`${RAWG_BASE_URL}/games`, {
      params: {
        key: this.apiKey,
        dates: `${RELEASED_AFTER},${today}`,
        ordering: '-added',
        exclude_additions: true,
        page_size: pageSize,
        page,
        ...strategy.params,
      }
    });
    return { count: response.data.count ?? 0, results: response.data.results ?? [] };
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

function todaysMode(): RecommendationMode {
  const override = config.recommendationMode;
  if (override === 'popular' || override === 'hidden-gem') {
    return override;
  }
  if (override) {
    throw new Error(`Unknown RECOMMENDATION_MODE "${override}", expected "popular" or "hidden-gem".`);
  }
  return HIDDEN_GEM_DAYS.includes(new Date().getUTCDay()) ? 'hidden-gem' : 'popular';
}

// Skips adult-only content, mobile-only games, games that can't be bought anywhere (freeware, delisted,
// fan translations) and entries without genres, which on RAWG are usually mods or incomplete data.
function isSuitable(game: Game): boolean {
  if (game.esrb_rating?.slug === 'adults-only') return false;
  if (game.tags?.some(tag => EXCLUDED_TAGS.includes(tag.slug))) return false;
  if (game.genres.length === 0) return false;
  if (!game.platforms?.some(p => !MOBILE_PLATFORMS.includes(p.platform.slug))) return false;
  return (game.stores?.length ?? 0) > 0;
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
