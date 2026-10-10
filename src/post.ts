import { Game } from './types/game';

export interface Post {
  text: string;
  image?: {
    url: string;
    alt: string;
  };
}

const HASHTAGS = '#GameRecommendation #Gaming #OyunumaDokunma';

// Fits both X (280 characters, emoji count double) and Bluesky (300 graphemes).
const MAX_LENGTH = 270;

// RAWG serves resized copies under /media/resize/<width>/-/. Originals can be several MB,
// more than Bluesky's 2 MB image limit.
const RAWG_MEDIA_PREFIX = 'https://media.rawg.io/media/';
const IMAGE_WIDTH = 1280;

export function formatPost(game: Game): Post {
  const platforms = game.platforms?.slice(0, 3).map(p => p.platform.name).join(', ');
  const developer = game.developers?.[0]?.name;

  const lines = [
    game.released && `📅 Released: ${game.released}`,
    game.metacritic && `⭐️ Metacritic: ${game.metacritic}`,
    game.playtime && `⏱️ Playtime: ${game.playtime} hours`,
    developer && `👨‍💻 Dev: ${developer}`,
    platforms && `🕹️ Platforms: ${platforms}`,
  ].filter((line): line is string => Boolean(line));

  const build = () => `🎮 Daily Game Recommendation: ${game.name}\n\n${lines.map(line => `${line}\n`).join('')}\n${HASHTAGS}`;

  // Drop details from the end (platforms first) until the post fits.
  let text = build();
  while (graphemeLength(text) > MAX_LENGTH && lines.length > 0) {
    lines.pop();
    text = build();
  }

  return {
    text,
    image: game.background_image ? { url: resizedImageUrl(game.background_image), alt: `Artwork from ${game.name}` } : undefined,
  };
}

export function resizedImageUrl(url: string): string {
  if (!url.startsWith(RAWG_MEDIA_PREFIX) || /^(resize|crop)\//.test(url.slice(RAWG_MEDIA_PREFIX.length))) {
    return url;
  }
  return `${RAWG_MEDIA_PREFIX}resize/${IMAGE_WIDTH}/-/${url.slice(RAWG_MEDIA_PREFIX.length)}`;
}

function graphemeLength(text: string): number {
  return [...new Intl.Segmenter().segment(text)].length;
}
