
// src/components/marketplace/BidModal.tsx
"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/firebase/firebase.config';
import { collection, addDoc, serverTimestamp, runTransaction, doc, getDoc, writeBatch } from 'firebase/firestore'; // Import getDoc and writeBatch
import { useToast } from '@/hooks/use-toast';
import { Loader2, Gavel, AlertCircle } from 'lucide-react';
import { type Product, type Bid } from '@/types/product';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


interface BidModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product;
}

// Zod schema for bid form validation
const bidSchema = z.object({
  bidAmount: z.coerce.number().positive({ message: 'Bid amount must be positive.' }),
});

type BidFormValues = z.infer<typeof bidSchema>;

export default function BidModal({ isOpen, onClose, product }: BidModalProps) {
    const { user, isConfigured } = useAuth();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const form = useForm<BidFormValues>({
        resolver: zodResolver(bidSchema),
        defaultValues: {
        // Set default slightly higher than current highest or starting price
        bidAmount: parseFloat((Math.max(product.currentHighestBid || 0, product.startingPrice) + 0.01).toFixed(2)),
        },
    });

    // Watch the bidAmount field to dynamically validate against current highest bid
    const bidAmountValue = form.watch('bidAmount');

     React.useEffect(() => {
         // Update default value if modal reopens or product data changes
         form.reset({
             bidAmount: parseFloat((Math.max(product.currentHighestBid || 0, product.startingPrice) + 0.01).toFixed(2)),
         });
     }, [isOpen, product, form]);


    const onSubmit = async (values: BidFormValues) => {
        if (!user || !isConfigured || !db) {
            setFormError('Cannot place bid. System not ready or user not logged in.');
            toast({ title: 'Error', description: 'Configuration or login issue.', variant: 'destructive' });
            return;
        }
         if (user.uid === product.sellerId) {
            setFormError('You cannot bid on your own product.');
             toast({ title: 'Error', description: 'Sellers cannot bid on their listings.', variant: 'destructive' });
            return;
         }

         // Ensure bid is higher than current highest or starting price
        const minimumBid = Math.max(product.currentHighestBid || 0, product.startingPrice);
        if (values.bidAmount <= minimumBid) {
             const minBidFormatted = `₹${minimumBid.toFixed(2)}`; // Format minimum bid with Rupee symbol
             setFormError(`Your bid must be higher than the current highest bid or starting price (${minBidFormatted}).`);
             toast({ title: 'Invalid Bid', description: `Bid must be greater than ${minBidFormatted}.`, variant: 'destructive' });
             return;
        }

        setIsLoading(true);
        setFormError(null);

        const productRef = doc(db, "products", product.id);
        const bidsRef = collection(db, `products/${product.id}/bids`);

        try {
             // ** Using a Transaction **
             // Transactions ensure atomicity: either all operations succeed or none do.
            await runTransaction(db, async (transaction) => {
                 // 1. Get the latest product data *within the transaction* to check for race conditions.
                 const productSnap = await transaction.get(productRef);
                 if (!productSnap.exists()) {
                     throw new Error("Product not found or has been removed.");
                 }
                 const currentProductData = productSnap.data() as Product;
                 const currentHighest = Math.max(currentProductData.currentHighestBid || 0, currentProductData.startingPrice);
                 const currentHighestFormatted = `₹${currentHighest.toFixed(2)}`; // Format with Rupee symbol

                 // 2. Re-verify bid amount against the *latest* data fetched within the transaction.
                 if (values.bidAmount <= currentHighest) {
                     throw new Error(`Bid too low. Someone placed a higher bid (${currentHighestFormatted}) just now. Please increase your bid.`);
                 }

                 // 3. Prepare the new bid document data.
                  const newBidData: Omit<Bid, 'id' | 'bidTime'> & { bidTime: any } = { // Ensure type matches needed fields
                    productId: product.id,
                    bidderId: user.uid,
                    bidderName: user.displayName || user.email?.split('@')[0] || 'Anonymous Bidder', // Fetch name from profile if possible
                    bidAmount: values.bidAmount,
                    bidTime: serverTimestamp(), // Use server timestamp for accuracy
                    status: 'active',
                 };

                 // 4. Add the new bid document to the subcollection *within the transaction*.
                 // We need a reference to the new document to add data.
                 const newBidRef = doc(bidsRef); // Create a reference for the new bid doc
                 transaction.set(newBidRef, newBidData); // Add the bid

                 // 5. Update the main product document *within the transaction*.
                 transaction.update(productRef, {
                    currentHighestBid: values.bidAmount,
                    bidCount: (currentProductData.bidCount || 0) + 1,
                    // Optionally update latest bidder info if needed:
                    // latestBidderId: user.uid,
                    // latestBidderName: user.displayName || user.email?.split('@')[0] || 'Anonymous Bidder',
                 });
             }); // End of transaction

            console.log('Bid placed successfully via transaction!');
            toast({ title: 'Bid Placed', description: `Your bid of ₹${values.bidAmount.toFixed(2)} was successful.` }); // Use Rupee symbol
            onClose(); // Close modal on success

        } catch (error: any) {
             console.error('Bid Transaction failed: ', error);
             // Provide more specific feedback if possible
             let errorMsg = error.message || 'Could not place your bid. Please try again.';
             if (error.code === 'permission-denied') {
                 errorMsg = "Permission denied. Check Firestore rules or if you're bidding on your own item.";
                  console.error("Firestore Permission Error Details:", error); // Log detailed error
             } else if (error.message.includes("Bid too low")) {
                 // Use the specific error message thrown in the transaction
                 errorMsg = error.message;
             }
              setFormError(errorMsg);
             toast({ title: 'Bid Failed', description: errorMsg, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

     // Calculate minimum bid required for display
    const minimumBidRequired = (Math.max(product.currentHighestBid || 0, product.startingPrice) + 0.01).toFixed(2);
    const minimumBidFormatted = `₹${minimumBidRequired}`; // Format with Rupee symbol


    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Place Bid on {product.name}</DialogTitle>
                    <DialogDescription>
                        Starting price: ₹{product.startingPrice.toFixed(2)}. {/* Rupee symbol */}
                        {product.currentHighestBid && product.currentHighestBid > product.startingPrice
                          ? ` Current highest bid: ₹${product.currentHighestBid.toFixed(2)}.` // Rupee symbol
                          : ' No bids yet.'}
                         <br/>
                         Enter an amount higher than {minimumBidFormatted}.
                    </DialogDescription>
                </DialogHeader>
                 <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                         <Label htmlFor="bidAmount" className="text-right col-span-1">
                            Your Bid (₹) {/* Rupee symbol */}
                         </Label>
                         <Input
                            id="bidAmount"
                            type="number"
                            step="0.01"
                            placeholder={`e.g., ${minimumBidRequired}`}
                            className="col-span-3"
                            {...form.register('bidAmount')}
                             disabled={isLoading}
                             min={minimumBidRequired} // HTML5 min attribute
                         />
                    </div>
                     {/* Display validation errors directly */}
                    {form.formState.errors.bidAmount && (
                        <p className="text-sm text-destructive col-span-4 text-center">{form.formState.errors.bidAmount.message}</p>
                    )}
                     {formError && (
                         <Alert variant="destructive" className="col-span-4">
                             <AlertCircle className="h-4 w-4" />
                             <AlertTitle>Error</AlertTitle>
                             <AlertDescription>{formError}</AlertDescription>
                         </Alert>
                     )}

                     <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="outline" disabled={isLoading}>Cancel</Button>
                        </DialogClose>
                        <Button type="submit" disabled={isLoading || !form.formState.isValid}> {/* Disable if form invalid */}
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Gavel className="mr-2 h-4 w-4" />}
                            {isLoading ? 'Placing Bid...' : 'Place Bid'}
                        </Button>
                    </DialogFooter>
                 </form>
            </DialogContent>
        </Dialog>
    );
}

