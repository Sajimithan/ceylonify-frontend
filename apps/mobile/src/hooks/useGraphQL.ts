import { useState, useEffect } from 'react';
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
  variables?: Record<string, any>
): UseGraphQLResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

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
