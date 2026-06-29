export type PlaceSuggestion = {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
};

export type PlaceDetails = {
  placeId: string;
  formattedAddress: string;
  lat: number;
  lng: number;
};

export function getGoogleMapsApiKey(): string {
  return (
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
    ?? process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY
    ?? ''
  );
}

type AutocompleteResponse = {
  status: string;
  predictions?: Array<{
    place_id: string;
    description: string;
    structured_formatting?: {
      main_text?: string;
      secondary_text?: string;
    };
  }>;
  error_message?: string;
};

type DetailsResponse = {
  status: string;
  result?: {
    formatted_address?: string;
    geometry?: { location?: { lat?: number; lng?: number } };
  };
  error_message?: string;
};

export async function fetchPlaceSuggestions(input: string): Promise<PlaceSuggestion[]> {
  const key = getGoogleMapsApiKey();
  const trimmed = input.trim();
  if (!key || trimmed.length < 2) return [];

  const params = new URLSearchParams({
    input: trimmed,
    key,
    components: 'country:lk',
  });

  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) return [];

  const data = (await res.json()) as AutocompleteResponse;
  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') return [];

  return (data.predictions ?? []).map((prediction) => ({
    placeId: prediction.place_id,
    description: prediction.description,
    mainText: prediction.structured_formatting?.main_text ?? prediction.description,
    secondaryText: prediction.structured_formatting?.secondary_text ?? '',
  }));
}

export async function geocodePlaceName(query: string): Promise<PlaceDetails | null> {
  const key = getGoogleMapsApiKey();
  const trimmed = query.trim();
  if (!key || !trimmed) return null;

  const params = new URLSearchParams({
    address: trimmed,
    key,
    components: 'country:LK',
  });

  const url = `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) return null;

  const data = (await res.json()) as {
    status: string;
    results?: Array<{
      formatted_address?: string;
      geometry?: { location?: { lat?: number; lng?: number } };
      place_id?: string;
    }>;
  };

  if (data.status !== 'OK' || !data.results?.length) return null;

  const result = data.results[0];
  const lat = result.geometry?.location?.lat;
  const lng = result.geometry?.location?.lng;
  if (lat == null || lng == null) return null;

  return {
    placeId: result.place_id ?? '',
    formattedAddress: result.formatted_address ?? trimmed,
    lat,
    lng,
  };
}

export async function fetchPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  const key = getGoogleMapsApiKey();
  if (!key || !placeId) return null;

  const params = new URLSearchParams({
    place_id: placeId,
    key,
    fields: 'formatted_address,geometry',
  });

  const url = `https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) return null;

  const data = (await res.json()) as DetailsResponse;
  if (data.status !== 'OK' || !data.result?.geometry?.location) return null;

  const { lat, lng } = data.result.geometry.location;
  if (lat == null || lng == null) return null;

  return {
    placeId,
    formattedAddress: data.result.formatted_address ?? '',
    lat,
    lng,
  };
}
