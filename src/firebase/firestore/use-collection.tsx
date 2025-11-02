
'use client';

import {
  collection,
  onSnapshot,
  query,
  Query,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
} from 'firebase/firestore';
import { useEffect, useState, useRef } from 'react';

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
      (error: FirestoreError) => {
        setCollectionData({ data: null, loading: false, error });
      }
    );

    return () => unsubscribe();
  }, [q]);

  return collectionData;
}
