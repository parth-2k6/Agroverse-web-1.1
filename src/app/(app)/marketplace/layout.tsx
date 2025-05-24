
// src/app/(app)/marketplace/layout.tsx
import React from 'react';

// This layout applies to /marketplace and its sub-routes like /marketplace/upload, /marketplace/product/[id]

export default function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      {/* You could add marketplace-specific headers, sidebars, or context providers here if needed */}
      {children}
    </div>
  );
}
