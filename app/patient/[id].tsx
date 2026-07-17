import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppImage } from '@/components/medi/AppLogo';
import { PatientAvatar } from '@/components/medi/PatientAvatar';
import { TealHeader } from '@/components/medi/TealHeader';
import { Colors, Radius, Spacing } from '@/constants/colors';
import { WHATSAPP_ENABLED } from '@/constants/features';
import { Images } from '@/constants/images';
import { useAuth } from '@/contexts/auth-context';
import { useMediData } from '@/contexts/medi-data-context';
import { getFirebaseErrorMessage } from '@/lib/firebase-errors';
import { checkEmailOnPlatform, normalizeEmail } from '@/lib/firestore/email-lookup';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type EmailStatus = 'idle' | 'checking' | 'on' | 'off' | 'invalid' | 'empty';

export default function PatientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const {
    getPatientById,
    getMedicinesForPatient,
    todayReminders,
    assignPatientHelper,
    removePatientHelper,
    deletePatientCascade,
  } = useMediData();
  const patient = getPatientById(id ?? '');

  const [helperModalVisible, setHelperModalVisible] = useState(false);
  const [helperName, setHelperName] = useState('');
  const [helperEmail, setHelperEmail] = useState('');
  const [helperWhatsapp, setHelperWhatsapp] = useState('');
  const [emailStatus, setEmailStatus] = useState<EmailStatus>('empty');
  const [savingHelper, setSavingHelper] = useState(false);
  const [deletingPatient, setDeletingPatient] = useState(false);
  const emailCheckToken = useRef(0);

  const medicines = useMemo(
    () => (patient ? getMedicinesForPatient(patient.id) : []),
    [getMedicinesForPatient, patient],
  );

  const patientReminders = useMemo(() => {
    if (!patient) return [];
    return todayReminders.filter(
      (r) => r.patientId === patient.id || r.patient === patient.name,
    );
  }, [patient, todayReminders]);

  const helpers = patient?.helpers ?? [];

  useEffect(() => {
    const trimmed = helperEmail.trim();

    if (!trimmed) {
      setEmailStatus('empty');
      return;
    }

    const normalized = normalizeEmail(trimmed);

    if (!EMAIL_REGEX.test(normalized)) {
      setEmailStatus('invalid');
      return;
    }

    const token = ++emailCheckToken.current;
    setEmailStatus('checking');

    const timer = setTimeout(() => {
      void (async () => {
        try {
          const result = await checkEmailOnPlatform(normalized);
          if (emailCheckToken.current !== token) return;
          setEmailStatus(result.onPlatform ? 'on' : 'off');
        } catch {
          if (emailCheckToken.current !== token) return;
          setEmailStatus('idle');
        }
      })();
    }, 500);

    return () => clearTimeout(timer);
  }, [helperEmail]);

  const resetHelperForm = () => {
    setHelperName('');
    setHelperEmail('');
    setHelperWhatsapp('');
    setEmailStatus('empty');
  };

  const handleAssignHelper = async () => {
    if (!patient) return;

    if (!helperName.trim()) {
      Alert.alert('Missing information', 'Please enter the helper name.');
      return;
    }

    const normalizedEmail = helperEmail.trim() ? normalizeEmail(helperEmail) : undefined;

    if (!normalizedEmail || !EMAIL_REGEX.test(normalizedEmail)) {
      Alert.alert('Email required', 'Enter a valid email to check if the helper is on MediReminder.');
      return;
    }

    if (normalizedEmail === normalizeEmail(user?.email ?? '')) {
      Alert.alert('Invalid helper', 'You cannot assign yourself as a helper.');
      return;
    }

    if (emailStatus === 'checking') {
      Alert.alert('Please wait', 'Still checking whether this email is on MediReminder.');
      return;
    }

    if (emailStatus === 'off') {
      if (!WHATSAPP_ENABLED) {
        Alert.alert(
          'Helper must be on MediReminder',
          'WhatsApp reminders are not available yet. The helper needs a MediReminder account to receive reminders.',
        );
        return;
      }

      if (!helperWhatsapp.trim()) {
        Alert.alert('WhatsApp required', 'This person is not on the app. Add their WhatsApp number for reminders.');
        return;
      }
    }

    setSavingHelper(true);

    try {
      const result = await assignPatientHelper(patient.id, {
        name: helperName.trim(),
        email: normalizedEmail,
        whatsapp: helperWhatsapp.trim() || undefined,
        caretakerName: user?.displayName ?? user?.email ?? 'A caretaker',
        caretakerEmail: user?.email ?? undefined,
      });

      setHelperModalVisible(false);
      resetHelperForm();

      if (result.onPlatform) {
        Alert.alert(
          'Helper assigned',
          `${result.name} is on MediReminder and will receive app reminders for ${patient.name}.`,
        );
      } else {
        Alert.alert(
          'Helper assigned',
          `${result.name} will receive WhatsApp reminders at ${result.whatsapp}.`,
        );
      }
    } catch (error) {
      Alert.alert('Could not assign helper', getFirebaseErrorMessage(error));
    } finally {
      setSavingHelper(false);
    }
  };

  const handleRemoveHelper = (helperId: string, helperNameLabel: string) => {
    if (!patient) return;

    Alert.alert('Remove helper', `Stop sending reminders to ${helperNameLabel}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await removePatientHelper(patient.id, helperId);
            } catch (error) {
              Alert.alert('Could not remove helper', getFirebaseErrorMessage(error));
            }
          })();
        },
      },
    ]);
  };

  const handleDeletePatient = () => {
    if (!patient || deletingPatient) return;

    Alert.alert(
      'Delete patient?',
      `This permanently deletes ${patient.name}, all of their medicines and reminders, and every reminder shared with their helpers.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setDeletingPatient(true);
              try {
                await deletePatientCascade(patient.id);
                router.replace('/(tabs)/patients');
              } catch (error) {
                setDeletingPatient(false);
                Alert.alert('Could not delete patient', getFirebaseErrorMessage(error));
              }
            })();
          },
        },
      ],
    );
  };

  if (!patient) {
    if (deletingPatient) {
      return (
        <View style={styles.container}>
          <TealHeader title="Patient Details" />
          <View style={styles.missing}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.deletingText}>Deleting patient records…</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <TealHeader title="Patient Details" />
        <View style={styles.missing}>
          <Text style={styles.missingText}>Patient not found.</Text>
          <Pressable style={styles.backLink} onPress={() => router.back()}>
            <Text style={styles.backLinkText}>Go back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const infoRows = [
    { icon: 'heart' as const, label: 'Relationship', value: patient.relationship },
    { icon: 'calendar-outline' as const, label: 'Age', value: patient.age ? `${patient.age} years` : '—' },
    { icon: 'male-female' as const, label: 'Gender', value: patient.gender || '—' },
    { icon: 'mail-outline' as const, label: 'Email', value: patient.email || '—' },
    { icon: 'call-outline' as const, label: 'Phone', value: patient.phone || '—' },
    { icon: 'water-outline' as const, label: 'Blood group', value: patient.bloodGroup || '—' },
    { icon: 'document-text-outline' as const, label: 'Notes', value: patient.notes || '—' },
  ];

  return (
    <View style={styles.container}>
      <TealHeader title="Patient Details" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.overview}>
          <PatientAvatar size={72} />
          <View style={styles.overviewText}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{patient.name}</Text>
              {patient.email ? (
                <View style={[styles.platformBadge, patient.onPlatform ? styles.platformOn : styles.platformOff]}>
                  <Text style={[styles.platformBadgeText, patient.onPlatform ? styles.platformOnText : styles.platformOffText]}>
                    {patient.onPlatform ? 'On platform' : 'Not on app'}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.relationship, { color: patient.relationshipColor }]}>
              {patient.relationship}
            </Text>
            <Text style={styles.metaLine}>
              Next dose: {patient.nextReminder} · {patient.nextDay}
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{patient.dueToday}</Text>
            <Text style={styles.statLabel}>Due today</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{patient.adherence}%</Text>
            <Text style={styles.statLabel}>Adherence</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{medicines.length}</Text>
            <Text style={styles.statLabel}>Medicines</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Care helpers</Text>
          <Pressable onPress={() => setHelperModalVisible(true)}>
            <Text style={styles.addLink}>Assign ›</Text>
          </Pressable>
        </View>
        <Text style={styles.sectionHint}>
          Helpers receive all reminders and notifications for this patient.
        </Text>

        {helpers.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="people-outline" size={32} color={Colors.primary} />
            <Text style={styles.emptyTitle}>No helpers assigned</Text>
            <Text style={styles.emptySub}>
              Add another person to help with medicine reminders for {patient.name}.
            </Text>
            <Pressable style={styles.assignBtn} onPress={() => setHelperModalVisible(true)}>
              <Ionicons name="person-add" size={18} color={Colors.white} />
              <Text style={styles.assignBtnText}>Assign Helper</Text>
            </Pressable>
          </View>
        ) : (
          helpers.map((helper) => (
            <View key={helper.id} style={styles.helperCard}>
              <View style={styles.helperIcon}>
                <Ionicons name="person" size={20} color={Colors.primary} />
              </View>
              <View style={styles.helperInfo}>
                <Text style={styles.helperName}>{helper.name}</Text>
                <Text style={styles.helperMeta}>{helper.email}</Text>
                <View style={styles.helperBadges}>
                  <View style={[styles.platformBadge, helper.onPlatform ? styles.platformOn : styles.platformOff]}>
                    <Text style={[styles.platformBadgeText, helper.onPlatform ? styles.platformOnText : styles.platformOffText]}>
                      {helper.onPlatform ? 'App reminders' : WHATSAPP_ENABLED ? 'WhatsApp reminders' : 'Not on app'}
                    </Text>
                  </View>
                  {WHATSAPP_ENABLED && !helper.onPlatform && helper.whatsapp ? (
                    <Text style={styles.whatsappText}>WA: {helper.whatsapp}</Text>
                  ) : null}
                </View>
              </View>
              <Pressable
                style={styles.removeHelperBtn}
                onPress={() => handleRemoveHelper(helper.id, helper.name)}
                accessibilityRole="button"
                accessibilityLabel={`Remove helper ${helper.name}`}>
                <Ionicons name="trash-outline" size={18} color={Colors.error} />
              </Pressable>
            </View>
          ))
        )}

        <Text style={styles.sectionTitle}>Patient information</Text>
        <View style={styles.infoCard}>
          {infoRows.map((row) => (
            <View key={row.label} style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name={row.icon} size={18} color={Colors.primary} />
              </View>
              <Text style={styles.infoLabel}>{row.label}</Text>
              <Text style={styles.infoValue}>{row.value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Medicines</Text>
          <Pressable
            onPress={() =>
              router.push({ pathname: '/medicine/add', params: { patientId: patient.id } })
            }>
            <Text style={styles.addLink}>Add ›</Text>
          </Pressable>
        </View>

        {medicines.length === 0 ? (
          <View style={styles.emptyCard}>
            <AppImage source={Images.illustrations.pills} size={48} />
            <Text style={styles.emptyTitle}>No medicines yet</Text>
            <Text style={styles.emptySub}>Add a prescribed medicine and schedule for this patient.</Text>
          </View>
        ) : (
          medicines.map((med) => (
            <Pressable
              key={med.id}
              style={styles.medCard}
              onPress={() => router.push(`/medicine/${med.id}`)}>
              <View style={styles.medIcon}>
                <AppImage source={Images.illustrations.pills} size={36} />
              </View>
              <View style={styles.medInfo}>
                <Text style={styles.medName}>
                  {med.name} {med.strength}
                </Text>
                <Text style={styles.medDetail}>
                  {med.type} · {med.dosage}
                </Text>
                <Text style={styles.medNext}>Next: {med.nextReminder}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </Pressable>
          ))
        )}

        {patientReminders.length > 0 ? (
          <>
            <Text style={[styles.sectionTitle, { marginTop: Spacing.xl }]}>Today&apos;s reminders</Text>
            {patientReminders.map((reminder) => (
              <Pressable
                key={reminder.id}
                style={styles.reminderCard}
                onPress={() =>
                  router.push({ pathname: '/active-reminder', params: { reminderId: reminder.id } })
                }>
                <View style={styles.reminderIcon}>
                  <Ionicons name="alarm-outline" size={18} color={Colors.primary} />
                </View>
                <View style={styles.medInfo}>
                  <Text style={styles.medName}>{reminder.medicine}</Text>
                  <Text style={styles.medDetail}>
                    {reminder.time} · {reminder.instructions}
                  </Text>
                </View>
                <Text style={styles.reminderStatus}>{reminder.status}</Text>
              </Pressable>
            ))}
          </>
        ) : null}

        <Pressable
          style={styles.primaryBtn}
          onPress={() =>
            router.push({ pathname: '/medicine/add', params: { patientId: patient.id } })
          }
          accessibilityRole="button">
          <Ionicons name="medical" size={20} color={Colors.white} />
          <Text style={styles.primaryBtnText}>Add Medicine</Text>
        </Pressable>

        <Pressable
          style={styles.secondaryBtn}
          onPress={() => router.push('/reminder-history')}
          accessibilityRole="button">
          <Ionicons name="time-outline" size={20} color={Colors.primary} />
          <Text style={styles.secondaryBtnText}>View Reminder History</Text>
        </Pressable>

        <Pressable
          style={[styles.deletePatientBtn, deletingPatient && styles.deletePatientBtnDisabled]}
          onPress={handleDeletePatient}
          disabled={deletingPatient}
          accessibilityRole="button"
          accessibilityLabel={`Delete patient ${patient.name}`}
          accessibilityState={{ disabled: deletingPatient }}>
          {deletingPatient ? (
            <ActivityIndicator color={Colors.error} />
          ) : (
            <Ionicons name="trash-outline" size={20} color={Colors.error} />
          )}
          <Text style={styles.deletePatientBtnText}>
            {deletingPatient ? 'Deleting Patient…' : 'Delete Patient'}
          </Text>
        </Pressable>
      </ScrollView>

      <Modal visible={helperModalVisible} animationType="slide" transparent onRequestClose={() => setHelperModalVisible(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Helper</Text>
              <Pressable onPress={() => setHelperModalVisible(false)} accessibilityLabel="Close">
                <Ionicons name="close" size={24} color={Colors.navy} />
              </Pressable>
            </View>

            <Text style={styles.modalSub}>
              This person will receive all reminders and notifications for {patient.name}.
            </Text>

            <Text style={styles.fieldLabel}>Helper name *</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="e.g., Sarah Anderson"
              placeholderTextColor={Colors.textMuted}
              value={helperName}
              onChangeText={setHelperName}
            />

            <Text style={styles.fieldLabel}>Email *</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="helper@email.com"
              placeholderTextColor={Colors.textMuted}
              value={helperEmail}
              onChangeText={setHelperEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {emailStatus === 'checking' ? (
              <Text style={styles.emailHint}>Checking if on MediReminder…</Text>
            ) : null}
            {emailStatus === 'on' ? (
              <View style={styles.emailStatusRow}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                <Text style={styles.emailOn}>On MediReminder — will get app reminders</Text>
              </View>
            ) : null}
            {emailStatus === 'off' ? (
              <View style={styles.emailStatusRow}>
                <Ionicons name="information-circle" size={16} color={Colors.warning} />
                <Text style={styles.emailOff}>
                  {WHATSAPP_ENABLED
                    ? 'Not on app — WhatsApp number required'
                    : 'Not on app — helper must join MediReminder to receive reminders'}
                </Text>
              </View>
            ) : null}
            {emailStatus === 'invalid' ? (
              <Text style={styles.emailInvalid}>Enter a valid email address</Text>
            ) : null}

            {WHATSAPP_ENABLED && (emailStatus === 'off' || helperWhatsapp) ? (
              <>
                <Text style={styles.fieldLabel}>
                  WhatsApp number {emailStatus === 'off' ? '*' : '(optional)'}
                </Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="e.g., +91 98765 43210"
                  placeholderTextColor={Colors.textMuted}
                  value={helperWhatsapp}
                  onChangeText={setHelperWhatsapp}
                  keyboardType="phone-pad"
                />
                {emailStatus === 'off' ? (
                  <View style={styles.whatsappNote}>
                    <AppImage source={Images.icons.whatsapp} size={20} />
                    <Text style={styles.whatsappNoteText}>
                      Reminders will be sent as WhatsApp messages to this number.
                    </Text>
                  </View>
                ) : null}
              </>
            ) : null}

            <Pressable
              style={[styles.saveHelperBtn, savingHelper && styles.saveHelperBtnDisabled]}
              onPress={handleAssignHelper}
              disabled={savingHelper}
              accessibilityRole="button">
              {savingHelper ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <>
                  <Ionicons name="person-add" size={18} color={Colors.white} />
                  <Text style={styles.saveHelperBtnText}>Assign Helper</Text>
                </>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  missingText: { fontSize: 16, color: Colors.textMuted, marginBottom: Spacing.md },
  deletingText: { fontSize: 14, color: Colors.textMuted, marginTop: Spacing.md },
  backLink: { padding: Spacing.md },
  backLinkText: { color: Colors.primary, fontWeight: '700' },
  overview: {
    flexDirection: 'row',
    gap: Spacing.lg,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  overviewText: { flex: 1, justifyContent: 'center' },
  nameRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  name: { fontSize: 22, fontWeight: '800', color: Colors.navy },
  platformBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full },
  platformOn: { backgroundColor: Colors.successLight },
  platformOff: { backgroundColor: Colors.warningLight },
  platformBadgeText: { fontSize: 10, fontWeight: '700' },
  platformOnText: { color: Colors.success },
  platformOffText: { color: Colors.warning },
  relationship: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  metaLine: { fontSize: 12, color: Colors.textMuted, marginTop: 6 },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  statValue: { fontSize: 20, fontWeight: '800', color: Colors.primary },
  statLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.navy, marginBottom: Spacing.md },
  sectionHint: { fontSize: 12, color: Colors.textMuted, marginTop: -Spacing.sm, marginBottom: Spacing.md },
  addLink: { fontSize: 14, color: Colors.primary, fontWeight: '700', marginBottom: Spacing.md },
  infoCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: { width: 100, fontSize: 12, color: Colors.textMuted },
  infoValue: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.navy },
  emptyCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: Colors.navy },
  emptySub: { fontSize: 13, color: Colors.textMuted, textAlign: 'center' },
  assignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  assignBtnText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
  helperCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  helperIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helperInfo: { flex: 1 },
  helperName: { fontSize: 14, fontWeight: '700', color: Colors.navy },
  helperMeta: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  helperBadges: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 6 },
  whatsappText: { fontSize: 11, color: Colors.textSecondary, fontWeight: '600' },
  removeHelperBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.errorLight,
  },
  medCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  medIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  medInfo: { flex: 1 },
  medName: { fontSize: 14, fontWeight: '700', color: Colors.navy },
  medDetail: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  medNext: { fontSize: 11, color: Colors.primary, fontWeight: '600', marginTop: 4 },
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  reminderIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderStatus: { fontSize: 11, fontWeight: '700', color: Colors.primary, textTransform: 'capitalize' },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.lg,
    marginTop: Spacing.xl,
  },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: Colors.white },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.lg,
    marginTop: Spacing.md,
    backgroundColor: Colors.white,
  },
  secondaryBtnText: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  deletePatientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: Radius.md,
    paddingVertical: Spacing.lg,
    marginTop: Spacing.md,
    backgroundColor: Colors.errorLight,
  },
  deletePatientBtnDisabled: { opacity: 0.7 },
  deletePatientBtnText: { fontSize: 15, fontWeight: '700', color: Colors.error },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    padding: Spacing.xl,
    paddingBottom: Spacing.xxxl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.navy },
  modalSub: { fontSize: 13, color: Colors.textMuted, marginBottom: Spacing.lg, lineHeight: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.navy, marginBottom: Spacing.sm },
  fieldInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 15,
    color: Colors.text,
    marginBottom: Spacing.md,
    backgroundColor: Colors.white,
  },
  emailHint: { fontSize: 12, color: Colors.textMuted, marginTop: -Spacing.sm, marginBottom: Spacing.md },
  emailStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -Spacing.sm, marginBottom: Spacing.md },
  emailOn: { fontSize: 12, color: Colors.success, fontWeight: '600' },
  emailOff: { fontSize: 12, color: Colors.warning, fontWeight: '600' },
  emailInvalid: { fontSize: 12, color: Colors.error, marginTop: -Spacing.sm, marginBottom: Spacing.md },
  whatsappNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  whatsappNoteText: { flex: 1, fontSize: 12, color: Colors.primary, lineHeight: 18 },
  saveHelperBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.lg,
    marginTop: Spacing.sm,
  },
  saveHelperBtnDisabled: { opacity: 0.7 },
  saveHelperBtnText: { color: Colors.white, fontWeight: '700', fontSize: 16 },
});
