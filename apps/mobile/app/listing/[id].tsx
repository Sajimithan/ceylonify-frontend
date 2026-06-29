import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, Image, TouchableOpacity,
  ActivityIndicator, Linking, StyleSheet, Modal, TextInput,
} from 'react-native';
import { useAppAlert } from '../../src/components/AppAlert';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Heart, MapPin, Clock, Tag, Navigation, Cloud, Flag, X as XIcon, Plus, Star } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useGraphQL, gqlFetch } from '../../src/hooks/useGraphQL';
import { WebView } from 'react-native-webview';
import { auth } from '../../src/lib/firebase';
import { formatListingPriceSummary, getListingPriceTiers, listingHasPrice } from '../../src/lib/listingPrice';

const API_BASE = (process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:3000/graphql').replace('/graphql', '');
const WEATHER_KEY = process.env.EXPO_PUBLIC_WEATHER_API_KEY;

function fixImageUrl(url?: string | null): string | null {
  if (!url) return null;
  return url.replace('http://localhost:3000', API_BASE);
}

const GET_LISTING_QUERY = `
  query GetListing($id: String!) {
    listing(id: $id) {
      id title description type category price priceTiers { label price description } startDateTime
      status placeName mapLink imageUrl isPremium viewCount goingCount
      createdAt lat lng
    }
  }
`;

const SAVED_LISTINGS_QUERY = `query SavedListings { savedListings { id } }`;
const SAVE_MUTATION = `mutation SaveListing($listingId: ID!) { saveListing(listingId: $listingId) }`;
const UNSAVE_MUTATION = `mutation UnsaveListing($listingId: ID!) { unsaveListing(listingId: $listingId) }`;
const REPORT_MUTATION = `mutation ReportListing($listingId: ID!, $reason: String!, $comment: String, $imageUrls: [String!]) {
  reportListing(listingId: $listingId, reason: $reason, comment: $comment, imageUrls: $imageUrls)
}`;

const IS_GOING_QUERY = `query IsGoing($listingId: ID!) { isGoing(listingId: $listingId) }`;
const MARK_GOING_MUTATION = `mutation MarkGoing($listingId: ID!) { markGoing(listingId: $listingId) { id } }`;
const UNMARK_GOING_MUTATION = `mutation UnmarkGoing($listingId: ID!) { unmarkGoing(listingId: $listingId) }`;

const LISTING_EXPERIENCES_QUERY = `
  query ListingExperiences($listingId: ID!) {
    listingExperiences(listingId: $listingId) {
      id rating text imageUrls createdAt
      user { displayName avatarUrl }
    }
  }
`;

const REPORT_SUGGESTIONS = ['Inaccurate information', 'Inappropriate content', 'Scam or fraud', 'Duplicate listing', 'Other'];

const GMAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ?? 'AIzaSyCAisocwaWcaNQxbt2MM9Kahvu-h3a24gc';

function buildMapPreviewHtml(lat: number, lng: number): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>* { margin:0; padding:0; } #map { width:100vw; height:100vh; }</style>
</head>
<body>
<div id="map"></div>
<script>
  function initMap() {
    var center = { lat: ${lat}, lng: ${lng} };
    var map = new google.maps.Map(document.getElementById('map'), {
      center: center, zoom: 15,
      disableDefaultUI: true,
      gestureHandling: 'none',
    });
    new google.maps.Marker({
      position: center, map: map,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: '#0EA5A4', fillOpacity: 1,
        strokeColor: '#FFFFFF', strokeWeight: 3, scale: 10,
      },
    });
  }
