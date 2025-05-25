// src/app/(app)/education/upload/page.tsx
"use client";

import React, { useState, useEffect } from 'react'; // Added useEffect
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/firebase/firebase.config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UploadCloud, ArrowLeft, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { type EducationItem, ContentType } from '@/types/education';

// Zod schema for education content form validation
const educationSchema = z.object({
  title: z.string().min(5, { message: 'Title must be at least 5 characters.' }),
  description: z.string().min(10, { message: 'Description must be at least 10 characters.' }),
  type: z.nativeEnum(ContentType, { required_error: "Please select a content type." }),
  imageUrl: z.string().url({ message: 'Please enter a valid image URL for the thumbnail.' }).optional().or(z.literal('')),
  contentUrl: z.string().url({ message: 'Please enter a valid URL for Video/External Article/PDF.' }).optional().or(z.literal('')),
  contentText: z.string().optional(),
}).refine(data => {
    if (data.type === ContentType.Video) {
        return !!data.contentUrl; // Video must have a contentUrl
    }
    if (data.type === ContentType.Article || data.type === ContentType.PDF) {
        return !!data.contentUrl || !!data.contentText; // Article/PDF must have URL or Text (for PDF, URL is more practical)
    }
    return true; // Should not happen if type is selected
}, {
    message: "For Videos, a Content URL is required. For Articles or PDFs, please provide either an External Link or Content Text.",
    // path: ["contentUrl"], // You can specify a path if the error is more specific to one field
});


type EducationFormValues = z.infer<typeof educationSchema>;

