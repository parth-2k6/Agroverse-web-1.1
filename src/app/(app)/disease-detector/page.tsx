
// src/app/(app)/disease-detector/page.tsx
"use client";

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Microscope, Upload, AlertCircle, Sparkles, Bot, History } from 'lucide-react';
import DiseaseUpload from '@/components/disease-detector/DiseaseUpload';
import { diagnoseCrop } from '@/ai/flows/diagnose-crop-flow'; // Import the server action
import { type DiagnoseCropOutput } from '@/ai/types/diagnose-crop-types'; // Import the type
import { dispenseMedicine } from '@/actions/dispenseMedicine'; // Server action
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/firebase/firebase.config'; // db can be null
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import Link from 'next/link';


export default function DiseaseDetectorPage() {
    const { user, isConfigured } = useAuth(); // Get config status
    const { toast } = useToast();
    const [imageDataUri, setImageDataUri] = useState<string | null>(null);
    const [diagnosisResult, setDiagnosisResult] = useState<DiagnoseCropOutput | null>(null);
    const [isLoadingDiagnosis, setIsLoadingDiagnosis] = useState(false);
    const [isLoadingDispense, setIsLoadingDispense] = useState(false);
    const [diagnosisError, setDiagnosisError] = useState<string | null>(null);
    const [dispenseError, setDispenseError] = useState<string | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null); // For displaying the uploaded image

    const handleImageUpload = useCallback((dataUri: string, fileUrl: string) => {
        setImageDataUri(dataUri);
        setImageUrl(fileUrl); // Store the URL for display
        setDiagnosisResult(null); // Reset previous results
        setDiagnosisError(null);
        setDispenseError(null);
    }, []);

    const handleDiagnose = async () => {
         if (!isConfigured) {
            setDiagnosisError("Firebase is not configured. Cannot save diagnosis.");
             toast({ title: "Configuration Error", description: "Firebase not set up.", variant: "destructive" });
            return;
         }
        if (!user) {
            setDiagnosisError("Please log in to diagnose and save results.");
            toast({ title: "Login Required", variant: "destructive" });
            return;
        }
         if (!imageDataUri) {
            setDiagnosisError("Please upload an image first.");
            return;
        }
         if (!db) {
             setDiagnosisError("Database connection is unavailable. Cannot save diagnosis.");
             toast({ title: "Database Error", description: "Cannot connect to database.", variant: "destructive" });
             return;
         }


        setIsLoadingDiagnosis(true);
        setDiagnosisError(null);
        setDiagnosisResult(null); // Clear previous results

        let result: DiagnoseCropOutput | null = null; // Declare result variable here

         try {
             // Call the AI flow
             result = await diagnoseCrop({ photoDataUri: imageDataUri });

             console.log("Diagnosis result received:", result); // Log after successful assignment
             setDiagnosisResult(result);


             // Save diagnosis to Firestore only if it's a valid plant diagnosis (not 'Not a plant')
             // Ensure result is not null before accessing properties
             if (result && result.isPlant && result.diseaseName !== "Not a plant") {
                 try {
                     await addDoc(collection(db, `users/${user.uid}/diagnoses`), {
                        userId: user.uid,
                        timestamp: serverTimestamp(),
                        imageUrl: imageUrl, // Save the displayed image URL
                        isPlant: result.isPlant,
                        diseaseName: result.diseaseName,
                        symptoms: result.symptoms,
                        cure: result.cure,
                        suggestedMedicine: result.suggestedMedicine ?? null,
                        dosage: result.dosage ?? null,
                     });
                     toast({ title: "Diagnosis Saved", description: "Diagnosis record added to your history." });
                     console.log("Diagnosis saved to Firestore for user:", user.uid);
                 } catch (dbError) {
                      console.error("Firestore Save Error:", dbError);
                      toast({
                         title: "Save Failed",
                         description: "Diagnosis complete, but failed to save to history.",
                         variant: "destructive",
                       });
                      // Optionally set a separate error state for saving issues
                 }

             } else if (result && (result.isPlant === false || result.diseaseName === "Not a plant")) {
                 toast({ title: "Analysis Complete", description: "The image was identified as not being a plant." });
             }

             // Provide toast feedback based on the result
             if(result) {
                 toast({
                    title: "Diagnosis Complete",
                    description: result.diseaseName === "Healthy" ? "The plant appears healthy." : `Identified: ${result.diseaseName}`,
                 });
             } else {
                 // This case might indicate an unexpected null result from the flow
                  throw new Error("AI flow returned an unexpected null result.");
             }

        } catch (error) {
            console.error("Diagnosis Error:", error);
             const errorMsg = error instanceof Error ? error.message : "An unknown error occurred";
             // Corrected error message construction
             setDiagnosisError(`Failed to diagnose the image. ${errorMsg}. Please try again.`);
             toast({
                title: "Diagnosis Failed",
                description: `Could not get diagnosis: ${errorMsg}`,
                variant: "destructive",
            });
        } finally {
            setIsLoadingDiagnosis(false);
        }
    };


    const handleDispense = async () => {
        if (!diagnosisResult?.suggestedMedicine) {
            setDispenseError("No medicine suggested for dispensing.");
            return;
        }

        setIsLoadingDispense(true);
        setDispenseError(null);

        try {
            console.log(`Attempting to dispense: ${diagnosisResult.suggestedMedicine}`);
            const success = await dispenseMedicine(diagnosisResult.suggestedMedicine);

            if (success) {
                toast({
                    title: "Dispensing Triggered",
                    description: `Signal sent to dispense ${diagnosisResult.suggestedMedicine}.`,
                });
                console.log("Dispense signal sent successfully.");
            } else {
                 // The action should ideally throw an error for non-success cases handled by catch
                 throw new Error("Dispensing signal failed to send or device did not acknowledge.");
            }
        } catch (error: any) {
            console.error("Dispense Action Error:", error);
            const errorMsg = error.message.includes("ECONNREFUSED") || error.message.includes("ETIMEDOUT") || error.message.includes("ENETUNREACH") || error.message.includes("device did not respond") || error.message.includes("Connection refused")
                ? "Could not connect to the dispensing device. Ensure it's online, on the same network, and the IP address is correct in environment variables."
                : `Failed to trigger dispense: ${error.message || "Please check device connection and try again."}`;

            setDispenseError(errorMsg);
            toast({
                title: "Dispense Failed",
                description: errorMsg,
                variant: "destructive",
            });
        } finally {
            setIsLoadingDispense(false);
        }
    };

    // Render initial state or error if Firebase not configured
     if (!isConfigured) {
         return (
              <div className="space-y-6">
                   <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Feature Unavailable</AlertTitle>
                        <AlertDescription>
                            Firebase is not configured. The Disease Detector requires a connection to save and process data. Please check the application setup.
                        </AlertDescription>
                   </Alert>
              </div>
         );
     }


    return (
        <div className="space-y-6">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Microscope className="h-7 w-7" /> Crop Disease Detector
                    </h1>
                    <p className="text-muted-foreground">Upload a crop image to diagnose diseases using AI.</p>
                </div>
                <Button variant="outline" asChild>
                    <Link href="/disease-detector/history" className="flex items-center gap-2">
                        <History className="h-4 w-4" /> View History
                    </Link>
                 </Button>
             </div>


            <Card>
                <CardHeader>
                    <CardTitle>Upload Crop Image</CardTitle>
                    <CardDescription>Select or capture an image of the potentially diseased plant part.</CardDescription>
                </CardHeader>
                <CardContent>
                    <DiseaseUpload onImageUpload={handleImageUpload} currentImage={imageUrl} />
                     {/* Combined error display area */}
                     {(diagnosisError && !isLoadingDiagnosis) && (
                        <Alert variant="destructive" className="mt-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{diagnosisError}</AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>

            {imageDataUri && (
                <Button
                    onClick={handleDiagnose}
                    disabled={isLoadingDiagnosis || isLoadingDispense || !user || !isConfigured} // Also disable if not logged in or configured
                    className="w-full md:w-auto"
                >
                    {isLoadingDiagnosis ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    {isLoadingDiagnosis ? 'Diagnosing...' : (!user ? 'Login to Diagnose' : 'Run AI Diagnosis')}
                </Button>
            )}

            {isLoadingDiagnosis && (
                 <div className="flex items-center justify-center p-6 text-muted-foreground">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Analyzing image with AI...
                 </div>
            )}


            {diagnosisResult && !isLoadingDiagnosis && (
                <Card className="mt-6 border-primary/30">
                    <CardHeader>
                         <CardTitle className="flex items-center gap-2">
                            <Bot className="h-6 w-6 text-primary" /> AI Diagnosis Result
                        </CardTitle>
                        {imageUrl && (
                            <div className="mt-4 max-w-xs mx-auto">
                                <Image
                                    src={imageUrl}
                                    alt="Uploaded crop for diagnosis"
                                    width={300}
                                    height={200}
                                    className="rounded-md object-contain mx-auto"
                                />
                             </div>
                        )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                         {diagnosisResult.isPlant === false || diagnosisResult.diseaseName === "Not a plant" ? ( // Check isPlant flag if available
                             <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Analysis Result</AlertTitle>
                                <AlertDescription>The uploaded image does not appear to be a plant.</AlertDescription>
                            </Alert>
                         ) : diagnosisResult.diseaseName === "Healthy" ? (
                              <Alert variant="default" className="border-green-500 bg-green-50 dark:bg-green-900/30">
                                <Sparkles className="h-4 w-4 text-green-600" />
                                <AlertTitle className="text-green-700 dark:text-green-400">Plant is Healthy</AlertTitle>
                                <AlertDescription className="text-green-600 dark:text-green-300">
                                    The AI analysis indicates the plant is healthy. No disease detected.
                                </AlertDescription>
                            </Alert>
                         ) : (
                             <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <h3 className="font-semibold">Disease Name:</h3>
                                        <p>{diagnosisResult.diseaseName}</p>
                                    </div>
                                     <div>
                                        <h3 className="font-semibold">Suggested Medicine:</h3>
                                         <p>{diagnosisResult.suggestedMedicine || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     <div>
                                        <h3 className="font-semibold">Symptoms:</h3>
                                        <p className="text-sm text-muted-foreground">{diagnosisResult.symptoms}</p>
                                    </div>
                                     <div>
                                        <h3 className="font-semibold">Dosage:</h3>
                                        <p>{diagnosisResult.dosage || 'N/A'}</p>
                                    </div>
                                 </div>
                                <div>
                                    <h3 className="font-semibold">Recommended Cure / Management:</h3>
                                    <p className="text-sm text-muted-foreground">{diagnosisResult.cure}</p>
                                </div>

                                {diagnosisResult.suggestedMedicine && diagnosisResult.suggestedMedicine !== 'N/A' && (
                                    <>
                                        <Button
                                            onClick={handleDispense}
                                            disabled={isLoadingDispense || isLoadingDiagnosis}
                                            variant="secondary"
                                            className="w-full md:w-auto mt-4"
                                        >
                                            {isLoadingDispense ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : null}
                                            {isLoadingDispense ? 'Sending Signal...' : `Dispense ${diagnosisResult.suggestedMedicine}`}
                                        </Button>
                                        {dispenseError && (
                                             <Alert variant="destructive" className="mt-4">
                                                <AlertCircle className="h-4 w-4" />
                                                <AlertTitle>Dispense Error</AlertTitle>
                                                <AlertDescription>{dispenseError}</AlertDescription>
                                            </Alert>
                                        )}
                                        <p className="text-xs text-muted-foreground mt-2 text-center md:text-left">
                                             Ensure the NodeMCU device is connected to the network (IP: {process.env.NEXT_PUBLIC_NODEMCU_IP_ADDRESS || 'Not Set'}) and the correct medicine is loaded. Check console for details.
                                         </p>
                                    </>
                                )}
                             </>
                         )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

    