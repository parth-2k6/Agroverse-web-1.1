// src/types/education.ts

import { type Timestamp } from 'firebase/firestore';

// Enum for content types
export enum ContentType {
    Article = 'Article',
    Video = 'Video',
    PDF = 'PDF',
    Guide = 'Guide', // If needed
}

// Interface for educational content items stored in Firestore
export interface EducationItem {
    id: string; // Firestore document ID
    title: string;
    description: string;
    type: ContentType; // Use the enum
    imageUrl?: string | null; // Optional URL for a thumbnail/preview image
    contentUrl?: string | null; // URL for videos, external articles, PDFs
    contentText?: string | null; // For articles written directly in the app
    authorId: string; // UID of the user who uploaded
    author?: string | null; // Display name of the author
    tags?: string[]; // Optional tags for filtering/searching
    createdAt: Date; // Use Date object in application code (converted from Timestamp)
    // Add other relevant fields like category, difficulty level, etc.
}
