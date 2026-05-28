import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
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

const SRI_LANKA = {
  latitude: 7.8731,
  longitude: 80.7718,
  latitudeDelta: 4.5,
  longitudeDelta: 4.5,
};

export default function MapScreen() {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, loading } = useGraphQL<{ searchListings: { listings: any[] } }>(FEED_QUERY);
  const listings = data?.searchListings?.listings ?? [];
  const mappable = listings.filter((l) => l.lat && l.lng && l.lat !== 0 && l.lng !== 0);
  const selectedListing = mappable.find((l) => l.id === selectedId) ?? null;

  return (
    <View style={styles.container}>
      {/* Map — fills the entire screen */}
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={SRI_LANKA}
        onPress={() => setSelectedId(null)}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {mappable.map((listing) => (
          <Marker
            key={listing.id}
            coordinate={{ latitude: listing.lat, longitude: listing.lng }}
            onPress={(e) => {
              e.stopPropagation();
              setSelectedId(listing.id);
            }}
            tracksViewChanges={false}
          >
            <View style={[
              styles.pin,
              selectedId === listing.id && styles.pinActive,
            ]}>
              <View style={[
                styles.pinHead,
                selectedId === listing.id && styles.pinHeadActive,
              ]} />
            </View>
          </Marker>
        ))}
      </MapView>

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

      {/* Loading overlay while GraphQL fetches */}
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

      {/* Selected listing card */}
      {selectedListing && (
        <View style={styles.cardContainer}>
          <View style={styles.card}>
            <TouchableOpacity style={styles.cardDismiss} onPress={() => setSelectedId(null)}>
              <X size={16} color="#667085" />
            </TouchableOpacity>

            <View style={styles.cardIcon}>
              <MapPin size={32} color="#0EA5A4" />
            </View>

            <View style={styles.cardContent}>
              <Text style={styles.cardTitle} numberOfLines={1}>{selectedListing.title}</Text>
              {selectedListing.placeName ? (
                <Text style={styles.cardPlace} numberOfLines={1}>📍 {selectedListing.placeName}</Text>
              ) : null}
              <Text style={styles.cardDescription} numberOfLines={2}>{selectedListing.description}</Text>
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
  container: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },
  pin: {
    alignItems: 'center',
  },
  pinHead: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#0EA5A4',
    borderWidth: 3, borderColor: '#FFFFFF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
  },
  pinActive: {},
  pinHeadActive: {
    backgroundColor: '#0B1220',
    width: 26, height: 26, borderRadius: 13,
  },
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
  cardDismiss: { position: 'absolute', top: 12, right: 12, zIndex: 2, padding: 4 },
  cardIcon: {
    width: 72, height: 72, backgroundColor: '#E0F6F6',
    borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
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
    backgroundColor: '#0EA5A4', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
  },
  viewBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
});
