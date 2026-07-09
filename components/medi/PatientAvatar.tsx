import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Images } from '@/constants/images';

interface PatientAvatarProps {
  size?: number;
}

export const PatientAvatar = ({ size = 52 }: PatientAvatarProps) => (
  <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 2 }]}>
    <Image
      source={Images.avatars.elderlyWoman}
      style={{ width: size, height: size, borderRadius: size / 2 }}
      contentFit="cover"
      accessibilityLabel="Patient photo"
    />
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
  },
});
