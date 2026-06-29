import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Image, ActivityIndicator, RefreshControl, Modal, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useAppAlert } from '../../src/components/AppAlert';
import { ExperienceShareModal, type ShareableExperience } from '../../src/components/ExperienceShareModal';
import {
  Heart, MapPin, Trash2, Bookmark, Calendar, Plus, X, Send,
  Save, MessageSquare, ChevronRight, Star, Pencil, Share2,
} from 'lucide-react-native';
import { useGraphQL, gqlFetch } from '../../src/hooks/useGraphQL';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getCurrentUserUid } from '../../src/lib/firebase';
import {
  type SavedRoutePlan,
  groupByDate,
  getMappingForItem,
  getMappingForCustom,
  buildItineraryDayEntries,
  detectItineraryChanges,
  loadRoutePlan,
  saveRoutePlan,
  clearRoutePlan,
} from '../../src/lib/routePlan';
import { useTheme } from '../../src/context/ThemeContext';
import { formatListingPriceSummary, listingHasPrice } from '../../src/lib/listingPrice';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';

const API_BASE = (process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:3000/graphql').replace('/graphql', '');

function fixImageUrl(url?: string | null): string | null {
  if (!url) return null;
  return url.replace('http://localhost:3000', API_BASE);
}

// Strip any residual markdown that the AI might still produce
function cleanAiText(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/^#{1,6}\s/gm, '');
}

const SAVED_LISTINGS_QUERY = `
  query SavedListings {
    savedListings {
      id title description type category price priceTiers { label price description } placeName imageUrl startDateTime createdAt
    }
  }
`;
const MY_ITINERARY_QUERY = `
  query MyItinerary {
    myItinerary {
      id listingId plannedDate note createdAt
      listingTitle listingImageUrl listingType listingPlaceName
    }
  }
`;
const UNSAVE_MUTATION = `mutation UnsaveListing($listingId: ID!) { unsaveListing(listingId: $listingId) }`;
const ADD_ITINERARY = `mutation AddToItinerary($listingId: ID!, $plannedDate: String!, $note: String) {
  addToItinerary(listingId: $listingId, plannedDate: $plannedDate, note: $note) { id }
}`;
const REMOVE_ITINERARY = `mutation RemoveFromItinerary($itemId: ID!) { removeFromItinerary(itemId: $itemId) }`;
const PLAN_ITINERARY_MUTATION = `
  mutation PlanItinerary($prompt: String!, $history: [ChatMessageInput!], $listingId: ID) {
    planItinerary(prompt: $prompt, history: $history, listingId: $listingId) {
      text
      listings { id title imageUrl placeName price type }
    }
  }
`;
const SAVE_CHAT_MUTATION = `
  mutation SaveChat($name: String!, $messages: String!) {
    saveChat(name: $name, messages: $messages) { id name createdAt }
  }
`;
const SAVED_CHATS_QUERY = `
  query SavedChats {
    savedChats { id name createdAt updatedAt messages }
  }
`;
const DELETE_CHAT_MUTATION = `mutation DeleteSavedChat($chatId: ID!) { deleteSavedChat(chatId: $chatId) }`;

const MY_EXPERIENCES_QUERY = `
  query MyExperiences {
    myExperiences { id listingId rating text imageUrls createdAt }
  }
`;
const SHARE_EXPERIENCE_MUTATION = `
  mutation ShareExperience($listingId: ID!, $rating: Int!, $text: String!, $imageUrls: [String!]) {
    shareExperience(listingId: $listingId, rating: $rating, text: $text, imageUrls: $imageUrls) {
      id rating text imageUrls createdAt
    }
  }
`;
const DELETE_EXPERIENCE_MUTATION = `mutation DeleteMyExperience($id: ID!) { deleteMyExperience(id: $id) }`;
const UPDATE_EXPERIENCE_MUTATION = `
  mutation UpdateMyExperience($id: ID!, $rating: Int!, $text: String!, $imageUrls: [String!]) {
    updateMyExperience(id: $id, rating: $rating, text: $text, imageUrls: $imageUrls) {
      id listingId rating text imageUrls createdAt
    }
  }
`;

const SUGGESTION_CHIPS = [
  'Plan a 3-day trip to Ella',
  '5 days Colombo & Kandy — culture + food',
  'Weekend beach trip, budget-friendly',
  '7-day honeymoon in Sri Lanka',
];

type PlanListing = {
  id: string;
  title: string;
  imageUrl?: string | null;
  placeName?: string | null;
  price?: string | null;
  type: string;
};
type ChatMessage = { role: 'user' | 'assistant'; content: string; listings?: PlanListing[] };

// Render AI message with styled day headers, bullet points, and interactive listing cards
function AiMessageText({ text, listings }: { text: string; listings?: PlanListing[] }) {
  const router = useRouter();
  const listingMap = new Map<string, PlanListing>();
  listings?.forEach((l) => listingMap.set(l.title.toLowerCase(), l));

  const clean = cleanAiText(text);
  const lines = clean.split('\n');
  return (
    <View>
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <View key={i} style={{ height: 6 }} />;
        const isDayHeader = /^Day\s+\d+\s*[—\-]/.test(trimmed);
        const isBullet = trimmed.startsWith('•') || trimmed.startsWith('-');
        const isLabel = /^(Eat at:|Tip:|Transport:|Book on Ceylonify:|Available on Ceylonify:|\[Book on Ceylonify:|\[Available on Ceylonify:)/.test(trimmed);
        if (isDayHeader) {
          return <Text key={i} style={aiMsgStyles.dayHeader}>{trimmed}</Text>;
        }
        if (isLabel) {
          const bookMatch = trimmed.match(/^\[Book on Ceylonify:\s*([^—\]]+)/i);
          const searchKey = bookMatch?.[1]?.trim().toLowerCase();
          const matchedListing = searchKey
            ? listingMap.get(searchKey) ??
              [...listingMap.entries()].find(([k]) => k.includes(searchKey) || searchKey.includes(k))?.[1]
            : undefined;
          return (
            <View key={i}>
              <Text style={aiMsgStyles.label}>{trimmed}</Text>
              {matchedListing && (
                <TouchableOpacity
                  style={aiCardStyles.card}
                  activeOpacity={0.8}
                  onPress={() => router.push(`/listing/${matchedListing.id}` as any)}
                >
                  {matchedListing.imageUrl
                    ? <Image source={{ uri: fixImageUrl(matchedListing.imageUrl) ?? undefined }} style={aiCardStyles.image} />
                    : <View style={[aiCardStyles.image, aiCardStyles.imagePlaceholder]}><Text style={{ fontSize: 20 }}>🏝️</Text></View>
                  }
                  <View style={{ flex: 1 }}>
                    <Text style={aiCardStyles.title} numberOfLines={1}>{matchedListing.title}</Text>
                    {matchedListing.placeName ? <Text style={aiCardStyles.meta} numberOfLines={1}>📍 {matchedListing.placeName}</Text> : null}
                    {listingHasPrice(matchedListing)
                      ? <Text style={aiCardStyles.price}>{formatListingPriceSummary(matchedListing)}</Text>
                      : null}
                  </View>
                  <ChevronRight size={14} color="#0EA5A4" />
                </TouchableOpacity>
              )}
            </View>
          );
        }
        if (isBullet) {
          return <Text key={i} style={aiMsgStyles.bullet}>{trimmed}</Text>;
        }
        return <Text key={i} style={aiMsgStyles.body}>{trimmed}</Text>;
      })}
    </View>
  );
}

