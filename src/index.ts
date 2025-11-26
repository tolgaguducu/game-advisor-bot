import { GameService } from './services/gameService';
import { HistoryService } from './services/historyService';
import { TwitterService } from './services/twitterService';

async function main() {
  console.log('🎮 Game Recommendation Bot Starting...');

  const gameService = new GameService();
  const historyService = new HistoryService();
  const twitterService = new TwitterService();
  
  console.log(`📚 History contains ${historyService.count} games.`);
  console.log('Fetching a random game recommendation...');
  
  const game = await gameService.getRandomGame(historyService);

  if (game) {
    historyService.add(game.id);
    
    console.log('\n--------------------------------------------------');
    console.log(`🎲 Recommended Game: ${game.name}`);
    console.log(`⭐ Rating: ${game.rating}/5`);
    console.log(`🎭 Genre: ${game.genres.map(g => g.name).join(', ')}`);
    console.log('--------------------------------------------------\n');

    await twitterService.postTweet(game);

  } else {
    console.log('❌ Failed to fetch a game recommendation.');
  }
}

main().catch(console.error);
