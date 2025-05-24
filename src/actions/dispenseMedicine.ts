
// src/actions/dispenseMedicine.ts
'use server';

import { z } from 'zod';

// Read the NodeMCU IP address from environment variable
const NODEMCU_IP_ADDRESS = process.env.NEXT_PUBLIC_NODEMCU_IP_ADDRESS;
// Placeholder for a specific string NodeMCU might send if a medicine bottle is not ready/empty.
const NODEMCU_BOTTLE_NOT_FOUND_INDICATOR = "BOTTLE_NOT_READY_FOR";

// Log the IP address when the server action module is loaded/used by Vercel
console.log(`[Server Action dispenseMedicine] NodeMCU IP Address from env: ${NODEMCU_IP_ADDRESS}`);
if (!NODEMCU_IP_ADDRESS) {
    console.error("[Server Action dispenseMedicine] CRITICAL: NEXT_PUBLIC_NODEMCU_IP_ADDRESS is not set in the Vercel environment.");
} else {
    // Check if the IP address looks like a private/local IP
    const ipPattern = /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|127\.|169\.254\.)/;
    if (ipPattern.test(NODEMCU_IP_ADDRESS)) {
        console.warn(`[Server Action dispenseMedicine] WARNING: The configured NodeMCU IP address '${NODEMCU_IP_ADDRESS}' appears to be a private/local IP address. Vercel functions may not be able to reach it unless it's publicly accessible (e.g., via ngrok or port forwarding).`);
    }
}


const MedicineSchema = z.string().min(1, { message: "Medicine name cannot be empty" });

export async function dispenseMedicine(medicineName: string): Promise<boolean> {
    console.log(`[Server Action dispenseMedicine] Attempting to dispense: ${medicineName}. NodeMCU Target IP: ${NODEMCU_IP_ADDRESS}`);

    try {
        MedicineSchema.parse(medicineName);
    } catch (error) {
        console.error("[Server Action dispenseMedicine] Invalid medicine name:", error);
        // It's good practice to throw an error that the client can understand or log.
        // However, ensure it doesn't leak sensitive details.
        throw new Error("Invalid medicine name provided.");
    }

    if (!NODEMCU_IP_ADDRESS) {
        console.error("[Server Action dispenseMedicine] Error: NEXT_PUBLIC_NODEMCU_IP_ADDRESS environment variable is not set or not accessible in this server environment.");
        // This specific error message should be clear enough for the client.
        throw new Error("Dispensing device IP address is not configured. Please contact support or check Vercel environment variables.");
    }

    const url = `http://${NODEMCU_IP_ADDRESS}/dispense?medicine=${encodeURIComponent(medicineName)}`;
    console.log(`[Server Action dispenseMedicine] Sending GET request to NodeMCU at: ${url}`);

    try {
        const response = await fetch(url, {
            method: 'GET',
            signal: AbortSignal.timeout(10000), // Increased timeout to 10 seconds for potentially slower public connections
        });

        const responseStatus = response.status;
        const responseText = await response.text(); // Get response text for checking and logging
        console.log(`[Server Action dispenseMedicine] NodeMCU response status: ${responseStatus}`);
        console.log("[Server Action dispenseMedicine] NodeMCU Response Text:", responseText);


        if (!response.ok) {
            console.error(`[Server Action dispenseMedicine] NodeMCU request failed. Status: ${responseStatus}, Body: ${responseText}`);
            // Check if the response text contains the specific indicator for bottle not found
            if (responseText.includes(`${NODEMCU_BOTTLE_NOT_FOUND_INDICATOR}_${medicineName}`)) {
                console.warn(`[Server Action dispenseMedicine] NodeMCU indicated bottle not found for ${medicineName}.`);
                throw new Error(`BOTTLE_NOT_FOUND:${medicineName}`); // Specific error for client to catch
            }
            // Generic error if not the specific bottle issue
            throw new Error(`Dispensing device responded with status ${responseStatus}. Message: ${responseText}`);
        }

        console.log(`[Server Action dispenseMedicine] Successfully sent dispense command for ${medicineName} to ${NODEMCU_IP_ADDRESS}. NodeMCU response: ${responseText}`);
        return true;

    } catch (error: any) {
        console.error(`[Server Action dispenseMedicine] Error during fetch operation or processing NodeMCU response: ${error.name} - ${error.message}`);
        console.error("[Server Action dispenseMedicine] Full error object:", error); // Log the full error object on the server
        
        // If it's already our specific BOTTLE_NOT_FOUND error, re-throw it
        if (error.message && error.message.startsWith('BOTTLE_NOT_FOUND:')) {
            throw error;
        }

        let clientErrorMessage = 'Failed to communicate with dispensing device. Check connection and logs.';
        // Handle specific network and timeout errors
        if (error.name === 'TimeoutError' || error.code === 'ETIMEDOUT' || error.name === 'AbortError') {
            clientErrorMessage = `Dispensing device did not respond within 10 seconds. Check connection and IP: ${NODEMCU_IP_ADDRESS}. Ensure it's publicly accessible.`;
        } else if (error.code === 'ECONNREFUSED') {
             clientErrorMessage = `Connection refused by dispensing device at ${NODEMCU_IP_ADDRESS}. Is it online and publicly accessible?`;
        } else if (error.code === 'ENETUNREACH' || error.code === 'EHOSTUNREACH') {
             clientErrorMessage = `Network unreachable. Cannot connect to dispensing device at ${NODEMCU_IP_ADDRESS}. Check firewall or network configuration.`;
        } else if (error.code === 'ECONNRESET') {
             clientErrorMessage = `Connection reset by dispensing device at ${NODEMCU_IP_ADDRESS}.`;
        } else if (error.cause?.code === 'UND_ERR_CONNECT_TIMEOUT'){ // Node-fetch specific timeout
             clientErrorMessage = `Connection timed out to dispensing device at ${NODEMCU_IP_ADDRESS}.`;
        } else if (error.message && error.message.includes("fetch failed")) { // Generic fetch failure often DNS or network
            clientErrorMessage = `Failed to fetch from NodeMCU at ${NODEMCU_IP_ADDRESS}. Ensure the address is correct and the device is accessible from Vercel's network.`;
        } else if (error.message) {
            clientErrorMessage = `Communication error with dispensing device: ${error.message}`;
        }

        // Re-throw a processed or generic error message that is safe for the client
        throw new Error(clientErrorMessage);
    }
}
