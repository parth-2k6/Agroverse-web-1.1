// src/app/(app)/profile/page.tsx
"use client";

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Mail, Phone, MapPin, Edit } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProfilePage() {
    const { user, loading } = useAuth();
    // Add state for editing mode, profile data if fetched from Firestore
    const [isEditing, setIsEditing] = React.useState(false);
    const [profileData, setProfileData] = React.useState({
        displayName: '',
        phoneNumber: '',
        location: '',
        // Add other fields as needed (e.g., farm name, bio)
    });

    React.useEffect(() => {
        if (user) {
            // TODO: Fetch user profile data from Firestore based on user.uid
            // For now, populate with auth data
            setProfileData({
                displayName: user.displayName || '',
                phoneNumber: user.phoneNumber || '', // Often not available from Google Auth
                location: '', // Needs to be fetched/set by user
            });
        }
    }, [user]);

    // TODO: Handle profile update logic (save to Firestore)
    const handleProfileUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        console.log("Updating profile:", profileData);
        // Call Firestore update function here
        setIsEditing(false); // Exit editing mode after save
    };

    if (loading) {
        return <ProfileSkeleton />;
    }

    if (!user) {
        // Should be redirected by layout, but good fallback
        return <p>Please log in to view your profile.</p>;
    }

    const getInitials = (name: string | null | undefined): string => {
        if (!name) return 'U';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Your Profile</h1>

            <Card>
                <CardHeader className="flex flex-col md:flex-row items-center gap-4 border-b pb-4">
                     <Avatar className="h-20 w-20">
                        <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User Avatar'} data-ai-hint="user avatar profile picture" />
                        <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-grow text-center md:text-left">
                        <CardTitle className="text-2xl">{isEditing ? 'Edit Profile' : user.displayName || 'User Profile'}</CardTitle>
                        <CardDescription className="flex items-center gap-1 justify-center md:justify-start text-muted-foreground">
                             <Mail className="h-4 w-4" /> {user.email}
                        </CardDescription>
                         {/* Add other static info like role if available */}
                    </div>
                    <Button variant={isEditing ? "default" : "outline"} onClick={() => setIsEditing(!isEditing)}>
                        <Edit className="mr-2 h-4 w-4" /> {isEditing ? 'Cancel' : 'Edit Profile'}
                    </Button>
                </CardHeader>
                <CardContent className="pt-6">
                    {isEditing ? (
                        <form onSubmit={handleProfileUpdate} className="space-y-4">
                            <div>
                                <Label htmlFor="displayName">Display Name</Label>
                                <Input
                                    id="displayName"
                                    value={profileData.displayName}
                                    onChange={(e) => setProfileData({ ...profileData, displayName: e.target.value })}
                                    placeholder="Your full name"
                                />
                            </div>
                            <div>
                                <Label htmlFor="phoneNumber">Phone Number</Label>
                                <Input
                                    id="phoneNumber"
                                    type="tel"
                                    value={profileData.phoneNumber}
                                    onChange={(e) => setProfileData({ ...profileData, phoneNumber: e.target.value })}
                                    placeholder="Your phone number"
                                />
                            </div>
                            <div>
                                <Label htmlFor="location">Location / Address</Label>
                                <Input
                                    id="location"
                                    value={profileData.location}
                                    onChange={(e) => setProfileData({ ...profileData, location: e.target.value })}
                                    placeholder="Your city, state or farm address"
                                />
                            </div>
                             {/* Add more editable fields here */}
                             <div className="flex justify-end gap-2">
                                <Button type="button" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                                <Button type="submit">Save Changes</Button>
                             </div>
                        </form>
                    ) : (
                        <div className="space-y-4">
                            <ProfileInfoItem icon={User} label="Display Name" value={profileData.displayName || user.displayName || <span className="italic text-muted-foreground">Not set</span>} />
                            <ProfileInfoItem icon={Phone} label="Phone Number" value={profileData.phoneNumber || <span className="italic text-muted-foreground">Not set</span>} />
                            <ProfileInfoItem icon={MapPin} label="Location" value={profileData.location || <span className="italic text-muted-foreground">Not set</span>} />
                             {/* Display other non-editable or fetched fields */}
                        </div>
                    )}
                </CardContent>
            </Card>

             {/* Placeholder for other profile sections like "My Listings", "Bid History", "Settings" */}
             {/* <Card>
                 <CardHeader><CardTitle>My Marketplace Activity</CardTitle></CardHeader>
                 <CardContent>...</CardContent>
             </Card> */}
        </div>
    );
}

// Helper component for displaying profile info items
interface ProfileInfoItemProps {
    icon: React.ElementType;
    label: string;
    value: React.ReactNode;
}

function ProfileInfoItem({ icon: Icon, label, value }: ProfileInfoItemProps) {
    return (
        <div className="flex items-start gap-3">
             <Icon className="h-5 w-5 text-muted-foreground mt-1 shrink-0" />
             <div>
                 <p className="text-sm font-medium">{label}</p>
                 <p className="text-sm text-foreground">{value}</p>
             </div>
        </div>
    );
}


// Skeleton component for profile page loading state
function ProfileSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <Skeleton className="h-8 w-1/4" />
      <Card>
        <CardHeader className="flex flex-col md:flex-row items-center gap-4 border-b pb-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="flex-grow space-y-2">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <Skeleton className="h-10 w-24 rounded-md" />
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="flex gap-3"><Skeleton className="h-5 w-5 rounded" /><div className="space-y-1 flex-grow"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-4 w-1/2" /></div></div>
          <div className="flex gap-3"><Skeleton className="h-5 w-5 rounded" /><div className="space-y-1 flex-grow"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-4 w-1/2" /></div></div>
          <div className="flex gap-3"><Skeleton className="h-5 w-5 rounded" /><div className="space-y-1 flex-grow"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-4 w-1/2" /></div></div>
        </CardContent>
      </Card>
    </div>
  );
}
