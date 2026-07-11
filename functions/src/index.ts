import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';

import { runDailyReminderGeneration } from './daily-reminders';
import { WHATSAPP_ENABLED } from './features';

admin.initializeApp();

/**
 * WhatsApp queue processor — only deployed when WHATSAPP_ENABLED is true.
 * Requires Firebase secrets: WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_API_VERSION
 *
 * To enable later:
 * 1. Set WHATSAPP_ENABLED = true in functions/src/features.ts and constants/features.ts
 * 2. firebase functions:secrets:set WHATSAPP_TOKEN
 * 3. firebase functions:secrets:set WHATSAPP_PHONE_NUMBER_ID
 * 4. firebase functions:secrets:set WHATSAPP_API_VERSION
 * 5. Uncomment the block below and redeploy
 */
/*
import { defineSecret } from 'firebase-functions/params';

const WHATSAPP_TOKEN = defineSecret('WHATSAPP_TOKEN');
const WHATSAPP_PHONE_NUMBER_ID = defineSecret('WHATSAPP_PHONE_NUMBER_ID');
const WHATSAPP_API_VERSION = defineSecret('WHATSAPP_API_VERSION');

type WhatsappQueueStatus = 'pending' | 'sent' | 'failed';

type WhatsappQueueDoc = {
  type: string;
  to: string;
  body: string;
  scheduledAtMs: number;
  status: WhatsappQueueStatus;
  caretakerUid: string;
  attempts?: number;
};

const sendWhatsappText = async (params: {
  token: string;
  phoneNumberId: string;
  apiVersion: string;
  to: string;
  body: string;
}) => {
  const url = `https://graph.facebook.com/${params.apiVersion}/${params.phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: params.to,
      type: 'text',
      text: { body: params.body },
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`WhatsApp API error ${res.status}: ${text}`);
  }
  return res.json().catch(() => ({}));
};

export const processWhatsappQueue = onSchedule(
  {
    schedule: 'every 1 minutes',
    timeZone: 'UTC',
    secrets: [WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_API_VERSION],
    timeoutSeconds: 60,
    memory: '256MiB',
  },
  async () => {
    const db = admin.firestore();
    const now = Date.now();
    const token = WHATSAPP_TOKEN.value();
    const phoneNumberId = WHATSAPP_PHONE_NUMBER_ID.value();
    const apiVersion = WHATSAPP_API_VERSION.value() || 'v21.0';

    if (!token || !phoneNumberId) {
      console.error('Missing WhatsApp secrets.');
      return;
    }

    const snap = await db
      .collection('whatsappQueue')
      .where('status', '==', 'pending')
      .where('scheduledAtMs', '<=', now)
      .orderBy('scheduledAtMs', 'asc')
      .limit(20)
      .get();

    for (const docSnap of snap.docs) {
      const ref = docSnap.ref;
      const data = docSnap.data() as WhatsappQueueDoc;
      if (!data.to || !data.body) {
        await ref.set(
          { status: 'failed', lastError: 'Missing to/body', updatedAt: admin.firestore.FieldValue.serverTimestamp() },
          { merge: true },
        );
        continue;
      }
      try {
        await sendWhatsappText({ token, phoneNumberId, apiVersion, to: data.to, body: data.body });
        await ref.set(
          { status: 'sent', lastError: admin.firestore.FieldValue.delete(), updatedAt: admin.firestore.FieldValue.serverTimestamp() },
          { merge: true },
        );
      } catch (error) {
        const lastError = error instanceof Error ? error.message : String(error);
        const attempts = Number(data.attempts ?? 0) + 1;
        await ref.set(
          {
            status: attempts >= 5 ? 'failed' : 'pending',
            attempts,
            lastError,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      }
    }
  },
);
*/

if (WHATSAPP_ENABLED) {
  console.warn('WHATSAPP_ENABLED is true but processWhatsappQueue is commented out. Uncomment it in functions/src/index.ts.');
}

export const generateDailyReminders = onSchedule(
  {
    schedule: 'every 30 minutes',
    timeZone: 'UTC',
    timeoutSeconds: 120,
    memory: '512MiB',
  },
  async () => {
    await runDailyReminderGeneration();
  },
);
