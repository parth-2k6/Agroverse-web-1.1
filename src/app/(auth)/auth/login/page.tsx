
"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Leaf, AlertCircle, Loader2 } from "lucide-react"; // Added Loader2
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation'; // Use Next.js router
import { useToast } from "@/hooks/use-toast";
import Link from 'next/link';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'; // Added Alert
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

// Zod schema for login form validation
const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters long." }),
});

type LoginFormValues = z.infer<typeof loginSchema>;


export default function LoginPage() {
    const { auth, isConfigured } = useAuth(); // Get auth instance and config status from context
    const router = useRouter();
    const { toast } = useToast();
    const [isLoadingGoogle, setIsLoadingGoogle] = React.useState(false);
    const [isLoadingEmail, setIsLoadingEmail] = React.useState(false);
    const [authError, setAuthError] = React.useState<string | null>(null); // General auth error (like config)
    const [emailAuthError, setEmailAuthError] = React.useState<string | null>(null); // Specific email/pass error


    const form = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
        email: "",
        password: "",
        },
    });


    const handleGoogleSignIn = async () => {
        setAuthError(null);
         setEmailAuthError(null);
        if (!isConfigured || !auth) {
            console.error("Login attempt failed: Firebase Auth is not configured or available.");
             setAuthError("Authentication service is not configured.");
             toast({ title: "Configuration Error", description: "Could not initialize authentication service.", variant: "destructive" });
            return;
        }
        setIsLoadingGoogle(true);
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            console.log("Google Sign-In Successful:", user);
            toast({
                title: "Login Successful",
                description: `Welcome back, ${user.displayName || user.email}!`,
            });
            router.push('/dashboard');
        } catch (error: any) {
            console.error("Google Sign-In Error:", error.code, error.message);
             toast({
                title: "Login Failed",
                description: error.message || "Could not sign in with Google. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsLoadingGoogle(false);
        }
    };

     const handleEmailSignIn = async (values: LoginFormValues) => {
        setAuthError(null);
        setEmailAuthError(null);
         if (!isConfigured || !auth) {
            console.error("Login attempt failed: Firebase Auth is not configured or available.");
             setAuthError("Authentication service is not configured.");
             toast({ title: "Configuration Error", description: "Could not initialize authentication service.", variant: "destructive" });
            return;
        }
        setIsLoadingEmail(true);
        try {
             const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
             const user = userCredential.user;
             console.log("Email/Password Sign-In Successful:", user);
             toast({
                 title: "Login Successful",
                 description: `Welcome back, ${user.displayName || user.email}!`,
             });
             router.push('/dashboard');
        } catch (error: any) {
            console.error("Email/Password Sign-In Error:", error.code, error.message);
            let friendlyMessage = "An error occurred during login. Please check your email and password.";
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                friendlyMessage = "Invalid email or password. Please try again.";
            } else if (error.code === 'auth/invalid-email') {
                friendlyMessage = "Invalid email format.";
            }
             setEmailAuthError(friendlyMessage);
             toast({
                title: "Login Failed",
                description: friendlyMessage,
                variant: "destructive",
            });
        } finally {
            setIsLoadingEmail(false);
        }
     }


    return (
        <Card>
            <CardHeader className="text-center">
                <Leaf className="mx-auto h-10 w-10 text-primary mb-2" />
                <CardTitle>Login to Agroverse</CardTitle>
                <CardDescription>Access your dashboard and marketplace.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 {authError && ( // Display general auth error (config issue)
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Configuration Error</AlertTitle>
                        <AlertDescription>{authError}</AlertDescription>
                    </Alert>
                 )}
                 {!isConfigured && !authError && ( // Show default config warning if no specific error
                     <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Configuration Error</AlertTitle>
                        <AlertDescription>
                            Firebase is not configured correctly. Login features are unavailable. Please check environment variables.
                         </AlertDescription>
                    </Alert>
                 )}

                {/* Email/Password Form */}
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleEmailSignIn)} className="space-y-4">
                       <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                                <Input placeholder="you@example.com" {...field} />
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
                                <Input type="password" placeholder="••••••••" {...field} />
                            </FormControl>
                             <FormMessage />
                            </FormItem>
                        )}
                        />
                         {emailAuthError && ( // Display specific email/pass auth error
                            <p className="text-sm font-medium text-destructive">{emailAuthError}</p>
                         )}
                        <Button type="submit" className="w-full" disabled={isLoadingEmail || !isConfigured}>
                           {isLoadingEmail && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Login with Email
                        </Button>
                    </form>
                 </Form>

                 <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                        Or continue with
                        </span>
                    </div>
                 </div>

                {/* Google Sign-In Button */}
                 <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleGoogleSignIn}
                    disabled={isLoadingGoogle || !isConfigured} // Disable if not configured or loading
                >
                     {isLoadingGoogle && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                     {!isLoadingGoogle && (
                         <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                            <path fill="currentColor" d="M488 261.8C488 403.3 381.5 512 244 512 109.8 512 0 402.2 0 256S109.8 0 244 0c72.5 0 134.5 29.4 180.6 76.5l-64 63.8C330.5 111.7 291.2 96 244 96c-85.9 0-156 70-156 156s70.1 156 156 156c97.8 0 130.1-72.8 134.4-110.2H244v-80h244z"></path>
                        </svg>
                     )}
                    Sign in with Google
                </Button>

            </CardContent>
             <CardFooter>
                 <p className="w-full text-center text-sm text-muted-foreground">
                    Don't have an account?{' '}
                    <Link href="/auth/signup" className="font-medium text-primary hover:underline">
                        Sign up
                    </Link>
                </p>
             </CardFooter>
        </Card>
    );
}
