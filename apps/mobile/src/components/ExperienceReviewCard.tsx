import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, TextInput, ActivityIndicator,
} from 'react-native';
import { Heart, MessageCircle } from 'lucide-react-native';
import { gqlFetch } from '../hooks/useGraphQL';
import { auth } from '../lib/firebase';

const TOGGLE_LIKE = `
  mutation ToggleExperienceLike($experienceId: ID!) {
    toggleExperienceLike(experienceId: $experienceId) { liked likeCount }
  }
`;

const REPLY_MUTATION = `
  mutation ReplyToExperience($experienceId: ID!, $message: String!) {
    replyToExperience(experienceId: $experienceId, message: $message) {
      id senderUid authorRole message createdAt
    }
  }
`;

export type ExperienceReply = {
  id: string;
  senderUid: string;
  authorRole: string;
  message: string;
  createdAt: string;
};

export type ExperienceReview = {
  id: string;
  rating: number;
  text: string;
  imageUrls?: string[];
  createdAt: string;
  likeCount?: number;
  likedByMe?: boolean;
  user?: { displayName?: string; avatarUrl?: string };
  replies?: ExperienceReply[];
};

function roleLabel(role: string): string {
  if (role === 'HOST') return 'Host';
  if (role === 'ADMIN') return 'Admin';
  return 'Traveler';
}

function roleBadgeStyle(role: string) {
  if (role === 'HOST') return { bg: '#FEF3C7', text: '#B45309' };
  if (role === 'ADMIN') return { bg: '#EDE9FE', text: '#6D28D9' };
  return { bg: '#F1F5F9', text: '#64748B' };
}

function StarRow({ rating }: { rating: number }) {
  return <Text style={{ color: '#F59E0B', fontSize: 12 }}>{'⭐'.repeat(rating)}</Text>;
}

