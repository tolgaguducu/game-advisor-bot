export interface Game {
  id: number;
  name: string;
  slug: string;
  released: string;
  background_image: string;
  rating: number;
  genres: Genre[];
  description_raw?: string;
}

export interface Genre {
  id: number;
  name: string;
  slug: string;
}
