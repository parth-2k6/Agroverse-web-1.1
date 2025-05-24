
// src/app/(app)/dashboard/advice-history/page.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/firebase/firebase.config'; // db can be null
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, History, Lightbulb, Thermometer, Droplets, Waves, Sun, CloudRain, ArrowLeft, AlertCircle } from 'lucide-react'; // Added AlertCircle
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns'; // For relative time

// Structure mirroring Firestore document
interface AdviceRecord {
    id: string;
    timestamp: Timestamp;
    advice: string;
    sensorDataSnapshot: {
        temperature?: number | null;
        humidity?: number | null;
        soilMoisture?: number | null;
        lightIntensity?: number | null;
        rainDetected?: boolean | null;
        waterLevel?: number | null;
    };
}

export default function AdviceHistoryPage() {
    const { user, loading: authLoading, isConfigured } = useAuth(); // Get config status
    const [history, setHistory] = useState<AdviceRecord[]>([]);
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
            setError("Please log in to view your advice history.");
            setIsLoading(false);
            return;
        }

        const fetchHistory = async () => {
            setIsLoading(true);
            setError(null);
            try {
                 // Reference the correct subcollection: users/{userId}/adviceHistory
                const historyRef = collection(db, `users/${user.uid}/adviceHistory`);
                const q = query(historyRef, orderBy('timestamp', 'desc'), limit(25)); // Get latest 25 records
                const querySnapshot = await getDocs(q);

                const fetchedHistory: AdviceRecord[] = [];
                querySnapshot.forEach((doc) => {
                    // Basic validation to ensure data structure consistency
                    const data = doc.data();
                    if (data.timestamp && data.advice && data.sensorDataSnapshot) {
                        fetchedHistory.push({ id: doc.id, ...data } as AdviceRecord);
                    } else {
                         console.warn(`Skipping incomplete advice record: ${doc.id}`);
                    }
                });
                setHistory(fetchedHistory);

            } catch (err) {
                console.error("Error fetching advice history:", err);
                setError("Failed to load advice history. Please try again later.");
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

     // Helper to format sensor data from snapshot for display
    const formatSensorSnapshot = (data: AdviceRecord['sensorDataSnapshot']): string => {
        if (!data || Object.keys(data).length === 0) return 'No sensor data recorded.';
        const parts: string[] = [];
        if (data.temperature !== null && data.temperature !== undefined) parts.push(`Temp: ${data.temperature}°C`);
        if (data.humidity !== null && data.humidity !== undefined) parts.push(`Hum: ${data.humidity}%`);
        if (data.soilMoisture !== null && data.soilMoisture !== undefined) parts.push(`Soil: ${data.soilMoisture}%`);
        if (data.lightIntensity !== null && data.lightIntensity !== undefined) parts.push(`Light: ${data.lightIntensity} lux`);
        if (data.rainDetected !== null && data.rainDetected !== undefined) parts.push(`Rain: ${data.rainDetected ? 'Yes' : 'No'}`);
        if (data.waterLevel !== null && data.waterLevel !== undefined) parts.push(`Water: ${data.waterLevel} cm`);
        return parts.length > 0 ? parts.join(' | ') : 'Sensor data available but contained no values.';
    };


    return (
        <div className="space-y-6">
             <div className="flex items-center gap-4">
                 <Button variant="outline" size="icon" asChild>
                     <Link href="/dashboard">
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">Back to Dashboard</span>
                    </Link>
                 </Button>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <History className="h-7 w-7" /> AI Advice History
                </h1>
             </div>
             <p className="text-muted-foreground">Review past AI-generated recommendations based on sensor data.</p>


            {isLoading || authLoading ? (
                <div className="flex justify-center items-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-2 text-muted-foreground">Loading history...</span>
                </div>
            ) : error ? (
                 <Alert variant="destructive">
                    {/* Use different icons based on error type */}
                    {error.includes("configured") ? <AlertCircle className="h-4 w-4" /> : <Lightbulb className="h-4 w-4" /> }
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                    {error.includes("log in") && (
                         <Link href="/auth/login" className="text-sm underline mt-2 block">Go to Login</Link>
                     )}
                </Alert>
            ) : history.length === 0 ? (
                 <Alert>
                    <Lightbulb className="h-4 w-4" />
                    <AlertTitle>No Advice History Found</AlertTitle>
                    <AlertDescription>You haven't generated any AI advice yet. Go to the <Link href="/dashboard" className="text-primary hover:underline">Dashboard</Link> to generate recommendations.</AlertDescription>
                </Alert>
            ) : (
                <div className="space-y-4">
                    {history.map((record) => (
                        <Card key={record.id} className="bg-card/80 hover:bg-card transition-colors">
                            <CardHeader>
                                 <div className="flex justify-between items-start gap-4">
                                     <div>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <Lightbulb className="h-5 w-5 text-primary" /> Advice Generated
                                        </CardTitle>
                                        <CardDescription>
                                            {formatDate(record.timestamp)}
                                        </CardDescription>
                                     </div>
                                     {/* Optional: Add a small icon or indicator */}
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                 <div>
                                     <span className="font-semibold">Recommendation:</span>
                                     <p className="text-foreground/90">{record.advice || 'No advice text found.'}</p>
                                 </div>
                                 <div className="border-t pt-3 mt-3">
                                     <span className="font-semibold text-xs text-muted-foreground">Sensor Data Snapshot:</span>
                                     <p className="text-xs text-muted-foreground">{formatSensorSnapshot(record.sensorDataSnapshot)}</p>
                                 </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
