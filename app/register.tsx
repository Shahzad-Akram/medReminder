import { Ionicons } from '@expo/vector-icons';

import { router } from 'expo-router';

import React, { useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';



import { AuthHeroImage } from '@/components/medi/AuthHeroImage';

import { AppLogo } from '@/components/medi/AppLogo';

import { SecurityFooter } from '@/components/medi/SecurityFooter';

import { Colors, Radius, Spacing } from '@/constants/colors';

import { Images } from '@/constants/images';

import { useAuth } from '@/contexts/auth-context';
import { getFirebaseErrorMessage } from '@/lib/firebase-errors';

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { signUp } = useAuth();

  const [agreed, setAgreed] = useState(false);

  const [showPassword, setShowPassword] = useState(false);

  const [fullName, setFullName] = useState('');

  const [email, setEmail] = useState('');

  const [password, setPassword] = useState('');

  const [confirmPassword, setConfirmPassword] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [onWhatsapp, setOnWhatsapp] = useState(false);
  const [submitting, setSubmitting] = useState(false);



  const handleCreateAccount = async () => {

    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {

      Alert.alert('Missing information', 'Please fill in all fields.');

      return;

    }



    if (password !== confirmPassword) {

      Alert.alert('Password mismatch', 'Password and confirm password must match.');

      return;

    }



    if (password.length < 6) {
      Alert.alert('Weak password', 'Password must be at least 6 characters.');
      return;
    }

    if (onWhatsapp && !whatsapp.trim()) {
      Alert.alert('WhatsApp number required', 'Enter your WhatsApp number or turn off WhatsApp reminders.');
      return;
    }

    setSubmitting(true);

    try {
      await signUp(email, password, fullName, {
        whatsapp: whatsapp.trim() || undefined,
        onWhatsapp,
      });

      router.push('/reminder-setup');

    } catch (error) {

      Alert.alert('Registration failed', getFirebaseErrorMessage(error));

    } finally {

      setSubmitting(false);

    }

  };



  return (

    <ScrollView

      style={styles.container}

      contentContainerStyle={[

        styles.content,

        {

          paddingTop: insets.top + Spacing.lg,

          paddingBottom: insets.bottom + Spacing.xl,

        },

      ]}>

      <View style={styles.logoWrap}>

        <AppLogo size="auth" style={styles.logo} />

      </View>



      <View style={styles.taglineRow}>

        <View style={styles.taglineLine} />

        <Ionicons name="heart" size={12} color={Colors.primary} />

        <View style={styles.taglineLine} />

      </View>

      <Text style={styles.tagline}>Your health journey starts here.</Text>



      <AuthHeroImage source={Images.hero.medication} height={200} />



      <Text style={styles.title}>Let&apos;s get you started!</Text>

      <Text style={styles.subtitle}>Create your account to manage your health with ease.</Text>



      <View style={styles.card}>

        <View style={styles.inputRow}>

          <View style={styles.iconBox}>

            <Ionicons name="person-outline" size={20} color={Colors.primary} />

          </View>

          <TextInput

            style={styles.input}

            placeholder="Full Name"

            placeholderTextColor={Colors.textMuted}

            value={fullName}

            onChangeText={setFullName}

            autoComplete="name"

          />

        </View>



        <View style={styles.inputRow}>

          <View style={styles.iconBox}>

            <Ionicons name="mail-outline" size={20} color={Colors.primary} />

          </View>

          <TextInput

            style={styles.input}

            placeholder="Email"

            placeholderTextColor={Colors.textMuted}

            value={email}

            onChangeText={setEmail}

            autoCapitalize="none"

            keyboardType="email-address"

            autoComplete="email"

          />

        </View>



        <View style={styles.inputRow}>

          <View style={styles.iconBox}>

            <Ionicons name="lock-closed-outline" size={20} color={Colors.primary} />

          </View>

          <TextInput

            style={styles.input}

            placeholder="Password"

            placeholderTextColor={Colors.textMuted}

            secureTextEntry={!showPassword}

            value={password}

            onChangeText={setPassword}

            autoComplete="new-password"

          />

          <Pressable onPress={() => setShowPassword(!showPassword)} accessibilityLabel="Toggle password visibility">

            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color={Colors.primary} />

          </Pressable>

        </View>



        <View style={styles.inputRow}>

          <View style={styles.iconBox}>

            <Ionicons name="lock-closed-outline" size={20} color={Colors.primary} />

          </View>

          <TextInput

            style={styles.input}

            placeholder="Confirm Password"

            placeholderTextColor={Colors.textMuted}

            secureTextEntry={!showPassword}

            value={confirmPassword}

            onChangeText={setConfirmPassword}

            autoComplete="new-password"

          />

        </View>

        <View style={styles.inputRow}>
          <View style={styles.iconBox}>
            <Ionicons name="logo-whatsapp" size={20} color={Colors.primary} />
          </View>
          <TextInput
            style={styles.input}
            placeholder="WhatsApp number (optional)"
            placeholderTextColor={Colors.textMuted}
            value={whatsapp}
            onChangeText={setWhatsapp}
            keyboardType="phone-pad"
            autoComplete="tel"
          />
        </View>

        <View style={styles.whatsappRow}>
          <View style={styles.whatsappTextCol}>
            <Text style={styles.whatsappLabel}>I use WhatsApp on this number</Text>
            <Text style={styles.whatsappHint}>
              {onWhatsapp
                ? 'You will receive medicine reminders on WhatsApp.'
                : 'WhatsApp reminders will not be sent to you.'}
            </Text>
          </View>
          <Switch
            value={onWhatsapp}
            onValueChange={setOnWhatsapp}
            trackColor={{ false: Colors.border, true: Colors.primary }}
            thumbColor={Colors.white}
          />
        </View>

        <Pressable style={styles.checkboxRow} onPress={() => setAgreed(!agreed)}>

          <Ionicons name={agreed ? 'checkbox' : 'square-outline'} size={22} color={Colors.primary} />

          <Text style={styles.agreeText}>

            I agree to the <Text style={styles.link}>Terms of Use</Text> and{' '}

            <Text style={styles.link}>Privacy Policy</Text>

          </Text>

        </Pressable>



        <Pressable

          style={[styles.createBtn, (!agreed || submitting) && styles.createBtnDisabled]}

          onPress={handleCreateAccount}

          disabled={!agreed || submitting}

          accessibilityRole="button">

          {submitting ? (

            <ActivityIndicator color={Colors.white} />

          ) : (

            <>

              <Text style={styles.createBtnText}>Create Account</Text>

              <Ionicons name="chevron-forward" size={20} color={Colors.white} />

            </>

          )}

        </Pressable>



      </View>



      <Pressable onPress={() => router.push('/login')} style={styles.loginRow}>

        <Text style={styles.loginText}>Already have an account? </Text>

        <Text style={styles.loginLink}>Log In ›</Text>

      </Pressable>



      <SecurityFooter />

    </ScrollView>

  );

}



