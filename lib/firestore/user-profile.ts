import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';

import { db } from '@/lib/firebase';

export type UserProfile = {
  uid: string;
  email?: string;
  displayName?: string;
  whatsapp?: string;
  onWhatsapp?: boolean;
};

export const upsertUserProfile = async (
  uid: string,
  input: {
    email?: string;
    displayName?: string;
    whatsapp?: string;
    onWhatsapp?: boolean;
  },
) => {
  await setDoc(
    doc(db, 'users', uid),
    {
      ...input,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  // Public contact prefs for reminder routing (readable by other signed-in users).
  await setDoc(
    doc(db, 'userContacts', uid),
    {
      whatsapp: input.whatsapp?.trim() || null,
      onWhatsapp: Boolean(input.onWhatsapp),
      displayName: input.displayName?.trim() || null,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const contactSnap = await getDoc(doc(db, 'userContacts', uid));
  if (contactSnap.exists()) {
    const data = contactSnap.data();
    return {
      uid,
      whatsapp: data.whatsapp ? String(data.whatsapp) : undefined,
      onWhatsapp: Boolean(data.onWhatsapp),
      displayName: data.displayName ? String(data.displayName) : undefined,
    };
  }

  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;

  const data = snap.data();
  return {
    uid,
    email: data.email ? String(data.email) : undefined,
    displayName: data.displayName ? String(data.displayName) : undefined,
    whatsapp: data.whatsapp ? String(data.whatsapp) : undefined,
    onWhatsapp: Boolean(data.onWhatsapp),
  };
};

export const subscribeUserProfile = (
  uid: string,
  onData: (profile: UserProfile | null) => void,
  onError?: (error: Error) => void,
) =>
  onSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      if (!snap.exists()) {
        onData(null);
        return;
      }

      const data = snap.data();
      onData({
        uid,
        email: data.email ? String(data.email) : undefined,
        displayName: data.displayName ? String(data.displayName) : undefined,
        whatsapp: data.whatsapp ? String(data.whatsapp) : undefined,
        onWhatsapp: Boolean(data.onWhatsapp),
      });
    },
    (error) => onError?.(error),
  );
