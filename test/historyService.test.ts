import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { HistoryService } from '../src/services/historyService';

function tempFile(content?: string): string {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'history-')), 'data', 'history.json');
  if (content !== undefined) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  return file;
}

test('loads existing ids and persists new ones', () => {
  const file = tempFile('[1, 2]');
  const history = new HistoryService(file);

  history.add(3);

  assert.equal(history.has(2), true);
  assert.equal(history.count, 3);
  assert.deepEqual(JSON.parse(fs.readFileSync(file, 'utf-8')), [1, 2, 3]);
});

test('starts empty and creates the file when it does not exist', () => {
  const file = tempFile();
  const history = new HistoryService(file);

  history.add(7);

  assert.deepEqual(JSON.parse(fs.readFileSync(file, 'utf-8')), [7]);
});

test('refuses to load a corrupt file instead of overwriting it', () => {
  assert.throws(() => new HistoryService(tempFile('[1, 2')));
  assert.throws(() => new HistoryService(tempFile('{"ids": [1]}')), /JSON array/);
});
