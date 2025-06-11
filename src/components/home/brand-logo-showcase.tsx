"use client";

import Image from 'next/image';
import Link from 'next/link';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Card } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';

interface BrandInfo {
  name: string;
  logoUrl: string;
  dataAiHint: string;
}

interface BrandLogoShowcaseProps {
  brands: BrandInfo[];
  title?: string;
}

export function BrandLogoShowcase({ brands, title = "Shop by Brand" }: BrandLogoShowcaseProps) {
  const { t } = useTranslation();
  if (!brands || brands.length === 0) {
    return null;
  }

  return (
    <section className="py-12 bg-background rounded-lg">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold tracking-tight text-primary sm:text-4xl">
            {title ? t(title) : t('home.brandShowcase.title')}
          </h2>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">
            {t('home.brandShowcase.subtitle')}
          </p>
        </div>

        <div className="relative">
          <Carousel
            opts={{
              align: "start",
              loop: brands.length > 8, // Adjusted based on new item count
              slidesToScroll: 1,
            }}
            className="w-full max-w-xs sm:max-w-xl md:max-w-3xl lg:max-w-5xl xl:max-w-6xl mx-auto"
          >
            <CarouselContent className="-ml-2 md:-ml-3">
              {brands.map((brand, index) => (
                <CarouselItem key={index} className="pl-2 md:pl-3 basis-1/4 sm:basis-1/5 md:basis-1/6 lg:basis-1/7 xl:basis-1/8">
                  <div className="p-1">
                    <Link
                      href={`/products?brand=${encodeURIComponent(brand.name)}`}
                      className="group block text-accent"
                      aria-label={t('home.brandShowcase.ariaLabel', { brand: brand.name })}
                    >
                      <Card className="overflow-hidden transition-all duration-300 ease-in-out border border-border bg-card p-2 group-hover:bg-secondary/30 group-hover:border-accent">
                        <div className="flex flex-col items-center text-center">
                          <div className="relative w-12 h-12 md:w-16 md:h-16 rounded-full overflow-hidden bg-white p-1 border border-transparent group-hover:border-accent/30 transition-all duration-300 flex items-center justify-center">
                            <Image
                              src={brand.logoUrl}
                              alt={`${brand.name} logo`}
                              width={35}
                              height={35}
                              className="object-contain transition-transform duration-300 group-hover:scale-105"
                              data-ai-hint={brand.dataAiHint}
                            />
                          </div>
                          <p className="mt-1.5 text-xs font-medium text-foreground group-hover:text-accent transition-colors truncate w-full px-1">
                            {brand.name}
                          </p>
                        </div>
                      </Card>
                    </Link>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="absolute left-[-35px] sm:left-[-40px] md:left-[-50px] top-1/2 -translate-y-1/2 text-primary bg-background/80 hover:bg-accent hover:text-accent-foreground rounded-full shadow-lg disabled:opacity-30 disabled:cursor-not-allowed p-2 border border-border hover:border-accent" />
            <CarouselNext className="absolute right-[-35px] sm:right-[-40px] md:right-[-50px] top-1/2 -translate-y-1/2 text-primary bg-background/80 hover:bg-accent hover:text-accent-foreground rounded-full shadow-lg disabled:opacity-30 disabled:cursor-not-allowed p-2 border border-border hover:border-accent" />
          </Carousel>
        </div>
      </div>
    </section>
  );
}

