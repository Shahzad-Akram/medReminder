import { Image, ImageSource } from 'expo-image';
import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

interface AuthHeroImageProps {
  source: ImageSource;
  height?: number;
  style?: ViewStyle;
}

export const AuthHeroImage = ({ source, height = 220, style }: AuthHeroImageProps) => (
  <View style={[styles.container, { height }, style]}>
    <Image
      source={source}
      style={styles.image}
      contentFit="contain"
      accessibilityLabel="Illustration"
    />
  </View>
);

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
