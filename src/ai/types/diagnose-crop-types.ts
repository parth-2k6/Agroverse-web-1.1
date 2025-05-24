
import { z } from 'zod'; // Import zod directly

// Define the input schema using zod
export const DiagnoseCropInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a plant leaf or affected crop part, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
// Define the TypeScript type derived from the input schema
export type DiagnoseCropInput = z.infer<typeof DiagnoseCropInputSchema>;

// Define the output schema using zod
export const DiagnoseCropOutputSchema = z.object({
  isPlant: z.boolean().describe("Whether the image contains a plant."),
  diseaseName: z.string().describe("The common name of the identified disease (e.g., 'Late Blight', 'Powdery Mildew', 'Healthy', 'Not a plant'). If healthy, return 'Healthy'. If not a plant, return 'Not a plant'."),
  symptoms: z.string().describe("A brief description of the disease symptoms visible or typically associated."),
  cure: z.string().describe("Recommended treatment or management strategy for the disease."),
  suggestedMedicine: z.string().nullable().describe("Specific chemical or organic pesticide/fungicide suggested (e.g., 'Copper fungicide', 'Neem oil', 'Mancozeb'). Return null if healthy or not applicable."),
  dosage: z.string().nullable().describe("Recommended dosage or application instructions for the suggested medicine (e.g., '2g per liter water', 'Spray weekly'). Return null if healthy or not applicable."),
});
// Define the TypeScript type derived from the output schema
export type DiagnoseCropOutput = z.infer<typeof DiagnoseCropOutputSchema>;
