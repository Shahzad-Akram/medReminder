import type { ReminderStatus } from '@/constants/mock-data';
import type { InboxNotification } from '@/lib/firestore/inbox';
import type { ReminderRecord } from '@/lib/firestore/reminders';

export const sectionForTimestamp = (ms: number): InboxNotification['section'] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const date = new Date(ms);
  date.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return 'Earlier';
};

const reminderStatusMeta: Record<
  ReminderStatus,
  { title: string; status: string; statusColor: string; statusBg: string; icon: string; iconColor: string; iconBg: string }
> = {
  upcoming: {
    title: 'Medicine reminder',
    status: 'Upcoming',
    statusColor: '#2B78D4',
    statusBg: '#EBF4FF',
    icon: 'alarm',
    iconColor: '#008B8B',
    iconBg: '#E6F2F2',
  },
  late: {
    title: 'Medicine due now',
    status: 'Due Now',
    statusColor: '#008B8B',
    statusBg: '#E6F2F2',
    icon: 'medical',
    iconColor: '#008B8B',
    iconBg: '#E6F2F2',
  },
  taken: {
    title: 'Dose confirmed',
    status: 'Taken',
    statusColor: '#27AE60',
    statusBg: '#E8F8EF',
    icon: 'checkmark-circle',
    iconColor: '#27AE60',
    iconBg: '#E8F8EF',
  },
  missed: {
    title: 'Missed dose alert',
    status: 'Missed',
    statusColor: '#EB5757',
    statusBg: '#FDEEEE',
    icon: 'alert-circle',
    iconColor: '#EB5757',
    iconBg: '#FDEEEE',
  },
  skipped: {
    title: 'Dose skipped',
    status: 'Skipped',
    statusColor: '#F2994A',
    statusBg: '#FFF4E6',
    icon: 'close-circle',
    iconColor: '#F2994A',
    iconBg: '#FFF4E6',
  },
  snoozed: {
    title: 'Reminder snoozed',
    status: 'Snoozed',
    statusColor: '#7C3AED',
    statusBg: '#F3E8FF',
    icon: 'time',
    iconColor: '#7C3AED',
    iconBg: '#F3E8FF',
  },
};

export const remindersToNotifications = (reminders: ReminderRecord[]): InboxNotification[] =>
  reminders.map((reminder) => {
    const meta = reminderStatusMeta[reminder.status] ?? reminderStatusMeta.upcoming;
    const isActive = reminder.status === 'upcoming' || reminder.status === 'late' || reminder.status === 'missed';

    return {
      id: `reminder-${reminder.id}`,
      title: meta.title,
      subtitle: reminder.medicine,
      detail: `${reminder.patient} · ${reminder.instructions}`,
      time: reminder.time,
      status: meta.status,
      statusColor: meta.statusColor,
      statusBg: meta.statusBg,
      icon: meta.icon,
      iconColor: meta.iconColor,
      iconBg: meta.iconBg,
      section: 'Today',
      unread: isActive,
      type: 'medicine_reminder',
      reminderId: reminder.id,
      createdAtMs: Date.now(),
    };
  });

export type FeedNotification = InboxNotification & {
  reminderId?: string;
};

export const buildNotificationsFeed = (
  inbox: InboxNotification[],
  todayReminders: ReminderRecord[],
): FeedNotification[] => {
  const inboxItems = inbox
    .filter((item) => item.type !== 'helper_reminder')
    .map((item) => ({
      ...item,
      section: item.createdAtMs ? sectionForTimestamp(item.createdAtMs) : item.section,
    }));

  const reminderItems = remindersToNotifications(todayReminders);

  return [...reminderItems, ...inboxItems].sort(
    (a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0),
  );
};

export const countNotificationAlerts = (feed: FeedNotification[]) =>
  feed.filter(
    (item) =>
      item.unread ||
      item.status === 'Due Now' ||
      item.status === 'Missed' ||
      item.status === 'Upcoming',
  ).length;
