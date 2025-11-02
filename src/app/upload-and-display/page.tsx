
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
import { transformImage } from '@/ai/flows/transform-image-flow';
import { useCollection } from '@/firebase/firestore/use-collection';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

type ImageRecord = {
    id: string;
    userId: string;
    originalImageUrl: string;
    transformedImageUrl: string;
    originalFileName: string;
    prompt: string;
    timestamp: any;
};

function ImageProcessor() {
  const [originalImage, setOriginalImage] = useState<File | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [testMode, setTestMode] = useState(false);
  const [transformedImageUrl, setTransformedImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const { toast } = useToast();
  const { user } = useUser();
  const storage = useStorage();
  const firestore = useFirestore();


  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, files } = event.target;
    if (name === 'image' && files?.[0]) {
        const file = files[0];
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
    } else if (name === 'prompt') {
        setPrompt(value);
    }
  };
  
  const handleUpload = async () => {
    if (!originalImage) {
        toast({
            variant: "destructive",
            title: "Missing Image",
            description: "Please select an image to upload.",
        });
        return;
    }

    if (!user || !storage) {
        toast({
            variant: "destructive",
            title: "Services not available",
            description: "Could not connect to Firebase services. Please try again later.",
        });
        return;
    }

    setIsLoading(true);
    setLoadingMessage('Uploading image...');

    try {
        const timestamp = Date.now();
        const originalFileName = originalImage.name;
        const filePath = `user-uploads/${user.uid}/${timestamp}-original-${originalFileName}`;
        const storageRef = ref(storage, filePath);
        
        const uploadResult = await uploadBytes(storageRef, originalImage);
        const downloadURL = await getDownloadURL(uploadResult.ref);

        toast({
          title: "Image Uploaded!",
          description: "The image was successfully uploaded.",
        });
        
        // For now, just log the URL. We will save it to Firestore later.
        console.log("Uploaded image URL:", downloadURL);

    } catch (error) {
        console.error("Upload error:", error);
        toast({
            variant: "destructive",
            title: "An error occurred",
            description: (error as Error).message || "There was a problem with the image upload.",
        });
    } finally {
        setIsLoading(false);
        setLoadingMessage('');
    }
  };


  return (
    <Card className="w-full max-w-2xl">
        <CardHeader>
            <CardTitle>Image Transformer</CardTitle>
            <CardDescription>Upload an image and provide a prompt to transform it.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
             <div className="space-y-4">
                 <div className="space-y-2">
                    <Label htmlFor="image-upload">Image</Label>
                    <Input id="image-upload" name="image" type="file" accept="image/*" onChange={handleInputChange} className="flex-grow" disabled={isLoading} />
                 </div>
                 <div className="space-y-2">
                    <Label htmlFor="prompt">Prompt</Label>
                    <Input id="prompt" name="prompt" type="text" placeholder="e.g., 'make it a cyberpunk style'" value={prompt} onChange={handleInputChange} disabled={isLoading} />
                </div>
                <div className="flex items-center space-x-2">
                    <Checkbox id="test-mode" checked={testMode} onCheckedChange={(checked) => setTestMode(Boolean(checked))} disabled={isLoading} />
                    <Label htmlFor="test-mode" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Test mode
                    </Label>
                </div>
            </div>

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
                    ) : isLoading && loadingMessage.includes('Transforming') ? (
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
            
            <Button onClick={handleUpload} disabled={!originalImage || isLoading} className="w-full">
                {isLoading ? loadingMessage : "Upload Images"}
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
 