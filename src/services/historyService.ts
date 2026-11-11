import fs from 'fs';
import path from 'path';
import { HistoryKey } from './gameSource';

export class HistoryService {
  // RAWG game IDs (numbers), "igdb:<id>" and "name:<normalized name>" keys.
  private history = new Set<HistoryKey>();

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
      throw new Error(`${this.file} must contain a JSON array of history keys.`);
    }
    this.history = new Set(ids);
  }

  private save() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file, JSON.stringify(Array.from(this.history), null, 2));
  }

  has(key: HistoryKey): boolean {
    return this.history.has(key);
  }

  add(...keys: HistoryKey[]) {
    keys.forEach(key => this.history.add(key));
    this.save();
  }

  /** Number of recommended games. Name keys only duplicate an ID key, so they are not counted. */
  get count(): number {
    return [...this.history].filter(key => !String(key).startsWith('name:')).length;
  }
}
