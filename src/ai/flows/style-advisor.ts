'use server';

/**
 * @fileOverview Provides personalized luxury style advice based on user preferences,
 * including suggesting specific products (and their variants like color) from the current inventory.
 *
 * - getStyleAdvice - A function that generates personalized luxury style advice.
 * - StyleAdvisorInput - The input type for the getStyleAdvice function.
 * - StyleAdvisorOutput - The return type for the getStyleAdvice function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { fetchAllProducts } from '@/services/productService';
import type { Product, ProductVariant } from '@/types';

const StyleAdvisorInputSchema = z.object({
  favoriteColor: z
    .string()
    .describe('The user\'s preferred color for clothing or accessories.'),
  favoriteBrand: z
    .string()
    .describe('The user\'s favorite luxury brand (e.g., Rolex, Gucci, Nike, Adidas, Patek Philippe).'),
  height: z
    .number()
    .optional()
    .describe('The user\'s height in centimeters (optional, mainly for apparel).'),
  weight: z
    .number()
    .optional()
    .describe('The user\'s weight in kilograms (optional, mainly for apparel).'),
  itemType: z
    .string()
    .describe('The type of item the user is interested in (e.g., Watch, Sneakers, Handbag, Apparel).'),
  intendedUseCase: z
    .string()
    .describe('The intended use case or occasion (e.g., Everyday Wear, Special Event, Collecting, Sport).'),
  preferredStyle: z
    .string()
    .describe('The user\'s preferred style (e.g., Classic, Streetwear, Minimalist, Sporty, Elegant).'),
});
export type StyleAdvisorInput = z.infer<typeof StyleAdvisorInputSchema>;

const StyleAdvisorSuggestedProductSchema = z.object({
  id: z.string().describe('The ID of the suggested base product from the provided list.'),
  name: z.string().describe('The name of the suggested base product from the provided list.'),
  primaryImageUrl: z.string().optional().describe('The primary image URL of the specific variant of the product being suggested. This should come from the variant details in the product inventory if a specific color/variant is highlighted.')
});
// This type is not exported as it's internal to this flow for schema definition
type StyleAdvisorSuggestedProduct = z.infer<typeof StyleAdvisorSuggestedProductSchema>;


const StyleAdvisorOutputSchema = z.object({
  advice: z
    .string()
    .describe(
      'Personalized luxury style advice focusing on the specified item type, brands, and preferences.'
    ),
  suggestedProducts: z.array(StyleAdvisorSuggestedProductSchema).optional().describe('An array of 1 to 3 specific products from the provided product list that match the style advice. THIS IS A VERY IMPORTANT FIELD, PLEASE TRY TO POPULATE IT. Ensure the primaryImageUrl corresponds to the specific variant/color you are recommending.'),
});
export type StyleAdvisorOutput = z.infer<typeof StyleAdvisorOutputSchema>;

// Helper function to serialize product data for the AI prompt
function serializeProductsForAiPrompt(products: Product[]): string {
  if (!products || products.length === 0) {
    return "No specific product inventory information is available at the moment.";
  }
  return products.map(p => {
    let productInfo = `Product ID: ${p.id}, Name: ${p.name}`;
    if (p.brand) productInfo += `, Brand: ${p.brand}`;
    if (p.categoryId) productInfo += `, Category: ${p.categoryId}`;
    if (typeof p.basePrice === 'number') productInfo += `, BasePrice: $${p.basePrice.toFixed(2)}`;
    if (p.description) productInfo += `, Description (snippet): ${p.description.substring(0, 50)}...`;

    if (p.variants && p.variants.length > 0) {
      productInfo += `\n  Available Variants:`;
      p.variants.forEach(variant => {
        let variantDetails = `\n    - Color: ${variant.color.name}`;
        if (variant.price !== undefined && variant.price !== p.basePrice) {
          variantDetails += `, Price: $${variant.price.toFixed(2)}`;
        }
        const variantImage = variant.imageUrls && variant.imageUrls.length > 0 ? variant.imageUrls[0] : null;
        if (variantImage) {
          variantDetails += `, ImageURL: ${variantImage}`;
        }
        productInfo += variantDetails;
      });
    }
    return productInfo;
  }).join('\n---\n'); // Use a clear separator between products
}


export async function getStyleAdvice(input: StyleAdvisorInput): Promise<StyleAdvisorOutput> {
  return styleAdvisorFlow(input);
}

const prompt = ai.definePrompt({
  name: 'styleAdvisorPrompt',
  input: { schema: z.object({ advisorInput: StyleAdvisorInputSchema, productListings: z.string() }) },
  output: { schema: StyleAdvisorOutputSchema },
  prompt: `You are a personal luxury style advisor for "Elite Stuff Trade", a boutique specializing in watches, high-end sneakers, designer apparel, and accessories.
Your goal is to provide personalized style advice AND suggest specific, relevant products (including color variants) from our current inventory.

User Preferences (from advisorInput):
- Item Type of Interest: {{{advisorInput.itemType}}}
- Favorite Color: {{{advisorInput.favoriteColor}}}
- Favorite Luxury Brand: {{{advisorInput.favoriteBrand}}}
{{#if advisorInput.height}}- Height (cm): {{{advisorInput.height}}}{{/if}}
{{#if advisorInput.weight}}- Weight (kg): {{{advisorInput.weight}}}{{/if}}
- Intended Use Case: {{{advisorInput.intendedUseCase}}}
- Preferred Style: {{{advisorInput.preferredStyle}}}

Available Product Inventory (productListings):
The inventory lists products. Each product may have several variants (e.g., different colors). Each variant has its own details, including its specific color name, potentially a different price, and its own ImageURL.
{{{productListings}}}

Instructions:
1. **Language Detection and Response**:
   - If any of the input fields (itemType, favoriteColor, favoriteBrand, intendedUseCase, preferredStyle) contain Russian text or Cyrillic characters, respond in Russian.
   - Otherwise, respond in English.

2. **Provide detailed style advice** in the 'advice' field. This advice should be tailored to the user's preferences, item type, and use case. Mention brands (user's favorite or similar luxury ones like Rolex, Patek Philippe, Gucci, Nike, Adidas, Hermès) and specific characteristics.

3. **CRITICAL: Suggest 1 to 3 specific products** from the 'Available Product Inventory' that directly match your style advice.
   * Populate the 'suggestedProducts' array in the output.
   * For each suggested product:
     * The 'id' MUST be the base Product ID from the inventory.
     * The 'name' MUST be the base Product Name from the inventory.
     * The 'primaryImageUrl' MUST be the ImageURL of the specific variant (e.g., color) you are recommending for that product, taken directly from the variant details in the 'Available Product Inventory' list.
   * If no products from the list perfectly match, try to find the closest ones. If truly nothing is relevant, you may leave 'suggestedProducts' empty, but prioritize making suggestions.
   * Explain in your textual 'advice' why these specific products (and their specific variants/colors if applicable) are good recommendations.

4. If suggesting apparel and height/weight are provided, briefly consider how the item might suit their build.

5. Mention current trends if relevant.

6. Keep the advice concise yet comprehensive.

7. **Language-specific Notes**:
   - When responding in Russian, maintain a professional and elegant tone appropriate for luxury fashion advice.
   - Use proper Russian grammar and punctuation.
   - Keep brand names in their original form (e.g., "Rolex", "Gucci").
   - Use appropriate Russian fashion terminology.
`,
});

const styleAdvisorFlow = ai.defineFlow(
  {
    name: 'styleAdvisorFlow',
    inputSchema: StyleAdvisorInputSchema,
    outputSchema: StyleAdvisorOutputSchema,
  },
  async (input) => {
    // Fetch live products from Firestore
    const allProducts = await fetchAllProducts();
    const productListings = serializeProductsForAiPrompt(allProducts);

    const { output } = await prompt({ advisorInput: input, productListings });

    // Ensure suggestedProducts is an array, even if it's empty or undefined from AI
    const finalOutput: StyleAdvisorOutput = {
      advice: output?.advice || "Sorry, I couldn't generate advice at this time.",
      suggestedProducts: output?.suggestedProducts || []
    };

    return finalOutput;
  }
);
