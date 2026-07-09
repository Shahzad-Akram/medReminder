"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.processWhatsappQueue = void 0;
const admin = __importStar(require("firebase-admin"));
const scheduler_1 = require("firebase-functions/v2/scheduler");
const params_1 = require("firebase-functions/params");
admin.initializeApp();
// WhatsApp Cloud API secrets (set via Firebase Functions secrets)
// - WHATSAPP_TOKEN: Permanent access token
// - WHATSAPP_PHONE_NUMBER_ID: Phone number id (not the display number)
// - WHATSAPP_API_VERSION: e.g. "v21.0" (optional)
const WHATSAPP_TOKEN = (0, params_1.defineSecret)('WHATSAPP_TOKEN');
const WHATSAPP_PHONE_NUMBER_ID = (0, params_1.defineSecret)('WHATSAPP_PHONE_NUMBER_ID');
const WHATSAPP_API_VERSION = (0, params_1.defineSecret)('WHATSAPP_API_VERSION');
const sendWhatsappText = async (params) => {
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
exports.processWhatsappQueue = (0, scheduler_1.onSchedule)({
    schedule: 'every 1 minutes',
    timeZone: 'UTC',
    secrets: [WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_API_VERSION],
    timeoutSeconds: 60,
    memory: '256MiB',
}, async () => {
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
        const data = docSnap.data();
        // Basic validation
        if (!data.to || !data.body) {
            await ref.set({
                status: 'failed',
                lastError: 'Missing to/body',
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
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
            await ref.set({
                status: 'sent',
                lastError: admin.firestore.FieldValue.delete(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
        }
        catch (error) {
            const lastError = error instanceof Error ? error.message : String(error);
            const attempts = Number(data.attempts ?? 0) + 1;
            const status = attempts >= 5 ? 'failed' : 'pending';
            await ref.set({
                status,
                attempts,
                lastError,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
        }
    }
});
