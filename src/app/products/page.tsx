"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation'; // Added useRouter
import { ProductList } from '@/components/products/product-list';
import { fetchAllProducts } from '@/services/productService';
import type { Product } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { XCircle, ShoppingBag, ListFilter } from 'lucide-react';
import { ProductFilterBar } from '@/components/products/product-filter-bar';
import { Card } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';

export default function ProductsPage() {
  const { t } = useTranslation();
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const searchParams = useSearchParams();
  const router = useRouter(); // Initialize useRouter
  const [activeBrandFilterFromUrl, setActiveBrandFilterFromUrl] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  // const [selectedBrand, setSelectedBrand] = useState(''); // This state is removed
  const [minPriceFilter, setMinPriceFilter] = useState('');
  const [maxPriceFilter, setMaxPriceFilter] = useState('');

  useEffect(() => {
    const loadProducts = async () => {
      setIsLoading(true);
      const fetchedProducts = await fetchAllProducts();
      setAllProducts(fetchedProducts);
      setIsLoading(false);
    };
    loadProducts();
  }, []);

  const uniqueCategories = useMemo(() => {
    if (isLoading) return [];
    const categories = new Set<string>();
    allProducts.forEach(product => {
      if (product.categoryId) categories.add(product.categoryId);
    });
    return Array.from(categories).sort();
  }, [allProducts, isLoading]);

  const uniqueBrands = useMemo(() => {
    if (isLoading) return [];
    const brands = new Set<string>();
    allProducts.forEach(product => {
      if (product.brand) brands.add(product.brand);
    });
    return Array.from(brands).sort();
  }, [allProducts, isLoading]);

  const { minProductPrice, maxProductPrice } = useMemo(() => {
    if (isLoading || allProducts.length === 0) return { minProductPrice: 0, maxProductPrice: 10000 };
    let min = Infinity;
    let max = -Infinity;
    allProducts.forEach(p => {
      const price = p.variants?.[0]?.price ?? p.basePrice;
      if (typeof price === 'number') {
        if (price < min) min = price;
        if (price > max) max = price;
      }
    });
    return { minProductPrice: min === Infinity ? 0 : Math.floor(min), maxProductPrice: max === -Infinity ? 10000 : Math.ceil(max) };
  }, [allProducts, isLoading]);

  useEffect(() => {
    const brandQueryFromUrl = searchParams.get('brand');
    setActiveBrandFilterFromUrl(brandQueryFromUrl || null);

    if (!isLoading) {
      let productsToFilter = [...allProducts];

      // Use activeBrandFilterFromUrl (derived from URL) as the source of truth for filtering
      if (brandQueryFromUrl) {
        productsToFilter = productsToFilter.filter(product =>
          product.brand && product.brand.toLowerCase() === brandQueryFromUrl.toLowerCase()
        );
      }

      if (searchTerm) {
        const lowerSearchTerm = searchTerm.toLowerCase();
        productsToFilter = productsToFilter.filter(product =>
          product.name.toLowerCase().includes(lowerSearchTerm) ||
          (product.brand && product.brand.toLowerCase().includes(lowerSearchTerm)) ||
          (product.description && product.description.toLowerCase().includes(lowerSearchTerm))
        );
      }

      if (selectedCategory && selectedCategory !== '--all--') {
        productsToFilter = productsToFilter.filter(product =>
          product.categoryId === selectedCategory
        );
      }
      const minP = parseFloat(minPriceFilter);
      const maxP = parseFloat(maxPriceFilter);
      if (!isNaN(minP)) {
        productsToFilter = productsToFilter.filter(product => {
          const price = product.variants?.[0]?.price ?? product.basePrice;
          return typeof price === 'number' && price >= minP;
        });
      }
      if (!isNaN(maxP) && maxP > 0) {
        productsToFilter = productsToFilter.filter(product => {
          const price = product.variants?.[0]?.price ?? product.basePrice;
          return typeof price === 'number' && price <= maxP;
        });
      }

      setFilteredProducts(productsToFilter);
    }
  }, [searchParams, allProducts, isLoading, searchTerm, selectedCategory, minPriceFilter, maxPriceFilter]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    // setSelectedBrand(''); // selectedBrand state removed
    setMinPriceFilter('');
    setMaxPriceFilter('');

    const currentQuery = new URLSearchParams(searchParams.toString());
    currentQuery.delete('brand'); // Clear brand from URL
    // Clear other URL-based filters if any
    // currentQuery.delete('category'); 
    // currentQuery.delete('search');
    router.push(`/products?${currentQuery.toString()}`);
  };

  const handleCategoryChange = (categoryValue: string) => {
    setSelectedCategory(categoryValue === '--all--' ? '' : categoryValue);
    // Note: If categories were also URL-driven, you'd update URL here too.
  };

  const handleBrandChange = (brandValue: string) => {
    const currentQuery = new URLSearchParams(searchParams.toString());
    if (brandValue && brandValue !== '--all--') {
      currentQuery.set('brand', brandValue);
    } else {
      currentQuery.delete('brand');
    }
    router.push(`/products?${currentQuery.toString()}`);
  };

  const activeFilterCount = [
    searchTerm,
    selectedCategory && selectedCategory !== '--all--',
    activeBrandFilterFromUrl, // Count if URL brand filter is active
    minPriceFilter,
    maxPriceFilter
  ].filter(Boolean).length;

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <header className="mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-primary flex items-center justify-center">
          <ShoppingBag className="mr-3 h-8 w-8 text-accent" />
          {t('collection.title')}
        </h1>
        <p className="mt-1 text-md md:text-lg text-muted-foreground">{t('collection.subtitle')}</p>
      </header>

      <div className="flex flex-col md:flex-row gap-6 lg:gap-8">
        {/* Filter Panel Column */}
        <div className="w-full md:w-72 lg:w-80 flex-shrink-0">
          <Card className="p-4 md:p-6 shadow-lg sticky top-24">
            <ProductFilterBar
              searchTerm={searchTerm}
              onSearchTermChange={setSearchTerm}
              selectedCategory={selectedCategory || '--all--'}
              onCategoryChange={handleCategoryChange}
              categories={uniqueCategories}
              currentBrandFilter={activeBrandFilterFromUrl} // Pass URL brand
              onBrandChange={handleBrandChange}
              brands={uniqueBrands}
              minPrice={minPriceFilter}
              onMinPriceChange={setMinPriceFilter}
              maxPrice={maxPriceFilter}
              onMaxPriceChange={setMaxPriceFilter}
              onClearFilters={handleClearFilters}
              minProductPrice={minProductPrice}
              maxProductPrice={maxProductPrice}
            // isBrandFilterActiveFromUrl prop removed
            />
          </Card>
        </div>

        {/* Product List Column */}
        <div className="flex-1 min-w-0">
          {activeBrandFilterFromUrl && (
            <Card className="p-3 mb-6 bg-card border-border rounded-md shadow-sm">
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground">
                  {t('collection.filteringByBrand', { brand: decodeURIComponent(activeBrandFilterFromUrl) })}
                </span>
                <Button variant="ghost" size="sm" asChild className="text-destructive hover:text-destructive/80">
                  <Link href="/products" aria-label={t('collection.clearBrandFilterAria')}>
                    <XCircle className="mr-1 h-4 w-4" /> {t('collection.clearBrand')}
                  </Link>
                </Button>
              </div>
            </Card>
          )}

          {activeFilterCount > 0 && !isLoading && (
            <div className="mb-4 text-sm text-muted-foreground">
              {t('collection.productsFound', { count: filteredProducts.length })}
            </div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : filteredProducts.length > 0 ? (
            <ProductList products={filteredProducts} />
          ) : (
            <div className="text-center py-10 bg-card rounded-lg shadow-md mt-6">
              <ListFilter className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-xl text-muted-foreground mb-4">
                {t('collection.noProducts')}
              </p>
              <Button variant="outline" onClick={handleClearFilters} className="mb-2">
                {t('collection.clearAllFilters')}
              </Button>
              {activeBrandFilterFromUrl && (
                <Button variant="link" asChild className="ml-0 md:ml-2">
                  <Link href="/products">{t('collection.showAllProducts')}</Link>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="flex flex-col space-y-3 p-4 border rounded-lg shadow-md bg-card">
      <Skeleton className="h-[180px] w-full rounded-xl" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-6 w-1/4 mt-2" />
      </div>
      <Skeleton className="h-9 w-full mt-4" />
    </div>
  );
}
