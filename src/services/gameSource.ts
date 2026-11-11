import { Game } from '../types/game';
import { describeError } from '../utils/errors';

export const RECOMMENDATION_MODES = ['popular', 'hidden-gem'] as const;
export type RecommendationMode = typeof RECOMMENDATION_MODES[number];

export type HistoryKey = string | number;
export type History = { has: (key: HistoryKey) => boolean };

export interface Recommendation {
  game: Game;
  /** The mode the game was actually found with, which differs from the requested one after a fallback. */
  mode: RecommendationMode;
  /** Keys to record in the history, so neither this source nor another one recommends the game again. */
  historyKeys: HistoryKey[];
}

export interface GameSource {
  readonly name: string;
  /** Returns null when no suitable game is found; throws when the source is unavailable. */
  getRandomGame(history: History, mode: RecommendationMode): Promise<Recommendation | null>;
}

// Sources use different game IDs, so every recommendation is also recorded by name.
export function nameKey(name: string): string {
  return `name:${name.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g, '')}`;
}

// Tries the requested mode and falls back to a popular game when no hidden gem is found.
export async function findWithModeFallback(
  mode: RecommendationMode,
  find: (mode: RecommendationMode) => Promise<Game | null>,
): Promise<{ game: Game; mode: RecommendationMode } | null> {
  const game = await find(mode);
  if (game) {
    return { game, mode };
  }
  if (mode === 'popular') {
    return null;
  }

  console.log('No hidden gem found, falling back to a popular game...');
  const fallback = await find('popular');
  return fallback && { game: fallback, mode: 'popular' };
}

// Asks each source in order and moves on to the next one when a source fails or finds nothing.
export class FallbackGameSource implements GameSource {
  readonly name: string;

  constructor(private readonly sources: GameSource[]) {
    this.name = sources.map(source => source.name).join(' → ');
  }

  async getRandomGame(history: History, mode: RecommendationMode): Promise<Recommendation | null> {
    let lastError: unknown;
    for (const [index, source] of this.sources.entries()) {
      const next = index < this.sources.length - 1 ? `, trying ${this.sources[index + 1].name}` : '';
      try {
        const recommendation = await source.getRandomGame(history, mode);
        if (recommendation) {
          console.log(`📦 Source: ${source.name}`);
          return recommendation;
        }
        console.warn(`⚠️  ${source.name} found no suitable game${next}...`);
      } catch (error) {
        lastError = error;
        console.warn(`⚠️  ${source.name} failed: ${describeError(error)}${next}...`);
      }
    }
    if (lastError) {
      throw lastError;
    }
    return null;
  }
}

export function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
