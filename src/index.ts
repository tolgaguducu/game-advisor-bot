import { GameService } from './services/gameService';
import { HistoryService } from './services/historyService';
import { TwitterService } from './services/twitterService';

async function main() {
  console.log('🎮 Game Recommendation Bot Starting...');

  const gameService = new GameService();
  const historyService = new HistoryService();
  const twitterService = new TwitterService();

  if (!twitterService.isConfigured && process.env.CI) {
    throw new Error('Twitter API keys are missing. Add them as repository secrets.');
  }

  console.log(`📚 History contains ${historyService.count} games.`);
  console.log('Fetching a random game recommendation...');

  const game = await gameService.getRandomGame(historyService);
  if (!game) {
    throw new Error('Failed to fetch a game recommendation.');
  }

  console.log('\n--------------------------------------------------');
  console.log(`🎲 Recommended Game: ${game.name}`);
  console.log(`⭐ Rating: ${game.rating}/5`);
  console.log(`🎭 Genre: ${game.genres.map(g => g.name).join(', ')}`);
  console.log('--------------------------------------------------\n');

  if (!twitterService.isConfigured) {
    console.warn('⚠️  Twitter API keys are missing. Running in DRY RUN mode, history will not be updated.');
    console.log('--------------------------------------------------');
    console.log(twitterService.formatTweet(game));
    console.log(`[Image URL]: ${game.background_image}`);
    console.log('--------------------------------------------------\n');
    return;
  }

  await twitterService.postTweet(game);
  historyService.add(game.id);
}

main().catch(error => {
  console.error('❌', error);
  process.exit(1);
});
