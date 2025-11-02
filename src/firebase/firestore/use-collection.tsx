
'use client';

import {
  onSnapshot,
  Query,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
} from 'firebase/firestore';
import { useEffect, useState, useRef } from 'react';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

interface CollectionData<T> {
  data: (T & { id: string })[] | null;
  loading: boolean;
  error: FirestoreError | null;
}

export function useCollection<T>(
  q: Query | null
): CollectionData<T> {
  const [collectionData, setCollectionData] = useState<CollectionData<T>>({
    data: null,
    loading: true,
    error: null,
  });

  const queryRef = useRef<Query | null>(q);
  queryRef.current = q;

  useEffect(() => {
    if (!queryRef.current) {
      setCollectionData({ data: [], loading: false, error: null });
      return;
    }

    const unsubscribe = onSnapshot(
      queryRef.current,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as (T & { id: string })[];
        setCollectionData({ data, loading: false, error: null });
      },
      (serverError: FirestoreError) => {
        const permissionError = new FirestorePermissionError({
            path: 'unknown',
            operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
        setCollectionData({ data: null, loading: false, error: serverError });
      }
    );

    return () => unsubscribe();
  }, [q]);

  return collectionData;
}
