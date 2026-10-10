import assert from 'node:assert/strict';
import { test } from 'node:test';
import axios, { AxiosError } from 'axios';
import { describeError } from '../src/utils/errors';

test('describes axios errors without leaking the API key', async () => {
  const client = axios.create({ baseURL: 'https://api.rawg.io/api', params: { key: 'SECRET-KEY' } });
  client.defaults.adapter = async config => {
    throw new AxiosError('Request failed', 'ERR_BAD_RESPONSE', config, undefined, {
      status: 500, statusText: 'Server Error', headers: {}, config, data: {},
    });
  };

  const error = await client.get('/games').catch(e => e);

  assert.equal(describeError(error), 'HTTP 500 from GET https://api.rawg.io/api/games');
});

test('describes X API errors with the response body', () => {
  const error = Object.assign(new Error('Request failed with code 402'), {
    code: 402,
    data: { title: 'Payment Required', detail: 'credits depleted' },
  });

  assert.equal(describeError(error), '402 Payment Required - credits depleted');
});
