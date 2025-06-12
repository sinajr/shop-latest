"use client";

import React from 'react';
import { I18nProviderWrapper } from '@/components/layout/I18nProviderWrapper';
import { AuthProvider } from '@/contexts/auth-context';
import { CartProvider } from '@/contexts/cart-context';
import { WishlistProvider } from '@/contexts/wishlist-context';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { FloatingActionButtons } from '@/components/layout/floating-action-buttons';
import { Toaster } from '@/components/ui/toaster';

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <I18nProviderWrapper>
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
    );
}
