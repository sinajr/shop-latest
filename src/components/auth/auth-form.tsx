"use client";

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from '@/hooks/use-toast';
import { signInWithEmail, signUpWithEmail } from '@/lib/firebase/auth';
import { useRouter } from 'next/navigation';
import type { AuthError } from 'firebase/auth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CountryCodeSelect } from '@/components/profile/CountryCodeSelect';
import { countries } from '@/lib/countries';
import { useTranslation } from 'react-i18next';

const signUpSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required." }),
  lastName: z.string().min(1, { message: "Last name is required." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  confirmPassword: z.string(),
  phoneCountryCode: z.string().min(1, { message: "Country code is required." }).regex(/^\+\d{1,3}$/, { message: "Invalid country code format (e.g. +1)" }),
  phoneNumber: z.string()
    .min(7, { message: "Phone number must be at least 7 digits." })
    .regex(/^\d+$/, { message: "Phone number must contain only digits." })
    .transform(val => parseInt(val, 10)),
  street: z.string().min(3, { message: "Street address is required (min 3 chars)." }).max(200),
  city: z.string().min(1, { message: "City is required." }).max(100),
  state: z.string().max(100).optional(),
  zip: z.string().min(3, { message: "ZIP/Postal code is required." }).max(20),
  country: z.string().min(1, { message: "Country for address is required." }).max(100),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match.",
  path: ["confirmPassword"],
});
export type SignUpFormValues = z.infer<typeof signUpSchema>;

const signInSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});
export type SignInFormValues = z.infer<typeof signInSchema>;

