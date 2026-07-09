import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';

import type { Patient, PatientGender, PatientHelper } from '@/constants/mock-data';
import { db } from '@/lib/firebase';
import { checkEmailOnPlatform, normalizeEmail } from '@/lib/firestore/email-lookup';
import { notifyHelperAssigned, notifyUserAddedAsPatient } from '@/lib/firestore/inbox';

import { userPatientsPath } from './paths';

export type PatientInput = {
  name: string;
  relationship: string;
  relationshipColor?: string;
  age: number;
  gender?: PatientGender | string;
  email?: string;
  phone?: string;
  bloodGroup?: string;
  notes?: string;
  patientId?: string;
  /** Caretaker info used to notify on-platform patients */
  caretakerName?: string;
  caretakerEmail?: string;
};

const RELATIONSHIP_COLORS: Record<string, string> = {
  Self: '#008B8B',
  Spouse: '#7C3AED',
  Son: '#2B78D4',
  Daughter: '#27AE60',
  Father: '#F2994A',
  Mother: '#7C3AED',
  Sister: '#27AE60',
  Brother: '#2B78D4',
  Other: '#008B8B',
};

const ColorsFallback = '#008B8B';

export const relationshipColorFor = (relationship: string) =>
  RELATIONSHIP_COLORS[relationship] ?? ColorsFallback;

/** Firestore rejects `undefined` values — drop them before write. */
const omitUndefined = <T extends Record<string, unknown>>(data: T) =>
  Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)) as {
    [K in keyof T]: Exclude<T[K], undefined>;
  };

const mapHelper = (data: Record<string, unknown>): PatientHelper => ({
  id: String(data.id ?? ''),
  name: String(data.name ?? ''),
  email: data.email ? String(data.email) : undefined,
  onPlatform: Boolean(data.onPlatform),
  linkedUserId: data.linkedUserId ? String(data.linkedUserId) : undefined,
  whatsapp: data.whatsapp ? String(data.whatsapp) : undefined,
  notifyVia: data.notifyVia === 'whatsapp' ? 'whatsapp' : 'app',
});

const mapPatientDoc = (id: string, data: Record<string, unknown>): Patient => ({
  id,
  name: String(data.name ?? ''),
  relationship: String(data.relationship ?? 'Other'),
  relationshipColor: String(data.relationshipColor ?? relationshipColorFor(String(data.relationship ?? 'Other'))),
  age: Number(data.age ?? 0),
  gender: data.gender ? String(data.gender) : undefined,
  email: data.email ? String(data.email) : undefined,
  onPlatform: Boolean(data.onPlatform),
  linkedUserId: data.linkedUserId ? String(data.linkedUserId) : undefined,
  phone: data.phone ? String(data.phone) : undefined,
  bloodGroup: data.bloodGroup ? String(data.bloodGroup) : undefined,
  notes: data.notes ? String(data.notes) : undefined,
  nextReminder: String(data.nextReminder ?? '—'),
  nextDay: String(data.nextDay ?? '—'),
  dueToday: Number(data.dueToday ?? 0),
  adherence: Number(data.adherence ?? 0),
  patientId: data.patientId ? String(data.patientId) : undefined,
  helpers: Array.isArray(data.helpers)
    ? data.helpers.map((item) => mapHelper(item as Record<string, unknown>))
    : [],
});

export const subscribePatients = (
  userId: string,
  onData: (patients: Patient[]) => void,
  onError?: (error: Error) => void,
) => {
  const patientsQuery = query(collection(db, userPatientsPath(userId)));

  return onSnapshot(
    patientsQuery,
    (snapshot) => {
      const items = snapshot.docs.map((docSnap) => mapPatientDoc(docSnap.id, docSnap.data()));
      onData(items);
    },
    (error) => onError?.(error),
  );
};

