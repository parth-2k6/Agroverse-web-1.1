
"use client";

import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton'; // For loading state
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, isConfigured, auth } = useAuth(); // Get config status and auth instance
  const router = useRouter();

  useEffect(() => {
    // If loading is finished and Firebase is configured but there's no user, redirect to login
    if (!loading && isConfigured && !user) {
      console.log("AppLayout: Firebase configured, no user found, redirecting to login.");
      router.replace('/auth/login'); // Use replace to avoid adding to history stack
    }
     // If loading is finished but Firebase is NOT configured, log it (user might see public pages or a warning)
     else if (!loading && !isConfigured) {
         console.warn("AppLayout: Firebase is not configured. Authentication check skipped.");
         // Depending on app requirements, you might redirect to an error page or allow access to public parts.
         // For now, we'll let it proceed but show a warning in the UI below.
     }

  }, [user, loading, isConfigured, router]);

  // While loading authentication state (and Firebase config check implicitly happens before)
  if (loading) {
    return (
        <div className="container mx-auto px-4 py-8 space-y-6">
             {/* Basic page skeleton */}
             <Skeleton className="h-8 w-1/4 mb-4" />
             <Skeleton className="h-40 w-full mb-6" />
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <Skeleton className="h-32 w-full" />
                 <Skeleton className="h-32 w-full" />
                 <Skeleton className="h-32 w-full" />
             </div>
        </div>
    );
  }

   // If Firebase is not configured after loading, show a warning overlay or message
  if (!isConfigured) {
    return (
         <div className="container mx-auto px-4 py-8">
             <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Configuration Error</AlertTitle>
                <AlertDescription>
                     Firebase is not configured correctly. Please check the environment variables. Some features might be unavailable.
                </AlertDescription>
             </Alert>
             {/* Optionally render children for public access, or return null */}
             {/* {children} */}
             <p className="mt-4 text-center text-muted-foreground">Loading content...</p>
         </div>
    );
  }

   // If Firebase is configured, but there's no user after loading, redirect is happening
  if (!user) {
    return (
        <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
             <p className="text-muted-foreground">Redirecting to login...</p>
        </div>
    ); // Or a minimal "Redirecting..." message
  }

  // If user is authenticated and Firebase is configured, render the children
  return <>{children}</>;
}
