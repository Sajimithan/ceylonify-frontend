import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, StyleSheet, Image, RefreshControl,
} from 'react-native';
import { Search, MapPin, Bell, CalendarDays } from 'lucide-react-native';
import { useGraphQL } from '../../src/hooks/useGraphQL';
import { useRouter } from 'expo-router';
import { auth } from '../../src/lib/firebase';

const API_BASE = (process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:3000/graphql').replace('/graphql', '');

function fixImageUrl(url?: string | null): string | null {
  if (!url) return null;
  return url.replace('http://localhost:3000', API_BASE);
}

const NOTIFICATIONS_QUERY = `query MyNotifications { myNotifications { id read } }`;

const SEARCH_LISTINGS = `
  query SearchListings($category: String, $q: String, $limit: Int) {
    searchListings(category: $category, q: $q, limit: $limit) {
      listings {
        id title description type category price placeName startDateTime imageUrl isPremium viewCount createdAt
      }
      total
    }
  }
`;

const CATEGORIES = [
  { label: 'All', value: null },
  { label: 'Beaches', value: 'BEACH' },
  { label: 'Adventures', value: 'ADVENTURE' },
  { label: 'Food', value: 'FOOD' },
  { label: 'Events', value: 'EVENT' },
  { label: 'Rentals', value: 'RENTAL' },
];

export default function HomeScreen() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [displayName, setDisplayName] = useState('Traveler');

  useEffect(() => {
    const user = auth?.currentUser;
    if (user?.displayName) {
      setDisplayName(user.displayName.split(' ')[0]);
    } else if (user?.email) {
      setDisplayName(user.email.split('@')[0]);
    }
  }, []);

  const variables: Record<string, any> = { limit: 20 };
  if (selectedCategory) variables.category = selectedCategory;
  if (searchQuery.trim()) variables.q = searchQuery.trim();

  const { data, loading, error, refetch } = useGraphQL<{
    searchListings: { listings: any[]; total: number };
  }>(SEARCH_LISTINGS, variables);

  const { data: notifData } = useGraphQL<{ myNotifications: { id: string; read: boolean }[] }>(NOTIFICATIONS_QUERY);
  const unreadCount = (notifData?.myNotifications ?? []).filter((n) => !n.read).length;

  const listings = data?.searchListings?.listings ?? [];

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  if (loading && !data) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0EA5A4" />
        <Text style={styles.loadingText}>Loading experiences...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Connection Error</Text>
        <Text style={styles.errorMessage}>{error.message}</Text>
        <TouchableOpacity onPress={() => refetch()} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.exploreText}>EXPLORE SRI LANKA</Text>
          <View style={styles.greetingRow}>
            <Text style={styles.greetingText}>Ayubowan, {displayName}</Text>
            <MapPin size={18} color="#0EA5A4" style={{ marginLeft: 8 }} />
          </View>
        </View>
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={() => router.push('/notifications' as any)}
        >
          <Bell size={20} color="#0B1220" />
          {unreadCount > 0 && (
            <View style={styles.notifBadge}>
              <Text style={styles.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0EA5A4" />}
      >
        {/* Search Bar */}
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Search size={20} color="#667085" />
            <TextInput
              placeholder="Search beaches, temples, events..."
              style={styles.searchInput}
              placeholderTextColor="#667085"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Text style={{ color: '#9CA3AF', fontSize: 18, paddingLeft: 8 }}>×</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Category Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryList}
        >
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat.value;
            return (
              <TouchableOpacity
                key={cat.label}
                onPress={() => setSelectedCategory(cat.value)}
                style={[styles.categoryChip, active && styles.categoryChipActive]}
              >
                <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Section title */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {listings.length > 0
              ? `${listings.length} Experience${listings.length !== 1 ? 's' : ''}`
              : 'No Experiences Found'}
          </Text>
        </View>

        {listings.length === 0 && !loading && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No listings match your search.</Text>
            <Text style={styles.emptySubtext}>Try a different category or search term.</Text>
          </View>
        )}

        {listings.map((listing: any) => {
          const imageUrl = fixImageUrl(listing.imageUrl);
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
                <View style={styles.listingImagePlaceholder}>
                  <Text style={styles.listingImagePlaceholderText}>🏝️</Text>
                </View>
              )}

              {listing.isPremium && (
                <View style={styles.premiumBadge}>
                  <Text style={styles.premiumBadgeText}>PREMIUM</Text>
                </View>
              )}

              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>{listing.type}</Text>
              </View>

              <View style={styles.listingBody}>
                <View style={styles.listingHeader}>
                  <Text style={styles.listingTitle} numberOfLines={1}>{listing.title}</Text>
                  {listing.price ? (
                    <Text style={styles.listingPrice}>LKR {listing.price}</Text>
                  ) : (
                    <Text style={styles.listingPriceFree}>Free</Text>
                  )}
                </View>

                {listing.placeName && (
                  <View style={styles.locationRow}>
                    <MapPin size={13} color="#0EA5A4" />
                    <Text style={styles.locationText} numberOfLines={1}>{listing.placeName}</Text>
                  </View>
                )}
                {listing.startDateTime && (
                  <View style={styles.locationRow}>
                    <CalendarDays size={13} color="#94A3B8" />
                    <Text style={styles.eventDateText} numberOfLines={1}>
                      {new Date(listing.startDateTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                  </View>
                )}

                <Text style={styles.listingDescription} numberOfLines={2}>{listing.description}</Text>

                <View style={styles.listingFooter}>
                  {listing.category ? (
                    <View style={styles.categoryTag}>
                      <Text style={styles.categoryTagText}>{listing.category}</Text>
                    </View>
                  ) : <View />}
                  <Text style={styles.viewMore}>View Details →</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#667085' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC', paddingHorizontal: 32 },
  errorTitle: { fontSize: 22, fontWeight: 'bold', color: '#EF4444', marginBottom: 12 },
  errorMessage: { fontSize: 14, color: '#667085', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  retryButton: { backgroundColor: '#0EA5A4', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 999 },
  retryButtonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
  header: {
    paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  exploreText: { color: '#667085', fontSize: 11, fontWeight: '500', letterSpacing: 0.8 },
  greetingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  greetingText: { color: '#0B1220', fontSize: 20, fontWeight: 'bold' },
  notificationButton: {
    backgroundColor: '#F1F5F9', padding: 10, borderRadius: 999,
    borderWidth: 1, borderColor: '#E5E7EB', position: 'relative',
  },
  notifBadge: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: '#EF4444', borderRadius: 999, minWidth: 18, height: 18,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
    borderWidth: 1.5, borderColor: '#FFFFFF',
  },
  notifBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: 'bold' },
  scrollView: { flex: 1 },
  searchSection: { paddingHorizontal: 16, paddingVertical: 14 },
  searchBar: {
    backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  searchInput: { flex: 1, marginLeft: 10, color: '#0B1220', fontSize: 15 },
  categoryList: { paddingHorizontal: 16, paddingBottom: 8, gap: 8, flexDirection: 'row' },
  categoryChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999,
    backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E5E7EB',
  },
  categoryChipActive: { backgroundColor: '#0EA5A4', borderColor: '#0EA5A4' },
  categoryChipText: { fontSize: 13, fontWeight: '600', color: '#667085' },
  categoryChipTextActive: { color: '#FFFFFF' },
  section: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  sectionTitle: { color: '#0B1220', fontSize: 18, fontWeight: 'bold' },
  emptyBox: { margin: 20, padding: 28, backgroundColor: '#FFFFFF', borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  emptyText: { fontSize: 16, color: '#374151', fontWeight: '600', marginBottom: 6 },
  emptySubtext: { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },
  listingCard: {
    marginHorizontal: 16, marginBottom: 18,
    backgroundColor: '#FFFFFF', borderRadius: 16,
    borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4,
  },
  listingImage: { width: '100%', height: 180 },
  listingImagePlaceholder: { width: '100%', height: 160, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  listingImagePlaceholderText: { fontSize: 48 },
  premiumBadge: {
    position: 'absolute', top: 12, right: 12,
    backgroundColor: 'rgba(245,158,11,0.9)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
  },
  premiumBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  typeBadge: {
    position: 'absolute', top: 12, left: 12,
    backgroundColor: 'rgba(14,165,164,0.9)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
  },
  typeBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  listingBody: { padding: 14 },
  listingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  listingTitle: { flex: 1, fontSize: 17, fontWeight: 'bold', color: '#0B1220', marginRight: 8 },
  listingPrice: { fontSize: 15, fontWeight: 'bold', color: '#0EA5A4' },
  listingPriceFree: { fontSize: 13, fontWeight: '600', color: '#10B981' },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  locationText: { fontSize: 12, color: '#667085', marginLeft: 4, flex: 1 },
  eventDateText: { fontSize: 12, color: '#94A3B8', marginLeft: 4, flex: 1 },
  listingDescription: { fontSize: 13, color: '#6B7280', lineHeight: 19, marginBottom: 12 },
  listingFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  categoryTag: { backgroundColor: '#F0FDF4', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: '#BBF7D0' },
  categoryTagText: { fontSize: 11, color: '#166534', fontWeight: '600', textTransform: 'capitalize' },
  viewMore: { fontSize: 12, color: '#0EA5A4', fontWeight: '700' },
});
