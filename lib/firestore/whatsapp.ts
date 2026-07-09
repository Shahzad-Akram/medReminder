import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

import type { Patient, PatientHelper } from '@/constants/mock-data';
import { db } from '@/lib/firebase';
import { getUserProfile } from '@/lib/firestore/user-profile';

export type WhatsappQueueType = 'medicine_reminder' | 'helper_reminder';

export const queueWhatsappMessage = async (input: {
  caretakerUid: string;
  type: WhatsappQueueType;
  to: string;
  body: string;
  scheduledAtMs: number;
  meta?: Record<string, unknown>;
}) => {
  await addDoc(collection(db, 'whatsappQueue'), {
    type: input.type,
    to: input.to,
    body: input.body,
    scheduledAtMs: input.scheduledAtMs,
    status: 'pending',
    caretakerUid: input.caretakerUid,
    ...(input.meta ? { meta: input.meta } : {}),
    createdAt: serverTimestamp(),
  });
};

const parseClock = (timeLabel: string) => {
  const match = timeLabel.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = match[3].toUpperCase();
  if (period === 'PM' && hour < 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;
  return { hour, minute };
};

export const scheduledAtMsForToday = (timeLabel: string) => {
  const parsed = parseClock(timeLabel);
  if (!parsed) return null;
  const now = new Date();
  const due = new Date(now);
  due.setHours(parsed.hour, parsed.minute, 0, 0);
  return due.getTime();
};

const addRecipient = (set: Set<string>, number?: string) => {
  const trimmed = number?.trim();
  if (trimmed) set.add(trimmed);
};

/** Collect WhatsApp numbers that should receive a medicine reminder. */
export const collectWhatsappRecipients = async (params: {
  patient: Patient;
  caretakerProfile?: { whatsapp?: string; onWhatsapp?: boolean } | null;
  helpers?: PatientHelper[];
}) => {
  const recipients = new Set<string>();

  // Caretaker who created the reminder
  if (params.caretakerProfile?.onWhatsapp) {
    addRecipient(recipients, params.caretakerProfile.whatsapp);
  }

  // Patient on platform — use their user profile WhatsApp settings
  if (params.patient.onPlatform && params.patient.linkedUserId) {
    const patientProfile = await getUserProfile(params.patient.linkedUserId);
    if (patientProfile?.onWhatsapp) {
      addRecipient(recipients, patientProfile.whatsapp);
    }
  }

  // Helpers
  for (const helper of params.helpers ?? []) {
    if (helper.onPlatform && helper.linkedUserId) {
      const helperProfile = await getUserProfile(helper.linkedUserId);
      if (helperProfile?.onWhatsapp) {
        addRecipient(recipients, helperProfile.whatsapp);
      }
      continue;
    }

    if (helper.notifyVia === 'whatsapp') {
      addRecipient(recipients, helper.whatsapp);
    }
  }

  return Array.from(recipients);
};

