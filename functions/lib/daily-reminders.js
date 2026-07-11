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
exports.runDailyReminderGeneration = void 0;
const admin = __importStar(require("firebase-admin"));
const features_1 = require("./features");
const getTodayIso = () => new Date().toISOString().slice(0, 10);
const formatDisplayDate = () => new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const parseCalendarDate = (value) => {
    const trimmed = value?.trim();
    if (!trimmed || trimmed.toLowerCase() === 'ongoing')
        return null;
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime()))
        return null;
    parsed.setHours(0, 0, 0, 0);
    return parsed;
};
const isMedicineScheduledOnDay = (medicine, day = new Date()) => {
    if (medicine.status !== 'active')
        return false;
    const checkDay = new Date(day);
    checkDay.setHours(0, 0, 0, 0);
    const start = parseCalendarDate(medicine.startDate);
    if (start && checkDay.getTime() < start.getTime())
        return false;
    const end = parseCalendarDate(medicine.endDate);
    if (end && checkDay.getTime() > end.getTime())
        return false;
    return true;
};
const getMedicineScheduleTimes = (medicine) => {
    if (Array.isArray(medicine.scheduleTimes) && medicine.scheduleTimes.length > 0) {
        return medicine.scheduleTimes.filter(Boolean);
    }
    const fromNext = String(medicine.nextReminder ?? '').replace(/^Today,\s*/i, '').trim();
    if (!fromNext || fromNext === 'Not scheduled' || fromNext === '—') {
        return [];
    }
    return [fromNext];
};
const medicineLabel = (medicine) => `${medicine.name ?? 'Medicine'} ${medicine.strength ?? ''}`.trim();
const reminderInstructions = (medicine) => `${medicine.dosage ?? '1 dose'} • ${medicine.instructions || 'As directed'}`;
const parseClock = (timeLabel) => {
    const match = timeLabel.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match)
        return null;
    let hour = Number(match[1]);
    const minute = Number(match[2]);
    const period = match[3].toUpperCase();
    if (period === 'PM' && hour < 12)
        hour += 12;
    if (period === 'AM' && hour === 12)
        hour = 0;
    return { hour, minute };
};
const scheduledAtMsForToday = (timeLabel) => {
    const parsed = parseClock(timeLabel);
    if (!parsed)
        return null;
    const due = new Date();
    due.setHours(parsed.hour, parsed.minute, 0, 0);
    return due.getTime();
};
const reminderSlotExists = async (db, userId, params) => {
    let queryRef = db
        .collection(`users/${userId}/reminders`)
        .where('scheduledDate', '==', params.scheduledDate)
        .where('time', '==', params.time);
    if (params.sharedHelperReminder && params.originalMedicineId) {
        queryRef = queryRef
            .where('originalMedicineId', '==', params.originalMedicineId)
            .where('sharedHelperReminder', '==', true);
    }
    else if (params.medicineId) {
        queryRef = queryRef.where('medicineId', '==', params.medicineId);
    }
    else if (params.originalMedicineId) {
        queryRef = queryRef.where('originalMedicineId', '==', params.originalMedicineId);
    }
    const snap = await queryRef.limit(1).get();
    return !snap.empty;
};
const getContactProfile = async (db, uid) => {
    const snap = await db.doc(`userContacts/${uid}`).get();
    if (!snap.exists)
        return null;
    const data = snap.data() ?? {};
    return {
        whatsapp: data.whatsapp ? String(data.whatsapp) : undefined,
        onWhatsapp: Boolean(data.onWhatsapp),
    };
};
const collectWhatsappRecipients = async (db, params) => {
    const recipients = new Set();
    if (params.caretakerProfile?.onWhatsapp && params.caretakerProfile.whatsapp?.trim()) {
        recipients.add(params.caretakerProfile.whatsapp.trim());
    }
    if (params.patient.onPlatform && params.patient.linkedUserId) {
        const patientProfile = await getContactProfile(db, params.patient.linkedUserId);
        if (patientProfile?.onWhatsapp && patientProfile.whatsapp?.trim()) {
            recipients.add(patientProfile.whatsapp.trim());
        }
    }
    for (const helper of params.helpers ?? []) {
        if (helper.onPlatform && helper.linkedUserId) {
            const helperProfile = await getContactProfile(db, helper.linkedUserId);
            if (helperProfile?.onWhatsapp && helperProfile.whatsapp?.trim()) {
                recipients.add(helperProfile.whatsapp.trim());
            }
            continue;
        }
        if (helper.notifyVia === 'whatsapp' && helper.whatsapp?.trim()) {
            recipients.add(helper.whatsapp.trim());
        }
    }
    return Array.from(recipients);
};
const runDailyReminderGeneration = async () => {
    const db = admin.firestore();
    const scheduledDate = getTodayIso();
    const displayDate = formatDisplayDate();
    const today = new Date();
    const medicinesSnap = await db.collectionGroup('medicines').where('status', '==', 'active').get();
    if (medicinesSnap.empty) {
        return;
    }
    for (const medicineDoc of medicinesSnap.docs) {
        const medicine = medicineDoc.data();
        if (!isMedicineScheduledOnDay(medicine, today)) {
            continue;
        }
        const userId = medicineDoc.ref.parent.parent?.id;
        if (!userId)
            continue;
        const medicineId = medicineDoc.id;
        const times = getMedicineScheduleTimes(medicine);
        if (times.length === 0)
            continue;
        if (medicine.sharedHelperMedicine) {
            for (const time of times) {
                const exists = await reminderSlotExists(db, userId, {
                    scheduledDate,
                    time,
                    medicineId,
                });
                if (exists)
                    continue;
                await db.collection(`users/${userId}/reminders`).add({
                    time,
                    date: displayDate,
                    scheduledDate,
                    medicine: medicineLabel(medicine),
                    patient: medicine.patientName ?? 'Patient',
                    patientId: medicine.patientId ?? null,
                    medicineId,
                    originalMedicineId: medicine.originalMedicineId ?? null,
                    instructions: reminderInstructions(medicine),
                    status: 'upcoming',
                    icon: 'sunny',
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
            continue;
        }
        for (const time of times) {
            const ownerExists = await reminderSlotExists(db, userId, {
                scheduledDate,
                time,
                medicineId,
            });
            if (!ownerExists) {
                await db.collection(`users/${userId}/reminders`).add({
                    time,
                    date: displayDate,
                    scheduledDate,
                    medicine: medicineLabel(medicine),
                    patient: medicine.patientName ?? 'Patient',
                    patientId: medicine.patientId ?? null,
                    medicineId,
                    instructions: reminderInstructions(medicine),
                    status: 'upcoming',
                    icon: 'sunny',
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
        }
        if (medicine.patientId) {
            const patientSnap = await db.doc(`users/${userId}/patients/${medicine.patientId}`).get();
            if (!patientSnap.exists)
                continue;
            const patient = patientSnap.data();
            for (const time of times) {
                for (const helper of patient.helpers ?? []) {
                    if (!helper.onPlatform || !helper.linkedUserId)
                        continue;
                    const helperExists = await reminderSlotExists(db, helper.linkedUserId, {
                        scheduledDate,
                        time,
                        originalMedicineId: medicineId,
                        sharedHelperReminder: true,
                    });
                    if (helperExists)
                        continue;
                    await db.collection(`users/${helper.linkedUserId}/reminders`).add({
                        time,
                        date: displayDate,
                        scheduledDate,
                        medicine: medicineLabel(medicine),
                        patient: patient.name ?? medicine.patientName ?? 'Patient',
                        patientId: medicine.patientId,
                        instructions: reminderInstructions(medicine),
                        status: 'upcoming',
                        icon: 'sunny',
                        sharedHelperReminder: true,
                        sharedToUid: helper.linkedUserId,
                        addedByUid: userId,
                        originalMedicineId: medicineId,
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                }
            }
            if (features_1.WHATSAPP_ENABLED && medicine.notifyWhatsapp && medicine.dailyWhatsappDate !== scheduledDate) {
                const caretakerProfile = await getContactProfile(db, userId);
                const recipients = await collectWhatsappRecipients(db, {
                    patient,
                    caretakerProfile,
                    helpers: patient.helpers,
                });
                if (recipients.length > 0) {
                    for (const time of times) {
                        const scheduledAtMs = scheduledAtMsForToday(time);
                        if (!scheduledAtMs)
                            continue;
                        const body = `Reminder: ${medicineLabel(medicine)} for ${patient.name ?? medicine.patientName} at ${time}. ${reminderInstructions(medicine)}`;
                        for (const to of recipients) {
                            await db.collection('whatsappQueue').add({
                                type: 'medicine_reminder',
                                to,
                                body,
                                scheduledAtMs,
                                status: 'pending',
                                caretakerUid: userId,
                                meta: {
                                    patientId: medicine.patientId,
                                    patientName: patient.name ?? medicine.patientName,
                                    medicineId,
                                    medicine: medicineLabel(medicine),
                                    time,
                                    scheduledDate,
                                },
                                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                            });
                        }
                    }
                    await medicineDoc.ref.set({
                        dailyWhatsappDate: scheduledDate,
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    }, { merge: true });
                }
            }
        }
    }
};
exports.runDailyReminderGeneration = runDailyReminderGeneration;
