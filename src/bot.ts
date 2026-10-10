import { formatPost } from './post';
import { Publisher } from './publishers/publisher';
import { GameService, RecommendationMode } from './services/gameService';
import { HistoryService } from './services/historyService';
import { describeError } from './utils/errors';

export interface BotOptions {
  gameService: Pick<GameService, 'getRandomGame'>;
  history: Pick<HistoryService, 'has' | 'add'>;
  /** An empty list means dry run: the post is only printed and history is left untouched. */
  publishers: Publisher[];
  mode: RecommendationMode;
}

export async function runBot({ gameService, history, publishers, mode }: BotOptions): Promise<void> {
  console.log(`Fetching a ${mode} game recommendation...`);
  const game = await gameService.getRandomGame(history, mode);
  if (!game) {
    throw new Error('Failed to find a game to recommend.');
  }

  console.log('\n--------------------------------------------------');
  console.log(`🎲 Recommended Game: ${game.name}`);
  console.log(`⭐ Rating: ${game.rating}/5`);
  console.log(`🎭 Genre: ${game.genres.map(g => g.name).join(', ')}`);
  console.log('--------------------------------------------------\n');

  const post = formatPost(game);

  if (publishers.length === 0) {
    console.warn('⚠️  No publishing platform is configured. Running in DRY RUN mode, history will not be updated.');
    console.log('--------------------------------------------------');
    console.log(post.text);
    console.log(`[Image URL]: ${post.image?.url ?? 'none'}`);
    console.log('--------------------------------------------------\n');
    return;
  }

  const failed: string[] = [];
  for (const publisher of publishers) {
    try {
      await publisher.publish(post);
      console.log(`✅ Posted to ${publisher.name}`);
    } catch (error) {
      failed.push(publisher.name);
      console.error(`❌ Failed to post to ${publisher.name}: ${describeError(error)}`);
    }
  }

  // Once a game reached any platform it counts as recommended, so a later run never posts it twice.
  if (failed.length < publishers.length) {
    history.add(game.id);
  }
  if (failed.length > 0) {
    throw new Error(`Posting failed on: ${failed.join(', ')}`);
  }
}
