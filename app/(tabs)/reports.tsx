import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ProgressRing } from '@/components/medi/ProgressRing';
import { AppImage } from '@/components/medi/AppLogo';
import { PatientAvatar } from '@/components/medi/PatientAvatar';
import { StatusBadge } from '@/components/medi/StatusBadge';
import { TealHeader } from '@/components/medi/TealHeader';
import { Colors, Radius, Spacing } from '@/constants/colors';
import { Images } from '@/constants/images';
import { SegmentedControl } from '@/components/medi/SegmentedControl';
import { useMediData } from '@/contexts/medi-data-context';

export default function ReportsScreen() {
  const { patients, reminders, loading } = useMediData();
  const [patientIndex, setPatientIndex] = useState(0);
  const selectedPatientId = patientIndex === 0 ? null : patients[patientIndex - 1]?.id;

  const filteredReminders = useMemo(() => {
    if (!selectedPatientId) return reminders;
    return reminders.filter((r) => r.patientId === selectedPatientId);
  }, [reminders, selectedPatientId]);

  const stats = useMemo(() => {
    const scheduled = filteredReminders.length;
    const taken = filteredReminders.filter((r) => r.status === 'taken').length;
    const missed = filteredReminders.filter((r) => r.status === 'missed').length;
    const late = filteredReminders.filter((r) => r.status === 'late').length;
    const skipped = filteredReminders.filter((r) => r.status === 'skipped').length;
    const adherence = scheduled > 0 ? Math.round((taken / scheduled) * 100) : 0;
    return { scheduled, taken, missed, late, skipped, adherence };
  }, [filteredReminders]);

  const recentHistory = useMemo(() => filteredReminders.slice(0, 20), [filteredReminders]);

  return (
    <View style={styles.container}>
      <TealHeader title="Reports" rightIcon="share-outline" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <PatientAvatar size={48} />
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>Reports</Text>
            <Text style={styles.profileDetail}>
              {selectedPatientId
                ? `For ${patients.find((p) => p.id === selectedPatientId)?.name ?? 'Patient'}`
                : 'All patients'}
            </Text>
          </View>
        </View>

        <SegmentedControl
          options={[{ label: 'All' }, ...patients.map((p) => ({ label: p.name }))]}
          selected={patientIndex}
          onSelect={setPatientIndex}
        />

        <Text style={styles.sectionTitle}>Adherence Summary</Text>
        <View style={styles.summaryCard}>
          <ProgressRing percent={stats.adherence} size={100}>
            <View style={styles.ringCenter}>
              <Text style={styles.ringPercent}>{stats.adherence}%</Text>
              <Text style={styles.ringLabel}>Adherence</Text>
            </View>
          </ProgressRing>
          <View style={styles.summaryText}>
            <Text style={styles.summaryTitle}>
              {loading ? 'Loading…' : stats.adherence >= 80 ? 'Great job! You’re on track.' : 'Keep going — you can improve.'}
            </Text>
            <Text style={styles.summarySub}>
              {loading ? '—' : `You took ${stats.taken} of ${stats.scheduled} scheduled reminders.`}
            </Text>
          </View>
          <View style={styles.statsRow}>
            {[
              { value: String(stats.scheduled), label: 'Scheduled', color: Colors.info },
              { value: String(stats.taken), label: 'Taken', color: Colors.primary },
              { value: String(stats.missed), label: 'Missed', color: Colors.warning },
              { value: String(stats.late), label: 'Late', color: Colors.purple },
            ].map((stat, i) => (
              <React.Fragment key={stat.label}>
                {i > 0 && <View style={styles.statDivider} />}
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        </View>

        <View style={styles.historyHeader}>
          <Text style={styles.sectionTitle}>History</Text>
          <Text style={styles.filterText}>{stats.scheduled} reminders</Text>
        </View>

        <View style={styles.historyCard}>
          {recentHistory.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Text style={styles.historyInstr}>No reminders yet.</Text>
            </View>
          ) : (
            recentHistory.map((item, index) => (
              <View
                key={item.id}
                style={[styles.historyItem, index < recentHistory.length - 1 && styles.historyBorder]}>
                <StatusBadge status={item.status} size="md" />
                <View style={styles.historyInfo}>
                  <Text style={styles.historyMed}>{item.medicine}</Text>
                  <Text style={styles.historyInstr}>{item.instructions}</Text>
                  <Text style={styles.historyInstr}>{item.patient}</Text>
                </View>
                <View style={styles.historyRight}>
                  <StatusBadge status={item.status} />
                  <Text style={styles.historyTime}>{item.time}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.privacyCard}>
          <AppImage source={Images.icons.security} size={32} />
          <View style={styles.privacyText}>
            <Text style={styles.privacyTitle}>Your health data is private and secure.</Text>
            <Text style={styles.privacySub}>Only you and your care team can view your reports.</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.white, borderRadius: Radius.md, padding: Spacing.lg, marginBottom: Spacing.xl,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  profileName: { fontSize: 16, fontWeight: '700', color: Colors.navy },
  profileDetail: { fontSize: 12, color: Colors.textMuted },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.navy, marginBottom: Spacing.md },
  summaryCard: {
    backgroundColor: Colors.white, borderRadius: Radius.md, padding: Spacing.lg, marginBottom: Spacing.xl,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  ringCenter: { alignItems: 'center' },
  ringPercent: { fontSize: 20, fontWeight: '800', color: Colors.primary },
  ringLabel: { fontSize: 10, color: Colors.textMuted },
  summaryText: { marginTop: Spacing.md, marginBottom: Spacing.lg },
  summaryTitle: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  summarySub: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  statItem: { alignItems: 'center', flex: 1 },
  statDivider: { width: 1, height: 30, backgroundColor: Colors.border },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 11, color: Colors.textMuted },
  weeklyCard: {
    backgroundColor: Colors.white, borderRadius: Radius.md, padding: Spacing.lg, marginBottom: Spacing.xl,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  weeklyRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCol: { alignItems: 'center', gap: 4 },
  dayLabel: { fontSize: 11, color: Colors.textMuted },
  dayPercent: { fontWeight: '700' },
  dayFraction: { fontSize: 9, color: Colors.textMuted },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginTop: Spacing.lg, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, color: Colors.textMuted },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  filterText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  emptyHistory: { padding: Spacing.lg },
  historyCard: {
    backgroundColor: Colors.white, borderRadius: Radius.md, marginBottom: Spacing.xl,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  historyItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg },
  historyBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  historyInfo: { flex: 1 },
  historyMed: { fontSize: 14, fontWeight: '700', color: Colors.navy },
  historyInstr: { fontSize: 11, color: Colors.textMuted },
  historyRight: { alignItems: 'flex-end', gap: 4 },
  historyTime: { fontSize: 11, color: Colors.textMuted },
  privacyCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.white, borderRadius: Radius.md, padding: Spacing.lg,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  privacyText: { flex: 1 },
  privacyTitle: { fontSize: 13, fontWeight: '700', color: Colors.navy },
  privacySub: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
});
