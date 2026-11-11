import axios, { AxiosInstance } from 'axios';
import { IgdbCredentials } from '../config/env';
import { Company, Game } from '../types/game';
import { addRetries } from '../utils/retry';
import { isBlocked } from './gameService';
import { findWithModeFallback, GameSource, History, nameKey, Recommendation, RecommendationMode, shuffle } from './gameSource';

// IGDB (Twitch's game database), used when RAWG is unavailable. Same rules as RAWG, with thresholds
// tuned to IGDB's data: ratings are 0–100 and IGDB has fewer user ratings per game than RAWG.

const TOKEN_URL = 'https://id.twitch.tv/oauth2/token';
const API_URL = 'https://api.igdb.com/v4';
const IMAGE_URL = 'https://images.igdb.com/igdb/image/upload/t_1080p';

const RELEASED_AFTER = Date.UTC(2010, 0, 1) / 1000;
const BATCH_SIZE = 50;
const MAX_ATTEMPTS = 5;

// Main games, standalone expansions and remakes. Remasters and ports are left out: their ratings
// are counted separately, so famous games would look like hidden gems.
const GAME_TYPES = [0, 4, 8];
const EROTIC_THEME = 42;

const STRATEGIES: Record<RecommendationMode, string> = {
  // Critics (average of several outlets) and players both liked it.
  'popular': 'aggregated_rating >= 80 & aggregated_rating_count >= 3 & rating >= 70 & rating_count >= 50',
  // Players love it, critics rated it lower or not at all, and it is not among the most rated games.
  'hidden-gem': 'rating >= 80 & rating_count >= 20 & rating_count < 300 & (aggregated_rating < 80 | aggregated_rating = null)',
};

const EXCLUDED_KEYWORDS = ['sexual-content', 'nsfw', 'freeware', 'fangame'];
// A game only on these platforms is skipped: mobile and browser games are not what the account recommends.
const SECONDARY_PLATFORMS = ['ios', 'android', 'browser'];
// Store and retail links (IGDB external game sources and website types, lowercased). Fan games and
// freeware have none, so this is IGDB's counterpart to RAWG's "sold in a store" check.
const STORES = ['steam', 'gog', 'epic', 'epic games store', 'microsoft', 'xbox', 'playstation', 'playstation store us', 'nintendo', 'amazon'];

const FIELDS = [
  'name', 'slug', 'first_release_date', 'summary', 'rating', 'rating_count', 'aggregated_rating',
  'genres.slug', 'genres.name', 'themes.slug', 'keywords.slug', 'platforms.slug', 'platforms.name',
  'involved_companies.company.name', 'involved_companies.company.slug',
  'involved_companies.developer', 'involved_companies.publisher',
  'artworks.image_id', 'screenshots.image_id',
  'external_games.external_game_source.name', 'websites.type.type',
].join(',');

// IGDB slugs mapped to the RAWG slugs and names the rest of the bot (hashtags, platform order) uses.
const PLATFORMS: Record<string, { slug: string; name: string }> = {
  'win': { slug: 'pc', name: 'PC' },
  'ps5': { slug: 'playstation5', name: 'PlayStation 5' },
  'series-x-s': { slug: 'xbox-series-x', name: 'Xbox Series S/X' },
  'switch': { slug: 'nintendo-switch', name: 'Nintendo Switch' },
  'switch-2': { slug: 'nintendo-switch-2', name: 'Nintendo Switch 2' },
  'ps4--1': { slug: 'playstation4', name: 'PlayStation 4' },
  'xboxone': { slug: 'xbox-one', name: 'Xbox One' },
  'mac': { slug: 'macos', name: 'macOS' },
  'linux': { slug: 'linux', name: 'Linux' },
  'ios': { slug: 'ios', name: 'iOS' },
  'android': { slug: 'android', name: 'Android' },
  'ps3': { slug: 'playstation3', name: 'PlayStation 3' },
  'xbox360': { slug: 'xbox360', name: 'Xbox 360' },
  'wiiu': { slug: 'wii-u', name: 'Wii U' },
};

const GENRES: Record<string, string> = {
  'indie': 'indie',
  'role-playing-rpg': 'role-playing-games-rpg',
  'strategy': 'strategy',
  'real-time-strategy-rts': 'strategy',
  'turn-based-strategy-tbs': 'strategy',
  'tactical': 'strategy',
  'puzzle': 'puzzle',
  'platform': 'platformer',
  'shooter': 'shooter',
  'fighting': 'fighting',
  'racing': 'racing',
  'sport': 'sports',
  'simulator': 'simulation',
  'card-and-board-game': 'card',
  'adventure': 'adventure',
  'point-and-click': 'adventure',
  'hack-and-slash-beat-em-up': 'action',
  'arcade': 'arcade',
};

const TAGS: Record<string, string> = {
  'metroidvania': 'metroidvania',
  'souls-like': 'souls-like',
  'soulslike': 'souls-like',
  'roguelike': 'roguelike',
  'roguelite': 'roguelike',
  'deckbuilding': 'deckbuilding',
  'deck-building': 'deckbuilding',
  'deckbuilder': 'deckbuilding',
  'city-builder': 'city-builder',
  'city-building': 'city-builder',
  'visual-novel': 'visual-novel',
  'horror': 'horror',
  'cozy': 'cozy',
  'survival': 'survival',
  'open-world': 'open-world',
  'action': 'action',
};

interface Named { slug: string; name?: string }

export interface IgdbGame {
  id: number;
  name: string;
  slug: string;
  first_release_date?: number;
  summary?: string;
  rating?: number;
  rating_count?: number;
  aggregated_rating?: number;
  genres?: Required<Named>[];
  themes?: Named[];
  keywords?: Named[];
  platforms?: Required<Named>[];
  involved_companies?: { company: Required<Named>; developer: boolean; publisher: boolean }[];
  artworks?: { image_id: string }[];
  screenshots?: { image_id: string }[];
  external_games?: { external_game_source?: { name: string } }[];
  websites?: { type?: { type: string } }[];
}

