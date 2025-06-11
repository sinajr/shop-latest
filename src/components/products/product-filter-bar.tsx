"use client";

import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { X, Search } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useTranslation } from 'react-i18next';

interface ProductFilterBarProps {
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  categories: string[];
  currentBrandFilter: string | null; // Changed from selectedBrand
  onBrandChange: (brand: string) => void; // Signature remains string
  brands: string[];
  minPrice: string;
  onMinPriceChange: (price: string) => void;
  maxPrice: string;
  onMaxPriceChange: (price: string) => void;
  onClearFilters: () => void;
  minProductPrice?: number;
  maxProductPrice?: number;
  // Removed isBrandFilterActiveFromUrl
}

export function ProductFilterBar({
  searchTerm,
  onSearchTermChange,
  selectedCategory,
  onCategoryChange,
  categories,
  currentBrandFilter,
  onBrandChange,
  brands,
  minPrice,
  onMinPriceChange,
  maxPrice,
  onMaxPriceChange,
  onClearFilters,
  minProductPrice,
  maxProductPrice,
}: ProductFilterBarProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col space-y-6">
      {/* Search Input */}
      <div className="space-y-1.5">
        <Label htmlFor="search-product-sidebar" className="text-sm font-medium text-foreground">{t('collection.filter.searchLabel')}</Label>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="search-product-sidebar"
            type="search"
            placeholder={t('collection.filter.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            className="pl-9 bg-input text-foreground border-border focus:border-primary"
          />
        </div>
      </div>

      <Separator className="my-2" />

      {/* Category Select */}
      <div className="space-y-1.5">
        <Label htmlFor="category-select-sidebar" className="text-sm font-medium text-foreground">{t('collection.filter.categoryLabel')}</Label>
        <Select value={selectedCategory || '--all--'} onValueChange={onCategoryChange}>
          <SelectTrigger id="category-select-sidebar" className="bg-input text-foreground border-border focus:border-primary">
            <SelectValue placeholder={t('collection.filter.allCategories')} />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            <SelectItem value="--all--">{t('collection.filter.allCategories')}</SelectItem>
            {categories.map(category => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator className="my-2" />

      {/* Brand Select */}
      <div className="space-y-1.5">
        <Label htmlFor="brand-select-sidebar" className="text-sm font-medium text-foreground">{t('collection.filter.brandLabel')}</Label>
        <Select
          value={currentBrandFilter || '--all--'}
          onValueChange={onBrandChange}
        // Dropdown is no longer disabled
        >
          <SelectTrigger id="brand-select-sidebar" className="bg-input text-foreground border-border focus:border-primary">
            <SelectValue placeholder={t('collection.filter.allBrands')} />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            <SelectItem value="--all--">{t('collection.filter.allBrands')}</SelectItem>
            {brands.map(brand => (
              <SelectItem key={brand} value={brand}>
                {brand}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* Removed helper text "Brand filter applied from URL" */}
      </div>

      <Separator className="my-2" />

      {/* Price Range Inputs */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-foreground">{t('collection.filter.priceRangeLabel')}</Label>
        <div className="space-y-2">
          <Input
            id="min-price-sidebar"
            type="number"
            placeholder={minProductPrice !== undefined ? t('collection.filter.minPrice', { price: minProductPrice }) : t('collection.filter.minPricePlaceholder')}
            value={minPrice}
            onChange={(e) => onMinPriceChange(e.target.value)}
            min="0"
            className="bg-input text-foreground border-border focus:border-primary"
            aria-label={t('collection.filter.minPriceAria')}
          />
          <Input
            id="max-price-sidebar"
            type="number"
            placeholder={maxProductPrice !== undefined ? t('collection.filter.maxPrice', { price: maxProductPrice }) : t('collection.filter.maxPricePlaceholder')}
            value={maxPrice}
            onChange={(e) => onMaxPriceChange(e.target.value)}
            min="0"
            className="bg-input text-foreground border-border focus:border-primary"
            aria-label={t('collection.filter.maxPriceAria')}
          />
        </div>
      </div>

      <Separator className="my-2" />

      {/* Clear Filters Button */}
      <div className="pt-2">
        <Button
          variant="destructive"
          onClick={onClearFilters}
          className="w-full"
        >
          <X className="mr-2 h-4 w-4" /> {t('collection.clearAllFilters')}
        </Button>
      </div>
    </div>
  );
}
