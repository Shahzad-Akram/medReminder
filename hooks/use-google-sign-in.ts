/**
 * Google sign-in is temporarily disabled.
 * Re-enable later when native/web OAuth client IDs are fully configured.
 */
export const useGoogleSignIn = () => ({
  signInWithGoogle: async () => {
    throw new Error('Google sign-in is temporarily disabled.');
  },
  isGoogleReady: false,
  isEnabled: false as const,
});
