import { useGraphQL } from './useGraphQL';

const FEATURE_FLAGS_QUERY = `
  query FeatureFlags {
    featureFlags {
      key
      enabledForTravelers
      enabledForHosts
    }
  }
`;

type FlagItem = {
  key: string;
  enabledForTravelers: boolean;
  enabledForHosts: boolean;
};

type FlagsData = {
  featureFlags: FlagItem[];
};

export function useFeatureFlags() {
  const { data, loading } = useGraphQL<FlagsData>(FEATURE_FLAGS_QUERY);
  const flags = data?.featureFlags ?? [];

  function isEnabled(key: string, role: 'TRAVELER' | 'HOST' | 'ADMIN'): boolean {
    // ADMIN always has access
    if (role === 'ADMIN') return true;
    // While loading, default to enabled (avoid flicker)
    if (loading || flags.length === 0) return true;
    const flag = flags.find((f) => f.key === key);
    if (!flag) return true;
    if (role === 'TRAVELER') return flag.enabledForTravelers;
    if (role === 'HOST') return flag.enabledForHosts;
    return true;
  }

  return { flags, loading, isEnabled };
}
