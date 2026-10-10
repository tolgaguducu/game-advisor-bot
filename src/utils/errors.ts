import axios from 'axios';

// Turns an error into a log line. Axios errors are never printed whole: their request config contains API keys,
// and GitHub Actions logs of public repositories are public.
export function describeError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const request = `${error.config?.method?.toUpperCase() ?? 'GET'} ${error.config?.baseURL ?? ''}${error.config?.url ?? ''}`;
    return error.response
      ? `HTTP ${error.response.status} from ${request}`
      : `${error.code ?? 'Network error'} for ${request}`;
  }

  // twitter-api-v2 errors carry the API response body (e.g. "credits depleted") in `data`.
  const apiError = error as { code?: unknown; data?: { title?: string; detail?: string } };
  if (typeof apiError.code === 'number' && apiError.data) {
    const { title, detail } = apiError.data;
    return `${apiError.code} ${title ?? ''}${detail ? ` - ${detail}` : ''}`.trim();
  }

  if (error instanceof Error) {
    return error.stack ?? error.message;
  }
  return String(error);
}
