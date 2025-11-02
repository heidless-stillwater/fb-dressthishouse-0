
'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';

export default function FirebaseErrorListener() {
  useEffect(() => {
    const handlePermissionError = (error: Error) => {
      // This will be caught by the Next.js error overlay in development
      throw error;
    };

    errorEmitter.on('permission-error', handlePermissionError);

    return () => {
      errorEmitter.removeListener('permission-error', handlePermissionError);
    };
  }, []);

  return null; // This component doesn't render anything
}
