import React, { useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { X, Moon, Bell, Globe, Lock, Shield, FileText, HelpCircle, LogOut, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Auth } from 'firebase/auth';
import { auth } from '../src/lib/firebase';
import { useTheme } from '../src/context/ThemeContext';

type ToggleItem = {
  icon: React.ReactNode;
  label: string;
  type: 'toggle';
  value: boolean;
  onToggle: () => void;
};

type LinkItem = {
  icon: React.ReactNode;
  label: string;
  type: 'link';
  value?: string;
  route: string | null;
};

type SettingItem = ToggleItem | LinkItem;

type SettingSection = {
  title: string;
  items: SettingItem[];
};

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, isDark, setDarkMode } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [pushNotifications, setPushNotifications] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem('pushNotificationsEnabled').then((val) => {
      if (val === 'false') setPushNotifications(false);
    }).catch(() => {});
  }, []);

  async function handleTogglePush() {
    const next = !pushNotifications;
    setPushNotifications(next);
    await AsyncStorage.setItem('pushNotificationsEnabled', String(next));
  }

  async function handleToggleDarkMode() {
    await setDarkMode(!isDark);
  }

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              if (auth) {
                await (auth as Auth).signOut();
              }
              router.replace('/(auth)/onboarding' as any);
            } catch {
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ],
    );
  };

  const settingSections: SettingSection[] = [
    {
      title: 'Preferences',
      items: [
        {
          icon: <Moon size={20} color={colors.iconMuted} />,
          label: 'Dark Mode',
          type: 'toggle',
          value: isDark,
          onToggle: handleToggleDarkMode,
        },
        {
          icon: <Bell size={20} color={colors.iconMuted} />,
          label: 'Push Notifications',
          type: 'toggle',
          value: pushNotifications,
          onToggle: handleTogglePush,
        },
        {
          icon: <Globe size={20} color={colors.iconMuted} />,
          label: 'Language',
          type: 'link',
          value: 'English',
          route: null,
        },
      ],
    },
    {
      title: 'Account & Security',
      items: [
        {
          icon: <Lock size={20} color={colors.iconMuted} />,
          label: 'Change Password',
          type: 'link',
          route: '/change-password',
        },
        {
          icon: <Shield size={20} color={colors.iconMuted} />,
          label: 'Privacy Settings',
          type: 'link',
          route: null,
        },
      ],
    },
    {
      title: 'Support & Legal',
      items: [
        {
          icon: <HelpCircle size={20} color={colors.iconMuted} />,
          label: 'Help Center',
          type: 'link',
          route: '/help-center',
        },
        {
          icon: <FileText size={20} color={colors.iconMuted} />,
          label: 'Terms of Service',
          type: 'link',
          route: null,
        },
        {
          icon: <FileText size={20} color={colors.iconMuted} />,
          label: 'Privacy Policy',
          type: 'link',
          route: null,
        },
      ],
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <X size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {settingSections.map((section, sectionIdx) => (
          <View key={sectionIdx} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.settingsGroup}>
              {section.items.map((item, itemIdx) => (
                <View key={itemIdx}>
                  {item.type === 'toggle' ? (
                    <View style={styles.settingItem}>
                      <View style={styles.settingLeft}>
                        <View style={styles.settingIcon}>
                          {item.icon}
                        </View>
                        <Text style={styles.settingLabel}>{item.label}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={item.onToggle}
                        style={[styles.toggle, item.value && styles.toggleActive]}
                      >
                        <View style={[
                          styles.toggleKnob,
                          item.value && styles.toggleKnobActive,
                        ]} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.settingItem}
                      onPress={() => item.route && router.push(item.route as any)}
                      disabled={!item.route}
                    >
                      <View style={styles.settingLeft}>
                        <View style={styles.settingIcon}>
                          {item.icon}
                        </View>
                        <Text style={[styles.settingLabel, !item.route && { opacity: 0.6 }]}>
                          {item.label}
                        </Text>
                      </View>
                      <View style={styles.settingRight}>
                        {item.value ? (
                          <Text style={styles.settingValue}>{item.value}</Text>
                        ) : null}
                        <ChevronRight size={20} color={colors.textMuted} />
                      </View>
                    </TouchableOpacity>
                  )}
                  {itemIdx < section.items.length - 1 && (
                    <View style={styles.divider} />
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}

        <View style={styles.logoutSection}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <LogOut size={20} color={colors.error} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.versionText}>Ceylonify v1.0.0</Text>
        </View>
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
      marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5,
    },
    settingsGroup: {
      backgroundColor: colors.surface, borderRadius: 12,
      borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
    },
    settingItem: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingVertical: 14,
    },
    settingLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
    settingIcon: {
      width: 40, height: 40, backgroundColor: colors.inputBackground,
      borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    },
    settingLabel: { fontSize: 16, fontWeight: '600', color: colors.text },
    settingRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    settingValue: { fontSize: 14, color: colors.textMuted },
    toggle: {
      width: 52, height: 30, borderRadius: 15,
      backgroundColor: colors.border, padding: 2, justifyContent: 'center',
    },
    toggleActive: { backgroundColor: colors.primary },
    toggleKnob: {
      width: 26, height: 26, borderRadius: 13, backgroundColor: '#FFFFFF',
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.15, shadowRadius: 2, elevation: 2, alignSelf: 'flex-start',
    },
    toggleKnobActive: { alignSelf: 'flex-end' },
    divider: { height: 1, backgroundColor: colors.divider, marginLeft: 68 },
    logoutSection: { paddingHorizontal: 24, marginTop: 32, marginBottom: 16 },
    logoutButton: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      backgroundColor: colors.surface, paddingVertical: 16, borderRadius: 12,
      borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)', gap: 8,
    },
    logoutText: { fontSize: 16, fontWeight: 'bold', color: colors.error },
    footer: { alignItems: 'center', paddingVertical: 40 },
    versionText: { fontSize: 14, color: colors.textMuted, fontWeight: '600' },
  });
}
