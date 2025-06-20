// Full Telegram bot with variant handling, editable fields, and per-field edit
import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const ADMIN_TELEGRAM_IDS = (process.env.ADMIN_TELEGRAM_IDS || '5900684159')
    .split(',')
    .map(id => id.trim());

interface ProductState {
    step: string;
    data: {
        name: string;
        brand: string;
        description: string;
        basePrice: number | '';
        categoryId: string;
        tags: string[];
        variants: any[];
    };
    processing: boolean;
    // for variant-subflow:
    variantStep?: string;
    variant?: any;
    // for per-field editing:
    editing?: boolean;
}

const userStates: Record<string, ProductState> = {};

const KEYBOARDS = {
    REPLY: { keyboard: [['⬅️ Previous', '➡️ Next'], ['✅ Skip', '❌ Cancel']], resize_keyboard: true },
    NEW: { keyboard: [['➕ New Product']], resize_keyboard: true },
    EDIT_FIELDS: {
        keyboard: [
            ['Name', 'Brand', 'Description'],
            ['Base Price', 'Category', 'Tags'],
            ['Variants'],
            ['⬅️ Back', '❌ Cancel'],
        ],
        resize_keyboard: true
    },
    VARIANTS_OVERVIEW: {
        keyboard: [
            ['➕ Add Variant', '✏️ Edit'],
            ['✅ Publish', '❌ Cancel'],
        ],
        resize_keyboard: true
    }
};

async function sendTelegramMessage(chatId: string, text: string, keyboard = KEYBOARDS.REPLY) {
    await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', reply_markup: keyboard })
    });
}

function resetUserState(chatId: string) {
    delete userStates[chatId];
}

function formatProductOverview(data: ProductState['data']) {
    let txt = '<b>🧾 Product Overview</b>\n';
    txt += `<b>Name:</b> ${data.name || '-'}\n`;
    txt += `<b>Brand:</b> ${data.brand || '-'}\n`;
    txt += `<b>Description:</b> ${data.description || '-'}\n`;
    txt += `<b>Base Price:</b> ${data.basePrice || '-'}\n`;
    txt += `<b>Category:</b> ${data.categoryId || '-'}\n`;
    txt += `<b>Tags:</b> ${data.tags.join(', ') || '-'}\n\n`;

    if (data.variants.length) {
        txt += '<b>Variants:</b>\n';
        data.variants.forEach((v, i) => {
            txt += `#${i + 1} – Color: ${v.color.name} (${v.color.hex})\n`;
            txt += `    Price: ${v.price} | Stock: ${v.stock}\n`;
            txt += `    Images: ${v.imageUrls.length} | Videos: ${v.videoUrls.length}\n\n`;
        });
    } else {
        txt += '<b>Variants:</b> None\n';
    }

    return txt;
}

async function handleProductCreation(chatId: string, data: ProductState['data']) {
    const db = getAdminDb();
    const payload = {
        ...data,
        basePrice: Number(data.basePrice) || 0,
        createdAt: new Date().toISOString()
    };
    try {
        const docRef = await db.collection('products').add(payload);
        await docRef.update({ id: docRef.id });
        await sendTelegramMessage(
            chatId,
            `✅ Product created and published!\nID: <code>${docRef.id}</code>`,
            KEYBOARDS.NEW
        );
        resetUserState(chatId);
    } catch (e) {
        console.error(e);
        await sendTelegramMessage(chatId, '❌ Error creating product.', KEYBOARDS.NEW);
    }
}

