import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppImage } from '@/components/medi/AppLogo';
import { Colors, Spacing } from '@/constants/colors';
import { Images } from '@/constants/images';

interface SecurityFooterProps {
  text?: string;
  subtext?: string;
}

export const SecurityFooter = ({
  text = 'Your data is secure and private',
  subtext = 'HIPAA-aligned • Encrypted • Trusted',
}: SecurityFooterProps) => (
  <View style={styles.container}>
    <AppImage source={Images.icons.security} size={28} accessibilityLabel="Secure" />
    <View style={styles.textCol}>
      <Text style={styles.text}>{text}</Text>
      {subtext ? <Text style={styles.subtext}>{subtext}</Text> : null}
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  textCol: {
    alignItems: 'center',
    flex: 1,
  },
  text: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  subtext: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
});
