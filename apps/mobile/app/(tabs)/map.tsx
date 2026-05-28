import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Search, Filter, MapPin, X, ArrowRight } from 'lucide-react-native';
import { useGraphQL } from '../../src/hooks/useGraphQL';
import { useRouter } from 'expo-router';

const FEED_QUERY = `
  query MapFeed {
    searchListings(limit: 100) {
      listings { id title description type price lat lng placeName }
    }
  }
`;

function buildMapHtml(markers: any[]) {
  const data = JSON.stringify(markers);
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.min.css"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100vh; overflow: hidden; background: #f0f0f0; }
    #map { width: 100%; height: 100vh; }
    #status { position: fixed; top: 8px; left: 50%; transform: translateX(-50%);
      background: rgba(0,0,0,0.6); color: #fff; font-size: 11px; padding: 4px 10px;
      border-radius: 99px; z-index: 9999; display: none; }
    .pin-wrap {
      display: flex; flex-direction: column; align-items: center;
      cursor: pointer; filter: drop-shadow(0 3px 6px rgba(0,0,0,0.30));
    }
    .pin-wrap.active { filter: drop-shadow(0 4px 10px rgba(14,165,164,0.55)); }
    .pin-head {
      width: 32px; height: 32px; border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg); border: 3px solid #fff;
      background: #0EA5A4; display: flex; align-items: center; justify-content: center;
    }
    .pin-wrap.active .pin-head { background: #0B1220; }
    .pin-inner {
      width: 10px; height: 10px; background: #fff; border-radius: 50%;
      transform: rotate(45deg);
    }
    .pin-stem {
      width: 3px; height: 10px; background: #0EA5A4; margin-top: -1px;
      border-radius: 0 0 3px 3px;
    }
    .pin-wrap.active .pin-stem { background: #0B1220; }
  </style>
</head>
<body>
<div id="map"></div>
<div id="status"></div>
<script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.min.js"></script>
<script>
(function() {
  var statusEl = document.getElementById('status');
  function setStatus(msg) { statusEl.style.display = 'block'; statusEl.textContent = msg; }

  if (typeof L === 'undefined') {
    setStatus('Leaflet failed to load');
    return;
  }

  var map = L.map('map', { zoomControl: true }).setView([7.8731, 80.7718], 8);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap',
    maxZoom: 18
  }).addTo(map);

  var allMarkers = ${data};
  var leafletMarkers = {};
  var selectedId = null;

  function rn(msg) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(msg));
    }
  }

  function makeIcon(item, active) {
    var cls = 'pin-wrap' + (active ? ' active' : '');
    var html = '<div class="' + cls + '">' +
      '<div class="pin-head"><div class="pin-inner"></div></div>' +
      '<div class="pin-stem"></div>' +
      '</div>';
    return L.divIcon({
      className: '',
      html: html,
      iconSize: [32, 43],
      iconAnchor: [16, 43]
    });
  }

  allMarkers.forEach(function(m) {
    var marker = L.marker([m.lat, m.lng], { icon: makeIcon(m, false) }).addTo(map);
    marker.on('click', function(e) {
      L.DomEvent.stopPropagation(e);
      // Deactivate previous
      if (selectedId && leafletMarkers[selectedId]) {
        var prev = allMarkers.find(function(x) { return x.id === selectedId; });
        if (prev) leafletMarkers[selectedId].setIcon(makeIcon(prev, false));
      }
      selectedId = m.id;
      marker.setIcon(makeIcon(m, true));
      rn({ type: 'select', id: m.id });
    });
    leafletMarkers[m.id] = marker;
  });

  map.on('click', function() {
    if (selectedId && leafletMarkers[selectedId]) {
      var prev = allMarkers.find(function(x) { return x.id === selectedId; });
      if (prev) leafletMarkers[selectedId].setIcon(makeIcon(prev, false));
    }
    selectedId = null;
    rn({ type: 'deselect' });
  });

  setTimeout(function() { map.invalidateSize(); }, 300);
})();
</script>
</body>
</html>`;
}

export default function MapScreen() {
  const router = useRouter();
  const webRef = useRef<WebView>(null);
  const [selectedListing, setSelectedListing] = useState<any>(null);

  const { data, loading } = useGraphQL<{ searchListings: { listings: any[] } }>(FEED_QUERY);
  const listings = data?.searchListings?.listings ?? [];
  const mappable = listings.filter((l) => l.lat && l.lng && l.lat !== 0 && l.lng !== 0);

  function handleMessage(event: any) {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'select') {
        const found = mappable.find((l) => l.id === msg.id);
        if (found) setSelectedListing(found);
      } else if (msg.type === 'deselect') {
        setSelectedListing(null);
      }
    } catch {}
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color="#667085" />
          <Text style={styles.searchPlaceholder}>Explore Sri Lanka</Text>
        </View>
        <TouchableOpacity style={styles.filterButton}>
          <Filter size={20} color="#0EA5A4" />
        </TouchableOpacity>
      </View>

      {/* Map — always rendered; spinner overlaid while fetching */}
      <WebView
        ref={webRef}
        style={styles.map}
        source={{ html: buildMapHtml(mappable) }}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
        allowsInlineMediaPlayback
        startInLoadingState={false}
      />

      {/* Loading overlay while GraphQL fetches */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#0EA5A4" />
          <Text style={styles.loadingText}>Loading map…</Text>
        </View>
      )}

      {/* Location count badge */}
      {!selectedListing && (
        <View style={styles.countBadge}>
          <MapPin size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={styles.countText}>
            {loading ? 'Loading…' : `${mappable.length} locations`}
          </Text>
        </View>
      )}

      {/* Selected listing card (event suggestion) */}
      {selectedListing && (
        <View style={styles.cardContainer}>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.cardDismiss}
              onPress={() => setSelectedListing(null)}
            >
              <X size={16} color="#667085" />
            </TouchableOpacity>

            <View style={styles.cardIcon}>
              <MapPin size={32} color="#0EA5A4" />
            </View>

            <View style={styles.cardContent}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {selectedListing.title}
              </Text>
              {selectedListing.placeName ? (
                <Text style={styles.cardPlace} numberOfLines={1}>
                  📍 {selectedListing.placeName}
                </Text>
              ) : null}
              <Text style={styles.cardDescription} numberOfLines={2}>
                {selectedListing.description}
              </Text>
              <View style={styles.cardFooter}>
                <View>
                  <Text style={styles.cardType}>{selectedListing.type}</Text>
                  {selectedListing.price ? (
                    <Text style={styles.cardPrice}>LKR {Number(selectedListing.price).toLocaleString()}</Text>
                  ) : null}
                </View>
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
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F0F0' },
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
  map: { flex: 1, width: '100%', height: '100%' },
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
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 6,
    zIndex: 8,
  },
  countText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  cardContainer: {
    position: 'absolute', bottom: 24, left: 16, right: 16, zIndex: 20,
  },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16,
    flexDirection: 'row', alignItems: 'flex-start',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18, shadowRadius: 20, elevation: 14,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  cardDismiss: {
    position: 'absolute', top: 12, right: 12, zIndex: 2,
    padding: 4,
  },
  cardIcon: {
    width: 72, height: 72, backgroundColor: '#E0F6F6',
    borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  cardContent: { flex: 1, marginLeft: 14 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#0B1220', marginBottom: 2 },
  cardPlace: { fontSize: 12, color: '#667085', marginBottom: 4 },
  cardDescription: { fontSize: 13, color: '#667085', lineHeight: 19, marginBottom: 10 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardType: { fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase', fontWeight: 'bold' },
  cardPrice: { fontSize: 15, fontWeight: 'bold', color: '#0EA5A4', marginTop: 2 },
  viewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#0EA5A4', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 999,
  },
  viewBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
});
