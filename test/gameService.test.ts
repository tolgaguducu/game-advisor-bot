import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isBlocked, isSuitable, modeForDate } from '../src/services/gameService';
import { makeGame } from './fixtures';

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
