import { $Typed, AppBskyEmbedImages, AtpAgent, RichText } from '@atproto/api';
import { BlueskyCredentials } from '../config/env';
import { Post } from '../post';
import { describeError } from '../utils/errors';
import { downloadImage } from '../utils/image';
import { Publisher } from './publisher';

const BLUESKY_SERVICE = 'https://bsky.social';
const MAX_IMAGE_BYTES = 2_000_000;

type Agent = Pick<AtpAgent, 'login' | 'uploadBlob' | 'post'>;

export class BlueskyPublisher implements Publisher {
  readonly name = 'Bluesky';

  constructor(
    private readonly credentials: BlueskyCredentials,
    private readonly agent: Agent = new AtpAgent({ service: BLUESKY_SERVICE }),
  ) {}

  async publish(post: Post): Promise<void> {
    await this.agent.login({ identifier: this.credentials.identifier, password: this.credentials.appPassword });

    // Hashtags are only clickable on Bluesky when marked as facets.
    const richText = new RichText({ text: post.text });
    richText.detectFacetsWithoutResolution();

    const embed = post.image ? await this.uploadImage(post.image) : undefined;
    await this.agent.post({ text: richText.text, facets: richText.facets, langs: ['en'], embed });
  }

  private async uploadImage(image: NonNullable<Post['image']>): Promise<$Typed<AppBskyEmbedImages.Main> | undefined> {
    try {
      console.log('🖼️  Uploading image to Bluesky...');
      const { data, mimeType } = await downloadImage(image.url);
      if (data.length > MAX_IMAGE_BYTES) {
        throw new Error(`Image is ${data.length} bytes, Bluesky allows at most ${MAX_IMAGE_BYTES}.`);
      }
      const response = await this.agent.uploadBlob(data, { encoding: mimeType });
      return { $type: 'app.bsky.embed.images', images: [{ image: response.data.blob, alt: image.alt }] };
    } catch (error) {
      console.warn(`⚠️  Failed to upload image to Bluesky, posting text only: ${describeError(error)}`);
      return undefined;
    }
  }
}
