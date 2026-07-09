import { Ionicons } from '@expo/vector-icons';

import { router } from 'expo-router';

import React, { useState } from 'react';

import {

  ActivityIndicator,

  Alert,

  Pressable,

  ScrollView,

  StyleSheet,

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

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, resetPassword } = useAuth();

  const [showPassword, setShowPassword] = useState(false);

  const [rememberMe, setRememberMe] = useState(true);

  const [email, setEmail] = useState('');

  const [password, setPassword] = useState('');

  const [submitting, setSubmitting] = useState(false);



  const handleLogin = async () => {

    if (!email.trim() || !password) {

      Alert.alert('Missing information', 'Please enter your email and password.');

      return;

    }



    setSubmitting(true);



    try {

      await signIn(email, password);

      router.replace('/(tabs)');

    } catch (error) {

      Alert.alert('Login failed', getFirebaseErrorMessage(error));

    } finally {

      setSubmitting(false);

    }

  };



  const handleForgotPassword = async () => {

    if (!email.trim()) {

      Alert.alert('Email required', 'Enter your email address first, then tap Forgot Password.');

      return;

    }



    try {

      await resetPassword(email);

      Alert.alert('Email sent', 'Check your inbox for password reset instructions.');

    } catch (error) {

      Alert.alert('Reset failed', getFirebaseErrorMessage(error));

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



      <AuthHeroImage source={Images.illustrations.calendar} height={200} />



      <Text style={styles.title}>Welcome back!</Text>

      <Text style={styles.subtitle}>Log in to continue managing your health.</Text>



      <View style={styles.card}>

        <View style={styles.inputRow}>

          <View style={styles.iconBox}>

            <Ionicons name="person-outline" size={20} color={Colors.primary} />

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

            autoComplete="password"

          />

          <Pressable onPress={() => setShowPassword(!showPassword)} accessibilityLabel="Toggle password visibility">

            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color={Colors.textMuted} />

          </Pressable>

        </View>



        <View style={styles.optionsRow}>

          <Pressable style={styles.checkboxRow} onPress={() => setRememberMe(!rememberMe)}>

            <Ionicons name={rememberMe ? 'checkbox' : 'square-outline'} size={22} color={Colors.primary} />

            <Text style={styles.checkboxLabel}>Remember me</Text>

          </Pressable>

          <Pressable onPress={handleForgotPassword}>

            <Text style={styles.forgotLink}>Forgot Password?</Text>

          </Pressable>

        </View>



        <Pressable

          style={[styles.loginBtn, submitting && styles.loginBtnDisabled]}

          onPress={handleLogin}

          disabled={submitting}

          accessibilityRole="button">

          {submitting ? (

            <ActivityIndicator color={Colors.white} />

          ) : (

            <Text style={styles.loginBtnText}>Log In</Text>

          )}

        </Pressable>



        <Pressable onPress={() => router.push('/register')} style={styles.signupRow}>

          <Text style={styles.signupText}>Don&apos;t have an account? </Text>

          <Text style={styles.signupLink}>Create Account ›</Text>

        </Pressable>

      </View>



      <SecurityFooter />

    </ScrollView>

  );

}



const styles = StyleSheet.create({

  container: { flex: 1, backgroundColor: Colors.background },

  content: { paddingHorizontal: Spacing.xl },

  logoWrap: { alignItems: 'center', marginBottom: Spacing.md, width: '100%' },

  logo: { width: '100%', maxWidth: 300 },

  title: { fontSize: 26, fontWeight: '800', color: Colors.navy, marginBottom: Spacing.sm },

  subtitle: { fontSize: 15, color: Colors.textSecondary, marginBottom: Spacing.xl },

  card: {

    backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.xl,

    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,

  },

  inputRow: {

    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Colors.border,

    borderRadius: Radius.md, paddingHorizontal: Spacing.md, marginBottom: Spacing.lg, minHeight: 52,

  },

  iconBox: {

    width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primaryLight,

    alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md,

  },

  input: { flex: 1, fontSize: 15, color: Colors.text },

  optionsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xl },

  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },

  checkboxLabel: { fontSize: 14, color: Colors.text },

  forgotLink: { fontSize: 14, color: Colors.primary, fontWeight: '600' },

  loginBtn: {

    backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: Spacing.lg,

    alignItems: 'center', marginBottom: Spacing.lg,

  },

  loginBtnDisabled: { opacity: 0.7 },

  loginBtnText: { fontSize: 16, fontWeight: '700', color: Colors.white },

  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.lg },

  divider: { flex: 1, height: 1, backgroundColor: Colors.border },

  dividerText: { marginHorizontal: Spacing.md, fontSize: 13, color: Colors.textMuted },

  googleBtn: {

    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.md,

    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingVertical: Spacing.lg, marginBottom: Spacing.lg,

  },

  googleG: { fontSize: 20, fontWeight: '700', color: '#4285F4' },

  googleText: { fontSize: 15, fontWeight: '600', color: Colors.navy },

  signupRow: { flexDirection: 'row', justifyContent: 'center' },

  signupText: { fontSize: 14, color: Colors.textSecondary },

  signupLink: { fontSize: 14, color: Colors.primary, fontWeight: '700' },

});


