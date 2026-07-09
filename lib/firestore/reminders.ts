import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

import type { Reminder, ReminderStatus } from '@/constants/mock-data';
import { db } from '@/lib/firebase';

import { userRemindersPath } from './paths';

export type ReminderRecord = Reminder & {
  scheduledDate?: string;
  icon?: string;
  // When a caretaker shares a reminder to a helper account, we write a copy into the helper's
  // `users/{helperUid}/reminders` collection so it shows up like a normal reminder.
  sharedHelperReminder?: boolean;
  sharedToUid?: string;
  addedByUid?: string;
};

export type ReminderInput = Omit<ReminderRecord, 'id'>;

const mapReminderDoc = (id: string, data: Record<string, unknown>): ReminderRecord => ({
  id,
  time: String(data.time ?? ''),
  date: String(data.date ?? ''),
  medicine: String(data.medicine ?? ''),
  patient: String(data.patient ?? ''),
  instructions: String(data.instructions ?? ''),
  status: (data.status as ReminderStatus) ?? 'upcoming',
  snoozeDuration: data.snoozeDuration ? String(data.snoozeDuration) : undefined,
  scheduledDate: data.scheduledDate ? String(data.scheduledDate) : undefined,
  icon: data.icon ? String(data.icon) : undefined,
  patientId: data.patientId ? String(data.patientId) : undefined,
  medicineId: data.medicineId ? String(data.medicineId) : undefined,
  originalMedicineId: data.originalMedicineId ? String(data.originalMedicineId) : undefined,
});

export const subscribeReminders = (
  userId: string,
  onData: (reminders: ReminderRecord[]) => void,
  onError?: (error: Error) => void,
) => {
  const remindersQuery = query(collection(db, userRemindersPath(userId)));

  return onSnapshot(
    remindersQuery,
    (snapshot) => {
      const items = snapshot.docs.map((docSnap) => mapReminderDoc(docSnap.id, docSnap.data()));
      onData(items);
    },
    (error) => onError?.(error),
  );
};

export const addReminder = async (userId: string, input: ReminderInput) => {
  const ref = collection(db, userRemindersPath(userId));
  const docRef = await addDoc(ref, {
    ...input,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
};

export const updateReminderStatus = async (
  userId: string,
  reminderId: string,
  status: ReminderStatus,
  extra?: Partial<ReminderInput>,
) => {
  await updateDoc(doc(db, userRemindersPath(userId), reminderId), {
    status,
    ...extra,
    updatedAt: serverTimestamp(),
  });
};

export const deleteReminder = async (userId: string, reminderId: string) => {
  await deleteDoc(doc(db, userRemindersPath(userId), reminderId));
};

export const deleteRemindersByMedicineId = async (userId: string, medicineId: string) => {
  const q = query(collection(db, userRemindersPath(userId)), where('medicineId', '==', medicineId));
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
};

export const deleteRemindersByOriginalMedicineId = async (userId: string, originalMedicineId: string) => {
  const q = query(
    collection(db, userRemindersPath(userId)),
    where('originalMedicineId', '==', originalMedicineId),
  );
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
};

export const getTodayIso = () => new Date().toISOString().slice(0, 10);

export const filterTodayReminders = (reminders: ReminderRecord[]) => {
  const today = getTodayIso();

  return reminders.filter(
    (reminder) => reminder.scheduledDate === today || reminder.id.startsWith('today-'),
  );
};
