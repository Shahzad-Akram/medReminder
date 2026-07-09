import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

import type { Medicine, Patient, PatientHelper } from '@/constants/mock-data';
import { useAuth } from '@/contexts/auth-context';
import {
  addMedicine,
  deleteMedicinesByOriginalId,
  deleteMedicine,
  type MedicineInput,
  subscribeMedicines,
  updateMedicine,
} from '@/lib/firestore/medicines';
import { addPatient, assignPatientHelper, removePatientHelper, type AssignHelperInput, type PatientInput, subscribePatients } from '@/lib/firestore/patients';
import { notifyPatientHelpersForReminder, type HelperReminderParams } from '@/lib/firestore/inbox';
import {
  addReminder,
  deleteRemindersByMedicineId,
  deleteRemindersByOriginalMedicineId,
  filterTodayReminders,
  subscribeReminders,
  type ReminderInput,
  type ReminderRecord,
  updateReminderStatus,
} from '@/lib/firestore/reminders';
import { seedUserDataIfNeeded } from '@/lib/firestore/seed';
import { syncMedicineNotifications } from '@/lib/notifications';

interface MediDataContextValue {
  patients: Patient[];
  medicines: Medicine[];
  reminders: ReminderRecord[];
  todayReminders: ReminderRecord[];
  loading: boolean;
  error: string | null;
  addPatient: (input: PatientInput) => Promise<{ id: string; onPlatform: boolean; linkedUserId?: string }>;
  assignPatientHelper: (patientId: string, input: AssignHelperInput) => Promise<PatientHelper>;
  removePatientHelper: (patientId: string, helperId: string) => Promise<void>;
  notifyPatientHelpersForReminder: (
    patientId: string,
    params: Omit<HelperReminderParams, 'caretakerUid' | 'caretakerName' | 'caretakerEmail'>,
  ) => Promise<void>;
  shareMedicineToHelpers: (patientId: string, medicineId: string, input: MedicineInput) => Promise<void>;
  deleteMedicineCascade: (medicineId: string) => Promise<void>;
  addMedicine: (input: MedicineInput) => Promise<string>;
  addReminder: (input: ReminderInput) => Promise<string>;
  ensureReminderForNotification: (params: {
    medicineId?: string | null;
    patientId?: string | null;
    time?: string | null;
  }) => Promise<string | null>;
  updateReminderStatus: (
    reminderId: string,
    status: ReminderRecord['status'],
    extra?: Partial<ReminderInput>,
  ) => Promise<void>;
  getReminderById: (id: string) => ReminderRecord | undefined;
  getMedicineById: (id: string) => Medicine | undefined;
  getPatientById: (id: string) => Patient | undefined;
  getMedicinesForPatient: (patientId: string) => Medicine[];
}

const MediDataContext = createContext<MediDataContextValue | null>(null);