const aiMsgStyles = StyleSheet.create({
  dayHeader: { fontSize: 14, fontWeight: 'bold', color: '#0B1220', marginTop: 10, marginBottom: 2 },
  bullet: { fontSize: 13, color: '#374151', lineHeight: 20, marginLeft: 4 },
  label: { fontSize: 13, color: '#0EA5A4', fontWeight: '600', marginTop: 4 },
  body: { fontSize: 13, color: '#374151', lineHeight: 20 },
});

const aiCardStyles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F7FAFC', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB',
    marginTop: 6, marginBottom: 4, padding: 8,
  },
  image: { width: 52, height: 52, borderRadius: 8, flexShrink: 0 },
  imagePlaceholder: { backgroundColor: '#E0F6F6', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 12, fontWeight: 'bold', color: '#0B1220', marginBottom: 1 },
  meta: { fontSize: 11, color: '#667085', marginBottom: 1 },
  price: { fontSize: 11, fontWeight: '600', color: '#0EA5A4' },
});

export default function SavedScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { planWith, planPlace, tab, listingId: contextListingId } =
    useLocalSearchParams<{ planWith?: string; planPlace?: string; tab?: string; listingId?: string }>();
  const autoSendRef = useRef<string | null>(null);

  const { show: showAlert, alertEl } = useAppAlert();
  const [activeTab, setActiveTab] = useState<'saved' | 'itinerary' | 'experienced'>('saved');
  const [savedRoutePlan, setSavedRoutePlan] = useState<SavedRoutePlan | null>(null);
  const [planVisible, setPlanVisible] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [removingItinerary, setRemovingItinerary] = useState<string | null>(null);

  // Add-to-itinerary modal (from saved card)
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [addTargetListing, setAddTargetListing] = useState<any>(null);
  const [plannedDate, setPlannedDate] = useState('');
  const [note, setNote] = useState('');
  const [addingToItinerary, setAddingToItinerary] = useState(false);

  // AI Chat
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const chatScrollRef = useRef<ScrollView>(null);

  // Add plan to itinerary (from AI response)
  const [planToAdd, setPlanToAdd] = useState<string | null>(null);
  const [planDate, setPlanDate] = useState('');
  const [addingPlan, setAddingPlan] = useState(false);
  const [addPlanModalVisible, setAddPlanModalVisible] = useState(false);

  // Save chat
  const [saveChatVisible, setSaveChatVisible] = useState(false);
  const [saveChatName, setSaveChatName] = useState('');
  const [savingChat, setSavingChat] = useState(false);

  // Saved chats list
  const [savedChatsVisible, setSavedChatsVisible] = useState(false);
  const [deletingChat, setDeletingChat] = useState<string | null>(null);

  // Experienced tab state
  const [shareExpVisible, setShareExpVisible] = useState(false);
  const [editingExperience, setEditingExperience] = useState<any>(null);
  const [selectedExpListing, setSelectedExpListing] = useState<any>(null);
  const [expRating, setExpRating] = useState(0);
  const [expText, setExpText] = useState('');
  const [expImages, setExpImages] = useState<{ uri: string; name: string }[]>([]);
  const [expExistingImageUrls, setExpExistingImageUrls] = useState<string[]>([]);
  const [expSubmitting, setExpSubmitting] = useState(false);
  const [deletingExp, setDeletingExp] = useState<string | null>(null);
  const [shareTargetExp, setShareTargetExp] = useState<ShareableExperience | null>(null);

  // Date picker state
  const [plannedDateObj, setPlannedDateObj] = useState<Date>(new Date());
  const [planDateObj, setPlanDateObj] = useState<Date>(new Date());
  const [showPlannedDatePicker, setShowPlannedDatePicker] = useState(false);
  const [showPlanDatePicker, setShowPlanDatePicker] = useState(false);
  const [planTargetListingId, setPlanTargetListingId] = useState<string | null>(null);

  const { data, loading, error, refetch } = useGraphQL<{ savedListings: any[] }>(SAVED_LISTINGS_QUERY, undefined, { pollInterval: 30_000 });
  const { data: itineraryData, loading: itineraryLoading, refetch: refetchItinerary } = useGraphQL<{ myItinerary: any[] }>(MY_ITINERARY_QUERY, undefined, { pollInterval: 30_000 });
  const { data: chatsData, refetch: refetchChats } = useGraphQL<{ savedChats: any[] }>(SAVED_CHATS_QUERY);
  const { data: expData, refetch: refetchExperiences } = useGraphQL<{ myExperiences: any[] }>(MY_EXPERIENCES_QUERY, undefined, { pollInterval: 30_000 });

  const savedListings = data?.savedListings ?? [];
  const itineraryItems = itineraryData?.myItinerary ?? [];
  const savedChats = chatsData?.savedChats ?? [];
  const myExperiences = expData?.myExperiences ?? [];
  const grouped = groupByDate(itineraryItems);
  const routeCustomDestinations = savedRoutePlan?.customDestinations ?? [];
  const routePlanStale = savedRoutePlan
    ? detectItineraryChanges(savedRoutePlan.itinerarySnapshot, itineraryItems).isStale
    : false;

  // Events the user attended: only show events whose actual startDateTime is in the past.
  // For itinerary items, cross-reference savedListings to get the real event date rather
  // than relying on the user-chosen plannedDate (which may differ from the event date).
  const now = new Date();
  const experiencedListingIds = new Set(myExperiences.map((e: any) => e.listingId));

  // Map listingId → title for labelling experience cards
  const listingTitleMap = new Map<string, string>();
  itineraryItems.forEach((item: any) => { if (item.listingId && item.listingTitle) listingTitleMap.set(item.listingId, item.listingTitle); });
  savedListings.forEach((l: any) => { if (l.id && l.title) listingTitleMap.set(l.id, l.title); });
  const savedById = new Map(savedListings.map((l: any) => [l.id, l]));
  const seenIds = new Set<string>();
  const pastAttendedEvents: Array<{ id: string; title: string; placeName?: string | null; startDateTime?: string | null }> = [];
  itineraryItems
    .filter((item: any) => {
      if (item.listingType !== 'EVENT') return false;
      const saved = savedById.get(item.listingId);
      // Prefer actual event startDateTime; fall back to plannedDate only when not saved
      const eventDate = saved?.startDateTime ?? item.plannedDate;
      return eventDate && new Date(eventDate) < now;
    })
    .forEach((item: any) => {
      if (!seenIds.has(item.listingId) && !experiencedListingIds.has(item.listingId)) {
        seenIds.add(item.listingId);
        const saved = savedById.get(item.listingId);
        pastAttendedEvents.push({
          id: item.listingId,
          title: item.listingTitle ?? 'Event',
          placeName: item.listingPlaceName,
          startDateTime: saved?.startDateTime ?? item.plannedDate,
        });
      }
    });
  const savedMap: Record<string, string> = {};
  savedListings.forEach((l) => { savedMap[l.id] = l.title; });

  useEffect(() => {
    if (tab === 'itinerary') setActiveTab('itinerary');
  }, [tab]);

  useEffect(() => {
    if (!planWith) return;
    const prompt = planPlace && planPlace.trim()
      ? `I want to visit "${planWith}" at ${planPlace}. This is my main activity — please build a full trip plan around it, including nearby complementary experiences available on Ceylonify.`
      : `Help me plan a trip that includes "${planWith}". Make this the centrepiece of the plan and suggest Ceylonify experiences around it.`;
    autoSendRef.current = prompt;
    setActiveTab('itinerary');
    setChatMessages([]);
    setChatInput('');
    setAiModalVisible(true);
  }, [planWith]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!aiModalVisible || !autoSendRef.current) return;
    const prompt = autoSendRef.current;
    autoSendRef.current = null;
    sendMessage(prompt);
  }, [aiModalVisible]); // eslint-disable-line react-hooks/exhaustive-deps

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([refetch(), refetchItinerary(), refetchExperiences()]);
    setRefreshing(false);
  }

  async function loadSavedPlan() {
    const uid = getCurrentUserUid();
    const plan = await loadRoutePlan(uid, itineraryItems);
    setSavedRoutePlan(plan);
    if (plan?.plan?.trim()) {
      void saveRoutePlan(uid, plan);
    }
  }

  async function handleClearSavedPlan() {
    const uid = getCurrentUserUid();
    await clearRoutePlan(uid);
    setSavedRoutePlan(null);
    setPlanVisible(false);
  }

  useEffect(() => {
    if (activeTab === 'itinerary') loadSavedPlan();
  }, [activeTab, itineraryItems.length]); // eslint-disable-line react-hooks/exhaustive-deps


  async function pickExpImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { showAlert({ type: 'warning', title: 'Permission Required', message: 'Allow photo library access to attach photos.' }); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 0.8 });
    if (result.canceled) return;
    const asset = result.assets[0];
    setExpImages((prev) => [...prev, { uri: asset.uri, name: `exp_${Date.now()}.jpg` }]);
  }

  function resetExperienceModal() {
    setShareExpVisible(false);
    setEditingExperience(null);
    setSelectedExpListing(null);
    setExpRating(0);
    setExpText('');
    setExpImages([]);
    setExpExistingImageUrls([]);
  }

  function openNewExperienceModal() {
    resetExperienceModal();
    setShareExpVisible(true);
  }

  function openEditExperience(exp: any) {
    const savedListing = savedById.get(exp.listingId);
    setEditingExperience(exp);
    setSelectedExpListing({
      id: exp.listingId,
      title: savedListing?.title ?? listingTitleMap.get(exp.listingId) ?? 'Event',
      placeName: savedListing?.placeName ?? null,
      startDateTime: savedListing?.startDateTime ?? null,
    });
    setExpRating(exp.rating);
    setExpText(exp.text);
    setExpExistingImageUrls(exp.imageUrls ?? []);
    setExpImages([]);
    setShareExpVisible(true);
  }

  async function submitExperience() {
    if (!selectedExpListing || expRating === 0 || expText.trim().length < 10) return;
    setExpSubmitting(true);
    try {
      const uploadedUrls: string[] = [];
      for (const img of expImages) {
        const formData = new FormData();
        formData.append('file', { uri: img.uri, name: img.name, type: 'image/jpeg' } as any);
        const res = await fetch(`${API_BASE}/upload`, { method: 'POST', body: formData });
        if (res.ok) { const d = await res.json(); uploadedUrls.push(`${API_BASE}${d.url}`); }
      }
      const imageUrls = [...expExistingImageUrls, ...uploadedUrls];
      if (editingExperience) {
        await gqlFetch(UPDATE_EXPERIENCE_MUTATION, {
          id: editingExperience.id,
          rating: expRating,
          text: expText.trim(),
          imageUrls,
        });
        showAlert({ type: 'success', title: 'Review Updated', message: 'Your experience has been saved.' });
        resetExperienceModal();
      } else {
        await gqlFetch(SHARE_EXPERIENCE_MUTATION, {
          listingId: selectedExpListing.id,
          rating: expRating,
          text: expText.trim(),
          imageUrls,
        });
        const postedTitle = selectedExpListing.title;
        const postedListingId = selectedExpListing.id;
        resetExperienceModal();
        showAlert({ type: 'success', title: 'Experience Shared!', message: 'Your review has been posted for this event.' });
        setShareTargetExp({
          listingId: postedListingId,
          rating: expRating,
          text: expText.trim(),
          title: postedTitle,
        });
      }
      await refetchExperiences();
    } catch (e: any) {
      showAlert({ type: 'error', title: editingExperience ? 'Could Not Update' : 'Could Not Share', message: e.message?.includes('profan') ? 'Your review contains inappropriate language. Please revise it.' : (e.message || 'Could not save experience. Please try again.') });
    } finally {
      setExpSubmitting(false);
    }
  }

  async function handleDeleteExp(id: string) {
    setDeletingExp(id);
    try { await gqlFetch(DELETE_EXPERIENCE_MUTATION, { id }); await refetchExperiences(); } catch {}
    setDeletingExp(null);
  }

  function openExperienceShare(exp: any) {
    setShareTargetExp({
      listingId: exp.listingId,
      rating: exp.rating,
      text: exp.text,
      title: listingTitleMap.get(exp.listingId) ?? null,
    });
  }

  async function handleRemove(listingId: string) {
    setRemoving(listingId);
    try { await gqlFetch(UNSAVE_MUTATION, { listingId }); await refetch(); } catch {}
    setRemoving(null);
  }

  function openAddModal(listing: any) {
    setAddTargetListing(listing);
    const defaultDate = listing.startDateTime ? new Date(listing.startDateTime) : new Date();
    setPlannedDateObj(defaultDate);
    setPlannedDate(defaultDate.toISOString().slice(0, 10));
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
      showAlert({ type: 'success', title: 'Added to Itinerary!', message: `"${addTargetListing.title}" has been added to your trip plan.` });
    } catch {
      showAlert({ type: 'error', title: 'Could Not Add', message: 'Could not add to itinerary. Please try again.' });
    } finally {
      setAddingToItinerary(false);
    }
  }

  async function handleRemoveFromItinerary(itemId: string) {
    setRemovingItinerary(itemId);
    try { await gqlFetch(REMOVE_ITINERARY, { itemId }); await refetchItinerary(); } catch {}
    setRemovingItinerary(null);
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
      const result = await gqlFetch<{ planItinerary: { text: string; listings: PlanListing[] } }>(PLAN_ITINERARY_MUTATION, {
        prompt,
        history,
        listingId: contextListingId || undefined,
      });
      const planResult = result?.planItinerary;
      const reply = cleanAiText(planResult?.text ?? 'Sorry, no response received.');
      setChatMessages((prev) => [...prev, { role: 'assistant', content: reply, listings: planResult?.listings ?? [] }]);
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
    setPlanToAdd(null);
    setAiModalVisible(true);
  }

  // Add AI plan to itinerary
  function promptAddPlanToItinerary(planText: string, msgListings?: PlanListing[]) {
    const targetId = contextListingId ?? msgListings?.[0]?.id ?? savedListings[0]?.id ?? null;
    if (!targetId) {
      showAlert({ type: 'warning', title: 'No Listing Found', message: 'Save a listing or open one from the map to link this plan to your itinerary.' });
      return;
    }
    setPlanTargetListingId(targetId);
    setPlanToAdd(planText);
    const today = new Date();
    setPlanDateObj(today);
    setPlanDate(today.toISOString().slice(0, 10));
    setAddPlanModalVisible(true);
  }

  async function submitAddPlan() {
    if (!planDate || !planToAdd || !planTargetListingId) return;
    setAddingPlan(true);
    try {
      await gqlFetch(ADD_ITINERARY, {
        listingId: planTargetListingId,
        plannedDate: new Date(planDate).toISOString(),
        note: planToAdd.slice(0, 500),
      });
      setAddPlanModalVisible(false);
      setPlanToAdd(null);
      setPlanTargetListingId(null);
      await refetchItinerary();
      showAlert({ type: 'success', title: 'Plan Saved!', message: 'Your AI itinerary has been added to your trip plan.' });
    } catch {
      showAlert({ type: 'error', title: 'Could Not Save', message: 'Could not save the plan. Please try again.' });
    } finally {
      setAddingPlan(false);
    }
  }

  // Save current chat
  async function handleSaveChat() {
    if (chatMessages.length === 0) return;
    const defaultName = chatMessages.find((m) => m.role === 'user')?.content.slice(0, 40) ?? 'My Trip Plan';
    setSaveChatName(defaultName);
    setSaveChatVisible(true);
  }

  async function submitSaveChat() {
    if (!saveChatName.trim()) return;
    setSavingChat(true);
    try {
      await gqlFetch(SAVE_CHAT_MUTATION, {
        name: saveChatName.trim(),
        messages: JSON.stringify(chatMessages),
      });
      setSaveChatVisible(false);
      await refetchChats();
      showAlert({ type: 'success', title: 'Chat Saved!', message: 'Your conversation has been saved. You can resume it anytime.' });
    } catch {
      showAlert({ type: 'error', title: 'Could Not Save', message: 'Could not save the chat. Please try again.' });
    } finally {
      setSavingChat(false);
    }
  }

  function loadSavedChat(chat: any) {
    try {
      const msgs: ChatMessage[] = JSON.parse(chat.messages);
      setChatMessages(msgs);
      setSavedChatsVisible(false);
    } catch {
      showAlert({ type: 'error', title: 'Could Not Load', message: 'Could not load this chat. Please try again.' });
    }
  }

  async function deleteChat(chatId: string) {
    setDeletingChat(chatId);
    try {
      await gqlFetch(DELETE_CHAT_MUTATION, { chatId });
      await refetchChats();
    } catch {}
    setDeletingChat(null);
  }

  if (loading && !data) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>Failed to load saved listings.</Text>
        <TouchableOpacity onPress={() => refetch()} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {alertEl}
      <ExperienceShareModal
        visible={!!shareTargetExp}
        experience={shareTargetExp}
        onClose={() => setShareTargetExp(null)}
      />
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Your Trips</Text>
      </View>

      <View style={[styles.tabContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => setActiveTab('saved')} style={[styles.tab, activeTab === 'saved' && styles.activeTab]}>
          <View style={styles.tabContent}>
            <Bookmark size={16} color={activeTab === 'saved' ? '#0EA5A4' : '#667085'} />
            <Text style={[styles.tabText, activeTab === 'saved' && styles.activeTabText]}>Saved</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setActiveTab('itinerary')} style={[styles.tab, activeTab === 'itinerary' && styles.activeTab]}>
          <View style={styles.tabContent}>
            <Calendar size={16} color={activeTab === 'itinerary' ? '#0EA5A4' : '#667085'} />
            <Text style={[styles.tabText, activeTab === 'itinerary' && styles.activeTabText]}>Itinerary</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setActiveTab('experienced')} style={[styles.tab, activeTab === 'experienced' && styles.activeTab]}>
          <View style={styles.tabContent}>
            <Star size={16} color={activeTab === 'experienced' ? '#0EA5A4' : '#667085'} />
            <Text style={[styles.tabText, activeTab === 'experienced' && styles.activeTabText]}>Experienced</Text>
          </View>
        </TouchableOpacity>
      </View>

      {activeTab === 'itinerary' && (
        <ScrollView style={styles.content} contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0EA5A4" />}
          showsVerticalScrollIndicator={false}
        >
          {/* AI Planner banner */}
          <TouchableOpacity style={aiBannerStyles.card} onPress={openAiPlanner} activeOpacity={0.85}>
            <View style={aiBannerStyles.iconWrap}><Text style={{ fontSize: 24 }}>✨</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={aiBannerStyles.title}>AI Trip Planner</Text>
              <Text style={aiBannerStyles.subtitle}>Get a personalised day-by-day itinerary using Ceylonify experiences</Text>
            </View>
            <Text style={aiBannerStyles.arrow}>›</Text>
          </TouchableOpacity>

          {/* Saved Route Plan — compact header bar */}
          {/* Route plan banner */}
          {savedRoutePlan && (
            <View style={{
              backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 16,
              borderWidth: 1, borderColor: '#D1FAE5',
              shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.07, shadowRadius: 8, elevation: 4,
            }}>
              {/* Teal accent stripe */}
              <View style={{
                height: 4, backgroundColor: '#0EA5A4',
                borderTopLeftRadius: 15, borderTopRightRadius: 15,
              }} />
              {/* Header row */}
              <View style={{
                flexDirection: 'row', alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 17 }}>🗺️</Text>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#0B1220' }}>AI Route Plan</Text>
                  {routePlanStale && (
                    <View style={styles.routePlanStaleBadge}>
                      <Text style={styles.routePlanStaleBadgeText}>Outdated</Text>
                    </View>
                  )}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => router.push('/(tabs)/map' as any)}
                    style={{
                      width: 32, height: 32, borderRadius: 16,
                      backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <MapPin size={14} color="#0EA5A4" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleClearSavedPlan}
                    style={{
                      width: 32, height: 32, borderRadius: 16,
                      backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Trash2 size={14} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
              {/* Summary */}
              <Text style={{ fontSize: 12, color: '#6B7280', lineHeight: 18, paddingHorizontal: 14, paddingBottom: 12 }}>
                {savedRoutePlan.summary}
              </Text>
              {/* Toggle button */}
              <TouchableOpacity
                onPress={() => setPlanVisible(v => !v)}
                activeOpacity={0.75}
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: '#F0FDF9', paddingVertical: 11,
                  borderTopWidth: 1, borderTopColor: '#D1FAE5',
                  borderBottomLeftRadius: 15, borderBottomRightRadius: 15,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#0EA5A4' }}>
                  {planVisible ? '▲  Hide route plan' : '▼  Show route plan'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {itineraryLoading && !itineraryData ? (
            <View style={[styles.centered, { marginTop: 40 }]}><ActivityIndicator size="large" color="#0EA5A4" /></View>
          ) : itineraryItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Calendar size={64} color="#E5E7EB" />
              <Text style={styles.emptyTitle}>No itinerary yet</Text>
              <Text style={styles.emptySubtitle}>Tap the + on any saved listing, or use the AI Planner above</Text>
            </View>
          ) : (
            grouped.map(({ isoDate, label, items }) => {
              const dayEntries = buildItineraryDayEntries(isoDate, items, routeCustomDestinations);
              return (
              <View key={isoDate} style={styles.daySection}>
                <View style={styles.dayHeader}><Text style={styles.dayDate}>{label}</Text></View>
                {dayEntries.map((entry) => {
                  if (entry.kind === 'custom') {
                    const { custom } = entry;
                    const routePlanItem =
                      savedRoutePlan && planVisible
                        ? getMappingForCustom(savedRoutePlan.mappings, custom.id)
                        : null;
                    return (
                      <View key={`custom-${custom.id}`} style={styles.destinationEntry}>
                        <View style={styles.destinationBanner}>
                          <View style={styles.destinationIcon}>
                            <MapPin size={24} color="#F59E0B" />
                          </View>
                          <View style={styles.destinationContent}>
                            <View style={styles.destinationKindBadge}>
                              <Text style={styles.destinationKindBadgeText}>DESTINATION</Text>
                            </View>
                            <Text style={styles.destinationTitle} numberOfLines={2}>{custom.title}</Text>
                            {custom.placeName ? (
                              <Text style={styles.destinationMeta} numberOfLines={2}>📍 {custom.placeName}</Text>
                            ) : null}
                          </View>
                        </View>
                        {routePlanItem ? (
                          <View style={styles.routeSnippetBelowBanner}>
                            <View style={styles.routeSnippetPill}>
                              <Text style={styles.routeSnippetPillText}>{routePlanItem.header}</Text>
                            </View>
                            {routePlanItem.segments.map((segment, segmentIndex) => (
                              <View
                                key={`${custom.id}-route-${segmentIndex}`}
                                style={segmentIndex > 0 ? styles.routeSnippetSegment : undefined}
                              >
                                <Text
                                  style={[
                                    styles.routeSnippetText,
                                    segment.isTravel && styles.routeSnippetTravelText,
                                  ]}
                                >
                                  {segment.bullet}
                                </Text>
                              </View>
                            ))}
                          </View>
                        ) : null}
                      </View>
                    );
                  }

                  const item = entry.item;
                  const title = item.listingTitle ?? savedMap[item.listingId] ?? 'Unknown listing';
                  const imageUrl = item.listingImageUrl ? fixImageUrl(item.listingImageUrl) : null;
                  const routePlanItem =
                    savedRoutePlan && planVisible
                      ? getMappingForItem(savedRoutePlan.mappings, item.id)
                      : null;
                  return (
                    <View key={item.id} style={styles.itineraryItem}>
                      <TouchableOpacity
                        style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                        activeOpacity={0.75}
                        onPress={() => router.push(`/listing/${item.listingId}` as any)}
                      >
                        {imageUrl
                          ? <Image source={{ uri: imageUrl }} style={styles.itineraryImage} />
                          : <View style={styles.itineraryIcon}><MapPin size={24} color="#0EA5A4" /></View>
                        }
                        <View style={styles.itineraryContent}>
                          <Text style={styles.itineraryTitle} numberOfLines={1}>{title}</Text>
                          {item.listingPlaceName ? <Text style={styles.itineraryMeta} numberOfLines={1}>📍 {item.listingPlaceName}</Text> : null}
                          {item.listingType ? <Text style={styles.itineraryType}>{item.listingType}</Text> : null}
                          {item.note ? <Text style={styles.itineraryNote} numberOfLines={2}>{item.note}</Text> : null}
                          {routePlanItem ? (
                            <View style={styles.routeSnippet}>
                              <View style={styles.routeSnippetPill}>
                                <Text style={styles.routeSnippetPillText}>{routePlanItem.header}</Text>
                              </View>
                              {routePlanItem.segments.map((segment, segmentIndex) => (
                                <View
                                  key={`${item.id}-route-${segmentIndex}`}
                                  style={segmentIndex > 0 ? styles.routeSnippetSegment : undefined}
                                >
                                  <Text
                                    style={[
                                      styles.routeSnippetText,
                                      segment.isTravel && styles.routeSnippetTravelText,
                                    ]}
                                  >
                                    {segment.bullet}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          ) : null}
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleRemoveFromItinerary(item.id)} disabled={removingItinerary === item.id} style={styles.removeItineraryBtn}>
                        {removingItinerary === item.id ? <ActivityIndicator size="small" color="#EF4444" /> : <Trash2 size={16} color="#EF4444" />}
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
              );
            })
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {activeTab === 'saved' && (
        <ScrollView style={styles.content}
          contentContainerStyle={savedListings.length === 0 ? styles.emptyContent : styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0EA5A4" />}
          showsVerticalScrollIndicator={false}
        >
          {savedListings.length === 0 ? (
            <View style={styles.emptyState}>
              <Heart size={64} color="#E5E7EB" />
              <Text style={styles.emptyTitle}>No saved experiences yet</Text>
              <Text style={styles.emptySubtitle}>Tap the heart icon on any listing to save it here</Text>
            </View>
          ) : (
            savedListings.filter((listing: any) =>
              !(listing.type === 'EVENT' && listing.startDateTime && new Date(listing.startDateTime) < now)
            ).map((listing: any) => {
              const imageUrl = fixImageUrl(listing.imageUrl);
              const isRemoving = removing === listing.id;
              return (
                <TouchableOpacity key={listing.id} style={styles.listingCard} activeOpacity={0.85}
                  onPress={() => router.push(`/listing/${listing.id}`)}>
                  {imageUrl
                    ? <Image source={{ uri: imageUrl }} style={styles.listingImage} resizeMode="cover" />
                    : <View style={[styles.listingImage, styles.listingImagePlaceholder]}><Text style={{ fontSize: 36 }}>🏝️</Text></View>
                  }
                  <View style={styles.typeBadge}><Text style={styles.typeBadgeText}>{listing.type}</Text></View>
                  <View style={styles.listingBody}>
                    <View style={styles.listingHeader}>
                      <Text style={styles.listingTitle} numberOfLines={1}>{listing.title}</Text>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity onPress={() => openAddModal(listing)} style={styles.addToItineraryBtn}>
                          <Plus size={16} color="#0EA5A4" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleRemove(listing.id)} disabled={isRemoving} style={styles.removeButton}>
                          {isRemoving ? <ActivityIndicator size="small" color="#EF4444" /> : <Trash2 size={18} color="#EF4444" />}
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
                      {listing.category
                        ? <View style={styles.categoryTag}><Text style={styles.categoryTagText}>{listing.category}</Text></View>
                        : <View />}
                      {listingHasPrice(listing)
                        ? <Text style={styles.listingPrice}>{formatListingPriceSummary(listing)}</Text>
                        : <Text style={styles.listingPriceFree}>Free</Text>}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {activeTab === 'experienced' && (
        <ScrollView style={styles.content} contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0EA5A4" />}
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={expTabStyles.addBtn} onPress={openNewExperienceModal}>
            <Plus size={18} color="#fff" />
            <Text style={expTabStyles.addBtnText}>Share an Experience</Text>
          </TouchableOpacity>

          {myExperiences.length === 0 ? (
            <View style={styles.emptyState}>
              <Star size={64} color="#E5E7EB" />
              <Text style={styles.emptyTitle}>No experiences yet</Text>
              <Text style={styles.emptySubtitle}>Attend an event and share your story with the community</Text>
            </View>
          ) : myExperiences.map((exp: any) => {
            const eventTitle = listingTitleMap.get(exp.listingId);
            return (
              <View key={exp.id} style={expTabStyles.card}>
                {eventTitle ? (
                  <TouchableOpacity onPress={() => router.push(`/listing/${exp.listingId}` as any)} activeOpacity={0.75}>
                    <Text style={expTabStyles.eventTitle} numberOfLines={1}>{eventTitle}</Text>
                  </TouchableOpacity>
                ) : null}
                <View style={expTabStyles.cardHeader}>
                  <View>
                    <View style={{ flexDirection: 'row', gap: 3, marginBottom: 4 }}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} size={14} color={s <= exp.rating ? '#F59E0B' : '#D1D5DB'} fill={s <= exp.rating ? '#F59E0B' : 'none'} />
                      ))}
                    </View>
                    <Text style={expTabStyles.date}>
                      {new Date(exp.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                  </View>
                  <View style={expTabStyles.cardActions}>
                    <TouchableOpacity onPress={() => openEditExperience(exp)} style={expTabStyles.iconBtn}>
                      <Pencil size={16} color="#0EA5A4" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteExp(exp.id)} disabled={deletingExp === exp.id} style={expTabStyles.iconBtn}>
                      {deletingExp === exp.id
                        ? <ActivityIndicator size="small" color="#EF4444" />
                        : <Trash2 size={16} color="#EF4444" />}
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={expTabStyles.text}>{exp.text}</Text>
                {(exp.imageUrls ?? []).length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                    {exp.imageUrls.map((url: string, i: number) => (
                      <Image key={i} source={{ uri: fixImageUrl(url) ?? url }} style={expTabStyles.photo} />
                    ))}
                  </ScrollView>
                )}
                <TouchableOpacity style={expTabStyles.shareBtn} onPress={() => openExperienceShare(exp)}>
                  <Share2 size={14} color="#0EA5A4" />
                  <Text style={expTabStyles.shareBtnText}>Share on Social Media</Text>
                </TouchableOpacity>
              </View>
            );
          })}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Share Experience modal */}
      <Modal visible={shareExpVisible} animationType="slide" transparent onRequestClose={resetExperienceModal}>
        <View style={modalStyles.overlay}>
          <ScrollView style={[modalStyles.sheet, { maxHeight: '92%' }]} contentContainerStyle={{ paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
            <View style={modalStyles.headerRow}>
              <Text style={modalStyles.title}>{editingExperience ? 'Edit Your Experience' : 'Share Your Experience'}</Text>
              <TouchableOpacity onPress={resetExperienceModal}><X size={22} color="#667085" /></TouchableOpacity>
            </View>

            {/* Event selection */}
            {selectedExpListing ? (
              <View style={expTabStyles.selectedListing}>
                <View style={{ flex: 1 }}>
                  <Text style={expTabStyles.selectedListingTitle}>{selectedExpListing.title}</Text>
                  {selectedExpListing.placeName ? <Text style={expTabStyles.selectedListingMeta}>📍 {selectedExpListing.placeName}</Text> : null}
                </View>
                {!editingExperience ? (
                  <TouchableOpacity onPress={() => setSelectedExpListing(null)}>
                    <X size={16} color="#667085" />
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : !editingExperience ? (
              <>
                <Text style={modalStyles.label}>Events you attended</Text>
                {pastAttendedEvents.length > 0 ? (
                  pastAttendedEvents.map((ev) => (
                    <TouchableOpacity key={ev.id} style={expTabStyles.searchResult} onPress={() => setSelectedExpListing(ev)}>
                      <Text style={expTabStyles.searchResultText}>{ev.title}</Text>
                      {ev.placeName ? <Text style={expTabStyles.searchResultMeta}>📍 {ev.placeName}</Text> : null}
                      {ev.startDateTime ? (
                        <Text style={expTabStyles.searchResultMeta}>
                          {new Date(ev.startDateTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </Text>
                      ) : null}
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={expTabStyles.noSuggestionsText}>
                    You can only share experiences for events you attended. Mark an event as "Going" or add it to your itinerary before it happens.
                  </Text>
                )}
              </>
            ) : null}

            {/* Star rating */}
            <Text style={modalStyles.label}>Rating</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <TouchableOpacity key={s} onPress={() => setExpRating(s)}>
                  <Star size={32} color={s <= expRating ? '#F59E0B' : '#D1D5DB'} fill={s <= expRating ? '#F59E0B' : 'none'} />
                </TouchableOpacity>
              ))}
            </View>

            {/* Text */}
            <Text style={modalStyles.label}>Your Experience</Text>
            <TextInput
              style={[modalStyles.input, { height: 100, textAlignVertical: 'top' }]}
              placeholder="Describe your experience (min 10 characters)…"
              placeholderTextColor="#9CA3AF"
              value={expText}
              onChangeText={setExpText}
              multiline
            />

            {/* Photos */}
            <Text style={modalStyles.label}>Add Photos (optional)</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {expExistingImageUrls.map((url, i) => (
                <View key={`${url}-${i}`} style={{ position: 'relative' }}>
                  <Image source={{ uri: fixImageUrl(url) ?? url }} style={expTabStyles.thumb} />
                  <TouchableOpacity
                    style={expTabStyles.thumbRemove}
                    onPress={() => setExpExistingImageUrls((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    <X size={10} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
              {expImages.map((img, i) => (
                <View key={i} style={{ position: 'relative' }}>
                  <Image source={{ uri: img.uri }} style={expTabStyles.thumb} />
                  <TouchableOpacity
                    style={expTabStyles.thumbRemove}
                    onPress={() => setExpImages((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    <X size={10} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
              {expExistingImageUrls.length + expImages.length < 4 && (
                <TouchableOpacity style={expTabStyles.addPhotoBtn} onPress={pickExpImage}>
                  <Plus size={20} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={[modalStyles.submitBtn, (!selectedExpListing || expRating === 0 || expText.trim().length < 10 || expSubmitting) && { opacity: 0.5 }]}
              onPress={submitExperience}
              disabled={!selectedExpListing || expRating === 0 || expText.trim().length < 10 || expSubmitting}
            >
              <Text style={modalStyles.submitText}>
                {expSubmitting ? 'Saving…' : editingExperience ? 'Save Changes' : '⭐ Share Experience'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Add to itinerary modal (from saved card) */}
      <Modal visible={addModalVisible} animationType="slide" transparent onRequestClose={() => setAddModalVisible(false)}>
        <View style={modalStyles.overlay}>
          <View style={modalStyles.sheet}>
            <View style={modalStyles.headerRow}>
              <Text style={modalStyles.title}>Add to Itinerary</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}><X size={22} color="#667085" /></TouchableOpacity>
            </View>
            {addTargetListing && <Text style={modalStyles.listingName} numberOfLines={1}>{addTargetListing.title}</Text>}
            <Text style={modalStyles.label}>Planned Date</Text>
            <TouchableOpacity
              style={[modalStyles.input, { justifyContent: 'center' }]}
              onPress={() => setShowPlannedDatePicker(true)}
            >
              <Text style={{ fontSize: 14, color: '#0B1220' }}>
                {plannedDateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </Text>
            </TouchableOpacity>
            {showPlannedDatePicker && (
              <DateTimePicker
                value={plannedDateObj}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, date) => {
                  if (Platform.OS === 'android') setShowPlannedDatePicker(false);
                  if (date) { setPlannedDateObj(date); setPlannedDate(date.toISOString().slice(0, 10)); }
                }}
              />
            )}
            <Text style={modalStyles.label}>Note (optional)</Text>
            <TextInput style={[modalStyles.input, { height: 80, textAlignVertical: 'top' }]}
              value={note} onChangeText={setNote}
              placeholder="e.g. Morning visit, bring sunscreen" placeholderTextColor="#9CA3AF" multiline />
            <TouchableOpacity style={[modalStyles.submitBtn, (!plannedDate || addingToItinerary) && { opacity: 0.5 }]}
              onPress={submitAddToItinerary} disabled={!plannedDate || addingToItinerary}>
              <Text style={modalStyles.submitText}>{addingToItinerary ? 'Adding…' : 'Add to Itinerary'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add AI plan to itinerary modal */}
      <Modal visible={addPlanModalVisible} animationType="slide" transparent onRequestClose={() => setAddPlanModalVisible(false)}>
        <View style={modalStyles.overlay}>
          <View style={modalStyles.sheet}>
            <View style={modalStyles.headerRow}>
              <Text style={modalStyles.title}>Save Plan to Itinerary</Text>
              <TouchableOpacity onPress={() => setAddPlanModalVisible(false)}><X size={22} color="#667085" /></TouchableOpacity>
            </View>
            <Text style={modalStyles.subText}>Choose a start date for this AI-generated plan.</Text>
            <Text style={modalStyles.label}>Start Date</Text>
            <TouchableOpacity
              style={[modalStyles.input, { justifyContent: 'center' }]}
              onPress={() => setShowPlanDatePicker(true)}
            >
              <Text style={{ fontSize: 14, color: '#0B1220' }}>
                {planDateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </Text>
            </TouchableOpacity>
            {showPlanDatePicker && (
              <DateTimePicker
                value={planDateObj}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, date) => {
                  if (Platform.OS === 'android') setShowPlanDatePicker(false);
                  if (date) { setPlanDateObj(date); setPlanDate(date.toISOString().slice(0, 10)); }
                }}
              />
            )}
            <TouchableOpacity style={[modalStyles.submitBtn, (!planDate || addingPlan) && { opacity: 0.5 }]}
              onPress={submitAddPlan} disabled={!planDate || addingPlan}>
              <Text style={modalStyles.submitText}>{addingPlan ? 'Saving…' : '📅 Save to Itinerary'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Save chat name modal */}
      <Modal visible={saveChatVisible} animationType="fade" transparent onRequestClose={() => setSaveChatVisible(false)}>
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.sheet, { paddingBottom: 24 }]}>
            <View style={modalStyles.headerRow}>
              <Text style={modalStyles.title}>Save Chat</Text>
              <TouchableOpacity onPress={() => setSaveChatVisible(false)}><X size={22} color="#667085" /></TouchableOpacity>
            </View>
            <Text style={modalStyles.label}>Chat Name</Text>
            <TextInput style={modalStyles.input} value={saveChatName} onChangeText={setSaveChatName}
              placeholder="e.g. My Ella trip plan" placeholderTextColor="#9CA3AF" autoFocus maxLength={60} />
            <TouchableOpacity style={[modalStyles.submitBtn, (!saveChatName.trim() || savingChat) && { opacity: 0.5 }]}
              onPress={submitSaveChat} disabled={!saveChatName.trim() || savingChat}>
              <Text style={modalStyles.submitText}>{savingChat ? 'Saving…' : '💾 Save'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Saved chats list modal */}
      <Modal visible={savedChatsVisible} animationType="slide" transparent onRequestClose={() => setSavedChatsVisible(false)}>
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.sheet, { maxHeight: '75%' }]}>
            <View style={modalStyles.headerRow}>
              <Text style={modalStyles.title}>Saved Chats</Text>
              <TouchableOpacity onPress={() => setSavedChatsVisible(false)}><X size={22} color="#667085" /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {savedChats.length === 0 ? (
                <Text style={[modalStyles.subText, { textAlign: 'center', marginTop: 24 }]}>No saved chats yet.</Text>
              ) : (
                savedChats.map((chat) => (
                  <View key={chat.id} style={savedChatItemStyles.row}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => loadSavedChat(chat)}>
                      <Text style={savedChatItemStyles.name} numberOfLines={1}>{chat.name}</Text>
                      <Text style={savedChatItemStyles.date}>
                        {new Date(chat.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteChat(chat.id)} disabled={deletingChat === chat.id} style={{ padding: 8 }}>
                      {deletingChat === chat.id
                        ? <ActivityIndicator size="small" color="#EF4444" />
                        : <Trash2 size={16} color="#EF4444" />}
                    </TouchableOpacity>
                    <ChevronRight size={16} color="#D1D5DB" />
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* AI Planner chat modal */}
      <Modal visible={aiModalVisible} animationType="slide" onRequestClose={() => setAiModalVisible(false)}>
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#F7FAFC' }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>

          {/* Chat header */}
          <View style={chatStyles.header}>
            <View style={{ flex: 1 }}>
              <Text style={chatStyles.headerTitle}>✨ AI Trip Planner</Text>
              <Text style={chatStyles.headerSub}>Ceylonify experiences · Sri Lanka only</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              {chatMessages.length > 0 && (
                <>
                  <TouchableOpacity onPress={() => setSavedChatsVisible(true)} style={chatStyles.headerBtn}>
                    <MessageSquare size={18} color="#667085" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleSaveChat} style={chatStyles.headerBtn}>
                    <Save size={18} color="#0EA5A4" />
                  </TouchableOpacity>
                </>
              )}
              {chatMessages.length === 0 && savedChats.length > 0 && (
                <TouchableOpacity onPress={() => setSavedChatsVisible(true)} style={chatStyles.headerBtn}>
                  <MessageSquare size={18} color="#667085" />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => setAiModalVisible(false)} style={chatStyles.closeBtn}>
                <X size={22} color="#667085" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Message list */}
          <ScrollView ref={chatScrollRef} style={{ flex: 1 }}
            contentContainerStyle={chatStyles.messageList} showsVerticalScrollIndicator={false}>

            {chatMessages.length === 0 && (
              <View style={chatStyles.welcome}>
                <Text style={{ fontSize: 40, marginBottom: 12 }}>🗺️</Text>
                <Text style={chatStyles.welcomeTitle}>Plan your perfect trip</Text>
                <Text style={chatStyles.welcomeSub}>
                  Tell me your destination, how many days, your interests and budget — I'll build your itinerary using Ceylonify experiences.
                </Text>
                <View style={chatStyles.chips}>
                  {SUGGESTION_CHIPS.map((chip) => (
                    <TouchableOpacity key={chip} style={chatStyles.chip} onPress={() => sendMessage(chip)}>
                      <Text style={chatStyles.chipText}>{chip}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {chatMessages.map((msg, idx) => (
              <View key={idx}>
                <View style={[chatStyles.bubble, msg.role === 'user' ? chatStyles.userBubble : chatStyles.assistantBubble]}>
                  {msg.role === 'user'
                    ? <Text style={chatStyles.userText}>{msg.content}</Text>
                    : <AiMessageText text={msg.content} listings={msg.listings} />
                  }
                </View>
                {/* Add to itinerary button after last AI message */}
                {msg.role === 'assistant' && idx === chatMessages.length - 1 && !aiLoading && (
                  <TouchableOpacity
                    style={chatStyles.addPlanBtn}
                    onPress={() => promptAddPlanToItinerary(msg.content, msg.listings)}
                  >
                    <Calendar size={13} color="#0EA5A4" />
                    <Text style={chatStyles.addPlanBtnText}>📅 Save this plan to Itinerary</Text>
                  </TouchableOpacity>
                )}
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
            <TextInput style={chatStyles.input} value={chatInput} onChangeText={setChatInput}
              placeholder="Describe your trip…" placeholderTextColor="#9CA3AF"
              multiline maxLength={500} editable={!aiLoading} />
            <TouchableOpacity style={[chatStyles.sendBtn, (!chatInput.trim() || aiLoading) && { opacity: 0.4 }]}
              onPress={() => sendMessage()} disabled={!chatInput.trim() || aiLoading}>
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
  tabContainer: { flexDirection: 'row', paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', backgroundColor: '#FFFFFF' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: '#0EA5A4' },
  tabContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tabText: { fontSize: 14, fontWeight: 'bold', color: '#667085' },
  activeTabText: { color: '#0EA5A4' },
  daySection: { marginBottom: 28 },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  dayDate: { fontSize: 16, fontWeight: 'bold', color: '#0B1220' },
  itineraryItem: {
    backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB',
    flexDirection: 'row', alignItems: 'center', marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  itineraryIcon: { width: 56, height: 56, borderRadius: 12, backgroundColor: '#E0F6F6', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  itineraryImage: { width: 56, height: 56, borderRadius: 12, flexShrink: 0 },
  itineraryContent: { flex: 1, marginLeft: 12 },
  itineraryTitle: { fontSize: 14, fontWeight: 'bold', color: '#0B1220', marginBottom: 2 },
  itineraryMeta: { fontSize: 11, color: '#667085', marginBottom: 2 },
  itineraryType: { fontSize: 10, color: '#0EA5A4', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 2 },
  itineraryNote: { fontSize: 11, color: '#9CA3AF', fontStyle: 'italic' },
  destinationEntry: { marginBottom: 12 },
  destinationBanner: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  destinationIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#FFFBEB',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  destinationContent: { flex: 1, marginLeft: 12, position: 'relative', minHeight: 56 },
  destinationKindBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: 'rgba(245,158,11,0.18)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  destinationKindBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
    color: '#B45309',
  },
  destinationTitle: { fontSize: 14, fontWeight: 'bold', color: '#0B1220', marginBottom: 2, paddingRight: 88 },
  destinationMeta: { fontSize: 11, color: '#667085' },
  routeSnippetBelowBanner: {
    marginTop: 8,
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  routeSnippet: {
    marginTop: 8,
    backgroundColor: '#F8FFFE',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  routeSnippetPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#0EA5A4',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 6,
  },
  routeSnippetPillText: { fontSize: 10, fontWeight: '800', color: '#FFFFFF' },
  routeSnippetSegment: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E6FFFA',
  },
  routeSnippetText: { fontSize: 12, color: '#0F172A', lineHeight: 18 },
  routeSnippetTravelText: { fontSize: 11, color: '#667085', fontStyle: 'italic' },
  removeItineraryBtn: { padding: 8 },
  content: { flex: 1 },
  emptyContent: { flexGrow: 1 },
  listContent: { padding: 16 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#0B1220', marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: '#667085', marginTop: 8, textAlign: 'center', lineHeight: 22 },
  listingCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB',
    overflow: 'hidden', marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4,
  },
  listingImage: { width: '100%', height: 160 },
  listingImagePlaceholder: { backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  typeBadge: { position: 'absolute', top: 12, left: 12, backgroundColor: 'rgba(14,165,164,0.9)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  typeBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  listingBody: { padding: 14 },
  listingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  listingTitle: { flex: 1, fontSize: 16, fontWeight: 'bold', color: '#0B1220', marginRight: 8 },
  addToItineraryBtn: { padding: 6, backgroundColor: '#E0F6F6', borderRadius: 999, borderWidth: 1, borderColor: '#A5F3F0' },
  removeButton: { padding: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  locationText: { fontSize: 12, color: '#667085', marginLeft: 4, flex: 1 },
  listingDescription: { fontSize: 13, color: '#6B7280', lineHeight: 19, marginBottom: 10 },
  listingFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  categoryTag: { backgroundColor: '#F0FDF4', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: '#BBF7D0' },
  categoryTagText: { fontSize: 11, color: '#166534', fontWeight: '600', textTransform: 'capitalize' },
  listingPrice: { fontSize: 14, fontWeight: 'bold', color: '#0EA5A4' },
  listingPriceFree: { fontSize: 13, fontWeight: '600', color: '#10B981' },
  routePlanStaleBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  routePlanStaleBadgeText: { fontSize: 10, fontWeight: '800', color: '#B45309' },
});

const aiBannerStyles = StyleSheet.create({
  card: {
    backgroundColor: '#0EA5A4', borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20,
    shadowColor: '#0EA5A4', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  iconWrap: { width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
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
  headerSub: { fontSize: 11, color: '#667085', marginTop: 2 },
  headerBtn: { padding: 8, backgroundColor: '#F7FAFC', borderRadius: 999, borderWidth: 1, borderColor: '#E5E7EB' },
  closeBtn: { padding: 4 },
  messageList: { padding: 16, paddingBottom: 8 },
  welcome: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 16 },
  welcomeTitle: { fontSize: 20, fontWeight: 'bold', color: '#0B1220', marginBottom: 8 },
  welcomeSub: { fontSize: 14, color: '#667085', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  chips: { gap: 10, width: '100%' },
  chip: { backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  chipText: { fontSize: 14, color: '#0B1220', fontWeight: '500' },
  bubble: { maxWidth: '85%', borderRadius: 16, padding: 14, marginBottom: 4 },
  userBubble: { backgroundColor: '#0EA5A4', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  assistantBubble: { backgroundColor: '#FFFFFF', alignSelf: 'flex-start', borderWidth: 1, borderColor: '#E5E7EB', borderBottomLeftRadius: 4 },
  userText: { color: '#FFFFFF', fontSize: 14, lineHeight: 21 },
  addPlanBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', marginLeft: 4, marginBottom: 12, marginTop: 4,
    backgroundColor: '#E0F6F6', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 999, borderWidth: 1, borderColor: '#A5F3F0',
  },
  addPlanBtnText: { fontSize: 12, color: '#0B7A79', fontWeight: '600' },
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
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#0EA5A4', alignItems: 'center', justifyContent: 'center' },
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#0B1220' },
  subText: { fontSize: 13, color: '#667085', marginBottom: 12 },
  listingName: { fontSize: 14, color: '#0EA5A4', fontWeight: '600', marginBottom: 16 },
  label: { fontSize: 12, fontWeight: 'bold', color: '#374151', textTransform: 'uppercase', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#0B1220' },
  submitBtn: { backgroundColor: '#0EA5A4', borderRadius: 999, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  submitText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
});

const expTabStyles = StyleSheet.create({
  addBtn: {
    backgroundColor: '#0EA5A4', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 999, marginBottom: 20,
  },
  addBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 14,
    borderWidth: 1, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconBtn: { padding: 6 },
  date: { fontSize: 11, color: '#9CA3AF' },
  text: { fontSize: 13, color: '#374151', lineHeight: 19, marginBottom: 4 },
  photo: { width: 80, height: 80, borderRadius: 10, marginRight: 8 },
  shareBtn: {
    marginTop: 10, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 999,
    paddingVertical: 8, paddingHorizontal: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  shareBtnText: { fontSize: 12, color: '#374151', fontWeight: '600' },
  selectedListing: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#E0F6F6', borderRadius: 10, padding: 12, marginBottom: 4,
  },
  selectedListingTitle: { fontSize: 14, fontWeight: '700', color: '#0B1220' },
  selectedListingMeta: { fontSize: 12, color: '#667085', marginTop: 2 },
  searchResult: {
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingVertical: 10,
  },
  searchResultText: { fontSize: 14, fontWeight: '600', color: '#0B1220' },
  searchResultMeta: { fontSize: 12, color: '#667085', marginTop: 2 },
  thumb: { width: 72, height: 72, borderRadius: 10 },
  thumbRemove: {
    position: 'absolute', top: -6, right: -6,
    backgroundColor: '#EF4444', borderRadius: 999, width: 18, height: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  addPhotoBtn: {
    width: 72, height: 72, borderRadius: 10,
    borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },
  noSuggestionsText: { fontSize: 13, color: '#9CA3AF', marginTop: 4, marginBottom: 8, lineHeight: 19 },
  eventTitle: { fontSize: 15, fontWeight: '700', color: '#0B1220', marginBottom: 10, textDecorationLine: 'underline' },

  // Route plan banner
  rpBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 4,
  },
  rpBannerAccent: {
    height: 4,
    backgroundColor: '#0EA5A4',
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  rpBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },
  rpBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rpBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0B1220',
  },
  rpBannerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rpBannerBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rpBannerSummary: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  rpBannerToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF9',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#D1FAE5',
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
  },
  rpBannerToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0EA5A4',
  },
  routePlanClearBtn: { padding: 4 },
  // Inline day plan block (below each day's itinerary items)
  inlinePlanBlock: {
    backgroundColor: '#F8FFFE', borderRadius: 12, padding: 12,
    marginTop: 6, marginBottom: 4,
    borderLeftWidth: 3, borderLeftColor: '#0EA5A4',
    borderWidth: 1, borderColor: '#E0F6F6',
  },
});

const savedChatItemStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  name: { fontSize: 14, fontWeight: '600', color: '#0B1220', marginBottom: 3 },
  date: { fontSize: 11, color: '#9CA3AF' },
});
