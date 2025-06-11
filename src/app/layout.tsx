import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/auth-context';
import { CartProvider } from '@/contexts/cart-context';
import { WishlistProvider } from '@/contexts/wishlist-context';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { FloatingActionButtons } from '@/components/layout/floating-action-buttons';
import { Toaster } from '@/components/ui/toaster';
import { I18nProviderWrapper } from '@/components/layout/I18nProviderWrapper'; // Import the new wrapper

export const metadata: Metadata = {
  title: 'Elite Stuff Trade',
  description: 'Your premier destination for curated luxury goods, watches, and high-end fashion.',
  icons: {
    icon: '/logo.png',
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased flex flex-col min-h-screen bg-background">
        <I18nProviderWrapper> {/* Wrap existing providers with I18nProviderWrapper */}
          <AuthProvider>
            <WishlistProvider>
              <CartProvider>
                <Navbar />
                <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                  {children}
                </main>
                <Footer />
                <Toaster />
                <FloatingActionButtons />
              </CartProvider>
            </WishlistProvider>
          </AuthProvider>
        </I18nProviderWrapper>
      </body>
    </html>
  );
}
