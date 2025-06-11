import { Product } from '@/types';
import { User } from 'firebase/auth';

const TELEGRAM_BOT_TOKEN = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;
export const ADMIN_CHAT_ID = '5900684159'; // Ensure this is your numerical chat ID, not a phone number

export async function sendTelegramNotification(message: string): Promise<boolean> {
    if (!TELEGRAM_BOT_TOKEN) {
        console.error('Telegram bot token not configured');
        return false;
    }

    try {
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: ADMIN_CHAT_ID,
                text: message,
                parse_mode: 'HTML',
            }),
        });

        if (!response.ok) {
            throw new Error(`Telegram API error: ${response.statusText}`);
        }

        return true;
    } catch (error) {
        console.error('Error sending Telegram notification:', error);
        return false;
    }
}

export async function sendTelegramPhoto(
    chatId: string,
    photoFile: File,
    caption: string
): Promise<boolean> {
    if (!TELEGRAM_BOT_TOKEN) {
        console.error('Telegram bot token not configured');
        return false;
    }

    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('photo', photoFile);
    formData.append('caption', caption);
    formData.append('parse_mode', 'HTML');

    try {
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`Telegram API error: ${response.statusText}`);
        }

        return true;
    } catch (error) {
        console.error('Error sending Telegram photo:', error);
        return false;
    }
}

export function formatProductRequestMessage(
    customerMessage: string,
    user: User,
    userData: any,
    similarProducts: Product[] = [],
    imageUrl: string | null = null,
    language: string = 'en'
): string {
    const translations: { [key: string]: { [lang: string]: string } } = {
        newProductRequest: {
            en: '<b>🔔 New Product Request</b>\n\n',
            ru: '<b>🔔 Новый запрос на товар</b>\n\n',
        },
        customerInformation: {
            en: '<b>Customer Information:</b>\n',
            ru: '<b>Информация о клиенте:</b>\n',
        },
        name: {
            en: 'Name: ',
            ru: 'Имя: ',
        },
        email: {
            en: 'Email: ',
            ru: 'Электронная почта: ',
        },
        phone: {
            en: 'Phone: ',
            ru: 'Телефон: ',
        },
        userId: {
            en: 'User ID: ',
            ru: 'ID пользователя: ',
        },
        notProvided: {
            en: 'Not provided',
            ru: 'Не указано',
        },
        customerRequest: {
            en: '<b>Customer Request:</b>\n',
            ru: '<b>Запрос клиента:</b>\n',
        },
        similarProductsAvailable: {
            en: '<b>Similar Products Available:</b>\n',
            ru: '<b>Доступные похожие товары:</b>\n',
        },
        shippingAddress: {
            en: '<b>Shipping Address:</b>\n',
            ru: '<b>Адрес доставки:</b>\n',
        },
        street: {
            en: 'Street: ',
            ru: 'Улица: ',
        },
        city: {
            en: 'City: ',
            ru: 'Город: ',
        },
        stateProvince: {
            en: 'State/Province: ',
            ru: 'Область/Провинция: ',
        },
        zipPostalCode: {
            en: 'Zip/Postal Code: ',
            ru: 'Почтовый индекс: ',
        },
        country: {
            en: 'Country: ',
            ru: 'Страна: ',
        },
    };

    const getTranslation = (key: string) => {
        return translations[key]?.[language] || translations[key]?.['en'] || '';
    };

    let message = getTranslation('newProductRequest');

    // Add customer information
    message += getTranslation('customerInformation');
    message += `${getTranslation('name')}${user.displayName || userData?.firstName || userData?.lastName ? `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim() : getTranslation('notProvided')}\n`;
    message += `${getTranslation('email')}${user.email || getTranslation('notProvided')}\n`;
    if (userData?.countryCode && userData?.phoneNumber) {
        message += `${getTranslation('phone')}${userData.countryCode}${userData.phoneNumber}\n`;
    } else if (userData?.phoneNumber) {
        message += `${getTranslation('phone')}${userData.phoneNumber}\n`;
    }
    message += `${getTranslation('userId')}${user.uid}\n\n`;

    // Add shipping address if available
    if (userData?.shippingAddresses && userData.shippingAddresses.length > 0) {
        const defaultShippingAddress = userData.shippingAddresses[0]; // Assuming the first address is the primary/default one
        message += `${getTranslation('shippingAddress')}\n`;
        if (defaultShippingAddress.street) message += `  ${getTranslation('street')}: ${defaultShippingAddress.street}\n`;
        if (defaultShippingAddress.city) message += `  ${getTranslation('city')}: ${defaultShippingAddress.city}\n`;
        if (defaultShippingAddress.state) message += `  ${getTranslation('stateProvince')}: ${defaultShippingAddress.state}\n`; // Note: changed from stateProvince to state based on Address interface
        if (defaultShippingAddress.zip) message += `  ${getTranslation('zipPostalCode')}: ${defaultShippingAddress.zip}\n`; // Note: changed from zipPostalCode to zip
        if (defaultShippingAddress.country) message += `  ${getTranslation('country')}: ${defaultShippingAddress.country}\n`;
        message += '\n';
    }

    // Add the request
    message += `${getTranslation('customerRequest')}${customerMessage}\n\n`;

    if (imageUrl) {
        message += `<b>Attached Image:</b>\n${imageUrl}\n\n`;
    }

    if (similarProducts.length > 0) {
        message += getTranslation('similarProductsAvailable');
        similarProducts.forEach((product, index) => {
            message += `${index + 1}. ${product.name}`;
            if (product.brand) message += ` (${product.brand})`;
            if (typeof product.basePrice === 'number') {
                message += ` - $${product.basePrice.toFixed(2)}`;
            }
            message += '\n';
        });
    }

    return message;
} 