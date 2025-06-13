"use client";

export const dynamic = "force-dynamic";
import React, { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sparkles, ShoppingBag, Watch, Zap } from 'lucide-react';
import { ProductCard } from '@/components/products/product-card';
import { fetchAllProducts } from '@/services/productService';
import type { Product } from '@/types';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { ParticlesBackground } from '@/components/layout/particles-background';
import { INTERACTIVE_BOX_PARTICLE_OPTIONS, DEFAULT_FOOTER_PARTICLE_OPTIONS } from '@/config/particles-options';
import { Skeleton } from '@/components/ui/skeleton'; // For loading state
import { BrandLogoShowcase } from '@/components/home/brand-logo-showcase'; // Import the new component
import { useTranslation, Trans } from 'react-i18next';

interface HeroSlide {
  id: string;
  imageUrl: string;
  altText: string;
  title: React.ReactNode;
  subtitle: string;
  dataAiHint: string;
}

const heroSlides: HeroSlide[] = [
  {
    id: 'slide1',
    imageUrl: '/site-assets/images/new-slider-image-1.jpg',
    altText: 'Showcase of New Luxury Goods',
    title: 'home.hero.slide1.title',
    subtitle: 'home.hero.slide1.subtitle',
    dataAiHint: 'luxury goods showcase'
  },
  {
    id: 'slide2',
    imageUrl: '/site-assets/images/new-slider-image-2.jpg',
    altText: 'Collection of Elegant Timepieces',
    title: 'home.hero.slide2.title',
    subtitle: 'home.hero.slide2.subtitle',
    dataAiHint: 'elegant watches collection'
  },
  {
    id: 'slide3',
    imageUrl: '/site-assets/images/new-slider-image-3.jpg',
    altText: 'Latest Fashion Forward Apparel',
    title: 'home.hero.slide3.title',
    subtitle: 'home.hero.slide3.subtitle',
    dataAiHint: 'designer fashion trends'
  },
];

// Define brand data
const brandsData = [
  { name: 'Rolex', logoUrl: '/site-assets/brands/rolex-logo.svg', dataAiHint: 'Rolex logo' },
  { name: 'Gucci', logoUrl: '/site-assets/brands/gucci-logo.svg', dataAiHint: 'Gucci logo' },
  { name: 'Calvin Klein', logoUrl: '/site-assets/brands/calvin-klein-logo.svg', dataAiHint: 'Calvin Klein logo' },
  { name: 'Nike', logoUrl: '/site-assets/brands/nike-logo.svg', dataAiHint: 'Nike logo' },
  { name: 'Adidas', logoUrl: '/site-assets/brands/adidas-logo.svg', dataAiHint: 'Adidas logo' },
  { name: 'Hermès', logoUrl: '/site-assets/brands/hermes-logo.svg', dataAiHint: 'Hermes logo' },
  { name: 'Prada', logoUrl: '/site-assets/brands/prada-logo.svg', dataAiHint: 'Prada logo' },
  { name: 'Balenciaga', logoUrl: '/site-assets/brands/balenciaga-logo.svg', dataAiHint: 'Balenciaga logo' },
  { name: 'Casio', logoUrl: '/site-assets/brands/casio-logo.svg', dataAiHint: 'Casio logo' },
  { name: 'Puma', logoUrl: '/site-assets/brands/puma-logo.svg', dataAiHint: 'Puma logo' },
  // Add more brands as needed
];

