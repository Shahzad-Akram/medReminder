import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppLogo, AppImage, LogoSizes } from '@/components/medi/AppLogo';
import { Colors, Spacing } from '@/constants/colors';
import { Images } from '@/constants/images';

interface AppHeaderProps {
  showNotification?: boolean;
  notificationCount?: number;
  onNotificationPress?: () => void;
}

export const AppHeader = ({
  showNotification = true,
  notificationCount = 1,
  onNotificationPress,
}: AppHeaderProps) => {
  const insets = useSafeAreaInsets();

  const handleNotification = () => {
    if (onNotificationPress) {
      onNotificationPress();
    } else {
      router.push('/notifications');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.sm }]}>
      <View style={styles.logoWrap}>
        <AppLogo size="header" style={styles.logo} />
      </View>
      {showNotification && (
        <Pressable onPress={handleNotification} style={styles.bellBtn} accessibilityLabel="Notifications">
          <AppImage source={Images.icons.bell} size={36} accessibilityLabel="Notifications" />
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.white,
    gap: Spacing.md,
  },
  logoWrap: {
    flex: 1,
    minHeight: LogoSizes.header.height,
    justifyContent: 'center',
  },
  logo: {
    width: '100%',
    maxWidth: LogoSizes.header.width,
  },
  bellBtn: {
    padding: Spacing.xs,
  },
});
