import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image,
  TextInput, Modal,
} from 'react-native';
import { WebView } from 'react-native-webview';
import {
  Search, Filter, MapPin, X, ArrowRight, Heart, CalendarPlus,
  Sparkles, Navigation,
} from 'lucide-react-native';
import * as Location from 'expo-location';
import { useGraphQL, gqlFetch } from '../../src/hooks/useGraphQL';
import { useRouter } from 'expo-router';

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

const FEED_QUERY = `
  query MapFeed {
    searchListings(limit: 100) {
      listings { id title description type category price lat lng placeName imageUrl isPremium startDateTime }
    }
  }
`;

const NEARBY_QUERY = `
  query NearbyListings($lat: Float!, $lng: Float!, $radiusKm: Float, $limit: Int) {
    nearbyListings(lat: $lat, lng: $lng, radiusKm: $radiusKm, limit: $limit) {
      id title description type category price lat lng placeName imageUrl isPremium startDateTime
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
const SAVE_MUTATION   = `mutation SaveListing($listingId: ID!) { saveListing(listingId: $listingId) }`;
const UNSAVE_MUTATION = `mutation UnsaveListing($listingId: ID!) { unsaveListing(listingId: $listingId) }`;
const ADD_ITINERARY   = `mutation AddToItinerary($listingId: ID!, $plannedDate: String!, $note: String) {
  addToItinerary(listingId: $listingId, plannedDate: $plannedDate, note: $note) { id }
}`;

const GMAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ?? 'AIzaSyCAisocwaWcaNQxbt2MM9Kahvu-h3a24gc';

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

function buildRouteMapHtml(
  stops: { id: string; lat: number; lng: number; title: string; plannedDate: string }[],
) {
  const json = JSON.stringify(stops);
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
      var marker = new google.maps.Marker({
        position: pos,
        map: map,
        label: {
          text: String(index + 1),
          color: '#FFFFFF',
          fontWeight: 'bold',
          fontSize: '11px',
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: '#0EA5A4', fillOpacity: 1,
          strokeColor: '#FFFFFF', strokeWeight: 2, scale: 16,
        },
        zIndex: index + 1,
      });
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
    if (currentSelected && markerMap[currentSelected]) {
      markerMap[currentSelected].setIcon({
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: '#0EA5A4', fillOpacity: 1,
        strokeColor: '#FFFFFF', strokeWeight: 2, scale: 16,
      });
    }
    currentSelected = id;
    if (id && markerMap[id]) {
      markerMap[id].setIcon({
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: '#0B1220', fillOpacity: 1,
        strokeColor: '#FFFFFF', strokeWeight: 2, scale: 18,
      });
    }
  }
</script>
<script src="https://maps.googleapis.com/maps/api/js?key=${GMAPS_KEY}&callback=initMap&loading=async" defer></script>
</body>
</html>`;
}

