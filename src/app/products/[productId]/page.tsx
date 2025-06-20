"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { fetchProductById } from '@/services/productService';
import type { Product, ProductVariant } from '@/types';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/cart-context';
import { useWishlist } from '@/contexts/wishlist-context';
import { Heart, ShoppingCart, ChevronLeft, Loader2, AlertTriangle, Film, Image as ImageIcon, Palette, CheckCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from 'react-i18next';

function sanitizeImageUrlString(urlStr: string | undefined | null): string | null {
  if (!urlStr) return null;
  let processedUrl = urlStr.trim();
  if (processedUrl.startsWith('["') && processedUrl.endsWith('"]')) {
    try {
      const parsedArray = JSON.parse(processedUrl);
      if (Array.isArray(parsedArray) && parsedArray.length > 0 && typeof parsedArray[0] === 'string') {
        processedUrl = parsedArray[0];
      } else {
        // console.warn('[ProductDetailPage] Malformed JSON array string for URL, could not extract valid URL:', urlStr);
        return null;
      }
    } catch (error) {
      // console.error('[ProductDetailPage] Failed to parse potentially malformed URL string:', urlStr, error);
      return null;
    }
  }
  if (processedUrl.startsWith('http://') || processedUrl.startsWith('https://') || processedUrl.startsWith('/')) {
    return processedUrl;
  }
  // console.warn('[ProductDetailPage] URL does not start with http(s):// or / :', processedUrl);
  return null;
}


export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const productId = params.productId as string;
  const { i18n } = useTranslation();
  const lang = i18n.language;

  const [product, setProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [mainImageError, setMainImageError] = useState(false);

  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist, isWishlistLoaded } = useWishlist();

  useEffect(() => {
    if (productId) {
      setIsLoading(true);
      setSelectedImageIndex(0);
      setMainImageError(false);
      fetchProductById(productId)
        .then((data) => {
          setProduct(data);
          if (data && data.variants && data.variants.length > 0) {
            setSelectedVariant(data.variants[0]);
          } else {
            setSelectedVariant(null);
          }
        })
        .catch(error => {
          console.error("[ProductDetailPage] Error fetching product:", error);
          toast({
            title: "Error",
            description: "Could not load product details.",
            variant: "destructive",
          });
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [productId, toast]);

  const handleThumbnailClick = (index: number) => {
    setSelectedImageIndex(index);
    setMainImageError(false);
  };

  const handleVariantSelect = (variant: ProductVariant) => {
    setSelectedVariant(variant);
    setSelectedImageIndex(0);
    setMainImageError(false);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] py-12">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-6" />
        <h1 className="text-2xl font-semibold text-primary">Loading Product Details...</h1>
        <p className="text-muted-foreground mt-2">Please wait a moment.</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] py-12 text-center">
        <AlertTriangle className="h-16 w-16 text-destructive mb-6" />
        <h1 className="text-3xl font-bold text-destructive">Product Not Found</h1>
        <p className="text-muted-foreground mt-3 max-w-md">
          Sorry, we couldn't find the product you're looking for. It might have been removed or the link is incorrect.
        </p>
        <Button onClick={() => router.push('/products')} className="mt-8">
          <ChevronLeft className="mr-2 h-5 w-5" /> Back to Products
        </Button>
      </div>
    );
  }

  const handleToggleWishlist = () => {
    if (!isWishlistLoaded || !product) return;
    if (isInWishlist(product.id)) {
      removeFromWishlist(product.id, product.name);
    } else {
      addToWishlist(product.id, product.name);
    }
  };

  const isWishlisted = isWishlistLoaded ? isInWishlist(product.id) : false;

  // currentDisplayVariant will be the selectedVariant if one is chosen, otherwise the first variant.
  const currentDisplayVariant = selectedVariant || (product.variants && product.variants.length > 0 ? product.variants[0] : null);

  const effectiveImageUrls = currentDisplayVariant?.imageUrls || [];
  const effectiveVideoUrls = currentDisplayVariant?.videoUrls || [];

  const rawCurrentImageSrc = effectiveImageUrls.length > selectedImageIndex
    ? effectiveImageUrls[selectedImageIndex]
    : null;
  const sanitizedCurrentImageSrc = sanitizeImageUrlString(rawCurrentImageSrc);
  const imageToDisplay = mainImageError || !sanitizedCurrentImageSrc
    ? 'https://placehold.co/800x600.png'
    : sanitizedCurrentImageSrc;

  const firstVideoUrl = effectiveVideoUrls.length > 0 ? sanitizeImageUrlString(effectiveVideoUrls[0]) : null;

  // Price display should prioritize selected variant's price, then product's base price.
  const displayPrice = currentDisplayVariant?.price !== undefined ? currentDisplayVariant.price : product.basePrice;

  const handleAddToCart = () => {
    if (!product) return;
    // Use currentDisplayVariant which reflects the user's selection
    const variantToCart = currentDisplayVariant;

    if (variantToCart) {
      const productWithVariantDetails: Product & { selectedVariantId?: string, selectedColorName?: string, variantPrice?: number, imageUrls?: string[] } = {
        ...product,
        selectedVariantId: variantToCart.id,
        selectedColorName: variantToCart.color.name,
        variantPrice: variantToCart.price,
        imageUrls: variantToCart.imageUrls,
        basePrice: product.basePrice,
      };
      addToCart(productWithVariantDetails, 1);
    } else {
      // Fallback if somehow no variant is determined (e.g. product has no variants at all)
      addToCart(product, 1);
    }
  };

  // Get translated name/description if available
  const getTranslated = (field: string | { [lang: string]: string }) => {
    if (typeof field === 'string') return field;
    return field[lang] || field['en'] || Object.values(field)[0] || '';
  };

  // --- IMAGE GALLERY: Gather all unique images from all variants ---
  const allImageUrls = Array.from(new Set(
    (product.variants || [])
      .flatMap(variant => variant.imageUrls || [])
      .filter(Boolean)
  ));

  // --- VIDEO HANDLING: Support direct video and YouTube/Vimeo embeds ---
  function getVideoEmbedType(url: string | null): 'video' | 'youtube' | 'vimeo' | null {
    if (!url) return null;
    if (/youtube\.com|youtu\.be/.test(url)) return 'youtube';
    if (/vimeo\.com/.test(url)) return 'vimeo';
    if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(url)) return 'video';
    // fallback: treat as direct video if it starts with http(s)
    if (/^https?:\/\//.test(url)) return 'video';
    return null;
  }

  function getYouTubeId(url: string): string | null {
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([\w-]{11})/);
    return match ? match[1] : null;
  }

  function getVimeoId(url: string): string | null {
    const match = url.match(/vimeo\.com\/(\d+)/);
    return match ? match[1] : null;
  }

  return (
    <div className="container mx-auto py-8 lg:py-12">
      <Button variant="outline" onClick={() => router.back()} className="mb-8 group">
        <ChevronLeft className="mr-2 h-5 w-5 group-hover:-translate-x-1 transition-transform" />
        Back
      </Button>

      <Card className="overflow-hidden shadow-2xl bg-card text-card-foreground">
        <div className="grid md:grid-cols-2 gap-0">
          {/* Media Section with Tabs */}
          <div>
            <Tabs defaultValue="gallery" className="w-full" key={currentDisplayVariant?.id || 'media-tabs'}> {/* Add key to Tabs to force re-render content */}
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="gallery" disabled={effectiveImageUrls.length === 0}>
                  <ImageIcon className="mr-2 h-4 w-4" /> Image Gallery
                </TabsTrigger>
                <TabsTrigger value="video" disabled={!firstVideoUrl}>
                  <Film className="mr-2 h-4 w-4" /> Video
                </TabsTrigger>
              </TabsList>
              <TabsContent value="gallery">
                <div className="p-1 md:p-2">
                  <div className="relative aspect-[4/3] bg-muted/30 flex items-center justify-center rounded-md overflow-hidden">
                    <Image
                      src={imageToDisplay}
                      alt={`${getTranslated(product.name)} - ${currentDisplayVariant?.color.name || ''} - Image ${selectedImageIndex + 1}`}
                      fill
                      className="object-contain max-h-[60vh] md:max-h-full w-auto"
                      onError={() => setMainImageError(true)}
                      data-ai-hint={`${product.categoryId || 'product'} ${product.brand || ''} detail view`}
                      priority
                      key={currentDisplayVariant?.id ? `${currentDisplayVariant.id}-img-${selectedImageIndex}` : `img-${selectedImageIndex}`}
                    />
                  </div>
                  {allImageUrls.length > 1 && (
                    <div className="flex space-x-2 mt-3 p-2 overflow-x-auto justify-center">
                      {allImageUrls.map((rawUrl, index) => {
                        const sanitizedThumbnailUrl = sanitizeImageUrlString(rawUrl);
                        if (!sanitizedThumbnailUrl) return null;
                        return (
                          <button
                            key={`all-thumb-${index}`}
                            onClick={() => {
                              setSelectedImageIndex(index);
                              setMainImageError(false);
                            }}
                            className={cn(
                              "relative w-16 h-16 md:w-20 md:h-20 rounded-md overflow-hidden border-2 shrink-0",
                              selectedImageIndex === index ? "border-primary ring-2 ring-primary" : "border-transparent hover:border-muted-foreground"
                            )}
                          >
                            <Image
                              src={sanitizedThumbnailUrl || 'https://placehold.co/100x100.png'}
                              alt={`Thumbnail ${index + 1}`}
                              fill
                              sizes="80px"
                              className="object-cover"
                              data-ai-hint={`${product.categoryId || 'product'} thumbnail`}
                            />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="video">
                <div className="p-1 md:p-2">
                  {firstVideoUrl ? (() => {
                    const embedType = getVideoEmbedType(firstVideoUrl);
                    if (embedType === 'youtube') {
                      const ytId = getYouTubeId(firstVideoUrl);
                      return ytId ? (
                        <div className="aspect-video bg-black rounded-md overflow-hidden">
                          <iframe
                            src={`https://www.youtube.com/embed/${ytId}`}
                            title="YouTube video player"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="w-full h-full"
                            key={currentDisplayVariant?.id ? `${currentDisplayVariant.id}-yt` : 'yt'}
                          />
                        </div>
                      ) : null;
                    } else if (embedType === 'vimeo') {
                      const vimeoId = getVimeoId(firstVideoUrl);
                      return vimeoId ? (
                        <div className="aspect-video bg-black rounded-md overflow-hidden">
                          <iframe
                            src={`https://player.vimeo.com/video/${vimeoId}`}
                            title="Vimeo video player"
                            allow="autoplay; fullscreen; picture-in-picture"
                            allowFullScreen
                            className="w-full h-full"
                            key={currentDisplayVariant?.id ? `${currentDisplayVariant.id}-vimeo` : 'vimeo'}
                          />
                        </div>
                      ) : null;
                    } else if (embedType === 'video') {
                      return (
                        <div className="aspect-video bg-black rounded-md overflow-hidden">
                          <video
                            src={firstVideoUrl}
                            controls
                            className="w-full h-full object-contain"
                            preload="metadata"
                            key={currentDisplayVariant?.id ? `${currentDisplayVariant.id}-video` : 'video'}
                          >
                            Your browser does not support the video tag.
                          </video>
                        </div>
                      );
                    }
                    return null;
                  })() : (
                    <div className="aspect-video flex items-center justify-center bg-muted/30 rounded-md">
                      <p className="text-muted-foreground">No video available for this variant.</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Details Section */}
          <div className="p-6 md:p-10 flex flex-col">
            {product.brand && (
              <Badge variant="secondary" className="w-fit mb-3 text-sm">{product.brand}</Badge>
            )}
            <h1 className="text-3xl lg:text-4xl font-bold text-primary mb-3">{getTranslated(product.name)}</h1>

            <p key={currentDisplayVariant?.id ? currentDisplayVariant.id + '-price' : product.id + '-price'} className="text-2xl font-semibold text-accent mb-6">
              {typeof displayPrice === 'number' ? `$${displayPrice.toFixed(2)}` : 'Price unavailable'}
            </p>

            <Separator className="my-6" />

            {product.variants && product.variants.length > 0 && ( // Ensure variants exist before mapping
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center">
                  <Palette className="mr-2 h-5 w-5 text-muted-foreground" /> Available Colors:
                  <span className="ml-2 font-normal text-muted-foreground">{currentDisplayVariant?.color.name || 'N/A'}</span>
                </h3>
                <div className="flex flex-wrap gap-3">
                  {product.variants.map(variant => (
                    <button
                      key={variant.id}
                      onClick={() => handleVariantSelect(variant)}
                      className={cn(
                        "rounded-full p-0.5 focus:outline-none transition-all duration-150 ease-in-out group",
                        currentDisplayVariant?.id === variant.id ? "ring-2 ring-offset-2 ring-offset-background ring-primary" : "ring-1 ring-transparent hover:ring-border"
                      )}
                      title={variant.color.name}
                      aria-label={`Select color ${variant.color.name}`}
                    >
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full border-2 flex items-center justify-center",
                          currentDisplayVariant?.id === variant.id ? "border-primary" : "border-muted-foreground/50 group-hover:border-muted-foreground"
                        )}
                        style={{ backgroundColor: variant.color.hex || (variant.color.name === 'White' ? '#FFFFFF' : (variant.color.name === 'Black' ? '#000000' : '#E0E0E0')) }}
                      >
                        {currentDisplayVariant?.id === variant.id && <CheckCircle className="h-4 w-4 text-primary-foreground mix-blend-difference" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Separator className="my-6" />

            <div className="space-y-3 mb-8 flex-grow">
              <h2 className="text-xl font-semibold text-foreground mb-2">Product Description</h2>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {getTranslated(product.description) || "No description available."}
              </p>
              {product.categoryId && (
                <div className="pt-3">
                  <span className="font-medium text-foreground">Category: </span>
                  <Badge variant="outline">{product.categoryId}</Badge>
                </div>
              )}
            </div>

            <Separator className="my-6" />

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                size="lg"
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={handleAddToCart}
                disabled={!currentDisplayVariant}
              >
                <ShoppingCart className="mr-2 h-5 w-5" /> Add to Cart
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="flex-1"
                onClick={handleToggleWishlist}
                disabled={!isWishlistLoaded}
              >
                <Heart className={cn("mr-2 h-5 w-5", isWishlisted && "fill-current text-red-500")} />
                {isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}