export const addPatient = async (userId: string, input: PatientInput) => {
  const relationship = input.relationship.trim() || 'Other';
  const email = input.email ? normalizeEmail(input.email) : undefined;

  let onPlatform = false;
  let linkedUserId: string | undefined;

  if (email) {
    const lookup = await checkEmailOnPlatform(email);
    onPlatform = lookup.onPlatform;
    linkedUserId = lookup.linkedUserId || undefined;
  }

  const ref = collection(db, userPatientsPath(userId));

  const payload = omitUndefined({
    name: input.name.trim(),
    relationship,
    relationshipColor: input.relationshipColor ?? relationshipColorFor(relationship),
    age: Number(input.age) || 0,
    gender: input.gender?.trim() || undefined,
    email: email || undefined,
    onPlatform,
    linkedUserId: linkedUserId || undefined,
    phone: input.phone?.trim() || undefined,
    bloodGroup: input.bloodGroup?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    patientId: input.patientId?.trim() || undefined,
    nextReminder: 'Not scheduled',
    nextDay: '—',
    dueToday: 0,
    adherence: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const docRef = await addDoc(ref, payload);

  // Notify only when the patient already has a MediReminder account.
  if (onPlatform && linkedUserId) {
    try {
      await notifyUserAddedAsPatient({
        targetUserId: linkedUserId,
        caretakerUid: userId,
        caretakerName: input.caretakerName?.trim() || 'A caretaker',
        caretakerEmail: input.caretakerEmail,
        patientName: input.name.trim(),
        patientDocId: docRef.id,
      });
    } catch {
      // Adding the patient still succeeds even if notification fails.
    }
  }

  return { id: docRef.id, onPlatform, linkedUserId };
};

export const updatePatient = async (
  userId: string,
  patientId: string,
  input: Partial<
    PatientInput & {
      nextReminder: string;
      nextDay: string;
      dueToday: number;
      adherence: number;
      onPlatform: boolean;
      linkedUserId: string;
    }
  >,
) => {
  await updateDoc(
    doc(db, userPatientsPath(userId), patientId),
    omitUndefined({
      ...input,
      updatedAt: serverTimestamp(),
    }),
  );
};

export const deletePatient = async (userId: string, patientId: string) => {
  await deleteDoc(doc(db, userPatientsPath(userId), patientId));
};

export type AssignHelperInput = {
  name: string;
  email: string;
  whatsapp?: string;
  caretakerName?: string;
  caretakerEmail?: string;
};

export const assignPatientHelper = async (
  userId: string,
  patientId: string,
  input: AssignHelperInput,
): Promise<PatientHelper> => {
  const patientRef = doc(db, userPatientsPath(userId), patientId);
  const patientSnap = await getDoc(patientRef);

  if (!patientSnap.exists()) {
    throw new Error('Patient not found.');
  }

  const patientData = patientSnap.data();
  const existingHelpers = Array.isArray(patientData.helpers)
    ? patientData.helpers.map((item) => mapHelper(item as Record<string, unknown>))
    : [];

  const email = normalizeEmail(input.email);
  const lookup = await checkEmailOnPlatform(email);
  const onPlatform = lookup.onPlatform;
  const linkedUserId = lookup.linkedUserId || undefined;

  if (!onPlatform && !input.whatsapp?.trim()) {
    throw new Error('WhatsApp number is required when the helper is not on MediReminder.');
  }

  if (existingHelpers.some((helper) => helper.email?.toLowerCase() === email)) {
    throw new Error('This helper is already assigned to this patient.');
  }

  if (linkedUserId && linkedUserId === userId) {
    throw new Error('You cannot assign yourself as a helper.');
  }

  const helper = omitUndefined({
    id: `helper-${Date.now()}`,
    name: input.name.trim(),
    email,
    onPlatform,
    linkedUserId,
    whatsapp: input.whatsapp?.trim() || undefined,
    notifyVia: onPlatform ? 'app' : 'whatsapp',
  }) as PatientHelper;

  await updateDoc(
    patientRef,
    omitUndefined({
      helpers: [...existingHelpers, helper],
      updatedAt: serverTimestamp(),
    }),
  );

  if (onPlatform && linkedUserId) {
    try {
      await notifyHelperAssigned({
        targetUserId: linkedUserId,
        caretakerUid: userId,
        caretakerName: input.caretakerName?.trim() || 'A caretaker',
        caretakerEmail: input.caretakerEmail,
        patientName: String(patientData.name ?? 'a patient'),
        patientDocId: patientId,
        helperName: helper.name,
      });
    } catch {
      // Assignment still succeeds if notification fails.
    }
  }

  return helper;
};

export const removePatientHelper = async (userId: string, patientId: string, helperId: string) => {
  const patientRef = doc(db, userPatientsPath(userId), patientId);
  const patientSnap = await getDoc(patientRef);

  if (!patientSnap.exists()) {
    throw new Error('Patient not found.');
  }

  const patientData = patientSnap.data();
  const existingHelpers = Array.isArray(patientData.helpers)
    ? patientData.helpers.map((item) => mapHelper(item as Record<string, unknown>))
    : [];

  await updateDoc(
    patientRef,
    omitUndefined({
      helpers: existingHelpers.filter((helper) => helper.id !== helperId),
      updatedAt: serverTimestamp(),
    }),
  );
};
