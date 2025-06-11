
'use server';
/**
 * @fileOverview Service for fetching order data from Firestore.
 */
import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import type { Order, OrderItem, Address as OrderAddress } from '@/types';

// Helper to convert Firestore timestamp to a Date object or keep as is
const convertTimestamp = (timestamp: any): Date | any => {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  // If it's already a Date object (e.g., from a previous transformation or mock data)
  if (timestamp instanceof Date) {
    return timestamp;
  }
  // If it's a string, try to parse it (this might be risky if format varies)
  if (typeof timestamp === 'string') {
    const parsedDate = new Date(timestamp);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
  }
  // Fallback if conversion is not straightforward
  console.warn('[OrderService] convertTimestamp: Could not convert timestamp, returning as is:', timestamp);
  return timestamp;
};


export async function fetchOrdersByUserId(userId: string): Promise<Order[]> {
  if (!userId) {
    console.warn("fetchOrdersByUserId: No userId provided.");
    return [];
  }

  const orders: Order[] = [];
  try {
    const ordersCollectionRef = collection(db, 'orders');
    // Query orders for the specific user, ordered by date descending
    const q = query(
      ordersCollectionRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc') // Changed from orderDate to createdAt to match typical field name
    );

    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      const data = doc.data();

      const orderItems: OrderItem[] = (data.items || []).map((item: any) => ({
        productId: item.productId || 'unknown-product',
        name: item.name || 'Unknown Item',
        quantity: typeof item.quantity === 'number' ? item.quantity : 1,
        price: typeof item.price === 'number' ? item.price : 0,
        imageUrl: item.imageUrl || 'https://placehold.co/64x64.png', // Default placeholder
        variantId: item.variantId || undefined,
        selectedColorName: item.selectedColorName || undefined,
      }));
      
      if (orderItems.length === 0 && Array.isArray(data.items) && data.items.length > 0) {
          console.warn(`[OrderService] Order ID ${doc.id} had items in raw data but resulted in empty parsed items. Raw items:`, data.items);
      }


      orders.push({
        id: doc.id,
        userId: data.userId,
        orderDate: convertTimestamp(data.createdAt || data.orderDate), // Prefer createdAt, fallback to orderDate
        items: orderItems,
        totalAmount: typeof data.totalAmount === 'number' ? data.totalAmount : 0,
        shippingAddress: data.shippingAddress as OrderAddress || { street: 'N/A', city: 'N/A', state: 'N/A', zip: 'N/A', country: 'N/A', id: 'n/a-addr'}, // Provide a default
        status: data.status || 'pending',
      } as Order);
    });
    return orders;
  } catch (error) {
    console.error(`Error fetching orders for user ${userId}:`, error);
    return []; // Return empty array on error
  }
}
