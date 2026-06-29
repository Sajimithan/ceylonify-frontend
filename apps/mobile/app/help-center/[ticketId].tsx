import React, { useMemo, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput,
  ActivityIndicator, RefreshControl, Image, KeyboardAvoidingView, Platform,
} from 'react-native';
import { ChevronLeft, Send, Plus, X } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../src/context/ThemeContext';
import { useGraphQL, gqlFetch } from '../../src/hooks/useGraphQL';
import {
  MY_SUPPORT_TICKETS, REPLY_TO_SUPPORT_TICKET, SupportTicket,
} from '../../src/lib/supportQueries';
import { fixSupportImageUrl, uploadSupportImages } from '../../src/lib/supportUpload';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  OPEN: { bg: 'rgba(245,158,11,0.15)', text: '#D97706' },
  REPLIED: { bg: 'rgba(14,165,233,0.15)', text: '#0284C7' },
  CLOSED: { bg: 'rgba(148,163,184,0.2)', text: '#64748B' },
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

function ChatImages({ urls, styles }: { urls: string[]; styles: ReturnType<typeof createStyles> }) {
  if (!urls.length) return null;
  return (
    <View style={styles.imageRow}>
      {urls.map((url, i) => {
        const fixed = fixSupportImageUrl(url);
        if (!fixed) return null;
        return (
          <Image key={`${url}-${i}`} source={{ uri: fixed }} style={styles.chatImage} resizeMode="cover" />
        );
      })}
    </View>
  );
}

