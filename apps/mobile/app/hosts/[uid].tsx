import React, { useState } from 'react';
import {
  View, Text, ScrollView, Image, TouchableOpacity,
  ActivityIndicator, StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, MapPin, CalendarDays, Star } from 'lucide-react-native';
import { useGraphQL } from '../../src/hooks/useGraphQL';
import { formatListingPriceSummary, listingHasPrice } from '../../src/lib/listingPrice';
import { getHostPublicInitial, getHostPublicName } from '../../src/lib/hostName';
import { ExperienceReviewCard } from '../../src/components/ExperienceReviewCard';

const API_BASE = (process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:3000/graphql').replace('/graphql', '');

function fixImageUrl(url?: string | null): string | null {
  if (!url) return null;
  return url.replace('http://localhost:3000', API_BASE);
}

const HOST_PROFILE_QUERY = `
  query HostPublicProfile($firebaseUid: String!) {
    hostPublicProfile(firebaseUid: $firebaseUid) {
      firebaseUid displayName businessName avatarUrl badgeLevel approvedCount createdAt
      upcomingEvents { id title imageUrl price priceTiers { label price description } placeName startDateTime type goingCount }
      pastEvents { id title imageUrl price priceTiers { label price description } placeName startDateTime type }
      pastExperiences {
        id listingId rating text imageUrls createdAt likeCount likedByMe replyCount
        user { displayName avatarUrl }
        replies { id senderUid authorRole message createdAt }
      }
    }
  }
`;

const BADGE_ICONS: Record<string, string> = {
  DIAMOND: '💎',
  GOLD: '🥇',
  SILVER: '🥈',
  BRONZE: '🥉',
  NONE: '',
};

function StarRow({ rating }: { rating: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} size={12} color={s <= rating ? '#F59E0B' : '#D1D5DB'} fill={s <= rating ? '#F59E0B' : 'none'} />
      ))}
    </View>
  );
}

