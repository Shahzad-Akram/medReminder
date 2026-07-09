import { FirebaseError } from 'firebase/app';

const messages: Record<string, string> = {
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/user-not-found': 'No account found with this email.',
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/invalid-credential': 'Invalid email or password.',
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/too-many-requests': 'Too many attempts. Please try again later.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
};

export const getFirebaseErrorMessage = (error: unknown, fallback = 'Something went wrong. Please try again.') => {
  if (error instanceof FirebaseError && messages[error.code]) {
    return messages[error.code];
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};