export default function SupportTicketChatScreen() {
  const { ticketId } = useLocalSearchParams<{ ticketId: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const scrollRef = useRef<ScrollView>(null);

  const [replyText, setReplyText] = useState('');
  const [replyImages, setReplyImages] = useState<{ uri: string; name: string }[]>([]);
  const [replyError, setReplyError] = useState('');
  const [replying, setReplying] = useState(false);

  const { data, loading, refetch } = useGraphQL<{ mySupportTickets: SupportTicket[] }>(
    MY_SUPPORT_TICKETS,
  );
  const ticket = data?.mySupportTickets.find((t) => t.id === ticketId);

  async function pickReplyImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setReplyError('Allow photo library access to attach images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setReplyImages((prev) => [
      ...prev,
      { uri: asset.uri, name: `support-${Date.now()}.jpg` },
    ].slice(0, 3));
  }

  async function handleSendReply() {
    const draft = replyText.trim();
    if (!draft && replyImages.length === 0) {
      setReplyError('Please enter a message or attach an image.');
      return;
    }
    if (!ticketId) return;
    setReplyError('');
    setReplying(true);
    try {
      const imageUrls = replyImages.length > 0 ? await uploadSupportImages(replyImages) : [];
      await gqlFetch(REPLY_TO_SUPPORT_TICKET, {
        ticketId,
        message: draft,
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      });
      setReplyText('');
      setReplyImages([]);
      await refetch();
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) {
      setReplyError(e instanceof Error ? e.message : 'Failed to send reply.');
    } finally {
      setReplying(false);
    }
  }

  if (loading && !ticket) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!ticket) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.notFound}>Ticket not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
          <Text style={styles.backLinkText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusStyle = STATUS_COLORS[ticket.status] ?? STATUS_COLORS.CLOSED;
  const canReply = ticket.status !== 'CLOSED';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{ticket.subject}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>{ticket.status}</Text>
          </View>
        </View>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.chatContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} tintColor={colors.primary} />
        }
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        <View style={[styles.replyBubble, styles.replyUser]}>
          <Text style={styles.replyLabel}>You</Text>
          {ticket.message !== '(Image attached)' && (
            <Text style={styles.replyText}>{ticket.message}</Text>
          )}
          <ChatImages urls={ticket.imageUrls ?? []} styles={styles} />
          <Text style={styles.replyDate}>{formatDateTime(ticket.createdAt)}</Text>
        </View>

        {ticket.replies.map((reply) => (
          <View
            key={reply.id}
            style={[
              styles.replyBubble,
              reply.fromAdmin ? styles.replyAdmin : styles.replyUser,
            ]}
          >
            <Text style={styles.replyLabel}>{reply.fromAdmin ? 'Support' : 'You'}</Text>
            {reply.message !== '(Image attached)' && (
              <Text style={styles.replyText}>{reply.message}</Text>
            )}
            <ChatImages urls={reply.imageUrls ?? []} styles={styles} />
            <Text style={styles.replyDate}>{formatDateTime(reply.createdAt)}</Text>
          </View>
        ))}
      </ScrollView>

      {canReply ? (
        <View style={styles.composer}>
          {replyImages.length > 0 && (
            <View style={styles.attachRow}>
              {replyImages.map((img, i) => (
                <View key={img.uri} style={styles.thumbWrap}>
                  <Image source={{ uri: img.uri }} style={styles.thumb} />
                  <TouchableOpacity
                    style={styles.thumbRemove}
                    onPress={() => setReplyImages((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    <X size={10} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
          <View style={styles.composerRow}>
            <TouchableOpacity
              style={styles.attachBtn}
              onPress={pickReplyImage}
              disabled={replyImages.length >= 3 || replying}
            >
              <Plus size={20} color={colors.primary} />
            </TouchableOpacity>
            <TextInput
              style={styles.composerInput}
              placeholder="Write a reply..."
              placeholderTextColor={colors.textMuted}
              value={replyText}
              onChangeText={setReplyText}
              multiline
              maxLength={2000}
            />
            <TouchableOpacity
              style={[
                styles.sendBtn,
                (replying || (!replyText.trim() && replyImages.length === 0)) && styles.sendBtnDisabled,
              ]}
              onPress={handleSendReply}
              disabled={replying || (!replyText.trim() && replyImages.length === 0)}
            >
              {replying
                ? <ActivityIndicator color="#fff" size="small" />
                : <Send size={18} color="#fff" />
              }
            </TouchableOpacity>
          </View>
          {replyError ? <Text style={styles.errorText}>{replyError}</Text> : null}
        </View>
      ) : (
        <View style={styles.closedBar}>
          <Text style={styles.closedText}>This ticket is closed.</Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    centered: { justifyContent: 'center', alignItems: 'center', padding: 24 },
    notFound: { fontSize: 16, color: colors.text, marginBottom: 12 },
    backLink: { padding: 8 },
    backLinkText: { color: colors.primary, fontWeight: '600' },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingTop: 48, paddingBottom: 12,
      backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    backButton: { padding: 4 },
    headerCenter: { flex: 1, alignItems: 'center', gap: 4, paddingHorizontal: 8 },
    headerTitle: { fontSize: 16, fontWeight: 'bold', color: colors.text },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
    statusText: { fontSize: 10, fontWeight: 'bold' },
    scrollView: { flex: 1 },
    chatContent: { padding: 16, gap: 10, paddingBottom: 24 },
    replyBubble: { borderRadius: 12, padding: 12, borderWidth: 1, maxWidth: '88%' },
    replyAdmin: {
      alignSelf: 'flex-start',
      backgroundColor: 'rgba(14,165,164,0.1)',
      borderColor: 'rgba(14,165,164,0.25)',
    },
    replyUser: {
      alignSelf: 'flex-end',
      backgroundColor: colors.inputBackground,
      borderColor: colors.border,
    },
    replyLabel: { fontSize: 11, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
    replyText: { fontSize: 14, color: colors.text, lineHeight: 20 },
    replyDate: { fontSize: 10, color: colors.textMuted, marginTop: 6 },
    imageRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
    chatImage: { width: 88, height: 88, borderRadius: 8, backgroundColor: colors.divider },
    composer: {
      borderTopWidth: 1, borderTopColor: colors.border,
      backgroundColor: colors.surface, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 24,
    },
    attachRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    thumbWrap: { position: 'relative' },
    thumb: { width: 56, height: 56, borderRadius: 8 },
    thumbRemove: {
      position: 'absolute', top: -4, right: -4, width: 18, height: 18,
      borderRadius: 9, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center',
    },
    composerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
    attachBtn: {
      width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.border,
      alignItems: 'center', justifyContent: 'center', backgroundColor: colors.inputBackground,
    },
    composerInput: {
      flex: 1, minHeight: 40, maxHeight: 100, borderWidth: 1, borderColor: colors.border,
      borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10,
      fontSize: 15, color: colors.text, backgroundColor: colors.inputBackground,
    },
    sendBtn: {
      width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary,
      alignItems: 'center', justifyContent: 'center',
    },
    sendBtnDisabled: { opacity: 0.5 },
    errorText: { color: colors.error, fontSize: 12, marginTop: 6 },
    closedBar: {
      paddingVertical: 14, paddingHorizontal: 16, borderTopWidth: 1,
      borderTopColor: colors.border, backgroundColor: colors.surface,
    },
    closedText: { textAlign: 'center', color: colors.textMuted, fontSize: 13, fontStyle: 'italic' },
  });
}
