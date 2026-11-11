import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatPost } from '../src/post';
import { isBlocked } from '../src/services/gameService';
import { IgdbGame, isSuitableIgdbGame, toGame } from '../src/services/igdbService';

const slug = (slug: string, name = slug) => ({ slug, name });

function makeIgdbGame(overrides: Partial<IgdbGame> = {}): IgdbGame {
  return {
    id: 1,
    name: 'Hollow Knight',
    slug: 'hollow-knight',
    first_release_date: Date.UTC(2017, 1, 24) / 1000,
    summary: 'Forge your own path in Hollow Knight!',
    rating: 92.3,
    rating_count: 2275,
    aggregated_rating: 90.6,
    genres: [slug('platform', 'Platform'), slug('adventure', 'Adventure'), slug('indie', 'Indie')],
    themes: [slug('action'), slug('fantasy')],
    keywords: [slug('2d'), slug('metroidvania')],
    platforms: [slug('mac', 'Mac'), slug('switch', 'Nintendo Switch'), slug('win', 'PC (Microsoft Windows)'), slug('wiiu', 'Wii U')],
    involved_companies: [
      { company: slug('team-cherry', 'Team Cherry'), developer: true, publisher: true },
      { company: slug('fangamer', 'Fangamer'), developer: false, publisher: true },
    ],
    artworks: [{ image_id: 'ar1' }],
    screenshots: [{ image_id: 'sc1' }],
    external_games: [{ external_game_source: { name: 'Twitch' } }, { external_game_source: { name: 'Steam' } }],
    websites: [{ type: { type: 'Official Website' } }],
    ...overrides,
  };
}

test('converts an IGDB game into the format the bot posts', () => {
  const game = toGame(makeIgdbGame());

  assert.equal(game.released, '2017-02-24');
  assert.equal(game.rating, 4.6);
  assert.equal(game.critic_score, 91);
  assert.equal(game.metacritic, undefined);
  assert.equal(game.background_image, 'https://images.igdb.com/igdb/image/upload/t_1080p/ar1.jpg');
  assert.deepEqual(game.developers?.map(d => d.name), ['Team Cherry']);
  assert.deepEqual(game.publishers?.map(p => p.name), ['Team Cherry', 'Fangamer']);

  assert.equal(formatPost(game, 'popular').text, [
    '🎮 Game of the Day: Hollow Knight (2017)',
    '',
    '⭐️ Critics 91',
    '👨‍💻 Team Cherry',
    '🕹️ PC, Nintendo Switch, macOS',
    '',
    '#Metroidvania #IndieGame #OyunumaDokunma',
  ].join('\n'));
});

test('falls back to a screenshot and leaves the image out when there is none', () => {
  assert.match(toGame(makeIgdbGame({ artworks: undefined })).background_image ?? '', /sc1\.jpg$/);
  assert.equal(toGame(makeIgdbGame({ artworks: undefined, screenshots: undefined })).background_image, null);
});

test('blocks Paradox games found on IGDB', () => {
  const hoi4 = toGame(makeIgdbGame({
    involved_companies: [
      { company: slug('paradox-interactive', 'Paradox Interactive'), developer: false, publisher: true },
      { company: slug('paradox-development-studio', 'Paradox Development Studio'), developer: true, publisher: false },
    ],
  }));

  assert.equal(isBlocked(hoi4), true);
  assert.equal(isBlocked(toGame(makeIgdbGame())), false);
});

test('requires a store or retail link, like RAWG\'s store check', () => {
  const fanGame = makeIgdbGame({
    external_games: [{ external_game_source: { name: 'Twitch' } }],
    websites: [{ type: { type: 'GameJolt' } }, { type: { type: 'Wikipedia' } }],
  });
  const consoleOnly = makeIgdbGame({ external_games: [], websites: [{ type: { type: 'Nintendo' } }] });

  assert.equal(isSuitableIgdbGame(fanGame, 'popular'), false);
  assert.equal(isSuitableIgdbGame(consoleOnly, 'popular'), true);
  assert.equal(isSuitableIgdbGame(makeIgdbGame(), 'popular'), true);
});

test('applies the same suitability rules as RAWG', () => {
  assert.equal(isSuitableIgdbGame(makeIgdbGame(), 'popular'), true);
  assert.equal(isSuitableIgdbGame(makeIgdbGame({ keywords: [slug('sexual-content')] }), 'popular'), false);
  assert.equal(isSuitableIgdbGame(makeIgdbGame({ keywords: [slug('fangame')] }), 'popular'), false);
  assert.equal(isSuitableIgdbGame(makeIgdbGame({ platforms: [slug('ios', 'iOS'), slug('android', 'Android')] }), 'popular'), false);
  assert.equal(isSuitableIgdbGame(makeIgdbGame({ genres: [] }), 'popular'), false);

  assert.equal(isSuitableIgdbGame(makeIgdbGame({ platforms: [slug('browser', 'Web browser')] }), 'popular'), false);

  const freeToPlay = makeIgdbGame({ keywords: [slug('free-to-play')] });
  assert.equal(isSuitableIgdbGame(freeToPlay, 'popular'), true);
  assert.equal(isSuitableIgdbGame(freeToPlay, 'hidden-gem'), false);
});
