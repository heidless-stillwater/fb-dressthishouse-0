
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser, useStorage, useFirestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Upload, Wand2, Image as ImageIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { ref, uploadBytes, getDownloadURL, uploadString } from 'firebase/storage';
import { transformImage } from '@/ai/flows/transform-image-flow';
import { v4 as uuidv4 } from 'uuid';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

function fileToDataUri(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function dataUriToBlob(dataUri: string): Blob {
    const byteString = atob(dataUri.split(',')[1]);
    const mimeString = dataUri.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
}

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
        const uploadResult = await uploadBytes(originalStorageRef, originalImage);
        const originalDownloadURL = await getDownloadURL(uploadResult.ref);
        setOriginalImageUrl(originalDownloadURL); // Set persistent URL

        toast({
            title: "Upload successful!",
            description: "Your original image has been uploaded.",
        });

        // 2. Transform the image
        setLoadingMessage('Transforming image with AI...');
        const originalImageDataUri = await fileToDataUri(originalImage);
        const transformResult = await transformImage({
            imageDataUri: originalImageDataUri,
            prompt: "assume image is of a room in a domestic house. Decorate & Furnish this room in an art deco style"
        });
        
        const transformedImageDataUri = transformResult.transformedImageUrl;
        setTransformedImageUrl(transformedImageDataUri); // Show preview immediately

        // 3. Upload transformed image
        setLoadingMessage('Uploading transformed image...');
        const transformedImageBlob = dataUriToBlob(transformedImageDataUri);
        const transformedTimestamp = Date.now();
        const transformedFileName = `transformed-${uuidv4()}.png`;
        const transformedFilePath = `user-uploads/${user.uid}/${transformedTimestamp}-${transformedFileName}`;
        const transformedStorageRef = ref(storage, transformedFilePath);
        const transformedUploadResult = await uploadBytes(transformedStorageRef, transformedImageBlob);
        const transformedDownloadURL = await getDownloadURL(transformedUploadResult.ref);
        setTransformedImageUrl(transformedDownloadURL); // Set persistent URL

        // 4. Save record to Firestore
        setLoadingMessage('Saving records...');
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
          title: "Image Transformed!",
          description: "The AI has worked its magic and everything is saved.",
        });

    } catch (error) {
        console.error("Operation error:", error);
        toast({
            variant: "destructive",
            title: "An error occurred",
            description: "There was a problem with the upload and transform process.",
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
            <CardDescription>Upload an image and let the AI transform it.</CardDescription>
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
                {isLoading ? loadingMessage : "Upload and Transform with AI"}
                <Wand2 className="ml-2" />
            </Button>
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
      </div>
    </main>
  );
}
