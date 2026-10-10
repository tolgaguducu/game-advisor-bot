import { Game } from '../src/types/game';

export function makeGame(overrides: Partial<Game> = {}): Game {
  return {
    id: 1,
    name: 'Celeste',
    slug: 'celeste',
    released: '2018-01-25',
    background_image: 'https://media.rawg.io/media/games/celeste.jpg',
    rating: 4.37,
    ratings_count: 1714,
    metacritic: 91,
    playtime: 8,
    description_raw: 'Help Madeline survive her inner demons.',
    genres: [{ id: 1, name: 'Platformer', slug: 'platformer' }],
    tags: [],
    stores: [{ store: { id: 1, name: 'Steam' } }],
    esrb_rating: null,
    developers: [{ id: 1, name: 'Maddy Makes Games', slug: 'maddy-makes-games' }],
    platforms: [
      { platform: { id: 1, name: 'PC', slug: 'pc' } },
      { platform: { id: 2, name: 'Nintendo Switch', slug: 'nintendo-switch' } },
    ],
    ...overrides,
  };
}
