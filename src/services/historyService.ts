import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');

export class HistoryService {
  private history: Set<number>;

  constructor() {
    this.history = new Set();
    this.load();
  }

  // Throws on a corrupt file instead of starting empty, which would overwrite the history on the next save.
  private load() {
    if (!fs.existsSync(HISTORY_FILE)) {
      return;
    }

    const ids = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
    if (!Array.isArray(ids)) {
      throw new Error(`${HISTORY_FILE} must contain a JSON array of game IDs.`);
    }
    this.history = new Set(ids);
  }

  private save() {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(Array.from(this.history), null, 2));
  }

  has(gameId: number): boolean {
    return this.history.has(gameId);
  }

  add(gameId: number) {
    this.history.add(gameId);
    this.save();
  }

  get count(): number {
    return this.history.size;
  }
}
