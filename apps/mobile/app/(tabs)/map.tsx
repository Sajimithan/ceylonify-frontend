import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { Search, Filter, MapPin } from 'lucide-react-native';
import { useGraphQL } from '../../src/hooks/useGraphQL';

const { width, height } = Dimensions.get('window');

// Safely import MapView – may not work in Expo Go without a dev build
let MapView: any = null;
let Marker: any = null;
let PROVIDER_GOOGLE: any = null;
try {
    const maps = require('react-native-maps');
    MapView = maps.default;
    Marker = maps.Marker;
    PROVIDER_GOOGLE = maps.PROVIDER_GOOGLE;
} catch {
    // react-native-maps not available in this environment
}

const GET_FEED_QUERY = `
  query GetFeed {
    feed {
      id
      title
      description
      type
      price
      lat
      lng
    }
  }
`;

export default function MapScreen() {
    const { data, loading } = useGraphQL<{ feed: any[] }>(GET_FEED_QUERY, {});
    const [selectedListing, setSelectedListing] = useState<any>(null);

    const listings = (data?.feed || []).filter(l => l.lat && l.lng);

    // Calculate center of Sri Lanka
    const centerPoint = {
        latitude: 7.8731,
        longitude: 80.7718,
        latitudeDelta: 3.5,
        longitudeDelta: 3.5,
    };

    // Fallback UI when MapView is not available (e.g. plain Expo Go)
    if (!MapView) {
        return (
            <View style={styles.container}>
                <View style={styles.searchContainer}>
                    <View style={styles.searchBar}>
                        <Search size={20} color="#667085" />
                        <Text style={styles.searchPlaceholder}>Search in map...</Text>
                    </View>
                    <TouchableOpacity style={styles.filterButton}>
                        <Filter size={20} color="#0EA5A4" />
                    </TouchableOpacity>
                </View>
                <View style={styles.fallbackContainer}>
                    <MapPin size={64} color="#E5E7EB" />
                    <Text style={styles.fallbackTitle}>Map Unavailable</Text>
                    <Text style={styles.fallbackSubtitle}>
                        Map requires a development build.{'\n'}
                        {listings.length > 0
                            ? `${listings.length} location${listings.length !== 1 ? 's' : ''} available in your area.`
                            : 'No locations found.'}
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Search size={20} color="#667085" />
                    <Text style={styles.searchPlaceholder}>Search in map...</Text>
                </View>
                <TouchableOpacity style={styles.filterButton}>
                    <Filter size={20} color="#0EA5A4" />
                </TouchableOpacity>
            </View>

            {/* Map */}
            <MapView
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                initialRegion={centerPoint}
            >
                {listings.map((listing) => (
                    <Marker
                        key={listing.id}
                        coordinate={{ latitude: listing.lat, longitude: listing.lng }}
                        onPress={() => setSelectedListing(listing)}
                    >
                        <View style={[
                            styles.markerContainer,
                            selectedListing?.id === listing.id ? styles.markerActive : styles.markerInactive
                        ]}>
                            <Text style={[
                                styles.markerText,
                                selectedListing?.id === listing.id ? styles.markerTextActive : styles.markerTextInactive
                            ]}>
                                {listing.price ? `LKR ${listing.price}` : '•'}
                            </Text>
                        </View>
                    </Marker>
                ))}
            </MapView>

            {/* Selected Listing Card */}
            {selectedListing && (

                <View style={styles.cardContainer}>
                    <View style={styles.card}>
                        <View style={styles.cardIcon}>
                            <MapPin size={32} color="#0EA5A4" />
                        </View>
                        <View style={styles.cardContent}>
                            <Text style={styles.cardTitle} numberOfLines={1}>
                                {selectedListing.title}
                            </Text>
                            <Text style={styles.cardDescription} numberOfLines={2}>
                                {selectedListing.description}
                            </Text>
                            <View style={styles.cardFooter}>
                                <Text style={styles.cardType}>{selectedListing.type}</Text>
                                {selectedListing.price && (
                                    <Text style={styles.cardPrice}>
                                        LKR {selectedListing.price}
                                    </Text>
                                )}
                            </View>
                        </View>
                    </View>
                </View>
            )}

            {/* Listing Count */}
            <View style={styles.countBadge}>
                <Text style={styles.countText}>
                    {loading ? 'Loading...' : `${listings.length} locations`}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    searchContainer: {
        position: 'absolute',
        top: 48,
        left: 24,
        right: 24,
        zIndex: 10,
        flexDirection: 'row',
        gap: 12,
    },
    searchBar: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 999,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        gap: 12,
    },
    searchPlaceholder: {
        fontSize: 16,
        color: '#667085',
    },
    filterButton: {
        backgroundColor: '#FFFFFF',
        padding: 12,
        borderRadius: 999,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    map: {
        width: '100%',
        height: '100%',
    },
    markerContainer: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 2,
    },
    markerActive: {
        backgroundColor: '#0EA5A4',
        borderColor: '#FFFFFF',
    },
    markerInactive: {
        backgroundColor: '#FFFFFF',
        borderColor: '#0EA5A4',
    },
    markerText: {
        fontWeight: 'bold',
        fontSize: 12,
    },
    markerTextActive: {
        color: '#FFFFFF',
    },
    markerTextInactive: {
        color: '#0EA5A4',
    },
    cardContainer: {
        position: 'absolute',
        bottom: 24,
        left: 24,
        right: 24,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    cardIcon: {
        width: 80,
        height: 80,
        backgroundColor: '#E0F6F6',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardContent: {
        flex: 1,
        marginLeft: 16,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0B1220',
        marginBottom: 4,
    },
    cardDescription: {
        fontSize: 14,
        color: '#667085',
        lineHeight: 20,
        marginBottom: 8,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardType: {
        fontSize: 12,
        color: '#667085',
        textTransform: 'capitalize',
    },
    cardPrice: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#0EA5A4',
    },
    countBadge: {
        position: 'absolute',
        top: 120,
        alignSelf: 'center',
        backgroundColor: '#0B1220',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 999,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 6,
    },
    countText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: 'bold',
    },
    fallbackContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
    },
    fallbackTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#0B1220',
        marginTop: 16,
        marginBottom: 8,
    },
    fallbackSubtitle: {
        fontSize: 14,
        color: '#667085',
        textAlign: 'center',
        lineHeight: 22,
    },
});
