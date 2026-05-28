import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Image, ActivityIndicator, RefreshControl, Alert, Modal, TextInput, Platform,
} from 'react-native';
import { Heart, MapPin, Trash2, Bookmark, Calendar, Plus, X } from 'lucide-react-native';
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

const MY_ITINERARY_QUERY = `
  query MyItinerary {
    myItinerary {
      id listingId plannedDate note createdAt
    }
  }
`;

const UNSAVE_MUTATION = `mutation UnsaveListing($listingId: ID!) { unsaveListing(listingId: $listingId) }`;
const ADD_ITINERARY = `mutation AddToItinerary($listingId: ID!, $plannedDate: String!, $note: String) {
  addToItinerary(listingId: $listingId, plannedDate: $plannedDate, note: $note) { id }
}`;
const REMOVE_ITINERARY = `mutation RemoveFromItinerary($itemId: ID!) { removeFromItinerary(itemId: $itemId) }`;

function groupByDate(items: any[]) {
  const map: Record<string, any[]> = {};
  items.forEach((item) => {
    const key = new Date(item.plannedDate).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    });
    if (!map[key]) map[key] = [];
    map[key].push(item);
  });
  return Object.entries(map).sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime());
}

export default function SavedScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'saved' | 'itinerary'>('saved');
  const [refreshing, setRefreshing] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [removingItinerary, setRemovingItinerary] = useState<string | null>(null);

  // Add-to-itinerary modal state
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [addTargetListing, setAddTargetListing] = useState<any>(null);
  const [plannedDate, setPlannedDate] = useState('');
  const [note, setNote] = useState('');
  const [addingToItinerary, setAddingToItinerary] = useState(false);

  const { data, loading, error, refetch } = useGraphQL<{ savedListings: any[] }>(SAVED_LISTINGS_QUERY);
  const { data: itineraryData, loading: itineraryLoading, refetch: refetchItinerary } = useGraphQL<{ myItinerary: any[] }>(MY_ITINERARY_QUERY);

  const savedListings = data?.savedListings ?? [];
  const itineraryItems = itineraryData?.myItinerary ?? [];
  const grouped = groupByDate(itineraryItems);

  // Build a quick lookup from listingId -> saved listing title for itinerary display
  const savedMap: Record<string, string> = {};
  savedListings.forEach((l) => { savedMap[l.id] = l.title; });

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([refetch(), refetchItinerary()]);
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

  function openAddModal(listing: any) {
    setAddTargetListing(listing);
    const today = new Date().toISOString().slice(0, 10);
    setPlannedDate(today);
    setNote('');
    setAddModalVisible(true);
  }

  async function submitAddToItinerary() {
    if (!addTargetListing || !plannedDate) return;
    setAddingToItinerary(true);
    try {
      await gqlFetch(ADD_ITINERARY, {
        listingId: addTargetListing.id,
        plannedDate: new Date(plannedDate).toISOString(),
        note: note.trim() || undefined,
      });
      setAddModalVisible(false);
      await refetchItinerary();
      Alert.alert('Added!', `"${addTargetListing.title}" added to your itinerary.`);
    } catch {
      Alert.alert('Error', 'Could not add to itinerary. Please try again.');
    } finally {
      setAddingToItinerary(false);
    }
  }

  async function handleRemoveFromItinerary(itemId: string) {
    setRemovingItinerary(itemId);
    try {
      await gqlFetch(REMOVE_ITINERARY, { itemId });
      await refetchItinerary();
    } catch {
      // silent
    } finally {
      setRemovingItinerary(null);
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
        <Text style={styles.headerTitle}>Your Trips</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          onPress={() => setActiveTab('saved')}
          style={[styles.tab, activeTab === 'saved' && styles.activeTab]}
        >
          <View style={styles.tabContent}>
            <Bookmark size={16} color={activeTab === 'saved' ? '#0EA5A4' : '#667085'} />
            <Text style={[styles.tabText, activeTab === 'saved' && styles.activeTabText]}>Saved</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('itinerary')}
          style={[styles.tab, activeTab === 'itinerary' && styles.activeTab]}
        >
          <View style={styles.tabContent}>
            <Calendar size={16} color={activeTab === 'itinerary' ? '#0EA5A4' : '#667085'} />
            <Text style={[styles.tabText, activeTab === 'itinerary' && styles.activeTabText]}>Itinerary</Text>
          </View>
        </TouchableOpacity>
      </View>

      {activeTab === 'itinerary' ? (
        <ScrollView
          style={styles.content}
          contentContainerStyle={itineraryItems.length === 0 ? styles.emptyContent : styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0EA5A4" />}
          showsVerticalScrollIndicator={false}
        >
          {itineraryLoading && !itineraryData ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#0EA5A4" />
            </View>
          ) : itineraryItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Calendar size={64} color="#E5E7EB" />
              <Text style={styles.emptyTitle}>No itinerary yet</Text>
              <Text style={styles.emptySubtitle}>
                Tap the + on any saved listing to plan your trip
              </Text>
            </View>
          ) : (
            grouped.map(([date, items]) => (
              <View key={date} style={styles.daySection}>
                <View style={styles.dayHeader}>
                  <Text style={styles.dayDate}>{date}</Text>
                </View>
                {items.map((item) => (
                  <View key={item.id} style={styles.itineraryItem}>
                    <View style={styles.itineraryIcon}>
                      <MapPin size={24} color="#0EA5A4" />
                    </View>
                    <View style={styles.itineraryContent}>
                      <Text style={styles.itineraryTitle} numberOfLines={1}>
                        {savedMap[item.listingId] ?? item.listingId}
                      </Text>
                      {item.note ? (
                        <Text style={styles.itineraryMeta} numberOfLines={1}>{item.note}</Text>
                      ) : null}
                    </View>
                    <TouchableOpacity
                      onPress={() => handleRemoveFromItinerary(item.id)}
                      disabled={removingItinerary === item.id}
                      style={styles.removeItineraryBtn}
                    >
                      {removingItinerary === item.id
                        ? <ActivityIndicator size="small" color="#EF4444" />
                        : <Trash2 size={16} color="#EF4444" />
                      }
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ))
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      ) : (
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
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity
                          onPress={() => openAddModal(listing)}
                          style={styles.addToItineraryBtn}
                        >
                          <Plus size={16} color="#0EA5A4" />
                        </TouchableOpacity>
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
      )}

      {/* Add to itinerary modal */}
      <Modal visible={addModalVisible} animationType="slide" transparent onRequestClose={() => setAddModalVisible(false)}>
        <View style={modalStyles.overlay}>
          <View style={modalStyles.sheet}>
            <View style={modalStyles.headerRow}>
              <Text style={modalStyles.title}>Add to Itinerary</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <X size={22} color="#667085" />
              </TouchableOpacity>
            </View>
            {addTargetListing && (
              <Text style={modalStyles.listingName} numberOfLines={1}>{addTargetListing.title}</Text>
            )}
            <Text style={modalStyles.label}>Planned Date</Text>
            <TextInput
              style={modalStyles.input}
              value={plannedDate}
              onChangeText={setPlannedDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
            />
            <Text style={modalStyles.label}>Note (optional)</Text>
            <TextInput
              style={[modalStyles.input, { height: 80, textAlignVertical: 'top' }]}
              value={note}
              onChangeText={setNote}
              placeholder="e.g. Morning visit, bring sunscreen"
              placeholderTextColor="#9CA3AF"
              multiline
            />
            <TouchableOpacity
              style={[modalStyles.submitBtn, (!plannedDate || addingToItinerary) && { opacity: 0.5 }]}
              onPress={submitAddToItinerary}
              disabled={!plannedDate || addingToItinerary}
            >
              <Text style={modalStyles.submitText}>{addingToItinerary ? 'Adding…' : 'Add to Itinerary'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#0B1220' },
  tabContainer: {
    flexDirection: 'row', paddingHorizontal: 24,
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB', backgroundColor: '#FFFFFF',
  },
  tab: {
    flex: 1, paddingVertical: 12, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  activeTab: { borderBottomColor: '#0EA5A4' },
  tabContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tabText: { fontSize: 14, fontWeight: 'bold', color: '#667085' },
  activeTabText: { color: '#0EA5A4' },
  daySection: { marginBottom: 28 },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  dayDate: { fontSize: 16, fontWeight: 'bold', color: '#0B1220' },
  itineraryItem: {
    backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12,
    borderWidth: 1, borderColor: '#E5E7EB', flexDirection: 'row',
    alignItems: 'center', marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  itineraryIcon: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: '#E0F6F6', alignItems: 'center', justifyContent: 'center',
  },
  itineraryContent: { flex: 1, marginLeft: 14 },
  itineraryTitle: { fontSize: 15, fontWeight: 'bold', color: '#0B1220' },
  itineraryMeta: { fontSize: 12, color: '#667085', marginTop: 3 },
  removeItineraryBtn: { padding: 8 },
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
  addToItineraryBtn: {
    padding: 6, backgroundColor: '#E0F6F6', borderRadius: 999,
    borderWidth: 1, borderColor: '#A5F3F0',
  },
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

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#0B1220' },
  listingName: { fontSize: 14, color: '#0EA5A4', fontWeight: '600', marginBottom: 16 },
  label: { fontSize: 12, fontWeight: 'bold', color: '#374151', textTransform: 'uppercase', marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#0B1220',
  },
  submitBtn: {
    backgroundColor: '#0EA5A4', borderRadius: 999,
    paddingVertical: 14, alignItems: 'center', marginTop: 20,
  },
  submitText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
});
