import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatPost, resizedImageUrl } from '../src/post';
import { makeGame } from './fixtures';

const tag = (slug: string) => ({ id: 0, name: slug, slug });
const genre = (slug: string) => ({ id: 0, name: slug, slug });

test('formats a popular pick', () => {
  const post = formatPost(makeGame(), 'popular');

  assert.equal(post.text, [
    '🎮 Game of the Day: Celeste (2018)',
    '',
    '⭐️ Metacritic 91 · ⏱️ 8 hours',
    '👨‍💻 Maddy Makes Games',
    '🕹️ PC, Nintendo Switch',
    '',
    '#Platformer #OyunumaDokunma',
  ].join('\n'));
  assert.deepEqual(post.image, { url: 'https://media.rawg.io/media/resize/1280/-/games/celeste.jpg', alt: 'Artwork from Celeste' });
});

test('labels hidden gems', () => {
  assert.match(formatPost(makeGame(), 'hidden-gem').text, /^💎 Hidden Gem: Celeste \(2018\)\n/);
});

test('omits missing details and the image', () => {
  const post = formatPost(makeGame({ metacritic: undefined, playtime: 0, developers: [], background_image: null }), 'popular');

  assert.equal(post.text, '🎮 Game of the Day: Celeste (2018)\n\n🕹️ PC, Nintendo Switch\n\n#Platformer #OyunumaDokunma');
  assert.equal(post.image, undefined);
});

test('picks specific tags first, then genres, at most two', () => {
  const game = makeGame({
    genres: [genre('action'), genre('indie'), genre('platformer')],
    tags: [tag('singleplayer'), tag('metroidvania')],
  });

  assert.match(formatPost(game, 'popular').text, /\n#Metroidvania #IndieGame #OyunumaDokunma$/);
});

test('uses only the brand hashtag when nothing matches', () => {
  const game = makeGame({ genres: [genre('casual')], tags: [] });

  assert.match(formatPost(game, 'popular').text, /\n\n#OyunumaDokunma$/);
});

test('prefers the studio over a publisher listed as developer', () => {
  const company = (name: string) => ({ id: 0, name, slug: name.toLowerCase().replace(/ /g, '-') });
  const game = makeGame({
    developers: [company('Devolver Digital'), company('Moppin')],
    publishers: [company('Devolver Digital')],
  });

  assert.match(formatPost(game, 'popular').text, /👨‍💻 Moppin\n/);
  assert.match(formatPost(makeGame({ developers: [company('Valve')], publishers: [company('Valve')] }), 'popular').text, /👨‍💻 Valve\n/);
});

test('lists the three most relevant platforms', () => {
  const platforms = [
    ['macOS', 'macos'], ['Xbox One', 'xbox-one'], ['PC', 'pc'], ['Wii U', 'wii-u'], ['Nintendo Switch', 'nintendo-switch'],
  ].map(([name, slug], id) => ({ platform: { id, name, slug } }));

  assert.match(formatPost(makeGame({ platforms }), 'popular').text, /🕹️ PC, Nintendo Switch, Xbox One\n/);
});

test('drops details from the end until the post fits', () => {
  const long = 'Extremely Long Name Studios '.repeat(4).trim();
  const platforms = ['PlayStation 5', 'Xbox Series S/X', 'Nintendo Switch'].map((name, id) => ({
    platform: { id, name, slug: name.toLowerCase() },
  }));
  const post = formatPost(makeGame({
    name: 'A Game With A Really Quite Long Title: The Definitive Remastered Edition of the Year',
    developers: [{ id: 1, name: long, slug: 'long' }],
    platforms,
  }), 'popular');

  assert.ok([...new Intl.Segmenter().segment(post.text)].length <= 270);
  assert.doesNotMatch(post.text, /🕹️/);
  assert.match(post.text, /⭐️ Metacritic 91/);
  assert.match(post.text, /#OyunumaDokunma$/);
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
