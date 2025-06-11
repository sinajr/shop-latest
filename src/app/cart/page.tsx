"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/contexts/cart-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ShoppingCart, Trash2, MinusSquare, PlusSquare } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTranslation } from 'react-i18next';

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, clearCart, getCartTotal, isCartLoaded, getCartItemCount } = useCart();
  const { t } = useTranslation();

  if (!isCartLoaded) {
    // Show a loading state or skeleton while cart is loading from localStorage
    return (
      <div className="flex justify-center items-center h-64">
        <ShoppingCart className="h-12 w-12 animate-pulse text-primary" />
        <p className="ml-4 text-xl text-muted-foreground">{t('cart.loadingCart')}</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <ShoppingCart className="mx-auto h-24 w-24 text-muted-foreground mb-6" />
        <h1 className="text-3xl font-bold text-primary mb-4">{t('cart.cartEmpty')}</h1>
        <p className="text-lg text-muted-foreground mb-8">
          {t('cart.cartEmptyMessage')}
        </p>
        <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
          <Link href="/products">{t('cart.exploreCollection')}</Link>
        </Button>
      </div>
    );
  }

  const shippingCost = items.length > 0 ? 50.00 : 0; // Mock shipping
  const taxRate = 0.08; // Mock tax rate 8%
  const subtotal = getCartTotal();
  const taxes = subtotal * taxRate;
  const total = subtotal + shippingCost + taxes;

  return (
    <div className="container mx-auto py-8">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-bold text-primary flex items-center justify-center">
          <ShoppingCart className="mr-3 h-10 w-10 text-accent" /> {t('cart.yourShoppingCart')}
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">{t('cart.reviewItems')}</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items List */}
        <div className="lg:col-span-2 space-y-0"> {/* Removed space-y-6 to avoid double spacing with card margins */}
          <ScrollArea className="h-[calc(100vh-300px)] md:h-[500px] pr-4"> {/* Adjusted height and added fallback for smaller screens */}
            {items.map(item => (
              <Card key={item.id} className="flex flex-col sm:flex-row items-center p-4 shadow-md hover:shadow-lg transition-shadow mb-4">
                <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-md overflow-hidden mr-0 sm:mr-6 mb-4 sm:mb-0 shrink-0">
                  <Image
                    src={item.displayImageUrl}
                    alt={item.name}
                    fill
                    sizes="(max-width: 640px) 96px, 128px"
                    className="object-cover"
                    data-ai-hint={`${item.category} item`}
                  />
                </div>
                <div className="flex-grow text-center sm:text-left">
                  <h2 className="text-lg font-semibold text-foreground">{item.name}</h2>
                  {item.selectedColorName && <p className="text-sm text-muted-foreground">{t('cart.colorPrefix')} {item.selectedColorName}</p>}
                  {item.brand && <p className="text-sm text-muted-foreground">{item.brand}</p>}
                  <p className="text-md font-bold text-accent">
                    {typeof item.pricePerUnit === 'number' ? `$${item.pricePerUnit.toFixed(2)}` : t('cart.priceNA')}
                  </p>
                </div>
                <div className="flex items-center space-x-2 sm:space-x-3 mt-4 sm:mt-0 sm:ml-auto">
                  <Button variant="outline" size="icon" onClick={() => updateQuantity(item.id, item.quantity - 1)} disabled={item.quantity <= 1}>
                    <MinusSquare className="h-5 w-5" />
                  </Button>
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => {
                      const newQuantity = parseInt(e.target.value, 10);
                      if (!isNaN(newQuantity) && newQuantity > 0) {
                        updateQuantity(item.id, newQuantity);
                      } else if (e.target.value === '') {
                        // Allow clearing input, handle on blur or submit if needed
                      }
                    }}
                    className="w-12 sm:w-16 text-center h-10"
                    min="1"
                  />
                  <Button variant="outline" size="icon" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                    <PlusSquare className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => removeFromCart(item.id)} className="text-destructive hover:text-destructive/80">
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              </Card>
            ))}
          </ScrollArea>
          {items.length > 0 && (
            <div className="flex justify-end mt-4">
              <Button variant="outline" onClick={clearCart} className="text-destructive border-destructive hover:bg-destructive/10 hover:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> {t('cart.clearCart')} ({getCartItemCount()})
              </Button>
            </div>
          )}
        </div>

        {/* Order Summary */}
        <Card className="lg:col-span-1 shadow-xl h-fit">
          <CardHeader>
            <CardTitle className="text-2xl text-primary">{t('cart.orderSummary')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <p className="text-muted-foreground">{t('cart.subtotal')}</p>
              <p className="text-foreground font-semibold">${subtotal.toFixed(2)}</p>
            </div>
            <div className="flex justify-between">
              <p className="text-muted-foreground">{t('cart.shipping')}</p>
              <p className="text-foreground font-semibold">${shippingCost.toFixed(2)}</p>
            </div>
            <div className="flex justify-between">
              <p className="text-muted-foreground">{t('cart.estimatedTax')} ({(taxRate * 100).toFixed(0)}%)</p>
              <p className="text-foreground font-semibold">${taxes.toFixed(2)}</p>
            </div>
            <Separator />
            <div className="flex justify-between text-xl font-bold">
              <p className="text-primary">{t('cart.total')}</p>
              <p className="text-primary">${total.toFixed(2)}</p>
            </div>
          </CardContent>
          <CardFooter className="flex-col space-y-3 pt-6"> {/* Added pt-6 to CardFooter for spacing */}
            <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent/90" size="lg">
              <Link href="/checkout">{t('cart.proceedToCheckout')}</Link>
            </Button>
            <Button asChild variant="link" className="w-full text-accent" >
              <Link href="/products">{t('cart.continueShopping')}</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
