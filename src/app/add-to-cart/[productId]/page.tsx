
"use client";

import { useEffect, useState } from 'react'; // Added useState
import { useRouter, useParams } from 'next/navigation';
import { useCart } from '@/contexts/cart-context';
import { fetchProductById } from '@/services/productService'; // Import RTDB service
import type { Product } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function AddToCartPage() {
  const router = useRouter();
  const params = useParams();
  const { addToCart, isCartLoaded } = useCart();
  const { toast } = useToast();
  const productId = params.productId as string;
  const [isLoadingProduct, setIsLoadingProduct] = useState(true);

  useEffect(() => {
    if (!productId || !isCartLoaded) {
      return;
    }

    const findAndAddProduct = async () => {
      setIsLoadingProduct(true);
      const product = await fetchProductById(productId);
      setIsLoadingProduct(false);

      if (product) {
        addToCart(product, 1);
        toast({
          title: 'Added via QR Code!',
          description: `${product.name} has been added to your cart.`,
        });
        router.replace('/cart');
      } else {
        toast({
          title: 'Error',
          description: 'Product not found. Could not add to cart.',
          variant: 'destructive',
        });
        router.replace('/products');
      }
    };

    findAndAddProduct();
  }, [productId, addToCart, router, toast, isCartLoaded]);

  if (isLoadingProduct || !isCartLoaded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen py-12">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <h1 className="text-2xl font-semibold text-primary">Processing your request...</h1>
        <p className="text-muted-foreground mt-2">Adding item to your cart.</p>
      </div>
    );
  }

  // This return is mostly for the case where useEffect hasn't redirected yet
  // or if there's an unexpected state. The primary purpose is handled by useEffect.
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-12">
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      <h1 className="text-2xl font-semibold text-primary">Processing your request...</h1>
      <p className="text-muted-foreground mt-2">Adding item to your cart.</p>
    </div>
  );
}
