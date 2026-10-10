import assert from 'node:assert/strict';
import { beforeEach, mock, test } from 'node:test';
import { BotOptions, runBot } from '../src/bot';
import { Publisher } from '../src/publishers/publisher';
import { Game } from '../src/types/game';
import { makeGame } from './fixtures';

beforeEach(() => {
  mock.restoreAll();
  for (const method of ['log', 'warn', 'error'] as const) {
    mock.method(console, method, () => {});
  }
});

function setup(publishers: Publisher[], game: Game | null = makeGame({ id: 42 })) {
  const added: number[] = [];
  const options: BotOptions = {
    gameService: { getRandomGame: async () => game },
    history: { has: () => false, add: id => { added.push(id); } },
    publishers,
    mode: 'popular',
  };
  return { options, added };
}

function publisher(name: string, fails = false): Publisher & { posts: string[] } {
  const posts: string[] = [];
  return {
    name,
    posts,
    async publish(post) {
      if (fails) throw new Error(`${name} is down`);
      posts.push(post.text);
    },
  };
}

test('posts to every publisher and records the game', async () => {
  const x = publisher('X');
  const bluesky = publisher('Bluesky');
  const { options, added } = setup([x, bluesky]);

  await runBot(options);

  assert.equal(x.posts.length, 1);
  assert.equal(bluesky.posts.length, 1);
  assert.deepEqual(added, [42]);
});

test('fails without recording the game when posting fails everywhere', async () => {
  const { options, added } = setup([publisher('X', true)]);

  await assert.rejects(runBot(options), /Posting failed on: X/);
  assert.deepEqual(added, []);
});

test('records the game but still fails when only some publishers fail', async () => {
  const bluesky = publisher('Bluesky');
  const { options, added } = setup([publisher('X', true), bluesky]);

  await assert.rejects(runBot(options), /Posting failed on: X$/);
  assert.equal(bluesky.posts.length, 1);
  assert.deepEqual(added, [42]);
});

test('dry run leaves the history untouched', async () => {
  const { options, added } = setup([]);

  await runBot(options);

  assert.deepEqual(added, []);
});

test('fails when no game is found', async () => {
  const x = publisher('X');
  const { options } = setup([x], null);

  await assert.rejects(runBot(options), /Failed to find a game/);
  assert.equal(x.posts.length, 0);
});
