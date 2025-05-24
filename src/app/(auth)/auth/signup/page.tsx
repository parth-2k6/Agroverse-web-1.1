
"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Leaf, AlertCircle, Loader2, UserCheck, Tractor } from "lucide-react"; // Added role icons
import { GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'; // Import RadioGroup
import { db } from '@/firebase/firebase.config'; // Import db
import { doc, setDoc } from 'firebase/firestore'; // Import Firestore functions
import { type UserProfile, UserRole } from '@/types/userProfile'; // Import UserProfile type

// Zod schema for signup form validation including role and name
const signupSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters long." }),
  confirmPassword: z.string(),
  role: z.enum([UserRole.Farmer, UserRole.Consumer], { required_error: "Please select a role." }), // Add role validation
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"], // path of error
});

type SignupFormValues = z.infer<typeof signupSchema>;


export default function SignupPage() {
    const { auth, isConfigured } = useAuth(); // Get auth instance and config status
    const router = useRouter();
    const { toast } = useToast();
    const [isLoadingGoogle, setIsLoadingGoogle] = React.useState(false);
    const [isLoadingEmail, setIsLoadingEmail] = React.useState(false);
    const [authError, setAuthError] = React.useState<string | null>(null); // General auth error
    const [emailAuthError, setEmailAuthError] = React.useState<string | null>(null); // Specific email signup error

    const form = useForm<SignupFormValues>({
        resolver: zodResolver(signupSchema),
        defaultValues: {
          name: "",
          email: "",
          password: "",
          confirmPassword: "",
          role: undefined, // Default role undefined
        },
    });

    // Function to create or update user profile in Firestore
    const createUserProfile = async (userId: string, email: string | null, name: string | null, role: UserRole): Promise<void> => {
        if (!db) {
            console.error("Firestore instance is not available.");
             toast({ title: "Profile Error", description: "Could not save user profile - database connection failed.", variant: "destructive" });
            // Don't block signup, but log error
            return;
        }
         if (!userId) {
            console.error("User ID is missing, cannot create profile.");
            return; // Should not happen if called after successful auth
        }

        const userDocRef = doc(db, "users", userId);
        const userProfileData: UserProfile = {
            uid: userId,
            email: email || '',
            displayName: name || email?.split('@')[0] || 'New User', // Use provided name or generate fallback
            role: role,
            createdAt: new Date(), // Use client-side date for simplicity here
            // Add other profile fields as needed later
            phoneNumber: '',
            location: '',
        };

        try {
            // Using setDoc with merge: true might be safer if profile could partially exist
            await setDoc(userDocRef, userProfileData);
            console.log(`User profile created/updated for ${userId} with role ${role}`);
        } catch (error) {
            console.error("Error creating/updating user profile in Firestore:", error);
            toast({ title: "Profile Save Error", description: "Failed to save user role information.", variant: "destructive" });
             // Again, don't block signup flow, but log the error
        }
    };


    const handleGoogleSignUp = async () => {
        setAuthError(null);
        setEmailAuthError(null);
        if (!isConfigured || !auth) {
            console.error("Signup attempt failed: Firebase Auth is not configured or available.");
            setAuthError("Authentication service is not configured.");
            toast({ title: "Configuration Error", description: "Could not initialize authentication service.", variant: "destructive" });
            return;
        }

        // Prompt user for role *before* Google sign-in (or handle after, but pre-selection is clearer)
        // This basic example assumes a default role or needs a separate UI step
        // For simplicity, let's assume 'Consumer' role for direct Google sign-up in this example.
        // A better approach would involve a modal or an intermediary step to select the role.
        const selectedRole = UserRole.Consumer; // Or UserRole.Farmer, or prompt user
        console.warn("Google Sign-Up assumes role:", selectedRole, "- Implement role selection UI for better experience.");


        setIsLoadingGoogle(true);
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            console.log("Google Sign-Up Successful:", user);

             // Create profile in Firestore with the assumed/selected role
             await createUserProfile(user.uid, user.email, user.displayName, selectedRole);

            toast({
                title: "Sign Up Successful",
                description: `Welcome to Agroverse, ${user.displayName || user.email}!`,
            });
            router.push('/dashboard'); // Redirect after successful sign up
        } catch (error: any) {
            console.error("Google Sign-Up Error:", error.code, error.message);
            toast({
                title: "Sign Up Failed",
                description: error.message || "Could not sign up with Google. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsLoadingGoogle(false);
        }
    };

    const handleEmailSignUp = async (values: SignupFormValues) => {
        setAuthError(null);
        setEmailAuthError(null);
        if (!isConfigured || !auth) {
            console.error("Signup attempt failed: Firebase Auth is not configured or available.");
            setAuthError("Authentication service is not configured.");
            toast({ title: "Configuration Error", description: "Could not initialize authentication service.", variant: "destructive" });
            return;
        }
        setIsLoadingEmail(true);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
            const user = userCredential.user;
            console.log("Email/Password Sign-Up Successful:", user);

            // Update Firebase Auth profile display name
            await updateProfile(user, { displayName: values.name });
            console.log("Firebase Auth profile updated with display name.");

             // Create profile in Firestore with selected role and name
             await createUserProfile(user.uid, values.email, values.name, values.role);

            toast({
                title: "Sign Up Successful",
                description: `Welcome to Agroverse, ${values.name}!`,
            });
            router.push('/dashboard'); // Redirect after successful sign up
        } catch (error: any) {
            console.error("Email/Password Sign-Up Error:", error.code, error.message);
            let friendlyMessage = "An error occurred during sign up. Please try again.";
            if (error.code === 'auth/email-already-in-use') {
                friendlyMessage = "This email is already registered. Please log in instead.";
            } else if (error.code === 'auth/invalid-email') {
                friendlyMessage = "Invalid email format.";
            } else if (error.code === 'auth/weak-password') {
                 friendlyMessage = "Password is too weak. It should be at least 6 characters long.";
            }
            setEmailAuthError(friendlyMessage);
            toast({
                title: "Sign Up Failed",
                description: friendlyMessage,
                variant: "destructive",
            });
        } finally {
            setIsLoadingEmail(false);
        }
    };


    return (
        <Card>
            <CardHeader className="text-center">
                 <Leaf className="mx-auto h-10 w-10 text-primary mb-2" />
                <CardTitle>Create an Agroverse Account</CardTitle>
                <CardDescription>Join our platform to get started.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {authError && ( // Display general auth error (config issue)
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Configuration Error</AlertTitle>
                        <AlertDescription>{authError}</AlertDescription>
                    </Alert>
                 )}
                 {!isConfigured && !authError && ( // Show default config warning
                     <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Configuration Error</AlertTitle>
                        <AlertDescription>
                            Firebase is not configured correctly. Sign up features are unavailable. Please check environment variables.
                         </AlertDescription>
                    </Alert>
                 )}

                {/* Email/Password Sign Up Form */}
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleEmailSignUp)} className="space-y-4">
                         <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Full Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="Your Name" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                         />
                       <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                    <Input type="email" placeholder="you@example.com" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Password</FormLabel>
                                <FormControl>
                                    <Input type="password" placeholder="Minimum 6 characters" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="confirmPassword"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Confirm Password</FormLabel>
                                <FormControl>
                                    <Input type="password" placeholder="Re-enter your password" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Role Selection */}
                        <FormField
                            control={form.control}
                            name="role"
                            render={({ field }) => (
                                <FormItem className="space-y-3">
                                <FormLabel>Select Your Role</FormLabel>
                                <FormControl>
                                    <RadioGroup
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                    className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4"
                                    >
                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                        <FormControl>
                                        <RadioGroupItem value={UserRole.Farmer} />
                                        </FormControl>
                                        <FormLabel className="font-normal flex items-center gap-1">
                                            <Tractor className="h-4 w-4 text-muted-foreground"/> Farmer
                                        </FormLabel>
                                    </FormItem>
                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                        <FormControl>
                                        <RadioGroupItem value={UserRole.Consumer} />
                                        </FormControl>
                                        <FormLabel className="font-normal flex items-center gap-1">
                                            <UserCheck className="h-4 w-4 text-muted-foreground"/> Consumer
                                        </FormLabel>
                                    </FormItem>
                                    </RadioGroup>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                         />


                        {emailAuthError && ( // Display specific email signup error
                            <p className="text-sm font-medium text-destructive">{emailAuthError}</p>
                         )}
                        <Button type="submit" className="w-full" disabled={isLoadingEmail || !isConfigured}>
                           {isLoadingEmail && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Sign Up with Email
                        </Button>
                    </form>
                 </Form>

                 <div className="relative my-6"> {/* Increased margin */}
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                        Or continue with
                        </span>
                    </div>
                 </div>

                {/* Google Sign Up Button */}
                 <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleGoogleSignUp}
                    disabled={isLoadingGoogle || !isConfigured} // Disable if not configured or loading
                 >
                      {isLoadingGoogle && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                     {!isLoadingGoogle && (
                         <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                            <path fill="currentColor" d="M488 261.8C488 403.3 381.5 512 244 512 109.8 512 0 402.2 0 256S109.8 0 244 0c72.5 0 134.5 29.4 180.6 76.5l-64 63.8C330.5 111.7 291.2 96 244 96c-85.9 0-156 70-156 156s70.1 156 156 156c97.8 0 130.1-72.8 134.4-110.2H244v-80h244z"></path>
                        </svg>
                     )}
                    Sign up with Google
                </Button>

            </CardContent>
             <CardFooter>
                <p className="w-full text-center text-sm text-muted-foreground">
                    Already have an account?{' '}
                    <Link href="/auth/login" className="font-medium text-primary hover:underline">
                        Log in
                    </Link>
                </p>
             </CardFooter>
        </Card>
    );
}

