
'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useCollection } from '@/firebase/firestore/use-collection';

const contactFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

type ContactSubmission = {
    id: string;
    name: string;
    email: string;
    message: string;
}

export default function ContactPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const firestore = useFirestore();

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
  });
  
  const messagesQuery = useMemo(() => {
    if (!firestore) return null;
    return collection(firestore, 'dth_contactMessages');
  }, [firestore]);

  const { data: messages, loading: messagesLoading } = useCollection<ContactSubmission>(messagesQuery);


  const onSubmit = async (data: ContactFormValues) => {
    setLoading(true);

    if (!firestore) {
        toast({
            variant: "destructive",
            title: "Oh no! Something went wrong.",
            description: "Could not connect to the database.",
        });
        setLoading(false);
        return;
    }
    
    const collectionRef = collection(firestore, 'dth_contactMessages');
    const newData = { ...data, createdAt: serverTimestamp() };

    addDoc(collectionRef, newData).then(() => {
        setSubmitted(true);
    }).catch(async (serverError) => {
      const permissionError = new FirestorePermissionError({
          path: collectionRef.path,
          operation: 'create',
          requestResourceData: newData,
      });
      errorEmitter.emit('permission-error', permissionError);
      toast({
        variant: "destructive",
        title: "Oh no! Something went wrong.",
        description: "There was a problem submitting your message. Please try again.",
      });
    }).finally(() => {
        setLoading(false);
    });
  };

  if (submitted) {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-background">
            <div className="flex flex-col items-center justify-center text-center">
                <h1 className="text-3xl font-bold mb-4">Thank You!</h1>
                <p className="text-muted-foreground mb-8">Your message has been sent successfully. We'll get back to you soon.</p>
                <Button asChild>
                    <Link href="/">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Home
                    </Link>
                </Button>
            </div>
        </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-8 bg-background gap-8">
       <div className="absolute top-8 left-8">
        <Button asChild variant="outline">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
      </div>
      <Card className="w-full max-w-lg mt-20">
        <CardHeader>
          <CardTitle className="text-3xl">Contact Us</CardTitle>
          <CardDescription>
            Have a question or feedback? Fill out the form below to get in touch.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" placeholder="Your Name" {...form.register('name')} />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" {...form.register('email')} />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Your message..."
                className="min-h-[120px]"
                {...form.register('message')}
              />
              {form.formState.errors.message && (
                <p className="text-sm text-destructive">{form.formState.errors.message.message}</p>

              )}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Sending...' : 'Send Message'}
            </Button>
          </form>
        </CardContent>
      </Card>

       <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Submitted Messages</CardTitle>
            <CardDescription>Here are the messages that have been submitted through the contact form.</CardDescription>
          </CardHeader>
          <CardContent>
            {messagesLoading ? (
              <p>Loading messages...</p>
            ) : messages && messages.length > 0 ? (
              <ul className="space-y-4">
                {messages.map((msg) => (
                  <li key={msg.id} className="border p-4 rounded-md">
                    <p className="font-semibold">{msg.name} <span className="text-sm text-muted-foreground">({msg.email})</span></p>
                    <p className="mt-2 text-gray-700">{msg.message}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No messages have been submitted yet.</p>
            )}
          </CardContent>
        </Card>
    </main>
  );
}
