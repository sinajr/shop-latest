"use client";

import { useActionState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { submitStyleAdvice, type StyleAdvisorFormState } from '@/app/advisor/actions';
import { Sparkles, Terminal, ShoppingBag } from 'lucide-react'; // Added ShoppingBag
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';

const initialState: StyleAdvisorFormState = {
  status: 'idle',
  suggestedProducts: [],
};

export function AdvisorForm() {
  const { t } = useTranslation();
  const [state, formAction, isPending] = useActionState(submitStyleAdvice, initialState);

  // Log the state whenever it changes, for debugging
  useEffect(() => {
    console.log("AdvisorForm state updated:", state);
  }, [state]);

  // To repopulate form fields from state.formData if validation fails server-side
  const favoriteColorDefault = state.formData?.favoriteColor || "";
  const favoriteBrandDefault = state.formData?.favoriteBrand || "";
  const itemTypeDefault = state.formData?.itemType || "";
  const intendedUseCaseDefault = state.formData?.intendedUseCase || "";
  const preferredStyleDefault = state.formData?.preferredStyle || "";
  const heightDefault = state.formData?.height?.toString() || "";
  const weightDefault = state.formData?.weight?.toString() || "";

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-primary flex items-center">
            <Sparkles className="mr-3 h-8 w-8 text-accent" />
            {t('advisor.title')}
          </CardTitle>
          <CardDescription>
            {t('advisor.description')}
          </CardDescription>
        </CardHeader>
        <form action={formAction}>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="itemType">{t('advisor.form.itemType')}</Label>
                <Select name="itemType" defaultValue={itemTypeDefault}>
                  <SelectTrigger id="itemType">
                    <SelectValue placeholder={t('advisor.form.itemTypePlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Watch">{t('advisor.form.itemTypes.Watch')}</SelectItem>
                    <SelectItem value="Sneakers">{t('advisor.form.itemTypes.Sneakers')}</SelectItem>
                    <SelectItem value="Handbag">{t('advisor.form.itemTypes.Handbag')}</SelectItem>
                    <SelectItem value="Apparel">{t('advisor.form.itemTypes.Apparel')}</SelectItem>
                    <SelectItem value="Accessory">{t('advisor.form.itemTypes.Accessory')}</SelectItem>
                    <SelectItem value="Other">{t('advisor.form.itemTypes.Other')}</SelectItem>
                  </SelectContent>
                </Select>
                {state.errors?.itemType && <p className="text-sm text-destructive">{state.errors.itemType.join(', ')}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="favoriteBrand">{t('advisor.form.favoriteBrand')}</Label>
                <Input id="favoriteBrand" name="favoriteBrand" placeholder={t('advisor.form.favoriteBrandPlaceholder')} defaultValue={favoriteBrandDefault} />
                {state.errors?.favoriteBrand && <p className="text-sm text-destructive">{state.errors.favoriteBrand.join(', ')}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="favoriteColor">{t('advisor.form.favoriteColor')}</Label>
                <Input id="favoriteColor" name="favoriteColor" placeholder={t('advisor.form.favoriteColorPlaceholder')} defaultValue={favoriteColorDefault} />
                {state.errors?.favoriteColor && <p className="text-sm text-destructive">{state.errors.favoriteColor.join(', ')}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="preferredStyle">{t('advisor.form.preferredStyle')}</Label>
                <Input id="preferredStyle" name="preferredStyle" placeholder={t('advisor.form.preferredStylePlaceholder')} defaultValue={preferredStyleDefault} />
                {state.errors?.preferredStyle && <p className="text-sm text-destructive">{state.errors.preferredStyle.join(', ')}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="intendedUseCase">{t('advisor.form.intendedUseCase')}</Label>
              <Input id="intendedUseCase" name="intendedUseCase" placeholder={t('advisor.form.intendedUseCasePlaceholder')} defaultValue={intendedUseCaseDefault} />
              {state.errors?.intendedUseCase && <p className="text-sm text-destructive">{state.errors.intendedUseCase.join(', ')}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="height">{t('advisor.form.height')} <span className="text-muted-foreground text-xs">{t('advisor.form.heightOptional')}</span></Label>
                <Input id="height" name="height" type="number" placeholder={t('advisor.form.heightPlaceholder')} defaultValue={heightDefault} />
                {state.errors?.height && <p className="text-sm text-destructive">{state.errors.height.join(', ')}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">{t('advisor.form.weight')} <span className="text-muted-foreground text-xs">{t('advisor.form.weightOptional')}</span></Label>
                <Input id="weight" name="weight" type="number" placeholder={t('advisor.form.weightPlaceholder')} defaultValue={weightDefault} />
                {state.errors?.weight && <p className="text-sm text-destructive">{state.errors.weight.join(', ')}</p>}
              </div>
            </div>

            {state.errors?.general && (
              <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>{t('advisor.error.general')}</AlertTitle>
                <AlertDescription>{state.errors.general.join(', ')}</AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={isPending}>
              {isPending ? t('advisor.form.submitting') : t('advisor.form.submit')} <Sparkles className="ml-2 h-5 w-5" />
            </Button>
          </CardFooter>
        </form>
      </Card>

      {state.status === 'success' && (
        <Card className="mt-8 shadow-xl bg-secondary">
          <CardHeader>
            <CardTitle className="text-2xl text-secondary-foreground flex items-center">
              <Sparkles className="mr-2 h-6 w-6 text-accent" /> {t('advisor.result.yourAdvice')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {state.advice && <p className="text-secondary-foreground whitespace-pre-wrap mb-6">{state.advice}</p>}

            {state.suggestedProducts && state.suggestedProducts.length > 0 ? (
              <div>
                <h3 className="text-xl font-semibold text-secondary-foreground mb-4">{t('advisor.result.productSuggestions')}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {state.suggestedProducts.map(product => (
                    (product && product.id && product.name) ? (
                      <Link key={product.id} href={`/products/${product.id}`} passHref legacyBehavior>
                        <a className="block group bg-card p-3 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                          {product.primaryImageUrl && (
                            <div className="relative w-full h-48 mb-3 rounded overflow-hidden">
                              <Image
                                src={product.primaryImageUrl}
                                alt={product.name}
                                fill
                                sizes="(max-width: 640px) 100vw, 50vw"
                                className="object-cover group-hover:scale-105 transition-transform"
                                data-ai-hint="suggested product"
                              />
                            </div>
                          )}
                          <h4 className="text-md font-semibold text-card-foreground group-hover:text-accent truncate" title={product.name}>
                            {product.name}
                          </h4>
                          {!product.primaryImageUrl && (
                            <p className="text-sm text-accent mt-1">{t('advisor.result.exploreCollection')}</p>
                          )}
                        </a>
                      </Link>
                    ) : null
                  ))}
                </div>
              </div>
            ) : state.advice ? ( // Only show this if advice exists but suggestions don't
              <div className="mt-4 p-4 bg-accent/10 rounded-md">
                <p className="text-center text-accent-foreground/80">
                  {t('advisor.result.noProducts')}
                </p>
                <div className="mt-3 text-center">
                  <Button asChild variant="link" className="text-accent hover:text-accent/80">
                    <Link href="/products">
                      <ShoppingBag className="mr-2 h-4 w-4" /> {t('advisor.result.exploreCollection')}
                    </Link>
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}
      {state.status === 'error' && state.message && !state.errors?.general && (
        <Alert variant="destructive" className="mt-6">
          <Terminal className="h-4 w-4" />
          <AlertTitle>{t('advisor.error.adviceFailed')}</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
