import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image,
  Modal, ScrollView, FlatList, LayoutAnimation, Pressable, Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { WebView } from 'react-native-webview';
import {
  Search, Filter, MapPin, X, ArrowRight, Heart, CalendarPlus,
  Sparkles, Navigation, Trash2, Plus, ChevronUp, Calendar,
} from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useGraphQL, gqlFetch } from '../../src/hooks/useGraphQL';
import { useRouter } from 'expo-router';
import { auth } from '../../src/lib/firebase';
import { useAppAlert } from '../../src/components/AppAlert';
import {
  type SavedRoutePlan,
  type ItineraryItemForRoute,
  type CustomRouteDestination,
  buildSavedRoutePlan,
  detectItineraryChanges,
  getPlannedDateKey,
  formatPlannedDateLabel,
  loadRoutePlan,
  saveRoutePlan,
  saveRoutePlanConfig,
  loadRoutePlanConfig,
  resolveStopOrder,
  buildResolvedPlanStops,
  customStopKey,
  eventStopKey,
  normalizePlannedDateInput,
} from '../../src/lib/routePlan';
import { getGoogleMapsApiKey, fetchPlaceDetails, geocodePlaceName, type PlaceSuggestion } from '../../src/lib/googlePlaces';
import { PlacesAutocompleteInput } from '../../src/components/common/PlacesAutocompleteInput';
import { RoutePlanStopList } from '../../src/components/RoutePlanStopList';
import { RoutePlanRenderer as RoutePlanView } from '../../src/components/RoutePlanRenderer';
import { useTheme } from '../../src/context/ThemeContext';
import { useUserLocation } from '../../src/context/UserLocationContext';
import { SetMyLocationModal } from '../../src/components/SetMyLocationModal';
import { formatListingPriceSummary, listingHasPrice } from '../../src/lib/listingPrice';

