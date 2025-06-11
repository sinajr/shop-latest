
"use client";

import type { Product, ProductVariant } from '@/types';
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

const LOCAL_STORAGE_CART_KEY = 'luxe-collective-cart';
const DEFAULT_CART_ITEM_PLACEHOLDER = 'https://placehold.co/128x128.png';

// Helper function to sanitize potentially malformed URL strings
function sanitizeImageUrlString(urlStr: string | undefined | null): string | null {
  if (!urlStr) {
    // console.log('[sanitizeImageUrlString] Input URL is null or undefined.');
    return null;
  }
  let processedUrl = urlStr.trim();
  // console.log('[sanitizeImageUrlString] Processing URL:', processedUrl);

  if (processedUrl.startsWith('["') && processedUrl.endsWith('"]')) {
    // console.log('[sanitizeImageUrlString] URL appears to be a JSON stringified array:', processedUrl);
    try {
      const parsedArray = JSON.parse(processedUrl);
      if (Array.isArray(parsedArray) && parsedArray.length > 0 && typeof parsedArray[0] === 'string') {
        processedUrl = parsedArray[0];
        // console.log('[sanitizeImageUrlString] Extracted URL from JSON array:', processedUrl);
      } else {
        // console.warn('[sanitizeImageUrlString] Malformed JSON array string, could not extract valid URL:', urlStr);
        return null;
      }
    } catch (error) {
      // console.error('[sanitizeImageUrlString] Failed to parse potentially malformed URL string:', urlStr, error);
      return null;
    }
  }

  if (processedUrl.startsWith('http://') || processedUrl.startsWith('https://') || processedUrl.startsWith('/')) {
    // console.log('[sanitizeImageUrlString] URL is valid:', processedUrl);
    return processedUrl;
  }
  
  // console.warn('[sanitizeImageUrlString] URL does not start with http(s):// or / , returning null. Original:', urlStr, "Processed:", processedUrl);
  return null;
}


