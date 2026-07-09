/**
 * Google OAuth client IDs from Firebase Console:
 * Authentication → Sign-in method → Google → Web SDK configuration
 *
 * Set in .env (see .env.example):
 * EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=86963940663-xxxx.apps.googleusercontent.com
 *
 * Note: This project uses the Web client ID for native sign-in as well
 * (via `clientId`) to keep configuration minimal. Native client IDs are optional.
 */
export const googleAuthConfig = {
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '',
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '',
};
