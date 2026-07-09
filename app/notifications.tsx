import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SegmentedControl } from '@/components/medi/SegmentedControl';
import { AppImage } from '@/components/medi/AppLogo';
import { Colors, Radius, Spacing } from '@/constants/colors';
import { Images } from '@/constants/images';
import { notifications as mockNotifications } from '@/constants/mock-data';
import { useAuth } from '@/contexts/auth-context';
import {
  type InboxNotification,
  subscribeInboxNotifications,
} from '@/lib/firestore/inbox';

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [filter, setFilter] = useState(0);
  const [inbox, setInbox] = useState<InboxNotification[]>([]);

  useEffect(() => {
    if (!user) {
      setInbox([]);
      return;
    }

    return subscribeInboxNotifications(user.uid, setInbox);
  }, [user?.uid]);

  const combined = useMemo(() => {
    const mappedInbox: InboxNotification[] = inbox.map((item) => ({
      ...item,
      section: item.section ?? 'Today',
    }));

    const mappedMock: InboxNotification[] = mockNotifications.map((item) => ({
      ...item,
      type: undefined,
    }));

    return [...mappedInbox, ...mappedMock];
  }, [inbox]);

  const filtered = useMemo(() => {
    if (filter === 1) return combined.filter((n) => n.unread);
    if (filter === 2) {
      return combined.filter(
        (n) =>
          n.status === 'Missed' ||
          n.status === 'Due Now' ||
          n.type === 'patient_added' ||
          n.title.toLowerCase().includes('alert'),
      );
    }
    return combined;
  }, [combined, filter]);

  const unreadCount = combined.filter((n) => n.unread).length;
  const alertCount = combined.filter(
    (n) => n.status === 'Missed' || n.status === 'Due Now' || n.type === 'patient_added',
  ).length;

  const sections = ['Today', 'Yesterday', 'Earlier'] as const;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Notifications</Text>
        <Pressable style={styles.backBtn}>
          <Ionicons name="settings-outline" size={24} color={Colors.primary} />
        </Pressable>
      </View>

      <View style={styles.filterWrap}>
        <SegmentedControl
          options={[
            { label: 'All', count: combined.length },
            { label: 'Unread', count: unreadCount },
            { label: 'Alerts', count: alertCount },
          ]}
          selected={filter}
          onSelect={setFilter}
        />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {sections.map((section) => {
          const items = filtered.filter((n) => n.section === section);
          if (items.length === 0) return null;
          return (
            <View key={section}>
              <Text style={styles.sectionTitle}>{section}</Text>
              {items.map((notif) => (
                <Pressable
                  key={notif.id}
                  style={styles.notifCard}
                  onPress={() => notif.title.includes('Missed') && router.push('/missed-dose')}>
                  <View style={styles.notifLeft}>
                    {notif.unread && <View style={styles.unreadDot} />}
                    <View style={[styles.notifIcon, { backgroundColor: notif.iconBg }]}>
                      <Ionicons name={notif.icon as keyof typeof Ionicons.glyphMap} size={22} color={notif.iconColor} />
                    </View>
                  </View>
                  <View style={styles.notifBody}>
                    <Text style={styles.notifTitle}>{notif.title}</Text>
                    <Text style={styles.notifSubtitle}>{notif.subtitle}</Text>
                    <Text style={[styles.notifDetail, notif.status === 'Missed' && { color: Colors.error }]}>
                      {notif.detail}
                    </Text>
                  </View>
                  <View style={styles.notifRight}>
                    <Text style={styles.notifTime}>{notif.time}</Text>
                    <View style={[styles.statusTag, { backgroundColor: notif.statusBg, borderColor: notif.statusColor }]}>
                      <Text style={[styles.statusText, { color: notif.statusColor }]}>{notif.status}</Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          );
        })}

        <View style={styles.enableBanner}>
          <AppImage source={Images.icons.bell} size={36} />
          <View style={styles.enableText}>
            <Text style={styles.enableTitle}>Enable Push Notifications</Text>
            <Text style={styles.enableSub}>Stay updated with medicine reminders and alerts</Text>
          </View>
          <Pressable style={styles.enableBtn}>
            <Text style={styles.enableBtnText}>Enable</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, backgroundColor: Colors.white,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.primary },
  filterWrap: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, backgroundColor: Colors.white },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.navy, marginBottom: Spacing.md, marginTop: Spacing.md },
  notifCard: {
    flexDirection: 'row', gap: Spacing.md, backgroundColor: Colors.white,
    borderRadius: Radius.md, padding: Spacing.lg, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border,
  },
  notifLeft: { position: 'relative' },
  unreadDot: {
    position: 'absolute', top: 0, left: 0, width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.error, zIndex: 1,
  },
  notifIcon: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
  },
  notifBody: { flex: 1 },
  notifTitle: { fontSize: 14, fontWeight: '700', color: Colors.navy },
  notifSubtitle: { fontSize: 13, color: Colors.navy, marginTop: 2 },
  notifDetail: { fontSize: 11, color: Colors.textMuted, marginTop: 4 },
  notifRight: { alignItems: 'flex-end', gap: Spacing.sm },
  notifTime: { fontSize: 11, color: Colors.textMuted },
  statusTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.full, borderWidth: 1 },
  statusText: { fontSize: 10, fontWeight: '700' },
  enableBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.white, borderRadius: Radius.md, padding: Spacing.lg,
    marginTop: Spacing.xl, borderWidth: 1, borderColor: Colors.border,
  },
  enableText: { flex: 1 },
  enableTitle: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  enableSub: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  enableBtn: {
    backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: Radius.sm,
  },
  enableBtnText: { color: Colors.white, fontWeight: '700', fontSize: 13 },
});
