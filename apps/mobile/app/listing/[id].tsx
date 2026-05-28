import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, Image, TouchableOpacity,
  ActivityIndicator, Linking, StyleSheet, Alert, Modal, TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Share2, Heart, MapPin, Clock, Tag, Navigation, Cloud, Flag } from 'lucide-react-native';
import { useGraphQL, gqlFetch } from '../../src/hooks/useGraphQL';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

const API_BASE = (process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:3000/graphql').replace('/graphql', '');
const WEATHER_KEY = process.env.EXPO_PUBLIC_WEATHER_API_KEY;

function fixImageUrl(url?: string | null): string | null {
  if (!url) return null;
  return url.replace('http://localhost:3000', API_BASE);
}

const GET_LISTING_QUERY = `
  query GetListing($id: String!) {
    listing(id: $id) {
      id title description type category price startDateTime
      status placeName mapLink imageUrl isPremium viewCount
      createdAt lat lng
    }
  }
`;

const SAVED_LISTINGS_QUERY = `query SavedListings { savedListings { id } }`;
const SAVE_MUTATION = `mutation SaveListing($listingId: ID!) { saveListing(listingId: $listingId) }`;
const UNSAVE_MUTATION = `mutation UnsaveListing($listingId: ID!) { unsaveListing(listingId: $listingId) }`;
const REPORT_MUTATION = `mutation ReportListing($listingId: ID!, $reason: String!, $comment: String) {
  reportListing(listingId: $listingId, reason: $reason, comment: $comment)
}`;

const REPORT_REASONS = ['Inaccurate information', 'Inappropriate content', 'Scam or fraud', 'Duplicate listing', 'Other'];

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
  if (loading) return null;
  if (!weather) return null;

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

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportComment, setReportComment] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);

  const { data, loading, error } = useGraphQL<{ listing: any }>(GET_LISTING_QUERY, { id });
  const { data: savedData } = useGraphQL<{ savedListings: { id: string }[] }>(SAVED_LISTINGS_QUERY);

  useEffect(() => {
    if (savedData?.savedListings && id) {
      setSaved(savedData.savedListings.some((s) => s.id === id));
    }
  }, [savedData, id]);

  const listing = data?.listing;

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

  const openInMaps = () => {
    if (!listing) return;
    if (listing.lat && listing.lng && listing.lat !== 0 && listing.lng !== 0) {
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${listing.lat},${listing.lng}`);
    } else if (listing.mapLink) {
      Linking.openURL(listing.mapLink);
    }
  };

  async function submitReport() {
    if (!reportReason || !listing) return;
    setReportSubmitting(true);
    try {
      await gqlFetch(REPORT_MUTATION, { listingId: listing.id, reason: reportReason, comment: reportComment || undefined });
      setReportVisible(false);
      setReportReason('');
      setReportComment('');
      Alert.alert('Report submitted', 'Thank you. Our team will review this listing.');
    } catch {
      Alert.alert('Error', 'Could not submit report. Please try again.');
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

          {listing.price ? (
            <View style={styles.infoRow}>
              <Tag size={15} color="#0EA5A4" />
              <Text style={[styles.infoText, { fontWeight: 'bold', color: '#0EA5A4' }]}>
                LKR {listing.price}
              </Text>
            </View>
          ) : null}

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
                    <MapView
                      style={styles.mapPreview}
                      provider={PROVIDER_GOOGLE}
                      initialRegion={{
                        latitude: listing.lat,
                        longitude: listing.lng,
                        latitudeDelta: 0.02,
                        longitudeDelta: 0.02,
                      }}
                      scrollEnabled={false}
                      zoomEnabled={false}
                      rotateEnabled={false}
                      pitchEnabled={false}
                      pointerEvents="none"
                    >
                      <Marker coordinate={{ latitude: listing.lat, longitude: listing.lng }} pinColor="#0EA5A4" />
                    </MapView>
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

      {/* Report modal */}
      <Modal visible={reportVisible} animationType="slide" transparent onRequestClose={() => setReportVisible(false)}>
        <View style={reportStyles.overlay}>
          <View style={reportStyles.sheet}>
            <Text style={reportStyles.title}>Report Listing</Text>
            <Text style={reportStyles.subtitle}>Why are you reporting this listing?</Text>
            {REPORT_REASONS.map((r) => (
              <TouchableOpacity
                key={r}
                style={[reportStyles.reasonBtn, reportReason === r && reportStyles.reasonBtnActive]}
                onPress={() => setReportReason(r)}
              >
                <Text style={[reportStyles.reasonText, reportReason === r && reportStyles.reasonTextActive]}>{r}</Text>
              </TouchableOpacity>
            ))}
            <TextInput
              style={reportStyles.commentInput}
              placeholder="Additional comments (optional)"
              placeholderTextColor="#9CA3AF"
              value={reportComment}
              onChangeText={setReportComment}
              multiline
              numberOfLines={3}
            />
            <View style={reportStyles.actions}>
              <TouchableOpacity style={reportStyles.cancelBtn} onPress={() => setReportVisible(false)}>
                <Text style={reportStyles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[reportStyles.submitBtn, (!reportReason || reportSubmitting) && { opacity: 0.5 }]}
                onPress={submitReport}
                disabled={!reportReason || reportSubmitting}
              >
                <Text style={reportStyles.submitText}>{reportSubmitting ? 'Submitting…' : 'Submit Report'}</Text>
              </TouchableOpacity>
            </View>
          </View>
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
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 18 },
  sectionTitle: { fontSize: 17, fontWeight: 'bold', color: '#0B1220', marginBottom: 10 },
  description: { fontSize: 14, color: '#6B7280', lineHeight: 22 },
  directionsButton: {
    backgroundColor: '#0EA5A4', flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', paddingVertical: 14, borderRadius: 14,
  },
  directionsButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 15, marginLeft: 8 },
  mapPreviewContainer: {
    height: 180, borderRadius: 14, overflow: 'hidden',
    marginBottom: 12, position: 'relative',
  },
  mapPreview: { ...StyleSheet.absoluteFillObject },
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

const reportStyles = StyleSheet.create({
  overlay: {
    flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  title: { fontSize: 18, fontWeight: 'bold', color: '#0B1220', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#667085', marginBottom: 16 },
  reasonBtn: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 11, marginBottom: 8,
  },
  reasonBtnActive: { borderColor: '#0EA5A4', backgroundColor: '#E0F6F6' },
  reasonText: { fontSize: 14, color: '#374151' },
  reasonTextActive: { color: '#0B7A79', fontWeight: '600' },
  commentInput: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, color: '#374151',
    marginTop: 8, marginBottom: 16, textAlignVertical: 'top',
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
