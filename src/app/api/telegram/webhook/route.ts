// Full Telegram bot with multi-image & multi-video uploads per-variant
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
    variantStep?: string;
    variant?: any;
    editing?: boolean;
}

const userStates: Record<string, ProductState> = {};

const KEYBOARDS = {
    REPLY: {
        keyboard: [['⬅️ Previous', '➡️ Next'], ['✅ Skip', '❌ Cancel']],
        resize_keyboard: true
    },
    NEW: { keyboard: [['➕ New Product']], resize_keyboard: true },
    EDIT_FIELDS: {
        keyboard: [
            ['Name', 'Brand', 'Description'],
            ['Base Price', 'Category', 'Tags'],
            ['Variants'],
            ['⬅️ Back', '❌ Cancel']
        ],
        resize_keyboard: true
    },
    VARIANTS_OVERVIEW: {
        keyboard: [
            ['➕ Add Variant', '✏️ Edit'],
            ['✅ Publish', '❌ Cancel']
        ],
        resize_keyboard: true
    }
};

async function sendTelegramMessage(
    chatId: string,
    text: string,
    keyboard = KEYBOARDS.REPLY
) {
    await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: 'HTML',
            reply_markup: keyboard
        })
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
    txt += `<b>Base Price:</b> ${data.basePrice !== '' ? data.basePrice : '-'}\n`;
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