export default function MapScreen() {
  const webViewRef = useRef<WebView>(null);
  const router = useRouter();
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [addedId, setAddedId] = useState<string | null>(null);
  const [mapMode, setMapMode] = useState<'explore' | 'route'>('explore');

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

  const { data, loading } = useGraphQL<{ searchListings: { listings: any[] } }>(FEED_QUERY);
  const { data: savedData, refetch: refetchSaved } = useGraphQL<{ savedListings: { id: string }[] }>(SAVED_LISTINGS_QUERY);
  const { data: itineraryData } = useGraphQL<{ myItinerary: any[] }>(ITINERARY_QUERY);

  const listings = data?.searchListings?.listings ?? [];
  const mappable = listings.filter((l) => l.lat && l.lng && l.lat !== 0 && l.lng !== 0);

  function handleSearchChange(text: string) {
    setSearchQuery(text);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => setSearchText(text), 300);
  }

  // Filtered listings: nearMe → search text → type
  const filteredListings = useMemo(() => {
    let result = nearMeActive
      ? nearbyResults.filter((l) => l.lat && l.lng && l.lat !== 0 && l.lng !== 0)
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

  // Route stops: cross-reference itinerary with mappable for lat/lng, sorted by plannedDate
  const routeStops = useMemo(() => {
    const items = itineraryData?.myItinerary ?? [];
    if (!items.length) return [];
    const byId = new Map(mappable.map((l) => [l.id, l]));
    return items
      .map((item: any) => {
        const listing = byId.get(item.listingId);
        if (!listing?.lat || !listing?.lng) return null;
        return {
          id: item.listingId,
          lat: listing.lat,
          lng: listing.lng,
          title: item.listingTitle ?? listing.title,
          description: listing.description,
          type: item.listingType ?? listing.type,
          placeName: item.listingPlaceName ?? listing.placeName,
          imageUrl: listing.imageUrl,
          price: listing.price,
          plannedDate: item.plannedDate,
          startDateTime: listing.startDateTime,
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => new Date(a.plannedDate).getTime() - new Date(b.plannedDate).getTime());
  }, [itineraryData, mappable]);

  const selectedListing =
    mapMode === 'route'
      ? (routeStops as any[]).find((s) => s.id === selectedId) ?? null
      : filteredListings.find((l) => l.id === selectedId) ?? null;

  const savedIds = new Set((savedData?.savedListings ?? []).map((l) => l.id));

  const exploreMapHtml = useMemo(
    () =>
      buildMapHtml(
        filteredListings.map((l) => ({ id: l.id, lat: l.lat, lng: l.lng, startDateTime: l.startDateTime })),
        userLocation ?? undefined,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filteredListings.length, nearMeActive, searchText, filterType, userLocation],
  );

  const routeMapHtml = useMemo(
    () => buildRouteMapHtml(routeStops as any[]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [routeStops.length],
  );

  const mapHtml = mapMode === 'route' ? routeMapHtml : exploreMapHtml;

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
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setNearMeError('Location permission denied');
        return;
      }
      let loc = await Location.getLastKnownPositionAsync();
      if (!loc) {
        loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          timeoutMs: 10_000,
        });
      }
      if (!loc) throw new Error('No location found. Set a mock location via emulator Extended Controls.');
      const { latitude: lat, longitude: lng } = loc.coords;
      setUserLocation({ lat, lng });

      const result = await gqlFetch<{ nearbyListings: any[] }>(NEARBY_QUERY, {
        lat, lng, radiusKm: 50, limit: 40,
      });
      let nearby = result?.nearbyListings ?? [];

      // Client-side fallback when PostGIS returns nothing (e.g. missing geometry data)
      if (nearby.length === 0) {
        nearby = mappable.filter((l) => haversineKm(lat, lng, l.lat, l.lng) <= 50);
      }

      setNearbyResults(nearby);
      setNearMeActive(true);
      setSelectedId(null);
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

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: mapHtml }}
        style={styles.map}
        onMessage={handleWebViewMessage}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState={false}
      />

      {/* Explore / My Route Plan toggle */}
      <View style={styles.modeToggle}>
        <TouchableOpacity
          style={[styles.modePill, mapMode === 'explore' && styles.modePillActive]}
          onPress={() => { setMapMode('explore'); setSelectedId(null); }}
        >
          <Text style={[styles.modePillText, mapMode === 'explore' && styles.modePillTextActive]}>
            Explore
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modePill, mapMode === 'route' && styles.modePillActive]}
          onPress={() => { setMapMode('route'); setSelectedId(null); }}
        >
          <Text style={[styles.modePillText, mapMode === 'route' && styles.modePillTextActive]}>
            My Route Plan
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search bar + filter (explore only) */}
      {mapMode === 'explore' && (
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search size={20} color="#667085" />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={handleSearchChange}
              placeholder="Search Sri Lanka…"
              placeholderTextColor="#9CA3AF"
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchText(''); }}>
                <X size={16} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[styles.filterButton, filterType !== 'ALL' && styles.filterButtonActive]}
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

      {/* Route mode empty state */}
      {mapMode === 'route' && routeStops.length === 0 && (
        <View style={styles.routeEmptyOverlay}>
          <Text style={styles.routeEmptyIcon}>🗺️</Text>
          <Text style={styles.routeEmptyTitle}>No route planned yet</Text>
          <Text style={styles.routeEmptySub}>Add listings to your itinerary to see them here.</Text>
          <TouchableOpacity
            style={styles.routeGoBtn}
            onPress={() => router.push('/(tabs)/saved?tab=itinerary' as any)}
          >
            <Text style={styles.routeGoBtnText}>Open Itinerary</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Count badge */}
      {!selectedListing && (mapMode === 'route' ? routeStops.length > 0 : !loading) && activeCount > 0 && (
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
                  {selectedListing.price
                    ? <Text style={styles.cardPrice}>LKR {Number(selectedListing.price).toLocaleString()}</Text>
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
  modeToggle: {
    position: 'absolute', top: 48, alignSelf: 'center',
    flexDirection: 'row', gap: 4, zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.93)',
    borderRadius: 999, padding: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 8, elevation: 6,
  },
  modePill: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 999 },
  modePillActive: { backgroundColor: '#0EA5A4' },
  modePillText: { fontSize: 13, fontWeight: 'bold', color: '#667085' },
  modePillTextActive: { color: '#FFFFFF' },

  // Search + filter
  searchContainer: {
    position: 'absolute', top: 112, left: 24, right: 24,
    zIndex: 10, flexDirection: 'row', gap: 12,
  },
  searchBar: {
    flex: 1, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
    borderWidth: 1, borderColor: '#E5E7EB', gap: 10,
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
});
