import fs from 'fs';
import path from 'path';

export class HistoryService {
  private history = new Set<number>();

  constructor(private readonly file: string) {
    this.load();
  }

  // Throws on a corrupt file instead of starting empty, which would overwrite the history on the next save.
  private load() {
    if (!fs.existsSync(this.file)) {
      return;
    }

    const ids = JSON.parse(fs.readFileSync(this.file, 'utf-8'));
    if (!Array.isArray(ids)) {
      throw new Error(`${this.file} must contain a JSON array of game IDs.`);
    }
    this.history = new Set(ids);
  }

  private save() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file, JSON.stringify(Array.from(this.history), null, 2));
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
