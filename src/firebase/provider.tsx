
'use client';

import { FirebaseApp } from 'firebase/app';
import { Auth } from 'firebase/auth';
import { Firestore } from 'firebase/firestore';
import { FirebaseStorage } from 'firebase/storage';
import { createContext, ReactNode, useContext, useMemo } from 'react';
import FirebaseErrorListener from '@/components/FirebaseErrorListener';

type FirebaseContextValue = {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  storage: FirebaseStorage;
};

export const FirebaseClientContext = createContext<FirebaseContextValue | null>(
  null
);

export const FirebaseContext = createContext<FirebaseContextValue | null>(null);

export const useFirebase = () => useContext(FirebaseContext);
export const useFirebaseApp = () => useContext(FirebaseContext)?.firebaseApp!;
export const useFirestore = () => useContext(FirebaseContext)?.firestore!;
export const useAuth = () => useContext(FirebaseContext)?.auth!;
export const useStorage = () => useContext(FirebaseContext)?.storage!;


export function FirebaseProvider({
  children,
  firebaseApp,
  auth,
  firestore,
  storage
}: {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  storage: FirebaseStorage;
}) {
  const value = useMemo(
    () => ({
      firebaseApp,
      auth,
      firestore,
      storage
    }),
    [auth, firebaseApp, firestore, storage]
  );

  return (
    <FirebaseContext.Provider value={value}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
}

    