function EventCard({
  listing,
  onPress,
  onViewPress,
  reviewHint,
}: {
  listing: any;
  onPress: () => void;
  onViewPress: () => void;
  reviewHint?: string;
}) {
  const imageUrl = fixImageUrl(listing.imageUrl);
  return (
    <View style={cardStyles.card}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={cardStyles.image} resizeMode="cover" />
        ) : (
          <View style={[cardStyles.image, cardStyles.imagePlaceholder]}>
            <Text style={{ fontSize: 28 }}>🏝️</Text>
          </View>
        )}
        <View style={cardStyles.typeBadge}>
          <Text style={cardStyles.typeBadgeText}>{listing.type}</Text>
        </View>
        <View style={cardStyles.body}>
          <Text style={cardStyles.title} numberOfLines={1}>{listing.title}</Text>
          {listing.placeName && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <MapPin size={11} color="#0EA5A4" />
              <Text style={cardStyles.meta} numberOfLines={1}> {listing.placeName}</Text>
            </View>
          )}
          {listing.startDateTime && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
              <CalendarDays size={11} color="#94A3B8" />
              <Text style={cardStyles.dateMeta}>
                {' '}{new Date(listing.startDateTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </Text>
            </View>
          )}
          {(listing.goingCount ?? 0) > 0 && (
            <Text style={cardStyles.going}>👥 {listing.goingCount} going</Text>
          )}
          {reviewHint ? (
            <Text style={cardStyles.reviewHint}>{reviewHint}</Text>
          ) : null}
        </View>
      </TouchableOpacity>
      <View style={[cardStyles.body, cardStyles.footerRow]}>
        <Text style={cardStyles.price}>
          {listingHasPrice(listing) ? formatListingPriceSummary(listing) : 'Free'}
        </Text>
        <TouchableOpacity onPress={onViewPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={cardStyles.viewMore}>View →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function HostProfileScreen() {
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [expandedPastIds, setExpandedPastIds] = useState<Set<string>>(new Set());

  const { data, loading, error } = useGraphQL<{ hostPublicProfile: any }>(
    HOST_PROFILE_QUERY, { firebaseUid: uid },
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0EA5A4" />
      </View>
    );
  }

  if (error || !data?.hostPublicProfile) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Could not load host profile.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const host = data.hostPublicProfile;
  const avatarUrl = fixImageUrl(host.avatarUrl);
  const badge = BADGE_ICONS[host.badgeLevel] ?? '';
  const upcomingEvents: any[] = host.upcomingEvents ?? [];
  const pastEvents: any[] = host.pastEvents ?? [];
  const pastExperiences: any[] = host.pastExperiences ?? [];

  function expsByListing(listingId: string) {
    return pastExperiences
      .filter((e: any) => e.listingId === listingId)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  function togglePastEventExpanded(eventId: string) {
    setExpandedPastIds((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) next.delete(eventId);
      else next.add(eventId);
      return next;
    });
  }

  function handlePastEventPress(eventId: string, reviewCount: number) {
    if (reviewCount > 1) {
      togglePastEventExpanded(eventId);
      return;
    }
    router.push(`/listing/${eventId}` as any);
  }

  const memberSince = new Date(host.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerBg}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backCircle}>
            <ChevronLeft size={22} color="#0B1220" />
          </TouchableOpacity>

          <View style={styles.profileSection}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {getHostPublicInitial(host)}
                </Text>
              </View>
            )}
            <Text style={styles.displayName}>{getHostPublicName(host)}</Text>
            {host.businessName?.trim() && host.displayName?.trim() && host.businessName.trim() !== host.displayName.trim() ? (
              <Text style={styles.personalName}>{host.displayName}</Text>
            ) : null}
            {badge ? (
              <View style={styles.badgeRow}>
                <Text style={styles.badgeText}>{badge} {host.badgeLevel} HOST</Text>
              </View>
            ) : null}
            <Text style={styles.approvedCount}>{host.approvedCount} listings approved</Text>
            <Text style={styles.memberSince}>Member since {memberSince}</Text>
          </View>
        </View>

        {/* Tab Pills */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabPill, activeTab === 'upcoming' && styles.tabPillActive]}
            onPress={() => setActiveTab('upcoming')}
          >
            <Text style={[styles.tabPillText, activeTab === 'upcoming' && styles.tabPillTextActive]}>
              Upcoming Events ({upcomingEvents.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabPill, activeTab === 'past' && styles.tabPillActive]}
            onPress={() => setActiveTab('past')}
          >
            <Text style={[styles.tabPillText, activeTab === 'past' && styles.tabPillTextActive]}>
              Past & Reviews ({pastEvents.length})
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {activeTab === 'upcoming' && (
            <>
              {upcomingEvents.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>No upcoming events</Text>
                </View>
              ) : (
                upcomingEvents.map((ev) => (
                  <EventCard
                    key={ev.id}
                    listing={ev}
                    onPress={() => router.push(`/listing/${ev.id}` as any)}
                    onViewPress={() => router.push(`/listing/${ev.id}` as any)}
                  />
                ))
              )}
            </>
          )}

          {activeTab === 'past' && (
            <>
              {pastEvents.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>No past events</Text>
                </View>
              ) : (
                pastEvents.map((ev) => {
                  const evExps = expsByListing(ev.id);
                  const isExpanded = expandedPastIds.has(ev.id);
                  const previewReview = evExps[0];
                  const hiddenReviews = evExps.slice(1);
                  const reviewHint = evExps.length > 1
                    ? (isExpanded
                      ? 'Tap card to collapse reviews'
                      : `+${hiddenReviews.length} more review${hiddenReviews.length === 1 ? '' : 's'} — tap card to see all`)
                    : undefined;

                  return (
                    <View key={ev.id}>
                      <EventCard
                        listing={ev}
                        onPress={() => handlePastEventPress(ev.id, evExps.length)}
                        onViewPress={() => router.push(`/listing/${ev.id}` as any)}
                        reviewHint={reviewHint}
                      />
                      {previewReview && (
                        <View style={styles.expThread}>
                          <ExperienceReviewCard review={previewReview} fixImageUrl={fixImageUrl} />
                          {isExpanded && hiddenReviews.map((exp: any) => (
                            <ExperienceReviewCard key={exp.id} review={exp} fixImageUrl={fixImageUrl} />
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  errorText: { fontSize: 16, color: '#EF4444', marginBottom: 16, textAlign: 'center' },
  backBtn: { backgroundColor: '#0EA5A4', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999 },
  backBtnText: { color: '#fff', fontWeight: 'bold' },
  headerBg: {
    backgroundColor: '#FFFFFF', paddingBottom: 24,
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  backCircle: {
    position: 'absolute', top: 48, left: 16, zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.92)', padding: 10, borderRadius: 999,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  profileSection: { alignItems: 'center', paddingTop: 60 },
  avatar: { width: 88, height: 88, borderRadius: 44, marginBottom: 12, borderWidth: 3, borderColor: '#0EA5A4' },
  avatarPlaceholder: {
    width: 88, height: 88, borderRadius: 44, marginBottom: 12,
    backgroundColor: '#0EA5A4', alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#0EA5A4',
  },
  avatarInitial: { color: '#fff', fontSize: 36, fontWeight: 'bold' },
  displayName: { fontSize: 22, fontWeight: 'bold', color: '#0B1220', marginBottom: 6 },
  personalName: { fontSize: 13, color: '#667085', marginBottom: 6 },
  badgeRow: {
    backgroundColor: '#FEF3C7', paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 999, marginBottom: 6,
  },
  badgeText: { fontSize: 12, fontWeight: 'bold', color: '#92400E' },
  approvedCount: { fontSize: 13, color: '#667085', marginBottom: 3 },
  memberSince: { fontSize: 12, color: '#9CA3AF' },
  tabRow: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', gap: 8,
  },
  tabPill: {
    flex: 1, paddingVertical: 8, paddingHorizontal: 8, borderRadius: 999,
    backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center',
  },
  tabPillActive: { backgroundColor: '#0EA5A4', borderColor: '#0EA5A4' },
  tabPillText: { fontSize: 12, fontWeight: '600', color: '#667085', textAlign: 'center' },
  tabPillTextActive: { color: '#fff' },
  content: { padding: 16 },
  emptyBox: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, color: '#9CA3AF' },
  expThread: {
    marginTop: -8, marginBottom: 16, marginLeft: 8,
    borderLeftWidth: 2, borderLeftColor: '#E5E7EB', paddingLeft: 12,
  },
  expCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 12,
    marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB',
  },
  expHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  expAvatar: { width: 32, height: 32, borderRadius: 16 },
  expAvatarPlaceholder: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#0EA5A4', alignItems: 'center', justifyContent: 'center',
  },
  expAvatarInitial: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  expUser: { fontSize: 12, fontWeight: '700', color: '#0B1220' },
  expDate: { fontSize: 10, color: '#9CA3AF' },
  expText: { fontSize: 13, color: '#374151', lineHeight: 18 },
  expPhoto: { width: 70, height: 70, borderRadius: 8, marginRight: 6 },
});

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden',
    marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 3,
  },
  image: { width: '100%', height: 150 },
  imagePlaceholder: { backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  typeBadge: {
    position: 'absolute', top: 10, left: 10,
    backgroundColor: 'rgba(14,165,164,0.9)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
  },
  typeBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  body: { padding: 12 },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  title: { fontSize: 15, fontWeight: 'bold', color: '#0B1220' },
  meta: { fontSize: 11, color: '#667085', flex: 1 },
  dateMeta: { fontSize: 11, color: '#94A3B8' },
  going: { fontSize: 10, color: '#059669', fontWeight: '700', backgroundColor: '#ECFDF5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, alignSelf: 'flex-start', marginTop: 4 },
  price: { fontSize: 13, fontWeight: 'bold', color: '#0EA5A4' },
  viewMore: { fontSize: 11, color: '#0EA5A4', fontWeight: '700' },
  reviewHint: { fontSize: 10, color: '#94A3B8', marginTop: 6, fontStyle: 'italic' },
});
