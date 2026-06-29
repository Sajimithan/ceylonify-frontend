import { useState, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import Constants from 'expo-constants';
import { auth } from '../lib/firebase';

const API_URL = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000/graphql';

export interface UseGraphQLResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useGraphQL<T = any>(
  query: string,
  variables?: Record<string, any>,
  { pollInterval }: { pollInterval?: number } = {},
): UseGraphQLResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Initial load and explicit pull-to-refresh — shows the loading spinner
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await auth?.currentUser?.getIdToken();

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          query,
          variables: variables || {},
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText || 'Request failed'}`);
      }

      if (result.errors) {
        throw new Error(result.errors[0]?.message || 'GraphQL Error');
      }

      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  // Background poll — no loading state change, silently swallows errors so
  // stale data keeps showing rather than flashing a spinner on every tick
  const silentFetch = async () => {
    try {
      const token = await auth?.currentUser?.getIdToken();
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ query, variables: variables || {} }),
      });
      const result = await response.json();
      if (!response.ok || result.errors) return;
      setData(result.data);
    } catch { /* swallow poll errors */ }
  };

  // Stable ref so the interval callback always sees the latest silentFetch closure
  const silentFetchRef = useRef(silentFetch);
  useEffect(() => { silentFetchRef.current = silentFetch; });

  // Polling — only runs when the app is in the foreground (AppState 'active').
  // Fires an immediate refresh when the app comes back from the background.
  useEffect(() => {
    if (!pollInterval) return;

    const interval = setInterval(() => {
      if (AppState.currentState === 'active') silentFetchRef.current();
    }, pollInterval);

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') silentFetchRef.current();
    });

    return () => { clearInterval(interval); sub.remove(); };
  }, [pollInterval]);

  useEffect(() => {
    fetchData();
  }, [query, JSON.stringify(variables)]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}

export async function gqlFetch<T = any>(
  query: string,
  variables?: Record<string, any>,
): Promise<T> {
  const token = await auth?.currentUser?.getIdToken();
  let response: Response;
  try {
    response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ query, variables: variables || {} }),
    });
  } catch {
    throw new Error('Network error: backend unreachable');
  }
  const result = await response.json();
  if (result.errors) throw new Error(result.errors[0]?.message || 'GraphQL Error');
  return result.data;
}
