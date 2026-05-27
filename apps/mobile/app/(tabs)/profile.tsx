import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert,
} from 'react-native';
import { Settings, CreditCard, Bell, Shield, HelpCircle, LogOut, ChevronRight, Crown } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { auth } from '../../src/lib/firebase';
import { useGraphQL } from '../../src/hooks/useGraphQL';

const ME_QUERY = `query Me { me { role isPremium } }`;

function Initials({ name, email }: { name?: string | null; email?: string | null }) {
  const letters = name
    ? name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
    : email
    ? email[0].toUpperCase()
    : '?';
  return (
    <View style={avatarStyles.circle}>
      <Text style={avatarStyles.text}>{letters}</Text>
    </View>
  );
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
  const user = auth?.currentUser;

  const { data } = useGraphQL<{ me: { role: string; isPremium: boolean } | null }>(ME_QUERY);
  const role = data?.me?.role ?? null;
  const isPremium = data?.me?.isPremium ?? false;

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Traveler';
  const memberSince = user?.metadata?.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    : null;

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout', style: 'destructive',
          onPress: async () => {
            try {
              await auth!.signOut();
              router.replace('/(auth)/landing');
            } catch {
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ],
    );
  };

  const menuItems = [
    { icon: <Crown size={20} color="#F59E0B" />, label: 'Premium Membership', isPremium: true, route: '/premium' as any },
    { icon: <Settings size={20} color="#0EA5A4" />, label: 'App Settings', route: '/settings' as any },
    { icon: <Bell size={20} color="#0EA5A4" />, label: 'Notifications', route: null },
    { icon: <CreditCard size={20} color="#0EA5A4" />, label: 'Payments & Payouts', route: null },
    { icon: <Shield size={20} color="#0EA5A4" />, label: 'Privacy & Security', route: null },
    { icon: <HelpCircle size={20} color="#0EA5A4" />, label: 'Help Center', route: null },
  ];

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.profileSection}>
            <Initials name={user?.displayName} email={user?.email} />
            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.email}>{user?.email}</Text>

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
              <Text style={styles.memberSince}>Member since {memberSince}</Text>
            )}
          </View>
        </View>

        {/* Info Cards */}
        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>EMAIL</Text>
            <Text style={styles.infoValue} numberOfLines={1}>{user?.email ?? '—'}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>ACCOUNT ID</Text>
            <Text style={styles.infoValueMono} numberOfLines={1}>{user?.uid ? user.uid.slice(0, 16) + '…' : '—'}</Text>
          </View>
        </View>

        {/* Menu */}
        <View style={styles.menuSection}>
          {menuItems.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => item.route && router.push(item.route)}
              activeOpacity={0.7}
              style={styles.menuItem}
            >
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIconContainer, item.isPremium ? styles.premiumIconBg : styles.defaultIconBg]}>
                  {item.icon}
                </View>
                <Text style={styles.menuItemLabel}>{item.label}</Text>
              </View>
              <ChevronRight size={20} color="#E5E7EB" />
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <LogOut size={20} color="#EF4444" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.versionText}>Ceylonify v1.0.0 · Index: 220596H</Text>
        </View>
      </ScrollView>
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
  name: { fontSize: 22, fontWeight: 'bold', color: '#0B1220', marginTop: 14 },
  email: { fontSize: 13, color: '#667085', marginTop: 2 },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  badge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
    flexDirection: 'row', alignItems: 'center',
  },
  badgeTraveler: { backgroundColor: '#E0F6F6' },
  badgeAdmin: { backgroundColor: '#EDE9FE' },
  badgePremium: { backgroundColor: '#FEF3C7' },
  badgeText: { fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', color: '#0EA5A4' },
  memberSince: { fontSize: 12, color: '#9CA3AF', marginTop: 8 },
  infoSection: { paddingHorizontal: 16, paddingTop: 20, gap: 12, flexDirection: 'row' },
  infoCard: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: '#E5E7EB',
  },
  infoLabel: { fontSize: 10, fontWeight: 'bold', color: '#9CA3AF', letterSpacing: 0.5, marginBottom: 4 },
  infoValue: { fontSize: 13, fontWeight: '600', color: '#374151' },
  infoValueMono: { fontSize: 11, color: '#667085', fontFamily: 'monospace' },
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
});
