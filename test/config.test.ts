import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadConfig } from '../src/config/env';

const twitterEnv = {
  TWITTER_API_KEY: 'key',
  TWITTER_API_SECRET: 'secret',
  TWITTER_ACCESS_TOKEN: 'token',
  TWITTER_ACCESS_SECRET: 'token-secret',
};

test('requires a RAWG API key', () => {
  assert.throws(() => loadConfig({}), /RAWG_API_KEY is missing/);
});

test('leaves X disabled when none of its variables are set', () => {
  assert.equal(loadConfig({ RAWG_API_KEY: 'rawg' }).twitter, undefined);
});

test('reads X credentials', () => {
  assert.deepEqual(loadConfig({ RAWG_API_KEY: 'rawg', ...twitterEnv }).twitter, {
    appKey: 'key',
    appSecret: 'secret',
    accessToken: 'token',
    accessSecret: 'token-secret',
  });
});

test('fails when X credentials are only partially set', () => {
  assert.throws(
    () => loadConfig({ RAWG_API_KEY: 'rawg', ...twitterEnv, TWITTER_ACCESS_SECRET: '' }),
    /Missing TWITTER_ACCESS_SECRET/,
  );
});

test('validates RECOMMENDATION_MODE', () => {
  assert.equal(loadConfig({ RAWG_API_KEY: 'rawg', RECOMMENDATION_MODE: 'hidden-gem' }).recommendationMode, 'hidden-gem');
  assert.throws(() => loadConfig({ RAWG_API_KEY: 'rawg', RECOMMENDATION_MODE: 'foo' }), /Unknown RECOMMENDATION_MODE/);
});
