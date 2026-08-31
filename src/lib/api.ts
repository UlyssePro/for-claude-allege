import { useState, useCallback } from "react";

/**
 * Custom hook for making API requests with automatic retry and timeout handling
 * @param url The API endpoint to call
 * @param options Fetch options
 * @param config Retry and timeout configuration
 */
export function useApiRequest<T = any>() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<T | null>(null);

  /**
   * Makes an API request with retry logic and timeout
   */
  const request = useCallback(async (
    url: string,
    options: RequestInit = {},
    config: {
      retries?: number;
      timeoutMs?: number;
      onRetry?: (attempt: number, error: Error) => void;
    } = {}
  ) => {
    setLoading(true);
    setError(null);

    const {
      retries = 3,
      timeoutMs = 15000, // 15 seconds default timeout
      onRetry
    } = config;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // Create a promise that rejects after timeoutMs
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs);
        });

        // Race the fetch against the timeout
        const response = await Promise.race([
          fetch(url, {
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              ...(options.headers || {}),
            },
            ...options,
          }),
          timeoutPromise
        ]);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json() as T;
        setData(result);
        setLoading(false);
        return result;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));

        if (attempt < retries) {
          // Wait before retrying (exponential backoff)
          const delay = Math.min(1000 * 2 ** attempt, 10000); // Max 10 seconds
          if (onRetry) {
            onRetry(attempt + 1, lastError);
          }
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          // Final attempt failed
          setError(lastError);
          setLoading(false);
          throw lastError;
        }
      }
    }
  }, []);

  return { request, data, loading, error };
}

/**
 * Wrapper around fetch with automatic JSON parsing and error handling
 */
export async function fetcher<T = any>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${response.statusText}${errorText ? ` - ${errorText}` : ""}`);
  }

  return response.json() as T;
}

/**
 * Makes a GET request with retry and timeout
 */
export async function getWithRetry<T = any>(
  url: string,
  config: { retries?: number; timeoutMs?: number } = {}
): Promise<T> {
  const {
    retries = 3,
    timeoutMs = 15000
  } = config;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs);
      });

      const response = await Promise.race([
        fetch(url, { credentials: "include" }),
        timeoutPromise
      ]);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json() as T;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt < retries) {
        const delay = Math.min(1000 * 2 ** attempt, 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw lastError;
      }
    }
  }

  // This line should never be reached due to the throw in the loop
  throw lastError!;
}

export default useApiRequest;