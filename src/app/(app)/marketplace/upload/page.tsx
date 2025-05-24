
// src/app/(app)/marketplace/upload/page.tsx
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/firebase/firebase.config'; // Import db (can be null)
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore'; // Import Firestore functions
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UploadCloud, PackagePlus, ArrowLeft, AlertCircle, Image as ImageIcon } from 'lucide-react'; // Added ImageIcon
import Link from 'next/link';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { type UserProfile, UserRole } from '@/types/userProfile';
import { type Product } from '@/types/product';
// Using standard img for preview, so removing next/image import if not used elsewhere
// import Image from 'next/image';

// Zod schema for product form validation using image URL
const productSchema = z.object({
  name: z.string().min(3, { message: 'Product name must be at least 3 characters.' }),
  description: z.string().min(10, { message: 'Description must be at least 10 characters.' }),
  category: z.string().optional(),
  startingPrice: z.coerce.number().positive({ message: 'Starting price must be a positive number.' }),
  unit: z.string().optional(),
  imageUrl: z.string().url({ message: 'Please enter a valid image URL.' }).min(1, { message: 'Image URL is required.' }), // Validate as a URL
});

type ProductFormValues = z.infer<typeof productSchema>;

export default function UploadProductPage() {
  const { user, loading: authLoading, isConfigured } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  // Use previewUrl state to display the image from the entered URL
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imagePreviewError, setImagePreviewError] = useState<boolean>(false);

   // Fetch user profile to check role
   useEffect(() => {
       const fetchUserProfile = async () => {
         setIsProfileLoading(true); // Start loading profile
         if (user && db && isConfigured) { // Also check if firebase is configured
             const userDocRef = doc(db, "users", user.uid); // Reference to user profile doc
             try {
                 const docSnap = await getDoc(userDocRef);
                 if (docSnap.exists()) {
                    setUserProfile(docSnap.data() as UserProfile);
                    console.log("User profile loaded:", docSnap.data());
                 } else {
                     console.warn(`User profile not found for UID: ${user.uid}. Assuming default role or handling needed.`);
                      // Set a default profile locally if none exists, but flag error
                      setUserProfile({
                        uid: user.uid,
                        email: user.email || '',
                        displayName: user.displayName || '',
                        role: UserRole.Consumer, // Default to Consumer if no profile found
                        createdAt: new Date(),
                        phoneNumber: user.phoneNumber || '',
                        location: '',
                    });
                    setFormError("User profile not found. Please complete your profile setup or contact support if you believe you are a farmer.");
                 }
             } catch (fetchError: any) {
                 console.error("Error fetching user profile:", fetchError);
                 // Check for permission errors
                 if (fetchError.code === 'permission-denied') {
                    setFormError("You don't have permission to read user profiles. Check Firestore rules.");
                 } else {
                    setFormError("Could not load user profile information. Please try again.");
                 }
                 setUserProfile(null); // Ensure profile is null on error
             }
         } else if (!user && !authLoading) {
              console.log("No user logged in, cannot fetch profile.");
              setUserProfile(null);
         } else if (!db || !isConfigured) {
             console.error("Firestore DB or Firebase config is not available.");
             setFormError("Database connection is unavailable.");
             setUserProfile(null);
         }
         setIsProfileLoading(false); // Finish loading profile
     };

     if (!authLoading) {
         fetchUserProfile();
     }
 }, [user, db, authLoading, isConfigured]); // Add isConfigured


  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      description: '',
      category: '',
      startingPrice: 0,
      unit: '',
      imageUrl: '', // Initialize as empty string
    },
  });

  // Watch the imageUrl field to update the preview
  const imageUrlValue = form.watch('imageUrl');
  useEffect(() => {
    // Basic URL validation check before setting preview
    if (imageUrlValue && imageUrlValue.startsWith('http')) {
        setPreviewUrl(imageUrlValue);
        setImagePreviewError(false); // Reset error when URL changes
    } else {
        setPreviewUrl(null);
    }
  }, [imageUrlValue]);


  const onSubmit = async (values: ProductFormValues) => {
    console.log("Form submitted with values:", values);
    setFormError(null); // Clear previous form errors
    setIsLoading(true);

    // --- Pre-submission Checks ---
    if (!user) {
        setFormError('You must be logged in to list a product.');
        toast({ title: 'Login Required', variant: 'destructive' });
        setIsLoading(false);
        return;
    }

    if (!isConfigured || !db) {
        setFormError('System not configured. Cannot save product.');
        toast({ title: 'Configuration Error', description: 'Database connection unavailable.', variant: 'destructive' });
        setIsLoading(false);
        return;
    }

    if (!userProfile) {
         // Refetch or check profile loading state again, might be redundant if useEffect handles it well
        if (isProfileLoading) {
            setFormError('User profile is still loading. Please wait and try again.');
        } else {
            setFormError('User profile could not be loaded. Cannot verify role.');
        }
        toast({ title: 'Profile Error', description: 'Cannot verify user role.', variant: 'destructive' });
        setIsLoading(false);
        return;
    }

    // Role Check - Ensure user has the Farmer role
    if (userProfile.role !== UserRole.Farmer) {
         const errorMsg = 'Only users with the Farmer role can list products.';
         console.warn(errorMsg, "User Role:", userProfile.role);
         setFormError(errorMsg);
         toast({ title: 'Permission Denied', description: 'You must be a Farmer to list products.', variant: 'destructive' });
         setIsLoading(false);
         return;
    }
    // --- End Pre-submission Checks ---


    try {
        // --- Add product data to Firestore ---
        const productData: Omit<Product, 'id' | 'createdAt'> & { createdAt: any } = {
            name: values.name,
            description: values.description,
            category: values.category || '',
            startingPrice: values.startingPrice,
            unit: values.unit || '',
            imageUrl: values.imageUrl, // Store the provided URL string
            sellerId: user.uid, // Critical: Ensure sellerId is set correctly
            sellerName: userProfile?.displayName || user.displayName || user.email || 'Unknown Seller',
            createdAt: serverTimestamp(),
            currentHighestBid: null,
            bidCount: 0,
            auctionEndTime: null,
        };

        console.log("Attempting to add product to Firestore with data:", productData);
        const productsCollectionRef = collection(db, 'products');
        const docRef = await addDoc(productsCollectionRef, productData);

        console.log('Product listed successfully with ID: ', docRef.id);
        toast({ title: 'Success', description: 'Product listed successfully!' });
        router.push('/marketplace'); // Redirect after success

    } catch (error: any) {
        console.error('Error listing product in Firestore:', error);
        let errorMsg = 'Failed to list product. Please try again.';
        if (error.code === 'permission-denied') {
            errorMsg = "Permission denied. You might not have the required role or Firestore rules need adjustment.";
             // console.error("Firestore Rules Issue: Ensure authenticated farmers can write to the 'products' collection and set their own sellerId.");
        } else {
             errorMsg = `Failed to list product: ${error.message || 'Unknown error'}.`;
        }
        setFormError(errorMsg);
        toast({ title: 'Listing Failed', description: errorMsg, variant: 'destructive' });
    } finally {
        setIsLoading(false);
    }
  };

   if (authLoading || isProfileLoading) {
     return <div className="flex justify-center items-center min-h-[200px]"><Loader2 className="h-8 w-8 animate-spin" /> Loading user data...</div>;
   }

   // Handle case where user is loaded but not logged in
   if (!user && !authLoading) {
        return (
            <div className="space-y-6">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Access Denied</AlertTitle>
                    <AlertDescription>
                        You must be logged in to list a product. <Link href="/auth/login" className="underline">Login here</Link>.
                    </AlertDescription>
                </Alert>
                 <Button variant="outline" asChild>
                     <Link href="/marketplace"><ArrowLeft className="mr-2 h-4 w-4"/> Back to Marketplace</Link>
                 </Button>
            </div>
        );
    }

   // Handle profile loading error or if profile is explicitly null after loading
    if (!userProfile && !isProfileLoading) {
         return (
            <div className="space-y-6">
                 <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Profile Error</AlertTitle>
                    <AlertDescription>
                         {formError || "Could not load your user profile. Please try refreshing the page or contact support."}
                    </AlertDescription>
                 </Alert>
                  <Button variant="outline" asChild>
                     <Link href="/marketplace"><ArrowLeft className="mr-2 h-4 w-4"/> Back to Marketplace</Link>
                 </Button>
            </div>
         );
    }

    // Handle case where profile loaded, but user is not a farmer
     if (userProfile?.role !== UserRole.Farmer) {
         return (
            <div className="space-y-6">
                 <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Permission Denied</AlertTitle>
                    <AlertDescription>
                         Only Farmers can list products in the marketplace. Your current role is '{userProfile?.role || 'Unknown'}'.
                         {formError && <p className="mt-2">{formError}</p>} {/* Show profile not found error if applicable */}
                    </AlertDescription>
                 </Alert>
                  <Button variant="outline" asChild>
                     <Link href="/marketplace"><ArrowLeft className="mr-2 h-4 w-4"/> Back to Marketplace</Link>
                 </Button>
            </div>
        );
    }

  // Main form rendering if user is authenticated, profile loaded, and has farmer role
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
         <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild>
                 <Link href="/marketplace">
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Back to Marketplace</span>
                </Link>
             </Button>
            <h1 className="text-3xl font-bold flex items-center gap-2">
                <PackagePlus className="h-7 w-7" /> List Your Product
            </h1>
         </div>
         <p className="text-muted-foreground">Fill in the details below to add your product to the marketplace.</p>


      <Card>
        <CardHeader>
          <CardTitle>Product Details</CardTitle>
          <CardDescription>Provide information about the product you want to sell.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
               {/* Name Field */}
               <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Organic Tomatoes, Fresh Eggs" {...field} disabled={isLoading}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description Field */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Describe your product..." {...field} disabled={isLoading}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Category and Unit Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Category (Optional)</FormLabel>
                        <FormControl>
                        <Input placeholder="e.g., Vegetables, Fruits, Dairy" {...field} disabled={isLoading}/>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="unit"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Unit (Optional)</FormLabel>
                        <FormControl>
                        <Input placeholder="e.g., kg, dozen, liter, bunch" {...field} disabled={isLoading}/>
                        </FormControl>
                         <FormMessage />
                    </FormItem>
                    )}
                 />
              </div>

              {/* Starting Price Field */}
              <FormField
                control={form.control}
                name="startingPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Starting Bid Price (₹)</FormLabel> {/* Rupee symbol */}
                    <FormControl>
                       <Input type="number" step="0.01" placeholder="Enter starting price" {...field} disabled={isLoading}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Image URL Field */}
               <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Image URL <span className='text-destructive'>*</span></FormLabel>
                    <FormControl>
                        <Input
                            type="url"
                            placeholder="https://example.com/image.jpg"
                            {...field}
                            disabled={isLoading}
                        />
                    </FormControl>
                     <FormDescription>
                        Enter a direct link to your product image (e.g., from Imgur, a public drive). Ensure the link leads directly to the image file (ends in .jpg, .png etc.).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Preview Area for Image URL */}
               <div className="mt-4 space-y-2">
                <Label className="text-sm font-medium">Image Preview:</Label>
                <div className="min-h-[100px] border rounded-lg relative w-full aspect-video bg-muted flex items-center justify-center overflow-hidden">
                     {/* Use standard <img> tag for preview */}
                     {previewUrl ? (
                        <img
                             src={previewUrl}
                             alt="Image Preview"
                             className="max-w-full max-h-[200px] object-contain" // Limit size and contain within preview area
                             onError={() => {
                                 // Handle image loading errors for the URL
                                 setImagePreviewError(true);
                                 setPreviewUrl(null); // Clear broken preview
                                 toast({ title: "Preview Error", description: "Could not load image from URL. Please check the link.", variant: "destructive" });
                                 form.setError("imageUrl", { type: "manual", message: "Could not load image from URL. Check link validity." });
                             }}
                         />
                     ) : (
                         <div className="text-center text-muted-foreground p-4">
                             <ImageIcon className="mx-auto h-8 w-8 mb-1" />
                              Enter a valid image URL to see a preview.
                         </div>
                     )}
                      {imagePreviewError && !previewUrl && ( // Show specific error message if loading failed
                        <div className="absolute inset-0 flex items-center justify-center bg-destructive/10 text-destructive text-xs p-2 text-center">
                            Failed to load preview from URL. Please ensure it's a direct image link.
                        </div>
                     )}
                 </div>
               </div>


              {formError && (
                 <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{formError}</AlertDescription>
                 </Alert>
              )}

              <Button type="submit" className="w-full" disabled={isLoading || !form.formState.isValid}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PackagePlus className="mr-2 h-4 w-4" />}
                {isLoading ? 'Listing Product...' : 'List Product'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

