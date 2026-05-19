import { useState, useEffect } from 'react';
import Constants from 'expo-constants';

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

      console.log('🔍 GraphQL Request:', {
        url: API_URL,
        query: query.substring(0, 100) + '...',
        variables,
      });

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables: variables || {},
        }),
      });

      console.log('📡 Response Status:', response.status, response.statusText);

      const result = await response.json();
      console.log('📦 Response Data:', JSON.stringify(result).substring(0, 200));

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText || 'Request failed'}`);
      }

      if (result.errors) {
        console.error('❌ GraphQL Errors:', result.errors);
        throw new Error(result.errors[0]?.message || 'GraphQL Error');
      }

      console.log('✅ Data received successfully');
      setData(result.data);
    } catch (err) {
      console.error('💥 Fetch Error:', err);
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
