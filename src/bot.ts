import { formatPost } from './post';
import { Publisher } from './publishers/publisher';
import { GameService, RecommendationMode } from './services/gameService';
import { HistoryService } from './services/historyService';

export interface BotOptions {
  gameService: Pick<GameService, 'getRandomGame'>;
  history: Pick<HistoryService, 'has' | 'add'>;
  /** Undefined means dry run: the post is only printed and history is left untouched. */
  publisher?: Publisher;
  mode: RecommendationMode;
}

export async function runBot({ gameService, history, publisher, mode }: BotOptions): Promise<void> {
  console.log(`Fetching a ${mode} game recommendation...`);
  const recommendation = await gameService.getRandomGame(history, mode);
  if (!recommendation) {
    throw new Error('Failed to find a game to recommend.');
  }
  const { game } = recommendation;

  console.log('\n--------------------------------------------------');
  console.log(`🎲 Recommended Game: ${game.name}`);
  console.log(`⭐ Rating: ${game.rating}/5`);
  console.log(`🎭 Genre: ${game.genres.map(g => g.name).join(', ')}`);
  console.log('--------------------------------------------------\n');

  const post = formatPost(game, recommendation.mode);

  if (!publisher) {
    console.warn('⚠️  Credentials are missing. Running in DRY RUN mode, history will not be updated.');
    console.log('--------------------------------------------------');
    console.log(post.text);
    console.log(`[Image URL]: ${post.image?.url ?? 'none'}`);
    console.log('--------------------------------------------------\n');
    return;
  }

  await publisher.publish(post);
  history.add(game.id);
  console.log(`✅ Posted to ${publisher.name}`);
}
