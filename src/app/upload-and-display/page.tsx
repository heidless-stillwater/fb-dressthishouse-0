
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser, useStorage } from '@/firebase';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Upload, Wand2, Image as ImageIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';


function ImageProcessor() {
  const [originalImage, setOriginalImage] = useState<File | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [transformedImageUrl, setTransformedImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useUser();
  const storage = useStorage();


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
    if (!originalImage || !user || !storage) {
        toast({
            variant: "destructive",
            title: "Upload failed",
            description: "No image selected or user not authenticated.",
        });
        return;
    }

    setIsLoading(true);
    const timestamp = Date.now();
    const filePath = `user-uploads/${user.uid}/${timestamp}-original-${originalImage.name}`;
    const storageRef = ref(storage, filePath);

    try {
        const uploadResult = await uploadBytes(storageRef, originalImage);
        const downloadURL = await getDownloadURL(uploadResult.ref);
        
        setOriginalImageUrl(downloadURL); // Set persistent URL after upload
        
        toast({
            title: "Upload successful!",
            description: "Your image has been uploaded.",
        });

    } catch (error) {
        console.error("Upload error:", error);
        toast({
            variant: "destructive",
            title: "Upload failed",
            description: "There was a problem uploading your image.",
        });
    } finally {
        setIsLoading(false);
    }
  };

  const handleTransform = async () => {
    // Placeholder for AI transformation logic
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate AI processing
    setTransformedImageUrl("https://picsum.photos/seed/transformed/600/400");
    setIsLoading(false);
    toast({
      title: "Image Transformed!",
      description: "The AI has worked its magic.",
    });
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
                    <Input id="image-upload" type="file" accept="image/*" onChange={handleImageChange} className="flex-grow" />
                    <Button onClick={handleUpload} disabled={!originalImage || isLoading}>
                        {isLoading ? 'Uploading...' : <><Upload className="mr-2" /> Upload Image</>}
                    </Button>
                 </div>
            </div>

            {(originalImageUrl || transformedImageUrl) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <h3 className="font-semibold">Original</h3>
                        {originalImageUrl ? (
                            <div className="relative aspect-video">
                                <Image src={originalImageUrl} alt="Original" layout="fill" className="rounded-md object-cover" />
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
                                <Image src={transformedImageUrl} alt="Transformed" layout="fill" className="rounded-md object-cover" />
                            </div>
                        ) : (
                           <div className="bg-gray-100 rounded-md flex items-center justify-center aspect-video">
                               <Wand2 className="text-gray-400" size={48} />
                           </div>
                        )}
                    </div>
                </div>
            )}
            
            {originalImageUrl && !transformedImageUrl && (
                 <Button onClick={handleTransform} disabled={isLoading} className="w-full">
                    {isLoading ? "Transforming..." : "Transform with AI"}
                    <Wand2 className="ml-2" />
                 </Button>
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
      </div>
    </main>
  );
}
