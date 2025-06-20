import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

const ADMIN_TELEGRAM_ID = '5900684159';

// Store user states
const userStates: { [key: string]: any } = {};

const REPLY_KEYBOARD = {
    keyboard: [
        ['⬅️ Previous', '➡️ Next'],
        ['✅ Skip', '❌ Cancel']
    ],
    resize_keyboard: true,
    one_time_keyboard: false
};

const NEW_PRODUCT_KEYBOARD = {
    keyboard: [
        ['➕ New Product']
    ],
    resize_keyboard: true,
    one_time_keyboard: false
};

const EDIT_FIELDS_KEYBOARD = {
    keyboard: [
        ['Name', 'Brand', 'Description'],
        ['Base Price', 'Category', 'Tags'],
        ['Variants'],
        ['⬅️ Back', '❌ Cancel']
    ],
    resize_keyboard: true,
    one_time_keyboard: false
};

async function sendTelegramMessage(chatId: string, text: string, keyboard = REPLY_KEYBOARD) {
    try {
        const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: 'HTML',
                reply_markup: keyboard
            }),
        });
        return await response.json();
    } catch (error) {
        console.error('Error sending Telegram message:', error);
        return null;
    }
}

async function handleProductCreation(chatId: string, data: any) {
    try {
        console.log('handleProductCreation called with data:', JSON.stringify(data, null, 2));
        const db = getAdminDb();
        // Prepare product data without an id field
        const productData = {
            name: data.name,
            brand: data.brand,
            description: data.description,
            basePrice: data.basePrice ? parseFloat(data.basePrice) : '',
            categoryId: data.categoryId,
            createdAt: new Date().toISOString(),
            tags: data.tags ? data.tags : [],
            variants: data.variants || []
        };

        // Add product, let Firestore generate the ID
        const docRef = await db.collection('products').add(productData);
        const productId = docRef.id;
        // Update the product with its own ID field
        await docRef.update({ id: productId });
        console.log('Product created successfully with ID:', productId);

        // Build stock info for all variants
        let stockInfo = '';
        if (productData.variants && productData.variants.length) {
            stockInfo = productData.variants
                .map((v: any, i: number) => `Variant ${i + 1} stock: ${v.stock}`)
                .join('\n');
        } else {
            stockInfo = 'No variants/stock info available.';
        }

        await sendTelegramMessage(
            chatId,
            `✅ Product created and published successfully!\nProduct ID: <code>${productId}</code>\n${stockInfo}`,
            NEW_PRODUCT_KEYBOARD
        );
        delete userStates[chatId];
    } catch (error) {
        console.error('Error creating product:', error);
        await sendTelegramMessage(chatId, '❌ Error creating product. Please try again.', NEW_PRODUCT_KEYBOARD);
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { message } = body;

        if (!message) {
            return NextResponse.json({ error: 'No message received' }, { status: 400 });
        }

        const chatId = message.chat.id.toString();
        const text = message.text || '';
        const photo = message.photo;
        const video = message.video;

        // Debug log for incoming text
        console.log('Received text:', text);

        // Restrict access to admin only
        if (chatId !== ADMIN_TELEGRAM_ID) {
            await sendTelegramMessage(chatId, '❌ You are not authorized to use this bot.', REPLY_KEYBOARD);
            return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 403 });
        }

        // Cancel process
        if (text === '/cancel' || text === '❌ Cancel') {
            delete userStates[chatId];
            await sendTelegramMessage(chatId, '🚫 Product creation cancelled.', NEW_PRODUCT_KEYBOARD);
            return NextResponse.json({ ok: true });
        }

        // Only initialize userStates[chatId] if it does not exist
        if (!userStates[chatId]) {
            userStates[chatId] = {
                step: 'start',
                data: {
                    name: '',
                    brand: '',
                    description: '',
                    basePrice: '',
                    categoryId: '',
                    tags: [],
                    variants: [],
                },
                currentVariant: null,
                variantStep: null,
                history: [],
                editing: false,
                processing: false,
            };
        }
        const state = userStates[chatId];

        // Prevent double-processing
        if (state.processing) {
            await sendTelegramMessage(chatId, '⏳ Please wait for the previous step to finish.');
            return NextResponse.json({ ok: false, error: 'Still processing previous input.' });
        }
        state.processing = true;

        // Handle new product button
        if (text === '➕ New Product') {
            userStates[chatId] = {
                step: 'name',
                data: {
                    name: '',
                    brand: '',
                    description: '',
                    basePrice: '',
                    categoryId: '',
                    tags: [],
                    variants: [],
                },
                currentVariant: null,
                variantStep: null,
                history: [],
                editing: false,
            };
            await sendTelegramMessage(chatId, '👋 Starting a new product! Please enter the product name (or tap ✅ Skip):', REPLY_KEYBOARD);
            return NextResponse.json({ ok: true });
        }

        // Handle photos
        if (photo) {
            const fileId = photo[photo.length - 1].file_id;
            if (!state.data.images) state.data.images = [];
            state.data.images.push(fileId);
            await sendTelegramMessage(chatId, '📸 Image received! Send more images or type /next to continue.');
            return NextResponse.json({ ok: true });
        }

        // Handle videos
        if (video) {
            const fileId = video.file_id;
            if (!state.data.videos) state.data.videos = [];
            state.data.videos.push(fileId);
            await sendTelegramMessage(chatId, '🎥 Video received! Send more videos or type /next to continue.');
            return NextResponse.json({ ok: true });
        }

        // Product creation steps
        const steps = [
            'name',
            'brand',
            'description',
            'basePrice',
            'categoryId',
            'tags',
            'variant_start',
        ];

        // Helper to move to next/previous step
        function nextStep(current: any) {
            const idx = steps.indexOf(current);
            return steps[idx + 1] || null;
        }
        function prevStep(current: any) {
            const idx = steps.indexOf(current);
            return steps[idx - 1] || steps[0];
        }

        // Handle /start
        if (text === '/start') {
            state.step = 'name';
            state.history = [];
            await sendTelegramMessage(chatId, '👋 Welcome, Admin! Let\'s create a new product.\n\nPlease enter the product name (or tap ✅ Skip):');
            return NextResponse.json({ ok: true });
        }

        // Handle Skip
        if (text === '/skip' || text === '✅ Skip') {
            state.history.push(state.step);
            if (state.step === 'tags') {
                state.data.tags = [];
            } else if (state.step === 'basePrice') {
                state.data.basePrice = '';
            } else if (state.step === 'variant_start') {
                // Skip variant entry, show overview
                await sendProductOverview(chatId, state.data);
                state.processing = false;
                return NextResponse.json({ ok: true });
            } else {
                state.data[state.step] = '';
            }
            state.step = nextStep(state.step);
            await askCurrentStep(chatId, state);
            state.processing = false;
            return NextResponse.json({ ok: true });
        }
        // Handle Previous
        else if (text === '⬅️ Previous') {
            state.step = prevStep(state.step);
            await askCurrentStep(chatId, state);
            state.processing = false;
            return NextResponse.json({ ok: true });
        }
        // Handle Next
        else if (text === '➡️ Next') {
            state.history.push(state.step);
            state.step = nextStep(state.step);
            await askCurrentStep(chatId, state);
            state.processing = false;
            return NextResponse.json({ ok: true });
        }
        // Handle normal input
        else {
            switch (state.step) {
                case 'name':
                    state.data.name = text;
                    state.step = 'brand';
                    await sendTelegramMessage(chatId, 'Enter the brand (or tap ✅ Skip):');
                    state.processing = false;
                    break;
                case 'brand':
                    state.data.brand = text;
                    state.step = 'description';
                    await sendTelegramMessage(chatId, 'Enter the description (or tap ✅ Skip):');
                    state.processing = false;
                    break;
                case 'description':
                    state.data.description = text;
                    state.step = 'basePrice';
                    await sendTelegramMessage(chatId, 'Enter the base price (number, or tap ✅ Skip):');
                    state.processing = false;
                    break;
                case 'basePrice':
                    if (isNaN(parseFloat(text))) {
                        await sendTelegramMessage(chatId, '❌ Please enter a valid number for the base price or tap ✅ Skip.');
                        state.processing = false;
                        return NextResponse.json({ ok: true });
                    }
                    state.data.basePrice = parseFloat(text);
                    state.step = 'categoryId';
                    await sendTelegramMessage(chatId, 'Enter the category (or tap ✅ Skip):');
                    state.processing = false;
                    break;
                case 'categoryId':
                    state.data.categoryId = text;
                    state.step = 'tags';
                    await sendTelegramMessage(chatId, 'Enter tags (comma-separated, or tap ✅ Skip):');
                    state.processing = false;
                    break;
                case 'tags':
                    state.data.tags = text.split(',').map((tag: any) => tag.trim()).filter((tag: string) => !!tag);
                    state.step = 'variant_start';
                    await sendTelegramMessage(chatId, 'Let\'s add a variant. Enter variant color name (or tap ✅ Skip to finish):');
                    state.currentVariant = { color: {}, imageUrls: [], videoUrls: [] };
                    state.variantStep = 'colorName';
                    state.processing = false;
                    return NextResponse.json({ ok: true });
            }
        }

        // Handle variant entry
        if (state.step === 'variant_start') {
            const v = state.currentVariant || { color: {}, imageUrls: [], videoUrls: [] };
            switch (state.variantStep) {
                case 'colorName':
                    if (text !== '/skip' && text !== '✅ Skip') v.color.name = text;
                    state.variantStep = 'colorHex';
                    await sendTelegramMessage(chatId, 'Enter variant color hex (e.g. #FFFFFF, or tap ✅ Skip):');
                    break;
                case 'colorHex':
                    if (text !== '/skip' && text !== '✅ Skip') v.color.hex = text;
                    // Generate variant ID automatically
                    v.id = `variant_${(v.color.name || 'default').toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
                    state.variantStep = 'variantPrice';
                    await sendTelegramMessage(chatId, 'Enter variant price (number, or tap ✅ Skip):');
                    break;
                case 'variantPrice':
                    if (text !== '/skip' && text !== '✅ Skip' && !isNaN(parseFloat(text))) v.price = parseFloat(text);
                    state.variantStep = 'variantStock';
                    await sendTelegramMessage(chatId, 'Enter variant stock (number, or tap ✅ Skip):');
                    break;
                case 'variantStock':
                    if (text !== '/skip' && text !== '✅ Skip' && !isNaN(parseInt(text))) v.stock = parseInt(text);
                    state.variantStep = 'variantImageUrls';
                    await sendTelegramMessage(chatId, 'Enter image URLs (comma-separated, or tap ✅ Skip):');
                    break;
                case 'variantImageUrls':
                    if (text !== '/skip' && text !== '✅ Skip') {
                        v.imageUrls = text.split(',').map((url: any) => url.trim()).filter((url: string) => !!url);
                    }
                    state.variantStep = 'variantVideoUrls';
                    await sendTelegramMessage(chatId, 'Enter video URLs (comma-separated, or tap ✅ Skip):');
                    break;
                case 'variantVideoUrls':
                    if (text !== '/skip' && text !== '✅ Skip') {
                        v.videoUrls = text.split(',').map((url: any) => url.trim()).filter((url: string) => !!url);
                    }
                    // Save this variant
                    state.data.variants.push({ ...v });
                    // Ask if want to add another
                    state.variantStep = 'addAnother';
                    await sendTelegramMessage(chatId, 'Do you want to add another variant? (yes/no)');
                    break;
                case 'addAnother':
                    if (text.toLowerCase() === 'yes') {
                        state.currentVariant = { color: {}, imageUrls: [], videoUrls: [] };
                        state.variantStep = 'colorName';
                        await sendTelegramMessage(chatId, 'Enter variant color name (or tap ✅ Skip to finish):');
                    } else {
                        // Finish product creation, show overview
                        await sendProductOverview(chatId, state.data);
                        delete state.currentVariant;
                        delete state.variantStep;
                    }
                    break;
            }
            return NextResponse.json({ ok: true });
        }

        // Handle Publish, Edit, and Cancel actions after product overview
        if (text === '✅ Publish') {
            console.log('Publish button pressed');
            console.log('Publishing product with data:', JSON.stringify(state.data, null, 2));
            await handleProductCreation(chatId, state.data);
            delete userStates[chatId];
            return NextResponse.json({ ok: true });
        }
        if (text === '✏️ Edit') {
            console.log('Edit button pressed');
            await sendTelegramMessage(chatId, 'Which field do you want to edit?', EDIT_FIELDS_KEYBOARD);
            state.editing = true;
            return NextResponse.json({ ok: true });
        }
        if (text === '❌ Cancel') {
            console.log('Cancel button pressed');
            delete userStates[chatId];
            await sendTelegramMessage(chatId, '🚫 Product creation cancelled.', NEW_PRODUCT_KEYBOARD);
            return NextResponse.json({ ok: true });
        }

        // Handle edit field selection
        if (state.editing) {
            switch (text) {
                case 'Name':
                    state.step = 'name';
                    state.editing = false;
                    await sendTelegramMessage(chatId, 'Edit product name:', REPLY_KEYBOARD);
                    return NextResponse.json({ ok: true });
                case 'Brand':
                    state.step = 'brand';
                    state.editing = false;
                    await sendTelegramMessage(chatId, 'Edit brand:', REPLY_KEYBOARD);
                    return NextResponse.json({ ok: true });
                case 'Description':
                    state.step = 'description';
                    state.editing = false;
                    await sendTelegramMessage(chatId, 'Edit description:', REPLY_KEYBOARD);
                    return NextResponse.json({ ok: true });
                case 'Base Price':
                    state.step = 'basePrice';
                    state.editing = false;
                    await sendTelegramMessage(chatId, 'Edit base price:', REPLY_KEYBOARD);
                    return NextResponse.json({ ok: true });
                case 'Category':
                    state.step = 'categoryId';
                    state.editing = false;
                    await sendTelegramMessage(chatId, 'Edit category:', REPLY_KEYBOARD);
                    return NextResponse.json({ ok: true });
                case 'Tags':
                    state.step = 'tags';
                    state.editing = false;
                    await sendTelegramMessage(chatId, 'Edit tags (comma-separated):', REPLY_KEYBOARD);
                    return NextResponse.json({ ok: true });
                case 'Variants':
                    // For now, just restart variant entry
                    state.step = 'variant_start';
                    state.editing = false;
                    await sendTelegramMessage(chatId, 'Let\'s edit variants. Enter variant color name (or tap ✅ Skip to finish):', REPLY_KEYBOARD);
                    state.currentVariant = { color: {}, imageUrls: [], videoUrls: [] };
                    state.variantStep = 'colorName';
                    return NextResponse.json({ ok: true });
                case '⬅️ Back':
                    state.editing = false;
                    await sendProductOverview(chatId, state.data);
                    return NextResponse.json({ ok: true });
                case '❌ Cancel':
                    delete userStates[chatId];
                    await sendTelegramMessage(chatId, '🚫 Product creation cancelled.', NEW_PRODUCT_KEYBOARD);
                    return NextResponse.json({ ok: true });
            }
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('Error in POST handler:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// Helper to ask the current step
async function askCurrentStep(chatId: any, state: any) {
    switch (state.step) {
        case 'name':
            await sendTelegramMessage(chatId, 'Please enter the product name (or tap ✅ Skip):');
            break;
        case 'brand':
            await sendTelegramMessage(chatId, 'Enter the brand (or tap ✅ Skip):');
            break;
        case 'description':
            await sendTelegramMessage(chatId, 'Enter the description (or tap ✅ Skip):');
            break;
        case 'basePrice':
            await sendTelegramMessage(chatId, 'Enter the base price (number, or tap ✅ Skip):');
            break;
        case 'categoryId':
            await sendTelegramMessage(chatId, 'Enter the category (or tap ✅ Skip):');
            break;
        case 'tags':
            await sendTelegramMessage(chatId, 'Enter tags (comma-separated, or tap ✅ Skip):');
            break;
        case 'variant_start':
            await sendTelegramMessage(chatId, 'Let\'s add a variant. Enter variant color name (or tap ✅ Skip to finish):');
            break;
    }
}

// Helper to send product overview and ask for confirmation
async function sendProductOverview(chatId: any, data: any) {
    let overview = `<b>Product Overview</b>\n`;
    overview += `Name: ${data.name || '-'}\n`;
    overview += `Brand: ${data.brand || '-'}\n`;
    overview += `Description: ${data.description || '-'}\n`;
    overview += `Base Price: ${data.basePrice || '-'}\n`;
    overview += `Category: ${data.categoryId || '-'}\n`;
    overview += `Tags: ${(data.tags && data.tags.length) ? data.tags.join(', ') : '-'}\n`;
    overview += `Variants:`;
    if (data.variants && data.variants.length) {
        data.variants.forEach((v: any, i: number) => {
            overview += `\n  ${i + 1}. Color: ${v.color.name || '-'} (${v.color.hex || '-'}) | Price: ${v.price || '-'} | Stock: ${v.stock || '-'}\n`;
            overview += `    Images:`;
            if (v.imageUrls && v.imageUrls.length) {
                v.imageUrls.forEach((url: string, idx: number) => {
                    overview += `\n      [${idx + 1}] ${url}`;
                });
            } else {
                overview += ' -';
            }
            overview += `\n    Videos:`;
            if (v.videoUrls && v.videoUrls.length) {
                v.videoUrls.forEach((url: string, idx: number) => {
                    overview += `\n      [${idx + 1}] ${url}`;
                });
            } else {
                overview += ' -';
            }
        });
    } else {
        overview += ' -';
    }
    const confirmKeyboard = {
        keyboard: [
            ['✅ Publish', '✏️ Edit', '❌ Cancel']
        ],
        resize_keyboard: true,
        one_time_keyboard: false
    };
    await sendTelegramMessage(chatId, overview, confirmKeyboard);
}
