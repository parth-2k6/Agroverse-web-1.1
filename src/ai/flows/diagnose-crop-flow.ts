'use server';
/**
 * @fileOverview A crop disease diagnosis AI agent using Gemini.
 *
 * - diagnoseCrop - A function that handles the crop diagnosis process.
 * - DiagnoseCropInput - The input type for the diagnoseCrop function.
 * - DiagnoseCropOutput - The return type for the diagnoseCrop function.
 */

import { ai } from '@/ai/ai-instance'; // Ensure ai-instance is set up
import { z } from 'zod'; // Import zod directly

// Import types from the dedicated types file
import {
    type DiagnoseCropInput,
    DiagnoseCropInputSchema,
    type DiagnoseCropOutput,
    DiagnoseCropOutputSchema
} from '@/ai/types/diagnose-crop-types';


// Exported wrapper function to call the flow
export async function diagnoseCrop(input: DiagnoseCropInput): Promise<DiagnoseCropOutput> {
  console.log("Diagnose Crop Flow Input:", input.photoDataUri ? input.photoDataUri.substring(0, 50) + "..." : "No Photo URI"); // Log truncated data URI safely
  // Basic input validation before calling the flow
  if (!input || !input.photoDataUri || !input.photoDataUri.startsWith('data:image/')) {
      console.error("Invalid input provided to diagnoseCrop:", input);
      throw new Error("Invalid input: Photo data URI is required and must be an image.");
  }
  try {
      const result = await diagnoseCropFlow(input);
      return result;
  } catch (error) {
        console.error("Error calling diagnoseCropFlow:", error);
         // Rethrow the error to be handled by the caller (e.g., the page component)
         // This ensures the caller knows the operation failed.
         throw error;
  }
}

// Define the Genkit prompt
const diagnoseCropPrompt = ai.definePrompt(
    {
        name: 'diagnoseCropPrompt',
        // Use a model that supports image input like gemini-1.5-flash-latest or gemini-pro-vision
        // Ensure the model name is correct and available in your Genkit config.
        // Using gemini-1.5-flash as it's often available and supports vision.
        model: 'googleai/gemini-1.5-flash',
        input: {
            schema: DiagnoseCropInputSchema, // Use imported schema
        },
        output: {
            schema: DiagnoseCropOutputSchema, // Use imported schema
        },
        prompt: `You are an expert agricultural pathologist specializing in identifying crop diseases from images.
Analyze the provided image of a plant part.

1. Determine if the image contains a plant. Set 'isPlant' accordingly. If not, set other fields to reflect this (e.g., diseaseName: 'Not a plant', symptoms: 'N/A', cure: 'N/A', suggestedMedicine: null, dosage: null).
2. If it is a plant, identify any visible diseases.
3. If a disease is identified, provide the 'diseaseName', describe the 'symptoms', recommend a 'cure' or management strategy.
4. Suggest a specific 'suggestedMedicine' (chemical or organic) and its 'dosage' if applicable. If multiple options exist, suggest the most common or effective one. Ensure dosage is appropriate (e.g., '2g per liter water', 'Spray weekly'). Return null for medicine/dosage if not applicable.
5. If the plant appears healthy, set 'diseaseName' to 'Healthy', 'symptoms' to 'No visible symptoms', 'cure' to 'N/A', 'suggestedMedicine' to null, and 'dosage' to null.

Respond strictly in the JSON format defined by the output schema.

Image: {{media url=photoDataUri}}`
    }
);


// Define the Genkit flow using the imported schemas
const diagnoseCropFlow = ai.defineFlow<
  typeof DiagnoseCropInputSchema,
  typeof DiagnoseCropOutputSchema
>(
  {
    name: 'diagnoseCropFlow',
    inputSchema: DiagnoseCropInputSchema,
    outputSchema: DiagnoseCropOutputSchema,
  },
  async (input) => {
    // Check the prompt object exists and has necessary properties
    if (!diagnoseCropPrompt) {
        console.error("diagnoseCropPrompt is not defined or initialized correctly.");
        throw new Error("Internal AI configuration error.");
    }
    // It seems diagnoseCropPrompt doesn't directly expose model config easily.
    // The model is implicitly used when calling the prompt.
    console.log("Executing diagnoseCropFlow...");


    // Basic validation inside the flow as well
    if (!input || !input.photoDataUri || !input.photoDataUri.startsWith('data:image/')) {
        console.error("Invalid input received inside diagnoseCropFlow:", input);
        throw new Error("Internal error: Invalid input received by the AI flow.");
    }

    try {
        console.log("Calling diagnoseCropPrompt with input...");
        // Pass the validated input object directly to the prompt function
        const result = await diagnoseCropPrompt(input);

        const output = result.output; // Access the output from the prompt result

        if (!output) {
            console.error("Gemini call returned undefined output.");
            throw new Error("AI model did not return a valid response structure.");
        }

        // Validate the output against the schema (already done by definePrompt, but good for safety)
        const validatedOutput = DiagnoseCropOutputSchema.parse(output);

        console.log("Diagnose Crop Flow Output:", validatedOutput);
        return validatedOutput;
    } catch (error) {
        console.error("Error during diagnoseCropPrompt execution:", { code: (error as any)?.code, message: (error as any)?.message, stack: (error as any)?.stack, originalError: error });
         throw error; // Rethrow the original error
    }

  }
);
