import { Post } from '../post';

export interface Publisher {
  readonly name: string;
  /** Throws if the post could not be published. */
  publish(post: Post): Promise<void>;
}
