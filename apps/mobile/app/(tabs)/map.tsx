import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Search, Filter, MapPin, X, ArrowRight, Heart, CalendarPlus, Sparkles } from 'lucide-react-native';
import { useGraphQL, gqlFetch } from '../../src/hooks/useGraphQL';
import { useRouter } from 'expo-router';

const API_BASE = (process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:3000/graphql').replace('/graphql', '');

function fixImageUrl(url?: string | null): string | null {
  if (!url) return null;
  return url.replace('http://localhost:3000', API_BASE);
}

const FEED_QUERY = `
  query MapFeed {
    searchListings(limit: 100) {
      listings { id title description type category price lat lng placeName imageUrl isPremium }
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

function buildMapHtml(listings: { id: string; lat: number; lng: number }[]) {
  const json = JSON.stringify(listings);
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>* { margin:0; padding:0; } #map { width:100vw; height:100vh; }</style>
</head>
<body>
<div id="map"></div>
<script>
  var listings = ${json};
  var markerMap = {};
  var currentSelected = null;
  var map;

  var ICON_NORMAL = {
    path: 0,
    fillColor: '#0EA5A4', fillOpacity: 1,
    strokeColor: '#FFFFFF', strokeWeight: 3, scale: 10,
  };
  var ICON_ACTIVE = {
    path: 0,
    fillColor: '#0B1220', fillOpacity: 1,
    strokeColor: '#FFFFFF', strokeWeight: 3, scale: 14,
  };

  function initMap() {
    ICON_NORMAL.path = google.maps.SymbolPath.CIRCLE;
    ICON_ACTIVE.path = google.maps.SymbolPath.CIRCLE;

    map = new google.maps.Map(document.getElementById('map'), {
      center: { lat: 7.8731, lng: 80.7718 },
      zoom: 8,
      disableDefaultUI: true,
      zoomControl: true,
      zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM },
    });

    listings.forEach(function(listing) {
      var marker = new google.maps.Marker({
        position: { lat: listing.lat, lng: listing.lng },
        map: map,
        icon: Object.assign({}, ICON_NORMAL),
      });
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
      markerMap[currentSelected].setIcon(Object.assign({}, ICON_NORMAL));
    }
    currentSelected = id;
    if (id && markerMap[id]) {
      markerMap[id].setIcon(Object.assign({}, ICON_ACTIVE));
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [addedId, setAddedId] = useState<string | null>(null);

  const { data, loading } = useGraphQL<{ searchListings: { listings: any[] } }>(FEED_QUERY);
  const { data: savedData, refetch: refetchSaved } = useGraphQL<{ savedListings: { id: string }[] }>(SAVED_LISTINGS_QUERY);

  const listings = data?.searchListings?.listings ?? [];
  const mappable = listings.filter((l) => l.lat && l.lng && l.lat !== 0 && l.lng !== 0);
  const selectedListing = mappable.find((l) => l.id === selectedId) ?? null;
  const savedIds = new Set((savedData?.savedListings ?? []).map((l) => l.id));

  const mapHtml = useMemo(
    () => buildMapHtml(mappable.map((l) => ({ id: l.id, lat: l.lat, lng: l.lng }))),
    [mappable.length], // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    webViewRef.current?.injectJavaScript(
      `if (typeof selectMarker === 'function') { selectMarker(${selectedId ? `"${selectedId}"` : 'null'}); } true;`
    );
  }, [selectedId]);

  function handleWebViewMessage(event: { nativeEvent: { data: string } }) {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'SELECT') setSelectedId(msg.id);
      else if (msg.type === 'DESELECT') setSelectedId(null);
    } catch {}
  }

  async function toggleSave(listingId: string) {
    setSaveLoading(true);
    const isSaved = savedIds.has(listingId);
    await gqlFetch(isSaved ? UNSAVE_MUTATION : SAVE_MUTATION, { listingId }).catch(() => {});
    await refetchSaved();
    setSaveLoading(false);
  }

  async function handleAddToPlan(listingId: string) {
    const today = new Date().toISOString().split('T')[0];
    await gqlFetch(ADD_ITINERARY, { listingId, plannedDate: today }).catch(() => {});
    setAddedId(listingId);
    setTimeout(() => setAddedId(null), 2500);
  }

  function handleAiPlan(listing: any) {
    const planWith = encodeURIComponent(listing.title);
    const planPlace = encodeURIComponent(listing.placeName ?? '');
    router.push(`/(tabs)/saved?planWith=${planWith}&planPlace=${planPlace}` as any);
  }

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

      {/* Search bar overlay */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color="#667085" />
          <Text style={styles.searchPlaceholder}>Explore Sri Lanka</Text>
        </View>
        <TouchableOpacity style={styles.filterButton}>
          <Filter size={20} color="#0EA5A4" />
        </TouchableOpacity>
      </View>

      {/* Loading overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#0EA5A4" />
          <Text style={styles.loadingText}>Loading map…</Text>
        </View>
      )}

      {/* Location count badge */}
      {!selectedListing && !loading && mappable.length > 0 && (
        <View style={styles.countBadge}>
          <MapPin size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={styles.countText}>{mappable.length} locations</Text>
        </View>
      )}

      {/* "Added to plan" banner */}
      {addedId && addedId === selectedId && (
        <View style={styles.addedBanner}>
          <Text style={styles.addedBannerText}>📅 Added to today's plan!</Text>
        </View>
      )}

      {/* Selected listing card */}
      {selectedListing && (
        <View style={styles.cardContainer}>
          <View style={styles.card}>
            <TouchableOpacity style={styles.cardDismiss} onPress={() => setSelectedId(null)}>
              <X size={16} color="#667085" />
            </TouchableOpacity>

            {/* Top row: image + info */}
            <View style={styles.cardTop}>
              {fixImageUrl(selectedListing.imageUrl) ? (
                <Image
                  source={{ uri: fixImageUrl(selectedListing.imageUrl)! }}
                  style={styles.cardImage}
                />
              ) : (
                <View style={styles.cardIconBox}>
                  <MapPin size={28} color="#0EA5A4" />
                </View>
              )}
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle} numberOfLines={1}>{selectedListing.title}</Text>
                {selectedListing.placeName ? (
                  <Text style={styles.cardPlace} numberOfLines={1}>📍 {selectedListing.placeName}</Text>
                ) : null}
                <View style={styles.cardMeta}>
                  <Text style={styles.cardType}>{selectedListing.type}</Text>
                  {selectedListing.price ? (
                    <Text style={styles.cardPrice}>LKR {Number(selectedListing.price).toLocaleString()}</Text>
                  ) : null}
                </View>
              </View>
            </View>

            {/* Description */}
            <Text style={styles.cardDescription} numberOfLines={2}>
              {selectedListing.description}
            </Text>

            {/* Action row */}
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
                <Text style={[
                  styles.actionBtnText,
                  savedIds.has(selectedListing.id) && styles.actionBtnTextSaved,
                ]}>
                  {savedIds.has(selectedListing.id) ? 'Saved' : 'Save'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnPlan]}
                onPress={() => handleAddToPlan(selectedListing.id)}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },
  searchContainer: {
    position: 'absolute', top: 48, left: 24, right: 24,
    zIndex: 10, flexDirection: 'row', gap: 12,
  },
  searchBar: {
    flex: 1, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 999,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
    borderWidth: 1, borderColor: '#E5E7EB', gap: 12,
  },
  searchPlaceholder: { fontSize: 16, color: '#667085' },
  filterButton: {
    backgroundColor: '#FFFFFF', padding: 12, borderRadius: 999,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center', justifyContent: 'center', gap: 12, zIndex: 5,
  },
  loadingText: { fontSize: 14, color: '#667085', fontWeight: '600' },
  countBadge: {
    position: 'absolute', bottom: 32, alignSelf: 'center',
    backgroundColor: '#0B1220', paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 999, flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 6, zIndex: 8,
  },
  countText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  addedBanner: {
    position: 'absolute', bottom: 220, alignSelf: 'center',
    backgroundColor: '#0EA5A4', paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 999, zIndex: 30,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 10,
  },
  addedBannerText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },
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
  cardPlace: { fontSize: 11, color: '#667085', marginBottom: 4 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardType: { fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', fontWeight: 'bold' },
  cardPrice: { fontSize: 13, fontWeight: 'bold', color: '#0EA5A4' },
  cardDescription: { fontSize: 12, color: '#667085', lineHeight: 18, marginBottom: 12 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999,
    borderWidth: 1,
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
});
