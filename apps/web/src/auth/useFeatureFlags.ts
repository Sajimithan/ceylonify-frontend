import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { useAuth } from "./useAuth";
import { isAdminEmail } from "./admin";

const FLAGS_QUERY = gql`
  query UseFeatureFlags {
    featureFlags { key enabledForTravelers enabledForHosts }
  }
`;

type FlagItem = { key: string; enabledForTravelers: boolean; enabledForHosts: boolean };

export function useFeatureFlags() {
  const { user } = useAuth();
  const isAdmin = isAdminEmail(user?.email);
  const { data, loading } = useQuery<{ featureFlags: FlagItem[] }>(FLAGS_QUERY, { skip: !user });
  const flags = data?.featureFlags ?? [];

  function isEnabledFor(key: string, role: "TRAVELER" | "HOST"): boolean {
    if (isAdmin) return true; // admins are never blocked by feature flags
    if (loading || flags.length === 0) return true; // optimistic while loading
    const flag = flags.find((f) => f.key === key);
    if (!flag) return true;
    return role === "HOST" ? flag.enabledForHosts : flag.enabledForTravelers;
  }

  return { isEnabledFor, flags, loading };
}
