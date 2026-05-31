import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { ChevronLeft, Bell, Heart, Calendar, Clock } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useGraphQL, gqlFetch } from '../src/hooks/useGraphQL';

const MY_NOTIFICATIONS_QUERY = `
  query MyNotifications {
    myNotifications { id title body type read createdAt }
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
  return (
    <View style={[styles.iconBox, { backgroundColor: '#FEF3C7' }]}>
      <Clock size={18} color="#D97706" />
    </View>
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = React.useState(false);

  const { data, loading, refetch } = useGraphQL<{ myNotifications: any[] }>(MY_NOTIFICATIONS_QUERY);
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
  }

  async function markAll() {
    await gqlFetch(MARK_ALL_READ).catch(() => {});
    refetch();
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#0B1220" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={markAll} style={styles.markAllBtn}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 80 }} />
        )}
      </View>

      {loading && notifications.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#0EA5A4" />
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0EA5A4" />}
          showsVerticalScrollIndicator={false}
        >
          {notifications.length === 0 ? (
            <View style={styles.emptyState}>
              <Bell size={56} color="#E5E7EB" />
              <Text style={styles.emptyTitle}>All caught up!</Text>
              <Text style={styles.emptyBody}>
                Notifications for saved listings, itinerary additions, and event reminders will appear here.
              </Text>
            </View>
          ) : (
            notifications.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.item, !item.read && styles.itemUnread]}
                onPress={() => handleTap(item)}
                activeOpacity={0.7}
              >
                <NotifIcon type={item.type} />
                <View style={styles.itemContent}>
                  <View style={styles.itemTop}>
                    <Text style={[styles.itemTitle, !item.read && styles.itemTitleBold]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.itemTime}>{timeAgo(item.createdAt)}</Text>
                  </View>
                  <Text style={styles.itemBody} numberOfLines={2}>{item.body}</Text>
                </View>
                {!item.read && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            ))
          )}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#0B1220' },
  markAllBtn: { paddingHorizontal: 4 },
  markAllText: { fontSize: 12, fontWeight: '600', color: '#0EA5A4' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { flex: 1 },
  emptyState: {
    alignItems: 'center', justifyContent: 'center',
    paddingTop: 80, paddingHorizontal: 40,
  },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#374151', marginTop: 16, marginBottom: 8 },
  emptyBody: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 },
  item: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  itemUnread: { backgroundColor: '#F0FFFE' },
  iconBox: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  itemContent: { flex: 1, marginLeft: 12 },
  itemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3 },
  itemTitle: { fontSize: 14, color: '#374151', flex: 1, marginRight: 8 },
  itemTitleBold: { fontWeight: 'bold', color: '#0B1220' },
  itemTime: { fontSize: 10, color: '#9CA3AF', flexShrink: 0 },
  itemBody: { fontSize: 12, color: '#667085', lineHeight: 18 },
  unreadDot: {
    width: 8, height: 8, borderRadius: 999,
    backgroundColor: '#0EA5A4', marginLeft: 8, marginTop: 4, flexShrink: 0,
  },
});
