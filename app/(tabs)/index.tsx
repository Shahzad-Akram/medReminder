import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppHeader } from '@/components/medi/AppHeader';
import { AppImage } from '@/components/medi/AppLogo';
import { PatientAvatar } from '@/components/medi/PatientAvatar';
import { ProgressRing } from '@/components/medi/ProgressRing';
import { StatusBadge } from '@/components/medi/StatusBadge';
import { Colors, Radius, Spacing } from '@/constants/colors';
import { Images } from '@/constants/images';
import { useAuth } from '@/contexts/auth-context';
import { useMediData } from '@/contexts/medi-data-context';

const timeIconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
  sunny: 'sunny',
  'partly-sunny': 'partly-sunny',
  moon: 'moon',
};

export default function HomeScreen() {
  const { user } = useAuth();
  const { todayReminders, medicines, patients, loading } = useMediData();
  const displayName = user?.displayName?.split(' ')[0] ?? 'there';
  const takenCount = todayReminders.filter((r) => r.status === 'taken').length;
  const totalCount = todayReminders.length || medicines.length;
  const adherence = totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 0;
  const homePatients = patients.slice(0, 3);

  return (
    <View style={styles.container}>
      <AppHeader notificationCount={1} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.greetingRow}>
          <View>
            <Text style={styles.greeting}>Good Morning, {displayName}</Text>
            <Text style={styles.greetingSub}>Stay on track. Stay healthy.</Text>
          </View>
          <View style={styles.dateCol}>
            <View style={styles.dateRow}>
              <Ionicons name="calendar-outline" size={14} color={Colors.textMuted} />
              <Text style={styles.dateText}>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
            </View>
            <Text style={styles.dayText}>{new Date().toLocaleDateString('en-US', { weekday: 'long' })}</Text>
          </View>
        </View>

        <View style={styles.adherenceCard}>
          <Text style={styles.cardTitle}>Today&apos;s Adherence</Text>
          <View style={styles.adherenceRow}>
            <View>
              <Text style={styles.adherencePercent}>{loading ? '—' : `${adherence}%`}</Text>
              <Text style={styles.adherenceSub}>{takenCount} of {totalCount || 0} taken</Text>
            </View>
            <ProgressRing percent={adherence} size={90}>
              <AppImage source={Images.icons.security} size={36} />
            </ProgressRing>
            <View style={styles.statsCol}>
              {[
                { icon: 'medical' as const, label: `${totalCount} Total Medications` },
                { icon: 'checkmark-circle' as const, label: `${takenCount} Taken` },
                { icon: 'hourglass' as const, label: `${Math.max(totalCount - takenCount, 0)} Upcoming` },
              ].map((s) => (
                <View key={s.label} style={styles.statRow}>
                  <View style={styles.statIcon}>
                    <Ionicons name={s.icon} size={14} color={Colors.info} />
                  </View>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today&apos;s Reminders</Text>
          <Pressable onPress={() => router.push('/reminder-history')}>
            <Text style={styles.viewAll}>View all ›</Text>
          </Pressable>
        </View>

        {todayReminders.map((reminder) => (
          <Pressable
            key={reminder.id}
            style={styles.reminderCard}
            onPress={() =>
              router.push({ pathname: '/active-reminder', params: { reminderId: reminder.id } })
            }>
            <View style={[styles.timeIcon, reminder.status === 'taken' && styles.timeIconTaken]}>
              <Ionicons
                name={(timeIconMap[reminder.icon ?? 'sunny'] ?? 'sunny') as keyof typeof Ionicons.glyphMap}
                size={20}
                color={reminder.status === 'taken' ? Colors.success : Colors.info}
              />
            </View>
            <View style={styles.reminderInfo}>
              <Text style={styles.reminderTime}>{reminder.time}</Text>
              <Text style={styles.reminderMed}>{reminder.medicine}</Text>
              <Text style={styles.reminderInstr}>{reminder.instructions}</Text>
            </View>
            <StatusBadge status={reminder.status} />
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </Pressable>
        ))}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Patients</Text>
          <Pressable onPress={() => router.push('/(tabs)/patients')}>
            <Text style={styles.viewAll}>View all ›</Text>
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.patientsScroll}>
          {homePatients.map((patient) => (
            <Pressable
              key={patient.id}
              style={styles.patientCard}
              onPress={() => router.push({ pathname: '/patient/[id]', params: { id: patient.id } })}>
              <PatientAvatar size={48} />
              <Text style={styles.patientName}>{patient.name}</Text>
              <Text style={styles.patientDue}>{patient.dueToday} due today</Text>
              <Text style={styles.patientAdherence}>{patient.adherence}% adherence</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} style={styles.patientChevron} />
            </Pressable>
          ))}
        </ScrollView>

        <Text style={[styles.sectionTitle, { marginTop: Spacing.xl }]}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {[
            { icon: 'add-circle' as const, title: 'Add Reminder', sub: 'New medication', color: Colors.primary, route: '/medicine/add' },
            { icon: 'people' as const, title: 'Add Patient', sub: 'New patient', color: Colors.info, route: '/(tabs)/patients' },
          ].map((action) => (
            <Pressable
              key={action.title}
              style={styles.actionCard}
              onPress={() => router.push(action.route as never)}
              accessibilityRole="button"
              accessibilityLabel={action.title}>
              <View style={[styles.actionIcon, { backgroundColor: action.color }]}>
                <Ionicons name={action.icon} size={22} color={Colors.white} />
              </View>
              <Text style={styles.actionTitle}>{action.title}</Text>
              <Text style={styles.actionSub}>{action.sub}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
  greetingRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.lg },
  greeting: { fontSize: 22, fontWeight: '800', color: Colors.navy },
  greetingSub: { fontSize: 13, color: Colors.textMuted, marginTop: 4 },
  dateCol: { alignItems: 'flex-end' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText: { fontSize: 12, color: Colors.textMuted },
  dayText: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  adherenceCard: {
    backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.xl,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: Colors.primary, marginBottom: Spacing.md },
  adherenceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  adherencePercent: { fontSize: 32, fontWeight: '800', color: Colors.primary },
  adherenceSub: { fontSize: 12, color: Colors.textMuted },
  statsCol: { gap: Spacing.sm },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  statIcon: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.infoLight,
    alignItems: 'center', justifyContent: 'center',
  },
  statLabel: { fontSize: 11, color: Colors.textSecondary },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.navy },
  viewAll: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  reminderCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.white, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  timeIcon: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.infoLight,
    alignItems: 'center', justifyContent: 'center',
  },
  timeIconTaken: { backgroundColor: Colors.successLight },
  reminderInfo: { flex: 1 },
  reminderTime: { fontSize: 12, color: Colors.textMuted },
  reminderMed: { fontSize: 14, fontWeight: '700', color: Colors.navy },
  reminderInstr: { fontSize: 11, color: Colors.textMuted },
  patientsScroll: { marginBottom: Spacing.lg },
  patientCard: {
    width: 140, backgroundColor: Colors.white, borderRadius: Radius.md, padding: Spacing.md,
    marginRight: Spacing.md, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  patientAvatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm,
  },
  patientName: { fontSize: 13, fontWeight: '700', color: Colors.navy },
  patientDue: { fontSize: 11, color: Colors.textMuted, marginTop: 4 },
  patientAdherence: { fontSize: 11, color: Colors.primary, marginTop: 2 },
  patientChevron: { position: 'absolute', right: 8, top: 8 },
  actionsGrid: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md },
  actionCard: {
    flex: 1, backgroundColor: Colors.white, borderRadius: Radius.md, padding: Spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  actionIcon: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm,
  },
  actionTitle: { fontSize: 13, fontWeight: '700', color: Colors.navy },
  actionSub: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
});
