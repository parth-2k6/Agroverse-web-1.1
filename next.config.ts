
import type {NextConfig} from 'next';

// Read the storage bucket from environment variable OR use the hardcoded one
// const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'agroverse-cffa0.appspot.com'; // Use the user-provided bucket
// const firebaseStorageHostname = storageBucket ? `firebasestorage.googleapis.com` : ''; // Base hostname
// const firebaseStoragePathname = storageBucket ? `/v0/b/${storageBucket}/o/**` : '/v0/b/**'; // Dynamic pathname
// Removed Firebase Storage config as it's not used for image storage

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos', // Placeholder images
        port: '',
        pathname: '/**',
      },
      // Removed imgur.com, i.imgur.com, images.unsplash.com, plus.unsplash.com
      // Since we are asking users for direct image URLs, we should add specific allowed hostnames
      // as needed, rather than broad domains.
      // Example: If users frequently use Imgur, add back:
      // {
      //   protocol: 'https',
      //   hostname: 'i.imgur.com',
      //   port: '',
      //   pathname: '/**',
      // },
      // Add other frequently used, *direct image hosting* domains here if necessary.
      // Avoid adding search engine domains like google.com.
    ],
  },
};

// Log a warning if the storage bucket is not configured correctly
// if (!storageBucket || !firebaseStorageHostname) {
//     console.warn("WARN: Firebase Storage bucket name seems invalid or missing. Firebase Storage images may not load correctly via next/image.");
// } else {
//     console.log(`Configured next/image for Firebase Storage bucket: ${storageBucket}`);
//     console.log(`   Hostname: ${firebaseStorageHostname}`);
//     console.log(`   Pathname: ${firebaseStoragePathname}`);
// }
console.log("Configured next/image remotePatterns for picsum.photos. Add other direct image hostnames as needed.");

export default nextConfig;


    