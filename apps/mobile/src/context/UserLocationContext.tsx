import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { auth } from '../lib/firebase';
import {
  type SavedUserLocation,
  type ResolvedUserLocation,
  loadSavedUserLocation,
  saveSavedUserLocation,
  clearSavedUserLocation,
  resolveUserLocation,
} from '../lib/userLocation';

type UserLocationContextValue = {
  savedLocation: SavedUserLocation | null;
  loading: boolean;
  setSavedLocation: (location: SavedUserLocation) => Promise<void>;
  clearSavedLocation: () => Promise<void>;
  resolveLocation: (options?: { gpsTimeoutMs?: number }) => Promise<ResolvedUserLocation>;
  refreshSavedLocation: () => Promise<void>;
};

const UserLocationContext = createContext<UserLocationContextValue | null>(null);

export function UserLocationProvider({ children }: { children: React.ReactNode }) {
  const [savedLocation, setSavedLocationState] = useState<SavedUserLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState(() => auth.currentUser?.uid ?? 'guest');

  const refreshSavedLocation = useCallback(async () => {
    const currentUid = auth.currentUser?.uid ?? 'guest';
    setUid(currentUid);
    setLoading(true);
    try {
      const location = await loadSavedUserLocation(currentUid);
      setSavedLocationState(location);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshSavedLocation();
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUid(user?.uid ?? 'guest');
      void refreshSavedLocation();
    });
    return unsubscribe;
  }, [refreshSavedLocation]);

  const setSavedLocation = useCallback(async (location: SavedUserLocation) => {
    const currentUid = auth.currentUser?.uid ?? uid ?? 'guest';
    await saveSavedUserLocation(currentUid, location);
    setSavedLocationState(location);
  }, [uid]);

  const clearSavedLocation = useCallback(async () => {
    const currentUid = auth.currentUser?.uid ?? uid ?? 'guest';
    await clearSavedUserLocation(currentUid);
    setSavedLocationState(null);
  }, [uid]);

  const resolveLocation = useCallback(
    (options?: { gpsTimeoutMs?: number }) => resolveUserLocation(savedLocation, options),
    [savedLocation],
  );

  const value = useMemo(
    () => ({
      savedLocation,
      loading,
      setSavedLocation,
      clearSavedLocation,
      resolveLocation,
      refreshSavedLocation,
    }),
    [savedLocation, loading, setSavedLocation, clearSavedLocation, resolveLocation, refreshSavedLocation],
  );

  return (
    <UserLocationContext.Provider value={value}>
      {children}
    </UserLocationContext.Provider>
  );
}

export function useUserLocation(): UserLocationContextValue {
  const ctx = useContext(UserLocationContext);
  if (!ctx) {
    throw new Error('useUserLocation must be used within UserLocationProvider');
  }
  return ctx;
}
