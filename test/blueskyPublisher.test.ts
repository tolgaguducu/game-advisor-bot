import assert from 'node:assert/strict';
import { beforeEach, mock, test } from 'node:test';
import axios from 'axios';
import { BlueskyPublisher } from '../src/publishers/blueskyPublisher';
import { Post } from '../src/post';

beforeEach(() => {
  mock.restoreAll();
  for (const method of ['log', 'warn', 'error'] as const) {
    mock.method(console, method, () => {});
  }
});

const post: Post = {
  text: '🎮 Daily Game Recommendation: Celeste\n\n#GameRecommendation #Gaming',
  image: { url: 'https://media.rawg.io/media/resize/1280/-/games/celeste.jpg', alt: 'Artwork from Celeste' },
};

function fakeAgent() {
  const calls = { login: [] as unknown[], uploadBlob: [] as unknown[], post: [] as any[] };
  const agent = {
    login: async (opts: unknown) => { calls.login.push(opts); return {} as any; },
    uploadBlob: async (data: unknown, opts: unknown) => { calls.uploadBlob.push({ data, opts }); return { data: { blob: 'BLOB' } } as any; },
    post: async (record: unknown) => { calls.post.push(record); return {} as any; },
  };
  return { agent, calls };
}

function mockImage(bytes: number) {
  mock.method(axios, 'get', async () => ({ data: new ArrayBuffer(bytes), headers: { 'content-type': 'image/jpeg' } }));
}

test('logs in with the app password and posts text, hashtags and image', async () => {
  mockImage(1000);
  const { agent, calls } = fakeAgent();

  await new BlueskyPublisher({ identifier: 'bot.bsky.social', appPassword: 'app-pass' }, agent).publish(post);

  assert.deepEqual(calls.login, [{ identifier: 'bot.bsky.social', password: 'app-pass' }]);
  assert.deepEqual(calls.uploadBlob.map((c: any) => c.opts), [{ encoding: 'image/jpeg' }]);

  const [record] = calls.post;
  assert.equal(record.text, post.text);
  assert.deepEqual(record.facets.map((f: any) => f.features[0].tag), ['GameRecommendation', 'Gaming']);
  assert.deepEqual(record.embed, {
    $type: 'app.bsky.embed.images',
    images: [{ image: 'BLOB', alt: 'Artwork from Celeste' }],
  });
});

test('posts text only when the image is too large', async () => {
  mockImage(2_000_001);
  const { agent, calls } = fakeAgent();

  await new BlueskyPublisher({ identifier: 'bot', appPassword: 'pw' }, agent).publish(post);

  assert.equal(calls.uploadBlob.length, 0);
  assert.equal(calls.post[0].embed, undefined);
});

test('fails when login fails', async () => {
  const { agent, calls } = fakeAgent();
  agent.login = async () => { throw new Error('Invalid identifier or password'); };

  await assert.rejects(
    new BlueskyPublisher({ identifier: 'bot', appPassword: 'wrong' }, agent).publish(post),
    /Invalid identifier or password/,
  );
  assert.equal(calls.post.length, 0);
});
