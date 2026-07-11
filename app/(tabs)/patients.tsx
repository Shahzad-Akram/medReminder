import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
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

import { AppHeader } from '@/components/medi/AppHeader';
import { PatientAvatar } from '@/components/medi/PatientAvatar';
import { SegmentedControl } from '@/components/medi/SegmentedControl';
import { Colors, Radius, Spacing } from '@/constants/colors';
import type { PatientGender } from '@/constants/mock-data';
import { useAuth } from '@/contexts/auth-context';
import { useMediData } from '@/contexts/medi-data-context';
import { getFirebaseErrorMessage } from '@/lib/firebase-errors';
import { checkEmailOnPlatform, normalizeEmail } from '@/lib/firestore/email-lookup';

const RELATIONSHIPS = ['Self', 'Spouse', 'Father', 'Mother', 'Son', 'Daughter', 'Brother', 'Sister', 'Other'];
const GENDERS: PatientGender[] = ['Male', 'Female', 'Other', 'Prefer not to say'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type EmailStatus = 'idle' | 'checking' | 'on' | 'off' | 'invalid' | 'empty';

export default function PatientsScreen() {
  const [filter, setFilter] = useState(0);
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [emailStatus, setEmailStatus] = useState<EmailStatus>('empty');
  const [relationship, setRelationship] = useState('Self');
  const [gender, setGender] = useState<PatientGender>('Male');
  const [age, setAge] = useState('');
  const [phone, setPhone] = useState('');
  const [bloodGroup, setBloodGroup] = useState('Unknown');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const emailCheckToken = useRef(0);

  const { user } = useAuth();
  const { patients, loading, addPatient } = useMediData();

  const filtered = patients.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.relationship.toLowerCase().includes(search.toLowerCase()) ||
      (p.email?.toLowerCase().includes(search.toLowerCase()) ?? false);
    if (filter === 1) return matchesSearch && p.dueToday > 0;
    return matchesSearch;
  });

  useEffect(() => {
    const trimmed = email.trim();

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
  }, [email]);

  const resetForm = () => {
    setName('');
    setEmail('');
    setEmailStatus('empty');
    setRelationship('Self');
    setGender('Male');
    setAge('');
    setPhone('');
    setBloodGroup('Unknown');
    setNotes('');
  };

  const handleAddPatient = async () => {
    if (!name.trim()) {
      Alert.alert('Missing information', 'Please enter the patient name.');
      return;
    }

    const normalizedEmail = email.trim() ? normalizeEmail(email) : undefined;

    if (normalizedEmail && !EMAIL_REGEX.test(normalizedEmail)) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }

    if (emailStatus === 'checking') {
      Alert.alert('Please wait', 'Still checking whether this email is on MediReminder.');
      return;
    }

    setSaving(true);

    try {
      const result = await addPatient({
        name: name.trim(),
        email: normalizedEmail,
        relationship,
        gender,
        age: Number(age) || 0,
        phone: phone.trim() || undefined,
        bloodGroup: bloodGroup === 'Unknown' ? undefined : bloodGroup,
        notes: notes.trim() || undefined,
        caretakerName: user?.displayName ?? user?.email ?? 'A caretaker',
        caretakerEmail: user?.email ?? undefined,
      });

      setModalVisible(false);
      resetForm();

      if (normalizedEmail && result.onPlatform) {
        Alert.alert(
          'Patient added',
          'This person is on MediReminder and has been notified that you added them as a patient.',
        );
      }
    } catch (error) {
      Alert.alert('Could not add patient', getFirebaseErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader notificationCount={3} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Patients</Text>
          <View style={styles.countRow}>
            <Ionicons name="people" size={16} color={Colors.primary} />
            <Text style={styles.countText}>
              {loading ? '…' : `${patients.length} Patients`}
            </Text>
          </View>
        </View>

        <View style={styles.searchRow}>
          <Ionicons name="search" size={20} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search patients by name or relationship..."
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <SegmentedControl
          options={[{ label: 'All' }, { label: 'Active' }]}
          selected={filter}
          onSelect={setFilter}
        />

        {!loading && filtered.length === 0 ? (
          <Text style={styles.emptyText}>No patients yet. Tap + to add someone you care for.</Text>
        ) : null}

        {filtered.map((patient) => {
          const hasSchedule =
            patient.nextReminder !== 'Not scheduled' &&
            patient.nextReminder !== '—' &&
            Boolean(patient.nextReminder?.trim());

          return (
          <Pressable
            key={patient.id}
            style={styles.patientCard}
            onPress={() => router.push({ pathname: '/patient/[id]', params: { id: patient.id } })}>
            <View style={styles.avatar}>
              <PatientAvatar size={52} />
            </View>
            <View style={styles.patientInfo}>
              <Text style={styles.patientName}>{patient.name}</Text>
              {patient.email ? (
                <View style={[styles.platformBadge, patient.onPlatform ? styles.platformOn : styles.platformOff]}>
                  <Text style={[styles.platformBadgeText, patient.onPlatform ? styles.platformOnText : styles.platformOffText]}>
                    {patient.onPlatform ? 'On platform' : 'Not on app'}
                  </Text>
                </View>
              ) : null}
              <View style={styles.metaRow}>
                <Ionicons name="heart" size={12} color={patient.relationshipColor} />
                <Text style={[styles.relationship, { color: patient.relationshipColor }]} numberOfLines={1}>
                  {patient.relationship}
                </Text>
              </View>
              {patient.email ? (
                <View style={styles.metaRow}>
                  <Ionicons name="mail-outline" size={12} color={Colors.textMuted} />
                  <Text style={styles.metaText} numberOfLines={1} ellipsizeMode="middle">
                    {patient.email}
                  </Text>
                </View>
              ) : null}
              <View style={styles.metaRow}>
                <Ionicons name="calendar-outline" size={12} color={Colors.textMuted} />
                <Text style={styles.metaText} numberOfLines={1} ellipsizeMode="tail">
                  {patient.age} years
                  {patient.gender ? ` · ${patient.gender}` : ''}
                  {patient.bloodGroup ? ` · ${patient.bloodGroup}` : ''}
                </Text>
              </View>
            </View>
            <View style={styles.separator} />
            <View style={[styles.nextCol, hasSchedule ? styles.nextColScheduled : styles.nextColEmpty]}>
              {hasSchedule ? (
                <>
                  <View style={styles.nextRow}>
                    <Ionicons name="time-outline" size={14} color={Colors.primary} />
                    <Text style={styles.nextTime} numberOfLines={1}>
                      Next: {patient.nextReminder}
                    </Text>
                  </View>
                  <Text style={styles.nextDay} numberOfLines={1}>
                    {patient.nextDay}
                  </Text>
                </>
              ) : (
                <Text style={styles.noSchedule} numberOfLines={1}>
                  No schedule
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} style={styles.chevron} />
          </Pressable>
          );
        })}
      </ScrollView>

      <Pressable
        style={styles.fab}
        accessibilityLabel="Add patient"
        accessibilityRole="button"
        onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={28} color={Colors.white} />
      </Pressable>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>Add Patient</Text>
              <Text style={styles.modalSub}>
                Add yourself or someone you care for, then prescribe medicines for them.
              </Text>

              <Text style={styles.fieldLabel}>
                Full name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="e.g., John Anderson"
                placeholderTextColor={Colors.textMuted}
                value={name}
                onChangeText={setName}
                autoComplete="name"
              />

              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                style={[
                  styles.fieldInput,
                  emailStatus === 'invalid' && styles.fieldInputInvalid,
                  emailStatus === 'on' && styles.fieldInputValid,
                ]}
                placeholder="e.g., john@email.com"
                placeholderTextColor={Colors.textMuted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
              {emailStatus === 'checking' ? (
                <Text style={styles.emailHintIdle}>Checking whether this email is on MediReminder…</Text>
              ) : null}
              {emailStatus === 'on' ? (
                <Text style={styles.emailHintOn}>
                  This person is on MediReminder. They will be notified when you add them.
                </Text>
              ) : null}
              {emailStatus === 'off' ? (
                <Text style={styles.emailHintOff}>
                  Not on MediReminder yet — you can still add them with their details.
                </Text>
              ) : null}
              {emailStatus === 'invalid' ? (
                <Text style={styles.emailHintOff}>Enter a valid email address (name@example.com).</Text>
              ) : null}

              <Text style={styles.fieldLabel}>Relationship</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {RELATIONSHIPS.map((rel) => (
                  <Pressable
                    key={rel}
                    style={[styles.chip, relationship === rel && styles.chipActive]}
                    onPress={() => setRelationship(rel)}>
                    <Text style={[styles.chipText, relationship === rel && styles.chipTextActive]}>{rel}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Text style={styles.fieldLabel}>Gender</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {GENDERS.map((option) => (
                  <Pressable
                    key={option}
                    style={[styles.chip, gender === option && styles.chipActive]}
                    onPress={() => setGender(option)}>
                    <Text style={[styles.chipText, gender === option && styles.chipTextActive]}>{option}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Text style={styles.fieldLabel}>Age</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="e.g., 68"
                placeholderTextColor={Colors.textMuted}
                keyboardType="number-pad"
                value={age}
                onChangeText={setAge}
              />

              <Text style={styles.fieldLabel}>Blood group</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {BLOOD_GROUPS.map((group) => (
                  <Pressable
                    key={group}
                    style={[styles.chip, bloodGroup === group && styles.chipActive]}
                    onPress={() => setBloodGroup(group)}>
                    <Text style={[styles.chipText, bloodGroup === group && styles.chipTextActive]}>{group}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Text style={styles.fieldLabel}>Phone number</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="e.g., +1 555 123 4567"
                placeholderTextColor={Colors.textMuted}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                autoComplete="tel"
              />

              <Text style={styles.fieldLabel}>Notes / conditions</Text>
              <TextInput
                style={[styles.fieldInput, styles.notesInput]}
                placeholder="Allergies, conditions, or care notes"
                placeholderTextColor={Colors.textMuted}
                value={notes}
                onChangeText={setNotes}
                multiline
                textAlignVertical="top"
              />

              <View style={styles.modalActions}>
                <Pressable
                  style={styles.cancelBtn}
                  onPress={() => {
                    setModalVisible(false);
                    resetForm();
                  }}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.saveBtn,
                    (saving || emailStatus === 'checking' || emailStatus === 'invalid') && styles.saveBtnDisabled,
                  ]}
                  onPress={handleAddPatient}
                  disabled={saving || emailStatus === 'checking' || emailStatus === 'invalid'}>
                  <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save'}</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: 100 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  title: { fontSize: 26, fontWeight: '800', color: Colors.primary },
  countRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  countText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.white, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg, minHeight: 48,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text },
  emptyText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.xl },
  patientCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md,
    backgroundColor: Colors.white, borderRadius: Radius.md, padding: Spacing.lg, marginTop: Spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  avatar: { marginTop: 2 },
  patientInfo: { flex: 1, minWidth: 0 },
  patientName: { fontSize: 15, fontWeight: '700', color: Colors.navy, lineHeight: 20 },
  platformBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
    marginTop: 4,
  },
  platformOn: { backgroundColor: Colors.successLight },
  platformOff: { backgroundColor: Colors.warningLight },
  platformBadgeText: { fontSize: 10, fontWeight: '700' },
  platformOnText: { color: Colors.success },
  platformOffText: { color: Colors.warning },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, minWidth: 0 },
  relationship: { fontSize: 12, fontWeight: '600', flexShrink: 1 },
  metaText: { fontSize: 12, color: Colors.textMuted, flex: 1, minWidth: 0 },
  separator: { width: 1, alignSelf: 'stretch', backgroundColor: Colors.border, marginHorizontal: 2 },
  nextCol: { width: 92, alignSelf: 'stretch', minHeight: 52 },
  nextColScheduled: { justifyContent: 'center' },
  nextColEmpty: { justifyContent: 'center', alignItems: 'center' },
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 0 },
  nextTime: { fontSize: 12, fontWeight: '600', color: Colors.primary, flex: 1, minWidth: 0 },
  nextDay: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  noSchedule: { fontSize: 12, color: Colors.textMuted, fontWeight: '600', textAlign: 'center' },
  chevron: { alignSelf: 'center' },
  fab: {
    position: 'absolute', bottom: 80, right: Spacing.xl,
    width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.white, borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg,
    padding: Spacing.xl, paddingBottom: Spacing.xxxl, maxHeight: '90%',
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.navy },
  modalSub: { fontSize: 13, color: Colors.textMuted, marginTop: 4, marginBottom: Spacing.lg, lineHeight: 18 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.navy, marginBottom: Spacing.sm },
  required: { color: Colors.primary },
  fieldInput: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: Spacing.md,
    minHeight: 48, fontSize: 15, color: Colors.text, marginBottom: Spacing.lg, backgroundColor: Colors.white,
  },
  fieldInputInvalid: { borderColor: Colors.error, marginBottom: Spacing.sm },
  fieldInputValid: { borderColor: Colors.success, marginBottom: Spacing.sm },
  emailHintIdle: { fontSize: 12, color: Colors.textMuted, fontWeight: '600', marginBottom: Spacing.lg },
  emailHintOn: { fontSize: 12, color: Colors.success, fontWeight: '600', marginBottom: Spacing.lg, lineHeight: 18 },
  emailHintOff: { fontSize: 12, color: Colors.warning, fontWeight: '600', marginBottom: Spacing.lg, lineHeight: 18 },
  notesInput: { minHeight: 88, paddingTop: Spacing.md },
  chipRow: { marginBottom: Spacing.lg },
  chip: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.full,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, marginRight: Spacing.sm,
  },
  chipActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  chipText: { fontSize: 13, color: Colors.textSecondary },
  chipTextActive: { color: Colors.primary, fontWeight: '700' },
  modalActions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm, marginBottom: Spacing.lg },
  cancelBtn: {
    flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
    paddingVertical: Spacing.md, alignItems: 'center',
  },
  cancelText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  saveBtn: {
    flex: 1, backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingVertical: Spacing.md, alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveText: { fontSize: 15, fontWeight: '700', color: Colors.white },
});
