
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser, useFirestore, useStorage } from '@/firebase';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trash2, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query, where, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import Image from 'next/image';

type ImageRecord = {
    id: string;
    userId: string;
    originalImageUrl: string;
    transformedImageUrl: string;
    originalFileName: string;
    prompt: string;
    timestamp: any;
};

function FileManager() {
  const { user } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const [recordToDelete, setRecordToDelete] = useState<ImageRecord | null>(null);

  const imageRecordsQuery = useMemo(() => {
    if (!user || !firestore) return null;
    return query(
        collection(firestore, 'imageRecords'),
        where('userId', '==', user.uid),
        orderBy('timestamp', 'desc')
    );
  }, [user, firestore]);

  const { data: imageRecords, loading: recordsLoading } = useCollection<ImageRecord>(imageRecordsQuery);

  const handleDownload = async (imageUrl: string, filename: string) => {
    try {
      const response = await fetch(`/api/download-proxy?url=${encodeURIComponent(imageUrl)}`);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      toast({
        variant: "destructive",
        title: "Download failed",
        description: "Could not download the image.",
      });
    }
  };

  const handleDelete = async () => {
    if (!recordToDelete || !storage || !firestore) return;

    try {
        // Delete from Firestore
        const docRef = doc(firestore, 'imageRecords', recordToDelete.id);
        await deleteDoc(docRef);

        // Delete original from Storage
        const originalFileRef = ref(storage, recordToDelete.originalImageUrl);
        await deleteObject(originalFileRef);
        
        // Delete transformed from Storage
        const transformedFileRef = ref(storage, recordToDelete.transformedImageUrl);
        await deleteObject(transformedFileRef);

        toast({
            title: "Record Deleted",
            description: `${recordToDelete.originalFileName} has been successfully deleted.`,
        });
    } catch (error) {
        console.error("Delete failed:", error);
        toast({
            variant: "destructive",
            title: "Delete failed",
            description: "Could not delete the record.",
        });
    } finally {
        setRecordToDelete(null);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>File Manager</CardTitle>
        <CardDescription>Manage your uploaded images and their transformations.</CardDescription>
      </CardHeader>
      <CardContent>
        {recordsLoading && (
            <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
        )}
        {!recordsLoading && imageRecords && (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Thumbnail</TableHead>
                        <TableHead>Filename</TableHead>
                        <TableHead>Prompt</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {imageRecords.length > 0 ? imageRecords.map((record) => (
                        <TableRow key={record.id}>
                            <TableCell>
                                <div className="relative h-12 w-16 rounded-md overflow-hidden">
                                <Image
                                    src={record.originalImageUrl}
                                    alt={`Thumbnail for ${record.originalFileName}`}
                                    fill
                                    className="object-cover"
                                />
                                </div>
                            </TableCell>
                            <TableCell className="font-medium">{record.originalFileName}</TableCell>
                            <TableCell>{record.prompt}</TableCell>
                            <TableCell className="text-right space-x-2">
                                <Button variant="ghost" size="icon" onClick={() => handleDownload(record.originalImageUrl, `original-${record.originalFileName}`)} title="Download Original">
                                    <Download className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDownload(record.transformedImageUrl, `transformed-${record.originalFileName}`)} title="Download Transformed">
                                    <Download className="h-4 w-4 text-blue-500" />
                                </Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" title="Delete Record" onClick={() => setRecordToDelete(record)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </AlertDialogTrigger>
                                     {recordToDelete && recordToDelete.id === record.id && (
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This action cannot be undone. This will permanently delete the record for "{record.originalFileName}".
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel onClick={() => setRecordToDelete(null)}>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    )}
                                </AlertDialog>
                            </TableCell>
                        </TableRow>
                    )) : (
                        <TableRow>
                            <TableCell colSpan={4} className="text-center h-24">No files found.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default function FileManagerPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && !loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router, isMounted]);

  if (loading || !isMounted || !user) {
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
      <div className="w-full max-w-4xl mt-20">
        <FileManager />
      </div>
    </main>
  );
}
