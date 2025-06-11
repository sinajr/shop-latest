import Image from 'next/image';
import { useTranslation } from 'react-i18next';

export function AdvisorHeroImage() {
    const { t } = useTranslation();

    return (
        <div className="relative w-full h-48 sm:h-64 md:h-80 lg:h-96 overflow-hidden rounded-lg shadow-lg mb-8">
            <Image
                src="/site-assets/images/luxe-advisor.png" // Corrected path
                alt={t('advisor.heroImageAlt')}
                fill
                style={{ objectFit: 'cover', objectPosition: 'center' }}
                priority // Prioritize loading for LCP
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
            <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                <h1 className="text-white text-3xl md:text-5xl font-bold text-center drop-shadow-2xl">
                    {t('advisor.heroTitle')}
                </h1>
            </div>
        </div>
    );
} 