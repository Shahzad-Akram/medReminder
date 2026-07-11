import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { FormInput } from '@/components/medi/FormInput';
import { AppImage } from '@/components/medi/AppLogo';
import { TealHeader } from '@/components/medi/TealHeader';
import { Colors, Radius, Spacing } from '@/constants/colors';
import { WHATSAPP_ENABLED } from '@/constants/features';
import { Images } from '@/constants/images';
import { useAuth } from '@/contexts/auth-context';
import { useMediData } from '@/contexts/medi-data-context';
import { getFirebaseErrorMessage } from '@/lib/firebase-errors';
import { timeOfDayFromClock, updateMedicine } from '@/lib/firestore/medicines';
import { getTodayIso } from '@/lib/firestore/reminders';
import { queueWhatsappMessage, collectWhatsappRecipients, scheduledAtMsForToday } from '@/lib/firestore/whatsapp';
import { ensureNotificationPermissions } from '@/lib/notifications';

const MEDICINE_TYPES = [
  'Tablet',
  'Capsule',
  'Syrup',
  'Injection',
  'Drops',
  'Inhaler',
  'Cream',
  'Ointment',
  'Patch',
  'Powder',
  'Other',
] as const;

const FREQUENCY_OPTIONS = [
  { key: 'once', label: 'Once daily', times: 1 },
  { key: 'twice', label: 'Twice daily', times: 2 },
  { key: 'thrice', label: '3 times daily', times: 3 },
  { key: 'custom', label: 'Custom times', times: 0 },
] as const;

type FrequencyKey = (typeof FREQUENCY_OPTIONS)[number]['key'];

const createDoseDate = (hour: number, minute = 0) => {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date;
};

const defaultTimesForFrequency = (key: FrequencyKey): Date[] => {
  if (key === 'twice') return [createDoseDate(8), createDoseDate(20)];
  if (key === 'thrice') return [createDoseDate(8), createDoseDate(14), createDoseDate(20)];
  if (key === 'custom') return [createDoseDate(8), createDoseDate(20)];
  return [createDoseDate(8)];
};

const formatDoseTime = (date: Date) =>
  date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

const formatCalendarDate = (date: Date) =>
  date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const daysBetween = (start: Date, end: Date) => {
  const startMidnight = new Date(start);
  startMidnight.setHours(0, 0, 0, 0);
  const endMidnight = new Date(end);
  endMidnight.setHours(0, 0, 0, 0);
  const diffMs = endMidnight.getTime() - startMidnight.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
};

const iconForTime = (time: string) => {
  const tod = timeOfDayFromClock(time);
  if (tod === 'morning') return 'sunny';
  if (tod === 'afternoon') return 'partly-sunny';
  if (tod === 'evening') return 'cloudy-night';
  return 'moon';
};

