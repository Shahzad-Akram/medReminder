import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret } from 'firebase-functions/params';

admin.initializeApp();

// WhatsApp Cloud API secrets (set via Firebase Functions secrets)
// - WHATSAPP_TOKEN: Permanent access token
// - WHATSAPP_PHONE_NUMBER_ID: Phone number id (not the display number)
// - WHATSAPP_API_VERSION: e.g. "v21.0" (optional)
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
  createdAt?: admin.firestore.Timestamp;
  updatedAt?: admin.firestore.Timestamp;
  lastError?: string;
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
      console.error('Missing WhatsApp secrets. Set WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID.');
      return;
    }

    // Fetch a small batch of due messages
    const snap = await db
      .collection('whatsappQueue')
      .where('status', '==', 'pending')
      .where('scheduledAtMs', '<=', now)
      .orderBy('scheduledAtMs', 'asc')
      .limit(20)
      .get();

    if (snap.empty) {
      return;
    }

    for (const docSnap of snap.docs) {
      const ref = docSnap.ref;
      const data = docSnap.data() as WhatsappQueueDoc;

      // Basic validation
      if (!data.to || !data.body) {
        await ref.set(
          {
            status: 'failed',
            lastError: 'Missing to/body',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
        continue;
      }

      try {
        await sendWhatsappText({
          token,
          phoneNumberId,
          apiVersion,
          to: data.to,
          body: data.body,
        });

        await ref.set(
          {
            status: 'sent',
            lastError: admin.firestore.FieldValue.delete(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      } catch (error) {
        const lastError = error instanceof Error ? error.message : String(error);
        const attempts = Number(data.attempts ?? 0) + 1;
        const status: WhatsappQueueStatus = attempts >= 5 ? 'failed' : 'pending';

        await ref.set(
          {
            status,
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

