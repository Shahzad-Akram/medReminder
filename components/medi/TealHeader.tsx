import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppLogo, LogoSizes } from '@/components/medi/AppLogo';
import { Colors, Spacing } from '@/constants/colors';

interface TealHeaderProps {
  title: string;
  showBack?: boolean;
  showLogo?: boolean;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightPress?: () => void;
}

export const TealHeader = ({
  title,
  showBack = true,
  showLogo = false,
  rightIcon,
  onRightPress,
}: TealHeaderProps) => {
  const insets = useSafeAreaInsets();
  const showCenteredLogo = showLogo && !title;

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.md }, !showLogo && styles.containerCompact]}>
      <View style={[styles.row, !showLogo && styles.rowCompact]}>
        {showBack ? (
          <Pressable onPress={() => router.back()} style={styles.iconBtn} accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={24} color={Colors.white} />
          </Pressable>
        ) : (
          <View style={styles.iconBtn} />
        )}

        {showCenteredLogo ? (
          <View style={styles.centerSlot}>
            <AppLogo onDark size="teal" style={styles.centerLogo} />
          </View>
        ) : (
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        )}

        {rightIcon ? (
          <Pressable onPress={onRightPress} style={styles.iconBtn} accessibilityLabel="Action">
            <Ionicons name={rightIcon} size={24} color={Colors.white} />
          </Pressable>
        ) : showLogo && title ? (
          <View style={styles.logoSlot}>
            <AppLogo onDark size="compact" />
          </View>
        ) : (
          <View style={styles.iconBtn} />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.primary,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  containerCompact: {
    paddingBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: LogoSizes.teal.height + 16,
  },
  rowCompact: {
    minHeight: 44,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
  centerLogo: {
    width: '100%',
    maxWidth: LogoSizes.teal.width,
  },
  logoSlot: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: LogoSizes.compact.width + 16,
  },
  title: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
});
