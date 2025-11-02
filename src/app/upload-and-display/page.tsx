
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function UploadAndDisplayPage() {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-8 bg-background gap-8">
      <div className="absolute top-8 left-8">
        <Button asChild variant="outline">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </Button>
      </div>
      <Card className="w-full max-w-lg mt-20">
        <CardHeader>
          <CardTitle className="text-3xl">Upload and Display</CardTitle>
          <CardDescription>
            This is a protected page. You can only see it because you are logged in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Welcome, {user.email}.</p>
          <p className="mt-4">You can now add your file upload and display logic here.</p>
        </CardContent>
      </Card>
    </main>
  );
}
