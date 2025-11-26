import { TwitterApi } from 'twitter-api-v2';
import { config } from '../config/env';
import { Game } from '../types/game';

export class TwitterService {
  private client: TwitterApi;
  private readOnly: boolean = false;

  constructor() {
    // Check if keys are present
    if (!config.twitterApiKey || !config.twitterApiSecret || !config.twitterAccessToken || !config.twitterAccessSecret) {
      console.warn('⚠️  Twitter API keys are missing. Running in READ-ONLY (Dry Run) mode.');
      this.readOnly = true;
      // Initialize with dummy keys to prevent crash, but methods will check readOnly flag
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
      console.log('--------------------------------------------------\n');
      return true;
    }

    try {
      await this.client.v2.tweet(tweetText);
      console.log('✅ Tweet posted successfully!');
      return true;
    } catch (error) {
      console.error('❌ Error posting tweet:', error);
      return false;
    }
  }

  private formatTweet(game: Game): string {
    const genres = game.genres.map(g => g.name).join(', ');

    return `🎮 Game of the Day: ${game.name}\n` +
           `⭐ Rating: ${game.rating}/5\n` +
           `🎭 Genre: ${genres}\n\n` +
           `#GameRecommendation #Gaming`;
  }
}
