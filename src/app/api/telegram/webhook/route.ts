import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { v4 as uuidv4 } from 'uuid';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

const ADMIN_TELEGRAM_IDS = (process.env.ADMIN_TELEGRAM_IDS || '5900684159')
    .split(',')
    .map(id => id.trim());

const userStates = {};

const KEYBOARDS = {
    REPLY: { keyboard: [['⬅️ Previous', '➡️ Next'], ['✅ Skip', '❌ Cancel']], resize_keyboard: true },
    NEW: { keyboard: [['➕ New Product']], resize_keyboard: true },
    EDIT_FIELDS: {
        keyboard: [['Name', 'Brand', 'Description'], ['Base Price', 'Category', 'Tags'], ['Variants'], ['⬅️ Back', '❌ Cancel']],
        resize_keyboard: true
    },
    DONE_CANCEL: { keyboard: [['✅ Done', '❌ Cancel']], resize_keyboard: true },
    DONE_BACK_CANCEL: { keyboard: [['✅ Done', '⬅️ Back', '❌ Cancel']], resize_keyboard: true },
    CONFIRM: { keyboard: [['✅ Publish', '✏️ Edit', '❌ Cancel']], resize_keyboard: true },
};

async function sendTelegramMessage(chatId, text, keyboard = KEYBOARDS.REPLY) {
    try {
        const res = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', reply_markup: keyboard })
        });
        return await res.json();
    } catch (err) {
        console.error('Telegram send error:', err);
        return null;
    }
}

function resetUserState(chatId) {
    delete userStates[chatId];
}

function formatProductOverview(data) {
    let text = '<b>🧾 Product Overview</b>\n';
    text += `<b>Name:</b> ${data.name || '-'}\n`;
    text += `<b>Brand:</b> ${data.brand || '-'}\n`;
    text += `<b>Description:</b> ${data.description || '-'}\n`;
    text += `<b>Base Price:</b> ${data.basePrice || '-'}\n`;
    text += `<b>Category:</b> ${data.categoryId || '-'}\n`;
    text += `<b>Tags:</b> ${data.tags?.join(', ') || '-'}\n\n`;

    if (data.variants?.length) {
        text += '<b>Variants:</b>\n';
        data.variants.forEach((v, i) => {
            text += `#${i + 1} - Color: ${v.color?.name || '-'} (${v.color?.hex || '-'})\n`;
            text += `  Price: ${v.price || '-'} | Stock: ${v.stock || '-'}\n`;
            text += `  Images: ${v.imageUrls?.length || 0} | Videos: ${v.videoUrls?.length || 0}\n\n`;
        });
    } else {
        text += '<b>Variants:</b> None\n';
    }
    return text;
}

async function handleProductCreation(chatId, data) {
    const db = getAdminDb();
    try {
        const productData = {
            name: data.name,
            brand: data.brand,
            description: data.description,
            basePrice: parseFloat(data.basePrice || '0'),
            categoryId: data.categoryId,
            tags: data.tags || [],
            variants: [],
            createdAt: new Date().toISOString()
        };

        const docRef = await db.collection('products').add(productData);
        const productId = docRef.id;
        await docRef.update({ id: productId });

        await sendTelegramMessage(chatId, `✅ Product created and published!\nID: <code>${productId}</code>`, KEYBOARDS.NEW);
        resetUserState(chatId);
    } catch (e) {
        console.error('Create error:', e);
        await sendTelegramMessage(chatId, '❌ Error creating product.', KEYBOARDS.NEW);
    }
}

export async function POST(req) {
    let state;
    try {
        const body = await req.json();
        const message = body.message;
        if (!message) return NextResponse.json({ error: 'No message received' }, { status: 400 });

        const chatId = message.chat.id.toString();
        const text = message.text || '';

        if (!ADMIN_TELEGRAM_IDS.includes(chatId)) {
            console.warn(`❌ Unauthorized Telegram user tried access: ${chatId}`);
            return NextResponse.json({ ok: true });
        }

        if (!userStates[chatId]) {
            userStates[chatId] = {
                step: 'start',
                data: { name: '', brand: '', description: '', basePrice: '', categoryId: '', tags: [], variants: [] },
                processing: false
            };
        }

        state = userStates[chatId];
        if (state.processing) {
            await sendTelegramMessage(chatId, '⏳ Please wait.');
            return NextResponse.json({ ok: false });
        }
        state.processing = true;

        if (['/start', '➕ New Product'].includes(text)) {
            userStates[chatId] = {
                step: 'name',
                data: { name: '', brand: '', description: '', basePrice: '', categoryId: '', tags: [], variants: [] },
                processing: false
            };
            await sendTelegramMessage(chatId, '👋 Starting a new product. Please enter product name (e.g. Gucci Shoes 1):', KEYBOARDS.REPLY);
            return NextResponse.json({ ok: true });
        }

        if (text === '❌ Cancel') {
            resetUserState(chatId);
            await sendTelegramMessage(chatId, '🚫 Cancelled. Type /start or tap ➕ New Product to begin again.', KEYBOARDS.NEW);
            return NextResponse.json({ ok: true });
        }

        if (state.step === 'name') {
            state.data.name = text;
            state.step = 'brand';
            await sendTelegramMessage(chatId, 'Enter brand (e.g. Gucci):', KEYBOARDS.REPLY);
        } else if (state.step === 'brand') {
            state.data.brand = text;
            state.step = 'description';
            await sendTelegramMessage(chatId, 'Enter description (e.g. Limited edition sneakers):', KEYBOARDS.REPLY);
        } else if (state.step === 'description') {
            state.data.description = text;
            state.step = 'basePrice';
            await sendTelegramMessage(chatId, 'Enter base price (e.g. 1500):', KEYBOARDS.REPLY);
        } else if (state.step === 'basePrice') {
            const price = parseFloat(text);
            if (isNaN(price)) {
                await sendTelegramMessage(chatId, '⚠️ Please enter a valid number for price.');
                state.processing = false;
                return NextResponse.json({ ok: true });
            }
            state.data.basePrice = price;
            state.step = 'categoryId';
            await sendTelegramMessage(chatId, 'Enter category ID (e.g. shoes):', KEYBOARDS.REPLY);
        } else if (state.step === 'categoryId') {
            state.data.categoryId = text;
            state.step = 'tags';
            await sendTelegramMessage(chatId, 'Enter tags (comma separated, e.g. limited, premium):', KEYBOARDS.REPLY);
        } else if (state.step === 'tags') {
            state.data.tags = text.split(',').map(t => t.trim()).filter(Boolean);
            await sendTelegramMessage(chatId, formatProductOverview(state.data), KEYBOARDS.CONFIRM);
            state.step = 'confirm';
        } else if (state.step === 'confirm') {
            if (text === '✅ Publish') {
                await handleProductCreation(chatId, state.data);
                return NextResponse.json({ ok: true });
            } else if (text === '✏️ Edit') {
                state.step = 'name';
                await sendTelegramMessage(chatId, 'Edit product name (or re-enter):', KEYBOARDS.REPLY);
            }
        } else {
            await sendTelegramMessage(chatId, '⚠️ Unknown input. Please follow the prompts.');
        }

        state.processing = false;
        return NextResponse.json({ ok: true });
    } catch (e) {
        console.error('POST error:', e);
        if (state) state.processing = false;
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
