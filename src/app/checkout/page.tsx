
"use client"; // Required for useCart, useRouter, useAuth

import React, { useEffect } from 'react';
import Link from "next/link";
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCart } from '@/contexts/cart-context';
import { useAuth } from '@/contexts/auth-context'; // Import useAuth
import { AuthForm } from '@/components/auth/auth-form'; // Import AuthForm
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, CreditCard, ShoppingCart, Loader2 } from "lucide-react";

// Inline SVG for PayPal Logo
const PayPalLogo = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-5 w-5">
    <path d="M10.422 10.667c-.316.94-.948 1.405-2.101 1.405h-1.202c-.502 0-.747-.315-.608-.88.49-1.985 1.73-4.613 2.068-5.489.216-.553.504-.703.964-.703h1.175c.482 0 .89.18.964.703.175 1.726-.43 4.06-.464 4.559zM12.504 14.328c-.043.21-.113.404-.21.585.806.093 1.288-.23 1.575-.88.435-.975.693-2.52.693-2.52s-.007.05-.014.086c-.49 1.985-1.73 4.613-2.068 5.489-.216-.553-.504-.703-.964-.703h-.422c-.75 0-1.18-.498-1.18-.498s.896.07 1.154-.743c.294-.913.498-1.97.498-1.97s-.02.118-.027.17c-.216.63-.68 1.034-1.455 1.034h-.584c-.502 0-.747-.315-.608-.88.49-1.985 1.73-4.613 2.068-5.489.216-.553-.504-.703.964-.703h.36c.46 0 .773.193.938.68.224.654.163 1.76-.05 2.729zm5.605-3.661c-.316.94-.948 1.405-2.101 1.405h-1.202c-.502 0-.747-.315-.608-.88.49-1.985 1.73-4.613 2.068-5.489.216-.553-.504-.703.964-.703h1.175c.482 0 .89.18.964.703.175 1.726-.43 4.06-.464 4.559z" fill="#003087"/>
    <path d="M10.422 10.667c-.316.94-.948 1.405-2.101 1.405h-1.202c-.502 0-.747-.315-.608-.88.49-1.985 1.73-4.613 2.068-5.489.216-.553-.504-.703.964-.703h1.175c.482 0 .89.18.964.703.175 1.726-.43 4.06-.464 4.559zM12.504 14.328c-.043.21-.113.404-.21.585.806.093 1.288-.23 1.575-.88.435-.975.693-2.52.693-2.52s-.007.05-.014.086c-.49 1.985-1.73 4.613-2.068 5.489-.216-.553-.504-.703-.964-.703h-.422c-.75 0-1.18-.498-1.18-.498s.896.07 1.154-.743c.294-.913.498-1.97.498-1.97s-.02.118-.027.17c-.216.63-.68 1.034-1.455 1.034h-.584c-.502 0-.747-.315-.608-.88.49-1.985 1.73-4.613 2.068-5.489.216-.553-.504-.703.964-.703h.36c.46 0 .773.193.938.68.224.654.163 1.76-.05 2.729zm5.605-3.661c-.316.94-.948 1.405-2.101 1.405h-1.202c-.502 0-.747-.315-.608-.88.49-1.985 1.73-4.613 2.068-5.489.216-.553-.504-.703.964-.703h1.175c.482 0 .89.18.964.703.175 1.726-.43 4.06-.464 4.559z" fill="#009cde"/>
    <path d="M6.02 10.667c-.316.94-.948 1.405-2.101 1.405H2.717c-.502 0-.747-.315-.608-.88.49-1.985 1.73-4.613 2.068-5.489C4.393 4.75 4.68 4.6 5.14 4.6h1.175c.482 0 .89.18.964.703.175 1.726-.43 4.06-.464 4.559z" fill="#002169"/>
  </svg>
);

const CHECKOUT_IMAGE_PLACEHOLDER = 'https://placehold.co/64x64.png';

