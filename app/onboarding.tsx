import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthHeroImage } from '@/components/medi/AuthHeroImage';
import { AppLogo } from '@/components/medi/AppLogo';
import { SecurityFooter } from '@/components/medi/SecurityFooter';
import { Images } from '@/constants/images';
import { Colors, Radius, Spacing } from '@/constants/colors';

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + Spacing.lg,
          paddingBottom: insets.bottom + Spacing.xl,
        },
      ]}>
      <View style={styles.logoWrap}>
        <AppLogo size="hero" style={styles.logo} />
      </View>

      <View style={styles.taglineRow}>
        <View style={styles.taglineLine} />
        <Ionicons name="heart" size={14} color={Colors.primary} />
        <View style={styles.taglineLine} />
      </View>
      <Text style={styles.tagline}>Your Health. On Time. Every Time.</Text>

      <AuthHeroImage source={Images.hero.medication} height={260} />

      <Text style={styles.headline}>Never Miss a Dose</Text>
      <Text style={styles.description}>
        Manage your medicines with smart reminders, track your health, and care for your family members—all in one place.
      </Text>

      <View style={styles.features}>
        {[
          { icon: 'calendar' as const, label: 'Smart Reminders' },
          { icon: 'people' as const, label: 'Family Management' },
          { icon: 'shield-checkmark' as const, label: 'Health Tracking' },
        ].map((f) => (
          <View key={f.label} style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name={f.icon} size={24} color={Colors.primary} />
            </View>
            <Text style={styles.featureLabel}>{f.label}</Text>
          </View>
        ))}
      </View>

      <Pressable style={styles.primaryBtn} onPress={() => router.push('/register')} accessibilityRole="button">
        <Text style={styles.primaryBtnText}>Get Started</Text>
        <Ionicons name="chevron-forward" size={20} color={Colors.white} />
      </Pressable>

      <Pressable style={styles.secondaryBtn} onPress={() => router.push('/login')} accessibilityRole="button">
        <Ionicons name="person-outline" size={20} color={Colors.info} />
        <Text style={styles.secondaryBtnText}>Log In</Text>
      </Pressable>

      <SecurityFooter />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  content: { paddingHorizontal: Spacing.xl },
  logoWrap: {
    alignItems: 'center',
    marginBottom: Spacing.md,
    width: '100%',
  },
  logo: {
    width: '100%',
    maxWidth: 340,
  },
  taglineRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  taglineLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  tagline: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.lg },
  headline: { fontSize: 26, fontWeight: '800', color: Colors.navy, textAlign: 'center', marginBottom: Spacing.md },
  description: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: Spacing.xl },
  features: {
    flexDirection: 'row', justifyContent: 'space-around', borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, padding: Spacing.lg, marginBottom: Spacing.xl,
  },
  featureItem: { alignItems: 'center', gap: Spacing.sm },
  featureIcon: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  featureLabel: { fontSize: 11, fontWeight: '600', color: Colors.navy, textAlign: 'center' },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: Spacing.lg, marginBottom: Spacing.md,
  },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: Colors.white },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    borderWidth: 1, borderColor: Colors.navy, borderRadius: Radius.md, paddingVertical: Spacing.lg, marginBottom: Spacing.lg,
  },
  secondaryBtnText: { fontSize: 16, fontWeight: '600', color: Colors.info },
});
