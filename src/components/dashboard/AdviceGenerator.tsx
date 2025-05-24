
// src/components/dashboard/AdviceGenerator.tsx
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Lightbulb, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card'; // Optional for styling
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Import Alert
import { db } from '@/firebase/firebase.config'; // db can be null
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';


// Define the expected structure of sensor data (allow null/undefined)
interface SensorData {
  temperature?: number | null;
  humidity?: number | null;
  soilMoisture?: number | null; // Changed from soil_moisture if mapped in parent
  lightIntensity?: number | null; // Changed from light_intensity if mapped in parent
  rainDetected?: boolean | null;
  waterLevel?: number | null;
  // Add other sensor types as needed
}

interface AdviceGeneratorProps {
  sensorData: SensorData; // Accept potentially empty or partially filled object
}

// Mock function to simulate calling an AI service (replace with Genkit flow)
const fetchAIAdvice = async (data: SensorData): Promise<string> => {
  console.log("Mock Fetching AI advice for:", data);
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  // More comprehensive mock logic
  const adviceParts: string[] = [];

  if (data.temperature === null || data.temperature === undefined) {
     adviceParts.push("Temperature data missing.");
  } else if (data.temperature > 32) {
    adviceParts.push("High temperatures detected. Ensure adequate ventilation and consider shading sensitive plants.");
  } else if (data.temperature < 10) {
    adviceParts.push("Low temperatures detected. Protect sensitive crops from potential frost damage.");
  }

  if (data.humidity === null || data.humidity === undefined) {
      adviceParts.push("Humidity data missing.");
  } else if (data.humidity > 80) {
    adviceParts.push("High humidity levels. Improve air circulation to prevent fungal diseases.");
  } else if (data.humidity < 30) {
     adviceParts.push("Low humidity levels. This might stress plants, especially if temperatures are high.");
  }

   if (data.soilMoisture === null || data.soilMoisture === undefined) {
     adviceParts.push("Soil Moisture data missing.");
   } else if (data.soilMoisture < 35) {
    adviceParts.push("Soil moisture is low. Consider irrigating your crops soon.");
  } else if (data.soilMoisture > 75) {
     adviceParts.push("Soil moisture is high. Ensure proper drainage to avoid root rot.");
  }

   if (data.rainDetected === true) {
     adviceParts.push("Rain detected. Irrigation might not be needed currently.");
   }

    if (data.waterLevel === null || data.waterLevel === undefined) {
      // Don't explicitly mention missing water level unless critical?
    } else if (data.waterLevel < 10) {
     adviceParts.push("Water level in the tank is low. Check the water source.");
   }

   // Add checks for light intensity if relevant to advice
   // if (data.lightIntensity === null || data.lightIntensity === undefined) { adviceParts.push("Light intensity data missing."); }


  if (adviceParts.length === 0) {
     return "Current conditions appear stable based on available data. Continue monitoring.";
  }

  // Filter out "missing data" messages if other advice exists
  const coreAdvice = adviceParts.filter(part => !part.includes("missing"));
  if (coreAdvice.length > 0) {
      return coreAdvice.join(' ');
  } else {
      // If only "missing data" messages remain, return a summary
      return "Sensor data is incomplete. Cannot provide full advice. " + adviceParts.join(' ');
  }
};