export function ExperienceReviewCard({
  review,
  fixImageUrl,
  onUpdated,
}: {
  review: ExperienceReview;
  fixImageUrl: (url?: string | null) => string | null;
  onUpdated?: () => void;
}) {
  const [liked, setLiked] = useState(review.likedByMe ?? false);
  const [likeCount, setLikeCount] = useState(review.likeCount ?? 0);
  const [replies, setReplies] = useState<ExperienceReply[]>(review.replies ?? []);
  const [showReplies, setShowReplies] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [likeLoading, setLikeLoading] = useState(false);
  const [replyLoading, setReplyLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const expAvatar = fixImageUrl(review.user?.avatarUrl);

  async function handleToggleLike() {
    if (!auth?.currentUser) {
      setError('Sign in to react to reviews.');
      return;
    }
    setLikeLoading(true);
    setError(null);
    try {
      const result = await gqlFetch<{ toggleExperienceLike: { liked: boolean; likeCount: number } }>(
        TOGGLE_LIKE,
        { experienceId: review.id },
      );
      if (result?.toggleExperienceLike) {
        setLiked(result.toggleExperienceLike.liked);
        setLikeCount(result.toggleExperienceLike.likeCount);
        onUpdated?.();
      }
    } catch {
      setError('Could not update reaction.');
    } finally {
      setLikeLoading(false);
    }
  }

  async function handleSubmitReply() {
    if (!auth?.currentUser) {
      setError('Sign in to reply.');
      return;
    }
    const trimmed = replyText.trim();
    if (!trimmed) return;
    setReplyLoading(true);
    setError(null);
    try {
      const result = await gqlFetch<{ replyToExperience: ExperienceReply }>(
        REPLY_MUTATION,
        { experienceId: review.id, message: trimmed },
      );
      if (result?.replyToExperience) {
        setReplies((prev) => [...prev, result.replyToExperience]);
        setReplyText('');
        setShowReplies(true);
        onUpdated?.();
      }
    } catch (e: any) {
      setError(e?.message ?? 'Could not post reply.');
    } finally {
      setReplyLoading(false);
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        {expAvatar ? (
          <Image source={{ uri: expAvatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>
              {(review.user?.displayName ?? 'T').charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.userName}>{review.user?.displayName ?? 'Traveler'}</Text>
          <Text style={styles.date}>
            {new Date(review.createdAt).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric',
            })}
          </Text>
        </View>
        <StarRow rating={review.rating} />
      </View>

      <Text style={styles.text}>{review.text}</Text>

      {(review.imageUrls ?? []).length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
          {review.imageUrls!.map((imgUrl, i) => (
            <Image
              key={i}
              source={{ uri: fixImageUrl(imgUrl) ?? imgUrl }}
              style={styles.photo}
            />
          ))}
        </ScrollView>
      )}

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => void handleToggleLike()}
          disabled={likeLoading}
        >
          {likeLoading
            ? <ActivityIndicator size="small" color="#EF4444" />
            : <Heart size={16} color={liked ? '#EF4444' : '#667085'} fill={liked ? '#EF4444' : 'none'} />}
          <Text style={[styles.actionText, liked && styles.actionTextActive]}>{likeCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => setShowReplies((v) => !v)}
        >
          <MessageCircle size={16} color="#0EA5A4" />
          <Text style={styles.actionText}>
            Reply{replies.length > 0 ? ` (${replies.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {showReplies && replies.length > 0 && (
        <View style={styles.repliesWrap}>
          {replies.map((reply) => {
            const badge = roleBadgeStyle(reply.authorRole);
            return (
              <View key={reply.id} style={styles.replyCard}>
                <View style={styles.replyMeta}>
                  <View style={[styles.roleBadge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.roleBadgeText, { color: badge.text }]}>
                      {roleLabel(reply.authorRole)}
                    </Text>
                  </View>
                  <Text style={styles.replyDate}>
                    {new Date(reply.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </Text>
                </View>
                <Text style={styles.replyText}>{reply.message}</Text>
              </View>
            );
          })}
        </View>
      )}

      {showReplies && (
        <View style={styles.replyInputWrap}>
          <TextInput
            value={replyText}
            onChangeText={setReplyText}
            placeholder="Share feedback or ask a question…"
            placeholderTextColor="#9CA3AF"
            style={styles.replyInput}
            multiline
          />
          <TouchableOpacity
            style={[styles.postReplyBtn, (!replyText.trim() || replyLoading) && { opacity: 0.5 }]}
            onPress={() => void handleSubmitReply()}
            disabled={!replyText.trim() || replyLoading}
          >
            {replyLoading
              ? <ActivityIndicator size="small" color="#FFFFFF" />
              : <Text style={styles.postReplyText}>Post reply</Text>}
          </TouchableOpacity>
        </View>
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarPlaceholder: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#E6FFFA',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontSize: 14, fontWeight: '700', color: '#0EA5A4' },
  userName: { fontSize: 14, fontWeight: '700', color: '#0B1220' },
  date: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  text: { fontSize: 14, color: '#374151', lineHeight: 21 },
  photo: { width: 72, height: 72, borderRadius: 10, marginRight: 8 },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { fontSize: 13, fontWeight: '600', color: '#667085' },
  actionTextActive: { color: '#EF4444' },
  repliesWrap: { marginTop: 10, gap: 8 },
  replyCard: { backgroundColor: '#F8FAFC', borderRadius: 10, padding: 10 },
  replyMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  roleBadgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  replyDate: { fontSize: 10, color: '#9CA3AF' },
  replyText: { fontSize: 13, color: '#475569', lineHeight: 18 },
  replyInputWrap: { marginTop: 10, gap: 8 },
  replyInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0B1220',
    minHeight: 72,
    textAlignVertical: 'top',
  },
  postReplyBtn: {
    alignSelf: 'flex-end',
    backgroundColor: '#0EA5A4',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  postReplyText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  errorText: { marginTop: 8, fontSize: 12, color: '#EF4444' },
});
