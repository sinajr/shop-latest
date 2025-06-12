"use client";

export const dynamic = "force-dynamic";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function NotFound() {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] py-12 text-center">
            <AlertTriangle className="h-16 w-16 text-destructive mb-6" />
            <h1 className="text-3xl font-bold text-destructive mb-4">404  -  Page Not Found</h1>
            <p className="text-muted-foreground mb-8 max-w-md">
                Sorry, we couldn't find the page you're looking for. It might have been moved or doesn't exist.
            </p>
            <Button asChild size="lg">
                <Link href="/">
                    <Home className="mr-2 h-5 w-5" />
                    Back to Home
                </Link>
            </Button>
        </div>
    );
} 