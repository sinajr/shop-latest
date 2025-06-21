"use client";

import { useEffect, useState, useMemo } from 'react';
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
      fetchProductById(productId)
        .then((data) => {
          if (data) {
            setProduct(data);
            if (data.variants && data.variants.length > 0) {
              setSelectedVariant(data.variants[0]);
            }
          } else {
            setProduct(null);
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

  const handleVariantSelect = (variant: ProductVariant) => {
    setSelectedVariant(variant);
    setSelectedImageIndex(0);
    setMainImageError(false);
  };

  const currentDisplayVariant = useMemo(() => {
    return selectedVariant || (product?.variants && product.variants.length > 0 ? product.variants[0] : null);
  }, [selectedVariant, product]);

  const effectiveImageUrls = useMemo(() => currentDisplayVariant?.imageUrls?.map(sanitizeImageUrlString).filter(Boolean) as string[] || [], [currentDisplayVariant]);
  const effectiveVideoUrls = useMemo(() => currentDisplayVariant?.videoUrls?.map(sanitizeImageUrlString).filter(Boolean) as string[] || [], [currentDisplayVariant]);

  const imageToDisplay = useMemo(() => {
    if (mainImageError || !effectiveImageUrls[selectedImageIndex]) {
      return 'https://placehold.co/800x600.png';
    }
    return effectiveImageUrls[selectedImageIndex];
  }, [mainImageError, selectedImageIndex, effectiveImageUrls]);

  const firstVideoUrl = useMemo(() => effectiveVideoUrls.length > 0 ? effectiveVideoUrls[0] : null, [effectiveVideoUrls]);

  const displayPrice = currentDisplayVariant?.price !== undefined ? currentDisplayVariant.price : product?.basePrice;

  const handleAddToCart = () => {
    if (!product || !currentDisplayVariant) return;

    const productWithVariantDetails: Product & { selectedVariantId?: string, selectedColorName?: string, variantPrice?: number, imageUrls?: string[] } = {
      ...product,
      selectedVariantId: currentDisplayVariant.id,
      selectedColorName: currentDisplayVariant.color.name,
      variantPrice: currentDisplayVariant.price,
      imageUrls: currentDisplayVariant.imageUrls,
    };
    addToCart(productWithVariantDetails, 1);
  };

  const handleToggleWishlist = () => {
    if (!isWishlistLoaded || !product) return;
    const isWishlisted = isInWishlist(product.id);
    if (isWishlisted) {
      removeFromWishlist(product.id, getTranslated(product.name));
    } else {
      addToWishlist(product.id, getTranslated(product.name));
    }
  };

  const getTranslated = (field: string | { [lang: string]: string } | undefined) => {
    if (!field) return '';
    if (typeof field === 'string') return field;
    return field[lang] || field['en'] || Object.values(field)[0] || '';
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

  const isWishlisted = isWishlistLoaded ? isInWishlist(product.id) : false;

  const getVideoEmbedUrl = (url: string) => {
    let videoId;
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      videoId = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([\w-]{11})/)?.[1];
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }
    if (url.includes('vimeo.com')) {
      videoId = url.match(/vimeo\.com\/(\d+)/)?.[1];
      return videoId ? `https://player.vimeo.com/video/${videoId}` : null;
    }
    return url; // for direct mp4 links
  };

  const videoEmbedUrl = firstVideoUrl ? getVideoEmbedUrl(firstVideoUrl) : null;

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
            <Tabs defaultValue="gallery" className="w-full" key={currentDisplayVariant?.id}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="gallery" disabled={effectiveImageUrls.length === 0}>
                  <ImageIcon className="mr-2 h-4 w-4" /> Image Gallery
                </TabsTrigger>
                <TabsTrigger value="video" disabled={!videoEmbedUrl}>
                  <Film className="mr-2 h-4 w-4" /> Video
                </TabsTrigger>
              </TabsList>
              <TabsContent value="gallery" className="p-1 md:p-2">
                <div className="relative aspect-[4/3] bg-muted/30 flex items-center justify-center rounded-md overflow-hidden">
                  <Image
                    src={imageToDisplay}
                    alt={`${getTranslated(product.name)} - ${currentDisplayVariant?.color.name || ''} - Image ${selectedImageIndex + 1}`}
                    fill
                    className="object-contain"
                    onError={() => setMainImageError(true)}
                    priority
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                </div>
                {effectiveImageUrls.length > 1 && (
                  <div className="flex space-x-2 mt-3 p-2 overflow-x-auto justify-center">
                    {effectiveImageUrls.map((url, index) => (
                      <button
                        key={url}
                        onClick={() => {
                          setSelectedImageIndex(index);
                          setMainImageError(false);
                        }}
                        className={cn(
                          "w-20 h-20 relative rounded-md overflow-hidden border-2 transition-colors",
                          selectedImageIndex === index ? 'border-primary' : 'border-transparent hover:border-primary/50'
                        )}
                      >
                        <Image src={url} alt={`Thumbnail ${index + 1}`} fill className="object-cover" sizes="80px" />
                      </button>
                    ))}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="video" className="p-1 md:p-2">
                {videoEmbedUrl && (
                  <div className="relative aspect-video bg-black rounded-md overflow-hidden">
                    <iframe
                      src={videoEmbedUrl}
                      title="Product Video"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full"
                    ></iframe>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Details Section */}
          <div className="p-6 lg:p-8 flex flex-col">
            <div className="flex-grow">
              {/* Header */}
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground">
                    {getTranslated(product.name)}
                  </h1>
                  <p className="text-muted-foreground mt-1">
                    {product.brand && `By ${product.brand}`}
                  </p>
                </div>
                {product.categoryId && (
                  <Badge variant="outline" className="text-sm">{product.categoryId}</Badge>
                )}
              </div>

              {/* Price */}
              <div className="text-4xl lg:text-5xl font-bold text-primary my-4">
                ${displayPrice?.toFixed(2) || 'N/A'}
              </div>

              {/* Variant Selection */}
              {product.variants && product.variants.length > 1 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3 flex items-center">
                    <Palette className="mr-2 h-5 w-5" /> Available Colors: <span className='font-bold ml-2'>{currentDisplayVariant?.color.name}</span>
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {product.variants.map((variant) => (
                      <button
                        key={variant.id}
                        onClick={() => handleVariantSelect(variant)}
                        className={cn(
                          "relative h-10 w-10 rounded-full border-2 transition-transform duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/80",
                          selectedVariant?.id === variant.id ? 'border-primary scale-110' : 'border-muted-foreground/50 hover:border-primary/70',
                        )}
                        style={{ backgroundColor: variant.color.hex || '#ccc' }}
                        title={variant.color.name}
                        aria-label={`Select color ${variant.color.name}`}
                      >
                        {selectedVariant?.id === variant.id && (
                          <span className="absolute inset-0 flex items-center justify-center">
                            <CheckCircle className="h-6 w-6 text-white" style={{ mixBlendMode: 'difference' }} />
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <Separator className="my-6" />

              {/* Product Description */}
              <div>
                <h3 className="text-xl font-bold mb-2">Product Description</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{getTranslated(product.description)}</p>
              </div>

              {/* Tags Section */}
              {product.tags && product.tags.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-3">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {product.tags.map((tag, index) => (
                      <Badge key={`${tag}-${index}`} variant="secondary" className="text-sm">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-auto pt-6">
              <Separator className="my-6" />

              {/* Action Buttons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  size="lg"
                  className="w-full"
                  onClick={handleAddToCart}
                  disabled={!currentDisplayVariant}
                >
                  <ShoppingCart className="mr-2 h-5 w-5" /> Add to Cart
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full"
                  onClick={handleToggleWishlist}
                  disabled={!isWishlistLoaded}
                >
                  <Heart className={cn("mr-2 h-5 w-5", isWishlisted && "fill-current text-red-500")} />
                  {isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}