export function AuthForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const { t } = useTranslation();

  const signUpSchemaTranslated = z.object({
    firstName: z.string().min(1, { message: t('auth.validation.firstNameRequired') }),
    lastName: z.string().min(1, { message: t('auth.validation.lastNameRequired') }),
    email: z.string().email({ message: t('auth.validation.invalidEmail') }),
    password: z.string().min(6, { message: t('auth.validation.passwordMinLength') }),
    confirmPassword: z.string(),
    phoneCountryCode: z.string().min(1, { message: t('auth.validation.countryCodeRequired') }).regex(/^\+\d{1,3}$/, { message: t('auth.validation.invalidCountryCodeFormat') }),
    phoneNumber: z.string()
      .min(7, { message: t('auth.validation.phoneNumberMinLength') })
      .regex(/^\d+$/, { message: t('auth.validation.phoneNumberDigitsOnly') })
      .transform(val => parseInt(val, 10)),
    street: z.string().min(3, { message: t('auth.validation.streetAddressRequired') }).max(200),
    city: z.string().min(1, { message: t('auth.validation.cityRequired') }).max(100),
    state: z.string().max(100).optional(),
    zip: z.string().min(3, { message: t('auth.validation.zipPostalCodeRequired') }).max(20),
    country: z.string().min(1, { message: t('auth.validation.countryRequired') }).max(100),
  }).refine(data => data.password === data.confirmPassword, {
    message: t('auth.validation.passwordsDontMatch'),
    path: ["confirmPassword"],
  });

  const signInSchemaTranslated = z.object({
    email: z.string().email({ message: t('auth.validation.invalidEmail') }),
    password: z.string().min(1, { message: t('auth.validation.passwordRequired') }),
  });

  const signUpForm = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchemaTranslated),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      phoneCountryCode: '',
      phoneNumber: '',
      street: '',
      city: '',
      state: '',
      zip: '',
      country: '',
    },
  });

  const signInForm = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchemaTranslated),
    defaultValues: { email: '', password: '' },
  });

  const handleSignUp = async (values: SignUpFormValues) => {
    setIsSubmitting(true);
    try {
      await signUpWithEmail(values);
      toast({
        title: t('auth.toast.signUpSuccessTitle'),
        description: t('auth.toast.signUpSuccessDescription')
      });
      setTimeout(() => { // Added timeout for better UI experience
        router.push('/profile');
      }, 500);
    } catch (error) {
      const authError = error as AuthError;
      if (authError.code === 'auth/email-already-in-use') {
        toast({
          title: t('auth.toast.signUpFailedTitle'),
          description: t('auth.toast.emailAlreadyInUse'),
          variant: "destructive"
        });
      } else {
        toast({
          title: t('auth.toast.signUpFailedTitle'),
          description: authError.message || t('auth.toast.unexpectedError'),
          variant: "destructive"
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignIn = async (values: SignInFormValues) => {
    setIsSubmitting(true);
    try {
      await signInWithEmail(values);
      toast({ title: t('auth.toast.signInSuccessTitle'), description: t('auth.toast.signInSuccessDescription') });
      router.push('/');
    } catch (error) {
      const authError = error as AuthError;
      toast({ title: t('auth.toast.signInFailedTitle'), description: authError.message || t('auth.toast.invalidCredentials'), variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex justify-center items-center py-6 md:py-12 min-h-screen relative">
      <div className="absolute inset-0 -z-10">
      </div>
      <Tabs defaultValue="signin" className="w-full max-w-4xl relative z-10"> {/* Wider for signup, login will be constrained */}
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="signin">{t('auth.signInTab')}</TabsTrigger>
          <TabsTrigger value="signup">{t('auth.signUpTab')}</TabsTrigger>
        </TabsList>
        <TabsContent value="signin">
          <Card className="shadow-xl w-full max-w-md mx-auto"> {/* Constrain login card */}
            <CardHeader className="p-4">
              <CardTitle className="text-2xl md:text-3xl font-bold text-primary">{t('auth.welcomeBackTitle')}</CardTitle>
              <CardDescription className="text-sm md:text-base">{t('auth.welcomeBackDescription')}</CardDescription>
            </CardHeader>
            <form onSubmit={signInForm.handleSubmit(handleSignIn)}>
              <CardContent className="space-y-2 p-4">
                <div className="space-y-1">
                  <Label htmlFor="signin-email">{t('auth.emailLabel')}</Label>
                  <Input id="signin-email" type="email" placeholder={t('auth.emailPlaceholder')} {...signInForm.register("email")} />
                  {signInForm.formState.errors.email && <p className="text-sm text-destructive mt-0.5">{signInForm.formState.errors.email.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="signin-password">{t('auth.passwordLabel')}</Label>
                  <Input id="signin-password" type="password" placeholder={t('auth.passwordPlaceholder')} {...signInForm.register("password")} />
                  {signInForm.formState.errors.password && <p className="text-sm text-destructive mt-0.5">{signInForm.formState.errors.password.message}</p>}
                </div>
              </CardContent>
              <CardFooter className="p-4">
                <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={isSubmitting}>
                  {isSubmitting ? t('auth.signingInButton') : t('auth.signInButton')}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
        <TabsContent value="signup">
          <Card className="shadow-xl w-full"> {/* Signup card uses full width of Tabs */}
            <CardHeader className="p-4">
              <CardTitle className="text-2xl md:text-3xl font-bold text-primary">{t('auth.createAccountTitle')}</CardTitle>
              <CardDescription className="text-sm md:text-base">{t('auth.createAccountDescription')}</CardDescription>
            </CardHeader>
            <form onSubmit={signUpForm.handleSubmit(handleSignUp)}>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 p-4"> {/* Reduced gap-y */}

                <fieldset className="space-y-2 p-3 border rounded-md md:col-span-1"> {/* Reduced space-y */}
                  <legend className="text-lg font-medium text-foreground px-1">{t('auth.personalInfoLegend')}</legend>
                  <div className="space-y-0.5">
                    <Label htmlFor="firstName">{t('auth.firstNameLabel')}</Label>
                    <Input id="firstName" placeholder={t('auth.firstNamePlaceholder')} {...signUpForm.register("firstName")} />
                    {signUpForm.formState.errors.firstName && <p className="text-sm text-destructive mt-0.5">{signUpForm.formState.errors.firstName.message}</p>}
                  </div>
                  <div className="space-y-0.5">
                    <Label htmlFor="lastName">{t('auth.lastNameLabel')}</Label>
                    <Input id="lastName" placeholder={t('auth.lastNamePlaceholder')} {...signUpForm.register("lastName")} />
                    {signUpForm.formState.errors.lastName && <p className="text-sm text-destructive mt-0.5">{signUpForm.formState.errors.lastName.message}</p>}
                  </div>
                </fieldset>

                <fieldset className="space-y-2 p-3 border rounded-md md:col-span-1"> {/* Reduced space-y */}
                  <legend className="text-lg font-medium text-foreground px-1">{t('auth.contactInfoLegend')}</legend>
                  <div className="space-y-0.5">
                    <Label htmlFor="signup-email">{t('auth.emailLabel')}</Label>
                    <Input id="signup-email" type="email" placeholder={t('auth.emailPlaceholder')} {...signUpForm.register("email")} />
                    {signUpForm.formState.errors.email && <p className="text-sm text-destructive mt-0.5">{signUpForm.formState.errors.email.message}</p>}
                  </div>
                  <div className="grid grid-cols-3 gap-x-2 gap-y-0.5 items-start"> {/* Reduced gap-x */}
                    <div className="space-y-0.5 col-span-1">
                      <Label htmlFor="phoneCountryCode">{t('auth.countryCodeLabel')}</Label>
                      <Controller
                        name="phoneCountryCode"
                        control={signUpForm.control}
                        render={({ field }) => (
                          <CountryCodeSelect
                            value={field.value}
                            onValueChange={field.onChange}
                            disabled={isSubmitting}
                          />
                        )}
                      />
                      {signUpForm.formState.errors.phoneCountryCode && <p className="text-sm text-destructive mt-0.5">{signUpForm.formState.errors.phoneCountryCode.message}</p>}
                    </div>
                    <div className="space-y-0.5 col-span-2">
                      <Label htmlFor="phoneNumber">{t('auth.phoneNumberLabel')}</Label>
                      <Input id="phoneNumber" type="tel" placeholder={t('auth.phoneNumberPlaceholder')} {...signUpForm.register("phoneNumber")} />
                      {signUpForm.formState.errors.phoneNumber && <p className="text-sm text-destructive mt-0.5">{signUpForm.formState.errors.phoneNumber.message}</p>}
                    </div>
                  </div>
                </fieldset>

                <fieldset className="space-y-2 p-3 border rounded-md md:col-span-2"> {/* Reduced space-y */}
                  <legend className="text-lg font-medium text-foreground px-1">{t('auth.defaultShippingAddressLegend')}</legend>
                  <div className="space-y-0.5">
                    <Label htmlFor="street">{t('auth.streetAddressLabel')}</Label>
                    <Input id="street" placeholder={t('auth.streetAddressPlaceholder')} {...signUpForm.register("street")} />
                    {signUpForm.formState.errors.street && <p className="text-sm text-destructive mt-0.5">{signUpForm.formState.errors.street.message}</p>}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2"> {/* Reduced gap */}
                    <div className="space-y-0.5">
                      <Label htmlFor="city">{t('auth.cityLabel')}</Label>
                      <Input id="city" placeholder={t('auth.cityPlaceholder')} {...signUpForm.register("city")} />
                      {signUpForm.formState.errors.city && <p className="text-sm text-destructive mt-0.5">{signUpForm.formState.errors.city.message}</p>}
                    </div>
                    <div className="space-y-0.5">
                      <Label htmlFor="state">{t('auth.stateProvinceLabel')}</Label>
                      <Input id="state" placeholder={t('auth.stateProvincePlaceholder')} {...signUpForm.register("state")} />
                      {signUpForm.formState.errors.state && <p className="text-sm text-destructive mt-0.5">{signUpForm.formState.errors.state.message}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2"> {/* Reduced gap */}
                    <div className="space-y-0.5">
                      <Label htmlFor="zip">{t('auth.zipPostalCodeLabel')}</Label>
                      <Input id="zip" placeholder={t('auth.zipPostalCodePlaceholder')} {...signUpForm.register("zip")} />
                      {signUpForm.formState.errors.zip && <p className="text-sm text-destructive mt-0.5">{signUpForm.formState.errors.zip.message}</p>}
                    </div>
                    <div className="space-y-0.5">
                      <Label htmlFor="country">{t('auth.countryLabel')}</Label>
                      <Input id="country" placeholder={t('auth.countryPlaceholder')} {...signUpForm.register("country")} />
                      {signUpForm.formState.errors.country && <p className="text-sm text-destructive mt-0.5">{signUpForm.formState.errors.country.message}</p>}
                    </div>
                  </div>
                </fieldset>

                <fieldset className="space-y-2 p-3 border rounded-md md:col-span-2"> {/* Reduced space-y */}
                  <legend className="text-lg font-medium text-foreground px-1">{t('auth.passwordLegend')}</legend>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2"> {/* Reduced gap */}
                    <div className="space-y-0.5">
                      <Label htmlFor="signup-password">{t('auth.passwordLabel')}</Label>
                      <Input id="signup-password" type="password" placeholder={t('auth.passwordPlaceholder')} {...signUpForm.register("password")} />
                      {signUpForm.formState.errors.password && <p className="text-sm text-destructive mt-0.5">{signUpForm.formState.errors.password.message}</p>}
                    </div>
                    <div className="space-y-0.5">
                      <Label htmlFor="confirmPassword">{t('auth.confirmPasswordLabel')}</Label>
                      <Input id="confirmPassword" type="password" placeholder={t('auth.passwordPlaceholder')} {...signUpForm.register("confirmPassword")} />
                      {signUpForm.formState.errors.confirmPassword && <p className="text-sm text-destructive mt-0.5">{signUpForm.formState.errors.confirmPassword.message}</p>}
                    </div>
                  </div>
                </fieldset>

              </CardContent>
              <CardFooter className="p-4">
                <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={isSubmitting}>
                  {isSubmitting ? t('auth.creatingAccountButton') : t('auth.createAccountButton')}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