async function handleVariantStep(chatId: string, text: string, state: ProductState) {
    const sub = state.variantStep!;
    state.variant ??= {};

    switch (sub) {
        case 'colorName':
            state.variant.color = { name: text };
            state.variantStep = 'colorHex';
            return sendTelegramMessage(chatId, '🎨 Enter color HEX (e.g. #6e371b):');

        case 'colorHex':
            state.variant.color.hex = text;
            state.variantStep = 'colorId';
            return sendTelegramMessage(chatId, '🆔 Enter color ID (e.g. variant_rose_gold_1):');

        case 'colorId':
            state.variant.color.id = text;
            state.variantStep = 'price';
            return sendTelegramMessage(chatId, '💰 Enter variant price:');

        case 'price':
            state.variant.price = parseFloat(text);
            state.variantStep = 'stock';
            return sendTelegramMessage(chatId, '📦 Enter stock qty:');

        case 'stock':
            state.variant.stock = parseInt(text);
            state.variantStep = 'images';
            return sendTelegramMessage(chatId, '🖼️ Enter image URLs (comma-sep):');

        case 'images':
            state.variant.imageUrls = text.split(',').map(u => u.trim());
            state.variantStep = 'videos';
            return sendTelegramMessage(chatId, '🎥 Enter video URLs (comma-sep) or "none":');

        case 'videos':
            state.variant.videoUrls =
                text.toLowerCase() === 'none'
                    ? []
                    : text.split(',').map(u => u.trim());

            // push it
            state.data.variants.push(state.variant);
            delete state.variant;
            delete state.variantStep;

            // back to overview
            return sendTelegramMessage(
                chatId,
                `✅ Variant added!\n\n${formatProductOverview(state.data)}`,
                KEYBOARDS.VARIANTS_OVERVIEW
            );
    }
}