const API_BASE = (process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:3000/graphql').replace('/graphql', '');

function fixImageUrl(url?: string | null): string | null {
  if (!url) return null;
  return url.replace('http://localhost:3000', API_BASE);
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function parseCoord(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function hasValidCoords(listing: { lat?: unknown; lng?: unknown }): boolean {
  const lat = parseCoord(listing.lat);
  const lng = parseCoord(listing.lng);
  return lat != null && lng != null && lat !== 0 && lng !== 0;
}

function resolveNearbyListings(
  apiResults: any[],
  userLat: number,
  userLng: number,
  mappable: any[],
  radiusKm = 50,
): any[] {
  const coordsById = new Map(
    mappable
      .filter(hasValidCoords)
      .map((listing) => [listing.id, { lat: parseCoord(listing.lat)!, lng: parseCoord(listing.lng)! }]),
  );

  const enriched = apiResults.map((listing) => {
    const lat = parseCoord(listing.lat);
    const lng = parseCoord(listing.lng);
    if (lat != null && lng != null) return { ...listing, lat, lng };
    const fallback = coordsById.get(listing.id);
    return fallback ? { ...listing, lat: fallback.lat, lng: fallback.lng } : listing;
  });

  const withCoords = enriched.filter(hasValidCoords);
  const source = withCoords.length > 0
    ? withCoords
    : mappable.filter((listing) => haversineKm(userLat, userLng, listing.lat, listing.lng) <= radiusKm);

  return source
    .map((listing) => ({
      ...listing,
      lat: parseCoord(listing.lat)!,
      lng: parseCoord(listing.lng)!,
      distanceKm: haversineKm(userLat, userLng, parseCoord(listing.lat)!, parseCoord(listing.lng)!),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

const FEED_QUERY = `
  query MapFeed {
    searchListings(limit: 100) {
      listings { id title description type category price priceTiers { label price description } lat lng placeName imageUrl isPremium startDateTime }
    }
  }
`;

const NEARBY_QUERY = `
  query NearbyListings($lat: Float!, $lng: Float!, $radiusKm: Float, $limit: Int) {
    nearbyListings(lat: $lat, lng: $lng, radiusKm: $radiusKm, limit: $limit) {
      id title description type category price priceTiers { label price description } lat lng placeName imageUrl isPremium startDateTime
    }
  }
`;

const ITINERARY_QUERY = `
  query MyItinerary {
    myItinerary {
      id listingId plannedDate note
      listingTitle listingImageUrl listingType listingPlaceName
    }
  }
`;

const SAVED_LISTINGS_QUERY = `query SavedListings { savedListings { id } }`;
const UPDATE_LOCATION_MUTATION = `
  mutation UpdateUserLocation($lat: Float!, $lng: Float!) {
    updateUserLocation(lat: $lat, lng: $lng)
  }
`;
const SAVE_MUTATION   = `mutation SaveListing($listingId: ID!) { saveListing(listingId: $listingId) }`;
const UNSAVE_MUTATION = `mutation UnsaveListing($listingId: ID!) { unsaveListing(listingId: $listingId) }`;
const ADD_ITINERARY   = `mutation AddToItinerary($listingId: ID!, $plannedDate: String!, $note: String) {
  addToItinerary(listingId: $listingId, plannedDate: $plannedDate, note: $note) { id }
}`;
const GENERATE_ROUTE_PLAN = `
  mutation GenerateRoutePlan($startLocation: String, $travelMode: String, $stops: [RoutePlanStopInput!]) {
    generateRoutePlan(startLocation: $startLocation, travelMode: $travelMode, stops: $stops) {
      summary
      plan
    }
  }
`;

type TravelMode = 'PUBLIC_TRANSPORT' | 'RENTED_BIKE' | 'TUK_TUK' | 'PRIVATE_VEHICLE';
type RoutePhase = 'config' | 'preview' | 'saved';

const TRAVEL_MODES: { id: TravelMode; label: string }[] = [
  { id: 'PUBLIC_TRANSPORT', label: '🚌 Bus/Train' },
  { id: 'RENTED_BIKE', label: '🛵 Bike' },
  { id: 'TUK_TUK', label: '🛺 Tuk-tuk' },
  { id: 'PRIVATE_VEHICLE', label: '🚗 Private' },
];

const GMAPS_KEY = getGoogleMapsApiKey() || 'AIzaSyCAisocwaWcaNQxbt2MM9Kahvu-h3a24gc';

type FilterType = 'ALL' | 'EVENT' | 'RENTAL' | 'ACCOMMODATION' | 'ACTIVITY';
const FILTER_OPTIONS: FilterType[] = ['ALL', 'EVENT', 'RENTAL', 'ACCOMMODATION', 'ACTIVITY'];

// Injected into the WebView — calculates dot color from startDateTime
const MARKER_COLOR_JS = `
  function getMarkerColor(isoString) {
    if (!isoString) return '#0EA5A4';
    var diff = (new Date(isoString).getTime() - Date.now()) / 86400000;
    if (diff >= 0 && diff <= 7)  return '#EF4444';
    if (diff > 7  && diff <= 21) return '#F59E0B';
    return '#0EA5A4';
  }
`;

function buildMapHtml(
  listings: { id: string; lat: number; lng: number; startDateTime?: string | null }[],
  userLoc?: { lat: number; lng: number },
) {
  const json = JSON.stringify(listings);
  const centerLat = userLoc ? userLoc.lat : 7.8731;
  const centerLng = userLoc ? userLoc.lng : 80.7718;
  const zoom = userLoc ? 12 : 8;

  const userMarkerScript = userLoc ? `
    new google.maps.Marker({
      position: { lat: ${userLoc.lat}, lng: ${userLoc.lng} },
      map: map,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: '#3B82F6', fillOpacity: 1,
        strokeColor: '#FFFFFF', strokeWeight: 3, scale: 12,
      },
      title: 'You are here',
      zIndex: 999,
    });
  ` : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>* { margin:0; padding:0; } #map { width:100vw; height:100vh; }</style>
</head>
<body>
<div id="map"></div>
<script>
  ${MARKER_COLOR_JS}
  var listings = ${json};
  var markerMap = {};
  var currentSelected = null;
  var map;

  function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
      center: { lat: ${centerLat}, lng: ${centerLng} },
      zoom: ${zoom},
      disableDefaultUI: true,
      zoomControl: true,
      zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM },
    });

    ${userMarkerScript}

    listings.forEach(function(listing) {
      var color = getMarkerColor(listing.startDateTime);
      var marker = new google.maps.Marker({
        position: { lat: listing.lat, lng: listing.lng },
        map: map,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: color, fillOpacity: 1,
          strokeColor: '#FFFFFF', strokeWeight: 3, scale: 10,
        },
      });
      marker._color = color;
      marker.addListener('click', function() {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SELECT', id: listing.id }));
      });
      markerMap[listing.id] = marker;
    });

    map.addListener('click', function() {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DESELECT' }));
    });
  }

  function selectMarker(id) {
    if (currentSelected && markerMap[currentSelected]) {
      var prev = markerMap[currentSelected];
      prev.setIcon({
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: prev._color || '#0EA5A4', fillOpacity: 1,
        strokeColor: '#FFFFFF', strokeWeight: 3, scale: 10,
      });
    }
    currentSelected = id;
    if (id && markerMap[id]) {
      markerMap[id].setIcon({
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: '#0B1220', fillOpacity: 1,
        strokeColor: '#FFFFFF', strokeWeight: 3, scale: 14,
      });
    }
  }
</script>
<script src="https://maps.googleapis.com/maps/api/js?key=${GMAPS_KEY}&callback=initMap&loading=async" defer></script>
</body>
</html>`;
}

function formatRouteMarkerDate(plannedDate: string): string {
  const parsed = new Date(plannedDate);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function buildRouteMapHtml(
  stops: {
    id: string;
    lat: number;
    lng: number;
    title: string;
    plannedDate: string;
    dateLabel?: string;
    kind?: 'event' | 'custom';
  }[],
) {
  const enriched = stops.map((stop, index) => ({
    ...stop,
    order: index + 1,
    dateLabel: stop.dateLabel ?? formatRouteMarkerDate(stop.plannedDate),
    isCustom: stop.kind === 'custom',
  }));
  const json = JSON.stringify(enriched);
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>* { margin:0; padding:0; } #map { width:100vw; height:100vh; }</style>
</head>
<body>
<div id="map"></div>
<script>
  var stops = ${json};
  var markerMap = {};
  var currentSelected = null;
  var map;

  function escapeXml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function createRouteMarkerIcon(order, dateLabel, selected, isCustom) {
    var fill = selected ? '#0B1220' : (isCustom ? '#F59E0B' : '#0EA5A4');
    var pillFill = selected ? (isCustom ? '#F59E0B' : '#0EA5A4') : '#0B1220';
    var safeOrder = escapeXml(order);
    var safeDate = escapeXml(dateLabel || '');
    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="84" viewBox="0 0 64 84">' +
        '<defs>' +
          '<filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">' +
            '<feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.25"/>' +
          '</filter>' +
        '</defs>' +
        '<g filter="url(#shadow)">' +
          '<path d="M32 78 C32 78 10 50 10 30 C10 17.85 20.15 8 32 8 C43.85 8 54 17.85 54 30 C54 50 32 78 32 78 Z" fill="' + fill + '" stroke="#FFFFFF" stroke-width="2.5"/>' +
          '<circle cx="32" cy="30" r="13" fill="rgba(255,255,255,0.18)"/>' +
          '<text x="32" y="35" text-anchor="middle" fill="#FFFFFF" font-size="14" font-weight="bold" font-family="Arial,sans-serif">' + safeOrder + '</text>' +
        '</g>' +
        '<rect x="6" y="58" rx="9" ry="9" width="52" height="20" fill="' + pillFill + '" stroke="#FFFFFF" stroke-width="1.5"/>' +
        '<text x="32" y="72" text-anchor="middle" fill="#FFFFFF" font-size="10" font-weight="700" font-family="Arial,sans-serif">' + safeDate + '</text>' +
      '</svg>';
    return {
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
      scaledSize: new google.maps.Size(48, 63),
      anchor: new google.maps.Point(24, 63),
    };
  }

  function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
      center: { lat: 7.8731, lng: 80.7718 },
      zoom: 8,
      disableDefaultUI: true,
      zoomControl: true,
      zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM },
    });

    if (stops.length === 0) return;

    var bounds = new google.maps.LatLngBounds();

    stops.forEach(function(stop, index) {
      var pos = { lat: stop.lat, lng: stop.lng };
      bounds.extend(pos);
      var order = stop.order || (index + 1);
      var dateLabel = stop.dateLabel || '';
      var isCustom = !!stop.isCustom;
      var marker = new google.maps.Marker({
        position: pos,
        map: map,
        title: stop.title + (dateLabel ? ' · ' + dateLabel : ''),
        icon: createRouteMarkerIcon(order, dateLabel, false, isCustom),
        zIndex: index + 1,
      });
      marker._order = order;
      marker._dateLabel = dateLabel;
      marker._isCustom = isCustom;
      marker.addListener('click', function() {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SELECT', id: stop.id }));
      });
      markerMap[stop.id] = marker;
    });

    if (stops.length > 1) {
      new google.maps.Polyline({
        path: stops.map(function(s) { return { lat: s.lat, lng: s.lng }; }),
        geodesic: true,
        strokeColor: '#0EA5A4',
        strokeOpacity: 0.85,
        strokeWeight: 3,
        map: map,
      });
    }

    map.fitBounds(bounds, { top: 80, right: 40, bottom: 220, left: 40 });
  }

  function selectMarker(id) {
    Object.keys(markerMap).forEach(function(key) {
      var marker = markerMap[key];
      var selected = key === id;
      marker.setIcon(createRouteMarkerIcon(marker._order, marker._dateLabel, selected, marker._isCustom));
      marker.setZIndex(selected ? 999 : marker._order);
    });
    currentSelected = id;
  }
</script>
<script src="https://maps.googleapis.com/maps/api/js?key=${GMAPS_KEY}&callback=initMap&loading=async" defer></script>
</body>
</html>`;
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function hasValidRouteCoords(stop: { lat?: number; lng?: number }) {
  return typeof stop.lat === 'number'
    && typeof stop.lng === 'number'
    && Number.isFinite(stop.lat)
    && Number.isFinite(stop.lng)
    && !(stop.lat === 0 && stop.lng === 0);
}

export default function MapScreen() {
  const webViewRef = useRef<WebView>(null);
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { savedLocation, resolveLocation } = useUserLocation();
  const [setLocationModalVisible, setSetLocationModalVisible] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stalePromptDismissedRef = useRef(false);
  const routeConfigLoadedRef = useRef(false);
  const { show: showAlert, alertEl } = useAppAlert();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [addedId, setAddedId] = useState<string | null>(null);
  const [mapMode, setMapMode] = useState<'explore' | 'route'>('explore');

  // Route planner state
  const [savedRoutePlan, setSavedRoutePlan] = useState<SavedRoutePlan | null>(null);
  const [routePhase, setRoutePhase] = useState<RoutePhase>('config');
  const [draftPlan, setDraftPlan] = useState<{ summary: string; plan: string } | null>(null);
  const [startLocation, setStartLocation] = useState('');
  const [travelMode, setTravelMode] = useState<TravelMode>('PRIVATE_VEHICLE');
  const [routeGenerating, setRouteGenerating] = useState(false);
  const [routeSaving, setRouteSaving] = useState(false);
  const [customDestinations, setCustomDestinations] = useState<CustomRouteDestination[]>([]);
  const [stopOrder, setStopOrder] = useState<string[]>([]);
  const [excludedEventIds, setExcludedEventIds] = useState<string[]>([]);
  const [showAddDestination, setShowAddDestination] = useState(false);
  const [addDestinationQuery, setAddDestinationQuery] = useState('');
  const [addingDestination, setAddingDestination] = useState(false);
  const [pendingDestination, setPendingDestination] = useState<PlaceSuggestion | null>(null);
  const [addDestinationDate, setAddDestinationDate] = useState(startOfToday);
  const [showAddDestinationDatePicker, setShowAddDestinationDatePicker] = useState(false);
  const [startLocLoading, setStartLocLoading] = useState(false);
  const [routeOverlayExpanded, setRouteOverlayExpanded] = useState(true);

  // Search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('ALL');
  const [filterVisible, setFilterVisible] = useState(false);

  // Near Me
  const [nearMeActive, setNearMeActive] = useState(false);
  const [nearMeLoading, setNearMeLoading] = useState(false);
  const [nearMeError, setNearMeError] = useState<string | null>(null);
  const [nearbyResults, setNearbyResults] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapSearchCenter, setMapSearchCenter] = useState<{ lat: number; lng: number } | null>(null);

  const { data, loading } = useGraphQL<{ searchListings: { listings: any[] } }>(FEED_QUERY);
  const { data: savedData, refetch: refetchSaved } = useGraphQL<{ savedListings: { id: string }[] }>(SAVED_LISTINGS_QUERY);
  const { data: itineraryData } = useGraphQL<{ myItinerary: ItineraryItemForRoute[] }>(ITINERARY_QUERY);

  const itineraryItems = itineraryData?.myItinerary ?? [];

  const listings = data?.searchListings?.listings ?? [];
  const mappable = listings.filter((l) => l.lat && l.lng && l.lat !== 0 && l.lng !== 0);

  function handleSearchChange(text: string) {
    setSearchQuery(text);
    if (!text.trim()) setMapSearchCenter(null);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => setSearchText(text), 300);
  }

  async function handleMapPlaceSelected(suggestion: { placeId: string; description: string; mainText: string }) {
    setSearchQuery(suggestion.description);
    setSearchText(suggestion.mainText);
    setNearMeActive(false);
    setNearbyResults([]);
    setSelectedId(null);

    const details = await fetchPlaceDetails(suggestion.placeId);
    if (details) {
      setMapSearchCenter({ lat: details.lat, lng: details.lng });
    }
  }

  function clearMapSearch() {
    setSearchQuery('');
    setSearchText('');
    setMapSearchCenter(null);
  }

  // Filtered listings: nearMe → search text → type
  const filteredListings = useMemo(() => {
    let result = nearMeActive
      ? nearbyResults.filter(hasValidCoords)
      : mappable;

    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      result = result.filter(
        (l) =>
          l.title?.toLowerCase().includes(q) ||
          l.description?.toLowerCase().includes(q) ||
          l.placeName?.toLowerCase().includes(q),
      );
    }

    if (filterType !== 'ALL') {
      result = result.filter((l) => l.type === filterType);
    }

    return result;
  }, [nearMeActive, nearbyResults, mappable, searchText, filterType]);

  const nearbyStripList = useMemo(
    () => (nearMeActive ? nearbyResults.filter(hasValidCoords) : []),
    [nearMeActive, nearbyResults],
  );

  const exploreMarkersKey = useMemo(
    () => filteredListings.map((l) => `${l.id}:${l.lat}:${l.lng}`).join('|'),
    [filteredListings],
  );

  const resolvedStopOrder = useMemo(
    () => resolveStopOrder(itineraryItems, customDestinations, stopOrder, excludedEventIds),
    [itineraryItems, customDestinations, stopOrder, excludedEventIds],
  );

  const routeStops = useMemo(() => {
    if (!resolvedStopOrder.length && !itineraryItems.length && !customDestinations.length) return [];
    const listingById = new Map(mappable.map((listing) => [listing.id, listing]));
    const resolved = buildResolvedPlanStops(resolvedStopOrder, itineraryItems, customDestinations, listingById);
    return resolved.map((stop) => ({
      id: stop.id,
      lat: stop.lat,
      lng: stop.lng,
      title: stop.title,
      description: stop.description,
      type: stop.type,
      placeName: stop.placeName,
      imageUrl: stop.imageUrl,
      price: stop.price,
      plannedDate: stop.plannedDate,
      dateLabel: formatRouteMarkerDate(stop.plannedDate),
      startDateTime: stop.startDateTime,
      kind: stop.kind,
      stopKey: stop.key,
      itineraryItemId: stop.itineraryItemId,
      customId: stop.customId,
    }));
  }, [itineraryItems, customDestinations, resolvedStopOrder, mappable]);

  useEffect(() => {
    setStopOrder((prev) => {
      const next = resolveStopOrder(itineraryItems, customDestinations, prev, excludedEventIds);
      if (next.join('|') === prev.join('|')) return prev;
      return next;
    });
  }, [itineraryItems, customDestinations, excludedEventIds]);

  useEffect(() => {
    if (!routeConfigLoadedRef.current) return;
    const uid = auth?.currentUser?.uid ?? 'guest';
    void saveRoutePlanConfig(uid, { stopOrder, customDestinations, excludedEventIds });
  }, [stopOrder, customDestinations, excludedEventIds]);

  const refreshSavedRoutePlan = useCallback(async () => {
    const uid = auth?.currentUser?.uid ?? 'guest';
    const config = await loadRoutePlanConfig(uid);
    const plan = await loadRoutePlan(uid, itineraryItems);

    if (config.customDestinations.length || config.stopOrder.length || config.excludedEventIds.length) {
      setCustomDestinations(config.customDestinations.map((entry) => ({
        ...entry,
        plannedDate: entry.plannedDate ?? normalizePlannedDateInput(new Date()),
      })));
      if (config.stopOrder.length) setStopOrder(config.stopOrder);
      setExcludedEventIds(config.excludedEventIds);
    } else {
      if (plan?.customDestinations?.length) {
        setCustomDestinations(plan.customDestinations.map((entry) => ({
          ...entry,
          plannedDate: entry.plannedDate ?? normalizePlannedDateInput(new Date()),
        })));
      }
      if (plan?.stopOrder?.length) setStopOrder(plan.stopOrder);
      if (plan?.excludedEventIds?.length) setExcludedEventIds(plan.excludedEventIds);
    }

    routeConfigLoadedRef.current = true;
    setSavedRoutePlan(plan);
    if (plan) {
      setRoutePhase('saved');
      setRouteOverlayExpanded(false);
    } else if (routeStops.length > 0) {
      setRoutePhase('config');
      setRouteOverlayExpanded(true);
    }
  }, [itineraryItems, routeStops.length]);

  useFocusEffect(
    useCallback(() => {
      void refreshSavedRoutePlan();
    }, [refreshSavedRoutePlan]),
  );

  const checkStaleRoutePlan = useCallback(() => {
    if (!savedRoutePlan || stalePromptDismissedRef.current || routePhase === 'preview') return;
    const changes = detectItineraryChanges(savedRoutePlan.itinerarySnapshot, itineraryItems);
    if (!changes.hasNewItems) return;

    showAlert({
      type: 'confirm',
      title: 'Itinerary updated',
      message: 'New itinerary items were added. Generate a new route plan?',
      confirmText: 'Generate',
      cancelText: 'Not now',
      onConfirm: () => {
        stalePromptDismissedRef.current = false;
        setRoutePhase('config');
        setRouteOverlayExpanded(true);
        setDraftPlan(null);
      },
      onCancel: () => {
        stalePromptDismissedRef.current = true;
      },
    });
  }, [savedRoutePlan, itineraryItems, routePhase, showAlert]);

  useEffect(() => {
    if (mapMode === 'route') {
      checkStaleRoutePlan();
    }
  }, [mapMode, savedRoutePlan, itineraryItems.length, checkStaleRoutePlan]);

  useEffect(() => {
    if (mapMode === 'route' && routeStops.length > 0 && !savedRoutePlan && routePhase !== 'preview') {
      setRoutePhase('config');
      setRouteOverlayExpanded(true);
    }
  }, [mapMode, routeStops.length, savedRoutePlan, routePhase]);

  async function handleUseMyLocation() {
    setStartLocLoading(true);
    try {
      const resolved = await resolveLocation();
      setStartLocation(resolved.label);
    } catch (e: any) {
      showAlert({ type: 'error', title: 'Location error', message: e?.message ?? 'Could not get location.' });
    } finally {
      setStartLocLoading(false);
    }
  }

  async function handleRemoveFromRoutePlan(itemId: string) {
    const removed = itineraryItems.find((i) => i.id === itemId);
    const nextExcluded = excludedEventIds.includes(itemId)
      ? excludedEventIds
      : [...excludedEventIds, itemId];
    const nextOrder = stopOrder.filter((key) => key !== eventStopKey(itemId));
    const uid = auth?.currentUser?.uid ?? 'guest';
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExcludedEventIds(nextExcluded);
    setStopOrder(nextOrder);
    if (selectedId && removed?.listingId === selectedId) {
      setSelectedId(null);
    }
    await saveRoutePlanConfig(uid, {
      stopOrder: nextOrder,
      customDestinations,
      excludedEventIds: nextExcluded,
    });
  }

  async function handleRemoveCustomDestination(customId: string) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const nextCustoms = customDestinations.filter((entry) => entry.id !== customId);
    const nextOrder = stopOrder.filter((key) => key !== customStopKey(customId));
    setCustomDestinations(nextCustoms);
    setStopOrder(nextOrder);
    if (selectedId === `custom:${customId}`) setSelectedId(null);
    const uid = auth?.currentUser?.uid ?? 'guest';
    await saveRoutePlanConfig(uid, {
      stopOrder: nextOrder,
      customDestinations: nextCustoms,
      excludedEventIds,
    });
  }

  async function handleAddCustomDestination(suggestion: PlaceSuggestion, travelDate: Date) {
    if (addingDestination) return;

    const fullName = suggestion.description.trim() || suggestion.mainText.trim();
    if (!fullName) return;

    const plannedDate = normalizePlannedDateInput(travelDate);
    const customId = `custom-${Date.now()}`;
    const stopKey = customStopKey(customId);
    const optimistic: CustomRouteDestination = {
      id: customId,
      placeId: suggestion.placeId,
      title: fullName,
      placeName: fullName,
      lat: 0,
      lng: 0,
      plannedDate,
    };

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCustomDestinations((prev) => {
      const next = [...prev, optimistic];
      setStopOrder((orderPrev) => resolveStopOrder(itineraryItems, next, orderPrev, excludedEventIds));
      return next;
    });
    resetAddDestinationForm();

    setAddingDestination(true);
    try {
      let lat: number | undefined;
      let lng: number | undefined;
      let placeName = fullName;

      const details = await fetchPlaceDetails(suggestion.placeId);
      if (details?.lat != null && details?.lng != null) {
        lat = details.lat;
        lng = details.lng;
        placeName = details.formattedAddress || fullName;
      } else {
        const geocoded = await geocodePlaceName(fullName);
        if (geocoded?.lat != null && geocoded?.lng != null) {
          lat = geocoded.lat;
          lng = geocoded.lng;
          placeName = geocoded.formattedAddress || fullName;
        }
      }

      if (lat == null || lng == null) {
        setCustomDestinations((prev) => prev.filter((entry) => entry.id !== customId));
        setStopOrder((prev) => prev.filter((key) => key !== stopKey));
        showAlert({ type: 'error', title: 'Place not found', message: 'Could not load location for that place.' });
        return;
      }

      setCustomDestinations((prev) =>
        prev.map((entry) =>
          entry.id === customId
            ? { ...entry, lat, lng, placeName }
            : entry,
        ),
      );
    } catch {
      setCustomDestinations((prev) => prev.filter((entry) => entry.id !== customId));
      setStopOrder((prev) => prev.filter((key) => key !== stopKey));
      showAlert({ type: 'error', title: 'Add failed', message: 'Could not add that destination.' });
    } finally {
      setAddingDestination(false);
    }
  }

  async function handleGenerateRoutePlan() {
    if (!routeStops.length) return;
    setRouteGenerating(true);
    try {
      const stopsInput = routeStops.map((stop: any, index: number) => ({
        title: stop.title,
        placeName: stop.placeName ?? '',
        type: stop.type ?? (stop.kind === 'custom' ? 'PLACE' : 'EVENT'),
        plannedDate: stop.plannedDate,
        lat: stop.lat,
        lng: stop.lng,
        isCustom: stop.kind === 'custom',
        visitOrder: index + 1,
        note: stop.kind === 'custom' ? 'Custom destination added by traveler' : undefined,
      }));
      const result = await gqlFetch<{ generateRoutePlan: { summary: string; plan: string } }>(
        GENERATE_ROUTE_PLAN,
        {
          startLocation: startLocation.trim() || undefined,
          travelMode,
          stops: stopsInput,
        },
      );
      setDraftPlan(result.generateRoutePlan);
      setRoutePhase('preview');
      setRouteOverlayExpanded(true);
      stalePromptDismissedRef.current = false;
    } catch (e: any) {
      showAlert({ type: 'error', title: 'Generation failed', message: e?.message ?? 'Could not generate route plan.' });
    } finally {
      setRouteGenerating(false);
    }
  }

  async function handleSaveRoutePlan() {
    if (!draftPlan) return;
    setRouteSaving(true);
    try {
      const uid = auth?.currentUser?.uid ?? 'guest';
      const listingById = new Map(mappable.map((listing) => [listing.id, listing]));
      const order = resolveStopOrder(itineraryItems, customDestinations, stopOrder, excludedEventIds);
      const resolved = buildResolvedPlanStops(order, itineraryItems, customDestinations, listingById);
      const plan = buildSavedRoutePlan(draftPlan.summary, draftPlan.plan, itineraryItems, {
        stopOrder: order,
        customDestinations,
        resolvedStops: resolved,
        excludedEventIds,
      });
      await saveRoutePlan(uid, plan);
      await saveRoutePlanConfig(uid, { stopOrder: order, customDestinations, excludedEventIds });
      setSavedRoutePlan(plan);
      setDraftPlan(null);
      setRoutePhase('saved');
      setRouteOverlayExpanded(false);
      stalePromptDismissedRef.current = false;
      showAlert({ type: 'success', title: 'Plan saved', message: 'Your route plan is now linked to your itinerary cards.' });
    } catch {
      showAlert({ type: 'error', title: 'Save failed', message: 'Could not save the route plan.' });
    } finally {
      setRouteSaving(false);
    }
  }

  function handleClearDraftPlan() {
    setDraftPlan(null);
    setRoutePhase(savedRoutePlan ? 'saved' : 'config');
    setRouteOverlayExpanded(!savedRoutePlan);
  }

  function switchToRouteMode() {
    setMapMode('route');
    setSelectedId(null);
    if (savedRoutePlan) {
      setRoutePhase('saved');
      setRouteOverlayExpanded(false);
    } else if (routeStops.length > 0) {
      setRoutePhase('config');
      setRouteOverlayExpanded(true);
    }
  }

  const selectedListing =
    mapMode === 'route'
      ? (routeStops as any[]).find((s) => s.id === selectedId) ?? null
      : filteredListings.find((l) => l.id === selectedId) ?? null;

  const savedIds = new Set((savedData?.savedListings ?? []).map((l) => l.id));

  const exploreMapHtml = useMemo(
    () =>
      buildMapHtml(
        filteredListings.map((l) => ({ id: l.id, lat: l.lat, lng: l.lng, startDateTime: l.startDateTime })),
        mapSearchCenter ?? userLocation ?? undefined,
      ),
    [exploreMarkersKey, mapSearchCenter, userLocation],
  );

  const mappableRouteStops = useMemo(
    () => (routeStops as any[]).filter(hasValidRouteCoords),
    [routeStops],
  );

  const routeStopsKey = mappableRouteStops
    .map((s: any) => `${s.id}:${s.plannedDate}:${s.lat}:${s.lng}:${s.kind ?? 'event'}`)
    .join('|');
  const routeMapHtml = useMemo(
    () => buildRouteMapHtml(mappableRouteStops),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [routeStopsKey],
  );

  const mapHtml = mapMode === 'route' ? routeMapHtml : exploreMapHtml;
  const exploreMapKey = `explore-${exploreMarkersKey}-${userLocation?.lat ?? 'x'}-${userLocation?.lng ?? 'x'}-${mapSearchCenter?.lat ?? 'y'}-${mapSearchCenter?.lng ?? 'y'}`;

  useEffect(() => {
    webViewRef.current?.injectJavaScript(
      `if (typeof selectMarker === 'function') { selectMarker(${selectedId ? `"${selectedId}"` : 'null'}); } true;`,
    );
  }, [selectedId]);

  function handleWebViewMessage(event: { nativeEvent: { data: string } }) {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'SELECT') setSelectedId(msg.id);
      else if (msg.type === 'DESELECT') setSelectedId(null);
    } catch {}
  }

  async function handleNearMe() {
    if (nearMeActive) {
      setNearMeActive(false);
      setNearbyResults([]);
      setUserLocation(null);
      setNearMeError(null);
      setSelectedId(null);
      return;
    }
    setNearMeLoading(true);
    setNearMeError(null);
    setSearchQuery('');
    setSearchText('');
    setMapSearchCenter(null);
    setFilterType('ALL');
    try {
      const resolved = await resolveLocation();
      const { lat, lng } = resolved;
      setUserLocation({ lat, lng });
      if (resolved.source === 'gps') {
        void gqlFetch(UPDATE_LOCATION_MUTATION, { lat, lng }).catch(() => {});
      }

      const result = await gqlFetch<{ nearbyListings: any[] }>(NEARBY_QUERY, {
        lat, lng, radiusKm: 50, limit: 40,
      }).catch(() => null);

      const nearby = resolveNearbyListings(
        result?.nearbyListings ?? [],
        lat,
        lng,
        mappable,
        50,
      );

      setNearbyResults(nearby);
      setNearMeActive(true);
      setSelectedId(null);
      if (nearby.length === 0) {
        setNearMeError('No listings within 50 km of your location.');
      } else {
        setNearMeError(null);
      }
    } catch (e: any) {
      setNearMeError(e?.message ?? 'Could not get location. Try again.');
    } finally {
      setNearMeLoading(false);
    }
  }

  async function toggleSave(listingId: string) {
    setSaveLoading(true);
    const isSaved = savedIds.has(listingId);
    await gqlFetch(isSaved ? UNSAVE_MUTATION : SAVE_MUTATION, { listingId }).catch(() => {});
    await refetchSaved();
    setSaveLoading(false);
  }

  async function handleAddToPlan(listing: any) {
    const plannedDate = listing.startDateTime
      ? new Date(listing.startDateTime).toISOString()
      : new Date().toISOString();
    await gqlFetch(ADD_ITINERARY, { listingId: listing.id, plannedDate }).catch(() => {});
    setAddedId(listing.id);
    setTimeout(() => {
      setAddedId(null);
      router.push('/(tabs)/saved?tab=itinerary' as any);
    }, 1500);
  }

  function handleAiPlan(listing: any) {
    const params = new URLSearchParams({
      planWith: listing.title,
      planPlace: listing.placeName ?? '',
      listingId: listing.id,
    });
    router.push(`/(tabs)/saved?${params.toString()}` as any);
  }

  const activeCount = mapMode === 'route' ? routeStops.length : filteredListings.length;

  function resetAddDestinationForm() {
    setShowAddDestination(false);
    setAddDestinationQuery('');
    setPendingDestination(null);
    setAddDestinationDate(startOfToday());
    setShowAddDestinationDatePicker(false);
  }

  function minimizeRoutePlanner() {
    setRouteOverlayExpanded(false);
    resetAddDestinationForm();
  }

  function expandRoutePlanner() {
    setRouteOverlayExpanded(true);
  }

  const routePlannerMinimizedTitle = routePhase === 'preview'
    ? 'AI route preview'
    : routePhase === 'saved'
      ? 'Route plan saved'
      : 'Plan your route';

  return (
    <View style={styles.container}>
      {alertEl}
      <WebView
        key={mapMode === 'route' ? `route-${routeStopsKey || 'empty'}` : exploreMapKey}
        ref={webViewRef}
        source={{ html: mapHtml }}
        style={styles.map}
        onMessage={handleWebViewMessage}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState={false}
      />

      {/* Explore / My Route Plan toggle + set location */}
      <View style={styles.modeToggleRow}>
        <View style={[styles.modeToggle, { backgroundColor: isDark ? 'rgba(11,18,32,0.93)' : 'rgba(255,255,255,0.93)' }]}>
          <TouchableOpacity
            style={[styles.modePill, mapMode === 'explore' && styles.modePillActive]}
            onPress={() => { setMapMode('explore'); setSelectedId(null); }}
          >
            <Text style={[styles.modePillText, { color: colors.textMuted }, mapMode === 'explore' && styles.modePillTextActive]}>
              Explore
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modePill, mapMode === 'route' && styles.modePillActive]}
            onPress={switchToRouteMode}
          >
            <Text style={[styles.modePillText, { color: colors.textMuted }, mapMode === 'route' && styles.modePillTextActive]}>
              My Route Plan
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[
            styles.setLocationBtn,
            { backgroundColor: isDark ? 'rgba(11,18,32,0.93)' : 'rgba(255,255,255,0.93)' },
            savedLocation && styles.setLocationBtnActive,
          ]}
          onPress={() => setSetLocationModalVisible(true)}
          accessibilityLabel="Set my location"
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <MapPin size={16} color={savedLocation ? '#FFFFFF' : '#0EA5A4'} />
          {savedLocation ? <View style={styles.setLocationDot} /> : null}
        </TouchableOpacity>
      </View>

      <SetMyLocationModal
        visible={setLocationModalVisible}
        onClose={() => setSetLocationModalVisible(false)}
      />

      {/* Search bar + filter (explore only) */}
      {mapMode === 'explore' && (
        <View style={styles.searchContainer}>
          <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Search size={20} color={colors.textMuted} />
            <PlacesAutocompleteInput
              inputStyle={[styles.searchInput, { color: colors.text }]}
              value={searchQuery}
              onChangeText={handleSearchChange}
              onSelectSuggestion={handleMapPlaceSelected}
              placeholder="Search Sri Lanka…"
              placeholderTextColor={colors.textMuted}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={clearMapSearch}>
                <X size={16} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[styles.filterButton, { backgroundColor: colors.surface, borderColor: colors.border }, filterType !== 'ALL' && styles.filterButtonActive]}
            onPress={() => setFilterVisible(true)}
          >
            <Filter size={20} color={filterType !== 'ALL' ? '#FFFFFF' : '#0EA5A4'} />
            {filterType !== 'ALL' && <View style={styles.filterActiveDot} />}
          </TouchableOpacity>
        </View>
      )}

      {/* Near Me pill (explore only) */}
      {mapMode === 'explore' && (
        <View style={styles.nearMeRow}>
          <TouchableOpacity
            onPress={handleNearMe}
            disabled={nearMeLoading}
            style={[
              styles.nearMeBtn,
              nearMeActive && styles.nearMeBtnActive,
              nearMeLoading && styles.nearMeBtnLoading,
            ]}
          >
            {nearMeLoading
              ? <ActivityIndicator size="small" color="#FFFFFF" />
              : <Navigation size={14} color="#FFFFFF" />
            }
            <Text style={styles.nearMeBtnText}>
              {nearMeLoading ? 'Locating…' : nearMeActive ? '✕ All Listings' : 'Near Me'}
            </Text>
          </TouchableOpacity>
          {nearMeError && <Text style={styles.nearMeError}>{nearMeError}</Text>}
        </View>
      )}

      {/* Loading overlay */}
      {loading && mapMode === 'explore' && !nearMeActive && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#0EA5A4" />
          <Text style={styles.loadingText}>Loading map…</Text>
        </View>
      )}

      {/* Route planner overlay */}
      {mapMode === 'route' && routeStops.length > 0 && routeOverlayExpanded && (
        <>
          <Pressable
            style={styles.routePlannerBackdrop}
            onPress={minimizeRoutePlanner}
            accessibilityRole="button"
            accessibilityLabel="Minimize route planner"
          />
          <View style={styles.routePlannerOverlay}>
            <ScrollView
            style={styles.routePlannerScroll}
            contentContainerStyle={styles.routePlannerContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            scrollEnabled
          >
            {routePhase === 'preview' && draftPlan ? (
              <>
                <View style={styles.routeSummaryBox}>
                  <Sparkles size={16} color="#0EA5A4" />
                  <Text style={styles.routeSummaryText}>{draftPlan.summary}</Text>
                </View>
                <RoutePlanView plan={draftPlan.plan} />
                <View style={styles.routePlannerActions}>
                  <TouchableOpacity
                    style={styles.routeSaveBtn}
                    onPress={handleSaveRoutePlan}
                    disabled={routeSaving}
                  >
                    {routeSaving
                      ? <ActivityIndicator size="small" color="#FFFFFF" />
                      : <Text style={styles.routeSaveBtnText}>Save Plan</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.routeClearBtn} onPress={handleClearDraftPlan}>
                    <Text style={styles.routeClearBtnText}>Clear</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.routePlannerTitle}>Plan your route</Text>
                <Text style={styles.routePlannerSub}>
                  Add destinations with a travel date. Stops are ordered by date for your AI route plan.
                </Text>

                <TouchableOpacity
                  style={styles.routeAddDestBtn}
                  onPress={() => {
                    setShowAddDestination(true);
                    setPendingDestination(null);
                    setAddDestinationDate(startOfToday());
                    setShowAddDestinationDatePicker(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Plus size={18} color="#0EA5A4" />
                  <Text style={styles.routeAddDestText}>Add destination</Text>
                </TouchableOpacity>

                {showAddDestination && (
                  <View style={styles.routeAddDestSearchWrap}>
                    <PlacesAutocompleteInput
                      containerStyle={styles.routeAddDestAutocomplete}
                      inputStyle={styles.routeStartInputInner}
                      value={addDestinationQuery}
                      onChangeText={(text) => {
                        setAddDestinationQuery(text);
                        if (!text.trim()) setPendingDestination(null);
                      }}
                      placeholder="Search places in Sri Lanka…"
                      placeholderTextColor="#9CA3AF"
                      dropdownMaxHeight={160}
                      editable={!addingDestination}
                      autoFocus
                      onSelectSuggestion={(suggestion) => {
                        setPendingDestination(suggestion);
                        setAddDestinationQuery(suggestion.description.trim() || suggestion.mainText.trim());
                      }}
                    />

                    <TouchableOpacity
                      style={styles.routeAddDestDateBtn}
                      onPress={() => setShowAddDestinationDatePicker(true)}
                      activeOpacity={0.8}
                    >
                      <Calendar size={16} color="#0EA5A4" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.routeAddDestDateLabel}>Travel date</Text>
                        <Text style={styles.routeAddDestDateText}>
                          {addDestinationDate.toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {showAddDestinationDatePicker && (
                      <DateTimePicker
                        value={addDestinationDate}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        minimumDate={startOfToday()}
                        onChange={(_, date) => {
                          if (Platform.OS === 'android') setShowAddDestinationDatePicker(false);
                          if (date) setAddDestinationDate(date);
                        }}
                      />
                    )}

                    {pendingDestination && (
                      <TouchableOpacity
                        style={[styles.routeAddDestConfirmBtn, addingDestination && { opacity: 0.6 }]}
                        onPress={() => {
                          void handleAddCustomDestination(pendingDestination, addDestinationDate);
                        }}
                        disabled={addingDestination}
                        activeOpacity={0.85}
                      >
                        {addingDestination
                          ? <ActivityIndicator size="small" color="#FFFFFF" />
                          : <Text style={styles.routeAddDestConfirmText}>Add to route</Text>}
                      </TouchableOpacity>
                    )}

                    {addingDestination && !pendingDestination && (
                      <ActivityIndicator size="small" color="#0EA5A4" style={{ marginTop: 8 }} />
                    )}
                    <TouchableOpacity
                      onPress={resetAddDestinationForm}
                      style={{ marginTop: 8, alignSelf: 'flex-end' }}
                    >
                      <Text style={{ fontSize: 12, color: '#667085', fontWeight: '600' }}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <RoutePlanStopList
                  stops={routeStops as any[]}
                  onRemoveEvent={handleRemoveFromRoutePlan}
                  onRemoveCustom={handleRemoveCustomDestination}
                  fixImageUrl={fixImageUrl}
                />

                <Text style={styles.routeFieldLabel}>Starting from</Text>
                <View style={styles.routeStartRow}>
                  <PlacesAutocompleteInput
                    containerStyle={styles.routeStartAutocomplete}
                    inputStyle={styles.routeStartInputInner}
                    value={startLocation}
                    onChangeText={setStartLocation}
                    placeholder="Colombo, Kandy, your hotel…"
                    placeholderTextColor="#9CA3AF"
                    dropdownMaxHeight={160}
                  />
                  {startLocation.length > 0 && (
                    <TouchableOpacity onPress={() => setStartLocation('')} style={styles.routeStartClear}>
                      <X size={14} color="#9CA3AF" />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.routeGpsBtn}
                    onPress={handleUseMyLocation}
                    disabled={startLocLoading}
                  >
                    {startLocLoading
                      ? <ActivityIndicator size="small" color="#0EA5A4" />
                      : <Navigation size={14} color="#0EA5A4" />}
                  </TouchableOpacity>
                </View>
                <Text style={styles.routeFieldLabel}>Mode of travel</Text>
                <View style={styles.travelModeRow}>
                  {TRAVEL_MODES.map((mode) => (
                    <TouchableOpacity
                      key={mode.id}
                      style={[styles.travelModePill, travelMode === mode.id && styles.travelModePillActive]}
                      onPress={() => setTravelMode(mode.id)}
                    >
                      <Text style={[styles.travelModeText, travelMode === mode.id && styles.travelModeTextActive]}>
                        {mode.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity
                  style={styles.routeGenerateBtn}
                  onPress={handleGenerateRoutePlan}
                  disabled={routeGenerating}
                >
                  {routeGenerating
                    ? <ActivityIndicator size="small" color="#FFFFFF" />
                    : <>
                        <Sparkles size={16} color="#FFFFFF" />
                        <Text style={styles.routeGenerateBtnText}>Generate AI Route Plan</Text>
                      </>}
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
        </>
      )}

      {mapMode === 'route' && routeStops.length > 0 && routePhase === 'saved' && savedRoutePlan && !routeOverlayExpanded && (
        <TouchableOpacity
          style={styles.routeSavedPill}
          onPress={() => router.push('/(tabs)/saved?tab=itinerary' as any)}
          activeOpacity={0.85}
        >
          <Text style={styles.routeSavedPillText}>✓ Plan saved · View in Itinerary →</Text>
        </TouchableOpacity>
      )}

      {mapMode === 'route' && routeStops.length > 0 && !routeOverlayExpanded && (
        <TouchableOpacity
          style={styles.routePlannerMinimized}
          onPress={expandRoutePlanner}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Expand route planner"
        >
          <View style={styles.routePlannerMinimizedLeft}>
            <Sparkles size={16} color="#0EA5A4" />
            <View style={{ flex: 1 }}>
              <Text style={styles.routePlannerMinimizedTitle}>{routePlannerMinimizedTitle}</Text>
              <Text style={styles.routePlannerMinimizedSub}>
                {routeStops.length} stop{routeStops.length === 1 ? '' : 's'} · Tap to expand
              </Text>
            </View>
          </View>
          <ChevronUp size={18} color="#0EA5A4" />
        </TouchableOpacity>
      )}

      {/* Route mode empty state */}
      {mapMode === 'route' && routeStops.length === 0 && (
        <View style={styles.routeEmptyOverlay}>
          <Text style={styles.routeEmptyIcon}>🗺️</Text>
          <Text style={styles.routeEmptyTitle}>No route planned yet</Text>
          <Text style={styles.routeEmptySub}>
            Add events to your itinerary or search for any place to build a route.
          </Text>
          <TouchableOpacity
            style={styles.routeGoBtn}
            onPress={() => router.push('/(tabs)/saved?tab=itinerary' as any)}
          >
            <Text style={styles.routeGoBtnText}>Open Itinerary</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Count badge */}
      {!selectedListing
        && (mapMode === 'route' ? routeStops.length > 0 : !loading)
        && (activeCount > 0 || nearMeActive)
        && !(mapMode === 'explore' && nearMeActive && nearbyStripList.length > 0)
        && (
        <View style={[
          styles.countBadge,
          nearMeActive && styles.countBadgeNearMe,
          mapMode === 'route' && styles.countBadgeRoute,
        ]}>
          <MapPin size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={styles.countText}>
            {activeCount} {mapMode === 'route' ? 'stops' : nearMeActive ? 'nearby' : 'locations'}
          </Text>
        </View>
      )}

      {/* "Added to plan" banner */}
      {addedId && addedId === selectedId && (
        <View style={styles.addedBanner}>
          <Text style={styles.addedBannerText}>📅 Added to plan!</Text>
        </View>
      )}

      {/* Selected listing card */}
      {selectedListing && (
        <View style={styles.cardContainer}>
          <View style={styles.card}>
            <TouchableOpacity style={styles.cardDismiss} onPress={() => setSelectedId(null)}>
              <X size={16} color="#667085" />
            </TouchableOpacity>

            <View style={styles.cardTop}>
              {fixImageUrl(selectedListing.imageUrl) ? (
                <Image source={{ uri: fixImageUrl(selectedListing.imageUrl)! }} style={styles.cardImage} />
              ) : (
                <View style={styles.cardIconBox}>
                  <MapPin size={28} color="#0EA5A4" />
                </View>
              )}
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle} numberOfLines={1}>{selectedListing.title}</Text>
                {selectedListing.placeName
                  ? <Text style={styles.cardPlace} numberOfLines={1}>📍 {selectedListing.placeName}</Text>
                  : null}
                {mapMode === 'route' && selectedListing.plannedDate && (
                  <Text style={styles.cardPlannedDate}>
                    📅 {new Date(selectedListing.plannedDate).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}
                  </Text>
                )}
                <View style={styles.cardMeta}>
                  <Text style={styles.cardType}>{selectedListing.type}</Text>
                  {listingHasPrice(selectedListing)
                    ? <Text style={styles.cardPrice}>{formatListingPriceSummary(selectedListing)}</Text>
                    : null}
                </View>
              </View>
            </View>

            <Text style={styles.cardDescription} numberOfLines={2}>{selectedListing.description}</Text>

            <View style={styles.cardActions}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnSave]}
                onPress={() => toggleSave(selectedListing.id)}
                disabled={saveLoading}
              >
                <Heart
                  size={15}
                  color={savedIds.has(selectedListing.id) ? '#EF4444' : '#667085'}
                  fill={savedIds.has(selectedListing.id) ? '#EF4444' : 'none'}
                />
                <Text style={[styles.actionBtnText, savedIds.has(selectedListing.id) && styles.actionBtnTextSaved]}>
                  {savedIds.has(selectedListing.id) ? 'Saved' : 'Save'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnPlan]}
                onPress={() => handleAddToPlan(selectedListing)}
              >
                <CalendarPlus size={15} color="#0EA5A4" />
                <Text style={[styles.actionBtnText, { color: '#0EA5A4' }]}>Add to Plan</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnAi]}
                onPress={() => handleAiPlan(selectedListing)}
              >
                <Sparkles size={15} color="#7C3AED" />
                <Text style={[styles.actionBtnText, { color: '#7C3AED' }]}>AI Plan</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.viewBtn}
                onPress={() => router.push(`/listing/${selectedListing.id}` as any)}
              >
                <Text style={styles.viewBtnText}>View</Text>
                <ArrowRight size={14} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Nearby suggestions strip — last overlay so it renders above the WebView */}
      {mapMode === 'explore' && nearMeActive && nearbyStripList.length > 0 && (
        <View
          style={[
            styles.nearbyStrip,
            {
              backgroundColor: isDark ? 'rgba(11,18,32,0.97)' : 'rgba(255,255,255,0.98)',
              borderTopColor: colors.border,
              bottom: selectedListing ? 248 : 8,
            },
          ]}
        >
          <Text style={[styles.nearbyStripTitle, { color: colors.text }]}>
            Near {savedLocation?.label ?? 'you'} · {nearbyStripList.length} found
          </Text>
          <FlatList
            horizontal
            data={nearbyStripList.slice(0, 12)}
            keyExtractor={(listing) => listing.id}
            showsHorizontalScrollIndicator={false}
            style={styles.nearbyStripScroll}
            contentContainerStyle={styles.nearbyStripContent}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item: listing }) => {
              const isSelected = selectedId === listing.id;
              const distanceLabel = typeof listing.distanceKm === 'number'
                ? `${listing.distanceKm < 1 ? '<1' : Math.round(listing.distanceKm)} km`
                : null;
              return (
                <TouchableOpacity
                  style={[
                    styles.nearbyChip,
                    { borderColor: colors.border, backgroundColor: colors.surface },
                    isSelected && styles.nearbyChipActive,
                  ]}
                  onPress={() => setSelectedId(listing.id)}
                  activeOpacity={0.85}
                >
                  {fixImageUrl(listing.imageUrl) ? (
                    <Image source={{ uri: fixImageUrl(listing.imageUrl)! }} style={styles.nearbyChipImage} />
                  ) : (
                    <View style={[styles.nearbyChipImage, styles.nearbyChipImageFallback]}>
                      <MapPin size={16} color="#0EA5A4" />
                    </View>
                  )}
                  <View style={styles.nearbyChipBody}>
                    <Text style={[styles.nearbyChipTitle, { color: colors.text }]} numberOfLines={2}>
                      {listing.title}
                    </Text>
                    <View style={styles.nearbyChipMeta}>
                      <Text style={styles.nearbyChipType}>{listing.type}</Text>
                      {distanceLabel ? <Text style={styles.nearbyChipDistance}>{distanceLabel}</Text> : null}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}

      {/* Filter bottom sheet */}
      <Modal
        visible={filterVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterVisible(false)}
      >
        <TouchableOpacity
          style={styles.filterOverlay}
          activeOpacity={1}
          onPress={() => setFilterVisible(false)}
        >
          <View style={styles.filterSheet}>
            <View style={styles.filterSheetHandle} />
            <Text style={styles.filterSheetTitle}>Filter by Type</Text>
            <View style={styles.filterChips}>
              {FILTER_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.filterChip, filterType === opt && styles.filterChipActive]}
                  onPress={() => { setFilterType(opt); setFilterVisible(false); }}
                >
                  <Text style={[styles.filterChipText, filterType === opt && styles.filterChipTextActive]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },

  // Mode toggle
  modeToggleRow: {
    position: 'absolute',
    top: 48,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 20,
  },
  modeToggle: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.93)',
    borderRadius: 999,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  setLocationBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  setLocationBtnActive: {
    backgroundColor: '#0EA5A4',
  },
  setLocationDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#F59E0B',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  modePill: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 999 },
  modePillActive: { backgroundColor: '#0EA5A4' },
  modePillText: { fontSize: 13, fontWeight: 'bold', color: '#667085' },
  modePillTextActive: { color: '#FFFFFF' },

  // Search + filter
  searchContainer: {
    position: 'absolute', top: 112, left: 24, right: 24,
    zIndex: 20, flexDirection: 'row', gap: 12,
  },
  searchBar: {
    flex: 1, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
    borderWidth: 1, borderColor: '#E5E7EB', gap: 10,
    zIndex: 25,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#0B1220', paddingVertical: 0 },
  filterButton: {
    backgroundColor: '#FFFFFF', padding: 12, borderRadius: 999,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  filterButtonActive: { backgroundColor: '#0EA5A4', borderColor: '#0EA5A4' },
  filterActiveDot: {
    position: 'absolute', top: 6, right: 6,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#EF4444', borderWidth: 1.5, borderColor: '#FFFFFF',
  },

  // Near Me
  nearMeRow: {
    position: 'absolute', top: 176, left: 24,
    zIndex: 10, flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  nearMeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#10B981', paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: 999,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18, shadowRadius: 8, elevation: 6,
  },
  nearMeBtnActive: { backgroundColor: '#F59E0B' },
  nearMeBtnLoading: { backgroundColor: '#6B7280' },
  nearMeBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },
  nearMeError: {
    backgroundColor: 'rgba(239,68,68,0.9)', color: '#FFFFFF',
    fontSize: 11, fontWeight: '600', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8,
  },

  // Loading
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center', justifyContent: 'center', gap: 12, zIndex: 5,
  },
  loadingText: { fontSize: 14, color: '#667085', fontWeight: '600' },

  // Route empty state
  routeEmptyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center', justifyContent: 'center', gap: 8,
    zIndex: 5, paddingHorizontal: 40,
  },
  routeEmptyIcon: { fontSize: 48, marginBottom: 4 },
  routeEmptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#0B1220' },
  routeEmptySub: { fontSize: 14, color: '#667085', textAlign: 'center', lineHeight: 20 },
  routeGoBtn: {
    marginTop: 12, backgroundColor: '#0EA5A4',
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 999,
  },
  routeGoBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },

  // Count badge
  countBadge: {
    position: 'absolute', bottom: 32, alignSelf: 'center',
    backgroundColor: '#0B1220', paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 999, flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 6, zIndex: 8,
  },
  countBadgeNearMe: { backgroundColor: '#10B981' },
  countBadgeRoute: { backgroundColor: '#0EA5A4' },
  countText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },

  nearbyStrip: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 35,
    minHeight: 132,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 24,
  },
  nearbyStripTitle: {
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  nearbyStripScroll: {
    height: 80,
    flexGrow: 0,
  },
  nearbyStripContent: {
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  nearbyChip: {
    width: 220,
    height: 72,
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    marginRight: 10,
  },
  nearbyChipActive: {
    borderColor: '#0EA5A4',
    borderWidth: 2,
  },
  nearbyChipImage: {
    width: 72,
    height: 72,
  },
  nearbyChipImageFallback: {
    backgroundColor: '#E6FFFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nearbyChipBody: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    justifyContent: 'center',
    gap: 4,
  },
  nearbyChipTitle: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 17,
  },
  nearbyChipMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  nearbyChipType: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0EA5A4',
    textTransform: 'uppercase',
  },
  nearbyChipDistance: {
    fontSize: 10,
    fontWeight: '600',
    color: '#667085',
  },

  // Added banner
  addedBanner: {
    position: 'absolute', bottom: 220, alignSelf: 'center',
    backgroundColor: '#0EA5A4', paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 999, zIndex: 30,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 10,
  },
  addedBannerText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },

  // Card
  cardContainer: { position: 'absolute', bottom: 24, left: 16, right: 16, zIndex: 20 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18, shadowRadius: 20, elevation: 14,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  cardDismiss: { position: 'absolute', top: 12, right: 12, zIndex: 2, padding: 4 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, marginRight: 28 },
  cardImage: { width: 64, height: 64, borderRadius: 12, flexShrink: 0 },
  cardIconBox: {
    width: 64, height: 64, borderRadius: 12,
    backgroundColor: '#E0F6F6', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  cardInfo: { flex: 1, marginLeft: 12 },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#0B1220', marginBottom: 2 },
  cardPlace: { fontSize: 11, color: '#667085', marginBottom: 2 },
  cardPlannedDate: { fontSize: 11, color: '#0EA5A4', fontWeight: '600', marginBottom: 4 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardType: { fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', fontWeight: 'bold' },
  cardPrice: { fontSize: 13, fontWeight: 'bold', color: '#0EA5A4' },
  cardDescription: { fontSize: 12, color: '#667085', lineHeight: 18, marginBottom: 12 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, borderWidth: 1,
  },
  actionBtnSave: { borderColor: '#E5E7EB' },
  actionBtnPlan: { borderColor: '#CCFBF1' },
  actionBtnAi: { borderColor: '#EDE9FE' },
  actionBtnText: { fontSize: 11, fontWeight: 'bold', color: '#667085' },
  actionBtnTextSaved: { color: '#EF4444' },
  viewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto',
    backgroundColor: '#0EA5A4', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
  },
  viewBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },

  // Filter sheet
  filterOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  filterSheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 24, paddingTop: 12, paddingBottom: 48,
  },
  filterSheetHandle: {
    width: 40, height: 4, backgroundColor: '#E5E7EB',
    borderRadius: 2, alignSelf: 'center', marginBottom: 20,
  },
  filterSheetTitle: { fontSize: 17, fontWeight: 'bold', color: '#0B1220', marginBottom: 16 },
  filterChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  filterChip: {
    paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: 999, borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  filterChipActive: { backgroundColor: '#0EA5A4', borderColor: '#0EA5A4' },
  filterChipText: { fontSize: 13, fontWeight: 'bold', color: '#667085' },
  filterChipTextActive: { color: '#FFFFFF' },

  // Route planner overlay
  routePlannerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 11,
    backgroundColor: 'rgba(11, 18, 32, 0.18)',
  },
  routePlannerOverlay: {
    position: 'absolute',
    top: 100,
    left: 16,
    right: 16,
    maxHeight: '58%',
    zIndex: 13,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
    overflow: 'visible',
  },
  routePlannerScroll: { flex: 1 },
  routePlannerContent: { padding: 16, paddingBottom: 20 },
  routePlannerTitle: { fontSize: 17, fontWeight: '800', color: '#0B1220', marginBottom: 4 },
  routePlannerSub: { fontSize: 12, color: '#667085', marginBottom: 12 },
  routeStopList: { gap: 8, marginBottom: 14 },
  routeStopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  routeStopRowCustom: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  routeStopLabelRow: { flexDirection: 'row', marginBottom: 2 },
  routeStopKind: {
    fontSize: 9,
    fontWeight: '800',
    color: '#667085',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  routeStopActions: { flexDirection: 'column', alignItems: 'center', gap: 2 },
  routeMoveBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CCFBF1',
    backgroundColor: '#F0FDF9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeMoveBtnDisabled: { opacity: 0.35 },
  routeAddDestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#0EA5A4',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 12,
    backgroundColor: '#F0FDF9',
  },
  routeAddDestText: { color: '#0EA5A4', fontWeight: '800', fontSize: 13 },
  routeAddDestSearchWrap: { marginBottom: 14, zIndex: 50 },
  routeAddDestAutocomplete: { zIndex: 60 },
  routeAddDestDateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    backgroundColor: '#FFFFFF',
  },
  routeAddDestDateLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#667085',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  routeAddDestDateText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0B1220',
  },
  routeAddDestConfirmBtn: {
    marginTop: 12,
    backgroundColor: '#0EA5A4',
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeAddDestConfirmText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  routeStopBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#0EA5A4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeStopBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  routeStopTitle: { fontSize: 13, fontWeight: '700', color: '#0B1220' },
  routeStopMeta: { fontSize: 11, color: '#667085', marginTop: 1 },
  routeStopDate: { fontSize: 10, color: '#0EA5A4', fontWeight: '600', marginTop: 2 },
  routeStopRemoveBtn: { padding: 6, marginLeft: 4 },
  routeFieldLabel: { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 6 },
  routeStartRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 14,
    zIndex: 30,
  },
  routeStartAutocomplete: { flex: 1, zIndex: 40 },
  routeStartInputInner: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0B1220',
  },
  routeStartClear: { padding: 4, marginTop: 10 },
  routeGpsBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CCFBF1',
    backgroundColor: '#F0FDF9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  travelModeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  travelModePill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  travelModePillActive: { backgroundColor: '#0EA5A4', borderColor: '#0EA5A4' },
  travelModeText: { fontSize: 11, fontWeight: '700', color: '#667085' },
  travelModeTextActive: { color: '#FFFFFF' },
  routeGenerateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0EA5A4',
    paddingVertical: 14,
    borderRadius: 999,
  },
  routeGenerateBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  routeSummaryBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F0FDF9',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    marginBottom: 12,
  },
  routeSummaryText: { flex: 1, fontSize: 13, color: '#0F766E', lineHeight: 19, fontWeight: '600' },
  routePlannerActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  routeSaveBtn: {
    flex: 1,
    backgroundColor: '#0EA5A4',
    paddingVertical: 13,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeSaveBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  routeClearBtn: {
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeClearBtnText: { color: '#667085', fontWeight: '700', fontSize: 13 },
  routeSavedPill: {
    position: 'absolute',
    bottom: 28,
    alignSelf: 'center',
    backgroundColor: '#0B1220',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    zIndex: 11,
  },
  routeSavedPillText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  routePlannerMinimized: {
    position: 'absolute',
    top: 100,
    left: 16,
    right: 16,
    zIndex: 13,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 8,
  },
  routePlannerMinimizedLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingRight: 8,
  },
  routePlannerMinimizedTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0B1220',
  },
  routePlannerMinimizedSub: {
    fontSize: 11,
    color: '#667085',
    marginTop: 2,
    fontWeight: '600',
  },
});
