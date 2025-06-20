import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { v4 as uuidv4 } from 'uuid';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const ADMIN_TELEGRAM_ID = '5900684159';

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
            variants: (data.variants || []).map(v => ({
                id: v.id || `variant_${Date.now()}`,
                color: {
                    name: v.color?.name || '',
                    hex: v.color?.hex || ''
                },
                price: parseFloat(v.price || '0'),
                stock: String(v.stock || '0'),
                imageUrls: Array.isArray(v.imageUrls) ? v.imageUrls : [],
                videoUrls: Array.isArray(v.videoUrls) ? v.videoUrls : [],
            })),
            createdAt: new Date().toISOString()
        };

        const docRef = await db.collection('products').add(productData);
        const productId = docRef.id;
        await docRef.update({ id: productId });

        let stockInfo = productData.variants.length
            ? productData.variants.map((v, i) => `Variant ${i + 1} stock: ${v.stock}`).join('\n')
            : 'No variants/stock info available.';

        await sendTelegramMessage(chatId, `✅ Product created and published!\nID: <code>${productId}</code>\n${stockInfo}`, KEYBOARDS.NEW);
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
        const photo = message.photo;
        const video = message.video;

        if (chatId !== ADMIN_TELEGRAM_ID) {
            await sendTelegramMessage(chatId, '❌ Unauthorized.', KEYBOARDS.REPLY);
            return NextResponse.json({ ok: false }, { status: 403 });
        }

        if (!userStates[chatId]) {
            userStates[chatId] = {
                step: 'start',
                data: { name: '', brand: '', description: '', basePrice: '', categoryId: '', tags: [], variants: [] },
                currentVariant: null,
                variantStep: null,
                editing: false,
                editingField: null,
                processing: false
            };
        }

        state = userStates[chatId];

        if (state.processing) {
            await sendTelegramMessage(chatId, '⏳ Please wait.');
            return NextResponse.json({ ok: false });
        }
        state.processing = true;

        if (['/cancel', '❌ Cancel'].includes(text)) {
            resetUserState(chatId);
            await sendTelegramMessage(chatId, '🚫 Cancelled.', KEYBOARDS.NEW);
            return NextResponse.json({ ok: true });
        }

        if (state.editing && ['Name', 'Brand', 'Description', 'Base Price', 'Category', 'Tags'].includes(text)) {
            state.editing = false;
            state.editingField = text.toLowerCase().replace(' ', '');
            state.step = `edit_${state.editingField}`;
            await sendTelegramMessage(chatId, `Enter new ${text.toLowerCase()} (example: ...)`, KEYBOARDS.DONE_BACK_CANCEL);
            state.processing = false;
            return NextResponse.json({ ok: true });
        }

        if (state.step?.startsWith('edit_')) {
            const field = state.editingField;
            if (text === '✅ Done') {
                state.editingField = null;
                state.step = 'variant_confirm';
                await sendTelegramMessage(chatId, formatProductOverview(state.data), KEYBOARDS.CONFIRM);
            } else if (text === '⬅️ Back') {
                state.editing = true;
                state.editingField = null;
                state.step = 'variant_confirm';
                await sendTelegramMessage(chatId, formatProductOverview(state.data), KEYBOARDS.EDIT_FIELDS);
            } else {
                state.data[field] = field === 'basePrice' ? parseFloat(text) : (field === 'tags' ? text.split(',').map(t => t.trim()) : text);
                await sendTelegramMessage(chatId, `You entered: ${text}\nClick ✅ Done to save.`, KEYBOARDS.DONE_BACK_CANCEL);
            }
            state.processing = false;
            return NextResponse.json({ ok: true });
        }

// ... existing logic continues here (not shown for brevity)
