import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatPost, resizedImageUrl } from '../src/post';
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
  assert.deepEqual(post.image, { url: 'https://media.rawg.io/media/resize/1280/-/games/celeste.jpg', alt: 'Artwork from Celeste' });
});

test('drops details from the end until the post fits', () => {
  const long = 'Extremely Long Name Studios '.repeat(3).trim();
  const platforms = ['PlayStation 5', 'Xbox Series S/X', 'Nintendo Switch'].map((name, id) => ({
    platform: { id, name, slug: name.toLowerCase() },
  }));
  const post = formatPost(makeGame({
    name: 'A Game With A Really Quite Long Title: The Definitive Remastered Edition',
    developers: [{ id: 1, name: long, slug: 'long' }],
    platforms,
  }));

  assert.ok([...new Intl.Segmenter().segment(post.text)].length <= 270);
  assert.doesNotMatch(post.text, /Platforms:/);
  assert.match(post.text, /📅 Released: 2018-01-25\n/);
  assert.match(post.text, /#GameRecommendation #Gaming #OyunumaDokunma$/);
});

test('uses a resized copy of RAWG images', () => {
  assert.equal(
    resizedImageUrl('https://media.rawg.io/media/screenshots/ff1/shot.jpg'),
    'https://media.rawg.io/media/resize/1280/-/screenshots/ff1/shot.jpg',
  );
  assert.equal(
    resizedImageUrl('https://media.rawg.io/media/resize/640/-/games/a.jpg'),
    'https://media.rawg.io/media/resize/640/-/games/a.jpg',
  );
  assert.equal(resizedImageUrl('https://example.com/a.jpg'), 'https://example.com/a.jpg');
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
