import { addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';

import { db } from '@/lib/firebase';

export type InboxNotification = {
  id: string;
  title: string;
  subtitle: string;
  detail: string;
  time: string;
  status: string;
  statusColor: string;
  statusBg: string;
  icon: string;
  iconColor: string;
  iconBg: string;
  section: 'Today' | 'Yesterday' | 'Earlier';
  unread?: boolean;
  type?: string;
  createdAtMs?: number;
  reminderId?: string;
};

export const userNotificationsPath = (userId: string) => `users/${userId}/notifications` as const;

export const notifyUserAddedAsPatient = async (params: {
  targetUserId: string;
  caretakerUid: string;
  caretakerName: string;
  caretakerEmail?: string;
  patientName: string;
  patientDocId: string;
}) => {
  const { targetUserId, caretakerUid, caretakerName, caretakerEmail, patientName, patientDocId } = params;

  if (!targetUserId || targetUserId === caretakerUid) {
    return;
  }

  await addDoc(collection(db, userNotificationsPath(targetUserId)), {
    type: 'patient_added',
    title: 'Added as a patient',
    subtitle: caretakerName,
    detail: `${caretakerName}${caretakerEmail ? ` (${caretakerEmail})` : ''} added you as a patient on MediReminder.`,
    time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    status: 'New',
    statusColor: '#008B8B',
    statusBg: '#E6F2F2',
    icon: 'person-add',
    iconColor: '#008B8B',
    iconBg: '#E6F2F2',
    section: 'Today',
    unread: true,
    addedByUid: caretakerUid,
    addedByName: caretakerName,
    patientName,
    patientDocId,
    ...(caretakerEmail ? { caretakerEmail } : {}),
    createdAt: serverTimestamp(),
  });
};

export const notifyHelperAssigned = async (params: {
  targetUserId: string;
  caretakerUid: string;
  caretakerName: string;
  caretakerEmail?: string;
  patientName: string;
  patientDocId: string;
  helperName: string;
}) => {
  const {
    targetUserId,
    caretakerUid,
    caretakerName,
    caretakerEmail,
    patientName,
    patientDocId,
    helperName,
  } = params;

  if (!targetUserId || targetUserId === caretakerUid) {
    return;
  }

  await addDoc(collection(db, userNotificationsPath(targetUserId)), {
    type: 'helper_assigned',
    title: 'Assigned as helper',
    subtitle: patientName,
    detail: `${caretakerName}${caretakerEmail ? ` (${caretakerEmail})` : ''} assigned you to help with reminders for ${patientName}.`,
    time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    status: 'New',
    statusColor: '#008B8B',
    statusBg: '#E6F2F2',
    icon: 'people',
    iconColor: '#008B8B',
    iconBg: '#E6F2F2',
    section: 'Today',
    unread: true,
    addedByUid: caretakerUid,
    addedByName: caretakerName,
    patientName,
    patientDocId,
    helperName,
    ...(caretakerEmail ? { caretakerEmail } : {}),
    createdAt: serverTimestamp(),
  });
};

export type HelperReminderParams = {
  patientName: string;
  patientDocId: string;
  medicineId?: string;
  medicine: string;
  time: string;
  instructions: string;
  caretakerUid: string;
  caretakerName: string;
  caretakerEmail?: string;
};

export const notifyHelperReminder = async (
  helper: {
    onPlatform: boolean;
    linkedUserId?: string;
    name: string;
    whatsapp?: string;
    notifyVia: 'app' | 'whatsapp';
  },
  params: HelperReminderParams,
) => {
  if (helper.onPlatform && helper.linkedUserId) {
    await addDoc(collection(db, userNotificationsPath(helper.linkedUserId)), {
      type: 'helper_reminder',
      title: 'Medicine reminder',
      subtitle: params.patientName,
      detail: `${params.medicine} at ${params.time} for ${params.patientName}. ${params.instructions}`,
      time: params.time,
      status: 'Upcoming',
      statusColor: '#008B8B',
      statusBg: '#E6F2F2',
      icon: 'alarm',
      iconColor: '#008B8B',
      iconBg: '#E6F2F2',
      section: 'Today',
      unread: true,
      patientName: params.patientName,
      patientDocId: params.patientDocId,
      medicine: params.medicine,
      instructions: params.instructions,
      addedByUid: params.caretakerUid,
      caretakerName: params.caretakerName,
      ...(params.caretakerEmail ? { caretakerEmail: params.caretakerEmail } : {}),
      createdAt: serverTimestamp(),
    });
    return;
  }

  if (helper.notifyVia === 'whatsapp' && helper.whatsapp) {
    // WhatsApp delivery is queued for backend integration.
    await addDoc(collection(db, 'whatsappQueue'), {
      type: 'helper_reminder',
      to: helper.whatsapp,
      helperName: helper.name,
      patientName: params.patientName,
      patientDocId: params.patientDocId,
      medicine: params.medicine,
      time: params.time,
      instructions: params.instructions,
      caretakerUid: params.caretakerUid,
      caretakerName: params.caretakerName,
      ...(params.caretakerEmail ? { caretakerEmail: params.caretakerEmail } : {}),
      status: 'pending',
      createdAt: serverTimestamp(),
    });
  }
};

export const notifyPatientHelpersForReminder = async (
  helpers: Array<{
    onPlatform: boolean;
    linkedUserId?: string;
    name: string;
    whatsapp?: string;
    notifyVia: 'app' | 'whatsapp';
  }>,
  params: HelperReminderParams,
) => {
  await Promise.all(
    helpers.map((helper) =>
      notifyHelperReminder(helper, params).catch(() => {
        // Continue notifying other helpers if one fails.
      }),
    ),
  );
};

const mapNotification = (id: string, data: Record<string, unknown>): InboxNotification => {
  const createdAt = data.createdAt as { toMillis?: () => number } | undefined;
  const createdAtMs = createdAt?.toMillis?.() ?? Date.now();

  return {
    id,
    title: String(data.title ?? 'Notification'),
    subtitle: String(data.subtitle ?? ''),
    detail: String(data.detail ?? ''),
    time: String(data.time ?? ''),
    status: String(data.status ?? 'New'),
    statusColor: String(data.statusColor ?? '#008B8B'),
    statusBg: String(data.statusBg ?? '#E6F2F2'),
    icon: String(data.icon ?? 'notifications'),
    iconColor: String(data.iconColor ?? '#008B8B'),
    iconBg: String(data.iconBg ?? '#E6F2F2'),
    section: (data.section as InboxNotification['section']) ?? 'Today',
    unread: Boolean(data.unread),
    type: data.type ? String(data.type) : undefined,
    createdAtMs,
  };
};

export const subscribeInboxNotifications = (
  userId: string,
  onData: (items: InboxNotification[]) => void,
  onError?: (error: Error) => void,
) => {
  const notificationsQuery = query(
    collection(db, userNotificationsPath(userId)),
    orderBy('createdAt', 'desc'),
  );

  return onSnapshot(
    notificationsQuery,
    (snapshot) => {
      onData(snapshot.docs.map((docSnap) => mapNotification(docSnap.id, docSnap.data())));
    },
    (error) => onError?.(error),
  );
};

export const markNotificationRead = async (userId: string, notificationId: string) => {
  await updateDoc(doc(db, userNotificationsPath(userId), notificationId), {
    unread: false,
    updatedAt: serverTimestamp(),
  });
};
