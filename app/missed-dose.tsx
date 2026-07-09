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

import { SecurityFooter } from '@/components/medi/SecurityFooter';
import { AppImage } from '@/components/medi/AppLogo';
import { PatientAvatar } from '@/components/medi/PatientAvatar';
import { TealHeader } from '@/components/medi/TealHeader';
import { Colors, Radius, Spacing } from '@/constants/colors';
import { Images } from '@/constants/images';

const detailRows = [
  { icon: 'medical' as const, label: 'Medicine', value: 'Metformin 500mg', iconBg: Colors.primaryLight },
  { icon: 'time' as const, label: 'Scheduled Time', value: 'Today, May 20, 2025 at 08:00 AM', iconBg: Colors.primaryLight },
  { icon: 'calendar' as const, label: 'Status', value: 'Not confirmed', iconBg: Colors.warningLight, valueColor: Colors.warning, badge: 'Missed' },
];

export default function MissedDoseScreen() {
  return (
    <View style={styles.container}>
      <TealHeader title="" showLogo rightIcon="help-circle-outline" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.alertCard}>
          <View style={styles.alertIconWrap}>
            <Ionicons name="notifications" size={36} color={Colors.warning} />
            <View style={styles.alertBadge}>
              <Ionicons name="alert" size={12} color={Colors.white} />
            </View>
          </View>
          <View style={styles.alertText}>
            <Text style={styles.alertTitle}>Missed Dose Alert</Text>
            <Text style={styles.alertDesc}>A scheduled medicine dose was missed.</Text>
            <Text style={styles.alertAction}>Please review and take action.</Text>
          </View>
        </View>

        <View style={styles.detailsCard}>
          <View style={styles.detailsHeader}>
            <Text style={styles.detailsTitle}>Alert Details</Text>
            <Ionicons name="information-circle" size={22} color={Colors.primary} />
          </View>

          <View style={styles.patientRow}>
            <PatientAvatar size={48} />
            <View>
              <Text style={styles.patientName}>Sarah Johnson</Text>
              <Text style={styles.patientId}>Patient ID: PT-10028</Text>
            </View>
          </View>

          {detailRows.map((row) => (
            <Pressable key={row.label} style={styles.detailRow}>
              <View style={[styles.detailIcon, { backgroundColor: row.iconBg }]}>
                <Ionicons name={row.icon} size={20} color={Colors.primary} />
              </View>
              <View style={styles.detailText}>
                <Text style={styles.detailLabel}>{row.label}</Text>
                <Text style={[styles.detailValue, row.valueColor && { color: row.valueColor }]}>{row.value}</Text>
              </View>
              {row.badge ? (
                <View style={styles.missedBadge}>
                  <Text style={styles.missedBadgeText}>{row.badge}</Text>
                </View>
              ) : (
                <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
              )}
            </Pressable>
          ))}

          <View style={styles.recommendBox}>
            <View style={styles.recommendIcon}>
              <Ionicons name="bulb" size={20} color={Colors.primary} />
            </View>
            <View style={styles.recommendText}>
              <Text style={styles.recommendTitle}>Recommended Next Action</Text>
              <Text style={styles.recommendDesc}>
                Contact the patient to confirm the missed dose and advise on the next steps.
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.attemptsTitle}>Reminder Attempts</Text>
        <Text style={styles.attemptsSub}>We&apos;ve sent reminders through the following channels:</Text>

        <View style={styles.channelsRow}>
          {[
            { icon: 'chatbubble' as const, label: 'SMS', time: '08:05 AM' },
            { image: Images.icons.whatsapp, label: 'WhatsApp', time: '08:05 AM' },
          ].map((ch) => (
            <View key={ch.label} style={styles.channelCard}>
              {'image' in ch && ch.image ? (
                <AppImage source={ch.image} size={28} />
              ) : (
                <Ionicons name={ch.icon!} size={24} color={Colors.primary} />
              )}
              <Text style={styles.channelLabel}>{ch.label}</Text>
              <View style={styles.channelCheck}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                <Text style={styles.channelTime}>{ch.time}</Text>
              </View>
            </View>
          ))}
        </View>

        <Pressable style={styles.outlineBtn} accessibilityRole="button">
          <Ionicons name="call" size={20} color={Colors.navy} />
          <Text style={styles.outlineBtnText}>Call Patient</Text>
        </Pressable>

        <Pressable style={styles.primaryBtn} accessibilityRole="button">
          <Ionicons name="paper-plane" size={20} color={Colors.white} />
          <Text style={styles.primaryBtnText}>Send Reminder Again</Text>
        </Pressable>

        <Pressable style={styles.outlineBtn} onPress={() => router.back()} accessibilityRole="button">
          <Ionicons name="checkmark-circle-outline" size={20} color={Colors.navy} />
          <Text style={styles.outlineBtnText}>Mark as Resolved</Text>
        </Pressable>

        <SecurityFooter
          text="Your actions are logged for patient safety and compliance. All data is secure and HIPAA-aligned."
          subtext=""
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
  alertCard: {
    flexDirection: 'row', gap: Spacing.lg, backgroundColor: '#FFF5EB',
    borderRadius: Radius.md, padding: Spacing.lg, marginBottom: Spacing.lg,
  },
  alertIconWrap: { position: 'relative' },
  alertBadge: {
    position: 'absolute', bottom: 0, right: 0, width: 20, height: 20, borderRadius: 10,
    backgroundColor: Colors.warning, alignItems: 'center', justifyContent: 'center',
  },
  alertText: { flex: 1 },
  alertTitle: { fontSize: 18, fontWeight: '800', color: Colors.navy },
  alertDesc: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  alertAction: { fontSize: 12, color: Colors.info, marginTop: 4 },
  detailsCard: {
    backgroundColor: Colors.white, borderRadius: Radius.md, padding: Spacing.lg,
    borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.xl,
  },
  detailsHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.lg },
  detailsTitle: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  patientRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.lg },
  patientAvatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  patientName: { fontSize: 15, fontWeight: '700', color: Colors.navy },
  patientId: { fontSize: 12, color: Colors.textMuted },
  detailRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingVertical: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  detailIcon: {
    width: 40, height: 40, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center',
  },
  detailText: { flex: 1 },
  detailLabel: { fontSize: 11, color: Colors.textMuted },
  detailValue: { fontSize: 14, fontWeight: '700', color: Colors.navy, marginTop: 2 },
  missedBadge: {
    backgroundColor: Colors.warningLight, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.full,
  },
  missedBadgeText: { fontSize: 11, color: Colors.warning, fontWeight: '700' },
  recommendBox: {
    flexDirection: 'row', gap: Spacing.md, backgroundColor: Colors.primaryLight,
    borderRadius: Radius.md, padding: Spacing.lg, marginTop: Spacing.md,
  },
  recommendIcon: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.white,
    alignItems: 'center', justifyContent: 'center',
  },
  recommendText: { flex: 1 },
  recommendTitle: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  recommendDesc: { fontSize: 12, color: Colors.textSecondary, marginTop: 4, lineHeight: 18 },
  attemptsTitle: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  attemptsSub: { fontSize: 12, color: Colors.textMuted, marginBottom: Spacing.md },
  channelsRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.xl },
  channelCard: {
    flex: 1, backgroundColor: Colors.white, borderRadius: Radius.md, padding: Spacing.lg,
    borderWidth: 1, borderColor: Colors.border, alignItems: 'center', gap: Spacing.sm,
  },
  channelLabel: { fontSize: 13, fontWeight: '600', color: Colors.navy },
  channelCheck: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  channelTime: { fontSize: 11, color: Colors.textMuted },
  outlineBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    borderWidth: 1, borderColor: Colors.navy, borderRadius: Radius.md, paddingVertical: Spacing.lg, marginBottom: Spacing.md,
  },
  outlineBtnText: { fontSize: 15, fontWeight: '600', color: Colors.navy },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: Spacing.lg, marginBottom: Spacing.md,
  },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: Colors.white },
});
