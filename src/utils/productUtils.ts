import { Product } from '@/types';

export function findSimilarProducts(
    products: Product[],
    searchQuery: string,
    maxResults: number = 3
): Product[] {
    if (!products || products.length === 0) return [];

    // Convert search query to lowercase for case-insensitive matching
    const query = searchQuery.toLowerCase();

    // Split query into words for better matching
    const queryWords = query.split(/\s+/).filter(word => word.length > 2);

    // Score each product based on how well it matches the query
    const scoredProducts = products.map(product => {
        let score = 0;
        const productName = product.name.toLowerCase();
        const productBrand = product.brand?.toLowerCase() || '';
        const productDescription = product.description.toLowerCase();
        const productCategory = product.categoryId?.toLowerCase() || '';

        // Check for exact matches in name, brand, and category
        queryWords.forEach(word => {
            if (productName.includes(word)) score += 3;
            if (productBrand.includes(word)) score += 2;
            if (productCategory.includes(word)) score += 2;
            if (productDescription.includes(word)) score += 1;
        });

        // Check for color matches in variants
        if (product.variants) {
            product.variants.forEach(variant => {
                const colorName = variant.color.name.toLowerCase();
                if (queryWords.some(word => colorName.includes(word))) {
                    score += 2;
                }
            });
        }

        return { product, score };
    });

    // Sort by score and return top matches
    return scoredProducts
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, maxResults)
        .map(item => item.product);
} 