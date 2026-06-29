import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Share, Linking, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { X, Share2 } from 'lucide-react-native';

export type ShareableExperience = {
  listingId: string;
  rating: number;
  text: string;
  title?: string | null;
};

const WEB_APP_URL = (process.env.EXPO_PUBLIC_WEB_APP_URL ?? 'http://localhost:5173').replace(/\/$/, '');

function buildListingUrl(listingId: string) {
  return `${WEB_APP_URL}/listing/${listingId}`;
}

function buildShareText(exp: ShareableExperience) {
  const url = buildListingUrl(exp.listingId);
  const title = exp.title ? `"${exp.title}"` : 'this experience';
  return `I had an amazing time in Sri Lanka! ⭐ ${exp.rating}/5\n\n${exp.text.slice(0, 200)}${exp.text.length > 200 ? '…' : ''}\n\nCheck out ${title} on Ceylonify 🌴\n${url}`;
}

type PlatformOption = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void | Promise<void>;
};

export function ExperienceShareModal({
  visible,
  experience,
  onClose,
}: {
  visible: boolean;
  experience: ShareableExperience | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  if (!experience) return null;

  const url = buildListingUrl(experience.listingId);
  const shareText = buildShareText(experience);

  async function shareLink(platformHint?: string) {
    try {
      await Share.share({ message: url });
    } catch {
      // user dismissed
    }
    if (platformHint) {
      setHint(platformHint);
      setTimeout(() => setHint(null), 4000);
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const platforms: PlatformOption[] = [
    {
      key: 'facebook',
      label: 'Facebook',
      icon: 'logo-facebook',
      color: '#1877F2',
      onPress: () => Linking.openURL(
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      ),
    },
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      icon: 'logo-whatsapp',
      color: '#25D366',
      onPress: () => Linking.openURL(
        `https://wa.me/?text=${encodeURIComponent(shareText)}`,
      ),
    },
    {
      key: 'instagram',
      label: 'Instagram',
      icon: 'logo-instagram',
      color: '#E4405F',
      onPress: () => shareLink('Use the share sheet to copy the link, then paste it in your Instagram story or bio.'),
    },
    {
      key: 'tiktok',
      label: 'TikTok',
      icon: 'logo-tiktok',
      color: '#010101',
      onPress: () => shareLink('Use the share sheet to copy the link, then paste it in your TikTok video description.'),
    },
  ];

  async function handleNativeShare() {
    try {
      await Share.share({ message: shareText, url });
    } catch {
      // user dismissed
    }
  }

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Share Your Experience</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={22} color="#667085" />
            </TouchableOpacity>
          </View>
          {experience.title ? (
            <Text style={styles.subtitle} numberOfLines={1}>{experience.title}</Text>
          ) : null}

          <View style={styles.grid}>
            {platforms.map((platform) => (
              <TouchableOpacity
                key={platform.key}
                style={[styles.platformBtn, { backgroundColor: platform.color }]}
                activeOpacity={0.85}
                onPress={platform.onPress}
              >
                <Ionicons name={platform.icon} size={22} color="#FFFFFF" />
                <Text style={styles.platformLabel}>{platform.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {hint ? (
            <View style={styles.hintBox}>
              <Text style={styles.hintText}>✓ {hint}</Text>
            </View>
          ) : null}

          <View style={styles.copyRow}>
            <Text style={styles.copyUrl} numberOfLines={1}>{url}</Text>
            <TouchableOpacity onPress={() => shareLink()} style={styles.copyBtn}>
              <Text style={styles.copyBtnText}>{copied ? 'Shared!' : 'Share link'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.moreBtn} onPress={handleNativeShare} activeOpacity={0.85}>
            <Share2 size={16} color="#374151" />
            <Text style={styles.moreBtnText}>More sharing options…</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: { fontSize: 18, fontWeight: 'bold', color: '#0B1220' },
  subtitle: { fontSize: 12, color: '#667085', marginBottom: 16, fontWeight: '600' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  platformBtn: {
    width: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  platformLabel: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  hintBox: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  hintText: { fontSize: 12, color: '#047857', fontWeight: '600', lineHeight: 18 },
  copyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  copyUrl: { flex: 1, fontSize: 11, color: '#64748B', fontFamily: 'monospace' },
  copyBtn: { paddingHorizontal: 4 },
  copyBtnText: { fontSize: 12, fontWeight: '700', color: '#0EA5A4' },
  moreBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  moreBtnText: { fontSize: 14, fontWeight: '600', color: '#374151' },
});