</script>
<script src="https://maps.googleapis.com/maps/api/js?key=${GMAPS_KEY}&callback=initMap&loading=async" defer></script>
</body>
</html>`;
}

interface WeatherData {
  temp: number;
  description: string;
  icon: string;
}

function WeatherWidget({ lat, lng }: { lat: number; lng: number }) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!WEATHER_KEY || lat === 0 || lng === 0) { setLoading(false); return; }
    fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&units=metric&appid=${WEATHER_KEY}`,
    )
      .then((r) => r.json())
      .then((d) => {
        if (d.main) {
          setWeather({
            temp: Math.round(d.main.temp),
            description: d.weather[0]?.description ?? '',
            icon: d.weather[0]?.main ?? '',
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [lat, lng]);

  if (!WEATHER_KEY || lat === 0 || lng === 0) return null;
  if (loading || !weather) return null;

  const emoji = weather.icon === 'Clear' ? '☀️'
    : weather.icon === 'Clouds' ? '☁️'
    : weather.icon === 'Rain' ? '🌧️'
    : weather.icon === 'Thunderstorm' ? '⛈️'
    : weather.icon === 'Snow' ? '❄️'
    : '🌤️';

  return (
    <View style={weatherStyles.container}>
      <Cloud size={16} color="#0EA5A4" />
      <Text style={weatherStyles.text}>
        {emoji} {weather.temp}°C — {weather.description}
      </Text>
    </View>
  );
}

const weatherStyles = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#E0F6F6', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8, gap: 8, marginBottom: 10,
  },
  text: { fontSize: 13, color: '#0B7A79', fontWeight: '600' },
});

