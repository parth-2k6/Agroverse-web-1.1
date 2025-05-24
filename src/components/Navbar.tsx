
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet'; // Added SheetHeader, SheetTitle
import { Menu, Leaf, User, LogOut, LayoutDashboard, ShoppingCart, GraduationCap, Sun, Moon, Microscope } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from 'next-themes';

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Ensure theme state is mounted on the client to avoid hydration mismatch
  useEffect(() => setMounted(true), []);


  const handleLogout = async () => {
     if (logout) {
        try {
          await logout();
          // Optional: Redirect or show toast on successful logout
        } catch (error) {
          console.error("Logout failed:", error);
          // Optional: Show error toast
        }
     }
  };

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/marketplace', label: 'Marketplace', icon: ShoppingCart },
    { href: '/disease-detector', label: 'Disease Detector', icon: Microscope },
    { href: '/education', label: 'Education', icon: GraduationCap }, // Added Education link
  ];

   const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  // Determine if user has 'farmer' role (example logic, adapt as needed)
  // This might involve checking a custom claim or a field in the user's Firestore profile
  const isFarmer = user?.uid; // Placeholder: assume logged-in user is farmer for now
                             // Replace with actual role check: user?.customClaims?.role === 'farmer' or fetch from Firestore profile

  // Filter nav links based on role
  const visibleNavLinks = navLinks.filter(link => {
    // Allow all links for now, implement role-based filtering later
    // Example: If link requires farmer role
    // if (link.href === '/disease-detector' && !isFarmer) return false;
    // if (link.href === '/marketplace/upload' && !isFarmer) return false; // Assuming an upload page exists
    return true;
  });


  return (
    <nav className="bg-card border-b sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 text-primary hover:opacity-80 transition-opacity">
            <Leaf className="h-7 w-7" />
            <span className="text-xl font-bold">Agroverse</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1 lg:space-x-3">
             {visibleNavLinks.map((link) => (
                <Button key={link.href} variant="ghost" asChild size="sm" className="text-sm">
                    <Link href={link.href} className="text-foreground/80 hover:text-foreground flex items-center gap-1">
                         {/* Optional: Show icons on desktop too */}
                         {/* <link.icon className="h-4 w-4" /> */}
                        {link.label}
                    </Link>
                 </Button>
             ))}
          </div>

          {/* Auth Buttons & Theme Toggle (Desktop) */}
          <div className="hidden md:flex items-center space-x-2">
            {mounted && (
              <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
            )}
            {user ? (
              <>
                 <Button variant="ghost" asChild size="sm">
                    <Link href="/profile"> {/* Assuming a profile page */}
                        <User className="mr-1 h-4 w-4" />
                         {user.displayName?.split(' ')[0] || user.email?.split('@')[0] || 'Profile'}
                    </Link>
                </Button>
                 <Button variant="outline" size="sm" onClick={handleLogout}>
                    <LogOut className="mr-1 h-4 w-4" /> Logout
                 </Button>
               </>
            ) : (
              <>
                <Button variant="ghost" asChild size="sm">
                  <Link href="/auth/login">Login</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/auth/signup">Sign Up</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Trigger */}
          <div className="md:hidden flex items-center">
             {mounted && (
               <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme" className="mr-2">
                 {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
               </Button>
             )}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] p-0"> {/* Adjust padding */}
                 {/* Add SheetHeader and SheetTitle for accessibility */}
                <SheetHeader className="p-4 border-b"> {/* Add padding and border */}
                    {/* Visually hide the title, but keep it for screen readers */}
                    <SheetTitle className="sr-only">Main Menu</SheetTitle>
                    {/* Mobile Logo - Acts as visual title */}
                    <Link href="/" className="flex items-center gap-2 text-primary" onClick={() => setIsMobileMenuOpen(false)}>
                      <Leaf className="h-7 w-7" />
                      <span className="text-xl font-bold">Agroverse</span>
                    </Link>
                </SheetHeader>
                <div className="flex flex-col h-[calc(100%-4rem)] p-4"> {/* Adjust height calculation and add padding back */}
                   {/* Mobile Navigation */}
                   <nav className="flex flex-col space-y-3 mb-6">
                      {visibleNavLinks.map((link) => (
                        <Button key={link.href} variant="ghost" asChild className="justify-start" onClick={() => setIsMobileMenuOpen(false)}>
                           <Link href={link.href} className="flex items-center gap-3">
                              <link.icon className="h-5 w-5 text-muted-foreground" />
                              {link.label}
                           </Link>
                        </Button>
                      ))}
                   </nav>

                   <hr className="my-4 border-border" />

                   {/* Mobile Auth Buttons */}
                   <div className="mt-auto flex flex-col space-y-3">
                       {user ? (
                        <>
                           <Button variant="ghost" asChild className="justify-start" onClick={() => setIsMobileMenuOpen(false)}>
                              <Link href="/profile" className="flex items-center gap-3">
                                <User className="h-5 w-5 text-muted-foreground" />
                                {user.displayName || user.email?.split('@')[0] || 'Profile'}
                              </Link>
                           </Button>
                           <Button variant="outline" onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }} className="flex items-center gap-3 justify-center">
                             <LogOut className="h-5 w-5" /> Logout
                           </Button>
                         </>
                       ) : (
                         <>
                           <Button variant="ghost" asChild onClick={() => setIsMobileMenuOpen(false)}>
                              <Link href="/auth/login">Login</Link>
                            </Button>
                            <Button asChild onClick={() => setIsMobileMenuOpen(false)}>
                              <Link href="/auth/signup">Sign Up</Link>
                            </Button>
                         </>
                       )}
                   </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
