import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { TealHeader } from '@/components/medi/TealHeader';
import { Colors, Radius, Spacing } from '@/constants/colors';
import { useAuth } from '@/contexts/auth-context';
import { getFirebaseErrorMessage } from '@/lib/firebase-errors';

export default function ProfileScreen() {
  const { user, userProfile, updateMyProfile } = useAuth();

  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [whatsapp, setWhatsapp] = useState(userProfile?.whatsapp ?? '');
  const [onWhatsapp, setOnWhatsapp] = useState(Boolean(userProfile?.onWhatsapp));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDisplayName(user?.displayName ?? '');
  }, [user?.displayName]);

  useEffect(() => {
    setWhatsapp(userProfile?.whatsapp ?? '');
    setOnWhatsapp(Boolean(userProfile?.onWhatsapp));
  }, [userProfile?.whatsapp, userProfile?.onWhatsapp]);

  const handleSave = async () => {
    if (!user) {
      Alert.alert('Not signed in', 'Please sign in to update your profile.');
      return;
    }

    if (onWhatsapp && !whatsapp.trim()) {
      Alert.alert('WhatsApp number required', 'Enter your WhatsApp number or turn off WhatsApp.');
      return;
    }

    setSaving(true);
    try {
      await updateMyProfile({
        displayName: displayName.trim() || undefined,
        whatsapp: whatsapp.trim() || undefined,
        onWhatsapp,
      });

      Alert.alert('Saved', 'Your profile has been updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert('Could not save', getFirebaseErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <TealHeader title="Profile" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.label}>Name</Text>
          <View style={styles.inputRow}>
            <View style={styles.iconBox}>
              <Ionicons name="person-outline" size={20} color={Colors.primary} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Your name"
              placeholderTextColor={Colors.textMuted}
              value={displayName}
              onChangeText={setDisplayName}
              autoComplete="name"
            />
          </View>

          <Text style={styles.label}>Email</Text>
          <View style={[styles.inputRow, { opacity: 0.7 }]}>
            <View style={styles.iconBox}>
              <Ionicons name="mail-outline" size={20} color={Colors.primary} />
            </View>
            <TextInput style={styles.input} value={user?.email ?? ''} editable={false} />
          </View>

          <Text style={styles.label}>WhatsApp number</Text>
          <View style={styles.inputRow}>
            <View style={styles.iconBox}>
              <Ionicons name="logo-whatsapp" size={20} color={Colors.primary} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="e.g., +91 98765 43210"
              placeholderTextColor={Colors.textMuted}
              value={whatsapp}
              onChangeText={setWhatsapp}
              keyboardType="phone-pad"
              autoComplete="tel"
            />
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleText}>
              <Text style={styles.toggleTitle}>I use WhatsApp on this number</Text>
              <Text style={styles.toggleSub}>
                {onWhatsapp ? 'We will send you WhatsApp reminders.' : 'We will not send WhatsApp reminders to you.'}
              </Text>
            </View>
            <Switch
              value={onWhatsapp}
              onValueChange={setOnWhatsapp}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor={Colors.white}
            />
          </View>
        </View>

        <Pressable
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
          accessibilityRole="button">
          {saving ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <Ionicons name="save-outline" size={20} color={Colors.white} />
              <Text style={styles.saveText}>Save Changes</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  label: { fontSize: 13, fontWeight: '700', color: Colors.navy, marginBottom: Spacing.sm },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
    minHeight: 52,
    backgroundColor: Colors.white,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  input: { flex: 1, fontSize: 15, color: Colors.text },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  toggleText: { flex: 1 },
  toggleTitle: { fontSize: 14, fontWeight: '800', color: Colors.navy },
  toggleSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 4, lineHeight: 18 },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.lg,
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveText: { color: Colors.white, fontSize: 16, fontWeight: '800' },
});

