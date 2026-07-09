import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Medicine } from '@/constants/mock-data';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const parseTimeToHoursMinutes = (time: string): { hour: number; minute: number } | null => {
  const match = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = match[3].toUpperCase();

  if (period === 'PM' && hour < 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;

  return { hour, minute };
};

export const ensureNotificationPermissions = async () => {
  if (Platform.OS === 'web') {
    return false;
  }

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
};

/**
 * Schedules daily local notifications for each active medicine's dose times.
 * Cancels previous MediReminder schedules first so edits don't duplicate.
 */
export const syncMedicineNotifications = async (medicines: Medicine[]) => {
  if (Platform.OS === 'web') {
    return;
  }

  const allowed = await ensureNotificationPermissions();
  if (!allowed) {
    return;
  }

  const existing = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    existing
      .filter((item) => item.content.data?.source === 'medireminder')
      .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)),
  );

  const active = medicines.filter((m) => m.status === 'active');

  for (const medicine of active) {
    const times =
      medicine.scheduleTimes && medicine.scheduleTimes.length > 0
        ? medicine.scheduleTimes
        : [medicine.nextReminder.replace(/^Today,\s*/i, '').trim()].filter(Boolean);

    for (const time of times) {
      const parsed = parseTimeToHoursMinutes(time);
      if (!parsed) continue;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Medicine reminder',
          body: `${medicine.name} ${medicine.strength} for ${medicine.patientName} · ${time}`,
          data: {
            source: 'medireminder',
            medicineId: medicine.id,
            patientId: medicine.patientId ?? null,
            time,
          },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: parsed.hour,
          minute: parsed.minute,
        },
      });
    }
  }
};

export const scheduleSnoozeNotification = async (params: {
  reminderId: string;
  medicineLabel: string;
  patientName: string;
  minutes?: number;
}) => {
  if (Platform.OS === 'web') {
    return;
  }

  const allowed = await ensureNotificationPermissions();
  if (!allowed) {
    return;
  }

  const minutes = params.minutes ?? 15;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Medicine reminder (Snoozed)',
      body: `${params.medicineLabel} for ${params.patientName} · in ${minutes} minutes`,
      data: {
        source: 'medireminder',
        reminderId: params.reminderId,
        snoozed: true,
      },
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: minutes * 60,
      repeats: false,
    },
  });
};
