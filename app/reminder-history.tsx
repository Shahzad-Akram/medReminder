import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SecurityFooter } from '@/components/medi/SecurityFooter';
import { StatusBadge, getStatusColor } from '@/components/medi/StatusBadge';
import { TealHeader } from '@/components/medi/TealHeader';
import { Colors, Radius, Spacing } from '@/constants/colors';
import { useMediData } from '@/contexts/medi-data-context';

export default function ReminderHistoryScreen() {
  const [dateFilter] = useState('Today');
  const [patientFilter] = useState('All Patients');
  const { reminders } = useMediData();

  const summaryStats = [
    { label: 'Taken', count: reminders.filter((r) => r.status === 'taken').length, color: Colors.success, icon: 'checkmark' as const },
    { label: 'Missed', count: reminders.filter((r) => r.status === 'missed').length, color: Colors.error, icon: 'close' as const },
    { label: 'Snoozed', count: reminders.filter((r) => r.status === 'snoozed').length, color: Colors.warning, icon: 'time' as const },
    { label: 'Skipped', count: reminders.filter((r) => r.status === 'skipped').length, color: Colors.skipped, icon: 'remove' as const },
  ];

  return (
    <View style={styles.container}>
      <TealHeader title="Reminder History" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.filters}>
          <Pressable style={styles.filterBox}>
            <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
            <Text style={styles.filterText}>{dateFilter}</Text>
            <Ionicons name="chevron-down" size={16} color={Colors.textMuted} />
          </Pressable>
          <Pressable style={styles.filterBox}>
            <Ionicons name="people-outline" size={18} color={Colors.primary} />
            <Text style={styles.filterText}>{patientFilter}</Text>
            <Ionicons name="chevron-down" size={16} color={Colors.textMuted} />
          </Pressable>
        </View>

        <View style={styles.summaryCard}>
          {summaryStats.map((stat, i) => (
            <React.Fragment key={stat.label}>
              {i > 0 && <View style={styles.summaryDivider} />}
              <View style={styles.summaryItem}>
                <View style={[styles.summaryIcon, { backgroundColor: stat.color }]}>
                  <Ionicons name={stat.icon} size={16} color={Colors.white} />
                </View>
                <Text style={styles.summaryLabel}>{stat.label}</Text>
                <Text style={[styles.summaryCount, { color: stat.color }]}>{stat.count}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>

        <View style={styles.listHeader}>
          <View style={styles.listHeaderLeft}>
            <Ionicons name="time-outline" size={14} color={Colors.textMuted} />
            <Text style={styles.listHeaderText}>Most recent first</Text>
          </View>
          <Text style={styles.listCount}>{reminders.length} reminders</Text>
        </View>

        <View style={styles.timeline}>
          <View style={styles.timelineLine} />
          {reminders.map((item) => (
            <View key={item.id} style={styles.timelineItem}>
              <View style={[styles.timelineDot, { backgroundColor: getStatusColor(item.status) }]}>
                <Ionicons
                  name={
                    item.status === 'taken' ? 'checkmark' :
                    item.status === 'missed' ? 'close' :
                    item.status === 'snoozed' ? 'time' : 'remove'
                  }
                  size={14}
                  color={Colors.white}
                />
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTime}>{item.time}</Text>
                <Text style={styles.timelineDate}>{item.date}</Text>
                <Text style={styles.timelineMed}>{item.medicine}</Text>
                <Text style={styles.timelinePatient}>{item.patient}</Text>
                <Text style={styles.timelineInstr}>{item.instructions}</Text>
                {item.snoozeDuration && (
                  <Text style={styles.snoozeText}>{item.snoozeDuration}</Text>
                )}
              </View>
              <StatusBadge status={item.status} size="md" />
            </View>
          ))}
        </View>

        <SecurityFooter />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
  filters: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.lg },
  filterBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.white, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
  },
  filterText: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.navy },
  summaryCard: {
    flexDirection: 'row', backgroundColor: Colors.white, borderRadius: Radius.md, padding: Spacing.lg,
    marginBottom: Spacing.xl, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryDivider: { width: 1, backgroundColor: Colors.border },
  summaryIcon: {
    width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm,
  },
  summaryLabel: { fontSize: 11, color: Colors.textMuted },
  summaryCount: { fontSize: 22, fontWeight: '800', marginTop: 4 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.lg },
  listHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  listHeaderText: { fontSize: 12, color: Colors.textMuted },
  listCount: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  timeline: { position: 'relative' },
  timelineLine: {
    position: 'absolute', left: 15, top: 0, bottom: 0, width: 2, backgroundColor: Colors.border,
  },
  timelineItem: {
    flexDirection: 'row', gap: Spacing.md, paddingBottom: Spacing.lg, borderBottomWidth: 1,
    borderBottomColor: Colors.border, marginBottom: Spacing.md,
  },
  timelineDot: {
    width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', zIndex: 1,
  },
  timelineContent: { flex: 1 },
  timelineTime: { fontSize: 12, color: Colors.textMuted },
  timelineDate: { fontSize: 11, color: Colors.textMuted },
  timelineMed: { fontSize: 14, fontWeight: '700', color: Colors.navy, marginTop: 4 },
  timelinePatient: { fontSize: 13, color: Colors.navy },
  timelineInstr: { fontSize: 11, color: Colors.textMuted },
  snoozeText: { fontSize: 11, color: Colors.warning, marginTop: 4 },
});
