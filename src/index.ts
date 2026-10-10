import dotenv from 'dotenv';
import path from 'path';
import { runBot } from './bot';
import { Config, loadConfig } from './config/env';
import { Publisher } from './publishers/publisher';
import { TwitterPublisher } from './publishers/twitterPublisher';
import { GameService, modeForDate } from './services/gameService';
import { HistoryService } from './services/historyService';
import { describeError } from './utils/errors';

function createPublisher(config: Config): Publisher | undefined {
  switch (config.platform) {
    case 'x':
      return config.twitter && new TwitterPublisher(config.twitter);
  }
}

async function main() {
  dotenv.config({ quiet: true });
  const config = loadConfig(process.argv[2]);
  const publisher = createPublisher(config);

  if (!publisher && process.env.CI) {
    throw new Error(`Credentials for ${config.platform} are missing. Add them as repository secrets.`);
  }

  console.log(`🎮 Game Recommendation Bot Starting (${config.platform})...`);
  const history = new HistoryService(path.join(process.cwd(), 'data', 'history', `${config.platform}.json`));
  console.log(`📚 History contains ${history.count} games.`);

  await runBot({
    gameService: new GameService(config.rawgApiKey),
    history,
    publisher,
    mode: config.recommendationMode ?? modeForDate(new Date()),
  });
}

main().catch(error => {
  console.error('❌', describeError(error));
  process.exit(1);
});
