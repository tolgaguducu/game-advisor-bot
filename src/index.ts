import dotenv from 'dotenv';
import { runBot } from './bot';
import { Config, loadConfig } from './config/env';
import { Publisher } from './publishers/publisher';
import { TwitterPublisher } from './publishers/twitterPublisher';
import { GameService, modeForDate } from './services/gameService';
import { HistoryService } from './services/historyService';
import { describeError } from './utils/errors';

function createPublishers(config: Config): Publisher[] {
  const publishers: Publisher[] = [];
  if (config.twitter) publishers.push(new TwitterPublisher(config.twitter));
  return publishers;
}

async function main() {
  dotenv.config({ quiet: true });
  const config = loadConfig();
  const publishers = createPublishers(config);

  if (publishers.length === 0 && process.env.CI) {
    throw new Error('No publishing platform is configured. Add the API keys as repository secrets.');
  }

  console.log('🎮 Game Recommendation Bot Starting...');
  const history = new HistoryService();
  console.log(`📚 History contains ${history.count} games.`);

  await runBot({
    gameService: new GameService(config.rawgApiKey),
    history,
    publishers,
    mode: config.recommendationMode ?? modeForDate(new Date()),
  });
}

main().catch(error => {
  console.error('❌', describeError(error));
  process.exit(1);
});
