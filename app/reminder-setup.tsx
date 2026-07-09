import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { SecurityFooter } from '@/components/medi/SecurityFooter';
import { AuthHeroImage } from '@/components/medi/AuthHeroImage';
import { AppImage } from '@/components/medi/AppLogo';
import { TealHeader } from '@/components/medi/TealHeader';
import { Colors, Radius, Spacing } from '@/constants/colors';
import { Images } from '@/constants/images';

const reminderOptions = [
  {
    key: 'push',
    image: Images.icons.bell,
    title: 'Push Notifications',
    badge: 'Recommended',
    description: 'Get instant alerts on your phone so you never miss a dose.',
  },
  {
    key: 'sms',
    icon: 'chatbubble-ellipses' as const,
    title: 'SMS Reminders',
    description: 'Receive text messages with your reminder details.',
  },
  {
    key: 'whatsapp',
    image: Images.icons.whatsapp,
    title: 'WhatsApp Reminders',
    description: 'Get friendly reminders on WhatsApp with your medicine schedule.',
  },
];

export default function ReminderSetupScreen() {
  const [toggles, setToggles] = useState({ push: true, sms: true, whatsapp: true });

  const handleToggle = (key: string) => {
    setToggles((prev) => ({ ...prev, [key]: !prev[key as keyof typeof prev] }));
  };

  return (
    <View style={styles.container}>
      <TealHeader title="" showLogo showBack />
      <ScrollView contentContainerStyle={styles.content}>
        <AuthHeroImage source={Images.hero.medication} height={180} />

        <Text style={styles.title}>Stay on Time with Smart Reminders</Text>
        <Text style={styles.subtitle}>
          Choose how you want to receive reminders. You can change these anytime in Settings.
        </Text>

        {reminderOptions.map((option) => (
          <View key={option.key} style={styles.optionCard}>
            <View style={[styles.optionIcon, option.key === 'whatsapp' && styles.optionIconWhatsapp]}>
              {'image' in option && option.image ? (
                <AppImage source={option.image} size={36} />
              ) : (
                <Ionicons name={option.icon!} size={24} color={Colors.primary} />
              )}
            </View>
            <View style={styles.optionText}>
              <View style={styles.optionTitleRow}>
                <Text style={styles.optionTitle}>{option.title}</Text>
                {option.badge && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{option.badge}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.optionDesc}>{option.description}</Text>
            </View>
            <Switch
              value={toggles[option.key as keyof typeof toggles]}
              onValueChange={() => handleToggle(option.key)}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor={Colors.white}
            />
          </View>
        ))}

        <View style={styles.privacyBox}>
          <AppImage source={Images.icons.security} size={40} />
          <View style={styles.privacyText}>
            <Text style={styles.privacyTitle}>Your privacy matters</Text>
            <Text style={styles.privacyDesc}>
              We only send reminders you choose. No spam. No sharing. Just care.
            </Text>
          </View>
        </View>

        <Pressable style={styles.enableBtn} onPress={() => router.replace('/(tabs)')} accessibilityRole="button">
          <Ionicons name="notifications" size={20} color={Colors.white} />
          <Text style={styles.enableBtnText}>Enable Reminders</Text>
        </Pressable>

        <Pressable style={styles.laterBtn} onPress={() => router.replace('/(tabs)')} accessibilityRole="button">
          <Text style={styles.laterBtnText}>Maybe Later</Text>
        </Pressable>

        <SecurityFooter />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.xl },
  heroBox: {
    height: 160, backgroundColor: Colors.primaryLight, borderRadius: Radius.lg,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl,
  },
  title: { fontSize: 22, fontWeight: '800', color: Colors.navy, marginBottom: Spacing.sm },
  subtitle: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20, marginBottom: Spacing.xl },
  optionCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.white, borderRadius: Radius.md, padding: Spacing.lg,
    marginBottom: Spacing.md, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  optionIcon: {
    width: 48, height: 48, alignItems: 'center', justifyContent: 'center',
  },
  optionIconWhatsapp: {
    backgroundColor: 'transparent',
  },
  optionText: { flex: 1 },
  optionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  optionTitle: { fontSize: 15, fontWeight: '700', color: Colors.navy },
  badge: { backgroundColor: Colors.primaryLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full },
  badgeText: { fontSize: 10, color: Colors.primary, fontWeight: '600' },
  optionDesc: { fontSize: 12, color: Colors.textSecondary, marginTop: 4, lineHeight: 18 },
  privacyBox: {
    flexDirection: 'row', gap: Spacing.md, backgroundColor: Colors.primaryLight,
    borderRadius: Radius.md, padding: Spacing.lg, marginBottom: Spacing.xl, marginTop: Spacing.md,
  },
  privacyText: { flex: 1 },
  privacyTitle: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  privacyDesc: { fontSize: 12, color: Colors.primary, marginTop: 4, lineHeight: 18 },
  enableBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: Spacing.lg,
  },
  enableBtnText: { fontSize: 16, fontWeight: '700', color: Colors.white },
  laterBtn: {
    borderWidth: 1, borderColor: Colors.primary, borderRadius: Radius.md,
    paddingVertical: Spacing.lg, alignItems: 'center', marginTop: Spacing.md,
  },
  laterBtnText: { fontSize: 16, fontWeight: '600', color: Colors.primary },
});
