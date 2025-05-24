
// src/types/product.ts

import { type Timestamp } from 'firebase/firestore'; // Import Timestamp type if used directly

export interface Product {
    id: string; // Firestore document ID
    name: string;
    description: string;
    category?: string; // Optional category
    startingPrice: number; // Use number for price, formatting happens in UI
    unit?: string; // e.g., 'kg', 'dozen', 'jar', '5lb bag'
    // Store the image as a publicly accessible URL string provided by the user
    imageUrl: string; // Expecting a URL, e.g., from Imgur, Cloudinary, etc.
    sellerId: string; // UID of the farmer who listed the product
    sellerName?: string; // Optional: Denormalized seller name for display
    createdAt: Date; // Use Date object in application code
    // Optional: Add fields for current highest bid, auction end time etc. if needed
    currentHighestBid?: number | null; // Use number for bid amount
    bidCount?: number;
    auctionEndTime?: Date | null; // Or Timestamp
}

export interface Bid {
    id?: string; // Firestore document ID (optional if subcollection)
    productId: string;
    bidderId: string; // UID of the consumer placing the bid
    bidderName?: string; // Optional: Denormalized bidder name
    bidAmount: number; // Use number for bid amount
    bidTime: Date; // Or Timestamp
    status?: 'active' | 'accepted' | 'rejected'; // Optional bid status
}

