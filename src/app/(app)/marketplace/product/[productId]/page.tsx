
// src/app/(app)/marketplace/product/[productId]/page.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation'; // Use next/navigation
import { db } from '@/firebase/firebase.config';
import { doc, getDoc, collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { type Product, type Bid } from '@/types/product';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, AlertCircle, ArrowLeft, Tag, User, Calendar, Gavel, Info, QrCode, ShoppingCart } from 'lucide-react'; // Changed Landmark to QrCode
import Image from 'next/image'; // Keep using next/image for product image
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import BidModal from '@/components/marketplace/BidModal';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
// Removed Script import for Razorpay
import { useToast } from '@/hooks/use-toast'; // Import useToast
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"; // Import Dialog components


// Removed Razorpay window declaration

export default function ProductDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user, isConfigured } = useAuth();
    const productId = params?.productId as string | undefined; // Get productId from params
    const { toast } = useToast();


    const [product, setProduct] = useState<Product | null>(null);
    const [bids, setBids] = useState<Bid[]>([]);
    const [isLoadingProduct, setIsLoadingProduct] = useState(true);
    const [isLoadingBids, setIsLoadingBids] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isBidModalOpen, setIsBidModalOpen] = useState(false);
    const [showQrCodeModal, setShowQrCodeModal] = useState(false); // State for QR code modal visibility
    const [imageError, setImageError] = useState(false); // State for product image loading error

    // IMPORTANT: Replace this with the actual URL of your UPI QR code image
    const upiQrCodeImageUrl = "https://picsum.photos/300/300?random=qr"; // Placeholder QR Code Image URL

    useEffect(() => {
        if (!productId || !isConfigured || !db) {
             if (!productId) setError("Product ID is missing.");
             else setError("Database connection not configured.");
             setIsLoadingProduct(false);
             setIsLoadingBids(false);
            return;
        }

        // Fetch Product Details
        const productRef = doc(db, 'products', productId);
        const unsubscribeProduct = onSnapshot(productRef, (docSnap) => {
             if (docSnap.exists()) {
                 const data = docSnap.data();
                 // Convert Firestore Timestamps to Dates for client-side use
                 const createdAtDate = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
                 const auctionEndTimeDate = data.auctionEndTime?.toDate ? data.auctionEndTime.toDate() : null;

                 setProduct({
                     id: docSnap.id,
                     ...data,
                     createdAt: createdAtDate,
                     auctionEndTime: auctionEndTimeDate,
                 } as Product);
                 setError(null);
                 setImageError(false); // Reset image error on product load
             } else {
                 setError("Product not found.");
                 setProduct(null);
             }
             setIsLoadingProduct(false);
        }, (err) => {
             console.error("Error fetching product:", err);
             setError("Failed to load product details.");
             setIsLoadingProduct(false);
        });


        // Fetch Bids History (subcollection)
        const bidsRef = collection(db, `products/${productId}/bids`);
        const q = query(bidsRef, orderBy('bidTime', 'desc')); // Get newest bids first

         const unsubscribeBids = onSnapshot(q, (querySnapshot) => {
             const fetchedBids: Bid[] = [];
             querySnapshot.forEach((doc) => {
                 const data = doc.data();
                 fetchedBids.push({
                     id: doc.id,
                     ...data,
                     bidTime: data.bidTime?.toDate ? data.bidTime.toDate() : new Date(),
                 } as Bid);
             });
             setBids(fetchedBids);
             setIsLoadingBids(false);
         }, (err) => {
              console.error("Error fetching bids:", err);
              // Don't set main error for bids failure, maybe a smaller indicator
              // setError("Failed to load bid history.");
               setIsLoadingBids(false);
         });


        // Cleanup function
        return () => {
             unsubscribeProduct();
             unsubscribeBids();
         };

    }, [productId, isConfigured, db]);

    const formatTimestamp = (date: Date | undefined | null): string => {
         if (!date) return 'Unknown date';
         try {
             // Ensure date is a valid Date object
              if (!(date instanceof Date) || isNaN(date.getTime())) {
                 console.warn("Invalid date passed to formatTimestamp:", date);
                 return 'Invalid date';
             }
             return formatDistanceToNow(date, { addSuffix: true });
         } catch (e) {
             console.error("Error formatting date:", e);
             return 'Invalid date';
         }
     };

    const getInitials = (name: string | null | undefined): string => {
        if (!name) return 'U';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    };

     // Determine if the current user is the seller or the highest bidder
     const isSeller = user?.uid === product?.sellerId;
     const highestBid = bids.length > 0 ? bids[0] : null; // Assuming bids are sorted desc by time/amount
     const isHighestBidder = user?.uid === highestBid?.bidderId;
     const canPlaceBid = user && !isSeller; // Logged in and not the seller
     // Update condition for payment button: highest bidder and there's a positive bid amount
     const canPay = isHighestBidder && product?.currentHighestBid && product?.currentHighestBid > 0;


      // --- QR Code Payment Logic ---
     const handleShowQrCode = () => {
         if (!canPay || !product || !highestBid) {
             toast({ title: "Error", description: "Cannot initiate payment.", variant: "destructive" });
             return;
         }
         setShowQrCodeModal(true); // Open the QR code modal
     };
     // --- End QR Code Payment Logic ---


    if (isLoadingProduct) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-4">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
                 <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4"/> Go Back
                 </Button>
            </div>
        );
    }

    if (!product) {
         return <p>Product details not available.</p>;
    }

     // Determine image source (URL or fallback) for product image
    const productImageSrc = imageError || !product.imageUrl
        ? `https://picsum.photos/600/600?random=${product.id}` // Placeholder for product image
        : product.imageUrl; // URL string for product image


    return (
         <>
            {/* Remove Razorpay Script */}

            {/* Remove Payment Processing Overlay */}

            <div className="space-y-8">
                 <Button variant="outline" size="sm" onClick={() => router.back()} className="mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4"/> Back to Marketplace
                 </Button>

                 <Card className="overflow-hidden">
                    <div className="grid md:grid-cols-2 gap-0">
                         {/* Product Image Section */}
                         <div className="relative aspect-video md:aspect-square bg-muted">
                             {/* Use standard img or next/image based on URL source */}
                             <img
                                src={productImageSrc}
                                alt={product.name}
                                className="absolute inset-0 w-full h-full object-contain"
                                onError={() => setImageError(true)}
                                data-ai-hint="product image agriculture"
                            />
                            {imageError && (
                                <div className="absolute inset-0 flex items-center justify-center bg-muted/50 text-muted-foreground text-xs p-2">
                                    <span>Image not available</span>
                                </div>
                             )}
                        </div>

                        {/* Info Section */}
                        <div className="p-6 flex flex-col">
                            {product.category && <Badge variant="secondary" className="mb-2 w-fit">{product.category}</Badge>}
                            <CardTitle className="text-3xl font-bold mb-2">{product.name}</CardTitle>
                             <CardDescription className="text-base text-muted-foreground mb-4">
                                {product.description}
                             </CardDescription>

                             <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-muted-foreground mb-4 border-t pt-4">
                                <div><Tag className="inline h-4 w-4 mr-1" /> Unit: {product.unit || 'N/A'}</div>
                                <div><ShoppingCart className="inline h-4 w-4 mr-1" /> Starting: ₹{product.startingPrice.toFixed(2)}</div> {/* Use Rupee symbol */}
                                {product.sellerName && <div><User className="inline h-4 w-4 mr-1" /> Seller: {product.sellerName}</div>}
                                <div><Calendar className="inline h-4 w-4 mr-1" /> Listed: {formatTimestamp(product.createdAt)}</div>
                             </div>

                              <div className="mt-auto space-y-4">
                                  <Card className="bg-secondary/50 p-4">
                                      <h3 className="text-lg font-semibold mb-2">Bidding Status</h3>
                                     {product.currentHighestBid && product.currentHighestBid > product.startingPrice ? (
                                        <p className="text-xl font-bold text-primary">
                                            Current Bid: ₹{product.currentHighestBid.toFixed(2)} {/* Use Rupee symbol */}
                                        </p>
                                     ) : (
                                        <p className="text-lg font-semibold text-primary">
                                             Starting Price: ₹{product.startingPrice.toFixed(2)} {/* Use Rupee symbol */}
                                         </p>
                                     )}
                                     <p className="text-sm text-muted-foreground">
                                         ({product.bidCount || 0} {product.bidCount === 1 ? 'bid' : 'bids'} placed)
                                     </p>
                                      {/* Optional: Auction end time */}
                                      {product.auctionEndTime && (
                                           <p className="text-xs text-muted-foreground mt-1">Auction ends: {formatTimestamp(product.auctionEndTime)}</p>
                                       )}
                                  </Card>

                                {isSeller ? (
                                     <Button variant="outline" disabled>You listed this product</Button>
                                ) : (
                                    <div className="flex gap-2">
                                         <Button onClick={() => setIsBidModalOpen(true)} disabled={!canPlaceBid} className="flex-1">
                                            <Gavel className="mr-2 h-4 w-4" /> Place Bid
                                         </Button>
                                         {/* Updated "Pay Now" button to show QR code */}
                                         {canPay && (
                                            <Button onClick={handleShowQrCode} className="flex-1 bg-green-600 hover:bg-green-700">
                                                 <QrCode className="mr-2 h-4 w-4" /> Pay Now (₹{product.currentHighestBid?.toFixed(2)}) {/* Use Rupee symbol */}
                                             </Button>
                                         )}
                                     </div>
                                )}
                             </div>
                        </div>
                    </div>
                 </Card>

                 {/* Bid History Section */}
                 <Card>
                    <CardHeader>
                         <CardTitle>Bid History</CardTitle>
                         <CardDescription>See who has bid on this product.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoadingBids ? (
                            <div className="flex justify-center items-center py-6">
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                <span className="ml-2 text-muted-foreground">Loading bids...</span>
                             </div>
                        ) : bids.length === 0 ? (
                             <p className="text-center text-muted-foreground py-4">No bids have been placed yet.</p>
                        ) : (
                            <Table>
                                <TableHeader>
                                     <TableRow>
                                        <TableHead className="w-[50px]">Avatar</TableHead>
                                        <TableHead>Bidder</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                         <TableHead className="text-right">Time</TableHead>
                                     </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {bids.map((bid) => (
                                         <TableRow key={bid.id} className={bid.bidderId === user?.uid ? 'bg-primary/10' : ''}>
                                             <TableCell>
                                                 <Avatar className="h-8 w-8">
                                                     {/* TODO: Fetch actual avatar URL if stored */}
                                                     {/* <AvatarImage src={bid.bidderAvatarUrl} /> */}
                                                     <AvatarFallback>{getInitials(bid.bidderName)}</AvatarFallback>
                                                 </Avatar>
                                             </TableCell>
                                             <TableCell className="font-medium">{bid.bidderName || 'Anonymous'}{bid.bidderId === user?.uid ? ' (You)' : ''}</TableCell>
                                             <TableCell className="text-right font-semibold">₹{bid.bidAmount.toFixed(2)}</TableCell> {/* Use Rupee symbol */}
                                             <TableCell className="text-right text-xs text-muted-foreground">{formatTimestamp(bid.bidTime)}</TableCell>
                                         </TableRow>
                                     ))}
                                </TableBody>
                             </Table>
                        )}
                    </CardContent>
                 </Card>

             </div>

             {/* Bid Modal remains the same */}
             {product && (
                 <BidModal
                    isOpen={isBidModalOpen}
                    onClose={() => setIsBidModalOpen(false)}
                    product={product}
                 />
             )}

             {/* QR Code Payment Modal */}
              <Dialog open={showQrCodeModal} onOpenChange={setShowQrCodeModal}>
                 <DialogContent className="sm:max-w-md">
                     <DialogHeader>
                        <DialogTitle>Scan to Pay</DialogTitle>
                        <DialogDescription>
                            Scan the QR code below with your UPI app to complete the payment of ₹{product?.currentHighestBid?.toFixed(2)} for {product?.name}. {/* Use Rupee symbol */}
                        </DialogDescription>
                     </DialogHeader>
                     <div className="flex justify-center items-center p-4">
                         {/* Display the QR code image */}
                         <Image
                             src={upiQrCodeImageUrl} // Use the state variable or your actual QR code URL
                             alt="UPI Payment QR Code"
                             width={250}
                             height={250}
                             className="rounded-md border"
                             data-ai-hint="qr code payment upi"
                         />
                     </div>
                     <DialogFooter className="sm:justify-center">
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">
                                Close
                             </Button>
                         </DialogClose>
                         {/* Optionally add a button to confirm payment after scanning */}
                         {/* <Button type="button" onClick={handleConfirmPayment}>I have Paid</Button> */}
                     </DialogFooter>
                 </DialogContent>
             </Dialog>
         </>
    );
}