function StarRow({ rating }: { rating: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} size={13} color={s <= rating ? '#F59E0B' : '#D1D5DB'} fill={s <= rating ? '#F59E0B' : 'none'} />
      ))}
    </View>
  );
}

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const { show: showAlert, alertEl } = useAppAlert();
  const [reportVisible, setReportVisible] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportComment, setReportComment] = useState('');
  const [reportImages, setReportImages] = useState<{ uri: string; name: string }[]>([]);
  const [reportSubmitting, setReportSubmitting] = useState(false);

  const [isGoing, setIsGoing] = useState(false);
  const [goingLoading, setGoingLoading] = useState(false);

  const { data, loading, error } = useGraphQL<{ listing: any }>(GET_LISTING_QUERY, { id }, { pollInterval: 30_000 });
  const { data: savedData } = useGraphQL<{ savedListings: { id: string }[] }>(SAVED_LISTINGS_QUERY);
  const { data: expData, refetch: refetchExps } = useGraphQL<{ listingExperiences: any[] }>(
    LISTING_EXPERIENCES_QUERY, { listingId: id }, { pollInterval: 30_000 },
  );

  useEffect(() => {
    if (savedData?.savedListings && id) {
      setSaved(savedData.savedListings.some((s) => s.id === id));
    }
  }, [savedData, id]);

  const listing = data?.listing;

  useEffect(() => {
    if (!listing || listing.type !== 'EVENT' || !auth?.currentUser) return;
    gqlFetch<{ isGoing: boolean }>(IS_GOING_QUERY, { listingId: id as string })
      .then((d) => setIsGoing(d?.isGoing ?? false))
      .catch(() => {});
  }, [listing, id]);

  async function toggleSave() {
    if (!listing || saveLoading) return;
    setSaveLoading(true);
    try {
      if (saved) {
        await gqlFetch(UNSAVE_MUTATION, { listingId: listing.id });
        setSaved(false);
      } else {
        await gqlFetch(SAVE_MUTATION, { listingId: listing.id });
        setSaved(true);
      }
    } catch {
      // silent
    } finally {
      setSaveLoading(false);
    }
  }

  async function handleGoingToggle() {
    if (!auth?.currentUser) {
      router.push('/(auth)/login');
      return;
    }
    setGoingLoading(true);
    try {
      if (isGoing) {
        await gqlFetch(UNMARK_GOING_MUTATION, { listingId: id });
        setIsGoing(false);
      } else {
        await gqlFetch(MARK_GOING_MUTATION, { listingId: id });
        setIsGoing(true);
      }
    } catch (e: any) {
      showAlert({ type: 'error', title: 'Error', message: e.message || 'Could not update going status.' });
    } finally {
      setGoingLoading(false);
    }
  }

  const openInMaps = () => {
    if (!listing) return;
    if (listing.lat && listing.lng && listing.lat !== 0 && listing.lng !== 0) {
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${listing.lat},${listing.lng}`);
    } else if (listing.mapLink) {
      Linking.openURL(listing.mapLink);
    }
  };

  async function pickReportImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert({ type: 'warning', title: 'Permission Required', message: 'Allow photo library access to attach evidence.' });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    const name = `report_${Date.now()}.jpg`;
    setReportImages((prev) => [...prev, { uri: asset.uri, name }]);
  }

  async function submitReport() {
    if (!reportReason.trim() || !listing) return;
    if (!auth.currentUser) {
      showAlert({ type: 'error', title: 'Sign In Required', message: 'Please sign in to report a listing.' });
      return;
    }
    setReportSubmitting(true);
    try {
      const uploadedUrls: string[] = [];
      for (const img of reportImages) {
        const formData = new FormData();
        formData.append('file', { uri: img.uri, name: img.name, type: 'image/jpeg' } as any);
        const res = await fetch(`${API_BASE}/upload`, { method: 'POST', body: formData });
        if (res.ok) {
          const data = await res.json();
          uploadedUrls.push(`${API_BASE}${data.url}`);
        }
      }
      await gqlFetch(REPORT_MUTATION, {
        listingId: listing.id,
        reason: reportReason.trim(),
        comment: reportComment.trim() || undefined,
        imageUrls: uploadedUrls.length > 0 ? uploadedUrls : undefined,
      });
      setReportVisible(false);
      setReportReason('');
      setReportComment('');
      setReportImages([]);
      showAlert({
        type: 'success',
        title: 'Report Submitted',
        message: 'Thank you. Our team will review this listing shortly. Track updates in Help Center under Previous Tickets.',
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not submit report. Please try again.';
      showAlert({ type: 'error', title: 'Submission Failed', message });
    } finally {
      setReportSubmitting(false);
    }
  }

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
        <Text style={styles.errorTitle}>Not Found</Text>
        <Text style={styles.errorMessage}>{error?.message ?? 'This listing could not be loaded.'}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const imageUrl = fixImageUrl(listing.imageUrl);
  const hasLocation = (listing.lat && listing.lng && listing.lat !== 0) || listing.mapLink;
  const experiences = expData?.listingExperiences ?? [];
  const isEvent = listing.type === 'EVENT';
  const isPastEvent = isEvent && listing.startDateTime && new Date(listing.startDateTime) < new Date();

  return (
    <View style={styles.container}>
      {alertEl}
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

          <View style={styles.imageOverlayButtons}>
            <TouchableOpacity onPress={() => router.back()} style={styles.circleButton}>
              <ChevronLeft size={22} color="#0B1220" />
            </TouchableOpacity>
            <View style={styles.rightButtons}>
              <TouchableOpacity style={styles.circleButton} onPress={() => setReportVisible(true)}>
                <Flag size={20} color="#0B1220" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={toggleSave}
                disabled={saveLoading}
                style={[styles.circleButton, { marginLeft: 10 }]}
              >
                {saveLoading
                  ? <ActivityIndicator size="small" color="#EF4444" />
                  : <Heart size={20} color={saved ? '#EF4444' : '#0B1220'} fill={saved ? '#EF4444' : 'none'} />
                }
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{listing.type}</Text>
          </View>

          {listing.isPremium && (
            <View style={styles.premiumBadge}>
              <Text style={styles.premiumBadgeText}>PREMIUM</Text>
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.contentCard}>
          {listing.category && <Text style={styles.categoryLabel}>{listing.category}</Text>}
          <Text style={styles.title}>{listing.title}</Text>

          {listing.placeName && (
            <View style={styles.infoRow}>
              <MapPin size={15} color="#0EA5A4" />
              <Text style={styles.infoText}>{listing.placeName}</Text>
            </View>
          )}

          {listing.startDateTime && (
            <View style={styles.infoRow}>
              <Clock size={15} color="#0EA5A4" />
              <Text style={styles.infoText}>
                {new Date(listing.startDateTime).toLocaleDateString('en-US', {
                  weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
                })}
              </Text>
            </View>
          )}

          {isEvent && (listing.goingCount ?? 0) > 0 && (
            <View style={styles.goingCountRow}>
              <Text style={styles.goingCountText}>👥 {listing.goingCount} people going</Text>
            </View>
          )}

          {listingHasPrice(listing) && (
            <View style={styles.priceSection}>
              <View style={styles.infoRow}>
                <Tag size={15} color="#0EA5A4" />
                <Text style={[styles.infoText, styles.priceSectionTitle]}>Price</Text>
              </View>
              {getListingPriceTiers(listing).length > 0 ? (
                <View style={styles.tierList}>
                  {getListingPriceTiers(listing).map((tier) => (
                    <View key={tier.label} style={styles.tierRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.tierLabel}>{tier.label}</Text>
                        {tier.description ? (
                          <Text style={styles.tierDescription}>{tier.description}</Text>
                        ) : null}
                      </View>
                      <Text style={styles.tierPrice}>LKR {Number(tier.price).toLocaleString()}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.singlePrice}>{formatListingPriceSummary(listing)}</Text>
              )}
            </View>
          )}

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>About this Experience</Text>
          <Text style={styles.description}>{listing.description}</Text>

          {hasLocation && (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionTitle}>Location</Text>

              {listing.lat !== 0 && listing.lng !== 0 && (
                <>
                  <WeatherWidget lat={listing.lat} lng={listing.lng} />
                  <TouchableOpacity
                    onPress={openInMaps}
                    activeOpacity={0.9}
                    style={styles.mapPreviewContainer}
                  >
                    <WebView
                      source={{ html: buildMapPreviewHtml(listing.lat, listing.lng) }}
                      style={styles.mapPreview}
                      javaScriptEnabled
                      domStorageEnabled
                      scrollEnabled={false}
                      pointerEvents="none"
                    />
                    <View style={styles.mapPreviewOverlay}>
                      <Navigation size={14} color="#FFFFFF" />
                      <Text style={styles.mapPreviewOverlayText}>Open in Google Maps</Text>
                    </View>
                  </TouchableOpacity>
                </>
              )}

              {(listing.lat === 0 || listing.lng === 0) && listing.mapLink && (
                <TouchableOpacity onPress={openInMaps} style={styles.directionsButton}>
                  <Navigation size={18} color="#FFFFFF" />
                  <Text style={styles.directionsButtonText}>Open in Google Maps</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* Community Experiences */}
          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>Community Experiences</Text>
          {experiences.length === 0 ? (
            <Text style={styles.noExperiencesText}>No experiences shared yet. Be the first!</Text>
          ) : (
            experiences.map((exp: any) => {
              const expAvatar = fixImageUrl(exp.user?.avatarUrl);
              return (
                <View key={exp.id} style={expStyles.card}>
                  <View style={expStyles.header}>
                    {expAvatar ? (
                      <Image source={{ uri: expAvatar }} style={expStyles.avatar} />
                    ) : (
                      <View style={expStyles.avatarPlaceholder}>
                        <Text style={expStyles.avatarInitial}>
                          {(exp.user?.displayName ?? 'T').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={expStyles.userName}>{exp.user?.displayName ?? 'Traveler'}</Text>
                      <Text style={expStyles.date}>
                        {new Date(exp.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </Text>
                    </View>
                    <StarRow rating={exp.rating} />
                  </View>
                  <Text style={expStyles.text}>{exp.text}</Text>
                  {(exp.imageUrls ?? []).length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                      {exp.imageUrls.map((imgUrl: string, i: number) => (
                        <Image
                          key={i}
                          source={{ uri: fixImageUrl(imgUrl) ?? imgUrl }}
                          style={expStyles.photo}
                        />
                      ))}
                    </ScrollView>
                  )}
                </View>
              );
            })
          )}

          <View style={{ height: 120 }} />
        </View>
      </ScrollView>

      {/* Floating CTA */}
      <View style={styles.floatingCTA}>
        <View style={styles.ctaPrice}>
          <Text style={styles.ctaPriceLabel}>Price</Text>
          <Text style={styles.ctaPriceValue}>
            {listingHasPrice(listing) ? formatListingPriceSummary(listing) : 'Free'}
          </Text>
        </View>
        {isPastEvent ? (
          <View style={styles.pastEventBadge}>
            <Text style={styles.pastEventText}>Event Ended</Text>
          </View>
        ) : (
          <>
            {isEvent && (
              <TouchableOpacity
                onPress={handleGoingToggle}
                disabled={goingLoading}
                style={[styles.goingButton, isGoing && styles.goingButtonActive]}
              >
                {goingLoading
                  ? <ActivityIndicator color={isGoing ? '#fff' : '#0EA5A4'} size="small" />
                  : <Text style={[styles.goingButtonText, isGoing && styles.goingButtonTextActive]}>
                      {isGoing ? '✓ Going' : "I'm Going"}
                    </Text>
                }
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.bookButton}
              onPress={() => showAlert({
                type: 'warning',
                title: 'No Pre-Booking Available',
                message: 'Pre-booking is not available for this experience. You can purchase your tickets at the gate.',
              })}
            >
              <Text style={styles.bookButtonText}>Book Now</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Report modal */}
      <Modal visible={reportVisible} animationType="slide" transparent onRequestClose={() => setReportVisible(false)}>
        <View style={reportStyles.overlay}>
          <ScrollView style={reportStyles.sheet} contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <Text style={reportStyles.title}>Report Listing</Text>
              <TouchableOpacity onPress={() => setReportVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <XIcon size={20} color="#667085" />
              </TouchableOpacity>
            </View>
            <Text style={reportStyles.subtitle}>Select a suggestion or describe your reason below.</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ gap: 8, paddingRight: 4 }}>
              {REPORT_SUGGESTIONS.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[reportStyles.chip, reportReason === s && reportStyles.chipActive]}
                  onPress={() => setReportReason(s)}
                >
                  <Text style={[reportStyles.chipText, reportReason === s && reportStyles.chipTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TextInput
              style={reportStyles.reasonInput}
              placeholder="Describe your reason… (required)"
              placeholderTextColor="#9CA3AF"
              value={reportReason}
              onChangeText={setReportReason}
              multiline
              numberOfLines={2}
            />

            <TextInput
              style={reportStyles.commentInput}
              placeholder="Additional comments (optional)"
              placeholderTextColor="#9CA3AF"
              value={reportComment}
              onChangeText={setReportComment}
              multiline
              numberOfLines={3}
            />

            <Text style={reportStyles.photoLabel}>Add Photos (optional)</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {reportImages.map((img, i) => (
                <View key={i} style={{ position: 'relative' }}>
                  <Image source={{ uri: img.uri }} style={reportStyles.thumb} />
                  <TouchableOpacity
                    style={reportStyles.thumbRemove}
                    onPress={() => setReportImages((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    <XIcon size={10} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
              {reportImages.length < 3 && (
                <TouchableOpacity style={reportStyles.addPhotoBtn} onPress={pickReportImage}>
                  <Plus size={20} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>

            <View style={reportStyles.actions}>
              <TouchableOpacity style={reportStyles.cancelBtn} onPress={() => setReportVisible(false)}>
                <Text style={reportStyles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[reportStyles.submitBtn, (!reportReason.trim() || reportSubmitting) && { opacity: 0.5 }]}
                onPress={submitReport}
                disabled={!reportReason.trim() || reportSubmitting}
              >
                <Text style={reportStyles.submitText}>{reportSubmitting ? 'Submitting…' : 'Submit Report'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
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
    backgroundColor: 'rgba(255,255,255,0.92)', padding: 10, borderRadius: 999,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4, elevation: 4,
  },
  typeBadge: {
    position: 'absolute', bottom: 16, left: 16,
    backgroundColor: 'rgba(14,165,164,0.9)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999,
  },
  typeBadgeText: { color: '#FFF', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 },
  premiumBadge: {
    position: 'absolute', bottom: 16, right: 16,
    backgroundColor: 'rgba(245,158,11,0.9)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
  },
  premiumBadgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  contentCard: {
    backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    marginTop: -24, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 6,
  },
  categoryLabel: { color: '#0EA5A4', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0B1220', marginBottom: 14 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  infoText: { marginLeft: 8, fontSize: 14, color: '#374151', flex: 1 },
  priceSection: { marginBottom: 4 },
  priceSectionTitle: { fontWeight: 'bold', color: '#64748B', textTransform: 'uppercase', fontSize: 11, letterSpacing: 0.5 },
  tierList: { marginTop: 8, gap: 8 },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 12,
  },
  tierLabel: { fontSize: 14, fontWeight: '700', color: '#334155' },
  tierDescription: { fontSize: 12, color: '#64748B', marginTop: 2 },
  tierPrice: { fontSize: 14, fontWeight: '700', color: '#0EA5A4' },
  singlePrice: { fontSize: 22, fontWeight: 'bold', color: '#0EA5A4', marginTop: 4 },
  goingCountRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  goingCountText: { fontSize: 13, color: '#059669', fontWeight: '700', backgroundColor: '#ECFDF5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 18 },
  sectionTitle: { fontSize: 17, fontWeight: 'bold', color: '#0B1220', marginBottom: 10 },
  description: { fontSize: 14, color: '#6B7280', lineHeight: 22 },
  noExperiencesText: { fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' },
  directionsButton: {
    backgroundColor: '#0EA5A4', flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', paddingVertical: 14, borderRadius: 14,
  },
  directionsButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 15, marginLeft: 8 },
  mapPreviewContainer: {
    height: 180, borderRadius: 14, overflow: 'hidden',
    marginBottom: 12, position: 'relative',
  },
  mapPreview: { width: '100%', height: '100%' },
  mapPreviewOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(14,165,164,0.88)',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, gap: 6,
  },
  mapPreviewOverlayText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  floatingCTA: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 16, paddingBottom: 28, gap: 10,
    borderTopWidth: 1, borderTopColor: '#F1F5F9',
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 8,
  },
  ctaPrice: { flex: 1 },
  ctaPriceLabel: { fontSize: 12, color: '#9CA3AF' },
  ctaPriceValue: { fontSize: 18, fontWeight: 'bold', color: '#0B1220' },
  goingButton: {
    paddingHorizontal: 18, paddingVertical: 13, borderRadius: 999,
    borderWidth: 2, borderColor: '#0EA5A4', backgroundColor: '#fff',
  },
  goingButtonActive: { backgroundColor: '#0EA5A4', borderColor: '#0EA5A4' },
  goingButtonText: { color: '#0EA5A4', fontWeight: 'bold', fontSize: 14 },
  goingButtonTextActive: { color: '#fff' },
  bookButton: { backgroundColor: '#0EA5A4', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 999 },
  bookButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  pastEventBadge: {
    backgroundColor: '#F1F5F9', paddingHorizontal: 18, paddingVertical: 13,
    borderRadius: 999, borderWidth: 1, borderColor: '#E5E7EB',
  },
  pastEventText: { color: '#9CA3AF', fontWeight: '600', fontSize: 14 },
});

const expStyles = StyleSheet.create({
  card: {
    backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14,
    marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB',
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarPlaceholder: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#0EA5A4', alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  userName: { fontSize: 13, fontWeight: '700', color: '#0B1220' },
  date: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  text: { fontSize: 13, color: '#374151', lineHeight: 19 },
  photo: { width: 80, height: 80, borderRadius: 10, marginRight: 8 },
});

const reportStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 24, paddingTop: 24, maxHeight: '90%',
  },
  title: { fontSize: 18, fontWeight: 'bold', color: '#0B1220', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#667085', marginBottom: 12 },
  chip: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 999,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  chipActive: { borderColor: '#0EA5A4', backgroundColor: '#E0F6F6' },
  chipText: { fontSize: 13, color: '#374151' },
  chipTextActive: { color: '#0B7A79', fontWeight: '600' },
  reasonInput: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, color: '#374151',
    marginBottom: 10, textAlignVertical: 'top', minHeight: 60,
  },
  commentInput: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, color: '#374151',
    marginBottom: 14, textAlignVertical: 'top',
  },
  photoLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
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
  actions: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 999,
    paddingVertical: 14, alignItems: 'center',
  },
  cancelText: { color: '#667085', fontWeight: '600' },
  submitBtn: {
    flex: 2, backgroundColor: '#EF4444', borderRadius: 999,
    paddingVertical: 14, alignItems: 'center',
  },
  submitText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
});
