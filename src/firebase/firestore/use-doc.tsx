
'use client';

import {
  onSnapshot,
  doc,
  DocumentReference,
  DocumentData,
  FirestoreError,
  DocumentSnapshot,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';

interface DocData<T> {
  data: (T & { id: string }) | null;
  loading: boolean;
  error: FirestoreError | null;
}

export function useDoc<T>(
  ref: DocumentReference | null
): DocData<T> {
  const [docData, setDocData] = useState<DocData<T>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!ref) {
      setDocData({ data: null, loading: false, error: null });
      return;
    }

    const unsubscribe = onSnapshot(
      ref,
      (snapshot: DocumentSnapshot<DocumentData>) => {
        if (snapshot.exists()) {
          const data = {
            id: snapshot.id,
            ...snapshot.data(),
          } as T & { id: string };
          setDocData({ data, loading: false, error: null });
        } else {
          setDocData({ data: null, loading: false, error: null });
        }
      },
      (error: FirestoreError) => {
        setDocData({ data: null, loading: false, error });
      }
    );

    return () => unsubscribe();
  }, [ref]);

  return docData;
}
