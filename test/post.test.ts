import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatPost } from '../src/post';
import { makeGame } from './fixtures';

test('formats all available game details', () => {
  const post = formatPost(makeGame());

  assert.equal(post.text, [
    '🎮 Daily Game Recommendation: Celeste',
    '',
    '📅 Released: 2018-01-25',
    '⭐️ Metacritic: 91',
    '⏱️ Playtime: 8 hours',
    '👨‍💻 Dev: Maddy Makes Games',
    '🕹️ Platforms: PC, Nintendo Switch',
    '',
    '#GameRecommendation #Gaming #OyunumaDokunma',
  ].join('\n'));
  assert.deepEqual(post.image, { url: 'https://media.rawg.io/media/games/celeste.jpg', alt: 'Artwork from Celeste' });
});

test('omits missing details and the image', () => {
  const post = formatPost(makeGame({ metacritic: undefined, playtime: 0, developers: [], background_image: null }));

  assert.doesNotMatch(post.text, /Metacritic|Playtime|Dev:/);
  assert.match(post.text, /📅 Released: 2018-01-25\n🕹️ Platforms: PC, Nintendo Switch\n\n#GameRecommendation/);
  assert.equal(post.image, undefined);
});

test('lists at most three platforms', () => {
  const platforms = ['PC', 'PlayStation 5', 'Xbox Series S/X', 'Nintendo Switch'].map((name, id) => ({
    platform: { id, name, slug: name.toLowerCase() },
  }));

  assert.match(formatPost(makeGame({ platforms })).text, /Platforms: PC, PlayStation 5, Xbox Series S\/X\n/);
});
