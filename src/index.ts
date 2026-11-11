import dotenv from 'dotenv';
import path from 'path';
import { runBot } from './bot';
import { Config, loadConfig } from './config/env';
import { Publisher } from './publishers/publisher';
import { BlueskyPublisher } from './publishers/blueskyPublisher';
import { TwitterPublisher } from './publishers/twitterPublisher';
import { GameService, modeForDate } from './services/gameService';
import { FallbackGameSource, GameSource } from './services/gameSource';
import { IgdbService } from './services/igdbService';
import { HistoryService } from './services/historyService';
import { describeError } from './utils/errors';

function createPublisher(config: Config): Publisher | undefined {
  switch (config.platform) {
    case 'x':
      return config.twitter && new TwitterPublisher(config.twitter);
    case 'bluesky':
      return config.bluesky && new BlueskyPublisher(config.bluesky);
  }
}

// RAWG first, IGDB when RAWG is down or finds nothing.
function createGameSource(config: Config): GameSource {
  const sources: GameSource[] = [];
  if (config.rawgApiKey) sources.push(new GameService(config.rawgApiKey));
  if (config.igdb) sources.push(new IgdbService(config.igdb));
  return new FallbackGameSource(sources);
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
    gameSource: createGameSource(config),
    history,
    publisher,
    mode: config.recommendationMode ?? modeForDate(new Date()),
  });
}

main().catch(error => {
  console.error('❌', describeError(error));
  process.exit(1);
});
