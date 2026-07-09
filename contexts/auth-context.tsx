import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { auth } from '@/lib/firebase';
import { upsertEmailLookup } from '@/lib/firestore/email-lookup';
import { subscribeUserProfile, type UserProfile, upsertUserProfile } from '@/lib/firestore/user-profile';

export type SignUpOptions = {
  whatsapp?: string;
  onWhatsapp?: boolean;
};

export type UpdateProfileOptions = {
  displayName?: string;
  whatsapp?: string;
  onWhatsapp?: boolean;
};

interface AuthContextValue {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string, options?: SignUpOptions) => Promise<void>;
  updateMyProfile: (options: UpdateProfileOptions) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);

      if (nextUser?.email) {
        void upsertEmailLookup(nextUser).catch(() => {
          // Lookup index is best-effort; patient adding still works without it.
        });
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) {
      setUserProfile(null);
      return;
    }

    const unsub = subscribeUserProfile(user.uid, setUserProfile);
    return unsub;
  }, [user?.uid]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      userProfile,
      loading,
      signIn: async (email, password) => {
        const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
        await upsertEmailLookup(credential.user);
      },
      signUp: async (email, password, displayName, options) => {
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const trimmedName = displayName?.trim();

        if (trimmedName) {
          await updateProfile(credential.user, { displayName: trimmedName });
        }

        await upsertEmailLookup(credential.user);
        await upsertUserProfile(credential.user.uid, {
          email: credential.user.email ?? email.trim(),
          displayName: trimmedName,
          whatsapp: options?.whatsapp?.trim() || undefined,
          onWhatsapp: Boolean(options?.onWhatsapp),
        });
      },
      updateMyProfile: async (options) => {
        if (!user) {
          throw new Error('You must be signed in to update your profile.');
        }

        const trimmedName = options.displayName?.trim();
        if (trimmedName && trimmedName !== user.displayName) {
          await updateProfile(user, { displayName: trimmedName });
        }

        await upsertUserProfile(user.uid, {
          email: user.email ?? undefined,
          displayName: trimmedName ?? user.displayName ?? undefined,
          whatsapp: options.whatsapp?.trim() || undefined,
          onWhatsapp: Boolean(options.onWhatsapp),
        });
      },
      signOut: () => firebaseSignOut(auth),
      resetPassword: (email) => sendPasswordResetEmail(auth, email.trim()),
    }),
    [user, userProfile, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};