export default function AddMedicineScreen() {
  const { patientId: patientIdParam } = useLocalSearchParams<{ patientId?: string }>();
  const { user, userProfile } = useAuth();
  const { patients, addMedicine, addReminder, notifyPatientHelpersForReminder, shareMedicineToHelpers } = useMediData();

  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<(typeof MEDICINE_TYPES)[number]>('Tablet');
  const [dosage, setDosage] = useState('');
  const [strength, setStrength] = useState('');
  const [instructions, setInstructions] = useState('');
  const [frequency, setFrequency] = useState<FrequencyKey>('once');
  const [doseDates, setDoseDates] = useState<Date[]>(() => defaultTimesForFrequency('once'));
  const [editingTimeIndex, setEditingTimeIndex] = useState<number | null>(null);
  const [editingCalendarField, setEditingCalendarField] = useState<'start' | 'end' | null>(null);
  const [notifyPush, setNotifyPush] = useState(true);
  const [notifySms, setNotifySms] = useState(false);
  const [notifyWhatsapp, setNotifyWhatsapp] = useState(false);
  const [startDateValue, setStartDateValue] = useState<Date>(new Date());
  const [endDateValue, setEndDateValue] = useState<Date | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const scheduleTimes = useMemo(() => doseDates.map(formatDoseTime), [doseDates]);
  const startDate = useMemo(() => formatCalendarDate(startDateValue), [startDateValue]);
  const endDate = useMemo(() => (endDateValue ? formatCalendarDate(endDateValue) : ''), [endDateValue]);

  useEffect(() => {
    if (patientIdParam && patients.some((p) => p.id === patientIdParam)) {
      setSelectedPatientId(patientIdParam);
      return;
    }
  }, [patientIdParam, patients, selectedPatientId]);

  const selectedPatient = useMemo(
    () => patients.find((p) => p.id === selectedPatientId),
    [patients, selectedPatientId],
  );

  const handleFrequencyChange = (key: FrequencyKey) => {
    setFrequency(key);
    if (key !== 'custom') {
      setDoseDates(defaultTimesForFrequency(key));
    }
  };

  const handleOpenTimePicker = (index: number) => setEditingTimeIndex(index);

  const handleTimeChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      setEditingTimeIndex(null);
    }

    if (event.type === 'dismissed') {
      setEditingTimeIndex(null);
      return;
    }

    if (selected != null && editingTimeIndex != null) {
      setDoseDates((prev) => prev.map((date, i) => (i === editingTimeIndex ? selected : date)));
    }
  };

  const handleAddDoseTime = () => {
    setFrequency('custom');
    setDoseDates((prev) => [...prev, createDoseDate(12)]);
  };

  const handleRemoveDoseTime = (index: number) => {
    if (doseDates.length <= 1) return;
    setFrequency('custom');
    setDoseDates((prev) => prev.filter((_, i) => i !== index));
  };

  const handleOpenStartDatePicker = () => setEditingCalendarField('start');
  const handleOpenEndDatePicker = () => setEditingCalendarField('end');

  const handleCalendarChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      setEditingCalendarField(null);
    }

    if (event.type === 'dismissed') {
      setEditingCalendarField(null);
      return;
    }

    if (!selected || !editingCalendarField) return;

    if (editingCalendarField === 'start') {
      setStartDateValue(selected);
      if (endDateValue && selected > endDateValue) {
        setEndDateValue(selected);
      }
      return;
    }

    setEndDateValue(selected);
  };

  const handleSave = async () => {
    if (!selectedPatient) {
      Alert.alert('Select a patient', 'Add a patient first, then prescribe a medicine for them.');
      return;
    }

    if (!name.trim() || !dosage.trim() || !strength.trim()) {
      Alert.alert('Missing information', 'Please enter medicine name, dosage, and strength.');
      return;
    }

    if (scheduleTimes.length === 0) {
      Alert.alert('Add a reminder time', 'Choose at least one time to take this medicine.');
      return;
    }

    if (!notifyPush && !notifySms && (WHATSAPP_ENABLED ? !notifyWhatsapp : true)) {
      Alert.alert('Reminder method', 'Turn on at least one reminder channel (Push, SMS, or WhatsApp).');
      return;
    }

    setSaving(true);

    try {
      if (notifyPush) {
        await ensureNotificationPermissions();
      }

      const firstTime = scheduleTimes[0];
      const frequencyLabel =
        FREQUENCY_OPTIONS.find((option) => option.key === frequency)?.label ?? 'Custom times';
      const medicineLabel = `${name.trim()} ${strength.trim()}`;
      const calculatedDaysLeft =
        endDateValue != null ? Math.max(0, daysBetween(new Date(), endDateValue) + 1) : 30;

      const medicineId = await addMedicine({
        name: name.trim(),
        type: type || 'Tablet',
        dosage: dosage.trim(),
        strength: strength.trim(),
        instructions: instructions.trim() || 'As directed',
        category: 'General',
        description: notes.trim() || medicineLabel,
        startDate,
        endDate: endDate || 'Ongoing',
        doctorNote: notes.trim(),
        status: 'active',
        nextReminder: `Today, ${firstTime}`,
        nextDay: 'Today',
        timeOfDay: timeOfDayFromClock(firstTime),
        patientName: selectedPatient.name,
        patientId: selectedPatient.id,
        scheduleTimes,
        daysLeft: calculatedDaysLeft,
        frequency: frequencyLabel,
        notifyPush,
        notifySms,
        notifyWhatsapp: WHATSAPP_ENABLED ? notifyWhatsapp : false,
      });

      // Share medicine to on-platform helpers so THEIR device can schedule daily notifications too.
      await shareMedicineToHelpers(selectedPatient.id, medicineId, {
        name: name.trim(),
        type: type || 'Tablet',
        dosage: dosage.trim(),
        strength: strength.trim(),
        instructions: instructions.trim() || 'As directed',
        category: 'General',
        description: notes.trim() || medicineLabel,
        startDate,
        endDate: endDate || 'Ongoing',
        doctorNote: notes.trim(),
        status: 'active',
        nextReminder: `Today, ${firstTime}`,
        nextDay: 'Today',
        timeOfDay: timeOfDayFromClock(firstTime),
        patientName: selectedPatient.name,
        patientId: selectedPatient.id,
        scheduleTimes,
        daysLeft: calculatedDaysLeft,
        frequency: frequencyLabel,
        notifyPush,
        notifySms,
        notifyWhatsapp: WHATSAPP_ENABLED ? notifyWhatsapp : false,
      });

      const displayDate = formatCalendarDate(new Date());
      const reminderInstructions = `${dosage.trim()} • ${instructions.trim() || 'As directed'}`;

      await Promise.all(
        scheduleTimes.map((time) =>
          addReminder({
            time,
            date: displayDate,
            scheduledDate: getTodayIso(),
            medicine: medicineLabel,
            patient: selectedPatient.name,
            patientId: selectedPatient.id,
            medicineId,
            instructions: reminderInstructions,
            status: 'upcoming',
            icon: iconForTime(time),
          }),
        ),
      );

      await Promise.all(
        scheduleTimes.map((time) =>
          notifyPatientHelpersForReminder(selectedPatient.id, {
            patientName: selectedPatient.name,
            patientDocId: selectedPatient.id,
            medicine: medicineLabel,
            medicineId,
            time,
            instructions: reminderInstructions,
          }),
        ),
      );

      // Queue WhatsApp messages for patient/caretaker/helpers at the due time.
      if (WHATSAPP_ENABLED && user && notifyWhatsapp) {
        const recipients = await collectWhatsappRecipients({
          patient: selectedPatient,
          caretakerProfile: userProfile,
          helpers: selectedPatient.helpers,
        });

        await Promise.all(
          scheduleTimes.flatMap((time) => {
            const scheduledAtMs = scheduledAtMsForToday(time);
            if (!scheduledAtMs || recipients.length === 0) return [];

            const body = `Reminder: ${medicineLabel} for ${selectedPatient.name} at ${time}. ${reminderInstructions}`;

            return recipients.map((to) =>
              queueWhatsappMessage({
                caretakerUid: user.uid,
                type: 'medicine_reminder',
                to,
                body,
                scheduledAtMs,
                meta: {
                  patientId: selectedPatient.id,
                  patientName: selectedPatient.name,
                  medicineId,
                  medicine: medicineLabel,
                  time,
                  scheduledDate: getTodayIso(),
                },
              }).catch(() => {
                // ignore per-recipient failures
              }),
            );
          }),
        );

        await updateMedicine(user.uid, medicineId, { dailyWhatsappDate: getTodayIso() }).catch(() => {
          // Best-effort marker so daily sync does not duplicate messages.
        });
      }

      Alert.alert(
        'Medicine & reminder saved',
        `Scheduled ${scheduleTimes.length} reminder${scheduleTimes.length > 1 ? 's' : ''} for ${selectedPatient.name}.`,
        [{ text: 'OK', onPress: () => router.replace(`/medicine/${medicineId}`) }],
      );
    } catch (error) {
      Alert.alert('Could not save', getFirebaseErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const editingDate = editingTimeIndex != null ? doseDates[editingTimeIndex] : null;
  const editingCalendarValue =
    editingCalendarField === 'start'
      ? startDateValue
      : editingCalendarField === 'end'
        ? endDateValue ?? startDateValue
        : null;

  return (
    <View style={styles.container}>
      <TealHeader title="" showLogo rightIcon="help-circle-outline" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <View style={styles.titleIcon}>
            <AppImage source={Images.illustrations.pills} size={56} />
          </View>
          <View>
            <Text style={styles.title}>Add Medicine</Text>
            <Text style={styles.subtitle}>
              Enter medicine details and set reminder times for this patient.
            </Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>
          Patient <Text style={styles.required}>*</Text>
        </Text>
        {patients.length === 0 ? (
          <Pressable style={styles.emptyPatient} onPress={() => router.push('/(tabs)/patients')}>
            <Ionicons name="person-add" size={18} color={Colors.primary} />
            <Text style={styles.emptyPatientText}>Add a patient first</Text>
          </Pressable>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.patientRow}>
            {patients.map((patient) => {
              const active = patient.id === selectedPatientId;
              return (
                <Pressable
                  key={patient.id}
                  style={[styles.patientChip, active && styles.patientChipActive]}
                  onPress={() => setSelectedPatientId(patient.id)}>
                  <Text style={[styles.patientChipText, active && styles.patientChipTextActive]}>
                    {patient.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
        {!selectedPatientId && patients.length > 0 ? (
          <Text style={styles.selectPatientHint}>Select a patient to continue.</Text>
        ) : null}

        <FormInput
          label="Medicine Name"
          icon="medical"
          required
          placeholder="e.g., Paracetamol"
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.sectionLabel}>
          Medicine Type <Text style={styles.required}>*</Text>
        </Text>
        <View style={styles.typeGrid}>
          {MEDICINE_TYPES.map((option) => {
            const active = type === option;
            return (
              <Pressable
                key={option}
                style={[styles.typeChip, active && styles.typeChipActive]}
                onPress={() => setType(option)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Medicine type ${option}`}>
                <View style={[styles.typeCheck, active && styles.typeCheckActive]}>
                  {active ? <Ionicons name="checkmark" size={12} color={Colors.white} /> : null}
                </View>
                <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>{option}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.row}>
          <View style={styles.half}>
            <FormInput
              label="Dosage"
              icon="water"
              required
              placeholder="e.g., 1 tablet"
              value={dosage}
              onChangeText={setDosage}
            />
          </View>
          <View style={styles.half}>
            <FormInput
              label="Strength"
              icon="shield-checkmark"
              required
              placeholder="e.g., 500 mg"
              value={strength}
              onChangeText={setStrength}
            />
          </View>
        </View>

        <FormInput
          label="Instructions"
          icon="document-text"
          placeholder="e.g., After food, With water"
          value={instructions}
          onChangeText={setInstructions}
        />

        <Text style={styles.sectionHeading}>Reminder schedule</Text>
        <Text style={styles.sectionHint}>When should this medicine be given?</Text>

        <Text style={styles.sectionLabel}>
          Frequency <Text style={styles.required}>*</Text>
        </Text>
        <View style={styles.typeGrid}>
          {FREQUENCY_OPTIONS.map((option) => {
            const active = frequency === option.key;
            return (
              <Pressable
                key={option.key}
                style={[styles.typeChip, active && styles.typeChipActive]}
                onPress={() => handleFrequencyChange(option.key)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Frequency ${option.label}`}>
                <View style={[styles.typeCheck, active && styles.typeCheckActive]}>
                  {active ? <Ionicons name="checkmark" size={12} color={Colors.white} /> : null}
                </View>
                <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>
          Dose times <Text style={styles.required}>*</Text>
        </Text>
        {doseDates.map((date, index) => (
          <View key={`dose-${index}`} style={styles.timeRow}>
            <Pressable
              style={styles.timeField}
              onPress={() => handleOpenTimePicker(index)}
              accessibilityRole="button"
              accessibilityLabel={`Select dose time ${index + 1}`}>
              <View style={styles.timeIconBox}>
                <Ionicons name="time" size={18} color={Colors.primary} />
              </View>
              <Text style={styles.timeValue}>{formatDoseTime(date)}</Text>
              <Ionicons name="chevron-down" size={18} color={Colors.textMuted} />
            </Pressable>
            {doseDates.length > 1 ? (
              <Pressable
                style={styles.removeTimeBtn}
                onPress={() => handleRemoveDoseTime(index)}
                accessibilityRole="button"
                accessibilityLabel={`Remove dose time ${index + 1}`}>
                <Ionicons name="trash-outline" size={18} color={Colors.error} />
              </Pressable>
            ) : null}
          </View>
        ))}

        <Pressable style={styles.addTimeBtn} onPress={handleAddDoseTime} accessibilityRole="button">
          <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
          <Text style={styles.addTimeText}>Add another dose time</Text>
        </Pressable>

        {Platform.OS === 'android' && editingDate ? (
          <DateTimePicker
            value={editingDate}
            mode="time"
            display="clock"
            is24Hour={false}
            onChange={handleTimeChange}
          />
        ) : null}

        {Platform.OS === 'ios' ? (
          <Modal
            visible={editingTimeIndex != null}
            transparent
            animationType="slide"
            onRequestClose={() => setEditingTimeIndex(null)}>
            <View style={styles.timeModalOverlay}>
              <View style={styles.timeModalCard}>
                <Text style={styles.timeModalTitle}>Select time</Text>
                {editingDate ? (
                  <DateTimePicker
                    value={editingDate}
                    mode="time"
                    display="spinner"
                    themeVariant="light"
                    onChange={handleTimeChange}
                  />
                ) : null}
                <Pressable style={styles.timeDoneBtn} onPress={() => setEditingTimeIndex(null)}>
                  <Text style={styles.timeDoneText}>Done</Text>
                </Pressable>
              </View>
            </View>
          </Modal>
        ) : null}

        {Platform.OS === 'android' && editingCalendarValue ? (
          <DateTimePicker
            value={editingCalendarValue}
            mode="date"
            display="default"
            onChange={handleCalendarChange}
          />
        ) : null}

        {Platform.OS === 'ios' ? (
          <Modal
            visible={editingCalendarField != null}
            transparent
            animationType="slide"
            onRequestClose={() => setEditingCalendarField(null)}>
            <View style={styles.timeModalOverlay}>
              <View style={styles.timeModalCard}>
                <Text style={styles.timeModalTitle}>
                  {editingCalendarField === 'start' ? 'Select start date' : 'Select end date'}
                </Text>
                {editingCalendarValue ? (
                  <DateTimePicker
                    value={editingCalendarValue}
                    mode="date"
                    display="spinner"
                    themeVariant="light"
                    onChange={handleCalendarChange}
                    minimumDate={editingCalendarField === 'end' ? startDateValue : undefined}
                  />
                ) : null}
                <Pressable style={styles.timeDoneBtn} onPress={() => setEditingCalendarField(null)}>
                  <Text style={styles.timeDoneText}>Done</Text>
                </Pressable>
              </View>
            </View>
          </Modal>
        ) : null}

        <Text style={styles.sectionLabel}>
          Notify via <Text style={styles.required}>*</Text>
        </Text>
        <View style={styles.notifyCard}>
          <View style={styles.notifyRow}>
            <View style={styles.notifyLeft}>
              <Ionicons name="notifications" size={20} color={Colors.primary} />
              <Text style={styles.notifyLabel}>Push notification</Text>
            </View>
            <Switch
              value={notifyPush}
              onValueChange={setNotifyPush}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor={Colors.white}
            />
          </View>
          <View style={[styles.notifyRow, !WHATSAPP_ENABLED && styles.notifyRowLast]}>
            <View style={styles.notifyLeft}>
              <Ionicons name="chatbubble-ellipses" size={20} color={Colors.primary} />
              <Text style={styles.notifyLabel}>SMS</Text>
            </View>
            <Switch
              value={notifySms}
              onValueChange={setNotifySms}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor={Colors.white}
            />
          </View>
          {WHATSAPP_ENABLED ? (
          <View style={[styles.notifyRow, styles.notifyRowLast]}>
            <View style={styles.notifyLeft}>
              <AppImage source={Images.icons.whatsapp} size={22} />
              <Text style={styles.notifyLabel}>WhatsApp</Text>
            </View>
            <Switch
              value={notifyWhatsapp}
              onValueChange={setNotifyWhatsapp}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor={Colors.white}
            />
          </View>
          ) : null}
        </View>

        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.sectionLabel}>
              Start Date <Text style={styles.required}>*</Text>
            </Text>
            <Pressable
              style={styles.dateField}
              onPress={handleOpenStartDatePicker}
              accessibilityRole="button"
              accessibilityLabel="Select start date">
              <View style={styles.timeIconBox}>
                <Ionicons name="calendar" size={18} color={Colors.primary} />
              </View>
              <Text style={styles.timeValue}>{startDate}</Text>
              <Ionicons name="chevron-down" size={18} color={Colors.textMuted} />
            </Pressable>
          </View>
          <View style={styles.half}>
            <Text style={styles.sectionLabel}>End Date</Text>
            <Pressable
              style={styles.dateField}
              onPress={handleOpenEndDatePicker}
              accessibilityRole="button"
              accessibilityLabel="Select end date">
              <View style={styles.timeIconBox}>
                <Ionicons name="calendar" size={18} color={Colors.primary} />
              </View>
              <Text style={styles.timeValue}>{endDate || 'Ongoing'}</Text>
              <Ionicons name="chevron-down" size={18} color={Colors.textMuted} />
            </Pressable>
            {endDateValue ? (
              <Pressable
                style={styles.clearEndDateBtn}
                onPress={() => setEndDateValue(null)}
                accessibilityRole="button"
                accessibilityLabel="Clear end date">
                <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
                <Text style={styles.clearEndDateText}>Clear</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <FormInput
          label="Notes (Optional)"
          icon="chatbubble-outline"
          placeholder="Add any additional notes"
          value={notes}
          onChangeText={setNotes}
        />

        <View style={styles.securityBox}>
          <AppImage source={Images.icons.security} size={48} />
          <View style={styles.securityText}>
            <Text style={styles.securityTitle}>Your health data is safe with us</Text>
            <Text style={styles.securitySub}>
              All your information is encrypted and stored securely. We never share your data with
              third parties.
            </Text>
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
              <Ionicons name="alarm-outline" size={20} color={Colors.white} />
              <Text style={styles.saveBtnText}>Save Medicine & Reminder</Text>
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
  titleRow: { flexDirection: 'row', gap: Spacing.lg, marginBottom: Spacing.xl },
  titleIcon: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 22, fontWeight: '800', color: Colors.primary },
  subtitle: { fontSize: 13, color: Colors.textMuted, marginTop: 4, lineHeight: 20 },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.navy,
    marginTop: Spacing.sm,
    marginBottom: 4,
  },
  sectionHint: { fontSize: 13, color: Colors.textMuted, marginBottom: Spacing.md },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: Colors.navy, marginBottom: Spacing.sm },
  required: { color: Colors.primary },
  emptyPatient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  emptyPatientText: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
  patientRow: { marginBottom: Spacing.lg },
  selectPatientHint: { fontSize: 12, color: Colors.warning, marginTop: -Spacing.md, marginBottom: Spacing.lg, fontWeight: '600' },
  patientChip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginRight: Spacing.sm,
    backgroundColor: Colors.white,
  },
  patientChipActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  patientChipText: { fontSize: 13, color: Colors.textSecondary },
  patientChipTextActive: { color: Colors.primary, fontWeight: '700' },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
  },
  typeChipActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  typeCheck: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  typeCheckActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  typeChipText: { fontSize: 13, color: Colors.textSecondary },
  typeChipTextActive: { color: Colors.primary, fontWeight: '700' },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  timeField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    minHeight: 52,
  },
  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    minHeight: 52,
    marginBottom: Spacing.lg,
  },
  clearEndDateBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: -Spacing.md,
    marginBottom: Spacing.lg,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  clearEndDateText: { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },
  timeIconBox: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  timeValue: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  removeTimeBtn: {
    width: 44,
    height: 52,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTimeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
    marginTop: Spacing.xs,
  },
  addTimeText: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  notifyCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
  notifyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  notifyRowLast: { borderBottomWidth: 0 },
  notifyLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  notifyLabel: { fontSize: 14, fontWeight: '600', color: Colors.navy },
  timeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  timeModalCard: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    padding: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  timeModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.navy,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  timeDoneBtn: {
    marginTop: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  timeDoneText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  row: { flexDirection: 'row', gap: Spacing.md },
  half: { flex: 1 },
  securityBox: {
    flexDirection: 'row',
    gap: Spacing.md,
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  securityText: { flex: 1 },
  securityTitle: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  securitySub: { fontSize: 12, color: Colors.textSecondary, marginTop: 4, lineHeight: 18 },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.md,
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: Colors.white },
});
