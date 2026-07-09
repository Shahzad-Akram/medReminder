import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppLogo } from '@/components/medi/AppLogo';
import { Colors, Radius, Spacing } from '@/constants/colors';
import { useMediData } from '@/contexts/medi-data-context';
import { scheduleSnoozeNotification } from '@/lib/notifications';

const actionButtons = [
  {
    key: 'taken',
    title: 'Taken',
    subtitle: 'I have taken this medicine',
    icon: 'checkmark-circle' as const,
    bg: Colors.primary,
    textColor: Colors.white,
    subColor: 'rgba(255,255,255,0.8)',
    iconBg: 'rgba(255,255,255,0.2)',
  },
  {
    key: 'snooze',
    title: 'Snooze',
    subtitle: 'Remind me again in 15 minutes',
    icon: 'time' as const,
    bg: Colors.info,
    textColor: Colors.white,
    subColor: 'rgba(255,255,255,0.8)',
    iconBg: 'rgba(255,255,255,0.2)',
  },
  {
    key: 'skip',
    title: 'Skip',
    subtitle: 'Skip this reminder',
    icon: 'close-circle' as const,
    bg: Colors.skippedLight,
    textColor: Colors.textSecondary,
    subColor: Colors.textMuted,
    iconBg: Colors.border,
  },
];

