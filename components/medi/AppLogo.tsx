import { Image } from 'expo-image';
import React from 'react';
import { ImageStyle, StyleSheet, View, ViewStyle } from 'react-native';

import { Colors } from '@/constants/colors';
import { Images } from '@/constants/images';

/** Square asset has large vertical padding — these heights are the visible logo bar. */
export const LogoSizes = {
  compact: { height: 48, width: 150 },
  header: { height: 64, width: 240 },
  teal: { height: 56, width: 220 },
  auth: { height: 80, width: 320 },
  hero: { height: 100, width: 340 },
} as const;

export type LogoSize = keyof typeof LogoSizes;

interface AppLogoProps {
  size?: LogoSize;
  height?: number;
  width?: number | `${number}%`;
  style?: ImageStyle;
  /** White backing for visibility on teal/dark headers */
  onDark?: boolean;
  containerStyle?: ViewStyle;
}

export const AppLogo = ({
  size = 'header',
  height,
  width,
  style,
  onDark = false,
  containerStyle,
}: AppLogoProps) => {
  const preset = LogoSizes[size];
  const logoHeight = height ?? preset.height;
  const logoWidth = width ?? preset.width;

  const logo = (
    <Image
      source={Images.logo.horizontal}
      style={[styles.logo, { height: logoHeight, width: logoWidth }, style]}
      contentFit="cover"
      contentPosition="center"
      accessibilityLabel="MediReminder logo"
    />
  );

  if (!onDark) {
    return logo;
  }

  return (
    <View style={[styles.onDarkWrap, containerStyle]}>
      {logo}
    </View>
  );
};

interface AppImageProps {
  source: number;
  size?: number;
  height?: number;
  width?: number | `${number}%`;
  style?: ImageStyle;
  accessibilityLabel?: string;
}

export const AppImage = ({
  source,
  size = 48,
  height,
  width,
  style,
  accessibilityLabel,
}: AppImageProps) => (
  <Image
    source={source}
    style={[{ width: width ?? size, height: height ?? size }, style]}
    contentFit="contain"
    accessibilityLabel={accessibilityLabel}
  />
);

const styles = StyleSheet.create({
  logo: {
    maxWidth: '100%',
  },
  onDarkWrap: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    overflow: 'hidden',
  },
});