export default function CheckoutPage() {
  const { items, getCartTotal, isCartLoaded } = useCart();
  const { user, isLoggedIn, loading: authLoading } = useAuth(); // Get auth state
  const router = useRouter();

  useEffect(() => {
    if (isCartLoaded && items.length === 0) {
      router.replace('/products'); // Redirect to products if cart is empty
    }
  }, [isCartLoaded, items, router]);

  if (authLoading || !isCartLoaded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">
          {authLoading ? "Loading user session..." : "Loading cart..."}
        </p>
      </div>
    );
  }

  if (items.length === 0 && isCartLoaded) {
     return (
      <div className="flex justify-center items-center h-64">
        <ShoppingCart className="h-12 w-12 animate-pulse text-primary" />
        <p className="ml-4 text-xl text-muted-foreground">
          Your cart is empty, redirecting...
        </p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="container mx-auto max-w-3xl py-12 text-center"> {/* Increased max-width */}
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-primary">Account Required</CardTitle>
            <CardDescription className="text-lg text-muted-foreground mt-2">
              Please sign up or log in to complete your purchase.
            </CardDescription>
          </CardHeader>
          <CardContent>
             <AuthForm />
          </CardContent>
        </Card>
      </div>
    );
  }

  const subtotal = getCartTotal();
  const shipping = items.length > 0 ? 50.00 : 0;
  const taxRate = 0.08;
  const tax = subtotal * taxRate;
  const total = subtotal + shipping + tax;

  return (
    <div className="max-w-4xl mx-auto py-8">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-bold text-primary flex items-center justify-center">
          <ShoppingCart className="mr-3 h-10 w-10 text-accent" /> Checkout
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">Review your order and complete your luxury purchase.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map(item => (
              <div key={item.id} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="relative w-16 h-16 rounded-md overflow-hidden mr-4">
                    <Image
                      src={item.displayImageUrl || CHECKOUT_IMAGE_PLACEHOLDER}
                      alt={item.name}
                      fill
                      sizes="64px"
                      className="object-cover"
                      data-ai-hint={`${item.category || 'product'} thumbnail`}
                    />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{item.name}</p>
                    <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                  </div>
                </div>
                <p className="font-semibold text-foreground">${(item.pricePerUnit * item.quantity).toFixed(2)}</p>
              </div>
            ))}
            <Separator />
            <div className="flex justify-between">
              <p className="text-muted-foreground">Subtotal</p>
              <p className="text-foreground">${subtotal.toFixed(2)}</p>
            </div>
             <div className="flex justify-between">
              <p className="text-muted-foreground">Shipping</p>
              <p className="text-foreground">${shipping.toFixed(2)}</p>
            </div>
             <div className="flex justify-between">
              <p className="text-muted-foreground">Est. Tax ({(taxRate * 100).toFixed(0)}%)</p>
              <p className="text-foreground">${tax.toFixed(2)}</p>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <p className="text-primary">Total</p>
              <p className="text-primary">${total.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">Pay with Card</CardTitle>
              <CardDescription>This is a mock payment section.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md text-blue-700 flex items-start dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-300">
                <AlertCircle className="h-5 w-5 mr-3 mt-1 shrink-0" />
                <p className="text-sm">
                  No actual payment will be processed. This form is for demonstration purposes only.
                </p>
              </div>
              <div>
                <label htmlFor="cardNumber" className="block text-sm font-medium text-muted-foreground mb-1">Card Number</label>
                <input type="text" id="cardNumber" name="cardNumber" className="w-full p-2 border rounded-md bg-input text-foreground" placeholder="•••• •••• •••• ••••" disabled />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="expiryDate" className="block text-sm font-medium text-muted-foreground mb-1">Expiry Date</label>
                  <input type="text" id="expiryDate" name="expiryDate" className="w-full p-2 border rounded-md bg-input text-foreground" placeholder="MM/YY" disabled />
                </div>
                <div>
                  <label htmlFor="cvc" className="block text-sm font-medium text-muted-foreground mb-1">CVC</label>
                  <input type="text" id="cvc" name="cvc" className="w-full p-2 border rounded-md bg-input text-foreground" placeholder="•••" disabled />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled>
                <CreditCard className="mr-2 h-5 w-5" /> Mock Pay ${total.toFixed(2)}
              </Button>
            </CardFooter>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">Pay with PayPal</CardTitle>
               <CardDescription>Alternatively, use PayPal for a secure checkout.</CardDescription>
            </CardHeader>
            <CardContent>
               <div className="p-4 bg-blue-50 border border-blue-200 rounded-md text-blue-700 flex items-start dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-300 mb-6">
                <AlertCircle className="h-5 w-5 mr-3 mt-1 shrink-0" />
                <p className="text-sm">
                  This is a mock PayPal button. No actual transaction will occur.
                </p>
              </div>
              <Button className="w-full bg-[#0070BA] text-white hover:bg-[#005ea6] dark:bg-[#FFC43A] dark:text-[#003087] dark:hover:bg-[#f0b92b]" disabled>
                <PayPalLogo /> Mock Pay with PayPal
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      <div className="mt-12 text-center">
        <p className="text-muted-foreground">Need help or want to explore more?</p>
        <Button variant="link" asChild className="text-accent">
            <Link href="/products">Continue Shopping</Link>
        </Button>
      </div>
    </div>
  );
}

