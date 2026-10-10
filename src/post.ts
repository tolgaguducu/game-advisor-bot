import { Game } from './types/game';

export interface Post {
  text: string;
  image?: {
    url: string;
    alt: string;
  };
}

const HASHTAGS = '#GameRecommendation #Gaming #OyunumaDokunma';

export function formatPost(game: Game): Post {
  const platforms = game.platforms?.slice(0, 3).map(p => p.platform.name).join(', ');
  const developer = game.developers?.[0]?.name;

  const lines = [
    game.released && `📅 Released: ${game.released}`,
    game.metacritic && `⭐️ Metacritic: ${game.metacritic}`,
    game.playtime && `⏱️ Playtime: ${game.playtime} hours`,
    developer && `👨‍💻 Dev: ${developer}`,
    platforms && `🕹️ Platforms: ${platforms}`,
  ].filter(Boolean);

  return {
    text: `🎮 Daily Game Recommendation: ${game.name}\n\n${lines.map(line => `${line}\n`).join('')}\n${HASHTAGS}`,
    image: game.background_image ? { url: game.background_image, alt: `Artwork from ${game.name}` } : undefined,
  };
}