export class IgdbService implements GameSource {
  readonly name = 'IGDB';
  private api?: AxiosInstance;

  constructor(private readonly credentials: IgdbCredentials, private readonly retryDelayMs?: number) {}

  async getRandomGame(history: History, mode: RecommendationMode): Promise<Recommendation | null> {
    const found = await findWithModeFallback(mode, mode => this.findGame(mode, history));
    return found && { ...found, historyKeys: [`igdb:${found.game.id}`, nameKey(found.game.name)] };
  }

  private async findGame(mode: RecommendationMode, history: History): Promise<Game | null> {
    const where = `${baseFilter()} & ${STRATEGIES[mode]}`;
    const api = await this.client();
    const { data: { count } } = await api.post<{ count: number }>('/games/count', `where ${where};`);

    for (let attempt = 1; attempt <= MAX_ATTEMPTS && count > 0; attempt++) {
      const offset = Math.floor(Math.random() * Math.max(count - BATCH_SIZE, 1));
      const { data } = await api.post<IgdbGame[]>(
        '/games',
        `fields ${FIELDS}; where ${where}; sort rating_count desc; limit ${BATCH_SIZE}; offset ${offset};`,
      );

      for (const igdbGame of shuffle(data)) {
        if (history.has(`igdb:${igdbGame.id}`) || history.has(nameKey(igdbGame.name))) {
          continue;
        }
        if (!isSuitableIgdbGame(igdbGame, mode)) {
          continue;
        }
        const game = toGame(igdbGame);
        if (isBlocked(game)) {
          console.log(`Skipping ${game.name} (blocked company)...`);
          continue;
        }
        return game;
      }
      console.log(`No suitable IGDB game at offset ${offset} (attempt ${attempt}/${MAX_ATTEMPTS})...`);
    }
    return null;
  }

  private async client(): Promise<AxiosInstance> {
    if (!this.api) {
      // The secret goes in the POST body, never in a URL that could end up in a log line.
      const { data } = await axios.post<{ access_token: string }>(TOKEN_URL, new URLSearchParams({
        client_id: this.credentials.clientId,
        client_secret: this.credentials.clientSecret,
        grant_type: 'client_credentials',
      }));
      this.api = addRetries(axios.create({
        baseURL: API_URL,
        headers: {
          'Client-ID': this.credentials.clientId,
          'Authorization': `Bearer ${data.access_token}`,
          'Content-Type': 'text/plain',
        },
      }), this.retryDelayMs);
    }
    return this.api;
  }
}

function baseFilter(): string {
  const now = Math.floor(Date.now() / 1000);
  return [
    `first_release_date >= ${RELEASED_AFTER}`,
    `first_release_date <= ${now}`,
    `game_type = (${GAME_TYPES.join(',')})`,
    `themes != (${EROTIC_THEME})`,
    'summary != null',
  ].join(' & ');
}

// Same rules as RAWG's isSuitable: no adult content, no mobile- or browser-only games, sold in at least
// one store (which leaves out fan games and freeware), no entries without genres. Hidden gems also skip
// free-to-play.
export function isSuitableIgdbGame(game: IgdbGame, mode: RecommendationMode): boolean {
  const keywords = new Set(game.keywords?.map(keyword => keyword.slug));
  if (EXCLUDED_KEYWORDS.some(keyword => keywords.has(keyword))) return false;
  if (mode === 'hidden-gem' && keywords.has('free-to-play')) return false;
  if (!game.genres?.length) return false;
  if (!game.platforms?.some(p => !SECONDARY_PLATFORMS.includes(p.slug))) return false;

  const links = [
    ...(game.external_games ?? []).map(e => e.external_game_source?.name),
    ...(game.websites ?? []).map(w => w.type?.type),
  ];
  return links.some(link => link && STORES.includes(link.toLowerCase()));
}

// Converts an IGDB game into the RAWG-shaped Game the rest of the bot works with.
export function toGame(game: IgdbGame): Game {
  const companies = game.involved_companies ?? [];
  const company = ({ company }: { company: Required<Named> }, id: number): Company => ({ id, name: company.name, slug: company.slug });
  const imageId = game.artworks?.[0]?.image_id ?? game.screenshots?.[0]?.image_id;

  const genres = (game.genres ?? [])
    .filter(genre => GENRES[genre.slug])
    .map((genre, id) => ({ id, name: genre.name, slug: GENRES[genre.slug] }));
  const tags = [...(game.genres ?? []), ...(game.themes ?? []), ...(game.keywords ?? [])]
    .filter(tag => TAGS[tag.slug])
    .map((tag, id) => ({ id, name: tag.slug, slug: TAGS[tag.slug] }));

  return {
    id: game.id,
    name: game.name,
    slug: game.slug,
    released: game.first_release_date ? new Date(game.first_release_date * 1000).toISOString().slice(0, 10) : '',
    background_image: imageId ? `${IMAGE_URL}/${imageId}.jpg` : null,
    rating: Math.round((game.rating ?? 0) / 2) / 10,
    ratings_count: game.rating_count,
    critic_score: game.aggregated_rating ? Math.round(game.aggregated_rating) : undefined,
    description_raw: game.summary,
    genres,
    tags,
    platforms: (game.platforms ?? []).map((platform, id) => ({
      platform: { id, ...(PLATFORMS[platform.slug] ?? { slug: platform.slug, name: platform.name }) },
    })),
    developers: companies.filter(c => c.developer).map(company),
    publishers: companies.filter(c => c.publisher).map(company),
  };
}
