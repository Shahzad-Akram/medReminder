import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppHeader } from '@/components/medi/AppHeader';
import { AppImage } from '@/components/medi/AppLogo';
import { SegmentedControl } from '@/components/medi/SegmentedControl';
import { Colors, Radius, Spacing } from '@/constants/colors';
import { Images } from '@/constants/images';
import { useMediData } from '@/contexts/medi-data-context';

const timeColors: Record<string, string> = {
  morning: Colors.success,
  afternoon: Colors.info,
  evening: Colors.info,
  night: Colors.purple,
};

const timeBgs: Record<string, string> = {
  morning: Colors.successLight,
  afternoon: Colors.blueLight,
  evening: Colors.blueLight,
  night: Colors.purpleLight,
};

export default function RemindersScreen() {
  const [filter, setFilter] = useState(0);
  const [search, setSearch] = useState('');
  const { medicines, loading } = useMediData();

  const filtered = medicines.filter((m) => {
    const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase());
    if (filter === 1) return matchesSearch && m.status === 'active';
    if (filter === 2) return matchesSearch && m.status === 'completed';
    return matchesSearch;
  });

  const activeCount = medicines.filter((m) => m.status === 'active').length;
  const completedCount = medicines.filter((m) => m.status === 'completed').length;

  return (
    <View style={styles.container}>
      <AppHeader />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <View style={styles.titleCol}>
            <Text style={styles.title}>Medicines</Text>
            <Text style={styles.subtitle}>View and manage all your medicines in one place.</Text>
          </View>
          <AppImage source={Images.illustrations.pills} size={80} />
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={20} color={Colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search medicines"
              placeholderTextColor={Colors.textMuted}
              value={search}
              onChangeText={setSearch}
            />
          </View>
          <Pressable style={styles.filterBtn}>
            <Ionicons name="funnel-outline" size={20} color={Colors.primary} />
          </Pressable>
        </View>

        <SegmentedControl
          options={[
            { label: 'All', count: medicines.length },
            { label: 'Active', count: activeCount },
            { label: 'Completed', count: completedCount },
          ]}
          selected={filter}
          onSelect={setFilter}
        />

        <View style={styles.sortRow}>
          <Text style={styles.sortText}>Sort by: Next Reminder ▾</Text>
          <View style={styles.viewToggle}>
            <Text style={styles.sortText}>View as: </Text>
            <Ionicons name="list" size={18} color={Colors.primary} />
            <Ionicons name="grid-outline" size={18} color={Colors.textMuted} />
          </View>
        </View>

        {loading && filtered.length === 0 ? (
          <Text style={styles.emptyText}>Loading medicines…</Text>
        ) : null}

        {!loading && filtered.length === 0 ? (
          <Text style={styles.emptyText}>No medicines found. Tap Add Medicine to get started.</Text>
        ) : null}

        {filtered.map((med) => (
          <Pressable
            key={med.id}
            style={styles.medCard}
            onPress={() => router.push(`/medicine/${med.id}`)}>
            <View style={styles.medIcon}>
              <AppImage source={Images.illustrations.pills} size={40} />
            </View>
            <View style={styles.medInfo}>
              <Text style={styles.medName}>{med.name} {med.strength}</Text>
              <Text style={styles.medDetail}>{med.type} • {med.dosage}</Text>
              <View style={styles.nextRow}>
                <Ionicons name="calendar-outline" size={12} color={timeColors[med.timeOfDay]} />
                <Text style={[styles.nextText, { color: timeColors[med.timeOfDay] }]}>
                  Next: {med.nextReminder}
                </Text>
              </View>
            </View>
            <View style={[
              styles.statusBadge,
              med.daysLeft <= 7 ? styles.statusWarning : styles.statusActive,
            ]}>
              <Text style={[
                styles.statusText,
                med.daysLeft <= 7 ? styles.statusTextWarning : styles.statusTextActive,
              ]}>
                {med.daysLeft <= 7 ? `Ends in ${med.daysLeft} days` : 'Active'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </Pressable>
        ))}

        <View style={styles.securityBanner}>
          <AppImage source={Images.icons.security} size={40} />
          <View style={styles.securityText}>
            <Text style={styles.securityTitle}>Your medicines are safe with us</Text>
            <Text style={styles.securitySub}>All your medicine information is encrypted and stored securely.</Text>
          </View>
        </View>
      </ScrollView>

      <Pressable
        style={styles.fabContainer}
        onPress={() => router.push('/medicine/add')}
        accessibilityRole="button">
        <View style={styles.fab}>
          <Ionicons name="add" size={28} color={Colors.white} />
        </View>
        <Text style={styles.fabLabel}>Add Medicine</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: 120 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg },
  titleCol: { flex: 1, paddingRight: Spacing.md },
  title: { fontSize: 26, fontWeight: '800', color: Colors.navy },
  subtitle: { fontSize: 13, color: Colors.textMuted, marginTop: 4 },
  searchRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.white, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, minHeight: 44,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text },
  filterBtn: {
    width: 44, height: 44, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center',
  },
  sortRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: Spacing.md },
  sortText: { fontSize: 12, color: Colors.textSecondary },
  emptyText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', marginVertical: Spacing.xl },
  viewToggle: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  medCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.white, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  medIcon: {
    width: 48, height: 48, alignItems: 'center', justifyContent: 'center',
  },
  medInfo: { flex: 1 },
  medName: { fontSize: 14, fontWeight: '700', color: Colors.navy },
  medDetail: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  nextText: { fontSize: 11, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.full },
  statusActive: { backgroundColor: Colors.successLight },
  statusWarning: { backgroundColor: Colors.warningLight },
  statusText: { fontSize: 10, fontWeight: '700' },
  statusTextActive: { color: Colors.success },
  statusTextWarning: { color: Colors.warning },
  securityBanner: {
    flexDirection: 'row', gap: Spacing.md, backgroundColor: Colors.infoLight,
    borderRadius: Radius.md, padding: Spacing.lg, marginTop: Spacing.lg,
  },
  securityText: { flex: 1 },
  securityTitle: { fontSize: 13, fontWeight: '700', color: Colors.navy },
  securitySub: { fontSize: 11, color: Colors.textMuted, marginTop: 4 },
  fabContainer: { position: 'absolute', bottom: 80, right: Spacing.xl, alignItems: 'center' },
  fab: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  fabLabel: { fontSize: 11, color: Colors.primary, fontWeight: '600', marginTop: 4 },
});