const parseReminderDueAt = (dateLabel: string, timeLabel: string) => {
  const date = new Date(dateLabel);
  if (Number.isNaN(date.getTime())) return null;

  const match = timeLabel.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = match[3].toUpperCase();
  if (period === 'PM' && hour < 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;

  const due = new Date(date);
  due.setHours(hour, minute, 0, 0);
  return due;
};

export default function ActiveReminderScreen() {
  const insets = useSafeAreaInsets();
  const { reminderId } = useLocalSearchParams<{ reminderId?: string }>();
  const { getReminderById, getPatientById, getMedicineById, updateReminderStatus } = useMediData();

  const reminder = reminderId ? getReminderById(reminderId) : undefined;
  const patient = reminder?.patientId ? getPatientById(reminder.patientId) : undefined;
  const medicine = reminder?.medicineId ? getMedicineById(reminder.medicineId) : undefined;

  // Alarm disabled for now (no sound/vibration). Keep rest of reminder actions.
  const soundRef = useRef<null>(null);

  // After the first snooze we should NOT ring alarm again (only notification will fire).
  const dueAt = reminder ? parseReminderDueAt(reminder.date, reminder.time) : null;
  const isDueNow = dueAt ? Date.now() >= dueAt.getTime() : true;
  const canAlarm = Boolean(
    reminder &&
      reminder.status !== 'taken' &&
      reminder.status !== 'skipped' &&
      reminder.status !== 'missed' &&
      reminder.status !== 'snoozed' &&
      isDueNow,
  );
  const medicineLabel = reminder?.medicine ?? 'Medicine';
  const patientLabel = patient?.name ?? reminder?.patient ?? 'Patient';

  const frequencyLabel = useMemo(() => medicine?.frequency ?? 'Daily', [medicine?.frequency]);
  const dosageLabel = useMemo(() => medicine?.dosage ?? '—', [medicine?.dosage]);

  const stopAlarm = async () => {
    return;
  };

  const startAlarm = async () => {
    return;
  };

  useEffect(() => {
    if (!canAlarm) {
      void stopAlarm();
      return;
    }

    void startAlarm();
    return () => {
      void stopAlarm();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reminderId, canAlarm]);

  const handleMarkTaken = async () => {
    if (!reminder) {
      router.back();
      return;
    }

    try {
      await stopAlarm();
      await updateReminderStatus(reminder.id, 'taken');
      router.back();
    } catch {
      router.back();
    }
  };

  const handleSkip = async () => {
    if (!reminder) {
      router.back();
      return;
    }

    try {
      await stopAlarm();
      await updateReminderStatus(reminder.id, 'skipped');
      router.back();
    } catch {
      router.back();
    }
  };

  const handleSnooze = async () => {
    if (!reminder) {
      router.back();
      return;
    }

    try {
      await stopAlarm();
      await updateReminderStatus(reminder.id, 'snoozed', { snoozeDuration: '15 minutes' });
      await scheduleSnoozeNotification({
        reminderId: reminder.id,
        medicineLabel,
        patientName: patientLabel,
        minutes: 15,
      });
      router.back();
    } catch {
      router.back();
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="menu" size={24} color={Colors.white} />
        </Pressable>
        <AppLogo onDark size="teal" />
        <Pressable onPress={() => router.push('/notifications')} style={styles.headerBtn}>
          <Ionicons name="notifications-outline" size={24} color={Colors.white} />
          <View style={styles.badge}>
            <Text style={styles.badgeText}>1</Text>
          </View>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {!reminder ? (
          <View style={styles.reminderCard}>
            <View style={styles.activeHeader}>
              <View style={styles.activeLine} />
              <Ionicons name="alert-circle" size={16} color={Colors.primary} />
              <Text style={styles.activeLabel}>REMINDER</Text>
              <View style={styles.activeLine} />
            </View>
            <Text style={styles.timeToTake}>Reminder not found</Text>
            <Text style={styles.instrText}>Go back and open a reminder again.</Text>
          </View>
        ) : null}

        <View style={styles.greetingRow}>
          <View>
            <Text style={styles.greetingSmall}>Good morning,</Text>
            <Text style={styles.greetingName}>{patient?.name ?? reminder?.patient ?? '—'}</Text>
            {patient?.patientId ? (
              <View style={styles.patientIdBadge}>
                <Ionicons name="person" size={12} color={Colors.primary} />
                <Text style={styles.patientId}>Patient ID: {patient.patientId}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.timeCol}>
            <Text style={styles.currentTime}>{reminder?.time ?? '—'}</Text>
            <Text style={styles.currentDate}>{reminder?.date ?? ''}</Text>
          </View>
        </View>

        <View style={styles.patientCard}>
          <View style={styles.patientCardHeader}>
            <View style={styles.patientCardLeft}>
              <View style={styles.patientCardIcon}>
                <Ionicons name="person-circle" size={22} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.patientCardTitle}>Patient</Text>
                <Text style={styles.patientCardName}>{patient?.name ?? reminder?.patient ?? '—'}</Text>
              </View>
            </View>

            {patient ? (
              <Pressable
                style={styles.patientCardLink}
                onPress={() => router.push({ pathname: '/patient/[id]', params: { id: patient.id } })}
                accessibilityRole="button"
                accessibilityLabel="Open patient details">
                <Text style={styles.patientCardLinkText}>View</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
              </Pressable>
            ) : null}
          </View>

          <View style={styles.patientMetaRow}>
            <View style={styles.patientMetaItem}>
              <Ionicons name="heart" size={14} color={Colors.textMuted} />
              <Text style={styles.patientMetaText}>{patient?.relationship ?? '—'}</Text>
            </View>
            {patient?.phone ? (
              <View style={styles.patientMetaItem}>
                <Ionicons name="call-outline" size={14} color={Colors.textMuted} />
                <Text style={styles.patientMetaText}>{patient.phone}</Text>
              </View>
            ) : null}
            {patient?.email ? (
              <View style={styles.patientMetaItem}>
                <Ionicons name="mail-outline" size={14} color={Colors.textMuted} />
                <Text style={styles.patientMetaText}>{patient.email}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.reminderCard}>
          <View style={styles.activeHeader}>
            <View style={styles.activeLine} />
            <Ionicons name="alarm" size={16} color={Colors.primary} />
            <Text style={styles.activeLabel}>ACTIVE REMINDER</Text>
            <View style={styles.activeLine} />
          </View>

          <Text style={styles.timeToTake}>Time to take</Text>
          <Text style={styles.medicineName}>{reminder?.medicine ?? '—'}</Text>

          <View style={styles.detailsBox}>
            {[
              { icon: 'medical' as const, label: 'Dosage', value: dosageLabel },
              { icon: 'time' as const, label: 'Scheduled Time', value: reminder?.time ?? '—' },
              { icon: 'refresh' as const, label: 'Frequency', value: frequencyLabel },
            ].map((d) => (
              <View key={d.label} style={styles.detailCol}>
                <Ionicons name={d.icon} size={18} color={Colors.primary} />
                <Text style={styles.detailLabel}>{d.label}</Text>
                <Text style={styles.detailValue}>{d.value}</Text>
              </View>
            ))}
          </View>

          <View style={styles.instructionBox}>
            <View style={styles.instrIcon}>
              <Ionicons name="document-text" size={20} color={Colors.primary} />
            </View>
            <View>
              <Text style={styles.instrLabel}>INSTRUCTION</Text>
              <Text style={styles.instrText}>{reminder?.instructions ?? medicine?.instructions ?? '—'}</Text>
            </View>
          </View>
        </View>

        {actionButtons.map((btn) => (
          <Pressable
            key={btn.key}
            style={[styles.actionBtn, { backgroundColor: btn.bg }]}
            onPress={() => {
              if (btn.key === 'taken') {
                void handleMarkTaken();
                return;
              }
              if (btn.key === 'skip') {
                void handleSkip();
                return;
              }
              if (btn.key === 'snooze') {
                void handleSnooze();
              }
            }}
            accessibilityRole="button">
            <View style={[styles.actionIcon, { backgroundColor: btn.iconBg }]}>
              <Ionicons name={btn.icon} size={24} color={btn.textColor} />
            </View>
            <View style={styles.actionText}>
              <Text style={[styles.actionTitle, { color: btn.textColor }]}>{btn.title}</Text>
              <Text style={[styles.actionSub, { color: btn.subColor }]}>{btn.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={btn.textColor} />
          </Pressable>
        ))}

        <View style={styles.footerNote}>
          <Ionicons name="paper-plane" size={16} color={Colors.primary} />
          <Text style={styles.footerText}>
            Reminder sent via <Text style={styles.footerBold}>SMS</Text> and{' '}
            <Text style={styles.footerBold}>WhatsApp</Text>
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute', top: 4, right: 4, backgroundColor: Colors.error,
    borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { color: Colors.white, fontSize: 9, fontWeight: '700' },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
  greetingRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xl },
  greetingSmall: { fontSize: 13, color: Colors.textMuted },
  greetingName: { fontSize: 24, fontWeight: '800', color: Colors.primary },
  patientIdBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Spacing.sm,
    backgroundColor: Colors.primaryLight, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.full, alignSelf: 'flex-start',
  },
  patientId: { fontSize: 11, color: Colors.primary, fontWeight: '600' },
  timeCol: { alignItems: 'flex-end' },
  currentTime: { fontSize: 24, fontWeight: '800', color: Colors.primary },
  currentDate: { fontSize: 12, color: Colors.textMuted },
  patientCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  patientCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  patientCardLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  patientCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  patientCardTitle: { fontSize: 11, color: Colors.textMuted, fontWeight: '700' },
  patientCardName: { fontSize: 15, color: Colors.navy, fontWeight: '800', marginTop: 2 },
  patientCardLink: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 6, paddingVertical: 6 },
  patientCardLinkText: { fontSize: 13, fontWeight: '800', color: Colors.primary },
  patientMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: Spacing.md },
  patientMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  patientMetaText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
  reminderCard: {
    backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.xl, marginBottom: Spacing.lg,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5,
  },
  activeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, marginBottom: Spacing.lg },
  activeLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  activeLabel: { fontSize: 11, fontWeight: '700', color: Colors.primary, letterSpacing: 1 },
  timeToTake: { fontSize: 13, color: Colors.textMuted, textAlign: 'center' },
  medicineName: { fontSize: 28, fontWeight: '800', color: Colors.primary, textAlign: 'center', marginBottom: Spacing.lg },
  detailsBox: {
    flexDirection: 'row', backgroundColor: Colors.infoLight, borderRadius: Radius.md,
    padding: Spacing.lg, marginBottom: Spacing.md,
  },
  detailCol: { flex: 1, alignItems: 'center', gap: 4 },
  detailLabel: { fontSize: 10, color: Colors.textMuted },
  detailValue: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  instructionBox: {
    flexDirection: 'row', gap: Spacing.md, backgroundColor: Colors.infoLight,
    borderRadius: Radius.md, padding: Spacing.lg,
  },
  instrIcon: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.white,
    alignItems: 'center', justifyContent: 'center',
  },
  instrLabel: { fontSize: 10, fontWeight: '700', color: Colors.primary, letterSpacing: 0.5 },
  instrText: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    borderRadius: Radius.md, padding: Spacing.lg, marginBottom: Spacing.md,
  },
  actionIcon: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
  },
  actionText: { flex: 1 },
  actionTitle: { fontSize: 16, fontWeight: '700' },
  actionSub: { fontSize: 12, marginTop: 2 },
  footerNote: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    backgroundColor: Colors.skippedLight, borderRadius: Radius.full, padding: Spacing.md, marginTop: Spacing.md,
  },
  footerText: { fontSize: 12, color: Colors.textSecondary },
  footerBold: { fontWeight: '700', color: Colors.primary },
});
