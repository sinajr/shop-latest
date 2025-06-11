
import type { Product } from '@/types';

// This file previously contained MOCK_PRODUCTS.
// It is now kept for historical reference or if local mock data is needed again in the future.
// The application is now expected to fetch product data from a live database (Firestore/RTDB).

// Example of how MOCK_PRODUCTS was structured, for reference:
/*
export const MOCK_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Rolex Submariner Date',
    description: "Iconic diver's watch in Oystersteel with a black Cerachrom bezel.",
    price: 14500.00,
    imageUrls: [
        `https://firebasestorage.googleapis.com/v0/b/luxe-advisor-4ks3k.appspot.com/o/products%2F1%2Fimages%2Fsubmariner_front.jpg?alt=media&token=example-token`,
        `https://firebasestorage.googleapis.com/v0/b/luxe-advisor-4ks3k.appspot.com/o/products%2F1%2Fimages%2Fsubmariner_angle.jpg?alt=media&token=example-token`
    ],
    videoUrls: [`https://firebasestorage.googleapis.com/v0/b/luxe-advisor-4ks3k.appspot.com/o/products%2F1%2Fvideos%2Fsubmariner_promo.mp4?alt=media&token=example-token`],
    category: 'Watches',
    brand: 'Rolex',
  },
  // ... other mock products
];
*/