export default function AdviceGenerator({ sensorData }: AdviceGeneratorProps) {
  const { user, isConfigured } = useAuth(); // Get config status
  const [advice, setAdvice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleGenerateAdvice = async () => {
     setError(null); // Clear previous errors

    if (!isConfigured) {
        setError("Firebase is not configured. Cannot generate or save advice.");
        toast({ title: "Configuration Error", description: "Firebase not set up.", variant: "destructive" });
        return;
    }
    if (!user) {
      setError("Please log in to generate and save advice.");
      toast({ title: "Login Required", variant: "destructive" });
      return;
    }
    if (!db) {
        setError("Database connection is unavailable. Cannot save advice history.");
        toast({ title: "Database Error", description: "Cannot connect to database.", variant: "destructive" });
        return;
    }

    if (!sensorData || Object.keys(sensorData).length === 0 || Object.values(sensorData).every(v => v === null || v === undefined)) {
       setError("No valid sensor data available to generate advice.");
       toast({ title: "No Sensor Data", description: "Cannot generate advice without sensor readings.", variant: "destructive" });
       return;
    }


    setIsLoading(true);
    setAdvice(null); // Clear previous advice

    try {
      // TODO: Replace with actual call to your Genkit flow
      // Example: const generatedAdvice = await yourGenkitAdviceFlow(sensorData);
      const generatedAdvice = await fetchAIAdvice(sensorData);
      setAdvice(generatedAdvice);
      toast({
        title: "Advice Generated",
        description: "New AI-powered advice is ready.",
      });

      // --- Save advice to Firestore ---
       try {
           const adviceHistoryRef = collection(db, `users/${user.uid}/adviceHistory`);
           await addDoc(adviceHistoryRef, {
               timestamp: serverTimestamp(),
               sensorDataSnapshot: sensorData, // Store the sensor data used for this advice
               advice: generatedAdvice,
               userId: user.uid,
           });
           console.log("Advice saved to Firestore history for user:", user.uid);
           // Optional: toast({ title: "Advice Saved", description: "Advice added to your history." });
       } catch (firestoreError) {
           console.error("Error saving advice to Firestore:", firestoreError);
            toast({
                title: "Save Warning",
                description: "Advice generated, but failed to save to history.",
                variant: "destructive", // Use destructive or default based on severity preference
            });
       }
      // --- End Firestore saving ---

    } catch (err) {
      console.error("Error generating advice:", err);
      const errorMsg = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(`Failed to generate advice. ${errorMsg}`);
      toast({
        title: "Generation Error",
        description: `Could not generate advice: ${errorMsg}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to format the sensor data display string, handling null/undefined
  const formatSensorDataString = (data: SensorData): string => {
    const parts: string[] = [];
    if (data.temperature !== null && data.temperature !== undefined) parts.push(`Temp: ${data.temperature}°C`);
    if (data.humidity !== null && data.humidity !== undefined) parts.push(`Humidity: ${data.humidity}%`);
    if (data.soilMoisture !== null && data.soilMoisture !== undefined) parts.push(`Soil: ${data.soilMoisture}%`);
    if (data.lightIntensity !== null && data.lightIntensity !== undefined) parts.push(`Light: ${data.lightIntensity} lux`);
    if (data.rainDetected !== null && data.rainDetected !== undefined) parts.push(`Rain: ${data.rainDetected ? 'Yes' : 'No'}`);
    if (data.waterLevel !== null && data.waterLevel !== undefined) parts.push(`Water Level: ${data.waterLevel} cm`);

    return parts.length > 0 ? `Using data: ${parts.join(', ')}.` : 'Waiting for sensor data...';
  };

  // Check if there is any valid sensor data to process
  const hasValidSensorData = sensorData && Object.values(sensorData).some(v => v !== null && v !== undefined);


  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {formatSensorDataString(sensorData)}
      </p>
      <Button
        className="w-full"
        onClick={handleGenerateAdvice}
        disabled={isLoading || !hasValidSensorData || !isConfigured || !user} // Disable if loading, no data, not configured, or not logged in
      >
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Lightbulb className="mr-2 h-4 w-4" />
        )}
        {isLoading ? 'Generating...' :
         !isConfigured ? 'Setup Required' :
         !user ? 'Login Required' :
         !hasValidSensorData ? 'Waiting for Data' :
         'Generate Advice'}
      </Button>

      {error && (
         <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {advice && !isLoading && (
        <Card className="mt-4 bg-secondary/50 border-primary/30">
          <CardContent className="p-4">
             <p className="text-sm font-medium">AI Recommendation:</p>
            <p className="text-sm text-foreground">{advice}</p>
          </CardContent>
        </Card>
      )}
       {/* Placeholder for loading advice */}
       {isLoading && !advice && (
            <div className="text-sm text-muted-foreground text-center pt-4 flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Generating advice...
             </div>
       )}
       {!hasValidSensorData && !isLoading && !error && isConfigured && user && (
            <div className="text-sm text-muted-foreground text-center pt-4">
                Cannot generate advice without valid sensor data.
            </div>
       )}
        {!isConfigured && !isLoading && !error && (
             <div className="text-sm text-destructive text-center pt-4">
                 Firebase connection needed for advice generation.
             </div>
        )}
         {!user && !isLoading && !error && isConfigured &&(
              <div className="text-sm text-muted-foreground text-center pt-4">
                  Please log in to generate advice.
              </div>
         )}
    </div>
  );
}
