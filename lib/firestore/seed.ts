import { collection, doc, getDocs, getDoc, serverTimestamp, writeBatch } from 'firebase/firestore';

import { medicines, patients, reminderHistory, todayReminders } from '@/constants/mock-data';
import type { Medicine, Reminder, ReminderStatus } from '@/constants/mock-data';
import { db } from '@/lib/firebase';

import { userMedicinesPath, userPatientsPath, userProfileDoc, userRemindersPath } from './paths';

const toIsoDate = () => new Date().toISOString().slice(0, 10);

const mapTodayReminder = (
  item: (typeof todayReminders)[number],
): Omit<Reminder, 'id'> & { icon?: string; scheduledDate: string; patientId?: string } => ({
  time: item.time,
  date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  scheduledDate: toIsoDate(),
  medicine: item.medicine,
  patient: 'Self',
  instructions: item.instructions,
  status: item.status as ReminderStatus,
  icon: item.icon,
  patientId: '1',
});

const mapHistoryReminder = (item: Reminder): Omit<Reminder, 'id'> & { scheduledDate: string } => ({
  time: item.time,
  date: item.date,
  scheduledDate: '2025-05-20',
  medicine: item.medicine,
  patient: item.patient,
  instructions: item.instructions,
  status: item.status,
  snoozeDuration: item.snoozeDuration,
});

const mapMedicine = (item: Medicine, patientId?: string): Omit<Medicine, 'id'> => {
  const { id: _id, ...rest } = item;
  return {
    ...rest,
    patientId: patientId ?? rest.patientId,
    scheduleTimes: rest.scheduleTimes ?? [rest.nextReminder.replace(/^Today,\s*/i, '').trim()].filter(Boolean),
  };
};

const seedPatientsOnly = async (userId: string) => {
  const batch = writeBatch(db);
  patients.slice(0, 5).forEach((patient) => {
    const ref = doc(db, userPatientsPath(userId), patient.id);
    const { id: _id, ...rest } = patient;
    batch.set(ref, { ...rest, createdAt: serverTimestamp() });
  });
  await batch.commit();
};

export const seedUserDataIfNeeded = async (userId: string) => {
  const metaRef = doc(db, ...userProfileDoc(userId));
  const metaSnap = await getDoc(metaRef);

  // Existing accounts seeded before patients existed: backfill patients only.
  if (metaSnap.exists() && metaSnap.data()?.seeded) {
    const existingPatients = await getDocs(collection(db, userPatientsPath(userId)));
    if (existingPatients.empty) {
      await seedPatientsOnly(userId);
    }
    return;
  }

  const batch = writeBatch(db);

  patients.slice(0, 5).forEach((patient) => {
    const ref = doc(db, userPatientsPath(userId), patient.id);
    const { id: _id, ...rest } = patient;
    batch.set(ref, { ...rest, createdAt: serverTimestamp() });
  });

  medicines.forEach((medicine, index) => {
    const matched = patients.find((p) => p.name === medicine.patientName);
    const patientId = matched?.id ?? patients[index % 5]?.id;
    const ref = doc(db, userMedicinesPath(userId), medicine.id);
    batch.set(ref, {
      ...mapMedicine(medicine, patientId),
      createdAt: serverTimestamp(),
    });
  });

  todayReminders.forEach((reminder) => {
    const ref = doc(db, userRemindersPath(userId), `today-${reminder.id}`);
    batch.set(ref, { ...mapTodayReminder(reminder), createdAt: serverTimestamp() });
  });

  reminderHistory.forEach((reminder) => {
    const ref = doc(db, userRemindersPath(userId), reminder.id);
    batch.set(ref, { ...mapHistoryReminder(reminder), createdAt: serverTimestamp() });
  });

  batch.set(metaRef, { seeded: true, seededAt: serverTimestamp() }, { merge: true });

  await batch.commit();
};
