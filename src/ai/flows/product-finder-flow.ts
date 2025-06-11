'use server';
/**
 * @fileOverview A chatbot flow to find luxury products based on user queries.
 * It now fetches live product data from Firestore to inform its responses, including available colors.
 *
 * - findProducts - A function that handles searching for products based on a user query.
 * - ProductFinderInput - The input type for the findProducts function.
 * - ProductFinderOutput - The return type for the findProducts function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { fetchAllProducts } from '@/services/productService';
import type { Product } from '@/types';

const ProductFinderInputSchema = z.object({
  query: z.string().describe('The user\'s query about products.'),
});
export type ProductFinderInput = z.infer<typeof ProductFinderInputSchema>;

const ProductFinderOutputSchema = z.object({
  reply: z.string().describe('The chatbot\'s response to the user query, potentially listing products.'),
  foundProducts: z.array(z.object({
    id: z.string().describe('The ID of the found product. This should match an ID from the provided product list if a specific product is identified.'),
    name: z.string().describe('The name of the found product.')
  })).optional().describe('A list of products found that match the query. The AI will attempt to identify relevant products based on the query and the provided product list.')
});
export type ProductFinderOutput = z.infer<typeof ProductFinderOutputSchema>;

export async function findProducts(input: ProductFinderInput): Promise<ProductFinderOutput> {
  return productFinderFlow(input);
}

// Helper function to serialize product data for the prompt
function serializeProductsForPrompt(products: Product[]): string {
  if (!products || products.length === 0) {
    return "No specific product inventory information is available at the moment.";
  }
  return products.map(p => {
    let productInfo = `- ID: ${p.id}, Name: ${p.name}`;
    if (p.brand) productInfo += `, Brand: ${p.brand}`;
    if (p.categoryId) productInfo += `, Category: ${p.categoryId}`; // Use categoryId
    if (p.variants && p.variants.length > 0) {
      const colorNames = p.variants.map(v => v.color.name).filter(name => name).join(', ');
      if (colorNames) {
        productInfo += `, Available Colors: [${colorNames}]`;
      }
      // Use first variant's price if available, else basePrice
      const displayPrice = p.variants[0].price !== undefined ? p.variants[0].price : p.basePrice;
      if (typeof displayPrice === 'number') productInfo += `, Price: $${displayPrice.toFixed(2)}`;
    } else if (typeof p.basePrice === 'number') {
      productInfo += `, Price: $${p.basePrice.toFixed(2)}`;
    }
    if (p.description) productInfo += `, Description: ${p.description.substring(0, 50)}...`;
    return productInfo;
  }).join('\n');
}

const productFinderPrompt = ai.definePrompt({
  name: 'productFinderPrompt',
  input: { schema: z.object({ query: ProductFinderInputSchema.shape.query, productListings: z.string() }) },
  output: { schema: ProductFinderOutputSchema },
  prompt: `You are an AI assistant for Luxe Collective, a luxury goods boutique.
Your goal is to help users find products based on their descriptions and the provided product listings.
You should provide helpful suggestions and information about luxury items. The product listings include price information and available colors.

Here is a list of available products (including their prices and colors if available):
{{{productListings}}}

User Query: {{{query}}}

Instructions:
1. **Language Detection and Response**:
   - If the user's query contains Russian text or Cyrillic characters, respond in Russian.
   - Otherwise, respond in English.

2. **Product Search and Response**:
   - If the query suggests specific types of products that match items in the 'productListings':
      * Discuss relevant models, styles, or colors from the list.
      * If you suggest specific product names from the list, populate the 'foundProducts' structured field with an array. For each item, provide the 'id' (must be from the productListings) and the 'name' of the product.
      * If the query asks for price-related information (e.g., "cheapest", "most expensive", "price range"), use the price data in the productListings to answer.
   - If the query is too vague (e.g., "show me something nice"), provide a textual 'reply' asking for more details like category, brand, style, or color. Do not populate 'foundProducts' unless you can make a reasonable suggestion from the list.
   - If you cannot find or suggest relevant items from the 'productListings' based on the query, provide a textual 'reply' politely stating that, or offer general luxury advice if appropriate. Do not populate 'foundProducts'.

3. **Language-specific Guidelines**:
   - When responding in Russian:
      * Maintain a professional and elegant tone appropriate for luxury retail
      * Use proper Russian grammar and punctuation
      * Keep brand names in their original form (e.g., "Rolex", "Gucci")
      * Use appropriate Russian fashion and luxury terminology
      * Format prices in the Russian style (e.g., "100 000 ₽" or "$1,000")
   - Keep your textual 'reply' concise and helpful in either language.
`,
});

const productFinderFlow = ai.defineFlow(
  {
    name: 'productFinderFlow',
    inputSchema: ProductFinderInputSchema,
    outputSchema: ProductFinderOutputSchema,
  },
  async (input) => {
    // Fetch live products from Firestore
    const allProducts = await fetchAllProducts();
    const productListings = serializeProductsForPrompt(allProducts);

    const { output } = await productFinderPrompt({ query: input.query, productListings });
    return output!;
  }
);
