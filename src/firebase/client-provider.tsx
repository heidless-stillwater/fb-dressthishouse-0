
'use client';

import { ReactNode, useMemo, useState, useEffect } from 'react';
import { getFirebase } from './index';
import {
  FirebaseProvider,
  FirebaseClientContext,
} from './provider';

export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const firebase = useMemo(() => {
    if (typeof window !== 'undefined') {
      return getFirebase();
    }
    return null;
  }, []);

  if (!isMounted || !firebase) {
    // On the server or before the client has mounted, we can return a loader or null.
    // Returning null is often better to avoid layout shifts if the content isn't ready.
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
