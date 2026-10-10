import { TwitterApi } from 'twitter-api-v2';
import { TwitterCredentials } from '../config/env';
import { Post } from '../post';
import { describeError } from '../utils/errors';
import { downloadImage } from '../utils/image';
import { Publisher } from './publisher';

export class TwitterPublisher implements Publisher {
  readonly name = 'X (Twitter)';
  private readonly client: TwitterApi;

  constructor(credentials: TwitterCredentials) {
    this.client = new TwitterApi(credentials);
  }

  async publish(post: Post): Promise<void> {
    const mediaId = post.image ? await this.uploadImage(post.image.url) : undefined;
    await this.client.v2.tweet(post.text, mediaId ? { media: { media_ids: [mediaId] } } : {});
  }

  private async uploadImage(url: string): Promise<string | undefined> {
    try {
      console.log('🖼️  Uploading image to X...');
      const image = await downloadImage(url);
      return await this.client.v1.uploadMedia(image.data, { mimeType: image.mimeType });
    } catch (error) {
      console.warn(`⚠️  Failed to upload image to X, posting text only: ${describeError(error)}`);
      return undefined;
    }
  }
}
