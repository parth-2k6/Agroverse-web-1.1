// src/app/(app)/education/page.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { GraduationCap, BookOpen, Upload, Loader2, AlertCircle, Video, FileText } from 'lucide-react'; // Added icons
import { useAuth } from '@/context/AuthContext'; // To check user role for upload button
import { db } from '@/firebase/firebase.config'; // Firestore instance
import { collection, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';
import { type EducationItem, ContentType } from '@/types/education'; // Import EducationItem type
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'; // Import Alert
import Image from 'next/image'; // Use next/image
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton

export default function EducationPage() {
    const { user, isConfigured } = useAuth(); // Get user and config status
    const [content, setContent] = useState<EducationItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // TODO: Implement user role check if needed for upload button visibility
    const canUpload = user; // Placeholder: Allow logged-in users to upload for now

    useEffect(() => {
        if (!isConfigured || !db) {
            setError("Educational content unavailable: Database connection is not configured.");
            setIsLoading(false);
            return;
        }

        const fetchContent = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const contentRef = collection(db, 'education');
                const q = query(contentRef, orderBy('createdAt', 'desc'));
                const querySnapshot = await getDocs(q);
                const fetchedContent = querySnapshot.docs.map(doc => {
                     const data = doc.data();
                    return {
                        id: doc.id,
                        ...data,
                        // Convert Firestore Timestamp to Date
                        createdAt: (data.createdAt as Timestamp)?.toDate ? (data.createdAt as Timestamp).toDate() : new Date(),
                    } as EducationItem;
                });
                setContent(fetchedContent);
            } catch (err) {
                console.error("Error fetching educational content:", err);
                setError("Failed to load educational content. Please try again later.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchContent();
    }, [isConfigured]); // Rerun if config status changes

    const getIconForType = (type: ContentType) => {
        switch (type) {
            case ContentType.Video: return <Video className="h-4 w-4" />;
            case ContentType.Article: return <FileText className="h-4 w-4" />;
            case ContentType.PDF: return <FileText className="h-4 w-4" />; // Same icon for PDF/Article for now
            default: return <BookOpen className="h-4 w-4" />;
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                     <h1 className="text-3xl font-bold flex items-center gap-2">
                        <GraduationCap className="h-7 w-7" /> Educational Resources
                    </h1>
                    <p className="text-muted-foreground">Learn and grow with articles, guides, and videos.</p>
                </div>
                {canUpload && (
                     <Button asChild>
                        <Link href="/education/upload" className="flex items-center gap-2">
                            <Upload className="h-5 w-5" /> Upload Content
                        </Link>
                    </Button>
                )}
             </div>

             {/* Content Grid */}
             {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                     {[...Array(3)].map((_, i) => (
                        <Card key={i} className="overflow-hidden flex flex-col">
                             <Skeleton className="w-full h-40" />
                             <CardContent className="p-4 flex flex-col flex-grow space-y-2">
                                <Skeleton className="h-4 w-1/4" />
                                <Skeleton className="h-6 w-3/4" />
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-8 w-full mt-auto" />
                             </CardContent>
                        </Card>
                     ))}
                </div>
             ) : error ? (
                 <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error Loading Content</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
             ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {content.length > 0 ? (
                        content.map(item => (
                            <Card key={item.id} className="overflow-hidden flex flex-col">
                                <CardHeader className="p-0">
                                    {/* Use next/image with placeholder */}
                                    <Image
                                        src={item.imageUrl || `https://picsum.photos/300/200?random=${item.id}`} // Fallback image
                                        alt={item.title}
                                        width={300}
                                        height={200}
                                        className="w-full h-40 object-cover"
                                        data-ai-hint="education learning study agriculture"
                                        onError={(e) => (e.currentTarget.src = `https://picsum.photos/300/200?random=${item.id}`)} // Handle image load error
                                    />
                                </CardHeader>
                                <CardContent className="p-4 flex flex-col flex-grow">
                                     <CardDescription className="text-xs mb-1 uppercase tracking-wide flex items-center gap-1.5">
                                         {getIconForType(item.type)} {item.type} {item.author && `by ${item.author}`}
                                     </CardDescription>
                                    <CardTitle className="text-lg mb-2 line-clamp-2">{item.title}</CardTitle>
                                     <p className="text-sm text-muted-foreground mb-4 flex-grow line-clamp-3">{item.description}</p>
                                     {/* Link to content URL if available, otherwise maybe a detail page */}
                                     {item.contentUrl ? (
                                         <Button asChild variant="outline" size="sm" className="mt-auto w-full">
                                             <Link href={item.contentUrl} target="_blank" rel="noopener noreferrer" className='flex items-center gap-2'>
                                                 {getIconForType(item.type)}
                                                 {item.type === ContentType.Video ? 'Watch Video' : 'Read More'}
                                             </Link>
                                         </Button>
                                     ) : item.contentText ? (
                                        <Button variant="outline" size="sm" className="mt-auto w-full">
                                             <BookOpen className="mr-2 h-4 w-4" /> Read More {/* TODO: Link to a detail page */}
                                         </Button>
                                     ) : null }
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <p className="col-span-full text-center text-muted-foreground py-8">
                            No educational content available at the moment. Why not <Link href="/education/upload" className="text-primary hover:underline">upload something</Link>?
                        </p>
                    )}
                </div>
             )}
        </div>
    );
}
