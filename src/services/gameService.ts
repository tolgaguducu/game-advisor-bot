import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { Game } from '../types/game';
import { describeError } from '../utils/errors';

const RAWG_BASE_URL = 'https://api.rawg.io/api';
const RELEASED_AFTER = '2010-01-01';
const PAGE_SIZE = 40;
const MAX_ATTEMPTS = 8;

// RAWG sits behind Cloudflare and sometimes answers 5xx for a minute or so. Retrying is better than a failed day.
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 20_000; // multiplied by the retry number: 20s, 40s, 60s

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

// RAWG slugs of companies whose games (developed or published) are never recommended.
// Exact slugs, since unrelated studios share names (e.g. "Paradox Entertainment" is a different company).
const BLOCKED_COMPANIES = [
  // Paradox Interactive, its publishing label and its studios (boycott since September 2026)
  'paradox-interactive',
  'paradox-arc',
  'paradox-development-studio',
  'paradox-developement-studios',
  'paradox-tinto',
  'paradox-arctic',
  'paradox-north',
  'paradox-north-ab',
];

export const RECOMMENDATION_MODES = ['popular', 'hidden-gem'] as const;
export type RecommendationMode = typeof RECOMMENDATION_MODES[number];

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

export interface Recommendation {
  game: Game;
  /** The mode the game was actually found with, which differs from the requested one after a fallback. */
  mode: RecommendationMode;
}

export class GameService {
  private readonly rawg: AxiosInstance;

  constructor(apiKey: string, private readonly retryDelayMs = RETRY_DELAY_MS) {
    this.rawg = axios.create({ baseURL: RAWG_BASE_URL, params: { key: apiKey } });
    this.rawg.interceptors.response.use(undefined, error => this.retry(error));
  }

  private async retry(error: unknown) {
    if (!axios.isAxiosError(error) || !error.config) {
      throw error;
    }
    const status = error.response?.status;
    const retryable = status === undefined || status === 429 || status >= 500;
    const config: InternalAxiosRequestConfig & { retryCount?: number } = error.config;
    const retry = (config.retryCount ?? 0) + 1;
    if (!retryable || retry > MAX_RETRIES) {
      throw error;
    }

    config.retryCount = retry;
    const delay = this.retryDelayMs * retry;
    console.warn(`⚠️  ${describeError(error)}, retrying in ${delay / 1000}s (${retry}/${MAX_RETRIES})...`);
    await new Promise(resolve => setTimeout(resolve, delay));
    return this.rawg.request(config);
  }

  async getRandomGame(history: History, mode: RecommendationMode): Promise<Recommendation | null> {
    const game = await this.findGame(STRATEGIES[mode], history);
    if (game) {
      return { game, mode };
    }
    if (mode === 'popular') {
      return null;
    }

    console.log('No hidden gem found, falling back to a popular game...');
    const fallback = await this.findGame(STRATEGIES['popular'], history);
    return fallback && { game: fallback, mode: 'popular' };
  }

  private async findGame(strategy: Strategy, history: History): Promise<Game | null> {
    const { count } = await this.listGames(strategy, 1, 1);
    const lastPage = Math.min(strategy.pages.max, Math.ceil(count / PAGE_SIZE));
    const firstPage = Math.min(strategy.pages.min, lastPage);

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const page = firstPage + Math.floor(Math.random() * (lastPage - firstPage + 1));
      const { results } = await this.listGames(strategy, page, PAGE_SIZE);

      const candidates = shuffle(results).filter(game => isSuitable(game) && strategy.accepts(game));
      for (const candidate of candidates) {
        if (history.has(candidate.id)) {
          console.log(`Skipping ${candidate.name} (already recommended)...`);
          continue;
        }

        // Developers and publishers are only part of the details response.
        const details = await this.getGameDetails(candidate.id);
        if (!details?.description_raw) {
          console.log(`Skipping ${candidate.name} due to missing description...`);
        } else if (isBlocked(details)) {
          console.log(`Skipping ${candidate.name} (blocked company)...`);
        } else {
          return details;
        }
      }
      console.log(`No suitable game on page ${page} (attempt ${attempt}/${MAX_ATTEMPTS})...`);
    }

    return null;
  }

  private async listGames(strategy: Strategy, page: number, pageSize: number): Promise<{ count: number; results: Game[] }> {
    const today = new Date().toISOString().slice(0, 10);
    const response = await this.rawg.get('/games', {
      params: {
        dates: `${RELEASED_AFTER},${today}`,
        ordering: '-added',
        exclude_additions: true,
        page_size: pageSize,
        page,
        ...strategy.params,
      },
    });
    return { count: response.data.count ?? 0, results: response.data.results ?? [] };
  }

  private async getGameDetails(id: number): Promise<Game | null> {
    try {
      const response = await this.rawg.get<Game>(`/games/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching details for game ${id}: ${describeError(error)}`);
      return null;
    }
  }
}

export function modeForDate(date: Date): RecommendationMode {
  return HIDDEN_GEM_DAYS.includes(date.getUTCDay()) ? 'hidden-gem' : 'popular';
}

// Skips adult-only content, mobile-only games, games that can't be bought anywhere (freeware, delisted,
// fan translations) and entries without genres, which on RAWG are usually mods or incomplete data.
export function isSuitable(game: Game): boolean {
  if (game.esrb_rating?.slug === 'adults-only') return false;
  if (game.tags?.some(tag => EXCLUDED_TAGS.includes(tag.slug))) return false;
  if (game.genres.length === 0) return false;
  if (!game.platforms?.some(p => !MOBILE_PLATFORMS.includes(p.platform.slug))) return false;
  return (game.stores?.length ?? 0) > 0;
}

export function isBlocked(game: Game): boolean {
  return [...(game.developers ?? []), ...(game.publishers ?? [])].some(company => BLOCKED_COMPANIES.includes(company.slug));
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
