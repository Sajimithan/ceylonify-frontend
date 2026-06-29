import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Image, Modal, TextInput, ActivityIndicator,
} from 'react-native';
import { useAppAlert } from '../../src/components/AppAlert';
import {
  Settings, CreditCard, Bell, Shield, HelpCircle, LogOut,
  ChevronRight, Crown, Camera, Pencil, X, Check,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { auth } from '../../src/lib/firebase';
import { useGraphQL, gqlFetch } from '../../src/hooks/useGraphQL';
import { useTheme } from '../../src/context/ThemeContext';

const API_BASE = (process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:3000/graphql').replace('/graphql', '');

const ME_QUERY = `query Me { me { role isPremium displayName avatarUrl } }`;
const UPDATE_PROFILE = `mutation UpdateProfile($displayName: String, $avatarUrl: String) {
  updateProfile(displayName: $displayName, avatarUrl: $avatarUrl) { displayName avatarUrl }
}`;

function Avatar({ uri, initials }: { uri?: string | null; initials: string }) {
  if (uri) {
    return <Image source={{ uri }} style={avatarStyles.circle} />;
  }
  return (
    <View style={avatarStyles.circle}>
      <Text style={avatarStyles.text}>{initials}</Text>
    </View>
  );
}

function getInitials(displayName?: string | null, email?: string | null) {
  if (displayName) {
    return displayName.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  }
  if (email) return email[0].toUpperCase();
  return '?';
}

const avatarStyles = StyleSheet.create({
  circle: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: '#0EA5A4',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 4, borderColor: '#FFFFFF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 8, elevation: 5,
  },
  text: { color: '#FFFFFF', fontSize: 32, fontWeight: 'bold' },
});

export default function ProfileScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const user = auth?.currentUser;

  const { data, refetch } = useGraphQL<{ me: { role: string; isPremium: boolean; displayName?: string; avatarUrl?: string } | null }>(ME_QUERY);
  const role = data?.me?.role ?? null;
  const isPremium = data?.me?.isPremium ?? false;
  const dbDisplayName = data?.me?.displayName ?? null;
  const dbAvatarUrl = data?.me?.avatarUrl ?? null;

  const displayName = dbDisplayName || user?.displayName || user?.email?.split('@')[0] || 'Traveler';
  const memberSince = user?.metadata?.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    : null;

  const { show: showAlert, alertEl } = useAppAlert();
  // Name editing
  const [nameModalVisible, setNameModalVisible] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [nameSaving, setNameSaving] = useState(false);

  // Avatar uploading
  const [avatarUploading, setAvatarUploading] = useState(false);

  async function openNameEdit() {
    setNameInput(displayName);
    setNameModalVisible(true);
  }

  async function saveName() {
    if (!nameInput.trim()) return;
    setNameSaving(true);
    try {
      await gqlFetch(UPDATE_PROFILE, { displayName: nameInput.trim() });
      await refetch();
      setNameModalVisible(false);
    } catch {
      showAlert({ type: 'error', title: 'Could Not Update', message: 'Could not update name. Please try again.' });
    } finally {
      setNameSaving(false);
    }
  }

  async function handleAvatarPick() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert({ type: 'warning', title: 'Permission Required', message: 'Allow photo library access to set a profile picture.' });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;

    setAvatarUploading(true);
    try {
      const asset = result.assets[0];
      const formData = new FormData();
      formData.append('file', { uri: asset.uri, name: 'avatar.jpg', type: 'image/jpeg' } as any);
      const uploadRes = await fetch(`${API_BASE}/upload`, { method: 'POST', body: formData });
      if (!uploadRes.ok) throw new Error('Upload failed');
      const uploadData = await uploadRes.json();
      const avatarUrl = `${API_BASE}${uploadData.url}`;
      await gqlFetch(UPDATE_PROFILE, { avatarUrl });
      await refetch();
    } catch {
      showAlert({ type: 'error', title: 'Upload Failed', message: 'Could not upload photo. Please try again.' });
    } finally {
      setAvatarUploading(false);
    }
  }

  const handleLogout = () => {
    showAlert({
      type: 'confirm',
      title: 'Logout',
      message: 'Are you sure you want to logout?',
      confirmText: 'Logout',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          await auth!.signOut();
          router.replace('/(auth)/landing');
        } catch {
          showAlert({ type: 'error', title: 'Logout Failed', message: 'Could not logout. Please try again.' });
        }
      },
    });
  };

  const menuItems = [
    { icon: <Crown size={20} color="#F59E0B" />, label: 'Premium Membership', isPremium: true, route: '/premium' as any },
    { icon: <Settings size={20} color="#0EA5A4" />, label: 'App Settings', route: '/settings' as any },
    { icon: <Bell size={20} color="#0EA5A4" />, label: 'Notifications', route: '/notifications' as any },
    { icon: <CreditCard size={20} color="#0EA5A4" />, label: 'Payments & Payouts', route: null },
    { icon: <Shield size={20} color="#0EA5A4" />, label: 'Privacy & Security', route: null },
    { icon: <HelpCircle size={20} color="#0EA5A4" />, label: 'Help Center', route: '/help-center' as any },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {alertEl}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={styles.profileSection}>
            {/* Avatar with camera button */}
            <View style={styles.avatarWrapper}>
              <Avatar uri={dbAvatarUrl} initials={getInitials(displayName, user?.email)} />
              <TouchableOpacity
                style={styles.cameraBtn}
                onPress={handleAvatarPick}
                disabled={avatarUploading}
              >
                {avatarUploading
                  ? <ActivityIndicator size="small" color="#FFFFFF" />
                  : <Camera size={14} color="#FFFFFF" />
                }
              </TouchableOpacity>
            </View>

            {/* Name with edit button */}
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: colors.text }]}>{displayName}</Text>
              <TouchableOpacity onPress={openNameEdit} style={styles.editNameBtn}>
                <Pencil size={14} color="#0EA5A4" />
              </TouchableOpacity>
            </View>

            {user?.email && (
              <Text style={[styles.email, { color: colors.textMuted }]}>{user.email}</Text>
            )}

            <View style={styles.badgeRow}>
              {role && (
                <View style={[styles.badge, role === 'ADMIN' ? styles.badgeAdmin : styles.badgeTraveler]}>
                  <Text style={styles.badgeText}>{role}</Text>
                </View>
              )}
              {isPremium && (
                <View style={[styles.badge, styles.badgePremium]}>
                  <Crown size={10} color="#D97706" style={{ marginRight: 4 }} />
                  <Text style={[styles.badgeText, { color: '#D97706' }]}>Premium</Text>
                </View>
              )}
            </View>

            {memberSince && (
              <Text style={[styles.memberSince, { color: colors.textMuted }]}>Member since {memberSince}</Text>
            )}
          </View>
        </View>

        {/* Menu */}
        <View style={styles.menuSection}>
          {menuItems.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => item.route && router.push(item.route)}
              activeOpacity={0.7}
              style={[styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIconContainer, item.isPremium ? styles.premiumIconBg : styles.defaultIconBg]}>
                  {item.icon}
                </View>
                <Text style={[styles.menuItemLabel, { color: colors.text }]}>{item.label}</Text>
              </View>
              <ChevronRight size={20} color={colors.border} />
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={[styles.logoutButton, { backgroundColor: colors.surface, borderColor: 'rgba(239,68,68,0.25)' }]} onPress={handleLogout}>
            <LogOut size={20} color="#EF4444" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.versionText, { color: colors.textMuted }]}>Ceylonify v1.0.0</Text>
        </View>
      </ScrollView>

      {/* Name edit modal */}
      <Modal visible={nameModalVisible} transparent animationType="fade" onRequestClose={() => setNameModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Name</Text>
              <TouchableOpacity onPress={() => setNameModalVisible(false)}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="Your display name"
              placeholderTextColor={colors.textMuted}
              autoFocus
              maxLength={50}
            />
            <TouchableOpacity
              style={[styles.modalSaveBtn, (!nameInput.trim() || nameSaving) && { opacity: 0.5 }]}
              onPress={saveName}
              disabled={!nameInput.trim() || nameSaving}
            >
              {nameSaving
                ? <ActivityIndicator size="small" color="#FFFFFF" />
                : <><Check size={16} color="#FFFFFF" /><Text style={styles.modalSaveBtnText}>Save</Text></>
              }
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7FAFC' },
  scrollView: { flex: 1 },
  header: {
    paddingHorizontal: 24, paddingTop: 40, paddingBottom: 32,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 40, borderBottomRightRadius: 40,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 3,
  },
  profileSection: { alignItems: 'center' },
  avatarWrapper: { position: 'relative' },
  cameraBtn: {
    position: 'absolute', bottom: 0, right: 0,
    backgroundColor: '#0EA5A4', borderRadius: 999,
    width: 28, height: 28, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#FFFFFF',
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  name: { fontSize: 22, fontWeight: 'bold', color: '#0B1220' },
  editNameBtn: {
    backgroundColor: '#E0F6F6', padding: 6, borderRadius: 999,
  },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  badge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
    flexDirection: 'row', alignItems: 'center',
  },
  badgeTraveler: { backgroundColor: '#E0F6F6' },
  badgeAdmin: { backgroundColor: '#EDE9FE' },
  badgePremium: { backgroundColor: '#FEF3C7' },
  badgeText: { fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', color: '#0EA5A4' },
  email: { fontSize: 13, color: '#667085', marginTop: 6 },
  memberSince: { fontSize: 12, color: '#9CA3AF', marginTop: 8 },
  menuSection: { paddingHorizontal: 16, paddingVertical: 24 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12,
    borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 12,
  },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  menuIconContainer: { padding: 8, borderRadius: 12 },
  premiumIconBg: { backgroundColor: 'rgba(245,158,11,0.1)' },
  defaultIconBg: { backgroundColor: '#E0F6F6' },
  menuItemLabel: { fontSize: 16, fontWeight: 'bold', color: '#0B1220' },
  logoutButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 24, marginTop: 8, gap: 8,
  },
  logoutText: { fontSize: 16, fontWeight: 'bold', color: '#EF4444' },
  footer: { alignItems: 'center', paddingBottom: 40 },
  versionText: { fontSize: 12, color: '#9CA3AF' },
  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  modalCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, width: '100%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#0B1220' },
  modalInput: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: '#0B1220',
    marginBottom: 16,
  },
  modalSaveBtn: {
    backgroundColor: '#0EA5A4', borderRadius: 999,
    paddingVertical: 14, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 8,
  },
  modalSaveBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },
});
