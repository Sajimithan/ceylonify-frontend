import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Search as SearchIcon, X, SlidersHorizontal, History, TrendingUp } from 'lucide-react-native';
import { useGraphQL } from '../../src/hooks/useGraphQL';

const RECENT_SEARCHES = ['Ella Train Journey', 'Mirissa Surfing', 'Sigiriya Rock'];
const POPULAR_DESTINATIONS = ['Colombo', 'Kandy', 'Galle', 'Nuwara Eliya', 'Trincomalee'];

const GET_FEED_QUERY = `
  query GetFeed {
    feed {
      id
      title
      description
      type
      category
      price
      status
      createdAt
      lat
      lng
    }
  }
`;

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const { data, loading } = useGraphQL<{ feed: any[] }>(GET_FEED_QUERY, {});

  const allListings = data?.feed || [];

  const filteredListings = searchQuery.length > 0
    ? allListings.filter(listing =>
        listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        listing.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        listing.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        listing.category?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const handleRecentSearchClick = (query: string) => {
    setSearchQuery(query);
    setIsSearching(true);
  };

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.header}>
        <View style={styles.searchRow}>
          <View style={styles.searchInput}>
            <SearchIcon size={20} color="#667085" />
            <TextInput
              placeholder="Where to next?"
              style={styles.input}
              placeholderTextColor="#667085"
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                setIsSearching(text.length > 0);
              }}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchQuery(''); setIsSearching(false); }}>
                <X size={20} color="#667085" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.filterButton}>
            <SlidersHorizontal size={20} color="#0EA5A4" />
          </TouchableOpacity>
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
                <TouchableOpacity 
                  key={idx} 
                  style={styles.chip}
                  onPress={() => handleRecentSearchClick(item)}
                >
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
              {POPULAR_DESTINATIONS.map((city, idx) => (
                <TouchableOpacity 
                  key={idx} 
                  style={styles.chip}
                  onPress={() => handleRecentSearchClick(city)}
                >
                  <Text style={styles.chipText}>{city}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Browse All */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Browse All Experiences</Text>
            <Text style={styles.totalCount}>
              {allListings.length} experience{allListings.length !== 1 ? 's' : ''} available
            </Text>
          </View>
        </ScrollView>
      ) : (
        <ScrollView style={styles.resultsContainer} showsVerticalScrollIndicator={false}>
          {/* Search Results Header */}
          <View style={styles.resultsHeader}>
            <Text style={styles.resultCount}>
              {loading ? 'Searching...' : `${filteredListings.length} result${filteredListings.length !== 1 ? 's' : ''} found`}
            </Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0EA5A4" />
            </View>
          ) : filteredListings.length > 0 ? (
            filteredListings.map((listing) => (
              <View key={listing.id} style={styles.resultCard}>
                <View style={styles.resultHeader}>
                  <Text style={styles.resultTitle} numberOfLines={1}>
                    {listing.title}
                  </Text>
                  <Text style={styles.resultType}>{listing.type}</Text>
                </View>
                <Text style={styles.resultDescription} numberOfLines={2}>
                  {listing.description}
                </Text>
                <View style={styles.resultFooter}>
                  {listing.category && (
                    <Text style={styles.resultCategory}>
                      {listing.category}
                    </Text>
                  )}
                  {listing.price && (
                    <Text style={styles.resultPrice}>
                      LKR {listing.price}
                    </Text>
                  )}
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No results found</Text>
              <Text style={styles.emptySubtitle}>
                Try searching for something else
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#F7FAFC',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#0B1220',
  },
  filterButton: {
    backgroundColor: '#E0F6F6',
    padding: 12,
    borderRadius: 12,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0B1220',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chipText: {
    fontSize: 14,
    color: '#0B1220',
  },
  totalCount: {
    fontSize: 14,
    color: '#667085',
    marginTop: 8,
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  resultsHeader: {
    paddingVertical: 16,
  },
  resultCount: {
    fontSize: 14,
    color: '#667085',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0B1220',
  },
  resultType: {
    fontSize: 12,
    color: '#667085',
    textTransform: 'capitalize',
    marginLeft: 8,
  },
  resultDescription: {
    fontSize: 14,
    color: '#667085',
    lineHeight: 20,
    marginBottom: 12,
  },
  resultFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultCategory: {
    fontSize: 12,
    color: '#0EA5A4',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  resultPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0EA5A4',
  },
  emptyState: {
    paddingVertical: 80,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0B1220',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#667085',
  },
});
