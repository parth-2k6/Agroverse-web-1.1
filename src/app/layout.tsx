
import type {Metadata} from 'next';
// Removed Geist font imports as they are not defined in package.json and caused build errors.
// Using the default font defined in globals.css (Inter)
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import Navbar from '@/components/Navbar'; // Import the new Navbar
import { AuthProvider } from '@/context/AuthContext'; // Import AuthProvider
import { ThemeProvider } from './providers'; // Import ThemeProvider

// Example using Inter font if needed, but globals.css already imports it.
// import { Inter } from 'next/font/google';
// const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'Agroverse - Smart Agriculture Platform',
  description: 'Your platform for agriculture insights, marketplace, and education.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Ensure no whitespace or comments directly within the html tag before body
    <html lang="en" suppressHydrationWarning>
      {/* The body tag must be the immediate child of html */}
      {/* Add font variables here if using next/font */}
      <body className={`antialiased flex flex-col min-h-screen`}>
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
          <AuthProvider> {/* Wrap with AuthProvider */}
            <Navbar />
            <main className="flex-1 container mx-auto px-4 py-8">
              {children}
            </main>
            <Toaster />
            <footer className="bg-muted text-muted-foreground text-center p-4 mt-auto">
              © {new Date().getFullYear()} Agroverse. All rights reserved.
            </footer>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

    