export default function HomePage() {
  const { t, i18n } = useTranslation();
  const autoplayPlugin = useRef(Autoplay({ delay: 3000, stopOnInteraction: true, stopOnMouseEnter: true }));
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  // Prevent hydration mismatch: only render when i18n is initialized
  if (!i18n.isInitialized) {
    return null; // Or a loading spinner if you prefer
  }

  useEffect(() => {
    const loadProducts = async () => {
      setIsLoadingProducts(true);
      try {
        const allProducts = await fetchAllProducts();
        const validProducts = allProducts.filter(p => p);
        setFeaturedProducts(validProducts.slice(0, 8));
      } catch (error) {
        console.error("Failed to load featured products:", error);
        setFeaturedProducts([]);
      } finally {
        setIsLoadingProducts(false);
      }
    };
    loadProducts();
  }, []);

  return (
    <div className="space-y-16 py-8 md:py-12">
      {/* Hero Section - Carousel */}
      <section className="text-center">
        <Carousel
          plugins={[autoplayPlugin.current]}
          className="w-full rounded-lg overflow-hidden shadow-2xl mb-8"
          opts={{
            loop: true,
          }}
        >
          <CarouselContent>
            {heroSlides.map((slide, index) => (
              <CarouselItem key={slide.id}>
                <div className="relative w-full h-64 md:h-96">
                  <Image
                    src={slide.imageUrl}
                    alt={t(slide.altText)}
                    fill
                    sizes="(max-width: 768px) 100vw, 1920px"
                    className="object-cover"
                    priority={index === 0}
                    data-ai-hint={slide.dataAiHint}
                  />
                  <div className="absolute inset-0 bg-black/60 flex flex-col justify-center items-center p-4">
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white">
                      {typeof slide.title === 'string' && slide.title.startsWith('home.hero.') ? (
                        <Trans i18nKey={slide.title} components={[<span className="text-accent" key="accent" />]} />
                      ) : (
                        slide.title
                      )}
                    </h1>
                    <p className="mt-4 max-w-3xl text-lg md:text-xl text-neutral-200">
                      {t(slide.subtitle)}
                    </p>
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        <div className="mt-10 flex flex-col sm:flex-row justify-center items-center gap-4">
          <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg transform hover:scale-105 transition-transform">
            <Link href="/advisor">
              <Sparkles className="mr-2 h-5 w-5" /> {t('home.cta.personalizedAdvice')}
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="shadow-lg transform hover:scale-105 transition-transform">
            <Link href="/products">
              <ShoppingBag className="mr-2 h-5 w-5" /> {t('home.cta.exploreCollection')}
            </Link>
          </Button>
        </div>
      </section>

      {/* Brand Logo Showcase Section - MOVED HERE */}
      <BrandLogoShowcase brands={brandsData} />

      {/* Interactive Logo boxx Section - Reduced Height */}
      <section
        className="relative rounded-lg h-[40vh] overflow-hidden flex items-center justify-center"
      >
        <div
          id="interactive-logo-box"
          className="relative w-full h-full flex items-center justify-center"
        >
          <ParticlesBackground
            containerId="home-logo-particles"
            className="absolute left-0 w-full h-full -z-10"
            optionsOverride={INTERACTIVE_BOX_PARTICLE_OPTIONS}
          />
          <div className="relative z-10 flex flex-col items-center justify-center h-full p-4">
            <Image
              src="/logo.png"
              alt={t('home.logo.alt')}
              width={400}
              height={387}
              className="h-36 sm:h-48 md:h-56 w-auto drop-shadow-2xl"
              data-ai-hint="company logo"
            />
            <p className="mt-4 text-center text-lg md:text-xl text-foreground/90 font-semibold bg-background/70 backdrop-blur-sm px-4 py-2 rounded-md">
              {t('home.logo.tagline')}
            </p>
          </div>
        </div>
      </section>

      {/* Featured Categories Section */}
      <section className="py-12 bg-card rounded-lg shadow-xl">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-primary sm:text-4xl">
              {t('home.categories.title')}
            </h2>
            <p className="mt-4 text-lg leading-8 text-muted-foreground">
              {t('home.categories.subtitle')}
            </p>
          </div>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-8">
            <InfoCard
              title={t('home.categories.watches.title')}
              description={t('home.categories.watches.description')}
              imageUrl="/site-assets/images/featured-watches.jpg"
              dataAiHint="luxury watch"
            />
            <InfoCard
              title={t('home.categories.sneakers.title')}
              description={t('home.categories.sneakers.description')}
              imageUrl="/site-assets/images/featured-sneakers.jpg"
              dataAiHint="designer sneakers"
            />
            <InfoCard
              title={t('home.categories.apparel.title')}
              description={t('home.categories.apparel.description')}
              imageUrl="/site-assets/images/featured-apparel.jpg"
              dataAiHint="designer clothing"
            />
          </div>
        </div>
      </section>

      {/* Featured Products Section - Carousel */}
      <section className="py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold tracking-tight text-primary sm:text-4xl">
              {t('home.featured.title')}
            </h2>
            <p className="mt-4 text-lg leading-8 text-muted-foreground">
              {t('home.featured.subtitle')}
            </p>
          </div>
          {isLoadingProducts ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : featuredProducts.length > 0 ? (
            <Carousel
              opts={{
                align: "start",
                loop: featuredProducts.length > 3,
              }}
              className="w-full max-w-xs sm:max-w-2xl md:max-w-4xl lg:max-w-6xl mx-auto"
            >
              <CarouselContent className="-ml-1">
                {featuredProducts.map(product => (
                  product && product.id ? (
                    <CarouselItem key={product.id} className="pl-1 md:basis-1/2 lg:basis-1/3">
                      <div className="p-1 h-full">
                        <ProductCard product={product} />
                      </div>
                    </CarouselItem>
                  ) : null
                ))}
              </CarouselContent>
              <CarouselPrevious className="absolute left-[-50px] top-1/2 -translate-y-1/2 hidden sm:flex" />
              <CarouselNext className="absolute right-[-50px] top-1/2 -translate-y-1/2 hidden sm:flex" />
            </Carousel>
          ) : (
            <p className="text-center text-muted-foreground">{t('home.featured.noProducts')}</p>
          )}
          <div className="mt-10 text-center">
            <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg transform hover:scale-105 transition-transform">
              <Link href="/products">
                <ShoppingBag className="mr-2 h-5 w-5" /> {t('home.featured.exploreFullCollection')}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Style Advisor Promotional Section */}
      <section className="my-16 p-8 bg-card rounded-lg shadow-xl text-center border border-accent/30">
        <Sparkles className="mx-auto h-12 w-12 text-accent mb-4" />
        <h2 className="text-3xl font-bold text-primary mb-3">
          {t('home.styleAdvisor.title')}
        </h2>
        <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
          {t('home.styleAdvisor.subtitle')}
        </p>
        <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg transform hover:scale-105 transition-transform">
          <Link href="/advisor">
            <Sparkles className="mr-2 h-5 w-5" /> {t('home.styleAdvisor.cta')}
          </Link>
        </Button>
      </section>

    </div>
  );
}

interface InfoCardProps {
  title: string;
  description: string;
  imageUrl: string;
  dataAiHint: string;
}

function InfoCard({ title, description, imageUrl, dataAiHint }: InfoCardProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center text-center p-6 bg-background rounded-lg shadow-md hover:shadow-lg transition-shadow">
      <div className="relative w-full h-40 rounded-md overflow-hidden mb-4">
        <Image
          src={imageUrl}
          alt={t(title)}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 400px"
          className="object-cover"
          data-ai-hint={dataAiHint}
        />
      </div>
      <h3 className="text-xl font-semibold text-primary mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
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




