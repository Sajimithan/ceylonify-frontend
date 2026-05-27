import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Image, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Heart, MapPin, Trash2 } from 'lucide-react-native';
import { useGraphQL, gqlFetch } from '../../src/hooks/useGraphQL';
import { useRouter } from 'expo-router';

const API_BASE = (process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:3000/graphql').replace('/graphql', '');

function fixImageUrl(url?: string | null): string | null {
  if (!url) return null;
  return url.replace('http://localhost:3000', API_BASE);
}

const SAVED_LISTINGS_QUERY = `
  query SavedListings {
    savedListings {
      id title description type category price placeName imageUrl createdAt
    }
  }
`;

const UNSAVE_MUTATION = `
  mutation UnsaveListing($listingId: ID!) {
    unsaveListing(listingId: $listingId)
  }
`;

export default function SavedScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const { data, loading, error, refetch } = useGraphQL<{ savedListings: any[] }>(
    SAVED_LISTINGS_QUERY,
  );

  const savedListings = data?.savedListings ?? [];

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  async function handleRemove(listingId: string) {
    setRemoving(listingId);
    try {
      await gqlFetch(UNSAVE_MUTATION, { listingId });
      await refetch();
    } catch {
      // silent
    } finally {
      setRemoving(null);
    }
  }

  if (loading && !data) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0EA5A4" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Failed to load saved listings.</Text>
        <TouchableOpacity onPress={() => refetch()} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Saved Experiences</Text>
        <Text style={styles.headerSubtitle}>
          {savedListings.length} saved listing{savedListings.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={savedListings.length === 0 ? styles.emptyContent : styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0EA5A4" />}
        showsVerticalScrollIndicator={false}
      >
        {savedListings.length === 0 ? (
          <View style={styles.emptyState}>
            <Heart size={64} color="#E5E7EB" />
            <Text style={styles.emptyTitle}>No saved experiences yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap the heart icon on any listing to save it here
            </Text>
          </View>
        ) : (
          savedListings.map((listing: any) => {
            const imageUrl = fixImageUrl(listing.imageUrl);
            const isRemoving = removing === listing.id;
            return (
              <TouchableOpacity
                key={listing.id}
                style={styles.listingCard}
                activeOpacity={0.85}
                onPress={() => router.push(`/listing/${listing.id}`)}
              >
                {imageUrl ? (
                  <Image source={{ uri: imageUrl }} style={styles.listingImage} resizeMode="cover" />
                ) : (
                  <View style={[styles.listingImage, styles.listingImagePlaceholder]}>
                    <Text style={{ fontSize: 36 }}>🏝️</Text>
                  </View>
                )}

                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>{listing.type}</Text>
                </View>

                <View style={styles.listingBody}>
                  <View style={styles.listingHeader}>
                    <Text style={styles.listingTitle} numberOfLines={1}>{listing.title}</Text>
                    <TouchableOpacity
                      onPress={() => handleRemove(listing.id)}
                      disabled={isRemoving}
                      style={styles.removeButton}
                    >
                      {isRemoving
                        ? <ActivityIndicator size="small" color="#EF4444" />
                        : <Trash2 size={18} color="#EF4444" />
                      }
                    </TouchableOpacity>
                  </View>

                  {listing.placeName && (
                    <View style={styles.locationRow}>
                      <MapPin size={13} color="#0EA5A4" />
                      <Text style={styles.locationText} numberOfLines={1}>{listing.placeName}</Text>
                    </View>
                  )}

                  <Text style={styles.listingDescription} numberOfLines={2}>{listing.description}</Text>

                  <View style={styles.listingFooter}>
                    {listing.category ? (
                      <View style={styles.categoryTag}>
                        <Text style={styles.categoryTagText}>{listing.category}</Text>
                      </View>
                    ) : <View />}
                    {listing.price
                      ? <Text style={styles.listingPrice}>LKR {listing.price}</Text>
                      : <Text style={styles.listingPriceFree}>Free</Text>
                    }
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7FAFC' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  errorText: { fontSize: 16, color: '#EF4444', marginBottom: 16, textAlign: 'center' },
  retryButton: { backgroundColor: '#0EA5A4', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999 },
  retryButtonText: { color: '#FFFFFF', fontWeight: 'bold' },
  header: {
    paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#0B1220' },
  headerSubtitle: { fontSize: 13, color: '#667085', marginTop: 2 },
  content: { flex: 1 },
  emptyContent: { flexGrow: 1 },
  listContent: { padding: 16 },
  emptyState: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 120, paddingHorizontal: 32,
  },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#0B1220', marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: '#667085', marginTop: 8, textAlign: 'center', lineHeight: 22 },
  listingCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16,
    borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4,
  },
  listingImage: { width: '100%', height: 160 },
  listingImagePlaceholder: { backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  typeBadge: {
    position: 'absolute', top: 12, left: 12,
    backgroundColor: 'rgba(14,165,164,0.9)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
  },
  typeBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  listingBody: { padding: 14 },
  listingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  listingTitle: { flex: 1, fontSize: 16, fontWeight: 'bold', color: '#0B1220', marginRight: 8 },
  removeButton: { padding: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  locationText: { fontSize: 12, color: '#667085', marginLeft: 4, flex: 1 },
  listingDescription: { fontSize: 13, color: '#6B7280', lineHeight: 19, marginBottom: 10 },
  listingFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  categoryTag: { backgroundColor: '#F0FDF4', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: '#BBF7D0' },
  categoryTagText: { fontSize: 11, color: '#166534', fontWeight: '600', textTransform: 'capitalize' },
  listingPrice: { fontSize: 14, fontWeight: 'bold', color: '#0EA5A4' },
  listingPriceFree: { fontSize: 13, fontWeight: '600', color: '#10B981' },
});
