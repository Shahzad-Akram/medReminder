import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/colors';
import type { ReminderStatus } from '@/constants/mock-data';

const statusConfig: Record<
  ReminderStatus,
  { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  taken: { label: 'Taken', color: Colors.success, bg: Colors.successLight, icon: 'checkmark-circle' },
  missed: { label: 'Missed', color: Colors.error, bg: Colors.errorLight, icon: 'close-circle' },
  snoozed: { label: 'Snoozed', color: Colors.warning, bg: Colors.warningLight, icon: 'time' },
  skipped: { label: 'Skipped', color: Colors.skipped, bg: Colors.skippedLight, icon: 'remove-circle' },
  upcoming: { label: 'Upcoming', color: Colors.info, bg: Colors.infoLight, icon: 'time-outline' },
  late: { label: 'Late', color: Colors.warning, bg: Colors.warningLight, icon: 'time' },
};

interface StatusBadgeProps {
  status: ReminderStatus | string;
  size?: 'sm' | 'md';
}

export const StatusBadge = ({ status, size = 'sm' }: StatusBadgeProps) => {
  const config = statusConfig[status as ReminderStatus] ?? {
    label: status,
    color: Colors.primary,
    bg: Colors.primaryLight,
    icon: 'ellipse' as keyof typeof Ionicons.glyphMap,
  };

  return (
    <View style={[styles.badge, { backgroundColor: config.bg, borderColor: config.color }, size === 'md' && styles.badgeMd]}>
      <Ionicons name={config.icon} size={size === 'md' ? 14 : 12} color={config.color} />
      <Text style={[styles.text, { color: config.color }, size === 'md' && styles.textMd]}>{config.label}</Text>
    </View>
  );
};

export const getStatusColor = (status: ReminderStatus) => statusConfig[status]?.color ?? Colors.primary;

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  badgeMd: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
  },
  textMd: {
    fontSize: 13,
  },
});
