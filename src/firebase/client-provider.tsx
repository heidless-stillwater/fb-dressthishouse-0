
'use client';

import { ReactNode, useMemo } from 'react';
import { getFirebase } from './index';
import {
  FirebaseProvider,
  FirebaseClientContext,
} from './provider';

export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  const firebase = useMemo(() => {
    if (typeof window !== 'undefined') {
      return getFirebase();
    }
    return null;
  }, []);

  if (!firebase) {
    return null; 
  }

  return (
    <FirebaseClientContext.Provider value={firebase}>
      <FirebaseProvider
        firebaseApp={firebase.firebaseApp!}
        auth={firebase.auth!}
        firestore={firebase.firestore!}
      >
        {children}
      </FirebaseProvider>
    </FirebaseClientContext.Provider>
  );
}

export { useFirebase, useFirebaseApp, useFirestore, useAuth } from './provider';
