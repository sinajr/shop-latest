
import { db } from '@/lib/firebase/config'; // Firestore
import { collection, getDocs, doc as firestoreDoc, getDoc, Timestamp } from 'firebase/firestore';
import type { Product, ProductVariant, ProductColorOption } from '@/types';

// Helper function to parse a single variant's data
function parseSingleVariant(variantData: any, defaultPrice: number, defaultStock?: number): ProductVariant | null {
  if (!variantData || typeof variantData !== 'object') {
    // console.warn(`[ProductService] parseSingleVariant: Invalid variantData provided.`, variantData);
    return null;
  }

  const colorOption: ProductColorOption = {
    name: variantData?.color?.name || 'Default',
    hex: variantData?.color?.hex || undefined,
  };

  let imageUrls: string[] = [];
  if (Array.isArray(variantData?.imageUrls)) {
    imageUrls = variantData.imageUrls.filter((url: any) => typeof url === 'string');
  } else if (typeof variantData?.imageUrl === 'string') {
    imageUrls = [variantData.imageUrl];
  }

  let videoUrls: string[] | undefined = undefined;
  if (Array.isArray(variantData?.videoUrls)) {
    videoUrls = variantData.videoUrls.filter((url: any) => typeof url === 'string');
  } else if (typeof variantData?.videoUrl === 'string') {
    videoUrls = [variantData.videoUrl];
  }

  let parsedPrice = defaultPrice;
  if (typeof variantData?.price === 'number') {
    parsedPrice = variantData.price;
  } else if (typeof variantData?.price === 'string') {
    const priceAsNumber = parseFloat(variantData.price);
    if (!isNaN(priceAsNumber)) {
      parsedPrice = priceAsNumber;
    } else {
      console.warn(`[ProductService] parseSingleVariant: Variant price '${variantData.price}' is a string but could not be parsed to a number. Falling back to default price. Variant ID: ${variantData?.id}`);
    }
  }


  return {
    id: variantData?.id || `variant-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    color: colorOption,
    imageUrls: imageUrls,
    videoUrls: videoUrls,
    price: parsedPrice,
    stock: typeof variantData?.stock === 'number' ? variantData.stock : (typeof variantData?.stock === 'string' ? parseInt(variantData.stock, 10) : defaultStock),
  };
}


// Helper function to parse the variants array from Firestore data
function parseVariants(
  variantDataArray: any[] | undefined,
  baseProductPrice: number,
  baseProductStock?: number
): ProductVariant[] {
  if (!Array.isArray(variantDataArray) || variantDataArray.length === 0) {
    return [];
  }
  return variantDataArray.map(variantData => parseSingleVariant(variantData, baseProductPrice, baseProductStock))
                         .filter(variant => variant !== null) as ProductVariant[];
}

// Helper function to transform Firestore document data to Product type
function parseProductData(docId: string, productData: any): Product | null {
  if (!productData) return null;

  const id = docId;
  const name = productData.name || 'Unnamed Product';
  const basePrice = typeof productData.basePrice === 'number' ? productData.basePrice : (typeof productData.price === 'number' ? productData.price : 0);
  const baseStock = typeof productData.stock === 'number' ? productData.stock : undefined;

  if (!productData.name) console.warn(`[ProductService] Product ID ${id} is missing 'name'. Using default.`);
  if (typeof productData.basePrice !== 'number' && typeof productData.price !== 'number') console.warn(`[ProductService] Product ID ${id} is missing 'basePrice' and 'price' or they are not numbers. Using default 0.`);

  let finalVariants = parseVariants(productData.variants, basePrice, baseStock);

  // Fallback: If no 'variants' array, but top-level imageUrls/videoUrls exist, create a default variant.
  if (finalVariants.length === 0) {
    // console.log(`[ProductService] Product ID ${id} has no variants array. Checking for top-level media.`);
    let topLevelImageUrls: string[] = [];
    if (Array.isArray(productData.imageUrls) && productData.imageUrls.length > 0) {
      topLevelImageUrls = productData.imageUrls.filter((url: any) => typeof url === 'string');
    } else if (typeof productData.imageUrl === 'string') { // Handle legacy single imageUrl
      topLevelImageUrls = [productData.imageUrl];
    }

    let topLevelVideoUrls: string[] | undefined = undefined;
    if (Array.isArray(productData.videoUrls) && productData.videoUrls.length > 0) {
      topLevelVideoUrls = productData.videoUrls.filter((url: any) => typeof url === 'string');
    } else if (typeof productData.videoUrl === 'string') { // Handle legacy single videoUrl
      topLevelVideoUrls = [productData.videoUrl];
    }

    if (topLevelImageUrls.length > 0 || (topLevelVideoUrls && topLevelVideoUrls.length > 0)) {
      // console.warn(`[ProductService] Product ID ${id}: No 'variants' field found, but top-level image/video URL(s) exist. Creating a default variant.`);
      const defaultVariantData = {
        id: `${id}-default-variant`,
        color: { name: 'Default', hex: undefined },
        imageUrls: topLevelImageUrls,
        videoUrls: topLevelVideoUrls,
        price: basePrice, // Use basePrice for default variant
        stock: baseStock, // Use baseStock for default variant
      };
      const defaultVariant = parseSingleVariant(defaultVariantData, basePrice, baseStock);
      if (defaultVariant) {
        finalVariants.push(defaultVariant);
      }
    } else {
      // console.warn(`[ProductService] Product ID ${id}: No 'variants' field and no top-level image/video URL(s) found.`);
    }
  }
  
  const product: Product = {
    id: id,
    name: name,
    brand: productData.brand || undefined,
    description: productData.description || 'No description available.',
    basePrice: basePrice,
    categoryId: productData.categoryId || undefined,
    createdAt: productData.createdAt instanceof Timestamp ? productData.createdAt.toDate() : (productData.createdAt ? new Date(productData.createdAt) : undefined),
    tags: Array.isArray(productData.tags) ? productData.tags.filter((tag: any) => typeof tag === 'string') : [],
    variants: finalVariants,
  };
  // console.log(`[ProductService] Constructed product for ID ${id}:`, JSON.stringify(product, null, 2).substring(0, 500) + "...");
  return product;
}


export async function fetchAllProducts(): Promise<Product[]> {
  const products: Product[] = [];
  try {
    const productsCollectionRef = collection(db, 'products');
    const querySnapshot = await getDocs(productsCollectionRef);
    // console.log(`[ProductService] fetchAllProducts: Attempting to fetch products. Found ${querySnapshot.docs.length} documents in Firestore 'products' collection.`);

    querySnapshot.forEach((doc) => {
      const productData = doc.data();
      const parsedProduct = parseProductData(doc.id, productData);
      if (parsedProduct) {
        products.push(parsedProduct);
      } else {
        console.warn(`[ProductService] fetchAllProducts: Failed to parse product data for document ID: ${doc.id}. Raw data:`, productData);
      }
    });

    // console.log(`[ProductService] fetchAllProducts: Successfully processed and returning ${products.length} products.`);
    return products;
  } catch (error) {
    console.error("[ProductService] Error fetching all products from Firestore:", error);
    return [];
  }
}

export async function fetchProductById(productId: string): Promise<Product | null> {
  if (!productId) {
    // console.warn("[ProductService] fetchProductById: No productId provided.");
    return null;
  }
  try {
    const productDocRef = firestoreDoc(db, 'products', productId);
    const docSnap = await getDoc(productDocRef);

    if (docSnap.exists()) {
      const productData = docSnap.data();
      // console.log(`[ProductService] fetchProductById: Document ID: ${docSnap.id}, Raw data:`, JSON.stringify(productData).substring(0,300) + "...");
      const parsedProduct = parseProductData(docSnap.id, productData);
      if (parsedProduct) {
        // console.log(`[ProductService] fetchProductById: Successfully parsed product ${productId}.`);
        return parsedProduct;
      } else {
        console.warn(`[ProductService] fetchProductById: Failed to parse product data for document ID: ${productId}. Raw data:`, productData);
        return null;
      }
    } else {
      // console.warn(`[ProductService] Product with ID ${productId} not found in Firestore.`);
      return null;
    }
  } catch (error) {
    console.error(`[ProductService] Error fetching product with ID ${productId} from Firestore:`, error);
    return null;
  }
}

