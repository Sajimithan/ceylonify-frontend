import React, { useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  TextInput, ActivityIndicator, RefreshControl, Image,
} from 'react-native';
import { X, ChevronDown, ChevronUp, MessageCircle, Send, ChevronRight, Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../src/context/ThemeContext';
import { FAQ_ITEMS } from '../../src/lib/faq';
import { useGraphQL, gqlFetch } from '../../src/hooks/useGraphQL';
import {
  CREATE_SUPPORT_TICKET, MY_SUPPORT_TICKETS, SupportTicket,
} from '../../src/lib/supportQueries';
import { uploadSupportImages } from '../../src/lib/supportUpload';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  OPEN: { bg: 'rgba(245,158,11,0.15)', text: '#D97706' },
  REPLIED: { bg: 'rgba(14,165,233,0.15)', text: '#0284C7' },
  CLOSED: { bg: 'rgba(148,163,184,0.2)', text: '#64748B' },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export default function HelpCenterScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [newTicketImages, setNewTicketImages] = useState<{ uri: string; name: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState(false);

  const { data, loading, refetch } = useGraphQL<{ mySupportTickets: SupportTicket[] }>(
    MY_SUPPORT_TICKETS,
  );
  const tickets = data?.mySupportTickets ?? [];

  async function pickNewTicketImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setFormError('Allow photo library access to attach images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setNewTicketImages((prev) => [
      ...prev,
      { uri: asset.uri, name: `support-${Date.now()}.jpg` },
    ].slice(0, 3));
  }

  async function handleSubmit() {
    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();
    if (!trimmedSubject || (!trimmedMessage && newTicketImages.length === 0)) {
      setFormError('Please enter a subject and message or attach an image.');
      return;
    }
    setFormError('');
    setFormSuccess(false);
    setSubmitting(true);
    try {
      const imageUrls = newTicketImages.length > 0 ? await uploadSupportImages(newTicketImages) : [];
      await gqlFetch(CREATE_SUPPORT_TICKET, {
        subject: trimmedSubject,
        message: trimmedMessage,
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      });
      setSubject('');
      setMessage('');
      setNewTicketImages([]);
      setFormSuccess(true);
      await refetch();
      setTimeout(() => setFormSuccess(false), 4000);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to send message.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <X size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help Center</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} tintColor={colors.primary} />
        }
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          <View style={styles.card}>
            {FAQ_ITEMS.map((item, idx) => {
              const open = expandedId === item.id;
              return (
                <View key={item.id}>
                  <TouchableOpacity
                    style={styles.faqRow}
                    onPress={() => setExpandedId(open ? null : item.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.faqQuestion}>{item.question}</Text>
                    {open
                      ? <ChevronUp size={18} color={colors.textMuted} />
                      : <ChevronDown size={18} color={colors.textMuted} />
                    }
                  </TouchableOpacity>
                  {open && (
                    <Text style={styles.faqAnswer}>{item.answer}</Text>
                  )}
                  {idx < FAQ_ITEMS.length - 1 && <View style={styles.divider} />}
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.supportHeader}>
            <MessageCircle size={18} color={colors.primary} />
            <Text style={styles.sectionTitle}>Contact Support</Text>
          </View>
          <Text style={styles.supportHint}>
            Send a message to our admin team. We typically respond within 1–2 business days.
          </Text>

          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Subject</Text>
            <TextInput
              style={styles.input}
              placeholder="What do you need help with?"
              placeholderTextColor={colors.textMuted}
              value={subject}
              onChangeText={setSubject}
              maxLength={120}
            />

            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Message</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe your issue in detail..."
              placeholderTextColor={colors.textMuted}
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={4}
              maxLength={2000}
              textAlignVertical="top"
            />

            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Photos (optional)</Text>
            <View style={styles.photoRow}>
              {newTicketImages.map((img, i) => (
                <View key={img.uri} style={styles.thumbWrap}>
                  <Image source={{ uri: img.uri }} style={styles.thumb} />
                  <TouchableOpacity
                    style={styles.thumbRemove}
                    onPress={() => setNewTicketImages((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    <X size={10} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
              {newTicketImages.length < 3 && (
                <TouchableOpacity style={styles.addPhotoBtn} onPress={pickNewTicketImage}>
                  <Plus size={20} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {formError ? <Text style={styles.formError}>{formError}</Text> : null}
            {formSuccess ? (
              <Text style={styles.formSuccess}>Message sent! We will get back to you soon.</Text>
            ) : null}

            <TouchableOpacity
              style={[
                styles.sendButton,
                (submitting || !subject.trim() || (!message.trim() && newTicketImages.length === 0)) && styles.sendButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={submitting || !subject.trim() || (!message.trim() && newTicketImages.length === 0)}
            >
              {submitting
                ? <ActivityIndicator color="#FFFFFF" size="small" />
                : <><Send size={16} color="#FFFFFF" /><Text style={styles.sendButtonText}>Send Message</Text></>
              }
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Previous Tickets</Text>
          {loading && tickets.length === 0 ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
          ) : tickets.length === 0 ? (
            <Text style={styles.emptyTickets}>No previous support tickets.</Text>
          ) : (
            tickets.map((ticket) => {
              const statusStyle = STATUS_COLORS[ticket.status] ?? STATUS_COLORS.CLOSED;
              const replyCount = ticket.replies.length;
              return (
                <TouchableOpacity
                  key={ticket.id}
                  style={styles.ticketRow}
                  onPress={() => router.push(`/help-center/${ticket.id}`)}
                  activeOpacity={0.7}
                >
                  <View style={styles.ticketRowMain}>
                    <View style={styles.ticketRowTop}>
                      {ticket.sourceType === 'LISTING_REPORT' && (
                        <View style={styles.reportBadge}>
                          <Text style={styles.reportBadgeText}>Report</Text>
                        </View>
                      )}
                      <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                        <Text style={[styles.statusText, { color: statusStyle.text }]}>{ticket.status}</Text>
                      </View>
                    </View>
                    <Text style={styles.ticketSubject} numberOfLines={1}>{ticket.subject}</Text>
                    <Text style={styles.ticketMeta}>
                      {formatDate(ticket.createdAt)}
                      {replyCount > 0 ? ` · ${replyCount} repl${replyCount === 1 ? 'y' : 'ies'}` : ''}
                    </Text>
                  </View>
                  <ChevronRight size={18} color={colors.textMuted} />
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 20, paddingTop: 48, paddingBottom: 16,
      backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    backButton: { padding: 4 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text },
    scrollView: { flex: 1 },
    section: { marginTop: 24, paddingHorizontal: 24 },
    sectionTitle: {
      fontSize: 12, fontWeight: 'bold', color: colors.textMuted,
      textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12,
    },
    supportHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    supportHint: { fontSize: 13, color: colors.textMuted, lineHeight: 20, marginBottom: 12 },
    card: {
      backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1,
      borderColor: colors.border, padding: 16, overflow: 'hidden',
    },
    faqRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: 14, gap: 12,
    },
    faqQuestion: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text, lineHeight: 22 },
    faqAnswer: {
      fontSize: 14, color: colors.textMuted, lineHeight: 22,
      paddingBottom: 14, paddingRight: 8,
    },
    divider: { height: 1, backgroundColor: colors.divider },
    fieldLabel: {
      fontSize: 11, fontWeight: 'bold', color: colors.textMuted,
      textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
    },
    input: {
      backgroundColor: colors.inputBackground, borderWidth: 1, borderColor: colors.border,
      borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
      fontSize: 15, color: colors.text,
    },
    textArea: { minHeight: 100, paddingTop: 12 },
    photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    thumbWrap: { position: 'relative' },
    thumb: { width: 64, height: 64, borderRadius: 8 },
    thumbRemove: {
      position: 'absolute', top: -4, right: -4, width: 18, height: 18,
      borderRadius: 9, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center',
    },
    addPhotoBtn: {
      width: 64, height: 64, borderRadius: 8, borderWidth: 1, borderColor: colors.border,
      borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center',
      backgroundColor: colors.inputBackground,
    },
    formError: { color: colors.error, fontSize: 12, fontWeight: '600', marginTop: 12 },
    formSuccess: { color: colors.success, fontSize: 12, fontWeight: '600', marginTop: 12 },
    sendButton: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 999,
      marginTop: 16,
    },
    sendButtonDisabled: { opacity: 0.5 },
    sendButtonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },
    emptyTickets: { fontSize: 13, color: colors.textMuted, textAlign: 'center', paddingVertical: 16 },
    ticketRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1,
      borderColor: colors.border, padding: 14, marginBottom: 8,
    },
    ticketRowMain: { flex: 1, gap: 4 },
    ticketRowTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    reportBadge: {
      backgroundColor: 'rgba(239,68,68,0.12)',
      paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999,
    },
    reportBadgeText: { fontSize: 9, fontWeight: 'bold', color: colors.error },
    ticketSubject: { fontSize: 15, fontWeight: '600', color: colors.text },
    ticketMeta: { fontSize: 11, color: colors.textMuted },
    statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
    statusText: { fontSize: 9, fontWeight: 'bold' },
  });
}
