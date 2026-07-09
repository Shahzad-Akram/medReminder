import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ProgressRing } from '@/components/medi/ProgressRing';
import { AppImage } from '@/components/medi/AppLogo';
import { TealHeader } from '@/components/medi/TealHeader';
import { Colors, Radius, Spacing } from '@/constants/colors';
import { Images } from '@/constants/images';
import { useMediData } from '@/contexts/medi-data-context';
import { timeOfDayFromClock } from '@/lib/firestore/medicines';

const scheduleIconForTime = (time: string) => {
  const tod = timeOfDayFromClock(time);
  if (tod === 'night') return { icon: 'moon' as const, color: Colors.purpleLight, iconColor: Colors.purple };
  if (tod === 'evening') return { icon: 'cloudy-night' as const, color: Colors.purpleLight, iconColor: Colors.purple };
  if (tod === 'afternoon') return { icon: 'partly-sunny' as const, color: Colors.blueLight, iconColor: Colors.info };
  return { icon: 'sunny' as const, color: Colors.successLight, iconColor: Colors.success };
};

const parseDateMaybe = (value: string) => {
  const trimmed = value?.trim();
  if (!trimmed || trimmed.toLowerCase() === 'ongoing') return null;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const daysDiff = (from: Date, to: Date) => {
  const a = new Date(from);
  a.setHours(0, 0, 0, 0);
  const b = new Date(to);
  b.setHours(0, 0, 0, 0);
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
};

export default function MedicineDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getMedicineById, deleteMedicineCascade } = useMediData();
  const medicine = getMedicineById(id ?? '') ?? getMedicineById('1');
  const [deleting, setDeleting] = useState(false);

  if (!medicine) {
    return (
      <View style={styles.container}>
        <TealHeader title="Medicine Details" showLogo />
        <View style={styles.missing}>
          <Text style={styles.missingText}>Medicine not found.</Text>
        </View>
      </View>
    );
  }

  const infoRows = [
    { icon: 'shield-checkmark' as const, label: 'Medicine Type', value: medicine.type },
    { icon: 'flask' as const, label: 'Dosage', value: medicine.dosage },
    { icon: 'medical' as const, label: 'Strength', value: medicine.strength },
    { icon: 'document-text' as const, label: 'Instructions', value: medicine.instructions },
    { icon: 'calendar' as const, label: 'Start Date', value: medicine.startDate },
    { icon: 'calendar' as const, label: 'End Date', value: medicine.endDate },
    { icon: 'fitness' as const, label: 'Doctor Note', value: medicine.doctorNote },
  ];

  const today = new Date();
  const start = parseDateMaybe(medicine.startDate) ?? today;
  const end = parseDateMaybe(medicine.endDate);
  const totalDays = end ? Math.max(1, daysDiff(start, end) + 1) : null;
  const daysLeft = end ? Math.max(0, daysDiff(today, end) + 1) : null;
  const percent = totalDays && daysLeft != null ? Math.max(0, Math.min(100, Math.round(((totalDays - daysLeft) / totalDays) * 100))) : 0;

  const handleDelete = () => {
    Alert.alert(
      'Delete medicine?',
      'This will delete the medicine and its reminders for you and all helpers.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              if (deleting) return;
              setDeleting(true);
              try {
                await deleteMedicineCascade(medicine.id);
                router.replace('/(tabs)/reminders');
              } catch {
                Alert.alert('Could not delete', 'Please try again.');
              } finally {
                setDeleting(false);
              }
            })();
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <TealHeader title="Medicine Details" showLogo />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.overview}>
          <View style={styles.pillCircle}>
            <AppImage source={Images.illustrations.pills} size={72} />
          </View>
          <View style={styles.overviewText}>
            <View style={styles.nameRow}>
              <Text style={styles.medName}>{medicine.name} {medicine.strength}</Text>
              <View style={styles.activeBadge}>
                <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                <Text style={styles.activeText}>Active</Text>
              </View>
            </View>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{medicine.category}</Text>
            </View>
            <Text style={styles.description}>{medicine.description}</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          {infoRows.map((row) => (
            <View key={row.label} style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name={row.icon} size={18} color={Colors.primary} />
              </View>
              <Text style={styles.infoLabel}>{row.label}</Text>
              <Text style={styles.infoValue}>{row.value}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Reminder Schedule</Text>
        {medicine.frequency ? (
          <Text style={styles.frequencyLabel}>{medicine.frequency}</Text>
        ) : null}
        <View style={styles.scheduleCard}>
          {(medicine.scheduleTimes && medicine.scheduleTimes.length > 0
            ? medicine.scheduleTimes
            : [medicine.nextReminder.replace(/^Today,\s*/i, '').trim() || '8:00 AM']
          ).map((time, index) => {
            const { icon, color, iconColor } = scheduleIconForTime(time);

            return (
              <Pressable key={`${time}-${index}`} style={styles.scheduleRow}>
                <View style={[styles.scheduleIcon, { backgroundColor: color }]}>
                  <Ionicons name={icon} size={22} color={iconColor} />
                </View>
                <View style={styles.scheduleText}>
                  <Text style={styles.scheduleTime}>{time}</Text>
                  <Text style={styles.scheduleNote}>{medicine.instructions || 'As directed'}</Text>
                </View>
                <View style={styles.dailyBadge}>
                  <Text style={styles.dailyText}>Daily</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
              </Pressable>
            );
          })}
        </View>

        <View style={styles.bottomRow}>
          <View style={styles.halfCard}>
            <Text style={styles.sectionTitle}>Reminder Channels</Text>
            {[
              {
                image: Images.icons.bell,
                label: 'Push Notifications',
                enabled: medicine.notifyPush !== false,
              },
              {
                icon: 'chatbubble' as const,
                label: 'SMS',
                enabled: Boolean(medicine.notifySms),
              },
              {
                image: Images.icons.whatsapp,
                label: 'WhatsApp',
                enabled: Boolean(medicine.notifyWhatsapp),
              },
            ].map((ch) => (
              <View key={ch.label} style={styles.channelRow}>
                {'image' in ch && ch.image ? (
                  <AppImage source={ch.image} size={20} />
                ) : (
                  <Ionicons name={ch.icon!} size={18} color={Colors.primary} />
                )}
                <Text style={styles.channelLabel}>{ch.label}</Text>
                <Ionicons
                  name={ch.enabled ? 'checkmark-circle' : 'ellipse-outline'}
                  size={18}
                  color={ch.enabled ? Colors.success : Colors.textMuted}
                />
              </View>
            ))}
          </View>

          <View style={styles.halfCard}>
            <Text style={styles.sectionTitle}>Treatment Progress</Text>
            <View style={styles.progressRow}>
              <ProgressRing percent={totalDays ? percent : 0} size={80}>
                <Text style={styles.daysLeft}>{daysLeft ?? '—'}</Text>
                <Text style={styles.daysLabel}>{end ? 'Days Left' : 'Ongoing'}</Text>
              </ProgressRing>
              <View style={styles.progressDetails}>
                <View style={styles.progressItem}>
                  <Ionicons name="calendar-outline" size={14} color={Colors.primary} />
                  <Text style={styles.progressText}>Started On {medicine.startDate}</Text>
                </View>
                <View style={styles.progressItem}>
                  <Ionicons name="flag-outline" size={14} color={Colors.primary} />
                  <Text style={styles.progressText}>Ends On {medicine.endDate}</Text>
                </View>
                <View style={styles.progressItem}>
                  <Ionicons name="shield-checkmark" size={14} color={Colors.primary} />
                  <Text style={[styles.progressText, { color: Colors.primary, fontWeight: '700' }]}>
                    On Track Keep it up!
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.actionRow}>
          <Pressable style={styles.editBtn}>
            <Ionicons name="create-outline" size={20} color={Colors.white} />
            <Text style={styles.editBtnText}>Edit Medicine</Text>
          </Pressable>
          <Pressable style={styles.pauseBtn} onPress={handleDelete} disabled={deleting}>
            <Ionicons name="trash-outline" size={20} color={Colors.error} />
            <Text style={styles.pauseBtnText}>{deleting ? 'Deleting…' : 'Delete'}</Text>
          </Pressable>
        </View>

        <Pressable style={styles.securityBar}>
          <AppImage source={Images.icons.security} size={24} />
          <Text style={styles.securityText}>Your health data is secure and encrypted</Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
  overview: { flexDirection: 'row', gap: Spacing.lg, marginBottom: Spacing.xl },
  pillCircle: {
    width: 90, height: 90, alignItems: 'center', justifyContent: 'center',
  },
  overviewText: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'flex-start', flexWrap: 'wrap', gap: Spacing.sm },
  medName: { fontSize: 20, fontWeight: '800', color: Colors.primary, flex: 1 },
  activeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.successLight,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.full,
  },
  activeText: { fontSize: 11, color: Colors.success, fontWeight: '700' },
  categoryBadge: {
    alignSelf: 'flex-start', backgroundColor: Colors.primaryLight, paddingHorizontal: Spacing.md,
    paddingVertical: 4, borderRadius: Radius.full, marginTop: Spacing.sm,
  },
  categoryText: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  description: { fontSize: 13, color: Colors.textMuted, marginTop: Spacing.sm, lineHeight: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.navy, marginBottom: Spacing.md },
  frequencyLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
    marginTop: -Spacing.sm,
    marginBottom: Spacing.md,
  },
  infoCard: {
    backgroundColor: Colors.white, borderRadius: Radius.md, padding: Spacing.lg, marginBottom: Spacing.xl,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  infoIcon: {
    width: 32, height: 32, borderRadius: Radius.sm, backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  infoLabel: { fontSize: 12, color: Colors.textMuted, width: 90 },
  infoValue: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.navy, textAlign: 'right' },
  scheduleCard: {
    backgroundColor: Colors.white, borderRadius: Radius.md, marginBottom: Spacing.xl,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  scheduleRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  scheduleIcon: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
  },
  scheduleText: { flex: 1 },
  scheduleTime: { fontSize: 15, fontWeight: '700', color: Colors.navy },
  scheduleNote: { fontSize: 12, color: Colors.textMuted },
  dailyBadge: {
    backgroundColor: Colors.successLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.full,
  },
  dailyText: { fontSize: 11, color: Colors.success, fontWeight: '700' },
  bottomRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.xl },
  halfCard: {
    flex: 1, backgroundColor: Colors.white, borderRadius: Radius.md, padding: Spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  channelRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  channelLabel: { flex: 1, fontSize: 12, color: Colors.navy },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  daysLeft: { fontSize: 16, fontWeight: '800', color: Colors.primary },
  daysLabel: { fontSize: 9, color: Colors.textMuted },
  progressDetails: { flex: 1, gap: Spacing.sm },
  progressItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  progressText: { fontSize: 10, color: Colors.textSecondary, flex: 1 },
  actionRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.lg },
  editBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: Spacing.lg,
  },
  editBtnText: { fontSize: 14, fontWeight: '700', color: Colors.white },
  pauseBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    backgroundColor: Colors.white, borderRadius: Radius.md, paddingVertical: Spacing.lg,
    borderWidth: 1, borderColor: Colors.error,
  },
  pauseBtnText: { fontSize: 14, fontWeight: '700', color: Colors.error },
  securityBar: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.primaryLight, borderRadius: Radius.md, padding: Spacing.md,
  },
  securityText: { flex: 1, fontSize: 12, color: Colors.primary, fontWeight: '600' },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  missingText: { fontSize: 16, color: Colors.textMuted },
});
