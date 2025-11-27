import axios from 'axios';
import { TwitterApi } from 'twitter-api-v2';
import { config } from '../config/env';
import { Game } from '../types/game';

export class TwitterService {
  private client: TwitterApi;
  private readOnly: boolean = false;

  constructor() {
    if (!config.twitterApiKey || !config.twitterApiSecret || !config.twitterAccessToken || !config.twitterAccessSecret) {
      console.warn('⚠️  Twitter API keys are missing. Running in READ-ONLY (Dry Run) mode.');
      this.readOnly = true;
      this.client = new TwitterApi({ appKey: 'dummy', appSecret: 'dummy', accessToken: 'dummy', accessSecret: 'dummy' });
    } else {
      this.client = new TwitterApi({
        appKey: config.twitterApiKey,
        appSecret: config.twitterApiSecret,
        accessToken: config.twitterAccessToken,
        accessSecret: config.twitterAccessSecret,
      });
    }
  }

  async postTweet(game: Game): Promise<boolean> {
    const tweetText = this.formatTweet(game);

    if (this.readOnly) {
      console.log('\n[DRY RUN] Would post tweet:');
      console.log('--------------------------------------------------');
      console.log(tweetText);
      if (game.background_image) {
        console.log(`[Image URL]: ${game.background_image}`);
      }
      console.log('--------------------------------------------------\n');
      return true;
    }

    try {
      let mediaId: string | undefined;

      if (game.background_image) {
        console.log('🖼️  Uploading game image...');
        mediaId = await this.uploadMedia(game.background_image);
      }

      if (mediaId) {
        await this.client.v2.tweet(tweetText, { media: { media_ids: [mediaId] } });
      } else {
        await this.client.v2.tweet(tweetText);
      }
      
      console.log('✅ Tweet posted successfully!');
      return true;
    } catch (error) {
      console.error('❌ Error posting tweet:', error);
      return false;
    }
  }

  private async uploadMedia(imageUrl: string): Promise<string | undefined> {
    try {
      const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data, 'binary');
      
      const mediaId = await this.client.v1.uploadMedia(buffer, { mimeType: 'image/jpeg' }); // Assuming JPEG, RAWG mostly uses JPG
      return mediaId;
    } catch (error) {
      console.error('⚠️  Failed to upload media, posting text only:', error);
      return undefined;
    }
  }

  private formatTweet(game: Game): string {
    const genres = game.genres.slice(0, 2).map(g => g.name).join(', ');
    const platforms = game.platforms?.slice(0, 3).map(p => p.platform.name).join(', ') || '';
    const developers = game.developers?.slice(0, 1).map(d => d.name).join(', ') || '';

    let header = `🎮 Daily Game Recommendation: ${game.name}\n\n`;
    let metadata = '';

    if (game.released) metadata += `📅 Released: ${game.released}\n`;
    if (game.metacritic) metadata += `⭐️ Metacritic: ${game.metacritic}\n`;
    if (game.playtime) metadata += `⏱️ Playtime: ${game.playtime} hours\n`;
    if (developers) metadata += `👨‍💻 Dev: ${developers}\n`;
    if (platforms) metadata += `🕹️ Platforms: ${platforms}\n`;

    const hashtags = `\n#GameRecommendation #Gaming #${game.slug.replace(/-/g, '')}`;
    
    return `${header}${metadata}${hashtags}`;
  }
}
