import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { describeError } from './errors';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 20_000; // multiplied by the retry number: 20s, 40s, 60s

// Retries network errors, 429 and 5xx. APIs behind Cloudflare sometimes answer 5xx for a minute or so,
// and retrying is better than a failed day. Client errors like 404 fail immediately.
export function addRetries(instance: AxiosInstance, delayMs = RETRY_DELAY_MS): AxiosInstance {
  instance.interceptors.response.use(undefined, async error => {
    if (!axios.isAxiosError(error) || !error.config) {
      throw error;
    }
    const status = error.response?.status;
    const retryable = status === undefined || status === 429 || status >= 500;
    const config: InternalAxiosRequestConfig & { retryCount?: number } = error.config;
    const retry = (config.retryCount ?? 0) + 1;
    if (!retryable || retry > MAX_RETRIES) {
      throw error;
    }

    config.retryCount = retry;
    const delay = delayMs * retry;
    console.warn(`⚠️  ${describeError(error)}, retrying in ${delay / 1000}s (${retry}/${MAX_RETRIES})...`);
    await new Promise(resolve => setTimeout(resolve, delay));
    return instance.request(config);
  });
  return instance;
}
