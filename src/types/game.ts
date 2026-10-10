export interface Game {
  id: number;
  name: string;
  slug: string;
  released: string;
  background_image: string | null;
  rating: number;
  ratings_count?: number;
  genres: Genre[];
  tags?: Tag[];
  stores?: { store: { id: number; name: string } }[];
  esrb_rating?: { slug: string } | null;
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

export interface Tag {
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
