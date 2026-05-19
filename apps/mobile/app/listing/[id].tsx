import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, Image, TouchableOpacity,
  ActivityIndicator, Linking, StyleSheet
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Share2, Heart, MapPin, Clock, Tag, Navigation } from 'lucide-react-native';
import { useGraphQL } from '../../src/hooks/useGraphQL';

const API_BASE = (process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:3000/graphql')
  .replace('/graphql', '');

function fixImageUrl(url?: string | null): string | null {
  if (!url) return null;
  return url.replace('http://localhost:3000', API_BASE);
}

const GET_LISTING_QUERY = `
  query GetListing($id: String!) {
    listing(id: $id) {
      id
      title
      description
      type
      category
      price
      status
      placeName
      mapLink
      imageUrl
      createdAt
      lat
      lng
    }
  }
`;

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data, loading, error } = useGraphQL<{ listing: any }>(
    GET_LISTING_QUERY,
    { id },
  );

  const listing = data?.listing;

  const openInMaps = () => {
    if (!listing) return;
    if (listing.mapLink) {
      Linking.openURL(listing.mapLink);
    } else if (listing.lat && listing.lng) {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${listing.lat},${listing.lng}`);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0EA5A4" />
        <Text style={styles.loadingText}>Loading experience...</Text>
      </View>
    );
  }

  if (error || !listing) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>⚠️ Not Found</Text>
        <Text style={styles.errorMessage}>{error?.message ?? 'This listing could not be loaded.'}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const imageUrl = fixImageUrl(listing.imageUrl);
  const hasLocation = (listing.lat && listing.lng) || listing.mapLink;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header Image */}
        <View style={styles.imageContainer}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.headerImage} resizeMode="cover" />
          ) : (
            <View style={[styles.headerImage, styles.imagePlaceholder]}>
              <Text style={styles.imagePlaceholderEmoji}>🏝️</Text>
            </View>
          )}

          {/* Back & Share Buttons */}
          <View style={styles.imageOverlayButtons}>
            <TouchableOpacity onPress={() => router.back()} style={styles.circleButton}>
              <ChevronLeft size={22} color="#0B1220" />
            </TouchableOpacity>
            <View style={styles.rightButtons}>
              <TouchableOpacity style={styles.circleButton}>
                <Share2 size={20} color="#0B1220" />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.circleButton, { marginLeft: 10 }]}>
                <Heart size={20} color="#0B1220" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Type Badge on image */}
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{listing.type}</Text>
          </View>
        </View>

        {/* Content Card */}
        <View style={styles.contentCard}>
          {/* Category + Title */}
          {listing.category && (
            <Text style={styles.categoryLabel}>{listing.category}</Text>
          )}
          <Text style={styles.title}>{listing.title}</Text>

          {/* Location */}
          {listing.placeName && (
            <View style={styles.infoRow}>
              <MapPin size={15} color="#0EA5A4" />
              <Text style={styles.infoText}>{listing.placeName}</Text>
            </View>
          )}

          {/* Date / Created At */}
          <View style={styles.infoRow}>
            <Clock size={15} color="#0EA5A4" />
            <Text style={styles.infoText}>
              Listed {new Date(listing.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </Text>
          </View>

          {/* Price */}
          {listing.price && (
            <View style={styles.infoRow}>
              <Tag size={15} color="#0EA5A4" />
              <Text style={[styles.infoText, { fontWeight: 'bold', color: '#0EA5A4' }]}>
                LKR {listing.price}
              </Text>
            </View>
          )}

          {/* Divider */}
          <View style={styles.divider} />

          {/* Description */}
          <Text style={styles.sectionTitle}>About this Experience</Text>
          <Text style={styles.description}>{listing.description}</Text>

          {/* Map Preview / Directions */}
          {hasLocation && (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionTitle}>Location</Text>
              <TouchableOpacity onPress={openInMaps} style={styles.directionsButton}>
                <Navigation size={18} color="#FFFFFF" />
                <Text style={styles.directionsButtonText}>Open in Google Maps</Text>
              </TouchableOpacity>
            </>
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Floating CTA */}
      <View style={styles.floatingCTA}>
        <View style={styles.ctaPrice}>
          <Text style={styles.ctaPriceLabel}>Price</Text>
          <Text style={styles.ctaPriceValue}>
            {listing.price ? `LKR ${listing.price}` : 'Free'}
          </Text>
        </View>
        <TouchableOpacity style={styles.bookButton}>
          <Text style={styles.bookButtonText}>Book Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  loadingText: { marginTop: 14, color: '#667085', fontSize: 15 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: '#F8FAFC' },
  errorTitle: { fontSize: 22, fontWeight: 'bold', color: '#EF4444', marginBottom: 10 },
  errorMessage: { fontSize: 14, color: '#667085', textAlign: 'center', marginBottom: 24 },
  backButton: { backgroundColor: '#0EA5A4', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 999 },
  backButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  imageContainer: { position: 'relative' },
  headerImage: { width: '100%', height: 280 },
  imagePlaceholder: { backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  imagePlaceholderEmoji: { fontSize: 64 },
  imageOverlayButtons: {
    position: 'absolute', top: 48, left: 16, right: 16,
    flexDirection: 'row', justifyContent: 'space-between',
  },
  rightButtons: { flexDirection: 'row' },
  circleButton: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    padding: 10, borderRadius: 999,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4, elevation: 4,
  },
  typeBadge: {
    position: 'absolute', bottom: 16, left: 16,
    backgroundColor: 'rgba(14,165,164,0.9)',
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999,
  },
  typeBadgeText: { color: '#FFF', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 },
  contentCard: {
    backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    marginTop: -24, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 6,
  },
  categoryLabel: { color: '#0EA5A4', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0B1220', marginBottom: 14 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  infoText: { marginLeft: 8, fontSize: 14, color: '#374151', flex: 1 },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 18 },
  sectionTitle: { fontSize: 17, fontWeight: 'bold', color: '#0B1220', marginBottom: 10 },
  description: { fontSize: 14, color: '#6B7280', lineHeight: 22 },
  directionsButton: {
    backgroundColor: '#0EA5A4', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 14,
  },
  directionsButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 15, marginLeft: 8 },
  floatingCTA: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 16, paddingBottom: 28,
    borderTopWidth: 1, borderTopColor: '#F1F5F9',
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 8,
  },
  ctaPrice: { flex: 1 },
  ctaPriceLabel: { fontSize: 12, color: '#9CA3AF' },
  ctaPriceValue: { fontSize: 20, fontWeight: 'bold', color: '#0B1220' },
  bookButton: { backgroundColor: '#0EA5A4', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 999 },
  bookButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
});