const parseReminderDateTime = (dateLabel: string, timeLabel: string) => {
  const date = new Date(dateLabel);
  if (Number.isNaN(date.getTime())) return null;

  const match = timeLabel.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = match[3].toUpperCase();
  if (period === 'PM' && hour < 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;

  const due = new Date(date);
  due.setHours(hour, minute, 0, 0);
  return due;
};

const parseEndDateMaybe = (value: string) => {
  const trimmed = value?.trim();
  if (!trimmed || trimmed.toLowerCase() === 'ongoing') return null;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const isPastDay = (date: Date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime() < today.getTime();
};

const enrichPatients = (patients: Patient[], medicines: Medicine[], todayReminders: ReminderRecord[]): Patient[] =>
  patients.map((patient) => {
    const patientMeds = medicines.filter(
      (m) => m.patientId === patient.id || m.patientName === patient.name,
    );
    const dueToday = todayReminders.filter(
      (r) =>
        (r.patientId === patient.id || r.patient === patient.name) &&
        (r.status === 'upcoming' || r.status === 'late'),
    ).length;
    const related = todayReminders.filter(
      (r) => r.patientId === patient.id || r.patient === patient.name,
    );
    const taken = related.filter((r) => r.status === 'taken').length;
    const adherence =
      related.length > 0 ? Math.round((taken / related.length) * 100) : patient.adherence;

    const nextFromMed = patientMeds.find((m) => m.status === 'active');
    const nextFromReminder = related.find((r) => r.status === 'upcoming' || r.status === 'late');

    return {
      ...patient,
      dueToday,
      adherence,
      nextReminder: nextFromReminder?.time ?? nextFromMed?.nextReminder?.replace(/^Today,\s*/i, '') ?? patient.nextReminder,
      nextDay: nextFromReminder ? 'Today' : nextFromMed?.nextDay ?? patient.nextDay,
    };
  });

export const MediDataProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [reminders, setReminders] = useState<ReminderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const missedMarkedRef = useRef<Set<string>>(new Set());
  const completedMarkedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user) {
      setPatients([]);
      setMedicines([]);
      setReminders([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    let loadedPatients = false;
    let loadedMedicines = false;

    const markReady = () => {
      if (!cancelled && loadedPatients && loadedMedicines) {
        setLoading(false);
      }
    };

    const start = async () => {
      setLoading(true);
      setError(null);

      try {
        await seedUserDataIfNeeded(user.uid);
      } catch (seedError) {
        if (!cancelled) {
          setError(seedError instanceof Error ? seedError.message : 'Failed to load your data.');
        }
      }
    };

    void start();

    const unsubPatients = subscribePatients(
      user.uid,
      (items) => {
        if (!cancelled) {
          setPatients(items);
          loadedPatients = true;
          markReady();
        }
      },
      (subError) => {
        if (!cancelled) {
          setError(subError.message);
          loadedPatients = true;
          markReady();
        }
      },
    );

    const unsubMedicines = subscribeMedicines(
      user.uid,
      (items) => {
        if (!cancelled) {
          setMedicines(items);
          loadedMedicines = true;
          markReady();
          void syncMedicineNotifications(items);
        }
      },
      (subError) => {
        if (!cancelled) {
          setError(subError.message);
          loadedMedicines = true;
          markReady();
        }
      },
    );

    const unsubReminders = subscribeReminders(
      user.uid,
      (items) => {
        if (!cancelled) {
          setReminders(items);
        }
      },
      (subError) => {
        if (!cancelled) {
          setError(subError.message);
        }
      },
    );

    return () => {
      cancelled = true;
      unsubPatients();
      unsubMedicines();
      unsubReminders();
    };
  }, [user?.uid]);

  // Auto-complete medicines when end date has passed, so daily notifications stop.
  useEffect(() => {
    if (!user) {
      completedMarkedRef.current = new Set();
      return;
    }

    const run = async () => {
      const candidates = medicines.filter((m) => m.status === 'active');
      for (const med of candidates) {
        if (completedMarkedRef.current.has(med.id)) continue;
        const end = parseEndDateMaybe(med.endDate);
        if (!end) continue;
        if (!isPastDay(end)) continue;

        completedMarkedRef.current.add(med.id);
        try {
          await updateMedicine(user.uid, med.id, { status: 'completed', daysLeft: 0 });
        } catch {
          // ignore and try later on next run
          completedMarkedRef.current.delete(med.id);
        }
      }
    };

    void run();
    const interval = setInterval(() => void run(), 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user, medicines]);

  // Auto-mark reminders as missed after 1 hour if not taken/skipped.
  useEffect(() => {
    if (!user) {
      missedMarkedRef.current = new Set();
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const thresholdMs = 60 * 60 * 1000;

      const candidates = reminders.filter((r) =>
        r.status === 'upcoming' || r.status === 'late' || r.status === 'snoozed'
      );

      for (const reminder of candidates) {
        if (missedMarkedRef.current.has(reminder.id)) continue;

        const due = parseReminderDateTime(reminder.date, reminder.time);
        if (!due) continue;

        if (now - due.getTime() >= thresholdMs) {
          missedMarkedRef.current.add(reminder.id);
          void updateReminderStatus(user.uid, reminder.id, 'missed');
        }
      }
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, [user, reminders]);

  const todayReminders = useMemo(() => {
    const now = Date.now();
    return filterTodayReminders(reminders).map((reminder) => {
      if (reminder.status !== 'upcoming') {
        return reminder;
      }

      const due = parseReminderDateTime(reminder.date, reminder.time);
      if (!due) {
        return reminder;
      }

      if (now > due.getTime()) {
        return { ...reminder, status: 'late' as const };
      }

      return reminder;
    });
  }, [reminders]);

  const patientsWithStats = useMemo(
    () => enrichPatients(patients, medicines, todayReminders),
    [patients, medicines, todayReminders],
  );

  const value = useMemo<MediDataContextValue>(
    () => ({
      patients: patientsWithStats,
      medicines,
      reminders,
      todayReminders,
      loading,
      error,
      addPatient: async (input) => {
        if (!user) {
          throw new Error('You must be signed in to add a patient.');
        }

        return addPatient(user.uid, {
          ...input,
          caretakerName: input.caretakerName ?? user.displayName ?? user.email ?? 'A caretaker',
          caretakerEmail: input.caretakerEmail ?? user.email ?? undefined,
        });
      },
      assignPatientHelper: async (patientId, input) => {
        if (!user) {
          throw new Error('You must be signed in to assign a helper.');
        }

        return assignPatientHelper(user.uid, patientId, {
          ...input,
          caretakerName: input.caretakerName ?? user.displayName ?? user.email ?? 'A caretaker',
          caretakerEmail: input.caretakerEmail ?? user.email ?? undefined,
        });
      },
      removePatientHelper: async (patientId, helperId) => {
        if (!user) {
          throw new Error('You must be signed in to remove a helper.');
        }

        await removePatientHelper(user.uid, patientId, helperId);
      },
      notifyPatientHelpersForReminder: async (patientId, params) => {
        if (!user) {
          return;
        }

        const patient = patientsWithStats.find((item) => item.id === patientId);
        if (!patient?.helpers?.length) {
          return;
        }

        // Create "shared" reminder copies inside on-platform helper accounts
        // so reminders appear on their Home/History screens.
        await Promise.all(
          patient.helpers
            .filter((helper) => helper.onPlatform && helper.linkedUserId)
            .map((helper) =>
              addReminder(helper.linkedUserId!, {
                time: params.time,
                date: new Date().toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                }),
                scheduledDate: new Date().toISOString().slice(0, 10),
                medicine: params.medicine,
                patient: params.patientName,
                patientId: patientId,
                instructions: params.instructions,
                status: 'upcoming',
                icon: 'sunny',
                sharedHelperReminder: true,
                sharedToUid: helper.linkedUserId!,
                addedByUid: user.uid,
                originalMedicineId: params.medicineId ?? undefined,
              }).catch(() => {
                // ignore per-helper failures
              }),
            ),
        );

        await notifyPatientHelpersForReminder(patient.helpers, {
          ...params,
          caretakerUid: user.uid,
          caretakerName: user.displayName ?? user.email ?? 'A caretaker',
          caretakerEmail: user.email ?? undefined,
        });
      },
      shareMedicineToHelpers: async (patientId, medicineId, input) => {
        if (!user) {
          return;
        }

        const patient = patientsWithStats.find((item) => item.id === patientId);
        if (!patient?.helpers?.length) {
          return;
        }

        const helperUids = patient.helpers
          .filter((h) => h.onPlatform && h.linkedUserId)
          .map((h) => h.linkedUserId!)
          .filter(Boolean);

        if (helperUids.length === 0) return;

        await Promise.all(
          helperUids.map((helperUid) =>
            addMedicine(helperUid, {
              ...input,
              sharedHelperMedicine: true,
              sharedToUid: helperUid,
              addedByUid: user.uid,
              originalMedicineId: medicineId,
            }).catch(() => {
              // ignore per-helper failures
            }),
          ),
        );
      },
      deleteMedicineCascade: async (medicineId) => {
        if (!user) {
          throw new Error('You must be signed in to delete a medicine.');
        }

        const medicine = medicines.find((m) => m.id === medicineId);
        if (!medicine) {
          return;
        }

        const patient = medicine.patientId ? patientsWithStats.find((p) => p.id === medicine.patientId) : undefined;
        const helperUids =
          patient?.helpers
            ?.filter((h) => h.onPlatform && h.linkedUserId)
            .map((h) => h.linkedUserId!)
            .filter(Boolean) ?? [];

        // Delete caretaker's reminders + medicine (this must succeed)
        await deleteRemindersByMedicineId(user.uid, medicineId);
        await updateMedicine(user.uid, medicineId, { status: 'completed', daysLeft: 0 }).catch(() => {});
        await deleteMedicine(user.uid, medicineId);

        // Delete helper copies (best-effort: helper rules/network can fail, but caretaker delete should still succeed)
        await Promise.all(
          helperUids.map(async (helperUid) => {
            try {
              await deleteMedicinesByOriginalId(helperUid, medicineId);
            } catch {}
            try {
              await deleteRemindersByOriginalMedicineId(helperUid, medicineId);
            } catch {}
          }),
        );
      },
      addMedicine: async (input) => {
        if (!user) {
          throw new Error('You must be signed in to add a medicine.');
        }

        return addMedicine(user.uid, input);
      },
      addReminder: async (input) => {
        if (!user) {
          throw new Error('You must be signed in to add a reminder.');
        }

        return addReminder(user.uid, input);
      },
      ensureReminderForNotification: async ({ medicineId, patientId, time }) => {
        if (!user) {
          return null;
        }

        const safeMedicineId = medicineId ? String(medicineId) : '';
        const safePatientId = patientId ? String(patientId) : '';
        const safeTime = time ? String(time) : '';
        if (!safeTime) return null;

        const todayIso = new Date().toISOString().slice(0, 10);
        const existing = reminders.find(
          (r) =>
            r.scheduledDate === todayIso &&
            r.time === safeTime &&
            (safeMedicineId ? r.medicineId === safeMedicineId : true) &&
            (safePatientId ? r.patientId === safePatientId : true),
        );

        if (existing) {
          return existing.id;
        }

        const medicine = safeMedicineId ? medicines.find((m) => m.id === safeMedicineId) : undefined;
        const patient = safePatientId ? patientsWithStats.find((p) => p.id === safePatientId) : undefined;

        const displayDate = new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });

        const createdId = await addReminder(user.uid, {
          time: safeTime,
          date: displayDate,
          scheduledDate: todayIso,
          medicine: medicine ? `${medicine.name} ${medicine.strength}` : 'Medicine',
          patient: patient?.name ?? 'Patient',
          patientId: safePatientId || undefined,
          medicineId: safeMedicineId || undefined,
          instructions: medicine?.dosage
            ? `${medicine.dosage} • ${medicine.instructions || 'As directed'}`
            : 'As directed',
          status: 'upcoming',
          icon: medicine?.timeOfDay === 'night' ? 'moon' : 'sunny',
        });

        return createdId;
      },
      updateReminderStatus: async (reminderId, status, extra) => {
        if (!user) {
          throw new Error('You must be signed in to update reminders.');
        }

        await updateReminderStatus(user.uid, reminderId, status, extra);
      },
      getReminderById: (id) => reminders.find((reminder) => reminder.id === id),
      getMedicineById: (id) => medicines.find((medicine) => medicine.id === id),
      getPatientById: (id) => patientsWithStats.find((patient) => patient.id === id),
      getMedicinesForPatient: (patientId) =>
        medicines.filter((medicine) => medicine.patientId === patientId),
    }),
    [patientsWithStats, medicines, reminders, todayReminders, loading, error, user],
  );

  return <MediDataContext.Provider value={value}>{children}</MediDataContext.Provider>;
};

export const useMediData = () => {
  const context = useContext(MediDataContext);

  if (!context) {
    throw new Error('useMediData must be used within a MediDataProvider');
  }

  return context;
};
