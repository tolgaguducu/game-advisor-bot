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

  private load() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(HISTORY_FILE)) {
      try {
        const data = fs.readFileSync(HISTORY_FILE, 'utf-8');
        const ids = JSON.parse(data);
        if (Array.isArray(ids)) {
          this.history = new Set(ids);
        }
      } catch (error) {
        console.error('Error loading history:', error);
      }
    }
  }

  private save() {
    try {
      const data = JSON.stringify(Array.from(this.history), null, 2);
      fs.writeFileSync(HISTORY_FILE, data);
    } catch (error) {
      console.error('Error saving history:', error);
    }
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
