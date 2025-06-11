"use client";

import Image from 'next/image';
import Link from 'next/link';
import type { Product } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, ShoppingCart, QrCode } from 'lucide-react';
import { useCart } from '@/contexts/cart-context';
import { useWishlist } from '@/contexts/wishlist-context';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { QRCodeSVG } from 'qrcode.react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface ProductCardProps {
  product: Product;
}

// Helper function to sanitize potentially malformed URL strings
function sanitizeImageUrlString(urlStr: string | undefined | null): string | null {
  if (!urlStr) return null;
  let processedUrl = urlStr.trim();
  if (processedUrl.startsWith('["') && processedUrl.endsWith('"]')) {
    try {
      const parsedArray = JSON.parse(processedUrl);
      if (Array.isArray(parsedArray) && parsedArray.length > 0 && typeof parsedArray[0] === 'string') {
        processedUrl = parsedArray[0];
      } else {
        console.warn('[ProductCard] Malformed JSON array string for URL, could not extract valid URL:', urlStr);
        return null;
      }
    } catch (error) {
      console.error('[ProductCard] Failed to parse potentially malformed URL string:', urlStr, error);
      return null;
    }
  }

  if (processedUrl.startsWith('http://') || processedUrl.startsWith('https://') || processedUrl.startsWith('/')) {
    return processedUrl;
  }

  console.warn('[ProductCard] URL does not start with http(s):// or / :', processedUrl);
  return null;
}


export function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist, isWishlistLoaded } = useWishlist();
  const [qrCodeValue, setQrCodeValue] = useState('');
  const [imageError, setImageError] = useState(false);
  const { i18n } = useTranslation();
  const lang = i18n.language;

  useEffect(() => {
    if (typeof window !== "undefined" && product?.id) {
      setQrCodeValue(`${window.location.origin}/add-to-cart/${product.id}`);
    }
  }, [product?.id]);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!product) return;
    // For now, add the base product. Variant selection would happen on the product detail page.
    // The cart context will use the first variant's image if available.
    addToCart(product, 1);
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!product?.id || !product?.name || !isWishlistLoaded) return;
    if (isInWishlist(product.id)) {
      removeFromWishlist(product.id, product.name);
    } else {
      addToWishlist(product.id, product.name);
    }
  };

  if (!product) {
    return (
      <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col h-full bg-card">
        <CardHeader className="p-0 relative">
          <div className="relative w-full aspect-[4/3] overflow-hidden bg-muted animate-pulse"></div>
        </CardHeader>
        <CardContent className="p-4 flex-grow">
          <div className="h-4 bg-muted rounded w-3/4 mb-2 animate-pulse"></div>
          <div className="h-3 bg-muted rounded w-1/2 mb-1 animate-pulse"></div>
          <div className="h-3 bg-muted rounded w-full mb-2 animate-pulse"></div>
          <div className="h-3 bg-muted rounded w-full animate-pulse"></div>
        </CardContent>
        <div className="px-4 pb-2 pt-0">
          <div className="h-6 bg-muted rounded w-1/4 animate-pulse"></div>
        </div>
        <CardFooter className="p-4 pt-2 border-t">
          <div className="h-9 bg-muted rounded w-full animate-pulse"></div>
        </CardFooter>
      </Card>
    );
  }

  const isWishlisted = isWishlistLoaded ? isInWishlist(product.id) : false;

  const displayPrice = typeof product.basePrice === 'number'
    ? `$${product.basePrice.toFixed(2)}`
    : 'Price not available';

  let primaryImageUrl: string | null = null;
  if (product.variants && product.variants.length > 0 && product.variants[0].imageUrls && product.variants[0].imageUrls.length > 0) {
    primaryImageUrl = sanitizeImageUrlString(product.variants[0].imageUrls[0]);
  }

  const imageSrc = imageError || !primaryImageUrl
    ? 'https://placehold.co/600x400.png'
    : primaryImageUrl;

  // Get translated name/description if available
  const getTranslated = (field: string | { [lang: string]: string }) => {
    if (typeof field === 'string') return field;
    return field[lang] || field['en'] || Object.values(field)[0] || '';
  };

  return (
    <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col h-full bg-card group">
      <Link href={`/products/${product.id}`} className="flex flex-col flex-grow">
        <CardHeader className="p-0 relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleWishlist}
            className={cn(
              "absolute top-2 right-2 z-10 rounded-full h-8 w-8 p-0",
              "bg-black/30 text-white hover:bg-black/50",
              "group-hover:opacity-100 md:opacity-0 transition-opacity",
              isWishlisted && "text-red-500 hover:text-red-400 opacity-100"
            )}
            aria-label={isWishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
            disabled={!isWishlistLoaded}
          >
            <Heart className={cn("h-4 w-4", isWishlisted && "fill-current")} />
          </Button>

          <div className="relative w-full aspect-[4/3] overflow-hidden">
            <Image
              src={imageSrc}
              alt={getTranslated(product.name) || "Product image"}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              onError={() => setImageError(true)}
              data-ai-hint={`${product.category || 'item'} ${product.brand || ''}`}
            />
          </div>
        </CardHeader>
        <CardContent className="p-4 flex-grow">
          {product.brand && (
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              {product.brand}
            </p>
          )}
          <CardTitle className="text-lg font-semibold text-card-foreground group-hover:text-accent transition-colors mb-1 truncate" title={getTranslated(product.name)}>
            {getTranslated(product.name) || "Product Name Unavailable"}
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground mb-2 line-clamp-2">
            {getTranslated(product.description) || "No description available."}
          </CardDescription>
        </CardContent>
      </Link>
      <div className="px-4 pb-2 pt-0">
        <p className="text-lg font-bold text-accent">
          {displayPrice}
        </p>
      </div>
      <CardFooter className="p-4 pt-2 border-t">
        <div className="flex w-full justify-between items-center gap-2">
          <Button
            size="sm"
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={handleAddToCart}
            aria-label={`Add ${product.name} to cart`}
            disabled={!product.id}
          >
            <ShoppingCart className="mr-2 h-4 w-4" /> Add to Cart
          </Button>

          {qrCodeValue && product.id && (
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  aria-label="Show QR Code"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <QrCode className="h-5 w-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-xs">
                <DialogHeader>
                  <DialogTitle className="text-center text-lg">Scan to Add to Cart</DialogTitle>
                  <DialogDescription className="text-center">
                    Scan this QR code with your mobile device to add {product.name || "this product"} to your shopping cart.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex justify-center py-4">
                  <QRCodeSVG value={qrCodeValue} size={200} includeMargin={true} />
                </div>
                <p className="text-xs text-muted-foreground text-center break-all">
                  URL: {qrCodeValue}
                </p>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}

