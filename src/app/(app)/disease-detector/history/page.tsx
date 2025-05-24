
// src/app/(app)/disease-detector/history/page.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/firebase/firebase.config'; // db can be null
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, History, Image as ImageIcon, Microscope, ArrowLeft, AlertCircle } from 'lucide-react'; // Added AlertCircle
import Image from 'next/image';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns'; // For relative time

interface DiagnosisRecord {
    id: string;
    timestamp: Timestamp;
    imageUrl: string;
    diseaseName: string;
    symptoms: string;
    cure: string;
    suggestedMedicine?: string | null;
    dosage?: string | null;
}

export default function DiagnosisHistoryPage() {
    const { user, loading: authLoading, isConfigured } = useAuth(); // Get config status
    const [history, setHistory] = useState<DiagnosisRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (authLoading) return; // Wait for authentication state

        if (!isConfigured || !db) {
            setError("Firebase is not configured. Cannot load history.");
            setIsLoading(false);
            return;
        }

        if (!user) {
            setError("Please log in to view your diagnosis history.");
            setIsLoading(false);
            return;
        }

        const fetchHistory = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const historyRef = collection(db, `users/${user.uid}/diagnoses`);
                const q = query(historyRef, orderBy('timestamp', 'desc'), limit(20)); // Get latest 20 records
                const querySnapshot = await getDocs(q);

                const fetchedHistory: DiagnosisRecord[] = [];
                querySnapshot.forEach((doc) => {
                    fetchedHistory.push({ id: doc.id, ...doc.data() } as DiagnosisRecord);
                });
                setHistory(fetchedHistory);

            } catch (err) {
                console.error("Error fetching diagnosis history:", err);
                setError("Failed to load diagnosis history. Please try again later.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchHistory();

    }, [user, authLoading, isConfigured]); // Add isConfigured dependency

    const formatDate = (timestamp: Timestamp | null | undefined): string => {
        if (!timestamp) return 'Unknown date';
        try {
             const date = timestamp.toDate();
             const now = new Date();
             const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

             if (diffHours < 24 * 7) { // Less than 7 days old
                 return `${formatDistanceToNow(date, { addSuffix: true })}`;
             } else {
                 return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
             }
        } catch (e) {
             console.error("Error formatting date:", e);
             return 'Invalid date';
        }
    };


    return (
        <div className="space-y-6">
             <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                     <Link href="/disease-detector">
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">Back to Detector</span>
                    </Link>
                </Button>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <History className="h-7 w-7" /> Diagnosis History
                </h1>
             </div>
             <p className="text-muted-foreground">Review your past crop disease diagnosis records.</p>


            {isLoading || authLoading ? (
                <div className="flex justify-center items-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-2 text-muted-foreground">Loading history...</span>
                </div>
            ) : error ? (
                 <Alert variant="destructive">
                     {/* Use different icons based on error type */}
                    {error.includes("configured") ? <AlertCircle className="h-4 w-4" /> : <Microscope className="h-4 w-4" /> }
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                     {error.includes("log in") && (
                         <Link href="/auth/login" className="text-sm underline mt-2 block">Go to Login</Link>
                     )}
                </Alert>
            ) : history.length === 0 ? (
                 <Alert>
                    <Microscope className="h-4 w-4" />
                    <AlertTitle>No History Found</AlertTitle>
                    <AlertDescription>You haven't performed any crop diagnoses yet. <Link href="/disease-detector" className="text-primary hover:underline">Start diagnosing</Link>.</AlertDescription>
                </Alert>
            ) : (
                <div className="space-y-4">
                    {history.map((record) => (
                        <Card key={record.id}>
                            <CardHeader>
                                 <div className="flex justify-between items-start gap-4">
                                     <div>
                                        <CardTitle className="text-lg">{record.diseaseName}</CardTitle>
                                        <CardDescription>
                                            Diagnosed: {formatDate(record.timestamp)}
                                        </CardDescription>
                                     </div>
                                      {record.imageUrl && (
                                        <Image
                                            src={record.imageUrl}
                                            alt={`Diagnosis image for ${record.diseaseName}`}
                                            width={80}
                                            height={60}
                                            className="rounded-md object-cover flex-shrink-0"
                                         />
                                     )}
                                </div>

                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                 {record.diseaseName !== "Healthy" && record.diseaseName !== "Not a plant" && (
                                     <>
                                         <div>
                                            <span className="font-semibold">Symptoms:</span>
                                            <p className="text-muted-foreground text-xs">{record.symptoms}</p>
                                        </div>
                                        <div>
                                            <span className="font-semibold">Cure/Management:</span>
                                            <p className="text-muted-foreground text-xs">{record.cure}</p>
                                        </div>
                                        {record.suggestedMedicine && (
                                        <div className="grid grid-cols-2 gap-x-4">
                                             <div>
                                                 <span className="font-semibold">Medicine:</span>
                                                 <p className="text-muted-foreground text-xs">{record.suggestedMedicine}</p>
                                             </div>
                                             {record.dosage && (
                                                 <div>
                                                     <span className="font-semibold">Dosage:</span>
                                                     <p className="text-muted-foreground text-xs">{record.dosage}</p>
                                                 </div>
                                              )}
                                         </div>
                                         )}
                                     </>
                                )}
                                {record.diseaseName === "Healthy" && (
                                    <p className="text-green-600 dark:text-green-400">Plant was identified as healthy.</p>
                                )}
                                 {record.diseaseName === "Not a plant" && (
                                    <p className="text-orange-600 dark:text-orange-400">Analysis indicated the image was not a plant.</p>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
