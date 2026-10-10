import axios from 'axios';
import { TwitterApi } from 'twitter-api-v2';
import { config } from '../config/env';
import { Game } from '../types/game';

export class TwitterService {
  private client?: TwitterApi;

  constructor() {
    if (config.twitterApiKey && config.twitterApiSecret && config.twitterAccessToken && config.twitterAccessSecret) {
      this.client = new TwitterApi({
        appKey: config.twitterApiKey,
        appSecret: config.twitterApiSecret,
        accessToken: config.twitterAccessToken,
        accessSecret: config.twitterAccessSecret,
      });
    }
  }

  get isConfigured(): boolean {
    return this.client !== undefined;
  }

  async postTweet(game: Game): Promise<void> {
    if (!this.client) {
      throw new Error('Twitter client is not configured.');
    }

    const tweetText = this.formatTweet(game);

    let mediaId: string | undefined;
    if (game.background_image) {
      console.log('🖼️  Uploading game image...');
      mediaId = await this.uploadMedia(this.client, game.background_image);
    }

    try {
      if (mediaId) {
        await this.client.v2.tweet(tweetText, { media: { media_ids: [mediaId] } });
      } else {
        await this.client.v2.tweet(tweetText);
      }
    } catch (error) {
      throw new Error(`Error posting tweet: ${describeError(error)}`);
    }

    console.log('✅ Tweet posted successfully!');
  }

  private async uploadMedia(client: TwitterApi, imageUrl: string): Promise<string | undefined> {
    try {
      const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const contentType = response.headers['content-type'];
      const mimeType = typeof contentType === 'string' ? contentType : 'image/jpeg';
      return await client.v1.uploadMedia(Buffer.from(response.data), { mimeType });
    } catch (error) {
      console.error(`⚠️  Failed to upload media, posting text only: ${describeError(error)}`);
      return undefined;
    }
  }

  formatTweet(game: Game): string {
    const platforms = game.platforms?.slice(0, 3).map(p => p.platform.name).join(', ') || '';
    const developers = game.developers?.slice(0, 1).map(d => d.name).join(', ') || '';

    let header = `🎮 Daily Game Recommendation: ${game.name}\n\n`;
    let metadata = '';

    if (game.released) metadata += `📅 Released: ${game.released}\n`;
    if (game.metacritic) metadata += `⭐️ Metacritic: ${game.metacritic}\n`;
    if (game.playtime) metadata += `⏱️ Playtime: ${game.playtime} hours\n`;
    if (developers) metadata += `👨‍💻 Dev: ${developers}\n`;
    if (platforms) metadata += `🕹️ Platforms: ${platforms}\n`;

    const hashtags = `\n#GameRecommendation #Gaming #OyunumaDokunma`;

    return `${header}${metadata}${hashtags}`;
  }
}

// twitter-api-v2 errors carry the API response body (e.g. "credits depleted") in `data`.
function describeError(error: unknown): string {
  const apiError = error as { code?: number; data?: { title?: string; detail?: string } };
  if (apiError.code && apiError.data) {
    return `${apiError.code} ${apiError.data.title ?? ''} - ${apiError.data.detail ?? JSON.stringify(apiError.data)}`;
  }
  return error instanceof Error ? error.message : String(error);
}
