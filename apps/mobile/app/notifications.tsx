import React, { useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { ChevronLeft, Bell, Heart, Calendar, Clock } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useGraphQL, gqlFetch } from '../src/hooks/useGraphQL';
import { useTheme } from '../src/context/ThemeContext';

const MY_NOTIFICATIONS_QUERY = `
  query MyNotifications {
    myNotifications { id title body type resourceId read createdAt }
  }
`;
const MARK_READ = `mutation MarkNotificationRead($notificationId: ID!) { markNotificationRead(notificationId: $notificationId) }`;
const MARK_ALL_READ = `mutation MarkAllNotificationsRead { markAllNotificationsRead }`;

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function NotifIcon({ type }: { type: string }) {
  if (type === 'SAVE') return (
    <View style={[styles.iconBox, { backgroundColor: '#FEE2E2' }]}>
      <Heart size={18} color="#EF4444" />
    </View>
  );
  if (type === 'ITINERARY') return (
    <View style={[styles.iconBox, { backgroundColor: '#DCFCE7' }]}>
      <Calendar size={18} color="#16A34A" />
    </View>
  );
  if (type === 'EXPERIENCE_REVIEW' || type === 'EXPERIENCE_REPLY') return (
    <View style={[styles.iconBox, { backgroundColor: '#FEE2E2' }]}>
      <Heart size={18} color="#EF4444" />
    </View>
  );
  return (
    <View style={[styles.iconBox, { backgroundColor: '#FEF3C7' }]}>
      <Clock size={18} color="#D97706" />
    </View>
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const themedStyles = useMemo(() => createStyles(colors), [colors]);
  const [refreshing, setRefreshing] = React.useState(false);

  const { data, loading, refetch } = useGraphQL<{ myNotifications: any[] }>(MY_NOTIFICATIONS_QUERY, undefined, { pollInterval: 30_000 });
  const notifications = data?.myNotifications ?? [];
  const unreadCount = notifications.filter((n) => !n.read).length;

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  async function handleTap(notif: any) {
    if (!notif.read) {
      await gqlFetch(MARK_READ, { notificationId: notif.id }).catch(() => {});
      refetch();
    }
    if (
      (notif.type === 'EXPERIENCE_REVIEW' || notif.type === 'EXPERIENCE_REPLY')
      && notif.resourceId
    ) {
      router.push(`/listing/${notif.resourceId}` as any);
    }
  }

  async function markAll() {
    await gqlFetch(MARK_ALL_READ).catch(() => {});
    refetch();
  }

  return (
    <View style={themedStyles.container}>
      <View style={themedStyles.header}>
        <TouchableOpacity onPress={() => router.back()} style={themedStyles.backBtn}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={themedStyles.headerTitle}>Notifications</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={markAll} style={themedStyles.markAllBtn}>
            <Text style={themedStyles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 80 }} />
        )}
      </View>

      {loading && notifications.length === 0 ? (
        <View style={themedStyles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={themedStyles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          showsVerticalScrollIndicator={false}
        >
          {notifications.length === 0 ? (
            <View style={themedStyles.emptyState}>
              <Bell size={56} color={colors.border} />
              <Text style={themedStyles.emptyTitle}>All caught up!</Text>
              <Text style={themedStyles.emptyBody}>
                Notifications for saved listings, itinerary additions, and event reminders will appear here.
              </Text>
            </View>
          ) : (
            notifications.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  themedStyles.item,
                  !item.read && { backgroundColor: isDark ? 'rgba(14,165,164,0.08)' : '#F0FFFE' },
                ]}
                onPress={() => handleTap(item)}
                activeOpacity={0.7}
              >
                <NotifIcon type={item.type} />
                <View style={themedStyles.itemContent}>
                  <View style={themedStyles.itemTop}>
                    <Text style={[themedStyles.itemTitle, !item.read && themedStyles.itemTitleBold]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={themedStyles.itemTime}>{timeAgo(item.createdAt)}</Text>
                  </View>
                  <Text style={themedStyles.itemBody} numberOfLines={2}>{item.body}</Text>
                </View>
                {!item.read && <View style={themedStyles.unreadDot} />}
              </TouchableOpacity>
            ))
          )}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16,
      backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text },
    markAllBtn: { paddingHorizontal: 4 },
    markAllText: { fontSize: 12, fontWeight: '600', color: colors.primary },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    list: { flex: 1 },
    emptyState: {
      alignItems: 'center', justifyContent: 'center',
      paddingTop: 80, paddingHorizontal: 40,
    },
    emptyTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginTop: 16, marginBottom: 8 },
    emptyBody: { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
    item: {
      flexDirection: 'row', alignItems: 'flex-start',
      paddingHorizontal: 16, paddingVertical: 14,
      backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider,
    },
    iconBox: {
      width: 40, height: 40, borderRadius: 12,
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    itemContent: { flex: 1, marginLeft: 12 },
    itemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3 },
    itemTitle: { fontSize: 14, color: colors.textMuted, flex: 1, marginRight: 8 },
    itemTitleBold: { fontWeight: 'bold', color: colors.text },
    itemTime: { fontSize: 10, color: colors.textMuted, flexShrink: 0 },
    itemBody: { fontSize: 12, color: colors.textMuted, lineHeight: 18 },
    unreadDot: {
      width: 8, height: 8, borderRadius: 999,
      backgroundColor: colors.primary, marginLeft: 8, marginTop: 4, flexShrink: 0,
    },
  });
}

const styles = StyleSheet.create({
  iconBox: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
});
