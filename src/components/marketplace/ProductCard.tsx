
// src/components/marketplace/ProductCard.tsx
"use client";

import React, { useState } from 'react';
// Use standard img for URLs, next/image might require config for external domains
// import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { type Product } from '@/types/product';
import { Tag, User, Calendar, Gavel } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import BidModal from './BidModal';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

interface ProductCardProps {
    product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
    const { user } = useAuth();
    const [isBidModalOpen, setIsBidModalOpen] = useState(false);
    const [imageError, setImageError] = useState(false); // Keep for handling broken URLs

    const formatTimestamp = (date: Date | undefined): string => {
        if (!date) return 'Unknown date';
        try {
            // Ensure date is a valid Date object before formatting
             if (!(date instanceof Date) || isNaN(date.getTime())) {
                // Try converting Firestore Timestamp if needed (though Product type expects Date)
                const potentialDate = (date as any)?.toDate ? (date as any).toDate() : null;
                if (potentialDate && !isNaN(potentialDate.getTime())) {
                    return formatDistanceToNow(potentialDate, { addSuffix: true });
                }
                console.warn("Invalid date passed to formatTimestamp:", date);
                return 'Invalid date';
            }
            return formatDistanceToNow(date, { addSuffix: true });
        } catch (e) {
            console.error("Error formatting date:", e);
            return 'Invalid date';
        }
    };

    const canBid = user && user.uid !== product.sellerId;

    const handleBidClick = (e: React.MouseEvent) => {
        e.preventDefault(); // Prevent link navigation when clicking button
        e.stopPropagation(); // Stop event bubbling
        if (!canBid) {
            console.log("Cannot bid on your own product or not logged in.");
            return;
        }
        setIsBidModalOpen(true);
    };

    // Determine the image source - use provided URL or a placeholder on error
    const imageSrc = imageError || !product.imageUrl
        ? 'https://picsum.photos/300/200?random=' + product.id // Fallback if error or no image URL
        : product.imageUrl; // Use the URL string directly

    return (
        <>
            {/* Wrap Card with Link */}
            <Link href={`/marketplace/product/${product.id}`} passHref legacyBehavior>
              <a className="flex h-full group cursor-pointer"> {/* Added group and cursor */}
                <Card className="overflow-hidden flex flex-col h-full group-hover:shadow-lg transition-shadow duration-200 w-full">
                    <CardHeader className="p-0">
                        <div className="relative w-full h-40 bg-muted"> {/* Added background color */}
                             {/* Use standard img tag for displaying URLs */}
                            <img
                                src={imageSrc}
                                alt={product.name}
                                className="absolute inset-0 w-full h-full object-cover" // Use absolute positioning and cover
                                onError={() => setImageError(true)} // Handle loading errors (broken links)
                                data-ai-hint="farm product agriculture produce"
                             />
                             {/* Optional: Show placeholder/icon if image fails */}
                             {imageError && (
                                <div className="absolute inset-0 flex items-center justify-center bg-muted/50 text-muted-foreground text-xs p-2">
                                    <span>Image not available</span>
                                </div>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 flex flex-col flex-grow">
                        <CardTitle className="text-lg mb-1 line-clamp-1">{product.name}</CardTitle>
                         {product.category && (
                             <CardDescription className="text-xs mb-2 flex items-center gap-1 text-muted-foreground">
                                <Tag className="h-3 w-3" /> {product.category}
                             </CardDescription>
                         )}
                        <p className="text-sm text-muted-foreground mb-3 flex-grow line-clamp-3">{product.description}</p>

                         <div className="text-xs text-muted-foreground space-y-1 mb-3 mt-auto border-t pt-2">
                             {product.sellerName && (
                                <div className="flex items-center gap-1">
                                    <User className="h-3 w-3" /> Seller: {product.sellerName}
                                </div>
                             )}
                             <div className="flex items-center gap-1">
                                 <Calendar className="h-3 w-3" /> Listed: {formatTimestamp(product.createdAt)}
                             </div>
                        </div>


                        <div className="flex justify-between items-center">
                             <span className="text-lg font-semibold text-primary">
                                ₹{product.startingPrice.toFixed(2)} {/* Use Rupee symbol */}
                                 {product.unit && <span className="text-xs text-muted-foreground ml-1">/{product.unit}</span>}
                             </span>
                             <Button
                                size="sm"
                                onClick={handleBidClick} // Removed stopPropagation here, added to link wrapper click
                                disabled={!canBid}
                                title={!canBid ? "You cannot bid on your own product" : "Place a bid"}
                             >
                                <Gavel className="mr-1 h-4 w-4" /> Bid
                             </Button>
                        </div>
                    </CardContent>
                </Card>
              </a>
            </Link>
            {/* BidModal remains outside the Link */}
            {product && (
                <BidModal
                    isOpen={isBidModalOpen}
                    onClose={() => setIsBidModalOpen(false)}
                    product={product}
                />
            )}
        </>
    );
}

