
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
import { addDoc, collection, serverTimestamp, query, where, orderBy } from 'firebase/firestore';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { useCollection } from '@/firebase/firestore/use-collection';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { v4 as uuidv4 } from 'uuid';
import { transformImage } from '@/ai/flows/transform-image-flow';

type ImageRecord = {
    id: string;
    userId: string;
    originalImageUrl: string;
    transformedImageUrl: string;
    originalFileName: string;
    prompt: string;
    timestamp: any;
};

// Helper to convert a file to a data URI
const toDataUri = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

// Helper to convert a data URI to a Blob
const fromDataUri = async (dataUri: string): Promise<Blob> => {
    const res = await fetch(dataUri);
    return res.blob();
};


function ImageProcessor() {
  const [originalImage, setOriginalImage] = useState<File | null>(null);
  const [prompt, setPrompt] = useState('');
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
  
  const handleUpload = async () => {
    if (!originalImage || !prompt || !user || !storage || !firestore) {
        toast({
            variant: "destructive",
            title: "Operation failed",
            description: "Missing image, prompt, user authentication, or Firebase service.",
        });
        return;
    }

    setIsLoading(true);
    setTransformedImageUrl(null);

    try {
        // 1. Upload original image
        setLoadingMessage('Uploading original image...');
        const timestamp = Date.now();
        const originalFileName = originalImage.name;
        const originalFilePath = `user-uploads/${user.uid}/${timestamp}-original-${originalFileName}`;
        const originalStorageRef = ref(storage, originalFilePath);
        const originalUploadResult = await uploadBytes(originalStorageRef, originalImage);
        const originalDownloadURL = await getDownloadURL(originalUploadResult.ref);
        setOriginalImageUrl(originalDownloadURL);

        // 2. Generate transformed image from prompt
        setLoadingMessage('Decorating your room...');
        const originalImageDataUri = await toDataUri(originalImage);
        const transformedImageResponse = await transformImage({ image: originalImageDataUri, prompt });

        const transformedImageBlob = await fromDataUri(transformedImageResponse.imageUrl);
        const transformedFileName = `transformed-${uuidv4()}.png`;
        const transformedFilePath = `user-uploads/${user.uid}/${timestamp}-${transformedFileName}`;
        const transformedStorageRef = ref(storage, transformedFilePath);
        
        // 3. Upload transformed image
        setLoadingMessage('Uploading new image...');
        const transformedUploadResult = await uploadBytes(transformedStorageRef, transformedImageBlob);
        const transformedDownloadURL = await getDownloadURL(transformedUploadResult.ref);
        setTransformedImageUrl(transformedDownloadURL);

        // 4. Save record to Firestore
        setLoadingMessage('Saving record...');
        const imageRecord = {
            userId: user.uid,
            originalImageUrl: originalDownloadURL,
            transformedImageUrl: transformedDownloadURL,
            originalFileName: originalFileName,
            prompt: prompt,
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
          description: "The image was successfully transformed and saved.",
        });

    } catch (error) {
        console.error("Operation error:", error);
        toast({
            variant: "destructive",
            title: "An error occurred",
            description: (error as Error).message || "There was a problem with the image transformation or upload process.",
        });
    } finally {
        setIsLoading(false);
        setLoadingMessage('');
    }
  };


  return (
    <Card className="w-full max-w-2xl">
        <CardHeader>
            <CardTitle>Image Decorator</CardTitle>
            <CardDescription>Upload a picture of a room and provide a style to decorate it with AI.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
             <div className="space-y-4">
                 <div className="space-y-2">
                    <Label htmlFor="image-upload">1. Upload Room Image</Label>
                    <Input id="image-upload" type="file" accept="image/*" onChange={handleImageChange} className="flex-grow" disabled={isLoading} />
                 </div>
                 <div className="space-y-2">
                    <Label htmlFor="prompt">2. Enter Decoration Style</Label>
                    <Input id="prompt" type="text" placeholder="e.g., 'Modern minimalist', 'Bohemian', 'Coastal grandmother'..." value={prompt} onChange={(e) => setPrompt(e.target.value)} disabled={isLoading} />
                </div>
            </div>

            {(originalImageUrl || isLoading) && (
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
                        ) : isLoading ? (
                           <div className="bg-gray-100 rounded-md flex items-center justify-center aspect-video">
                               <Wand2 className="text-gray-400 size-12 animate-pulse" />
                           </div>
                        ) : (
                           <div className="bg-gray-100 rounded-md flex items-center justify-center aspect-video">
                               <Wand2 className="text-gray-400" size={48} />
                           </div>
                        )}
                    </div>
                </div>
            )}
            
            <Button onClick={handleUpload} disabled={!originalImage || !prompt || isLoading} className="w-full">
                {isLoading ? loadingMessage : "Decorate and Save Image"}
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
                        <p className="text-sm text-muted-foreground mb-2">
                           File: <span className="font-medium text-foreground">{record.originalFileName}</span>
                        </p>
                        <p className="text-sm text-muted-foreground mb-2">
                           Prompt: <span className="font-medium text-foreground italic">"{record.prompt}"</span>
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
                                    <Image src={record.transformedImageUrl} alt={`Transformed with prompt: ${record.prompt}`} fill className="rounded-md object-cover" />
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
