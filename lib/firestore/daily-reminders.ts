import type { Medicine, Patient } from '@/constants/mock-data';
import { WHATSAPP_ENABLED } from '@/constants/features';

import { timeOfDayFromClock, updateMedicine } from '@/lib/firestore/medicines';
import {
  addReminder,
  deleteReminder,
  getTodayIso,
  reminderSlotExists,
  type ReminderInput,
  type ReminderRecord,
} from '@/lib/firestore/reminders';
import {
  collectWhatsappRecipients,
  queueWhatsappMessage,
  scheduledAtMsForToday,
} from '@/lib/firestore/whatsapp';

export const formatDisplayDate = (date = new Date()) =>
  date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export const parseCalendarDate = (value: string): Date | null => {
  const trimmed = value?.trim();
  if (!trimmed || trimmed.toLowerCase() === 'ongoing') return null;

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;

  parsed.setHours(0, 0, 0, 0);
  return parsed;
};

export const isMedicineScheduledOnDay = (medicine: Medicine, day = new Date()): boolean => {
  if (medicine.status !== 'active') return false;

  const checkDay = new Date(day);
  checkDay.setHours(0, 0, 0, 0);

  const start = parseCalendarDate(medicine.startDate);
  if (start && checkDay.getTime() < start.getTime()) return false;

  const end = parseCalendarDate(medicine.endDate);
  if (end && checkDay.getTime() > end.getTime()) return false;

  return true;
};

export const getMedicineScheduleTimes = (medicine: Medicine): string[] => {
  if (medicine.scheduleTimes?.length) {
    return medicine.scheduleTimes.filter(Boolean);
  }

  const fromNext = medicine.nextReminder.replace(/^Today,\s*/i, '').trim();
  if (!fromNext || fromNext === 'Not scheduled' || fromNext === '—') {
    return [];
  }

  return [fromNext];
};

export const iconForScheduleTime = (time: string) => {
  const tod = timeOfDayFromClock(time);
  if (tod === 'morning') return 'sunny';
  if (tod === 'afternoon') return 'partly-sunny';
  if (tod === 'evening') return 'cloudy-night';
  return 'moon';
};

const medicineLabel = (medicine: Medicine) => `${medicine.name} ${medicine.strength}`.trim();

const reminderInstructions = (medicine: Medicine) =>
  `${medicine.dosage} • ${medicine.instructions || 'As directed'}`;

export const hasReminderForSlot = (
  reminders: ReminderRecord[],
  params: {
    scheduledDate: string;
    time: string;
    medicineId?: string;
    originalMedicineId?: string;
    sharedHelperReminder?: boolean;
  },
) =>
  reminders.some((reminder) => {
    if (reminder.scheduledDate !== params.scheduledDate || reminder.time !== params.time) {
      return false;
    }

    if (params.sharedHelperReminder) {
      return (
        reminder.sharedHelperReminder === true &&
        reminder.originalMedicineId === params.originalMedicineId
      );
    }

    if (params.medicineId && reminder.medicineId === params.medicineId) {
      return true;
    }

    if (params.originalMedicineId && reminder.originalMedicineId === params.originalMedicineId) {
      return true;
    }

    return false;
  });

const buildOwnerReminderInput = (
  medicine: Medicine,
  time: string,
  scheduledDate: string,
  displayDate: string,
): ReminderInput => ({
  time,
  date: displayDate,
  scheduledDate,
  medicine: medicineLabel(medicine),
  patient: medicine.patientName,
  patientId: medicine.patientId,
  medicineId: medicine.id,
  originalMedicineId: medicine.originalMedicineId,
  instructions: reminderInstructions(medicine),
  status: 'upcoming',
  icon: iconForScheduleTime(time),
});

/** Reminders created from a shared helper medicine copy must carry share metadata for cascade delete. */
const buildHelperMedicineReminderInput = (
  medicine: Medicine,
  time: string,
  scheduledDate: string,
  displayDate: string,
  helperUid: string,
): ReminderInput => ({
  ...buildOwnerReminderInput(medicine, time, scheduledDate, displayDate),
  sharedHelperReminder: true,
  sharedToUid: helperUid,
  addedByUid: medicine.addedByUid,
  originalMedicineId: medicine.originalMedicineId ?? medicine.id,
});

const purgeOrphanHelperReminders = async (
  userId: string,
  medicines: Medicine[],
  reminders: ReminderRecord[],
) => {
  const medicineIds = new Set(medicines.map((medicine) => medicine.id));
  const sharedOriginalIds = new Set(
    medicines
      .filter((medicine) => medicine.sharedHelperMedicine && medicine.originalMedicineId)
      .map((medicine) => medicine.originalMedicineId!),
  );

  await Promise.all(
    reminders.map(async (reminder) => {
      const missingMedicine = Boolean(reminder.medicineId && !medicineIds.has(reminder.medicineId));
      const orphanShared =
        reminder.sharedHelperReminder === true &&
        Boolean(reminder.originalMedicineId) &&
        !sharedOriginalIds.has(reminder.originalMedicineId!) &&
        !(reminder.medicineId && medicineIds.has(reminder.medicineId));

      if (!missingMedicine && !orphanShared) {
        return;
      }

      try {
        await deleteReminder(userId, reminder.id);
      } catch {
        // Best-effort cleanup of leftover helper reminders.
      }
    }),
  );
};

