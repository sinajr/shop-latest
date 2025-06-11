"use client";

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState, startTransition } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signOutUser } from '@/lib/firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Heart, Trash2, Loader2, Edit3, Save, X, Phone, ShoppingBag } from 'lucide-react';
import Image from 'next/image';
import { useWishlist } from '@/contexts/wishlist-context';
import { fetchAllProducts } from '@/services/productService';
import { fetchOrdersByUserId } from '@/services/orderService';
import type { Product, Address, UserDocument, Order } from '@/types';
import { db } from '@/lib/firebase/config';
import { doc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AddressForm } from '@/components/profile/address-form';
import { CountryCodeSelect } from '@/components/profile/CountryCodeSelect';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { updateUserPhone, type PhoneFormState } from './actions';
import { useActionState } from 'react';
import { countries } from '@/lib/countries'; // Import countries data

// Function to subscribe to real-time user data updates from Firestore
const subscribeToUserData = (userId: string, callback: (data: UserDocument | null) => void): Unsubscribe => {
  if (!userId) return () => { }; // Return a no-op unsubscribe function if no userId
  const userDocRef = doc(db, "users", userId);
  const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
    if (docSnap.exists()) {
      const userData = docSnap.data() as UserDocument;
      callback(userData);
    } else {
      console.log("User document not found for addresses or other details.");
      callback(null); // User document doesn't exist
    }
  }, (error) => {
    console.error("Error listening to user document changes from Firestore:", error);
    callback(null); // Error occurred
  });
  return unsubscribe; // Return the unsubscribe function
};

