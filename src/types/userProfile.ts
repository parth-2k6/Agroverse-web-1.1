
// src/types/userProfile.ts

// Define roles using an enum for better type safety and readability
export enum UserRole {
    Farmer = 'farmer',
    Consumer = 'consumer',
    Admin = 'admin', // Optional: Add an admin role if needed later
}

// Define the structure for user profile data stored in Firestore
export interface UserProfile {
    uid: string; // Firebase Auth User ID
    email: string;
    displayName: string;
    role: UserRole;
    createdAt: Date; // Or Firestore Timestamp if preferred server-side
    // Add other optional fields
    phoneNumber?: string | null;
    location?: string | null;
    farmName?: string | null; // Specific to farmers
    // Add other relevant fields
}