const buildHelperSharedReminderInput = (
  medicine: Medicine,
  patient: Patient,
  time: string,
  scheduledDate: string,
  displayDate: string,
  helperUid: string,
  caretakerUid: string,
): ReminderInput => ({
  time,
  date: displayDate,
  scheduledDate,
  medicine: medicineLabel(medicine),
  patient: patient.name,
  patientId: patient.id,
  instructions: reminderInstructions(medicine),
  status: 'upcoming',
  icon: iconForScheduleTime(time),
  sharedHelperReminder: true,
  sharedToUid: helperUid,
  addedByUid: caretakerUid,
  originalMedicineId: medicine.id,
});

export type SyncDailyRemindersParams = {
  userId: string;
  medicines: Medicine[];
  reminders: ReminderRecord[];
  patients?: Patient[];
  caretakerProfile?: { whatsapp?: string; onWhatsapp?: boolean } | null;
};

/** Ensure today's reminder records exist for all active medicines in the user's schedule window. */
export const syncDailyReminders = async ({
  userId,
  medicines,
  reminders,
  patients = [],
  caretakerProfile,
}: SyncDailyRemindersParams) => {
  const scheduledDate = getTodayIso();
  const displayDate = formatDisplayDate();
  const today = new Date();

  // Remove leftover helper reminders after a caretaker deletes shared medicines/patients.
  await purgeOrphanHelperReminders(userId, medicines, reminders);

  const activeToday = medicines.filter(
    (medicine) => !medicine.sharedHelperMedicine && isMedicineScheduledOnDay(medicine, today),
  );

  const helperMedicinesToday = medicines.filter(
    (medicine) => medicine.sharedHelperMedicine && isMedicineScheduledOnDay(medicine, today),
  );

  for (const medicine of activeToday) {
    const times = getMedicineScheduleTimes(medicine);
    const patient = medicine.patientId
      ? patients.find((item) => item.id === medicine.patientId)
      : undefined;

    for (const time of times) {
      const ownerExists =
        hasReminderForSlot(reminders, {
          scheduledDate,
          time,
          medicineId: medicine.id,
        }) ||
        (await reminderSlotExists(userId, {
          scheduledDate,
          time,
          medicineId: medicine.id,
        }));

      if (!ownerExists) {
        await addReminder(userId, buildOwnerReminderInput(medicine, time, scheduledDate, displayDate));
      }

      if (patient?.helpers?.length) {
        const platformHelpers = patient.helpers.filter(
          (helper) => helper.onPlatform && helper.linkedUserId,
        );

        await Promise.all(
          platformHelpers.map(async (helper) => {
            const helperUid = helper.linkedUserId!;
            const helperExists =
              hasReminderForSlot(reminders, {
                scheduledDate,
                time,
                originalMedicineId: medicine.id,
                sharedHelperReminder: true,
              }) ||
              (await reminderSlotExists(helperUid, {
                scheduledDate,
                time,
                originalMedicineId: medicine.id,
                sharedHelperReminder: true,
              }));

            if (helperExists) {
              return;
            }

            await addReminder(
              helperUid,
              buildHelperSharedReminderInput(
                medicine,
                patient,
                time,
                scheduledDate,
                displayDate,
                helperUid,
                userId,
              ),
            ).catch(() => {
              // Best-effort for helper copies.
            });
          }),
        );
      }
    }

    const whatsappAlreadyQueued = medicine.dailyWhatsappDate === scheduledDate;
    if (WHATSAPP_ENABLED && medicine.notifyWhatsapp && patient && !whatsappAlreadyQueued && times.length > 0) {
      const recipients = await collectWhatsappRecipients({
        patient,
        caretakerProfile,
        helpers: patient.helpers,
      });

      if (recipients.length > 0) {
        await Promise.all(
          times.flatMap((time) => {
            const scheduledAtMs = scheduledAtMsForToday(time);
            if (!scheduledAtMs) return [];

            const body = `Reminder: ${medicineLabel(medicine)} for ${patient.name} at ${time}. ${reminderInstructions(medicine)}`;

            return recipients.map((to) =>
              queueWhatsappMessage({
                caretakerUid: userId,
                type: 'medicine_reminder',
                to,
                body,
                scheduledAtMs,
                meta: {
                  patientId: patient.id,
                  patientName: patient.name,
                  medicineId: medicine.id,
                  medicine: medicineLabel(medicine),
                  time,
                  scheduledDate,
                },
              }).catch(() => {
                // Best-effort per recipient.
              }),
            );
          }),
        );

        await updateMedicine(userId, medicine.id, { dailyWhatsappDate: scheduledDate }).catch(() => {
          // Best-effort marker to avoid duplicate WhatsApp queue entries.
        });
      }
    }
  }

  for (const medicine of helperMedicinesToday) {
    const times = getMedicineScheduleTimes(medicine);

    for (const time of times) {
      const exists =
        hasReminderForSlot(reminders, {
          scheduledDate,
          time,
          medicineId: medicine.id,
          originalMedicineId: medicine.originalMedicineId,
        }) ||
        (await reminderSlotExists(userId, {
          scheduledDate,
          time,
          medicineId: medicine.id,
        }));

      if (exists) {
        continue;
      }

      if (!medicine.addedByUid) {
        continue;
      }

      await addReminder(
        userId,
        buildHelperMedicineReminderInput(medicine, time, scheduledDate, displayDate, userId),
      );
    }
  }
};
