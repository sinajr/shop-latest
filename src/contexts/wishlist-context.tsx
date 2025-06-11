
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './auth-context'; // Import useAuth
import { db } from '@/lib/firebase/config'; // Import Firestore
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, DocumentData } from 'firebase/firestore';

type WishlistItemId = string;

interface WishlistContextType {
  items: WishlistItemId[];
  addToWishlist: (productId: string, productName?: string) => void;
  removeFromWishlist: (productId: string, productName?: string) => void;
  isInWishlist: (productId: string) => boolean;
  clearWishlist: () => void;
  getWishlistItemCount: () => number;
  isWishlistLoaded: boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

// No longer using localStorage for logged-in users
// const LOCAL_STORAGE_WISHLIST_KEY = 'luxe-collective-wishlist';

export const WishlistProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<WishlistItemId[]>([]);
  const [isWishlistLoaded, setIsWishlistLoaded] = useState(false);
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth(); // Get user from AuthContext

  // Effect to load wishlist from Firestore when user logs in or auth state changes
  useEffect(() => {
    if (authLoading) {
      setIsWishlistLoaded(false);
      return;
    }

    if (user) {
      setIsWishlistLoaded(false); // Set to false while fetching
      const userWishlistRef = doc(db, "users", user.uid);
      getDoc(userWishlistRef).then(docSnap => {
        if (docSnap.exists()) {
          const userData = docSnap.data() as DocumentData; // Added type assertion
          setItems(userData.wishlistedProductIds || []);
        } else {
          // User document might not exist yet if signup process didn't complete it
          // or if it's a new structure. Initialize if needed.
          setItems([]);
          // Consider creating/updating user doc with empty wishlist here if appropriate
        }
        setIsWishlistLoaded(true);
      }).catch(error => {
        console.error("Error fetching wishlist from Firestore:", error);
        toast({ title: "Error", description: "Could not load your wishlist.", variant: "destructive" });
        setIsWishlistLoaded(true); // Still set to true to unblock UI
      });
    } else {
      // User is logged out, clear wishlist
      setItems([]);
      setIsWishlistLoaded(true);
    }
  }, [user, authLoading, toast]);


  const addToWishlist = useCallback(async (productId: string, productName: string = "Item") => {
    if (!user) {
      toast({ title: "Please Log In", description: "You need to be logged in to add items to your wishlist.", variant: "destructive" });
      return;
    }
    if (!items.includes(productId)) {
      const newItems = [...items, productId];
      setItems(newItems); // Optimistic update
      try {
        const userWishlistRef = doc(db, "users", user.uid);
        await updateDoc(userWishlistRef, {
          wishlistedProductIds: arrayUnion(productId)
        });
        setTimeout(() => { // Ensure toast is called after state updates
            toast({
                title: "Added to Wishlist",
                description: `${productName} has been added to your wishlist.`,
            });
        }, 0);
      } catch (error) {
        console.error("Error adding to Firestore wishlist:", error);
        setItems(items); // Revert optimistic update on error
        toast({ title: "Error", description: `Could not add ${productName} to wishlist.`, variant: "destructive" });
      }
    }
  }, [items, user, toast]);

  const removeFromWishlist = useCallback(async (productId: string, productName: string = "Item") => {
    if (!user) {
      // Should not happen if UI prevents this, but good for safety
      toast({ title: "Error", description: "User not logged in.", variant: "destructive" });
      return;
    }
    if (items.includes(productId)) {
      const newItems = items.filter(id => id !== productId);
      setItems(newItems); // Optimistic update
      try {
        const userWishlistRef = doc(db, "users", user.uid);
        await updateDoc(userWishlistRef, {
          wishlistedProductIds: arrayRemove(productId)
        });
        setTimeout(() => {
           toast({
             title: "Removed from Wishlist",
             description: `${productName} has been removed from your wishlist.`,
             variant: "destructive"
           });
        },0);
      } catch (error) {
        console.error("Error removing from Firestore wishlist:", error);
        setItems(items); // Revert optimistic update
        toast({ title: "Error", description: `Could not remove ${productName} from wishlist.`, variant: "destructive" });
      }
    }
  }, [items, user, toast]);

  const isInWishlist = useCallback((productId: string): boolean => {
    return items.includes(productId);
  }, [items]);

  const clearWishlist = useCallback(async () => {
    if (!user) {
      toast({ title: "Please Log In", description: "You need to be logged in to clear your wishlist.", variant: "destructive" });
      return;
    }
    const oldItems = [...items];
    setItems([]); // Optimistic update
    try {
      const userWishlistRef = doc(db, "users", user.uid);
      await updateDoc(userWishlistRef, {
        wishlistedProductIds: []
      });
      setTimeout(() => {
        toast({
          title: "Wishlist Cleared",
          description: "All items have been removed from your wishlist.",
        });
      },0);
    } catch (error) {
      console.error("Error clearing Firestore wishlist:", error);
      setItems(oldItems); // Revert
      toast({ title: "Error", description: "Could not clear your wishlist.", variant: "destructive" });
    }
  }, [user, items, toast]);

  const getWishlistItemCount = useCallback((): number => {
    return items.length;
  }, [items]);

  return (
    <WishlistContext.Provider
      value={{
        items,
        addToWishlist,
        removeFromWishlist,
        isInWishlist,
        clearWishlist,
        getWishlistItemCount,
        isWishlistLoaded,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = (): WishlistContextType => {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};