export default function UploadEducationPage() {
  const { user, loading: authLoading, isConfigured } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<EducationFormValues>({
    resolver: zodResolver(educationSchema),
    defaultValues: {
      title: '',
      description: '',
      type: undefined,
      imageUrl: '',
      contentUrl: '',
      contentText: '',
    },
  });

  // Watch the 'type' field to conditionally show/hide fields
  const contentType = form.watch('type');

  // Log form state errors for easier debugging
  useEffect(() => {
    if (Object.keys(form.formState.errors).length > 0) {
        console.log("Form validation errors:", form.formState.errors);
    }
  }, [form.formState.errors]);


  const onSubmit = async (values: EducationFormValues) => {
    console.log("Form submitted with values:", values);
    setFormError(null);
    setIsLoading(true);

    if (!user) {
        setFormError('You must be logged in to upload content.');
        toast({ title: 'Login Required', variant: 'destructive' });
        setIsLoading(false);
        return;
    }

    if (!isConfigured || !db) {
        setFormError('System not configured. Cannot save content.');
        toast({ title: 'Configuration Error', description: 'Database connection unavailable.', variant: 'destructive' });
        setIsLoading(false);
        return;
    }

    if (!values.type) {
        setFormError('Content type is required. Please select a type.');
        toast({ title: 'Validation Error', description: 'Please select a content type.', variant: 'destructive' });
        setIsLoading(false);
        return;
    }


    try {
      const educationData: Omit<EducationItem, 'id' | 'createdAt'> & { createdAt: any } = {
        title: values.title,
        description: values.description,
        type: values.type,
        imageUrl: values.imageUrl || null,
        contentUrl: values.contentUrl || null,
        contentText: values.contentText || null,
        authorId: user.uid,
        author: user.displayName || user.email || 'Anonymous',
        createdAt: serverTimestamp(),
      };

      console.log("Attempting to add education content to Firestore with data:", educationData);
      const educationCollectionRef = collection(db, 'education');
      const docRef = await addDoc(educationCollectionRef, educationData);

      console.log('Content uploaded successfully with ID: ', docRef.id);
      toast({ title: 'Success', description: 'Educational content uploaded successfully!' });
      router.push('/education');

    } catch (error: any) {
        console.error('Error uploading content to Firestore:', error);
        let errorMsg = 'Failed to upload content. Please try again.';
        if (error.code === 'permission-denied') {
            errorMsg = "Permission denied. Check Firestore rules.";
        } else {
             errorMsg = `Failed to upload content: ${error.message || 'Unknown error'}.`;
        }
        setFormError(errorMsg);
        toast({ title: 'Upload Failed', description: errorMsg, variant: 'destructive' });
    } finally {
        setIsLoading(false);
    }
  };

   if (authLoading) {
     return <div className="flex justify-center items-center min-h-[200px]"><Loader2 className="h-8 w-8 animate-spin" /> Loading user data...</div>;
   }

   if (!user && !authLoading) {
        return (
            <div className="space-y-6">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Access Denied</AlertTitle>
                    <AlertDescription>
                        You must be logged in to upload educational content. <Link href="/auth/login" className="underline">Login here</Link>.
                    </AlertDescription>
                </Alert>
                 <Button variant="outline" asChild>
                     <Link href="/education"><ArrowLeft className="mr-2 h-4 w-4"/> Back to Education</Link>
                 </Button>
            </div>
        );
    }

    if (!isConfigured) {
         return (
             <div className="space-y-6">
                 <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Configuration Error</AlertTitle>
                    <AlertDescription>
                        Cannot upload content. Firebase connection is not configured.
                    </AlertDescription>
                 </Alert>
                 <Button variant="outline" asChild>
                     <Link href="/education"><ArrowLeft className="mr-2 h-4 w-4"/> Back to Education</Link>
                 </Button>
             </div>
         );
     }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
         <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild>
                 <Link href="/education">
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Back to Education</span>
                </Link>
             </Button>
            <h1 className="text-3xl font-bold flex items-center gap-2">
                <UploadCloud className="h-7 w-7" /> Upload Educational Content
            </h1>
         </div>
         <p className="text-muted-foreground">Share your knowledge by adding articles, video links, or other resources.</p>


      <Card>
        <CardHeader>
          <CardTitle>Content Details</CardTitle>
          <CardDescription>Fill in the information for your educational resource.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
               <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Effective Irrigation Techniques" {...field} disabled={isLoading}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Textarea placeholder="Briefly describe the content..." {...field} disabled={isLoading}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

               <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Content Type <span className="text-destructive">*</span></FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select the type of content" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={ContentType.Article}>Article</SelectItem>
                          <SelectItem value={ContentType.Video}>Video Link</SelectItem>
                          <SelectItem value={ContentType.PDF}>External PDF/Guide Link</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

               <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Thumbnail Image URL (Optional)</FormLabel>
                    <FormControl>
                        <Input
                            type="url"
                            placeholder="https://example.com/image.jpg"
                            {...field}
                            disabled={isLoading}
                        />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {contentType === ContentType.Video && (
                  <FormField
                    control={form.control}
                    name="contentUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Video URL <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                            <Input type="url" placeholder="e.g., https://youtube.com/watch?v=..." {...field} disabled={isLoading}/>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              )}

               {(contentType === ContentType.Article || contentType === ContentType.PDF) && (
                  <FormField
                    control={form.control}
                    name="contentUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>External Link {contentType === ContentType.PDF ? <span className="text-destructive">*</span> : '(Optional for Articles)'}</FormLabel>
                         <FormControl>
                            <Input type="url" placeholder="URL to external article or PDF" {...field} disabled={isLoading}/>
                        </FormControl>
                         <FormMessage />
                      </FormItem>
                    )}
                  />
               )}

               {contentType === ContentType.Article && (
                  <FormField
                    control={form.control}
                    name="contentText"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Article Text (Optional if External Link provided)</FormLabel>
                         <FormControl>
                           <Textarea placeholder="Paste or write your article content here..." {...field} rows={10} disabled={isLoading}/>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
               )}

                 {form.formState.errors.root && (
                      <Alert variant="destructive" className="mt-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
                     </Alert>
                 )}
                 {formError && (
                    <Alert variant="destructive" className="mt-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{formError}</AlertDescription>
                    </Alert>
                 )}


              <Button type="submit" className="w-full" disabled={isLoading || !form.formState.isDirty || !form.formState.isValid}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                {isLoading ? 'Uploading Content...' : 'Upload Content'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
