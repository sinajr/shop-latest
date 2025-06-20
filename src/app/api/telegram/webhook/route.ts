

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
            variants: data.variants || [],
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
                editing: false, processing: false
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

        if (text === '➕ New Product') {
            userStates[chatId] = {
                step: 'name',
                data: { name: '', brand: '', description: '', basePrice: '', categoryId: '', tags: [], variants: [] },
                editing: false, processing: false
            };
            await sendTelegramMessage(chatId, '👋 Starting a new product. Enter product name:', KEYBOARDS.REPLY);
            return NextResponse.json({ ok: true });
        }

        if (text === '✅ Publish') {
            await handleProductCreation(chatId, state.data);
            return NextResponse.json({ ok: true });
        }

        if (text === '✏️ Edit') {
            state.editing = true;
            await sendTelegramMessage(chatId, 'Which field to edit?', KEYBOARDS.EDIT_FIELDS);
            state.processing = false;
            return NextResponse.json({ ok: true });
        }

        // Handle editing inputs here...
        // You'll add more input handlers for edit flow

        // Simplified flow for normal field entry (e.g., name, brand...)
        const steps = ['name', 'brand', 'description', 'basePrice', 'categoryId', 'tags'];
        const next = () => { const idx = steps.indexOf(state.step); return steps[idx + 1] || null; };

        if (steps.includes(state.step)) {
            state.data[state.step] = text;
            state.step = next();

            if (state.step) {
                await sendTelegramMessage(chatId, `Enter ${state.step}:`, KEYBOARDS.REPLY);
            } else {
                await sendTelegramMessage(chatId, '🧾 Product info complete. Review and confirm.', KEYBOARDS.CONFIRM);
            }
            state.processing = false;
            return NextResponse.json({ ok: true });
        }

        await sendTelegramMessage(chatId, '⚠️ Unknown input. Please follow the prompts.');
        state.processing = false;
        return NextResponse.json({ ok: true });

    } catch (e) {
        console.error('POST error:', e);
        if (state) state.processing = false;
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