const styles = StyleSheet.create({

  container: { flex: 1, backgroundColor: Colors.background },

  content: { paddingHorizontal: Spacing.xl },

  logoWrap: { alignItems: 'center', marginBottom: Spacing.sm, width: '100%' },

  logo: { width: '100%', maxWidth: 300 },

  taglineRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xs },

  taglineLine: { flex: 1, height: 1, backgroundColor: Colors.border },

  tagline: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', marginBottom: Spacing.md },

  title: { fontSize: 24, fontWeight: '800', color: Colors.navy, marginBottom: Spacing.sm },

  subtitle: { fontSize: 14, color: Colors.textSecondary, marginBottom: Spacing.lg },

  card: {

    backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.xl,

    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,

  },

  inputRow: {

    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Colors.border,

    borderRadius: Radius.md, paddingHorizontal: Spacing.md, marginBottom: Spacing.md, minHeight: 52,

  },

  iconBox: {

    width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primaryLight,

    alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md,

  },

  input: { flex: 1, fontSize: 15, color: Colors.text },
  whatsappRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  whatsappTextCol: { flex: 1 },
  whatsappLabel: { fontSize: 14, fontWeight: '700', color: Colors.navy },
  whatsappHint: { fontSize: 12, color: Colors.textSecondary, marginTop: 4, lineHeight: 18 },
  checkboxRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginBottom: Spacing.lg },

  agreeText: { flex: 1, fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },

  link: { color: Colors.primary, fontWeight: '600' },

  createBtn: {

    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,

    backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: Spacing.lg, marginBottom: Spacing.lg,

  },

  createBtnDisabled: { opacity: 0.5 },

  createBtnText: { fontSize: 16, fontWeight: '700', color: Colors.white },

  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },

  divider: { flex: 1, height: 1, backgroundColor: Colors.border },

  dividerText: { marginHorizontal: Spacing.md, fontSize: 12, color: Colors.textMuted },

  socialBtn: {

    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.md,

    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingVertical: Spacing.md, marginBottom: Spacing.sm,

  },

  googleG: { fontSize: 18, fontWeight: '700', color: '#4285F4' },

  socialText: { fontSize: 14, fontWeight: '600', color: Colors.navy },

  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.lg },

  loginText: { fontSize: 14, color: Colors.textSecondary },

  loginLink: { fontSize: 14, color: Colors.primary, fontWeight: '700' },

});


