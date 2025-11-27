export interface Game {
  id: number;
  name: string;
  slug: string;
  released: string;
  background_image: string;
  rating: number;
  genres: Genre[];
  description_raw?: string;
  metacritic?: number;
  playtime?: number;
  platforms?: { platform: Platform }[];
  developers?: Developer[];
}

export interface Genre {
  id: number;
  name: string;
  slug: string;
}

export interface Platform {
  id: number;
  name: string;
  slug: string;
}

export interface Developer {
  id: number;
  name: string;
  slug: string;
}
