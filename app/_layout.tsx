import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { AuthProvider } from '@/contexts/auth-context';
import { MediDataProvider, useMediData } from '@/contexts/medi-data-context';
import { initAnalytics } from '@/lib/firebase';
import { ensureNotificationPermissions } from '@/lib/notifications';

const NotificationRouter = () => {
  const { ensureReminderForNotification } = useMediData();

  useEffect(() => {
    const handleGoToReminder = async (data: Record<string, unknown> | undefined) => {
      if (!data) return;
      if (data.source !== 'medireminder') return;

      const reminderId = typeof data.reminderId === 'string' ? data.reminderId : null;
      const medicineId = typeof data.medicineId === 'string' ? data.medicineId : null;
      const patientId = typeof data.patientId === 'string' ? data.patientId : null;
      const time = typeof data.time === 'string' ? data.time : null;

      const ensuredId = reminderId ?? (await ensureReminderForNotification({ medicineId, patientId, time }));
      if (!ensuredId) return;

      router.push({ pathname: '/active-reminder', params: { reminderId: ensuredId } });
    };

    const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
      // If app is open when the reminder hits, immediately route to detail to ring alarm.
      void handleGoToReminder(notification.request.content.data as Record<string, unknown> | undefined);
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      void handleGoToReminder(response.notification.request.content.data as Record<string, unknown> | undefined);
    });

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, [ensureReminderForNotification]);

  return null;
};

export default function RootLayout() {
  useEffect(() => {
    void initAnalytics();
    void ensureNotificationPermissions();
  }, []);

  return (
    <AuthProvider>
      <MediDataProvider>
      <NotificationRouter />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="reminder-setup" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="reminder-history" />
        <Stack.Screen name="active-reminder" />
        <Stack.Screen name="missed-dose" />
        <Stack.Screen name="message-setup" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="medicine/[id]" />
        <Stack.Screen name="medicine/add" />
        <Stack.Screen name="patient/[id]" />
      </Stack>
      <StatusBar style="auto" />
      </MediDataProvider>
    </AuthProvider>
  );
}
