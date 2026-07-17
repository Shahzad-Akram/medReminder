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

import type { Medicine } from '@/constants/mock-data';
import { db } from '@/lib/firebase';

import { userMedicinesPath } from './paths';

export type MedicineInput = Omit<Medicine, 'id' | 'daysLeft' | 'nextReminder' | 'nextDay'> & {
  nextReminder?: string;
  nextDay?: string;
  daysLeft?: number;
  patientId?: string;
  scheduleTimes?: string[];
};

const mapMedicineDoc = (id: string, data: Record<string, unknown>): Medicine => ({
  id,
  name: String(data.name ?? ''),
  dosage: String(data.dosage ?? ''),
  strength: String(data.strength ?? ''),
  type: String(data.type ?? 'Tablet'),
  instructions: String(data.instructions ?? ''),
  category: String(data.category ?? 'General'),
  description: String(data.description ?? ''),
  startDate: String(data.startDate ?? ''),
  endDate: String(data.endDate ?? ''),
  doctorNote: String(data.doctorNote ?? ''),
  status: (data.status as Medicine['status']) ?? 'active',
  nextReminder: String(data.nextReminder ?? 'Not scheduled'),
  nextDay: String(data.nextDay ?? 'Today'),
  timeOfDay: (data.timeOfDay as Medicine['timeOfDay']) ?? 'morning',
  patientName: String(data.patientName ?? 'Self'),
  patientId: data.patientId ? String(data.patientId) : undefined,
  sharedHelperMedicine: data.sharedHelperMedicine === undefined ? undefined : Boolean(data.sharedHelperMedicine),
  sharedToUid: data.sharedToUid ? String(data.sharedToUid) : undefined,
  addedByUid: data.addedByUid ? String(data.addedByUid) : undefined,
  originalMedicineId: data.originalMedicineId ? String(data.originalMedicineId) : undefined,
  scheduleTimes: Array.isArray(data.scheduleTimes)
    ? data.scheduleTimes.map((t) => String(t))
    : undefined,
  frequency: data.frequency ? String(data.frequency) : undefined,
  notifyPush: data.notifyPush === undefined ? undefined : Boolean(data.notifyPush),
  notifySms: data.notifySms === undefined ? undefined : Boolean(data.notifySms),
  notifyWhatsapp: data.notifyWhatsapp === undefined ? undefined : Boolean(data.notifyWhatsapp),
  dailyWhatsappDate: data.dailyWhatsappDate ? String(data.dailyWhatsappDate) : undefined,
  daysLeft: Number(data.daysLeft ?? 30),
});

export const subscribeMedicines = (
  userId: string,
  onData: (medicines: Medicine[]) => void,
  onError?: (error: Error) => void,
) => {
  const medicinesQuery = query(collection(db, userMedicinesPath(userId)));

  return onSnapshot(
    medicinesQuery,
    (snapshot) => {
      const items = snapshot.docs.map((docSnap) => mapMedicineDoc(docSnap.id, docSnap.data()));
      onData(items);
    },
    (error) => onError?.(error),
  );
};

export const addMedicine = async (userId: string, input: MedicineInput) => {
  const ref = collection(db, userMedicinesPath(userId));
  const scheduleTimes = input.scheduleTimes?.filter(Boolean) ?? [];
  const firstTime = scheduleTimes[0] ?? '8:00 AM';

  const docRef = await addDoc(ref, {
    ...input,
    scheduleTimes,
    status: input.status ?? 'active',
    nextReminder: input.nextReminder ?? `Today, ${firstTime}`,
    nextDay: input.nextDay ?? 'Today',
    daysLeft: input.daysLeft ?? 30,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
};

export const updateMedicine = async (userId: string, medicineId: string, input: Partial<MedicineInput>) => {
  await updateDoc(doc(db, userMedicinesPath(userId), medicineId), {
    ...input,
    updatedAt: serverTimestamp(),
  });
};

export const deleteMedicine = async (userId: string, medicineId: string) => {
  await deleteDoc(doc(db, userMedicinesPath(userId), medicineId));
};

export const deleteMedicinesByOriginalId = async (
  userId: string,
  originalMedicineId: string,
  caretakerUid: string,
) => {
  const q = query(
    collection(db, userMedicinesPath(userId)),
    where('originalMedicineId', '==', originalMedicineId),
    where('sharedHelperMedicine', '==', true),
    where('sharedToUid', '==', userId),
    where('addedByUid', '==', caretakerUid),
  );
  const snap = await getDocs(q);
  const medicineIds = snap.docs.map((d) => d.id);
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  return medicineIds;
};

export const deleteSharedMedicinesByPatientId = async (
  userId: string,
  patientId: string,
  caretakerUid: string,
) => {
  const q = query(
    collection(db, userMedicinesPath(userId)),
    where('patientId', '==', patientId),
    where('sharedHelperMedicine', '==', true),
    where('sharedToUid', '==', userId),
    where('addedByUid', '==', caretakerUid),
  );
  const snap = await getDocs(q);
  const medicineIds = snap.docs.map((d) => d.id);
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  return medicineIds;
};

export const timeOfDayFromClock = (time: string): Medicine['timeOfDay'] => {
  const match = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return 'morning';

  let hour = Number(match[1]);
  const period = match[3].toUpperCase();
  if (period === 'PM' && hour < 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;

  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  if (hour < 20) return 'evening';
  return 'night';
};
