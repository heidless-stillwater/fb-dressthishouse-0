
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser, useStorage, useFirestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Wand2, Image as ImageIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { addDoc, collection, serverTimestamp, query, where, orderBy } from 'firebase/firestore';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { useCollection } from '@/firebase/firestore/use-collection';
import { Skeleton } from '@/components/ui/skeleton';

type ImageRecord = {
    id: string;
    userId: string;
    originalImageUrl: string;
    transformedImageUrl: string;
    originalFileName: string;
    timestamp: any;
};


function ImageProcessor() {
  const [originalImage, setOriginalImage] = useState<File | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [transformedImageUrl, setTransformedImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const { toast } = useToast();
  const { user } = useUser();
  const storage = useStorage();
  const firestore = useFirestore();


  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          variant: "destructive",
          title: "File too large",
          description: "Please select an image smaller than 5MB.",
        });
        return;
      }
      setOriginalImage(file);
      setOriginalImageUrl(URL.createObjectURL(file));
      setTransformedImageUrl(null);
    }
  };
  
  const handleUploadAndTransform = async () => {
    if (!originalImage || !user || !storage || !firestore) {
        toast({
            variant: "destructive",
            title: "Operation failed",
            description: "Missing image, user authentication, or Firebase service.",
        });
        return;
    }

    setIsLoading(true);

    try {
        // 1. Upload original image
        setLoadingMessage('Uploading original image...');
        const originalTimestamp = Date.now();
        const originalFileName = originalImage.name;
        const originalFilePath = `user-uploads/${user.uid}/${originalTimestamp}-original-${originalFileName}`;
        const originalStorageRef = ref(storage, originalFilePath);
        const originalUploadResult = await uploadBytes(originalStorageRef, originalImage);
        const originalDownloadURL = await getDownloadURL(originalUploadResult.ref);
        setOriginalImageUrl(originalDownloadURL);

        toast({
            title: "Upload successful!",
            description: "Your original image has been uploaded.",
        });

        // 2. Upload duplicate "transformed" image
        setLoadingMessage('Duplicating and uploading image...');
        const transformedTimestamp = Date.now();
        const transformedFileName = `transformed-${uuidv4()}-${originalFileName}`;
        const transformedFilePath = `user-uploads/${user.uid}/${transformedTimestamp}-${transformedFileName}`;
        const transformedStorageRef = ref(storage, transformedFilePath);
        const transformedUploadResult = await uploadBytes(transformedStorageRef, originalImage);
        const transformedDownloadURL = await getDownloadURL(transformedUploadResult.ref);
        setTransformedImageUrl(transformedDownloadURL);

        // 3. Save record to Firestore
        setLoadingMessage('Saving record...');
        const imageRecord = {
            userId: user.uid,
            originalImageUrl: originalDownloadURL,
            transformedImageUrl: transformedDownloadURL,
            originalFileName: originalFileName,
            timestamp: serverTimestamp(),
        };

        const collectionRef = collection(firestore, 'imageRecords');
        await addDoc(collectionRef, imageRecord).catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
                path: collectionRef.path,
                operation: 'create',
                requestResourceData: imageRecord,
            });
            errorEmitter.emit('permission-error', permissionError);
            throw new Error("Could not save image record to database.");
        });

        toast({
          title: "Image Processed!",
          description: "The original image was duplicated and saved.",
        });

    } catch (error) {
        console.error("Operation error:", error);
        toast({
            variant: "destructive",
            title: "An error occurred",
            description: "There was a problem with the upload process.",
        });
    } finally {
        setIsLoading(false);
        setLoadingMessage('');
    }
  };


  return (
    <Card className="w-full max-w-2xl">
        <CardHeader>
            <CardTitle>Image Processor</CardTitle>
            <CardDescription>Upload an image to duplicate it and save both copies.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
             <div className="space-y-4">
                 <label htmlFor="image-upload" className="block text-sm font-medium text-gray-700 sr-only">
                    Upload Image
                 </label>
                 <div className="flex gap-4">
                    <Input id="image-upload" type="file" accept="image/*" onChange={handleImageChange} className="flex-grow" disabled={isLoading} />
                 </div>
            </div>

            {(originalImageUrl || transformedImageUrl) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <h3 className="font-semibold">Original</h3>
                        {originalImageUrl ? (
                            <div className="relative aspect-video">
                                <Image src={originalImageUrl} alt="Original" fill className="rounded-md object-cover" />
                            </div>
                        ) : (
                           <div className="bg-gray-100 rounded-md flex items-center justify-center aspect-video">
                               <ImageIcon className="text-gray-400" size={48} />
                           </div>
                        )}
                    </div>
                     <div className="space-y-2">
                        <h3 className="font-semibold">Transformed</h3>
                        {transformedImageUrl ? (
                             <div className="relative aspect-video">
                                <Image src={transformedImageUrl} alt="Transformed" fill className="rounded-md object-cover" />
                            </div>
                        ) : (
                           <div className="bg-gray-100 rounded-md flex items-center justify-center aspect-video">
                               <Wand2 className="text-gray-400" size={48} />
                           </div>
                        )}
                    </div>
                </div>
            )}
            
            <Button onClick={handleUploadAndTransform} disabled={!originalImage || isLoading} className="w-full">
                {isLoading ? loadingMessage : "Upload and Duplicate Image"}
                <Wand2 className="ml-2" />
            </Button>
        </CardContent>
    </Card>
  );
}

function ImageGallery() {
  const { user } = useUser();
  const firestore = useFirestore();

  const imageRecordsQuery = useMemo(() => {
    if (!user || !firestore) return null;
    return query(
        collection(firestore, 'imageRecords'),
        where('userId', '==', user.uid),
        orderBy('timestamp', 'desc')
    );
  }, [user, firestore]);

  const { data: imageRecords, loading: recordsLoading } = useCollection<ImageRecord>(imageRecordsQuery);
  
  return (
    <Card className="w-full max-w-2xl mt-8">
      <CardHeader>
        <CardTitle>Image Gallery</CardTitle>
        <CardDescription>View your uploaded and transformed images here.</CardDescription>
      </CardHeader>
      <CardContent>
        {recordsLoading && (
            <div className="grid grid-cols-1 gap-6">
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        )}
        {!recordsLoading && imageRecords && imageRecords.length === 0 && (
            <p>You haven't processed any images yet. Upload one above to get started!</p>
        )}
        {!recordsLoading && imageRecords && imageRecords.length > 0 && (
            <div className="grid grid-cols-1 gap-8">
                {imageRecords.map((record) => (
                    <div key={record.id} className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground mb-4">
                            Original File: <span className="font-medium text-foreground">{record.originalFileName}</span>
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <h3 className="font-semibold">Original</h3>
                                <div className="relative aspect-video">
                                    <Image src={record.originalImageUrl} alt={`Original ${record.originalFileName}`} fill className="rounded-md object-cover" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h3 className="font-semibold">Transformed</h3>
                                <div className="relative aspect-video">
                                    <Image src={record.transformedImageUrl} alt={`Transformed ${record.originalFileName}`} fill className="rounded-md object-cover" />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </CardContent>
    </Card>
  );
}


export default function UploadAndDisplayPage() {
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
      <div className="w-full max-w-2xl mt-20">
        <ImageProcessor />
        <ImageGallery />
      </div>
    </main>
  );
}
