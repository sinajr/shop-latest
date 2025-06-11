"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useWishlist } from '@/contexts/wishlist-context';
import { Button } from '@/components/ui/button';
import { Heart, ShoppingBag, Trash2, Loader2 } from 'lucide-react';
import { fetchAllProducts } from '@/services/productService';
import type { Product } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useCart } from '@/contexts/cart-context';
import { useTranslation } from 'react-i18next';

// Helper function to sanitize potentially malformed URL strings
function sanitizeImageUrlString(urlStr: string | undefined | null): string | null {
  if (!urlStr) return null;
  let processedUrl = urlStr.trim();
  // Check if the string itself is a JSON array representation like "[\"actual_url.jpg\"]"
  if (processedUrl.startsWith('["') && processedUrl.endsWith('"]')) {
    try {
      const parsedArray = JSON.parse(processedUrl);
      if (Array.isArray(parsedArray) && parsedArray.length > 0 && typeof parsedArray[0] === 'string') {
        processedUrl = parsedArray[0]; // Extract the actual URL
      } else {
        // Malformed JSON array string, treat as invalid
        console.warn('Malformed JSON array string for URL, could not extract valid URL:', urlStr);
        return null;
      }
    } catch (error) {
      // Invalid JSON string, treat as invalid
      console.error('Failed to parse potentially malformed URL string:', urlStr, error);
      return null;
    }
  }

  // Check if it's a valid absolute or root-relative URL after potential sanitization
  if (processedUrl.startsWith('http://') || processedUrl.startsWith('https://') || processedUrl.startsWith('/')) {
    return processedUrl;
  }

  console.warn('URL does not start with http(s):// or / :', processedUrl);
  return null; // Not a recognized valid URL format
}


export default function WishlistPage() {
  const { items: wishlistItemIds, removeFromWishlist, isWishlistLoaded, getWishlistItemCount } = useWishlist();
  const { addToCart } = useCart();
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    const loadProducts = async () => {
      if (isWishlistLoaded) {
        setIsLoadingProducts(true);
        const fetchedProducts = await fetchAllProducts();
        setAllProducts(fetchedProducts);
        setIsLoadingProducts(false);
      }
    };
    loadProducts();
  }, [isWishlistLoaded]);

  const wishlistProducts: Product[] = isWishlistLoaded && !isLoadingProducts
    ? allProducts.filter(product => product && product.id && wishlistItemIds.includes(product.id)) // Added checks for product and product.id
    : [];

  if (!isWishlistLoaded || (isWishlistLoaded && isLoadingProducts && wishlistItemIds.length > 0)) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-pulse text-primary" />
        <p className="ml-4 text-xl text-muted-foreground">Loading your wishlist items...</p>
      </div>
    );
  }

  if (isWishlistLoaded && !isLoadingProducts && wishlistProducts.length === 0 && wishlistItemIds.length === 0) {
    return (
      <div className="text-center py-20">
        <Heart className="mx-auto h-24 w-24 text-muted-foreground mb-6" />
        <h1 className="text-3xl font-bold text-primary mb-4">{t('profile.wishlistEmpty')}</h1>
        <p className="text-lg text-muted-foreground mb-8">
          {t('profile.wishlistEmptyDescription')}
        </p>
        <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
          <Link href="/products">{t('profile.exploreCollection')}</Link>
        </Button>
      </div>
    );
  }


  return (
    <div className="container mx-auto py-8">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-bold text-primary flex items-center justify-center">
          <Heart className="mr-3 h-10 w-10 text-accent" /> {t('profile.wishlist')} ({getWishlistItemCount()})
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">{t('profile.wishlistDescription')}</p>
      </header>

      <ScrollArea className="h-[calc(100vh-300px)] md:h-[600px] pr-4">
        {isLoadingProducts && wishlistItemIds.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(wishlistItemIds.length > 3 ? 3 : wishlistItemIds.length)].map((_, i) => <WishlistItemSkeleton key={i} />)}
          </div>
        ) : wishlistProducts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {wishlistProducts.map(item => {
              if (!item) return null;
              // Use first variant for price and image
              const firstVariant = item.variants && item.variants.length > 0 ? item.variants[0] : null;
              const price = firstVariant && firstVariant.price ? firstVariant.price : item.basePrice;
              const imageUrl = firstVariant && firstVariant.imageUrls && firstVariant.imageUrls.length > 0
                ? firstVariant.imageUrls[0]
                : (item.imageUrls && item.imageUrls.length > 0 ? item.imageUrls[0] : 'https://placehold.co/600x400.png');

              return (
                <div key={item.id} className="flex flex-col items-center p-4 shadow-md hover:shadow-lg transition-shadow rounded-lg bg-card">
                  <Link href={`/products/${item.id}`} className="w-full">
                    <div className="relative w-full h-48 rounded-md overflow-hidden mb-4">
                      <Image
                        src={imageUrl}
                        alt={item.name || "Product image"}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover hover:scale-105 transition-transform duration-300"
                        data-ai-hint={`${item.category || 'item'} ${item.brand || ''}`}
                      />
                    </div>
                  </Link>
                  <div className="flex-grow text-center w-full">
                    <Link href={`/products/${item.id}`}>
                      <h2 className="text-lg font-semibold text-foreground hover:text-accent truncate" title={item.name}>{item.name}</h2>
                    </Link>
                    {item.brand && <p className="text-sm text-muted-foreground">{item.brand}</p>}
                    <p className="text-md font-bold text-accent mt-1">
                      {price ? `$${price.toFixed(2)}` : t('profile.priceNotAvailable')}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3 mt-4 w-full">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeFromWishlist(item.id, item.name)}
                      className="flex-1 text-destructive border-destructive hover:bg-destructive/10 hover:text-destructive"
                      aria-label={t('profile.removeFromWishlistAria', { name: item.name })}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> {t('profile.remove')}
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                      aria-label={t('profile.addToCart')}
                      onClick={() => addToCart(item)}
                    >
                      <ShoppingBag className="mr-2 h-4 w-4" /> {t('profile.addToCart')}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <Heart className="mx-auto h-24 w-24 text-muted-foreground mb-6" />
            <h1 className="text-3xl font-bold text-primary mb-4">{t('profile.wishlistEmpty')}</h1>
            <p className="text-lg text-muted-foreground mb-8">
              {t('profile.wishlistEmptyDescription')}
            </p>
            <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link href="/products">{t('profile.exploreCollection')}</Link>
            </Button>
          </div>
        )}
      </ScrollArea>

      <div className="mt-10 text-center">
        <Button asChild variant="link" className="text-accent">
          <Link href="/products">Continue Exploring</Link>
        </Button>
      </div>
    </div>
  );
}

function WishlistItemSkeleton() {
  return (
    <div className="flex flex-col items-center p-4 shadow-md rounded-lg bg-card space-y-3">
      <Skeleton className="w-full h-48 rounded-md" />
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-5 w-1/4" />
      <div className="flex items-center space-x-3 mt-4 w-full">
        <Skeleton className="h-9 flex-1" />
        <Skeleton className="h-9 flex-1" />
      </div>
    </div>
  );
}
