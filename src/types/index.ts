export interface ProductColorOption {
  name: string;
  hex?: string; // e.g., "#FFFFFF"
}

export interface ProductVariant {
  id: string; // Unique ID for this specific variant (e.g., "sku123-red-large")
  color: ProductColorOption;
  imageUrls: string[]; // URLs for images specific to this variant
  videoUrls?: string[]; // URLs for videos specific to this variant
  price?: number; // Variant-specific price (if different from base product price)
  stock?: number; // Stock quantity for this specific variant
  // Add other variant-specific attributes here, e.g., size, material
  // size?: string;
}

export interface Product {
  id: string;
  name: string | { [lang: string]: string };
  brand?: string;
  description: string | { [lang: string]: string };
  basePrice: number; // The main or starting price of the product
  categoryId?: string; // Link to a category
  createdAt?: any; // Firestore Timestamp, store as any for now, format on display
  tags?: string[]; // e.g., ["luxury", "white gold", "limited edition"]
  variants: ProductVariant[]; // Array of product variants
}

export interface Category {
  id: string;
  name: string;
  parentId?: string | null; // For nested categories
}

export interface Address {
  id: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  isDefault?: boolean;
}

export interface OrderItem {
  productId: string; // ID of the base product
  name: string; // Name of the base product
  quantity: number;
  price: number; // Price of the variant at the time of purchase
  imageUrl: string; // Primary image URL of the selected variant for display
  variantId?: string; // ID of the selected ProductVariant
  selectedColorName?: string; // Name of the selected color variant
  // Potentially other selected variant attributes like size
  // selectedSize?: string;
}

export interface Order {
  id: string; // Firestore document ID
  userId: string;
  orderDate: any; // Firebase Timestamp, store as any for now, format on display
  items: OrderItem[];
  totalAmount: number;
  shippingAddress: Address; // A copy of the shipping address for this order
  status?: string; // e.g., "pending", "shipped", "completed", "canceled"
}

// Represents the structure of user data stored in Firestore
export interface UserDocument {
  uid: string;
  email: string | null;
  displayName?: string | null;
  firstName?: string;
  lastName?: string;
  countryCode?: string;
  phoneNumber?: string;
  shippingAddresses?: Address[];
  wishlistedProductIds?: string[];
  createdAt: any; // Firestore Timestamp
  updatedAt?: any; // Firestore Timestamp
}