export default function ProfilePage() {
  const { t } = useTranslation();
  useEffect(() => {
    async function runAdminCheck() {
      if (typeof window === 'undefined') return;
      try {
        await fetch('/api/admin-debug');
        console.log("✅ Called /api/admin-debug");
      } catch (err) {
        console.error("❌ Failed to call /api/admin-debug", err);
      }
    }

    runAdminCheck();
  }, []);
  const { user, loading: authLoading, isLoggedIn } = useAuth();
  const { items: wishlistItemIds, isWishlistLoaded, removeFromWishlist } = useWishlist();
  const router = useRouter();
  const { toast } = useToast();

  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  const [userData, setUserData] = useState<UserDocument | null>(null);
  const [loadingUserData, setLoadingUserData] = useState(true);

  const [isEditAddressDialogOpen, setIsEditAddressDialogOpen] = useState(false);
  const [currentEditingAddress, setCurrentEditingAddress] = useState<Address | null>(null);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editableCountryCode, setEditableCountryCode] = useState('');
  const [editablePhoneNumber, setEditablePhoneNumber] = useState('');

  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  const [phoneFormState, phoneFormAction, isPhonePending] = useActionState(updateUserPhone, { status: 'idle' });

  useEffect(() => {
    if (phoneFormState.status === 'success') {
      toast({
        title: t('profile.phoneUpdateSuccessTitle'),
        description: phoneFormState.message,
      });
      setIsEditingProfile(false); // Close the edit section on success
    } else if (phoneFormState.status === 'error') {
      toast({
        title: t('profile.phoneUpdateErrorTitle'),
        description: phoneFormState.message || t('profile.phoneUpdateErrorMessage'),
        variant: "destructive",
      });
    }
  }, [phoneFormState, toast, t]);

  useEffect(() => {
    let unsubscribeUserDoc: Unsubscribe = () => { };

    if (!authLoading && !isLoggedIn) {
      router.push('/auth');
    } else if (user) {
      setLoadingUserData(true);
      unsubscribeUserDoc = subscribeToUserData(user.uid, (fetchedUserData) => {
        setUserData(fetchedUserData);
        if (fetchedUserData) {
          const foundCountry = countries.find(country => country.dialCode === fetchedUserData.countryCode);
          setEditableCountryCode(foundCountry ? `${foundCountry.dialCode}-${foundCountry.isoCode}` : '');
          setEditablePhoneNumber(fetchedUserData.phoneNumber || '');
        }
        setLoadingUserData(false);
      });

      const loadWishlistProducts = async () => {
        if (isWishlistLoaded && wishlistItemIds.length > 0) {
          setIsLoadingProducts(true);
          try {
            const fetchedProducts = await fetchAllProducts();
            setAllProducts(fetchedProducts);
          } catch (err) {
            console.error("Failed to fetch products for wishlist", err);
          } finally {
            setIsLoadingProducts(false);
          }
        } else if (isWishlistLoaded && wishlistItemIds.length === 0) {
          setAllProducts([]);
          setIsLoadingProducts(false);
        }
      };
      loadWishlistProducts();

      setLoadingOrders(true);
      fetchOrdersByUserId(user.uid).then(fetchedOrders => {
        setOrders(fetchedOrders);
        setLoadingOrders(false);
      }).catch(err => {
        console.error("Failed to fetch orders", err);
        setOrders([]);
        setLoadingOrders(false);
        toast({ title: "Error", description: "Could not load your order history.", variant: "destructive" });
      });
    }

    return () => {
      unsubscribeUserDoc(); // Cleanup subscription on component unmount
    };
  }, [authLoading, isLoggedIn, router, user, isWishlistLoaded, wishlistItemIds, toast]);

  const addresses = userData?.shippingAddresses || [];

  const wishlistProducts: Product[] = (isWishlistLoaded && !isLoadingProducts && allProducts.length > 0)
    ? allProducts.filter(product => product && product.id && wishlistItemIds.includes(product.id))
    : [];

  const handleSignOut = async () => {
    try {
      await signOutUser();
      toast({ title: 'Signed Out', description: 'You have been successfully signed out.' });
      router.push('/');
    } catch (error) {
      toast({ title: 'Sign Out Error', description: 'Failed to sign out. Please try again.', variant: 'destructive' });
    }
  };

  const handleToggleEditProfile = () => {
    if (!user || !userData) return;
    if (isEditingProfile) { // When canceling edit
      setEditableCountryCode(userData.countryCode || '');
      setEditablePhoneNumber(userData.phoneNumber || '');
    }
    setIsEditingProfile(!isEditingProfile);
  };

  const handleSaveProfileChanges = async (event?: React.FormEvent) => {
    if (event) event.preventDefault();
    if (!user) return;
    const idToken = await user.getIdToken();
    const formData = new FormData();
    formData.set('idToken', idToken);
    formData.set('countryCode', editableCountryCode.split('-')[0]); // Extract dialCode for action
    formData.set('phoneNumber', editablePhoneNumber);

    // Wrap the action call in startTransition
    startTransition(() => {
      phoneFormAction(formData);
    });
    // UI will update on success via revalidation
  };

  const showOverallLoading = authLoading || (!isLoggedIn && !authLoading) ||
    (isLoggedIn && isWishlistLoaded && wishlistItemIds.length > 0 && isLoadingProducts && allProducts.length === 0) ||
    (isLoggedIn && loadingUserData && !userData) ||
    (isLoggedIn && loadingOrders && orders.length === 0 && !authLoading && isLoggedIn);

  if (showOverallLoading) {
    return <ProfilePageSkeleton />;
  }

  if (!isLoggedIn || !user) {
    // This case should be covered by the useEffect redirect, but as a fallback
    return null;
  }

  const handleEditAddressSuccess = (message?: string) => {
    setIsEditAddressDialogOpen(false);
    setCurrentEditingAddress(null);
    // Toast is handled by AddressForm/Server Action now
    // if (message) {
    //  toast({ title: "Success", description: message });
    // }
  };

  const openEditAddressDialog = (address: Address) => {
    setCurrentEditingAddress(address);
    setIsEditAddressDialogOpen(true);
  };


  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold text-primary">{t('profile.title')}</h1>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">{t('profile.accountDetails')}</CardTitle>
          <CardDescription>{t('profile.accountDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {user.displayName && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('profile.displayName')}</p>
              <p className="text-lg text-foreground">{user.displayName}</p>
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t('profile.email')}</p>
            <p className="text-lg text-foreground">{user.email}</p>
          </div>

          {/* Always display static phone number in main card */}
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t('profile.phoneNumber')}</p>
            {(userData?.countryCode || userData?.phoneNumber) ? (
              <p className="text-lg text-foreground">
                {userData.countryCode && <span>{userData.countryCode} </span>}
                {userData.phoneNumber}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground italic">{t('profile.notProvided')}</p>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t('profile.userId')}</p>
            <p className="text-sm text-foreground break-all">{user.uid}</p>
          </div>
          <div className="flex space-x-2 pt-4">
            {!isEditingProfile && (
              <Button variant="outline" onClick={handleToggleEditProfile}>
                <Edit3 className="mr-2 h-4 w-4" /> {t('profile.editProfile')}
              </Button>
            )}
            <Button variant="destructive" onClick={handleSignOut}>
              {t('profile.signOut')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {isEditingProfile && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">{t('profile.editProfile')}</CardTitle>
            <CardDescription>{t('profile.editProfileDescription', 'Update your phone number details.')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSaveProfileChanges} className="space-y-4">
              <div className="grid grid-cols-3 gap-4 items-end">
                <div className="space-y-2 col-span-1">
                  <Label htmlFor="countryCode">Country Code</Label>
                  <CountryCodeSelect
                    value={editableCountryCode}
                    onValueChange={setEditableCountryCode}
                    disabled={isPhonePending}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="phoneNumber">{t('profile.phoneNumber')}</Label>
                  <Input
                    id="phoneNumber"
                    name="phoneNumber"
                    type="tel"
                    value={editablePhoneNumber}
                    onChange={(e) => setEditablePhoneNumber(e.target.value)}
                    placeholder="1234567890"
                    disabled={isPhonePending}
                  />
                </div>
              </div>
              {phoneFormState.status === 'error' && (
                <div className="text-destructive text-sm">
                  {phoneFormState.message}
                  {phoneFormState.fieldErrors && (
                    <ul className="mt-1 list-disc list-inside">
                      {phoneFormState.fieldErrors.map((err, idx) => (
                        <li key={idx}>{err.message}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              <div className="flex space-x-2 pt-4">
                <Button type="submit" disabled={isPhonePending}>
                  <Save className="mr-2 h-4 w-4" /> {isPhonePending ? t('profile.saving') : t('profile.saveChanges')}
                </Button>
                <Button variant="outline" onClick={handleToggleEditProfile} disabled={isPhonePending}>
                  <X className="mr-2 h-4 w-4" /> {t('profile.cancel')}
                </Button>
              </div>
              {phoneFormState.status === 'success' && (
                <div className="text-success text-sm mt-2">{phoneFormState.message}</div>
              )}
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center">
            <ShoppingBag className="mr-3 h-6 w-6 text-accent" /> {t('profile.orderHistory')}
          </CardTitle>
          <CardDescription>{t('profile.orderHistoryDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingOrders ? (
            <OrderHistorySkeleton />
          ) : orders.length > 0 ? (
            <div className="space-y-6">
              {orders.map((order) => (
                <Card key={order.id} className="p-4 shadow-md">
                  <CardHeader className="p-0 pb-3">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg">{t('profile.orderId')}: {order.id.substring(0, 8)}...</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {order.orderDate ? format(new Date(order.orderDate), 'PPP') : t('profile.orderDateUnavailable')}
                      </p>
                    </div>
                    <p className="text-md font-semibold text-accent">{t('profile.orderTotal', { amount: order.totalAmount.toFixed(2) })}</p>
                  </CardHeader>
                  <CardContent className="p-0">
                    <p className="text-sm font-medium text-muted-foreground mb-1">{t('profile.orderItems')}</p>
                    <ul className="space-y-2">
                      {order.items.map((item, index) => (
                        <li key={`${order.id}-${item.productId}-${index}`} className="flex items-center space-x-3 text-sm p-2 border-b last:border-b-0">
                          <div className="relative w-12 h-12 rounded-md overflow-hidden shrink-0">
                            <Image
                              src={item.imageUrl || 'https://placehold.co/48x48.png'}
                              alt={item.name}
                              fill
                              sizes="48px"
                              className="object-cover"
                              data-ai-hint="order item thumbnail"
                            />
                          </div>
                          <div className="flex-grow">
                            <p className="font-medium text-foreground">{item.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {t('profile.orderQtyPrice', {
                                qty: item.quantity,
                                price: typeof item.price === 'number' ? item.price.toFixed(2) : t('profile.priceNotAvailable', 'Цена не указана')
                              })}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                    {order.shippingAddress && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-sm font-medium text-muted-foreground mb-1">{t('profile.orderShippedTo')}</p>
                        <p className="text-xs text-muted-foreground">
                          {order.shippingAddress.street}, {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zip}, {order.shippingAddress.country}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-6">{t('profile.noOrders')}</p>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center">
            <Heart className="mr-3 h-6 w-6 text-accent" /> {t('profile.wishlist')}
          </CardTitle>
          <CardDescription>{t('profile.wishlistDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingProducts && wishlistItemIds.length > 0 ? (
            <WishlistSkeleton />
          ) : wishlistProducts.length > 0 ? (
            <ul className="space-y-4">
              {wishlistProducts.map((item) => {
                if (!item) return null;
                // Use first variant for price and image
                const firstVariant = item.variants && item.variants.length > 0 ? item.variants[0] : null;
                const price = firstVariant && firstVariant.price ? firstVariant.price : item.basePrice;
                const imageUrl = firstVariant && firstVariant.imageUrls && firstVariant.imageUrls.length > 0
                  ? firstVariant.imageUrls[0]
                  : 'https://placehold.co/64x64.png';

                return (
                  <li key={item.id} className="flex items-center space-x-4 p-3 rounded-md border bg-card">
                    <div className="relative w-16 h-16 rounded-md overflow-hidden shrink-0">
                      <Image
                        src={imageUrl}
                        alt={typeof item.name === 'string' ? item.name : (item.name?.en || 'Product image')}
                        fill
                        sizes="64px"
                        className="object-cover"
                        data-ai-hint={`${item.categoryId || 'item'} thumbnail`}
                      />
                    </div>
                    <div className="flex-grow">
                      <p className="font-semibold text-card-foreground">{typeof item.name === 'string' ? item.name : (item.name?.en || '')}</p>
                      <p className="text-sm text-accent font-medium">
                        {price ? `$${price.toFixed(2)}` : t('profile.priceNotAvailable', 'Цена не указана')}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFromWishlist(item.id, typeof item.name === 'string' ? item.name : (item.name?.en || ''))}
                      className="text-destructive hover:text-destructive/80"
                      aria-label={t('profile.removeFromWishlistAria', { name: typeof item.name === 'string' ? item.name : (item.name?.en || '') })}
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-muted-foreground text-center py-4">{t('profile.wishlistEmpty')}</p>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center">
            <MapPin className="mr-3 h-6 w-6 text-accent" /> {t('profile.savedAddresses')}
          </CardTitle>
          <CardDescription>{t('profile.savedAddressesDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingUserData && addresses.length === 0 ? (
            <AddressSkeleton />
          ) : addresses.length > 0 ? (
            <div className="space-y-6">
              {addresses.map((address) => (
                <div key={address.id} className="p-4 border rounded-md bg-card relative">
                  {address.isDefault && (
                    <span className="absolute top-2 right-2 text-xs font-semibold bg-accent text-accent-foreground px-2 py-0.5 rounded">{t('profile.default')}</span>
                  )}
                  <p className="font-medium text-card-foreground">{address.street}</p>
                  {(address.city || address.state || address.zip) && (
                    <p className="text-sm text-muted-foreground">
                      {address.city && `${address.city}, `}
                      {address.state && `${address.state} `}
                      {address.zip}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">{address.country}</p>
                  <div className="mt-3 space-x-2">
                    <Button variant="outline" size="sm" onClick={() => openEditAddressDialog(address)}>
                      <Edit3 className="mr-1.5 h-3.5 w-3.5" /> {t('profile.edit')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">{t('profile.noAddresses')}</p>
          )}

          {/* Edit Address Dialog */}
          <Dialog open={isEditAddressDialogOpen} onOpenChange={(open) => {
            setIsEditAddressDialogOpen(open);
            if (!open) setCurrentEditingAddress(null);
          }}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{t('profile.editAddressDialogTitle')}</DialogTitle>
                <DialogDescription>
                  {t('profile.editAddressDialogDescription')}
                </DialogDescription>
              </DialogHeader>
              {currentEditingAddress && user && (
                <AddressForm
                  onSaveSuccess={handleEditAddressSuccess}
                  addressToEdit={currentEditingAddress}
                />
              )}
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}

function ProfilePageSkeleton() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <Skeleton className="h-10 w-1/3 mb-4" /> {/* Title skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-1/2 mb-2" /> {/* Card title skeleton */}
          <Skeleton className="h-4 w-3/4" /> {/* Card description skeleton */}
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-2/3" />
          {/* Phone number skeleton */}
          <div className="space-y-1">
            <Label className="text-sm font-medium text-muted-foreground">Phone Number</Label>
            <Skeleton className="h-6 w-1/2" />
          </div>
          <Skeleton className="h-6 w-3/4" /> {/* User ID skeleton */}
          <div className="flex space-x-2 pt-4">
            <Skeleton className="h-10 w-28" /> {/* Button skeleton */}
            <Skeleton className="h-10 w-24" /> {/* Button skeleton */}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-1/2 mb-2" />
          <Skeleton className="h-4 w-3/4" />
        </CardHeader>
        <CardContent>
          <OrderHistorySkeleton />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-1/3 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent>
          <WishlistSkeleton />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-1/3 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent>
          <AddressSkeleton />
        </CardContent>
      </Card>
    </div>
  );
}

function WishlistSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(2)].map((_, i) => (
        <li key={`wishlist-skel-${i}`} className="flex items-center space-x-4 p-3 rounded-md border bg-card">
          <Skeleton className="w-16 h-16 rounded-md shrink-0" />
          <div className="flex-grow space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/4" />
          </div>
          <Skeleton className="h-8 w-10" />
        </li>
      ))}
    </div>
  );
}

function AddressSkeleton() {
  return (
    <div className="space-y-6">
      {[...Array(1)].map((_, i) => (
        <div key={`address-skel-${i}`} className="p-4 border rounded-md space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
          <div className="mt-3 space-x-2">
            <Skeleton className="h-8 w-16 inline-block" />
            <Skeleton className="h-8 w-20 inline-block" />
          </div>
        </div>
      ))}
    </div>
  );
}

function OrderHistorySkeleton() {
  return (
    <div className="space-y-6">
      {[...Array(2)].map((_, i) => (
        <Card key={i} className="p-4 shadow-md">
          <CardHeader className="p-0 pb-3">
            <div className="flex justify-between items-center">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-4 w-1/4" />
            </div>
            <Skeleton className="h-5 w-1/3 mt-1" />
          </CardHeader>
          <CardContent className="p-0">
            <Skeleton className="h-4 w-1/5 mb-2" />
            <ul className="space-y-3">
              {[...Array(1)].map((_, j) => (
                <li key={`order-skel-item-${j}`} className="flex items-center space-x-3 p-2 border-b last:border-b-0">
                  <Skeleton className="w-12 h-12 rounded-md shrink-0" />
                  <div className="flex-grow space-y-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-3 pt-3 border-t">
              <Skeleton className="h-4 w-1/4 mb-1" />
              <Skeleton className="h-3 w-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
