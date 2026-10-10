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

function setup(publisher?: Publisher, game: Game | null = makeGame({ id: 42 })) {
  const added: number[] = [];
  const options: BotOptions = {
    gameService: { getRandomGame: async () => game && { game, mode: 'popular' } },
    history: { has: () => false, add: id => { added.push(id); } },
    publisher,
    mode: 'popular',
  };
  return { options, added };
}

function publisher(fails = false): Publisher & { posts: string[] } {
  const posts: string[] = [];
  return {
    name: 'X',
    posts,
    async publish(post) {
      if (fails) throw new Error('X is down');
      posts.push(post.text);
    },
  };
}

test('posts the game and records it', async () => {
  const x = publisher();
  const { options, added } = setup(x);

  await runBot(options);

  assert.equal(x.posts.length, 1);
  assert.match(x.posts[0], /Game of the Day: Celeste/);
  assert.deepEqual(added, [42]);
});

test('fails without recording the game when posting fails', async () => {
  const { options, added } = setup(publisher(true));

  await assert.rejects(runBot(options), /X is down/);
  assert.deepEqual(added, []);
});

test('dry run leaves the history untouched', async () => {
  const { options, added } = setup(undefined);

  await runBot(options);

  assert.deepEqual(added, []);
});

test('fails when no game is found', async () => {
  const x = publisher();
  const { options } = setup(x, null);

  await assert.rejects(runBot(options), /Failed to find a game/);
  assert.equal(x.posts.length, 0);
});
