import assert from 'node:assert/strict';
import { mock, test } from 'node:test';
import { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { GameService, isBlocked, isSuitable, modeForDate } from '../src/services/gameService';
import { makeGame } from './fixtures';

// Answers RAWG requests with the given statuses in order; 200 returns { ok: true }.
function rawgReturning(statuses: number[]) {
  const service = new GameService('KEY', 0);
  const rawg = (service as unknown as { rawg: AxiosInstance }).rawg;
  let calls = 0;
  rawg.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    const status = statuses[Math.min(calls++, statuses.length - 1)];
    const response = { status, statusText: '', headers: {}, config, data: { ok: true } };
    if (status !== 200) {
      throw new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_RESPONSE', config, undefined, response);
    }
    return response;
  };
  return { rawg, calls: () => calls };
}

test('retries RAWG server errors', async () => {
  mock.method(console, 'warn', () => {});
  const { rawg, calls } = rawgReturning([502, 503, 200]);

  const response = await rawg.get('/games');

  assert.deepEqual(response.data, { ok: true });
  assert.equal(calls(), 3);
});

test('gives up after three retries', async () => {
  mock.method(console, 'warn', () => {});
  const { rawg, calls } = rawgReturning([502]);

  await assert.rejects(rawg.get('/games'), (error: AxiosError) => error.response?.status === 502);
  assert.equal(calls(), 4);
});

test('does not retry client errors', async () => {
  const { rawg, calls } = rawgReturning([404]);

  await assert.rejects(rawg.get('/games/1'));
  assert.equal(calls(), 1);
});

test('picks hidden gems on Wednesdays and Saturdays (UTC)', () => {
  assert.equal(modeForDate(new Date('2026-10-05T09:00:00Z')), 'popular'); // Monday
  assert.equal(modeForDate(new Date('2026-10-07T09:00:00Z')), 'hidden-gem'); // Wednesday
  assert.equal(modeForDate(new Date('2026-10-10T09:00:00Z')), 'hidden-gem'); // Saturday
  assert.equal(modeForDate(new Date('2026-10-11T09:00:00Z')), 'popular'); // Sunday
});

test('accepts a regular game', () => {
  assert.equal(isSuitable(makeGame()), true);
});

test('rejects adult content', () => {
  assert.equal(isSuitable(makeGame({ esrb_rating: { slug: 'adults-only' } })), false);
  assert.equal(isSuitable(makeGame({ tags: [{ id: 1, name: 'Sexual Content', slug: 'sexual-content' }] })), false);
});

test('rejects mobile-only games but keeps games that are also on other platforms', () => {
  const ios = { platform: { id: 1, name: 'iOS', slug: 'ios' } };
  const android = { platform: { id: 2, name: 'Android', slug: 'android' } };
  const pc = { platform: { id: 3, name: 'PC', slug: 'pc' } };

  assert.equal(isSuitable(makeGame({ platforms: [ios, android] })), false);
  assert.equal(isSuitable(makeGame({ platforms: [ios, pc] })), true);
});

test('blocks games developed or published by blocked companies', () => {
  const company = (slug: string) => ({ id: 0, name: slug, slug });

  assert.equal(isBlocked(makeGame({ developers: [company('paradox-development-studio')] })), true);
  assert.equal(isBlocked(makeGame({ developers: [company('colossal-order')], publishers: [company('paradox-interactive')] })), true);
  assert.equal(isBlocked(makeGame({ developers: [company('paradox-entertainment')], publishers: [company('funcom')] })), false);
  assert.equal(isBlocked(makeGame()), false);
});

test('rejects games without stores or genres', () => {
  assert.equal(isSuitable(makeGame({ stores: [] })), false);
  assert.equal(isSuitable(makeGame({ genres: [] })), false);
});
