
// src/ai/ai-instance.ts
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai'; // Corrected import for genkit v1+
// import { defineDotprompt } from '@genkit-ai/dotprompt'; // If using .prompt files
import { z } from 'zod'; // Import zod directly if needed globally, otherwise import in specific files

// Load API Key from environment variables
// Make sure NEXT_PUBLIC_GEMINI_API_KEY is set in your .env.local file
const googleApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

if (!googleApiKey) {
  console.warn("NEXT_PUBLIC_GEMINI_API_KEY environment variable not set. Genkit Google AI plugin might not work.");
  // Consider throwing an error if the key is absolutely required for the app to function
  // throw new Error("Missing NEXT_PUBLIC_GEMINI_API_KEY environment variable.");
} else {
    console.log("Gemini API Key loaded successfully."); // Confirm key load
}


// Configure Genkit with the Google AI plugin
// NOTE: In Genkit v1+, configuration is typically done directly in the `genkit()` call.
// The `configureGenkit` function is deprecated.
export const ai = genkit({
  plugins: [
    googleAI({
        // Conditionally include apiKey only if it exists
        ...(googleApiKey && { apiKey: googleApiKey }),
        // Default model options if needed - these can be overridden in specific calls
        // defaultModel: 'gemini-1.5-flash-latest', // Example default model
        // defaultOptions: { temperature: 0.7 },
        // You might need to specify API version if issues persist
        // apiVersion: 'v1beta', // or 'v1'
    }),
    // Add other plugins like dotprompt here if you use them
    // Currently, dotprompt is causing issues, so commenting it out
    // defineDotprompt(...)
  ],
  logLevel: 'debug', // Set log level (e.g., 'debug', 'info', 'warn', 'error')
  enableTracing: true, // Enable tracing for debugging flows
});

console.log("Genkit AI instance initialized with Google AI plugin.");

// Example of defining a prompt using DotPrompt (if using .prompt files)
// You would create a file like `src/ai/prompts/example.prompt`
// This part needs the `@genkit-ai/dotprompt` package which seems to be causing issues
// defineDotprompt(
//   {
//     name: 'examplePrompt',
//     model: 'googleai/gemini-1.5-flash-latest', // Specify model here or use default
//     input: { schema: z.object({ name: z.string() }) },
//     output: { format: 'text' },
//   },
//   `Tell me a joke about {{name}}.` // Handlebars syntax
// );

