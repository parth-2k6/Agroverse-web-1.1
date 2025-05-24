
// src/actions/dispenseMedicine.ts
'use server';

import { z } from 'zod';

// Read the NodeMCU IP address from environment variable
// IMPORTANT: Prefix with NEXT_PUBLIC_ if you need to access this on the client too,
// but for a server action, non-prefixed is fine if set during build/server start.
// Using NEXT_PUBLIC_ here for potential flexibility or if called client-side eventually.
const NODEMCU_IP_ADDRESS = process.env.NEXT_PUBLIC_NODEMCU_IP_ADDRESS;
console.log(`[Server Action dispenseMedicine] NodeMCU IP Address from env: ${NODEMCU_IP_ADDRESS}`); // Log IP on server start/load


// Basic schema for the medicine name (could be expanded)
const MedicineSchema = z.string().min(1, { message: "Medicine name cannot be empty" });

/**
 * Sends an HTTP GET request to the NodeMCU device to trigger medicine dispensing.
 * @param medicineName The name of the medicine to dispense.
 * @returns Promise<boolean> - True if the request was likely sent successfully (status 200), false otherwise.
 * @throws Error if the request fails or the NodeMCU returns a non-200 status.
 */
export async function dispenseMedicine(medicineName: string): Promise<boolean> {
    console.log(`[Server Action] Attempting to dispense medicine: ${medicineName}`);

    // Validate input
    try {
        MedicineSchema.parse(medicineName);
    } catch (error) {
        console.error("[Server Action] Invalid medicine name:", error);
        throw new Error("Invalid medicine name provided.");
    }

    if (!NODEMCU_IP_ADDRESS) {
        console.error("[Server Action] Error: NEXT_PUBLIC_NODEMCU_IP_ADDRESS environment variable is not set.");
        throw new Error("Dispensing device IP address is not configured in environment variables (NEXT_PUBLIC_NODEMCU_IP_ADDRESS).");
    }

    const url = `http://${NODEMCU_IP_ADDRESS}/dispense?medicine=${encodeURIComponent(medicineName)}`;
    console.log(`[Server Action] Sending request to NodeMCU at: ${url}`);

    try {
        // Using fetch API available in Node.js 18+ and Next.js Edge/Serverless functions
        const response = await fetch(url, {
            method: 'GET',
            signal: AbortSignal.timeout(7000), // 7 seconds timeout
        });

        console.log(`[Server Action] NodeMCU response status: ${response.status}`);

        if (!response.ok) {
            let responseBody = 'No additional error details from device.';
            try {
                responseBody = await response.text();
            } catch (readError) {
                 console.warn("[Server Action] Failed to read error response body from NodeMCU.");
            }
            console.error(`[Server Action] NodeMCU returned error status ${response.status}. Body: ${responseBody}`);
            throw new Error(`Dispensing device responded with status ${response.status}.`);
        }

         // Example: Check response body for confirmation
        // const responseText = await response.text();
        // console.log("[Server Action] NodeMCU Response Text:", responseText);
        // if (!responseText.includes("Dispensing command received")) { // Adjust expected text
        //     console.warn("[Server Action] NodeMCU response did not contain expected confirmation.");
        //     // Depending on strictness, you might throw an error here
        //     // throw new Error("NodeMCU did not confirm dispensing command receipt.");
        // }


        console.log(`[Server Action] Successfully sent dispense command for ${medicineName} to ${NODEMCU_IP_ADDRESS}`);
        return true; // Indicate successful request dispatch

    } catch (error: any) {
        console.error(`[Server Action] Error sending request to NodeMCU: ${error.name} - ${error.message}`);
        if (error.name === 'TimeoutError' || error.code === 'ETIMEDOUT') {
            throw new Error(`Dispensing device did not respond within 7 seconds. Check connection and IP: ${NODEMCU_IP_ADDRESS}`);
        }
        if (error.code === 'ECONNREFUSED') {
             throw new Error(`Connection refused by dispensing device at ${NODEMCU_IP_ADDRESS}. Is it online and accessible?`);
        }
         if (error.code === 'ENETUNREACH' || error.code === 'EHOSTUNREACH') {
             throw new Error(`Network unreachable. Cannot connect to dispensing device at ${NODEMCU_IP_ADDRESS}.`);
        }
         if (error.code === 'ECONNRESET') {
             throw new Error(`Connection reset by dispensing device at ${NODEMCU_IP_ADDRESS}. Device might have restarted or closed the connection unexpectedly.`);
        }
         if (error.cause?.code === 'UND_ERR_CONNECT_TIMEOUT'){ // Node-fetch specific timeout
             throw new Error(`Connection timed out while connecting to the dispensing device at ${NODEMCU_IP_ADDRESS}.`);
         }

        // Re-throw a processed or generic error message
        throw new Error(`Failed to communicate with dispensing device: ${error.message}`);
    }
}
