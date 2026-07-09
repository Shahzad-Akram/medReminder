import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { SecurityFooter } from '@/components/medi/SecurityFooter';
import { AppImage } from '@/components/medi/AppLogo';
import { TealHeader } from '@/components/medi/TealHeader';
import { Colors, Radius, Spacing } from '@/constants/colors';
import { Images } from '@/constants/images';

const messageTypes = [
  { icon: 'notifications' as const, title: 'Dose Reminder', desc: 'Get reminded when it\'s time to take your medicine.' },
  { icon: 'calendar' as const, title: 'Follow-up Reminder', desc: 'Gentle reminders for upcoming doses.' },
  { icon: 'warning' as const, title: 'Missed-Dose Alert', desc: 'Alerts when a dose is missed.' },
  { icon: 'document-text' as const, title: 'Daily Summary', desc: 'Receive a summary of your daily adherence.' },
];

export default function MessageSetupScreen() {
  const [previewTab, setPreviewTab] = useState<'sms' | 'whatsapp'>('sms');
  const [consent, setConsent] = useState(true);
  const [toggles, setToggles] = useState({ dose: true, followup: true, missed: true, summary: true });

  return (
    <View style={styles.container}>
      <TealHeader title="Message Reminder Setup" showLogo />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.introCard}>
          <Ionicons name="chatbubble-ellipses" size={32} color={Colors.primary} />
          <View style={styles.introText}>
            <Text style={styles.introTitle}>Stay connected with timely reminders</Text>
            <Text style={styles.introDesc}>
              Set up SMS and WhatsApp to receive important reminders about your medications.
            </Text>
          </View>
          <AppImage source={Images.icons.whatsapp} size={48} />
        </View>

        {['SMS Number', 'WhatsApp Number'].map((title) => (
          <View key={title} style={styles.numberCard}>
            <View style={styles.numberHeader}>
              <View style={styles.numberIcon}>
                {title.includes('WhatsApp') ? (
                  <AppImage source={Images.icons.whatsapp} size={32} />
                ) : (
                  <Ionicons name="chatbubble" size={22} color={Colors.primary} />
                )}
              </View>
              <Text style={styles.numberTitle}>{title}</Text>
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            </View>
            <View style={styles.phoneRow}>
              <Pressable style={styles.countryCode}>
                <Text>🇮🇳 +91</Text>
                <Ionicons name="chevron-down" size={14} color={Colors.textMuted} />
              </Pressable>
              <TextInput
                style={styles.phoneInput}
                defaultValue="98765 43210"
                keyboardType="phone-pad"
              />
            </View>
            <Text style={styles.numberHint}>
              You will receive {title.includes('WhatsApp') ? 'WhatsApp' : 'SMS'} reminders on this number.
            </Text>
          </View>
        ))}

        <View style={styles.previewCard}>
          <View style={styles.previewHeader}>
            <View style={styles.previewIcon}>
              <Ionicons name="eye" size={22} color={Colors.primary} />
            </View>
            <Text style={styles.previewTitle}>Reminder Message Preview</Text>
          </View>
          <View style={styles.previewTabs}>
            {(['sms', 'whatsapp'] as const).map((tab) => (
              <Pressable
                key={tab}
                onPress={() => setPreviewTab(tab)}
                style={[styles.previewTab, previewTab === tab && styles.previewTabActive]}>
                <Text style={[styles.previewTabText, previewTab === tab && styles.previewTabTextActive]}>
                  {tab === 'sms' ? 'SMS Preview' : 'WhatsApp Preview'}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.previewBubble}>
            <Text style={styles.previewMsg}>Hello Sarah 👋</Text>
            <Text style={styles.previewMsg}>This is a reminder to take your medicine:</Text>
            <Text style={styles.previewMed}>Metformin 500mg</Text>
            <Text style={styles.previewMsg}>🗓️ Today at 08:00 AM</Text>
            <Text style={styles.previewMsg}>Stay healthy! 💚</Text>
            <Text style={styles.previewMsg}>- MediReminder</Text>
          </View>
          <Text style={styles.previewHint}>Message content is personalized and may vary based on your settings.</Text>
        </View>

        <View style={styles.consentCard}>
          <AppImage source={Images.icons.security} size={32} />
          <View style={styles.consentText}>
            <Text style={styles.consentTitle}>I consent to receive reminder messages</Text>
            <Text style={styles.consentDesc}>By enabling this, you agree to receive messages.</Text>
          </View>
          <Pressable onPress={() => setConsent(!consent)}>
            <Ionicons name={consent ? 'checkbox' : 'square-outline'} size={24} color={Colors.primary} />
          </Pressable>
        </View>

        <View style={styles.typesCard}>
          <View style={styles.typesHeader}>
            <View style={styles.previewIcon}>
              <Ionicons name="notifications" size={22} color={Colors.primary} />
            </View>
            <View>
              <Text style={styles.typesTitle}>Message Types</Text>
              <Text style={styles.typesSub}>Choose the types of messages you want to receive.</Text>
            </View>
          </View>
          {messageTypes.map((type, i) => {
            const keys = ['dose', 'followup', 'missed', 'summary'] as const;
            return (
              <View key={type.title} style={styles.typeRow}>
                <Ionicons name={type.icon} size={20} color={Colors.primary} />
                <View style={styles.typeText}>
                  <Text style={styles.typeTitle}>{type.title}</Text>
                  <Text style={styles.typeDesc}>{type.desc}</Text>
                </View>
                <Switch
                  value={toggles[keys[i]]}
                  onValueChange={() => setToggles((prev) => ({ ...prev, [keys[i]]: !prev[keys[i]] }))}
                  trackColor={{ false: Colors.border, true: Colors.primary }}
                  thumbColor={Colors.white}
                />
              </View>
            );
          })}
        </View>

        <View style={styles.testCard}>
          <View style={styles.previewIcon}>
            <Ionicons name="paper-plane" size={22} color={Colors.primary} />
          </View>
          <View style={styles.testText}>
            <Text style={styles.testTitle}>Test Your Setup</Text>
            <Text style={styles.testDesc}>Send a test message to make sure everything is working.</Text>
          </View>
          <Pressable style={styles.testBtn}>
            <Ionicons name="paper-plane-outline" size={16} color={Colors.primary} />
            <Text style={styles.testBtnText}>Send Test Message</Text>
          </Pressable>
        </View>

        <Pressable style={styles.saveBtn} onPress={() => router.back()} accessibilityRole="button">
          <Ionicons name="save" size={20} color={Colors.white} />
          <Text style={styles.saveBtnText}>Save Settings</Text>
        </Pressable>

        <SecurityFooter />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
  introCard: {
    flexDirection: 'row', gap: Spacing.md, backgroundColor: Colors.primaryLight,
    borderRadius: Radius.md, padding: Spacing.lg, marginBottom: Spacing.lg, alignItems: 'center',
  },
  introText: { flex: 1 },
  introTitle: { fontSize: 14, fontWeight: '700', color: Colors.navy },
  introDesc: { fontSize: 12, color: Colors.textSecondary, marginTop: 4, lineHeight: 18 },
  numberCard: {
    backgroundColor: Colors.white, borderRadius: Radius.md, padding: Spacing.lg,
    marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  numberHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  numberIcon: {
    width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
  },
  numberTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: Colors.primary },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  verifiedText: { fontSize: 12, color: Colors.success, fontWeight: '600' },
  phoneRow: { flexDirection: 'row', gap: Spacing.sm },
  countryCode: {
    flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
  },
  phoneInput: {
    flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md, fontSize: 15, color: Colors.text,
  },
  numberHint: { fontSize: 11, color: Colors.textMuted, marginTop: Spacing.sm },
  previewCard: {
    backgroundColor: Colors.white, borderRadius: Radius.md, padding: Spacing.lg,
    marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  previewHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  previewIcon: {
    width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
  },
  previewTitle: { fontSize: 15, fontWeight: '700', color: Colors.navy },
  previewTabs: {
    flexDirection: 'row', backgroundColor: Colors.background, borderRadius: Radius.full, padding: 4, marginBottom: Spacing.md,
  },
  previewTab: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: Radius.full },
  previewTabActive: { backgroundColor: Colors.primaryLight },
  previewTabText: { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },
  previewTabTextActive: { color: Colors.primary },
  previewBubble: {
    backgroundColor: Colors.infoLight, borderRadius: Radius.md, padding: Spacing.lg, marginBottom: Spacing.sm,
  },
  previewMsg: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
  previewMed: { fontSize: 15, fontWeight: '700', color: Colors.primary, marginVertical: 4 },
  previewHint: { fontSize: 11, color: Colors.textMuted },
  consentCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.white, borderRadius: Radius.md, padding: Spacing.lg, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  consentText: { flex: 1 },
  consentTitle: { fontSize: 14, fontWeight: '600', color: Colors.navy },
  consentDesc: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  typesCard: {
    backgroundColor: Colors.white, borderRadius: Radius.md, padding: Spacing.lg, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  typesHeader: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.lg },
  typesTitle: { fontSize: 15, fontWeight: '700', color: Colors.navy },
  typesSub: { fontSize: 11, color: Colors.textMuted },
  typeRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingVertical: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  typeText: { flex: 1 },
  typeTitle: { fontSize: 14, fontWeight: '600', color: Colors.navy },
  typeDesc: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  testCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.white, borderRadius: Radius.md, padding: Spacing.lg, marginBottom: Spacing.xl,
    borderWidth: 1, borderColor: Colors.border, flexWrap: 'wrap',
  },
  testText: { flex: 1, minWidth: 150 },
  testTitle: { fontSize: 14, fontWeight: '700', color: Colors.navy },
  testDesc: { fontSize: 11, color: Colors.textMuted },
  testBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: Colors.primary,
    borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  testBtnText: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: Spacing.lg,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: Colors.white },
});
