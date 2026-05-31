import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Image,
} from 'react-native';
import { Search as SearchIcon, X, History, TrendingUp, MapPin, CalendarDays } from 'lucide-react-native';
import { gqlFetch } from '../../src/hooks/useGraphQL';
import { useRouter } from 'expo-router';

const API_BASE = (process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:3000/graphql').replace('/graphql', '');

function fixImageUrl(url?: string | null): string | null {
  if (!url) return null;
  return url.replace('http://localhost:3000', API_BASE);
}

const SEARCH_QUERY = `
  query SearchListings($q: String, $limit: Int, $category: String, $startAfter: String, $startBefore: String) {
    searchListings(q: $q, limit: $limit, category: $category, startAfter: $startAfter, startBefore: $startBefore) {
      listings { id title description type category price placeName imageUrl createdAt startDateTime }
      total
    }
  }
`;

const CATEGORIES = ['NATURE', 'CULTURE', 'ADVENTURE', 'FOOD', 'WELLNESS', 'BEACH', 'HERITAGE'];

function getDatePreset(preset: string): { startAfter?: string; startBefore?: string } {
  const now = new Date();
  if (preset === 'week') {
    const end = new Date(now);
    end.setDate(end.getDate() + 7);
    return { startAfter: now.toISOString(), startBefore: end.toISOString() };
  }
  if (preset === 'month') {
    const end = new Date(now);
    end.setDate(end.getDate() + 30);
    return { startAfter: now.toISOString(), startBefore: end.toISOString() };
  }
  return {};
}

const RECENT_SEARCHES = ['Ella Train Journey', 'Mirissa Surfing', 'Sigiriya Rock'];
const POPULAR_SEARCHES = ['Colombo', 'Kandy', 'Galle', 'Nuwara Eliya', 'Trincomalee', 'Yala Safari'];

export default function SearchScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [datePreset, setDatePreset] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!searchQuery.trim() && !selectedCategory && !datePreset) {
      setResults([]);
      setTotal(0);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { startAfter, startBefore } = getDatePreset(datePreset);
        const data = await gqlFetch<{ searchListings: { listings: any[]; total: number } }>(
          SEARCH_QUERY,
          {
            q: searchQuery.trim() || undefined,
            limit: 30,
            category: selectedCategory || undefined,
            startAfter,
            startBefore,
          },
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
  }, [searchQuery, selectedCategory, datePreset]);

  const isSearching = searchQuery.trim().length > 0 || !!selectedCategory || !!datePreset;

  function resultCountLabel() {
    const parts: string[] = [];
    if (searchQuery.trim()) parts.push(`"${searchQuery.trim()}"`);
    if (selectedCategory) parts.push(selectedCategory.charAt(0) + selectedCategory.slice(1).toLowerCase());
    if (datePreset) parts.push(datePreset === 'week' ? 'this week' : 'this month');
    return `${total} result${total !== 1 ? 's' : ''}${parts.length ? ` for ${parts.join(', ')}` : ''}`;
  }

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.header}>
        <View style={styles.searchInputContainer}>
          <SearchIcon size={20} color="#667085" />
          <TextInput
            placeholder="Where to next?"
            style={styles.input}
            placeholderTextColor="#667085"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={20} color="#667085" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter chips */}
      <View style={filterStyles.row}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={filterStyles.scroll}>
          {(['week', 'month'] as const).map((p) => (
            <TouchableOpacity
              key={p}
              style={[filterStyles.chip, datePreset === p && filterStyles.chipActive]}
              onPress={() => setDatePreset(datePreset === p ? '' : p)}
            >
              <Text style={[filterStyles.chipText, datePreset === p && filterStyles.chipTextActive]}>
                {p === 'week' ? 'This Week' : 'This Month'}
              </Text>
            </TouchableOpacity>
          ))}
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[filterStyles.chip, selectedCategory === cat && filterStyles.chipActive]}
              onPress={() => setSelectedCategory(selectedCategory === cat ? '' : cat)}
            >
              <Text style={[filterStyles.chipText, selectedCategory === cat && filterStyles.chipTextActive]}>
                {cat.charAt(0) + cat.slice(1).toLowerCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      {!isSearching ? (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
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
              <Text style={styles.resultCount}>{resultCountLabel()}</Text>
            )}
          </View>

          {!loading && results.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No results found</Text>
              <Text style={styles.emptySubtitle}>Try a different search term or filter</Text>
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
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                      <MapPin size={12} color="#0EA5A4" />
                      <Text style={styles.resultLocation} numberOfLines={1}> {listing.placeName}</Text>
                    </View>
                  )}
                  {listing.startDateTime && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <CalendarDays size={12} color="#94A3B8" />
                      <Text style={[styles.resultLocation, { color: '#94A3B8' }]} numberOfLines={1}>
                        {' '}{new Date(listing.startDateTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.resultDescription} numberOfLines={2}>{listing.description}</Text>
                  <View style={styles.resultFooter}>
                    {listing.category && (
                      <Text style={styles.resultCategory}>
                        {listing.category.charAt(0) + listing.category.slice(1).toLowerCase()}
                      </Text>
                    )}
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
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  searchInputContainer: {
    backgroundColor: '#F7FAFC', flexDirection: 'row', alignItems: 'center',
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

const filterStyles = StyleSheet.create({
  row: {
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
    paddingVertical: 8,
  },
  scroll: { paddingHorizontal: 16, gap: 8, flexDirection: 'row' },
  chip: {
    borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6,
    borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF',
  },
  chipActive: { backgroundColor: '#0EA5A4', borderColor: '#0EA5A4' },
  chipText: { fontSize: 12, color: '#374151', fontWeight: '600' },
  chipTextActive: { color: '#FFFFFF' },
});
