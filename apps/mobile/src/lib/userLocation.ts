import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

const STORAGE_PREFIX = '@ceylonify/user_location_';

export type SavedUserLocation = {
  label: string;
  placeId?: string;
  lat: number;
  lng: number;
  updatedAt: number;
};

export type ResolvedUserLocation = {
  lat: number;
  lng: number;
  label: string;
  source: 'saved' | 'gps';
};

function storageKey(uid: string): string {
  return `${STORAGE_PREFIX}${uid}`;
}

export async function loadSavedUserLocation(uid: string): Promise<SavedUserLocation | null> {
  const raw = await AsyncStorage.getItem(storageKey(uid));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SavedUserLocation;
    if (typeof parsed.lat !== 'number' || typeof parsed.lng !== 'number' || !parsed.label) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function saveSavedUserLocation(uid: string, location: SavedUserLocation): Promise<void> {
  await AsyncStorage.setItem(storageKey(uid), JSON.stringify(location));
}

export async function clearSavedUserLocation(uid: string): Promise<void> {
  await AsyncStorage.removeItem(storageKey(uid));
}

export async function resolveUserLocation(
  saved: SavedUserLocation | null,
  options?: { gpsTimeoutMs?: number },
): Promise<ResolvedUserLocation> {
  if (saved) {
    return {
      lat: saved.lat,
      lng: saved.lng,
      label: saved.label,
      source: 'saved',
    };
  }

  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Location permission denied');
  }

  let loc = await Location.getLastKnownPositionAsync();
  if (!loc) {
    loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
      timeoutMs: options?.gpsTimeoutMs ?? 10_000,
    });
  }
  if (!loc) {
    throw new Error('No location found. Set a location manually or use emulator Extended Controls.');
  }

  const { latitude: lat, longitude: lng } = loc.coords;
  let label = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

  try {
    const [geo] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    const parts = [geo?.name, geo?.city, geo?.region].filter(Boolean);
    if (parts.length) label = parts.join(', ');
  } catch {
    // keep coordinate fallback label
  }

  return { lat, lng, label, source: 'gps' };
}
