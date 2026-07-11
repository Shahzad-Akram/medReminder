import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppHeader } from '@/components/medi/AppHeader';
import { AppImage } from '@/components/medi/AppLogo';
import { Colors, Radius, Spacing } from '@/constants/colors';
import { WHATSAPP_ENABLED } from '@/constants/features';
import { Images } from '@/constants/images';
import { useAuth } from '@/contexts/auth-context';
import { getFirebaseErrorMessage } from '@/lib/firebase-errors';

const settingsItems: { icon: keyof typeof Ionicons.glyphMap; title: string; sub: string; route?: string }[] = [
  { icon: 'person-outline' as const, title: 'Profile', sub: 'Update your account details', route: '/profile' },
  ...(WHATSAPP_ENABLED
    ? [{ icon: 'chatbubble-outline' as const, title: 'Message Setup', sub: 'Configure SMS and WhatsApp message settings', route: '/message-setup' }]
    : []),
];

export default function SettingsScreen() {
  const { signOut, userProfile } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);

    try {
      await signOut();
      router.replace('/login');
    } catch (error) {
      Alert.alert('Logout failed', getFirebaseErrorMessage(error));
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Manage your account, preferences, and app settings.</Text>

        {WHATSAPP_ENABLED ? (
        <View style={styles.channelsCard}>
          <Text style={styles.channelsTitle}>WhatsApp</Text>
          <View style={styles.channelRow}>
            <View style={styles.channelItem}>
              <AppImage source={Images.icons.whatsapp} size={20} />
              <Text style={styles.channelName}>
                {userProfile?.onWhatsapp ? 'Enabled' : 'Disabled'}
              </Text>
              <View style={[styles.enabledBadge, !userProfile?.onWhatsapp && styles.disabledBadge]}>
                <Text style={[styles.enabledText, !userProfile?.onWhatsapp && styles.disabledText]}>
                  {userProfile?.onWhatsapp ? 'On' : 'Off'}
                </Text>
              </View>
            </View>
          </View>
          <Pressable style={styles.manageLink} onPress={() => router.push('/profile')}>
            <Text style={styles.manageText}>Update WhatsApp settings</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
          </Pressable>
        </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          {settingsItems.map((item) => (
            <Pressable
              key={item.title}
              style={styles.settingItem}
              onPress={() => item.route && router.push(item.route as never)}>
              <View style={styles.settingIcon}>
                <Ionicons name={item.icon} size={20} color={Colors.primary} />
              </View>
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>{item.title}</Text>
                <Text style={styles.settingSub}>{item.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.logoutItem} onPress={handleLogout} disabled={loggingOut}>
          <View style={[styles.settingIcon, { backgroundColor: Colors.errorLight }]}>
            <Ionicons name="log-out-outline" size={20} color={Colors.error} />
          </View>
          <View style={styles.settingText}>
            <Text style={[styles.settingTitle, { color: Colors.error }]}>Logout</Text>
            <Text style={styles.settingSub}>Sign out from your account</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
        </Pressable>

        <View style={styles.privacyBanner}>
          <AppImage source={Images.icons.security} size={32} />
          <Text style={styles.privacyText}>
            Your privacy is our priority. Your data is encrypted and stored securely. We never share your information with third parties.
          </Text>
          <View style={styles.hipaaBadge}>
            <Ionicons name="lock-closed" size={12} color={Colors.primary} />
            <Text style={styles.hipaaText}>HIPAA-aligned</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
  title: { fontSize: 26, fontWeight: '800', color: Colors.navy },
  subtitle: { fontSize: 13, color: Colors.textMuted, marginBottom: Spacing.xl },
  channelsCard: {
    backgroundColor: Colors.white, borderRadius: Radius.md, padding: Spacing.lg, marginBottom: Spacing.xl,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  channelsTitle: { fontSize: 14, fontWeight: '700', color: Colors.primary, marginBottom: Spacing.md },
  channelRow: { flexDirection: 'row', gap: Spacing.xl, marginBottom: Spacing.md },
  channelItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  channelName: { fontSize: 13, fontWeight: '600', color: Colors.navy },
  enabledBadge: { backgroundColor: Colors.successLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full },
  enabledText: { fontSize: 10, color: Colors.success, fontWeight: '700' },
  disabledBadge: { backgroundColor: Colors.warningLight },
  disabledText: { color: Colors.warning },
  manageLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  manageText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  section: { marginBottom: Spacing.lg },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.primary, marginBottom: Spacing.sm },
  settingItem: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.white, borderRadius: Radius.md, padding: Spacing.lg, marginBottom: Spacing.sm,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  settingIcon: {
    width: 40, height: 40, borderRadius: Radius.sm, backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  settingText: { flex: 1 },
  settingTitle: { fontSize: 14, fontWeight: '600', color: Colors.navy },
  settingSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  logoutItem: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.white, borderRadius: Radius.md, padding: Spacing.lg, marginBottom: Spacing.xl,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  privacyBanner: {
    backgroundColor: Colors.primaryLight, borderRadius: Radius.md, padding: Spacing.lg,
    flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, alignItems: 'flex-start',
  },
  privacyText: { flex: 1, fontSize: 12, color: Colors.primary, lineHeight: 18, minWidth: 200 },
  hipaaBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  hipaaText: { fontSize: 11, color: Colors.primary, fontWeight: '600' },
});
