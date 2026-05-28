import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Image, ActivityIndicator, RefreshControl, Alert, Modal, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Heart, MapPin, Trash2, Bookmark, Calendar, Plus, X, Send } from 'lucide-react-native';
import { useGraphQL, gqlFetch } from '../../src/hooks/useGraphQL';
import { useRouter, useLocalSearchParams } from 'expo-router';

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
const PLAN_ITINERARY_MUTATION = `
  mutation PlanItinerary($prompt: String!, $history: [ChatMessageInput!]) {
    planItinerary(prompt: $prompt, history: $history)
  }
`;

const SUGGESTION_CHIPS = [
  'Plan a 3-day trip to Ella',
  '5 days in Colombo & Kandy — culture + food',
  'Weekend beach trip, budget-friendly',
  '7-day honeymoon in Sri Lanka',
];

type ChatMessage = { role: 'user' | 'assistant'; content: string };

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
  const { planWith, planPlace } = useLocalSearchParams<{ planWith?: string; planPlace?: string }>();
  const autoSendRef = useRef<string | null>(null);
  const [activeTab, setActiveTab] = useState<'saved' | 'itinerary'>('saved');
  const [refreshing, setRefreshing] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [removingItinerary, setRemovingItinerary] = useState<string | null>(null);

  // Add-to-itinerary modal
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [addTargetListing, setAddTargetListing] = useState<any>(null);
  const [plannedDate, setPlannedDate] = useState('');
  const [note, setNote] = useState('');
  const [addingToItinerary, setAddingToItinerary] = useState(false);

  // AI Planner chat modal
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const chatScrollRef = useRef<ScrollView>(null);

  const { data, loading, error, refetch } = useGraphQL<{ savedListings: any[] }>(SAVED_LISTINGS_QUERY);
  const { data: itineraryData, loading: itineraryLoading, refetch: refetchItinerary } = useGraphQL<{ myItinerary: any[] }>(MY_ITINERARY_QUERY);

  const savedListings = data?.savedListings ?? [];
  const itineraryItems = itineraryData?.myItinerary ?? [];
  const grouped = groupByDate(itineraryItems);

  const savedMap: Record<string, string> = {};
  savedListings.forEach((l) => { savedMap[l.id] = l.title; });

  // Auto-open AI planner when navigated from map with a listing context
  useEffect(() => {
    if (!planWith) return;
    const prompt = planPlace
      ? `Help me plan a trip that includes "${planWith}" at ${planPlace}.`
      : `Help me plan a trip that includes "${planWith}".`;
    autoSendRef.current = prompt;
    setActiveTab('itinerary');
    setChatMessages([]);
    setChatInput('');
    setAiModalVisible(true);
  }, [planWith]); // eslint-disable-line react-hooks/exhaustive-deps

  // Once modal is open and chat is empty, fire the auto-send
  useEffect(() => {
    if (!aiModalVisible || !autoSendRef.current) return;
    const prompt = autoSendRef.current;
    autoSendRef.current = null;
    sendMessage(prompt);
  }, [aiModalVisible]); // eslint-disable-line react-hooks/exhaustive-deps

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
    setPlannedDate(new Date().toISOString().slice(0, 10));
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

  async function sendMessage(text?: string) {
    const prompt = (text ?? chatInput).trim();
    if (!prompt || aiLoading) return;
    const history = chatMessages;
    setChatMessages((prev) => [...prev, { role: 'user', content: prompt }]);
    setChatInput('');
    setAiLoading(true);
    setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
    try {
      const data = await gqlFetch<{ planItinerary: string }>(
        PLAN_ITINERARY_MUTATION,
        { prompt, history },
      );
      const reply = data?.planItinerary ?? 'Sorry, no response received.';
      setChatMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setChatMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }]);
    } finally {
      setAiLoading(false);
      setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 200);
    }
  }

  function openAiPlanner() {
    setChatMessages([]);
    setChatInput('');
    setAiModalVisible(true);
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
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0EA5A4" />}
          showsVerticalScrollIndicator={false}
        >
          {/* AI Planner banner */}
          <TouchableOpacity style={aiBannerStyles.card} onPress={openAiPlanner} activeOpacity={0.85}>
            <View style={aiBannerStyles.iconWrap}>
              <Text style={{ fontSize: 24 }}>✨</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={aiBannerStyles.title}>AI Trip Planner</Text>
              <Text style={aiBannerStyles.subtitle}>Get a personalised day-by-day itinerary for your Sri Lanka trip</Text>
            </View>
            <Text style={aiBannerStyles.arrow}>›</Text>
          </TouchableOpacity>

          {itineraryLoading && !itineraryData ? (
            <View style={[styles.centered, { marginTop: 40 }]}>
              <ActivityIndicator size="large" color="#0EA5A4" />
            </View>
          ) : itineraryItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Calendar size={64} color="#E5E7EB" />
              <Text style={styles.emptyTitle}>No itinerary yet</Text>
              <Text style={styles.emptySubtitle}>
                Tap the + on any saved listing to plan your trip, or use AI Planner above
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
                        <TouchableOpacity onPress={() => openAddModal(listing)} style={styles.addToItineraryBtn}>
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

      {/* AI Planner chat modal */}
      <Modal visible={aiModalVisible} animationType="slide" onRequestClose={() => setAiModalVisible(false)}>
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: '#F7FAFC' }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          {/* Chat header */}
          <View style={chatStyles.header}>
            <View>
              <Text style={chatStyles.headerTitle}>✨ AI Trip Planner</Text>
              <Text style={chatStyles.headerSub}>Powered by GPT-4o mini</Text>
            </View>
            <TouchableOpacity onPress={() => setAiModalVisible(false)} style={chatStyles.closeBtn}>
              <X size={22} color="#667085" />
            </TouchableOpacity>
          </View>

          {/* Message list */}
          <ScrollView
            ref={chatScrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={chatStyles.messageList}
            showsVerticalScrollIndicator={false}
          >
            {chatMessages.length === 0 && (
              <View style={chatStyles.welcome}>
                <Text style={{ fontSize: 40, marginBottom: 12 }}>🗺️</Text>
                <Text style={chatStyles.welcomeTitle}>Plan your perfect trip</Text>
                <Text style={chatStyles.welcomeSub}>
                  Tell me your destination, how many days, your interests and budget — I'll build your itinerary.
                </Text>
                <View style={chatStyles.chips}>
                  {SUGGESTION_CHIPS.map((chip) => (
                    <TouchableOpacity
                      key={chip}
                      style={chatStyles.chip}
                      onPress={() => sendMessage(chip)}
                    >
                      <Text style={chatStyles.chipText}>{chip}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {chatMessages.map((msg, idx) => (
              <View
                key={idx}
                style={[
                  chatStyles.bubble,
                  msg.role === 'user' ? chatStyles.userBubble : chatStyles.assistantBubble,
                ]}
              >
                <Text style={msg.role === 'user' ? chatStyles.userText : chatStyles.assistantText}>
                  {msg.content}
                </Text>
              </View>
            ))}

            {aiLoading && (
              <View style={[chatStyles.bubble, chatStyles.assistantBubble]}>
                <ActivityIndicator size="small" color="#0EA5A4" />
              </View>
            )}
          </ScrollView>

          {/* Input row */}
          <View style={chatStyles.inputRow}>
            <TextInput
              style={chatStyles.input}
              value={chatInput}
              onChangeText={setChatInput}
              placeholder="Describe your trip…"
              placeholderTextColor="#9CA3AF"
              multiline
              maxLength={500}
              editable={!aiLoading}
            />
            <TouchableOpacity
              style={[chatStyles.sendBtn, (!chatInput.trim() || aiLoading) && { opacity: 0.4 }]}
              onPress={() => sendMessage()}
              disabled={!chatInput.trim() || aiLoading}
            >
              <Send size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
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
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8, backgroundColor: '#FFFFFF' },
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
    alignItems: 'center', justifyContent: 'center', paddingTop: 60, paddingHorizontal: 32,
  },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#0B1220', marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: '#667085', marginTop: 8, textAlign: 'center', lineHeight: 22 },
  listingCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16,
    borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden', marginBottom: 16,
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
    padding: 6, backgroundColor: '#E0F6F6', borderRadius: 999, borderWidth: 1, borderColor: '#A5F3F0',
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

const aiBannerStyles = StyleSheet.create({
  card: {
    backgroundColor: '#0EA5A4', borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20,
    shadowColor: '#0EA5A4', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  iconWrap: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 2 },
  subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)', lineHeight: 17 },
  arrow: { fontSize: 28, color: 'rgba(255,255,255,0.7)', marginLeft: 4 },
});

const chatStyles = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#0B1220' },
  headerSub: { fontSize: 12, color: '#667085', marginTop: 2 },
  closeBtn: { padding: 4 },
  messageList: { padding: 16, paddingBottom: 8 },
  welcome: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 16 },
  welcomeTitle: { fontSize: 20, fontWeight: 'bold', color: '#0B1220', marginBottom: 8 },
  welcomeSub: { fontSize: 14, color: '#667085', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  chips: { gap: 10, width: '100%' },
  chip: {
    backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  chipText: { fontSize: 14, color: '#0B1220', fontWeight: '500' },
  bubble: {
    maxWidth: '85%', borderRadius: 16, padding: 14, marginBottom: 12,
  },
  userBubble: {
    backgroundColor: '#0EA5A4', alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#FFFFFF', alignSelf: 'flex-start',
    borderWidth: 1, borderColor: '#E5E7EB', borderBottomLeftRadius: 4,
  },
  userText: { color: '#FFFFFF', fontSize: 14, lineHeight: 21 },
  assistantText: { color: '#0B1220', fontSize: 14, lineHeight: 21 },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E7EB',
  },
  input: {
    flex: 1, backgroundColor: '#F7FAFC', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: '#0B1220',
    borderWidth: 1, borderColor: '#E5E7EB', maxHeight: 120,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#0EA5A4', alignItems: 'center', justifyContent: 'center',
  },
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
