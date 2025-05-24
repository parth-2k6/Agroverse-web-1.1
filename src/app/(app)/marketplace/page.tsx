
// src/app/(app)/marketplace/page.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ShoppingCart, PlusCircle, Search, Filter, Loader2, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext'; // To check user role maybe?
import { db } from '@/firebase/firebase.config'; // Firestore instance
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { type Product } from '@/types/product'; // Import Product type
import ProductCard from '@/components/marketplace/ProductCard'; // Import ProductCard
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'; // Import Alert

export default function MarketplacePage() {
    const { user, isConfigured } = useAuth(); // Get user and config status
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (!isConfigured || !db) {
            setError("Marketplace unavailable: Database connection is not configured.");
            setIsLoading(false);
            return;
        }

        const fetchProducts = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const productsRef = collection(db, 'products');
                // Optional: Order products, e.g., by creation time or name
                const q = query(productsRef, orderBy('createdAt', 'desc'));
                const querySnapshot = await getDocs(q);
                const fetchedProducts = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    // Ensure createdAt is converted if it's a Firestore Timestamp
                    createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(),
                })) as Product[];
                setProducts(fetchedProducts);
            } catch (err) {
                console.error("Error fetching products:", err);
                setError("Failed to load products. Please try again later.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchProducts();
    }, [isConfigured]); // Rerun if config status changes

    // TODO: Implement filtering logic based on searchTerm and other filters
    const filteredProducts = products.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sellerName?.toLowerCase().includes(searchTerm.toLowerCase()) || // Assuming sellerName exists
        product.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );

     // Determine if the current user is a farmer to show/hide the "List Product" button
     // This requires fetching the user's profile from Firestore, which should ideally be part of useAuth or fetched separately
     // Placeholder logic: Assume only logged-in users can potentially be farmers
     const canListProducts = user; // Replace with actual role check from user profile data

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                     <h1 className="text-3xl font-bold flex items-center gap-2">
                        <ShoppingCart className="h-7 w-7" /> Marketplace
                    </h1>
                    <p className="text-muted-foreground">Browse and buy agricultural products.</p>
                </div>
                {canListProducts && ( // Only show button if user potentially has farmer role
                 <Button asChild>
                     <Link href="/marketplace/upload" className="flex items-center gap-2">
                        <PlusCircle className="h-5 w-5" /> List Your Product
                    </Link>
                 </Button>
                )}
             </div>

              {/* Search and Filter Bar */}
             <Card>
                <CardContent className="pt-6 flex flex-col md:flex-row items-center gap-4">
                    <div className="relative flex-grow w-full md:w-auto">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search products, sellers, categories..."
                            className="pl-10 w-full"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            disabled={isLoading || !!error} // Disable search if loading or error
                        />
                    </div>
                    {/* Add more filters as needed (Dropdowns, Checkboxes etc) */}
                    <Button variant="outline" className="w-full md:w-auto" disabled={isLoading || !!error}>
                        <Filter className="mr-2 h-4 w-4" /> Filters
                    </Button>
                </CardContent>
             </Card>


            {/* Product Grid */}
             {isLoading ? (
                <div className="flex justify-center items-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-2 text-muted-foreground">Loading products...</span>
                </div>
             ) : error ? (
                 <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error Loading Marketplace</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
             ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {filteredProducts.length > 0 ? (
                        filteredProducts.map(product => (
                            <ProductCard key={product.id} product={product} />
                        ))
                    ) : (
                        <p className="col-span-full text-center text-muted-foreground py-8">
                            {products.length === 0 ? "No products listed yet." : "No products found matching your search criteria."}
                        </p>
                    )}
                </div>
             )}
        </div>
    );
}

