import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
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
  sharedHelperReminder:
    data.sharedHelperReminder === undefined ? undefined : Boolean(data.sharedHelperReminder),
  sharedToUid: data.sharedToUid ? String(data.sharedToUid) : undefined,
  addedByUid: data.addedByUid ? String(data.addedByUid) : undefined,
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

const omitUndefined = <T extends Record<string, unknown>>(data: T) =>
  Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)) as {
    [K in keyof T]: Exclude<T[K], undefined>;
  };

export const addReminder = async (userId: string, input: ReminderInput) => {
  const ref = collection(db, userRemindersPath(userId));
  const docRef = await addDoc(ref, {
    ...omitUndefined(input as Record<string, unknown>),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
};

export const reminderSlotExists = async (
  userId: string,
  params: {
    scheduledDate: string;
    time: string;
    medicineId?: string;
    originalMedicineId?: string;
    sharedHelperReminder?: boolean;
  },
) => {
  const ref = collection(db, userRemindersPath(userId));
  const constraints = [
    where('scheduledDate', '==', params.scheduledDate),
    where('time', '==', params.time),
  ];

  if (params.sharedHelperReminder && params.originalMedicineId) {
    constraints.push(where('originalMedicineId', '==', params.originalMedicineId));
    constraints.push(where('sharedHelperReminder', '==', true));
  } else if (params.medicineId) {
    constraints.push(where('medicineId', '==', params.medicineId));
  } else if (params.originalMedicineId) {
    constraints.push(where('originalMedicineId', '==', params.originalMedicineId));
  }

  const snap = await getDocs(query(ref, ...constraints, limit(1)));
  return !snap.empty;
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

export const deleteRemindersByPatientId = async (userId: string, patientId: string) => {
  const q = query(collection(db, userRemindersPath(userId)), where('patientId', '==', patientId));
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
};

export const deleteRemindersByOriginalMedicineId = async (
  userId: string,
  originalMedicineId: string,
  caretakerUid: string,
) => {
  const q = query(
    collection(db, userRemindersPath(userId)),
    where('originalMedicineId', '==', originalMedicineId),
    where('sharedHelperReminder', '==', true),
    where('sharedToUid', '==', userId),
    where('addedByUid', '==', caretakerUid),
  );
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
};

export const deleteSharedRemindersByPatientId = async (
  userId: string,
  patientId: string,
  caretakerUid: string,
) => {
  const q = query(
    collection(db, userRemindersPath(userId)),
    where('patientId', '==', patientId),
    where('sharedHelperReminder', '==', true),
    where('sharedToUid', '==', userId),
    where('addedByUid', '==', caretakerUid),
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
