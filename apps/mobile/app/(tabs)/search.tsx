import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Image,
} from 'react-native';
import { Search as SearchIcon, X, History, TrendingUp, MapPin } from 'lucide-react-native';
import { gqlFetch } from '../../src/hooks/useGraphQL';
import { useRouter } from 'expo-router';

const API_BASE = (process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:3000/graphql').replace('/graphql', '');

function fixImageUrl(url?: string | null): string | null {
  if (!url) return null;
  return url.replace('http://localhost:3000', API_BASE);
}

const SEARCH_QUERY = `
  query SearchListings($q: String, $limit: Int) {
    searchListings(q: $q, limit: $limit) {
      listings { id title description type category price placeName imageUrl createdAt }
      total
    }
  }
`;

const RECENT_SEARCHES = ['Ella Train Journey', 'Mirissa Surfing', 'Sigiriya Rock'];
const POPULAR_SEARCHES = ['Colombo', 'Kandy', 'Galle', 'Nuwara Eliya', 'Trincomalee', 'Yala Safari'];

export default function SearchScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!searchQuery.trim()) {
      setResults([]);
      setTotal(0);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await gqlFetch<{ searchListings: { listings: any[]; total: number } }>(
          SEARCH_QUERY,
          { q: searchQuery.trim(), limit: 30 },
        );
        setResults(data?.searchListings?.listings ?? []);
        setTotal(data?.searchListings?.total ?? 0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  const isSearching = searchQuery.trim().length > 0;

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.header}>
        <View style={styles.searchRow}>
          <View style={styles.searchInputContainer}>
            <SearchIcon size={20} color="#667085" />
            <TextInput
              placeholder="Where to next?"
              style={styles.input}
              placeholderTextColor="#667085"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={20} color="#667085" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {!isSearching ? (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Recent Searches */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <History size={18} color="#667085" />
              <Text style={styles.sectionTitle}>Recent Searches</Text>
            </View>
            <View style={styles.chipContainer}>
              {RECENT_SEARCHES.map((item, idx) => (
                <TouchableOpacity key={idx} style={styles.chip} onPress={() => setSearchQuery(item)}>
                  <History size={14} color="#667085" style={{ marginRight: 6 }} />
                  <Text style={styles.chipText}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Popular Destinations */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <TrendingUp size={18} color="#0EA5A4" />
              <Text style={styles.sectionTitle}>Popular Destinations</Text>
            </View>
            <View style={styles.chipContainer}>
              {POPULAR_SEARCHES.map((item, idx) => (
                <TouchableOpacity key={idx} style={styles.chip} onPress={() => setSearchQuery(item)}>
                  <Text style={styles.chipText}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      ) : (
        <ScrollView style={styles.resultsContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.resultsHeader}>
            {loading ? (
              <ActivityIndicator size="small" color="#0EA5A4" />
            ) : (
              <Text style={styles.resultCount}>
                {total} result{total !== 1 ? 's' : ''} for "{searchQuery}"
              </Text>
            )}
          </View>

          {!loading && results.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No results found</Text>
              <Text style={styles.emptySubtitle}>Try a different search term</Text>
            </View>
          )}

          {results.map((listing) => {
            const imageUrl = fixImageUrl(listing.imageUrl);
            return (
              <TouchableOpacity
                key={listing.id}
                style={styles.resultCard}
                onPress={() => router.push(`/listing/${listing.id}`)}
                activeOpacity={0.8}
              >
                {imageUrl ? (
                  <Image source={{ uri: imageUrl }} style={styles.resultImage} resizeMode="cover" />
                ) : (
                  <View style={[styles.resultImage, styles.resultImagePlaceholder]}>
                    <Text style={{ fontSize: 28 }}>🏝️</Text>
                  </View>
                )}
                <View style={styles.resultBody}>
                  <View style={styles.resultHeaderRow}>
                    <Text style={styles.resultTitle} numberOfLines={1}>{listing.title}</Text>
                    <View style={styles.typePill}>
                      <Text style={styles.typePillText}>{listing.type}</Text>
                    </View>
                  </View>
                  {listing.placeName && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <MapPin size={12} color="#0EA5A4" />
                      <Text style={styles.resultLocation} numberOfLines={1}> {listing.placeName}</Text>
                    </View>
                  )}
                  <Text style={styles.resultDescription} numberOfLines={2}>{listing.description}</Text>
                  <View style={styles.resultFooter}>
                    {listing.category && <Text style={styles.resultCategory}>{listing.category}</Text>}
                    {listing.price
                      ? <Text style={styles.resultPrice}>LKR {listing.price}</Text>
                      : <Text style={styles.resultPriceFree}>Free</Text>
                    }
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7FAFC' },
  header: {
    paddingHorizontal: 24, paddingVertical: 16,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  searchRow: { flexDirection: 'row', alignItems: 'center' },
  searchInputContainer: {
    flex: 1, backgroundColor: '#F7FAFC', flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12,
    borderWidth: 1, borderColor: '#E5E7EB', gap: 12,
  },
  input: { flex: 1, fontSize: 16, color: '#0B1220' },
  scrollView: { flex: 1 },
  section: { paddingHorizontal: 24, paddingTop: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#0B1220' },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: '#FFFFFF', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 999, borderWidth: 1, borderColor: '#E5E7EB',
    flexDirection: 'row', alignItems: 'center',
  },
  chipText: { fontSize: 14, color: '#0B1220' },
  resultsContainer: { flex: 1, paddingHorizontal: 16 },
  resultsHeader: { paddingVertical: 14 },
  resultCount: { fontSize: 14, color: '#667085' },
  emptyState: { paddingVertical: 80, alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#0B1220', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#667085' },
  resultCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14,
    borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  resultImage: { width: '100%', height: 130 },
  resultImagePlaceholder: { backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  resultBody: { padding: 14 },
  resultHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  resultTitle: { flex: 1, fontSize: 16, fontWeight: 'bold', color: '#0B1220', marginRight: 8 },
  typePill: { backgroundColor: '#E0F6F6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  typePillText: { fontSize: 10, color: '#0EA5A4', fontWeight: 'bold', textTransform: 'uppercase' },
  resultLocation: { fontSize: 12, color: '#667085', flex: 1 },
  resultDescription: { fontSize: 13, color: '#6B7280', lineHeight: 19, marginBottom: 8 },
  resultFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultCategory: { fontSize: 12, color: '#0EA5A4', fontWeight: '600', textTransform: 'capitalize' },
  resultPrice: { fontSize: 15, fontWeight: 'bold', color: '#0EA5A4' },
  resultPriceFree: { fontSize: 13, fontWeight: '600', color: '#10B981' },
});
