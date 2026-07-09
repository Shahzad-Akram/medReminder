import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';

import { db } from '@/lib/firebase';

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

/** Firestore-safe document id for an email address */
export const emailLookupDocId = (email: string) =>
  normalizeEmail(email).replace(/[^a-z0-9@._+-]/gi, '_');

export type PlatformUserLookup = {
  uid: string;
  email: string;
  displayName?: string;
};

/**
 * Registers the signed-in user's email so caretakers can check
 * whether a patient email already has an account on MediReminder.
 */
export const upsertEmailLookup = async (user: User) => {
  if (!user.email) {
    return;
  }

  const email = normalizeEmail(user.email);
  const lookupRef = doc(db, 'emailLookup', emailLookupDocId(email));

  await setDoc(
    lookupRef,
    {
      uid: user.uid,
      email,
      displayName: user.displayName ?? null,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  await setDoc(
    doc(db, 'users', user.uid),
    {
      email,
      displayName: user.displayName ?? null,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
};

export const checkEmailOnPlatform = async (
  email: string,
): Promise<{ onPlatform: boolean; linkedUserId?: string; displayName?: string }> => {
  const normalized = normalizeEmail(email);

  if (!normalized || !normalized.includes('@')) {
    return { onPlatform: false };
  }

  const snap = await getDoc(doc(db, 'emailLookup', emailLookupDocId(normalized)));

  if (!snap.exists()) {
    return { onPlatform: false };
  }

  const data = snap.data();
  return {
    onPlatform: true,
    linkedUserId: String(data.uid ?? ''),
    displayName: data.displayName ? String(data.displayName) : undefined,
  };
};