async function handleProductCreation(
    chatId: string,
    data: ProductState['data']
) {
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

export async function POST(req: Request) {
    const body = await req.json();
    const msg = body.message;
    if (!msg) return NextResponse.json({ ok: false });

    const chatId = String(msg.chat.id);
    const text = msg.text?.trim() || '';
    const isPhoto = Array.isArray(msg.photo);
    const isVideo = Boolean(msg.video);

    // Auth
    if (!ADMIN_TELEGRAM_IDS.includes(chatId)) {
        console.warn('Unauthorized:', chatId);
        return NextResponse.json({ ok: true });
    }

    // Init state
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
                variants: []
            },
            processing: false
        };
    }
    const state = userStates[chatId];
    if (state.processing) {
        await sendTelegramMessage(chatId, '⏳ Please wait…');
        return NextResponse.json({ ok: true });
    }
    state.processing = true;

    // /start or New Product
    if (['/start', '➕ New Product'].includes(text)) {
        userStates[chatId] = {
            step: 'name',
            data: {
                name: '',
                brand: '',
                description: '',
                basePrice: '',
                categoryId: '',
                tags: [],
                variants: []
            },
            processing: false
        };
        await sendTelegramMessage(chatId, '👋 Starting a new product. Enter product name:');
        state.processing = false;
        return NextResponse.json({ ok: true });
    }

    // Cancel
    if (text === '❌ Cancel') {
        resetUserState(chatId);
        await sendTelegramMessage(
            chatId,
            '🚫 Cancelled. Type /start or ➕ New Product to begin.',
            KEYBOARDS.NEW
        );
        state.processing = false;
        return NextResponse.json({ ok: true });
    }

    // Global Skip/Next in main flow
    if (!state.variantStep && ['➡️ Next', '✅ Skip'].includes(text)) {
        const advance: Record<string, string> = {
            name: 'brand',
            brand: 'description',
            description: 'basePrice',
            basePrice: 'categoryId',
            categoryId: 'tags',
            tags: 'variants'
        };
        const prompts: Record<string, string> = {
            brand: '🏷️ Enter brand name:',
            description: '📝 Enter product description:',
            basePrice: '💵 Enter base price (numeric only):',
            categoryId: '📁 Enter category ID:',
            tags: '🏷️ Enter tags (comma-separated):',
            variants: formatProductOverview(state.data)
        };
        state.step = advance[state.step] || state.step;
        await sendTelegramMessage(
            chatId,
            prompts[state.step]!,
            state.step === 'variants' ? KEYBOARDS.VARIANTS_OVERVIEW : KEYBOARDS.REPLY
        );
        state.processing = false;
        return NextResponse.json({ ok: true });
    }

    // Variant sub-flow: handling attachments for images/videos
    if (state.variantStep === 'images') {
        // first time entering this step?
        if (!state.variant) state.variant = { imageUrls: [], videoUrls: [] };

        // photo uploads
        if (isPhoto) {
            const fileId = msg.photo![msg.photo!.length - 1].file_id;
            state.variant.imageUrls.push(fileId);
            await sendTelegramMessage(
                chatId,
                `🖼️ Image received (#${state.variant.imageUrls.length}). Send more or tap ✅ Done.`
            );
            state.processing = false;
            return NextResponse.json({ ok: true });
        }

        // Done collecting images?
        if (text === '✅ Done') {
            // move on to videos
            state.variantStep = 'videos';
            await sendTelegramMessage(chatId, '🎥 Now send videos (as Telegram videos). When finished, tap ✅ Done.');
            state.processing = false;
            return NextResponse.json({ ok: true });
        }

        // reminder
        await sendTelegramMessage(chatId, '📤 Please upload images now. Send as many as you like, then tap ✅ Done.');
        state.processing = false;
        return NextResponse.json({ ok: true });
    }

    if (state.variantStep === 'videos') {
        if (!state.variant.videoUrls) state.variant.videoUrls = [];

        if (isVideo) {
            const fileId = msg.video!.file_id;
            state.variant.videoUrls.push(fileId);
            await sendTelegramMessage(
                chatId,
                `🎥 Video received (#${state.variant.videoUrls.length}). Send more or tap ✅ Done.`
            );
            state.processing = false;
            return NextResponse.json({ ok: true });
        }

        if (text === '✅ Done') {
            // finalize variant
            state.data.variants.push(state.variant);
            delete state.variant;
            delete state.variantStep;

            await sendTelegramMessage(
                chatId,
                `✅ Variant added!\n\n${formatProductOverview(state.data)}`,
                KEYBOARDS.VARIANTS_OVERVIEW
            );
            state.step = 'variants';
            state.processing = false;
            return NextResponse.json({ ok: true });
        }

        await sendTelegramMessage(chatId, '📤 Please upload videos now, then tap ✅ Done.');
        state.processing = false;
        return NextResponse.json({ ok: true });
    }

    // Main flow & edit flow
    // (unchanged from before: name→brand→…→variants, edit select, publish etc.)
    switch (state.step) {
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
                await sendTelegramMessage(chatId, '💵 Enter base price (numeric only):');
            }
            break;

        case 'basePrice':
            const bp = parseFloat(text);
            if (isNaN(bp)) {
                await sendTelegramMessage(
                    chatId,
                    '❌ Invalid base price. Please enter a valid number (e.g. 49.99):'
                );
            } else {
                state.data.basePrice = bp;
                if (state.editing) {
                    state.editing = false;
                    state.step = 'variants';
                    await sendTelegramMessage(
                        chatId,
                        `✅ Base price updated.\n\n${formatProductOverview(state.data)}`,
                        KEYBOARDS.VARIANTS_OVERVIEW
                    );
                } else {
                    state.step = 'categoryId';
                    await sendTelegramMessage(chatId, '📁 Enter category ID:');
                }
            }
            break;

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
                await sendTelegramMessage(chatId, '🏷️ Enter tags (comma-separated):');
            }
            break;

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

        case 'variants':
            if (text === '➕ Add Variant' || text === '➕ Add Another Variant') {
                state.variantStep = 'colorName';
                state.variant = { imageUrls: [], videoUrls: [] };
                await sendTelegramMessage(chatId, '🎨 Enter color name (e.g. light green suede):');
            } else if (text === '✏️ Edit') {
                state.step = 'edit_select';
                await sendTelegramMessage(chatId, '✏️ Which field to edit?', KEYBOARDS.EDIT_FIELDS);
            } else if (text === '✅ Publish') {
                await handleProductCreation(chatId, state.data);
            } else if (text === '❌ Cancel') {
                resetUserState(chatId);
                await sendTelegramMessage(
                    chatId,
                    '🚫 Cancelled. Start again with /start or ➕ New Product.',
                    KEYBOARDS.NEW
                );
            }
            break;

        case 'edit_select':
            if (['Name', 'Brand', 'Description', 'Base Price', 'Category', 'Tags'].includes(text)) {
                state.editing = true;
                state.step = ({
                    Name: 'name',
                    Brand: 'brand',
                    Description: 'description',
                    'Base Price': 'basePrice',
                    Category: 'categoryId',
                    Tags: 'tags'
                } as Record<string, string>)[text];
                const cur = (state.data as any)[state.step];
                await sendTelegramMessage(
                    chatId,
                    `🖊️ Current ${text}: ${Array.isArray(cur) ? cur.join(', ') : cur
                    }\nEnter new ${text.toLowerCase()}:`
                );
            } else if (text === 'Variants') {
                state.variantStep = 'colorName';
                state.variant = { imageUrls: [], videoUrls: [] };
                state.step = 'variants';
                await sendTelegramMessage(chatId, '🎨 Enter color name for new variant:');
            } else if (text === '⬅️ Back') {
                state.step = 'variants';
                await sendTelegramMessage(chatId, formatProductOverview(state.data), KEYBOARDS.VARIANTS_OVERVIEW);
            } else if (text === '❌ Cancel') {
                resetUserState(chatId);
                await sendTelegramMessage(chatId, '🚫 Cancelled. Start again with /start or ➕ New Product.', KEYBOARDS.NEW);
            } else {
                await sendTelegramMessage(chatId, '❓ Please choose from the buttons below.', KEYBOARDS.EDIT_FIELDS);
            }
            break;

        default:
            await sendTelegramMessage(chatId, '❓ Unknown step. Type /start to begin again.');
    }

    state.processing = false;
    return NextResponse.json({ ok: true });
}