export interface CartItem {
  id: string; // Composite ID: baseProductId-variantId (or just baseProductId if no variants/default)
  baseProductId: string;
  name: string;
  brand?: string;
  category?: string;
  quantity: number;
  displayImageUrl: string; // This should be the specific image URL for the variant/item
  pricePerUnit: number; // Price of the specific variant
  selectedVariantId?: string;
  selectedColorName?: string;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (
    productData: Product & { // ProductData can be a base product or one augmented with selected variant details
        selectedVariantId?: string; // ID of the variant if one was specifically selected
        selectedColorName?: string; // Name of the color for the selected variant
        variantPrice?: number; // Price of the selected variant
        imageUrls?: string[]; // If selectedVariantId is present, these ARE the imageUrls of the selected variant. Otherwise, they are base product's.
    },
    quantity?: number
  ) => void;
  removeFromCart: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getCartItemCount: () => number;
  isCartLoaded: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartLoaded, setIsCartLoaded] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const storedCart = localStorage.getItem(LOCAL_STORAGE_CART_KEY);
    if (storedCart) {
      try {
        const parsedCart: any[] = JSON.parse(storedCart);
        if (Array.isArray(parsedCart)) {
          const migratedCart = parsedCart.map(p => {
            if (p.baseProductId && p.displayImageUrl && typeof p.pricePerUnit === 'number') {
              return {
                ...p,
                id: p.id || (p.selectedVariantId ? `${p.baseProductId}-${p.selectedVariantId}` : p.baseProductId),
              } as CartItem;
            }
            // Legacy item migration attempt
            let imageUrl = DEFAULT_CART_ITEM_PLACEHOLDER;
            if (p.imageUrl && typeof p.imageUrl === 'string') {
              imageUrl = sanitizeImageUrlString(p.imageUrl) || DEFAULT_CART_ITEM_PLACEHOLDER;
            } else if (Array.isArray(p.imageUrls) && p.imageUrls.length > 0) {
              imageUrl = sanitizeImageUrlString(p.imageUrls[0]) || DEFAULT_CART_ITEM_PLACEHOLDER;
            }

            return {
              id: p.id, // old ID
              baseProductId: p.id, // old id was base product id
              name: p.name || 'Unknown Product',
              brand: p.brand,
              category: p.category || p.categoryId,
              quantity: p.quantity || 1,
              displayImageUrl: imageUrl, // May default to placeholder
              pricePerUnit: typeof p.price === 'number' ? p.price : (typeof p.basePrice === 'number' ? p.basePrice : 0),
              selectedVariantId: undefined, // Old items didn't have this
              selectedColorName: undefined,
            } as CartItem;
          });
          setItems(migratedCart);
        }
      } catch (error) {
        console.error("Failed to parse or migrate cart from localStorage", error);
        localStorage.removeItem(LOCAL_STORAGE_CART_KEY);
      }
    }
    setIsCartLoaded(true);
  }, []);

  useEffect(() => {
    if (isCartLoaded) {
      localStorage.setItem(LOCAL_STORAGE_CART_KEY, JSON.stringify(items));
    }
  }, [items, isCartLoaded]);

  const addToCart = useCallback((
    productData: Product & {
        selectedVariantId?: string;
        selectedColorName?: string;
        variantPrice?: number;
        imageUrls?: string[];
    },
    quantityToAdd: number = 1
  ) => {
    // console.log('[CartContext] addToCart called with productData:', JSON.parse(JSON.stringify(productData)));

    const isSpecificVariantSelected = !!productData.selectedVariantId;
    let cartItemId: string;
    let imageUrlToUse = DEFAULT_CART_ITEM_PLACEHOLDER;
    let priceToUse: number;
    let colorNameToUse: string | undefined = productData.selectedColorName;
    let variantIdToStore: string | undefined = productData.selectedVariantId;

    if (isSpecificVariantSelected && productData.selectedVariantId) {
      // Case 1: A specific variant was selected (e.g., from Product Detail Page)
      cartItemId = `${productData.id}-${productData.selectedVariantId}`;
      // productData.imageUrls here ARE the selected variant's images, passed from ProductDetailPage
      if (productData.imageUrls && productData.imageUrls.length > 0) {
        const rawUrl = productData.imageUrls[0];
        imageUrlToUse = sanitizeImageUrlString(rawUrl) || DEFAULT_CART_ITEM_PLACEHOLDER;
      } else {
        // console.warn(`[CartContext] Specific variant ${productData.selectedVariantId} for product ${productData.id} has no 'imageUrls' in productData. Using placeholder.`);
      }
      priceToUse = productData.variantPrice !== undefined ? productData.variantPrice : productData.basePrice;
      // colorNameToUse and variantIdToStore are already set from productData

    } else {
      // Case 2: No specific variant selected (e.g., from Product Card - add default/first variant)
      // console.log(`[CartContext] No specific variant selected for ${productData.name}. Attempting to use first available variant.`);
      const firstVariant = productData.variants && productData.variants.length > 0 ? productData.variants[0] : undefined;

      if (firstVariant) {
        variantIdToStore = firstVariant.id;
        cartItemId = `${productData.id}-${firstVariant.id}`;
        if (firstVariant.imageUrls && firstVariant.imageUrls.length > 0) {
          const rawUrl = firstVariant.imageUrls[0];
          imageUrlToUse = sanitizeImageUrlString(rawUrl) || DEFAULT_CART_ITEM_PLACEHOLDER;
        } else {
          // console.warn(`[CartContext] First variant for product ${productData.id} has no imageUrls. Using placeholder.`);
        }
        priceToUse = firstVariant.price !== undefined ? firstVariant.price : productData.basePrice;
        colorNameToUse = firstVariant.color.name;
      } else {
        // Case 3: Product has no variants array at all (should be rare if data is structured well)
        cartItemId = productData.id; // Use base product ID
        // console.warn(`[CartContext] Product ${productData.id} has no 'variants' array. Using base product info and placeholder image.`);
        priceToUse = productData.basePrice;
        // imageUrlToUse remains DEFAULT_CART_ITEM_PLACEHOLDER
        // variantIdToStore and colorNameToUse remain undefined
      }
    }

    // console.log(`[CartContext] Final imageUrlToUse for cart item ${cartItemId}:`, imageUrlToUse);

    setItems(prevItems => {
      const existingItemIndex = prevItems.findIndex(item => item.id === cartItemId);
      if (existingItemIndex > -1) {
        const updatedItems = [...prevItems];
        const existingItem = updatedItems[existingItemIndex]!;
        updatedItems[existingItemIndex] = {
          ...existingItem,
          quantity: existingItem.quantity + quantityToAdd,
        };
        return updatedItems;
      } else {
        const newItem: CartItem = {
          id: cartItemId,
          baseProductId: productData.id,
          name: productData.name,
          brand: productData.brand,
          category: productData.categoryId,
          quantity: quantityToAdd,
          displayImageUrl: imageUrlToUse,
          pricePerUnit: priceToUse,
          selectedVariantId: variantIdToStore,
          selectedColorName: colorNameToUse,
        };
        // console.log('[CartContext] Adding new CartItem:', JSON.parse(JSON.stringify(newItem)));
        return [...prevItems, newItem];
      }
    });

    toast({
      title: "Added to Cart",
      description: `${productData.name}${colorNameToUse ? ` (${colorNameToUse})` : ''} has been added.`,
    });
  }, [toast]);

  const removeFromCart = useCallback((cartItemId: string) => {
    let itemName: string | undefined;
    setItems(prevItems => {
      const itemToRemove = prevItems.find(item => item.id === cartItemId);
      if (itemToRemove) {
         itemName = itemToRemove.name;
      }
      return prevItems.filter(item => item.id !== cartItemId);
    });

    if (itemName) {
      toast({
        title: "Removed from Cart",
        description: `${itemName} has been removed from your cart.`,
        variant: "destructive"
      });
    }
  }, [toast]);

  const updateQuantity = useCallback((cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(cartItemId);
      return;
    }
    setItems(prevItems =>
      prevItems.map(item =>
        item.id === cartItemId ? { ...item, quantity } : item
      )
    );
  }, [removeFromCart]);

  const clearCart = useCallback(() => {
    setItems([]);
    toast({
      title: "Cart Cleared",
      description: "All items have been removed from your cart.",
    });
  }, [toast]);

  const getCartTotal = useCallback((): number => {
    return items.reduce((total, item) => total + item.pricePerUnit * item.quantity, 0);
  }, [items]);

  const getCartItemCount = useCallback((): number => {
    return items.reduce((count, item) => count + item.quantity, 0);
  }, [items]);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getCartTotal,
        getCartItemCount,
        isCartLoaded,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

