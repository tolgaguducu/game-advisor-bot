import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadConfig } from '../src/config/env';

const rawgEnv = { RAWG_API_KEY: 'rawg' };
const twitterEnv = {
  TWITTER_API_KEY: 'key',
  TWITTER_API_SECRET: 'secret',
  TWITTER_ACCESS_TOKEN: 'token',
  TWITTER_ACCESS_SECRET: 'token-secret',
};

test('requires a known platform', () => {
  assert.throws(() => loadConfig(undefined, rawgEnv), /Usage: npm start -- <platform>/);
  assert.throws(() => loadConfig('myspace', rawgEnv), /Usage: npm start -- <platform>/);
});

test('requires a RAWG API key', () => {
  assert.throws(() => loadConfig('x', {}), /RAWG_API_KEY is missing/);
});

test('leaves X unconfigured when none of its variables are set', () => {
  assert.equal(loadConfig('x', rawgEnv).twitter, undefined);
});

test('reads X credentials', () => {
  assert.deepEqual(loadConfig('x', { ...rawgEnv, ...twitterEnv }).twitter, {
    appKey: 'key',
    appSecret: 'secret',
    accessToken: 'token',
    accessSecret: 'token-secret',
  });
});

test('fails when X credentials are only partially set', () => {
  assert.throws(
    () => loadConfig('x', { ...rawgEnv, ...twitterEnv, TWITTER_ACCESS_SECRET: '' }),
    /Missing TWITTER_ACCESS_SECRET/,
  );
});

test('reads only the selected platform credentials', () => {
  const env = { ...rawgEnv, ...twitterEnv, BLUESKY_IDENTIFIER: 'bot.bsky.social', BLUESKY_APP_PASSWORD: 'app-pass' };

  const bluesky = loadConfig('bluesky', env);
  assert.deepEqual(bluesky.bluesky, { identifier: 'bot.bsky.social', appPassword: 'app-pass' });
  assert.equal(bluesky.twitter, undefined);

  assert.equal(loadConfig('x', env).bluesky, undefined);
});

test('a broken config for one platform does not affect the other', () => {
  const env = { ...rawgEnv, ...twitterEnv, BLUESKY_IDENTIFIER: 'bot.bsky.social' };

  assert.throws(() => loadConfig('bluesky', env), /Missing BLUESKY_APP_PASSWORD/);
  assert.ok(loadConfig('x', env).twitter);
});

test('validates RECOMMENDATION_MODE', () => {
  assert.equal(loadConfig('x', { ...rawgEnv, RECOMMENDATION_MODE: 'hidden-gem' }).recommendationMode, 'hidden-gem');
  assert.throws(() => loadConfig('x', { ...rawgEnv, RECOMMENDATION_MODE: 'foo' }), /Unknown RECOMMENDATION_MODE/);
});
