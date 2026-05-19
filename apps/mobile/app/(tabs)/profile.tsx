import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, StyleSheet, Alert } from 'react-native';
import { Settings, CreditCard, Bell, Shield, HelpCircle, LogOut, ChevronRight, Crown } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { auth } from '../../src/lib/firebase';

export default function ProfileScreen() {
  const router = useRouter();

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              if (auth) {
                await auth.signOut();
              }
              // Navigate back to auth flow
              router.replace('/(auth)/onboarding' as any);
            } catch (error) {
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          }
        }
      ]
    );
  };

  const menuItems = [
    { icon: <Crown size={20} color="#FF6B35" />, label: 'Premium Membership', route: '/premium' as any, isPremium: true },
    { icon: <Settings size={20} color="#0EA5A4" />, label: 'App Settings', route: '/settings' as any },
    { icon: <Bell size={20} color="#0EA5A4" />, label: 'Notifications', route: '/notifications' as any },
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
            <View style={styles.avatarWrapper}>
              <View style={styles.avatarContainer}>
                <Image
                  source={{ uri: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=200' }}
                  style={styles.avatar}
                />
              </View>
              <TouchableOpacity style={styles.editButton}>
                <Settings size={14} color="white" />
              </TouchableOpacity>
            </View>
            <Text style={styles.name}>Sajimithan P</Text>
            <Text style={styles.memberInfo}>Free Member • Sri Lanka</Text>

            <TouchableOpacity
              onPress={() => router.push('/premium' as any)}
              style={styles.premiumButton}
            >
              <Crown size={18} color="#FF6B35" />
              <Text style={styles.premiumButtonText}>Upgrade to Premium</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          {menuItems.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => item.route && router.push(item.route as any)}
              activeOpacity={0.7}
              style={styles.menuItem}
            >
              <View style={styles.menuItemLeft}>
                <View style={[
                  styles.menuIconContainer,
                  item.isPremium ? styles.premiumIconBg : styles.defaultIconBg
                ]}>
                  {item.icon}
                </View>
                <Text style={styles.menuItemLabel}>{item.label}</Text>
              </View>
              <ChevronRight size={20} color="#E5E7EB" />
            </TouchableOpacity>
          ))}

          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <LogOut size={20} color="#EF4444" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.versionText}>Ceylonify v1.0.0 (Index: 220596H)</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 32,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  profileSection: {
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#E0F6F6',
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  editButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#0EA5A4',
    padding: 8,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0B1220',
    marginTop: 16,
  },
  memberInfo: {
    fontSize: 14,
    color: '#667085',
    marginTop: 4,
  },
  premiumButton: {
    marginTop: 24,
    backgroundColor: '#0B1220',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    gap: 8,
  },
  premiumButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  menuSection: {
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  menuIconContainer: {
    padding: 8,
    borderRadius: 12,
  },
  premiumIconBg: {
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
  },
  defaultIconBg: {
    backgroundColor: '#E0F6F6',
  },
  menuItemLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0B1220',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    marginTop: 16,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#EF4444',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  versionText: {
    fontSize: 12,
    color: '#667085',
  },
});

