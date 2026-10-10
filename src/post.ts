import { RecommendationMode } from './services/gameService';
import { Game } from './types/game';

export interface Post {
  text: string;
  image?: {
    url: string;
    alt: string;
  };
}

const HEADERS: Record<RecommendationMode, string> = {
  'popular': '🎮 Game of the Day',
  'hidden-gem': '💎 Hidden Gem',
};

const BRAND_HASHTAG = '#OyunumaDokunma';
const MAX_TOPIC_HASHTAGS = 2;

// Candidate hashtags in priority order: specific RAWG tags first, then genres. Generic genres
// like Action and Adventure come last, since almost every game has them.
const TOPIC_HASHTAGS: { source: 'tags' | 'genres'; slug: string; hashtag: string }[] = [
  { source: 'tags', slug: 'metroidvania', hashtag: 'Metroidvania' },
  { source: 'tags', slug: 'souls-like', hashtag: 'Soulslike' },
  { source: 'tags', slug: 'roguelike', hashtag: 'Roguelike' },
  { source: 'tags', slug: 'deckbuilding', hashtag: 'Deckbuilder' },
  { source: 'tags', slug: 'city-builder', hashtag: 'CityBuilder' },
  { source: 'tags', slug: 'visual-novel', hashtag: 'VisualNovel' },
  { source: 'tags', slug: 'horror', hashtag: 'HorrorGame' },
  { source: 'tags', slug: 'cozy', hashtag: 'CozyGames' },
  { source: 'genres', slug: 'indie', hashtag: 'IndieGame' },
  { source: 'genres', slug: 'role-playing-games-rpg', hashtag: 'RPG' },
  { source: 'genres', slug: 'strategy', hashtag: 'StrategyGame' },
  { source: 'genres', slug: 'puzzle', hashtag: 'PuzzleGame' },
  { source: 'genres', slug: 'platformer', hashtag: 'Platformer' },
  { source: 'genres', slug: 'shooter', hashtag: 'Shooter' },
  { source: 'genres', slug: 'fighting', hashtag: 'FightingGame' },
  { source: 'genres', slug: 'racing', hashtag: 'RacingGame' },
  { source: 'genres', slug: 'sports', hashtag: 'SportsGame' },
  { source: 'genres', slug: 'simulation', hashtag: 'SimulationGame' },
  { source: 'genres', slug: 'card', hashtag: 'CardGame' },
  { source: 'tags', slug: 'survival', hashtag: 'SurvivalGame' },
  { source: 'tags', slug: 'open-world', hashtag: 'OpenWorld' },
  { source: 'genres', slug: 'adventure', hashtag: 'AdventureGame' },
  { source: 'genres', slug: 'action', hashtag: 'ActionGame' },
];

// Only three platforms are listed, so the most relevant ones go first. Unlisted platforms come last.
const PLATFORM_ORDER = [
  'pc', 'playstation5', 'xbox-series-x', 'nintendo-switch',
  'playstation4', 'xbox-one', 'macos', 'linux', 'ios', 'android',
];

// Fits both X (280 characters, emoji count double) and Bluesky (300 graphemes).
const MAX_LENGTH = 270;

// RAWG serves resized copies under /media/resize/<width>/-/. Originals can be several MB,
// more than Bluesky's 2 MB image limit.
const RAWG_MEDIA_PREFIX = 'https://media.rawg.io/media/';
const IMAGE_WIDTH = 1280;

export function formatPost(game: Game, mode: RecommendationMode): Post {
  const year = game.released?.slice(0, 4);
  const title = `${HEADERS[mode]}: ${game.name}${year ? ` (${year})` : ''}`;

  const stats = [
    game.metacritic && `⭐️ Metacritic ${game.metacritic}`,
    game.playtime && `⏱️ ${game.playtime} hours`,
  ].filter(Boolean).join(' · ');
  // RAWG often lists the publisher among the developers too, prefer the actual studio.
  const developers = game.developers ?? [];
  const publishers = new Set(game.publishers?.map(p => p.slug));
  const developer = (developers.find(d => !publishers.has(d.slug)) ?? developers[0])?.name;
  const platforms = topPlatforms(game).join(', ');

  const lines = [
    stats,
    developer && `👨‍💻 ${developer}`,
    platforms && `🕹️ ${platforms}`,
  ].filter((line): line is string => Boolean(line));

  const hashtags = [...topicHashtags(game), BRAND_HASHTAG].join(' ');
  const build = () => [title, lines.join('\n'), hashtags].filter(Boolean).join('\n\n');

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

function topPlatforms(game: Game): string[] {
  const rank = (slug: string) => {
    const index = PLATFORM_ORDER.indexOf(slug);
    return index === -1 ? PLATFORM_ORDER.length : index;
  };
  return (game.platforms ?? [])
    .map(p => p.platform)
    .sort((a, b) => rank(a.slug) - rank(b.slug))
    .slice(0, 3)
    .map(platform => platform.name);
}

function topicHashtags(game: Game): string[] {
  const slugs = {
    tags: new Set(game.tags?.map(tag => tag.slug)),
    genres: new Set(game.genres.map(genre => genre.slug)),
  };
  return TOPIC_HASHTAGS
    .filter(({ source, slug }) => slugs[source].has(slug))
    .slice(0, MAX_TOPIC_HASHTAGS)
    .map(({ hashtag }) => `#${hashtag}`);
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
