import { RECOMMENDATION_MODES, RecommendationMode } from '../services/gameService';

export const PLATFORMS = ['x', 'bluesky'] as const;
export type Platform = typeof PLATFORMS[number];

export interface TwitterCredentials {
  appKey: string;
  appSecret: string;
  accessToken: string;
  accessSecret: string;
}

export interface BlueskyCredentials {
  /** Handle (e.g. name.bsky.social) or email */
  identifier: string;
  /** App password from Settings → Privacy and Security → App Passwords, not the account password */
  appPassword: string;
}

export interface Config {
  platform: Platform;
  rawgApiKey: string;
  /** Forces a mode instead of picking one based on the day. */
  recommendationMode?: RecommendationMode;
  /** Only read for the selected platform. Undefined when not configured, which means dry run. */
  twitter?: TwitterCredentials;
  bluesky?: BlueskyCredentials;
}

type Env = Record<string, string | undefined>;

export function loadConfig(platformArg: string | undefined, env: Env = process.env): Config {
  const platform = parsePlatform(platformArg);

  const rawgApiKey = env.RAWG_API_KEY;
  if (!rawgApiKey) {
    throw new Error('RAWG_API_KEY is missing. Add it to your .env file or repository secrets.');
  }

  return {
    platform,
    rawgApiKey,
    recommendationMode: parseMode(env.RECOMMENDATION_MODE),
    twitter: platform === 'x' ? readGroup(env, {
      appKey: 'TWITTER_API_KEY',
      appSecret: 'TWITTER_API_SECRET',
      accessToken: 'TWITTER_ACCESS_TOKEN',
      accessSecret: 'TWITTER_ACCESS_SECRET',
    }) : undefined,
    bluesky: platform === 'bluesky' ? readGroup(env, {
      identifier: 'BLUESKY_IDENTIFIER',
      appPassword: 'BLUESKY_APP_PASSWORD',
    }) : undefined,
  };
}

function parsePlatform(value: string | undefined): Platform {
  if (!value || !(PLATFORMS as readonly string[]).includes(value)) {
    throw new Error(`Usage: npm start -- <platform>, where platform is one of: ${PLATFORMS.join(', ')}.`);
  }
  return value as Platform;
}

function parseMode(value: string | undefined): RecommendationMode | undefined {
  if (!value) {
    return undefined;
  }
  if (!(RECOMMENDATION_MODES as readonly string[]).includes(value)) {
    throw new Error(`Unknown RECOMMENDATION_MODE "${value}", expected one of: ${RECOMMENDATION_MODES.join(', ')}.`);
  }
  return value as RecommendationMode;
}

// Reads a group of variables that only make sense together. A partially set group is almost always
// a typo in a secret name, so it fails instead of silently falling back to a dry run.
function readGroup<K extends string>(env: Env, names: Record<K, string>): Record<K, string> | undefined {
  const keys = Object.keys(names) as K[];
  const missing = keys.filter(key => !env[names[key]]).map(key => names[key]);

  if (missing.length === keys.length) {
    return undefined;
  }
  if (missing.length > 0) {
    throw new Error(`Missing ${missing.join(', ')}. Set all of ${Object.values(names).join(', ')} or none of them.`);
  }
  return Object.fromEntries(keys.map(key => [key, env[names[key]]])) as Record<K, string>;
}
