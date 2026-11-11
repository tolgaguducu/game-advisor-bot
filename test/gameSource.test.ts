import assert from 'node:assert/strict';
import { beforeEach, mock, test } from 'node:test';
import { FallbackGameSource, findWithModeFallback, GameSource, nameKey, Recommendation } from '../src/services/gameSource';
import { makeGame } from './fixtures';

beforeEach(() => {
  mock.restoreAll();
  for (const method of ['log', 'warn'] as const) {
    mock.method(console, method, () => {});
  }
});

const history = { has: () => false };

function source(name: string, result: Recommendation | null | Error): GameSource & { calls: number } {
  return {
    name,
    calls: 0,
    async getRandomGame() {
      this.calls++;
      if (result instanceof Error) throw result;
      return result;
    },
  };
}

const recommendation = (name: string): Recommendation => ({ game: makeGame({ name }), mode: 'popular', historyKeys: [] });

test('uses the first source that finds a game', async () => {
  const rawg = source('RAWG', recommendation('From RAWG'));
  const igdb = source('IGDB', recommendation('From IGDB'));

  const result = await new FallbackGameSource([rawg, igdb]).getRandomGame(history, 'popular');

  assert.equal(result?.game.name, 'From RAWG');
  assert.equal(igdb.calls, 0);
});

test('falls back to the next source when one fails or finds nothing', async () => {
  const igdb = source('IGDB', recommendation('From IGDB'));

  const afterError = await new FallbackGameSource([source('RAWG', new Error('HTTP 522')), igdb]).getRandomGame(history, 'popular');
  const afterEmpty = await new FallbackGameSource([source('RAWG', null), igdb]).getRandomGame(history, 'popular');

  assert.equal(afterError?.game.name, 'From IGDB');
  assert.equal(afterEmpty?.game.name, 'From IGDB');
});

test('throws the last error when every source fails, null when they just find nothing', async () => {
  const failing = new FallbackGameSource([source('RAWG', new Error('HTTP 522')), source('IGDB', new Error('HTTP 401'))]);
  const empty = new FallbackGameSource([source('RAWG', null), source('IGDB', null)]);

  await assert.rejects(failing.getRandomGame(history, 'popular'), /HTTP 401/);
  assert.equal(await empty.getRandomGame(history, 'popular'), null);
});

test('falls back to a popular game when no hidden gem is found', async () => {
  const found = await findWithModeFallback('hidden-gem', async mode => (mode === 'popular' ? makeGame() : null));
  assert.equal(found?.mode, 'popular');

  assert.equal(await findWithModeFallback('popular', async () => null), null);
});

test('normalizes names so the same game matches across sources', () => {
  assert.equal(nameKey('Celeste'), 'name:celeste');
  assert.equal(nameKey('DREDGE'), nameKey('Dredge'));
  assert.equal(nameKey("Assassin's Creed: Brotherhood"), nameKey('Assassins Creed Brotherhood'));
  assert.equal(nameKey('Pokémon Snap'), nameKey('Pokemon Snap'));
});