export async function POST(req: Request) {
    const body = await req.json();
    const msg = body.message;
    if (!msg) return NextResponse.json({ ok: false });

    const chatId = String(msg.chat.id);
    const text = msg.text?.trim() || '';

    // auth
    if (!ADMIN_TELEGRAM_IDS.includes(chatId)) {
        console.warn('Unauthorized:', chatId);
        return NextResponse.json({ ok: true });
    }

    // init
    if (!userStates[chatId]) {
        userStates[chatId] = {
            step: 'start',
            data: { name: '', brand: '', description: '', basePrice: '', categoryId: '', tags: [], variants: [] },
            processing: false
        } as ProductState;
    }
    const state = userStates[chatId];
    if (state.processing) {
        await sendTelegramMessage(chatId, '⏳ Please wait…');
        return NextResponse.json({ ok: true });
    }
    state.processing = true;

    // start / cancel
    if (['/start', '➕ New Product'].includes(text)) {
        userStates[chatId] = {
            step: 'name',
            data: { name: '', brand: '', description: '', basePrice: '', categoryId: '', tags: [], variants: [] },
            processing: false
        } as ProductState;
        await sendTelegramMessage(chatId, '👋 Starting a new product. Enter product name:');
        return NextResponse.json({ ok: true });
    }
    if (text === '❌ Cancel') {
        resetUserState(chatId);
        await sendTelegramMessage(chatId, '🚫 Cancelled. Type /start or ➕ New Product to begin.', KEYBOARDS.NEW);
        return NextResponse.json({ ok: true });
    }

    // variant sub-flow
    if (state.variantStep) {
        await handleVariantStep(chatId, text, state);
        state.processing = false;
        return NextResponse.json({ ok: true });
    }

    // main flow
    switch (state.step) {
        // ——— create or edit Name ———
        case 'name':
            if (state.editing) {
                state.data.name = text;
                state.editing = false;
                state.step = 'variants';
                await sendTelegramMessage(
                    chatId,
                    `✅ Name updated.\n\n${formatProductOverview(state.data)}`,
                    KEYBOARDS.VARIANTS_OVERVIEW
                );
            } else {
                state.data.name = text;
                state.step = 'brand';
                await sendTelegramMessage(chatId, '🏷️ Enter brand name:');
            }
            break;

        // ——— create or edit Brand ———
        case 'brand':
            if (state.editing) {
                state.data.brand = text;
                state.editing = false;
                state.step = 'variants';
                await sendTelegramMessage(
                    chatId,
                    `✅ Brand updated.\n\n${formatProductOverview(state.data)}`,
                    KEYBOARDS.VARIANTS_OVERVIEW
                );
            } else {
                state.data.brand = text;
                state.step = 'description';
                await sendTelegramMessage(chatId, '📝 Enter product description:');
            }
            break;

        // ——— create or edit Description ———
        case 'description':
            if (state.editing) {
                state.data.description = text;
                state.editing = false;
                state.step = 'variants';
                await sendTelegramMessage(
                    chatId,
                    `✅ Description updated.\n\n${formatProductOverview(state.data)}`,
                    KEYBOARDS.VARIANTS_OVERVIEW
                );
            } else {
                state.data.description = text;
                state.step = 'basePrice';
                await sendTelegramMessage(chatId, '💵 Enter base price:');
            }
            break;

        // ——— create or edit Base Price ———
        case 'basePrice':
            if (state.editing) {
                state.data.basePrice = parseFloat(text);
                state.editing = false;
                state.step = 'variants';
                await sendTelegramMessage(
                    chatId,
                    `✅ Base price updated.\n\n${formatProductOverview(state.data)}`,
                    KEYBOARDS.VARIANTS_OVERVIEW
                );
            } else {
                state.data.basePrice = parseFloat(text);
                state.step = 'categoryId';
                await sendTelegramMessage(chatId, '📁 Enter category ID:');
            }
            break;

        // ——— create or edit Category ———
        case 'categoryId':
            if (state.editing) {
                state.data.categoryId = text;
                state.editing = false;
                state.step = 'variants';
                await sendTelegramMessage(
                    chatId,
                    `✅ Category updated.\n\n${formatProductOverview(state.data)}`,
                    KEYBOARDS.VARIANTS_OVERVIEW
                );
            } else {
                state.data.categoryId = text;
                state.step = 'tags';
                await sendTelegramMessage(chatId, '🏷️ Enter tags (comma-sep):');
            }
            break;

        // ——— create or edit Tags ———
        case 'tags':
            if (state.editing) {
                state.data.tags = text.split(',').map(t => t.trim());
                state.editing = false;
                state.step = 'variants';
                await sendTelegramMessage(
                    chatId,
                    `✅ Tags updated.\n\n${formatProductOverview(state.data)}`,
                    KEYBOARDS.VARIANTS_OVERVIEW
                );
            } else {
                state.data.tags = text.split(',').map(t => t.trim());
                state.step = 'variants';
                await sendTelegramMessage(
                    chatId,
                    formatProductOverview(state.data),
                    KEYBOARDS.VARIANTS_OVERVIEW
                );
            }
            break;

        // ——— overview & actions: add variant / edit / publish / cancel ———
        case 'variants':
            if (text === '➕ Add Variant' || text === '➕ Add Another Variant') {
                state.variantStep = 'colorName';
                await sendTelegramMessage(chatId, '🎨 Enter color name (e.g. light green suede):');
            }
            else if (text === '✏️ Edit') {
                state.step = 'edit_select';
                await sendTelegramMessage(chatId, '✏️ Which field do you want to edit?', KEYBOARDS.EDIT_FIELDS);
            }
            else if (text === '✅ Publish') {
                await handleProductCreation(chatId, state.data);
            }
            else if (text === '❌ Cancel') {
                resetUserState(chatId);
                await sendTelegramMessage(chatId, '🚫 Cancelled. Start again with /start or ➕ New Product.', KEYBOARDS.NEW);
            }
            break;

        // ——— pick a field to edit ———
        case 'edit_select':
            if (text === 'Name' ||
                text === 'Brand' ||
                text === 'Description' ||
                text === 'Base Price' ||
                text === 'Category' ||
                text === 'Tags') {
                // toggle into editing mode for that field
                state.editing = true;
                // reuse the same step name as above
                state.step = {
                    'Name': 'name',
                    'Brand': 'brand',
                    'Description': 'description',
                    'Base Price': 'basePrice',
                    'Category': 'categoryId',
                    'Tags': 'tags'
                }[text];
                // prompt current + new
                const current = (state.data as any)[state.step];
                await sendTelegramMessage(
                    chatId,
                    `🖊️ Current ${text.toLowerCase()}: ${Array.isArray(current) ? current.join(', ') : current}\nEnter new ${text.toLowerCase()}:`
                );
            }
            else if (text === 'Variants') {
                // jump right back into "add another variant"
                state.variantStep = 'colorName';
                state.step = 'variants';
                await sendTelegramMessage(chatId, '🎨 Enter color name for new variant:');
            }
            else if (text === '⬅️ Back') {
                state.step = 'variants';
                await sendTelegramMessage(chatId, formatProductOverview(state.data), KEYBOARDS.VARIANTS_OVERVIEW);
            }
            else if (text === '❌ Cancel') {
                resetUserState(chatId);
                await sendTelegramMessage(chatId, '🚫 Cancelled. Start again with /start or ➕ New Product.', KEYBOARDS.NEW);
            } else {
                await sendTelegramMessage(chatId, '❓ Pick one of the buttons below.', KEYBOARDS.EDIT_FIELDS);
            }
            break;

        default:
            await sendTelegramMessage(chatId, '❓ Unknown step. Type /start to begin again.');
    }

    state.processing = false;
    return NextResponse.json({ ok: true });
}
