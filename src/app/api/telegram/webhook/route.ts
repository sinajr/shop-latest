import { NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase/admin'

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`
const ADMIN_TELEGRAM_IDS = (process.env.ADMIN_TELEGRAM_IDS || '5900684159')
    .split(',')
    .map(id => id.trim())

// allow up to 10 MB
const FILE_SIZE_LIMIT = 10 * 1024 * 1024

interface Variant {
    color: { name: string; hex: string; id: string }
    price: number
    stock: number
    imageUrls: string[]
    videoUrls: string[]
}

interface ProductState {
    step: string
    data: {
        name: string
        brand: string
        description: string
        basePrice: number | ''
        categoryId: string
        tags: string[]
        variants: Variant[]
    }
    processing: boolean
    variantStep?:
    | 'colorName'
    | 'colorHex'
    | 'colorId'
    | 'price'
    | 'stock'
    | 'images'
    | 'videos'
    variant?: Partial<Variant>
    editing?: boolean
    editVariantIndex?: number
    editVariantField?: keyof Variant
}

const userStates: Record<string, ProductState> = {}

const KEYBOARDS = {
    REPLY: {
        keyboard: [['⬅️ Previous'], ['✅ Skip', '❌ Cancel']],
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
        keyboard: [['➕ Add Variant', '✏️ Edit Variant'], ['✅ Publish', '❌ Cancel']],
        resize_keyboard: true
    },
    DONE_CANCEL: { keyboard: [['✅ Done', '❌ Skip']], resize_keyboard: true },
    SELECT_VARIANT: { keyboard: [], resize_keyboard: true },
    EDIT_VARIANT_FIELDS: {
        keyboard: [
            ['Color Name', 'Color HEX', 'Price'],
            ['Stock', 'Images', 'Videos'],
            ['⬅️ Back', '❌ Cancel']
        ],
        resize_keyboard: true
    }
}

async function sendTelegramMessage(
    chatId: string,
    text: string,
    keyboard = KEYBOARDS.REPLY
) {
    console.log(`[sendTelegramMessage] chatId=${chatId}, text=${text}`)
    await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', reply_markup: keyboard })
    })
}

async function getTelegramFileUrl(file_id: string): Promise<string> {
    console.log(`[getTelegramFileUrl] file_id=${file_id}`)
    const res = await fetch(`${TELEGRAM_API_URL}/getFile?file_id=${file_id}`)
    const json = await res.json()
    return `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${json.result.file_path}`
}

function resetUserState(chatId: string) {
    console.log(`[resetUserState] chatId=${chatId}`)
    delete userStates[chatId]
}

function formatProductOverview(data: ProductState['data']) {
    let txt = '<b>🧾 Product Overview</b>\n'
    txt += `<b>Name:</b> ${data.name || '-'}\n`
    txt += `<b>Brand:</b> ${data.brand || '-'}\n`
    txt += `<b>Description:</b> ${data.description || '-'}\n`
    txt += `<b>Base Price:</b> ${data.basePrice !== '' ? data.basePrice : '-'}\n`
    txt += `<b>Category:</b> ${data.categoryId || '-'}\n`
    txt += `<b>Tags:</b> ${data.tags.join(', ') || '-'}\n\n`
    if (data.variants.length) {
        txt += '<b>Variants:</b>\n'
        data.variants.forEach((v, i) => {
            txt += `#${i + 1} – Color: ${v.color.name} (${v.color.hex})\n`
            txt += `    Price: ${v.price} | Stock: ${v.stock}\n`
            txt += `    Images: ${v.imageUrls.length} | Videos: ${v.videoUrls.length}\n\n`
        })
    } else {
        txt += '<b>Variants:</b> None\n'
    }
    return txt
}

async function handleProductCreation(
    chatId: string,
    data: ProductState['data']
) {
    console.log(`[handleProductCreation] chatId=${chatId}, data=${JSON.stringify(data)}`)
    const db = getAdminDb()
    const payload = {
        ...data,
        basePrice: Number(data.basePrice) || 0,
        createdAt: new Date().toISOString()
    }
    try {
        const docRef = await db.collection('products').add(payload)
        await docRef.update({ id: docRef.id })
        await sendTelegramMessage(
            chatId,
            `✅ Product published!\nID: <code>${docRef.id}</code>`,
            KEYBOARDS.NEW
        )
        resetUserState(chatId)
    } catch (e) {
        console.error('Firestore error:', e)
        await sendTelegramMessage(chatId, '❌ Error creating product.', KEYBOARDS.NEW)
    }
}

export async function POST(req: Request) {
    console.log('[POST] Request received')
    const body = await req.json()
    console.log('[POST] body=', JSON.stringify(body))
    const msg = body.message
    if (!msg) {
        console.log('[POST] No message object')
        return NextResponse.json({ ok: false })
    }

    const chatId = String(msg.chat.id)
    const text = (msg.text || '').trim()
    const isPhoto = Array.isArray(msg.photo)
    const isVideo = Boolean(msg.video)

    console.log(`[POST] chatId=${chatId}, text='${text}', isPhoto=${isPhoto}, isVideo=${isVideo}`)
    if (!ADMIN_TELEGRAM_IDS.includes(chatId)) {
        console.log(`[POST] chatId not admin, ignoring: ${chatId}`)
        return NextResponse.json({ ok: true })
    }

    if (!userStates[chatId]) {
        console.log(`[POST] Initializing state for chatId=${chatId}`)
        userStates[chatId] = {
            step: 'start',
            data: { name: '', brand: '', description: '', basePrice: '', categoryId: '', tags: [], variants: [] },
            processing: false
        }
    }
    const state = userStates[chatId]
    console.log('[POST] current state=', JSON.stringify(state))
    if (state.processing) {
        console.log('[POST] Already processing, sending wait message')
        await sendTelegramMessage(chatId, '⏳ Please wait…')
        return NextResponse.json({ ok: true })
    }
    state.processing = true

    // /start or New Product
    if (['/start', '➕ New Product'].includes(text)) {
        console.log('[POST] Starting new product flow')
        userStates[chatId] = {
            step: 'name',
            data: { name: '', brand: '', description: '', basePrice: '', categoryId: '', tags: [], variants: [] },
            processing: false
        }
        await sendTelegramMessage(chatId, '👋 Enter product name:')
        return NextResponse.json({ ok: true })
    }

    // Cancel
    if (text === '❌ Cancel') {
        console.log('[POST] User cancelled operation')
        resetUserState(chatId)
        await sendTelegramMessage(chatId, '🚫 Cancelled. /start or ➕ New Product.', KEYBOARDS.NEW)
        return NextResponse.json({ ok: true })
    }

    // Navigation: Skip & Previous
    if (!state.variantStep) {
        console.log('[POST] In main navigation step', state.step)
        const advanceMap: Record<string, string> = {
            name: 'brand',
            brand: 'description',
            description: 'basePrice',
            basePrice: 'categoryId',
            categoryId: 'tags',
            tags: 'variants'
        }
        const backMap: Record<string, string> = {
            brand: 'name',
            description: 'brand',
            basePrice: 'description',
            categoryId: 'basePrice',
            tags: 'categoryId',
            variants: 'tags'
        }
        const prompts: Record<string, string> = {
            brand: '🏷️ Enter brand name:',
            description: '📝 Enter product description:',
            basePrice: '💵 Enter base price (numeric):',
            categoryId: '📁 Enter category ID:',
            tags: '🏷️ Enter tags (comma-separated):',
            variants: formatProductOverview(state.data)
        }
        if (text === '✅ Skip') {
            state.step = advanceMap[state.step] || state.step
            console.log('[POST] Skip pressed, advancing to', state.step)
            await sendTelegramMessage(chatId,
                prompts[state.step]!,
                state.step === 'variants' ? KEYBOARDS.VARIANTS_OVERVIEW : KEYBOARDS.REPLY
            )
            state.processing = false
            return NextResponse.json({ ok: true })
        }
        if (text === '⬅️ Previous') {
            state.step = backMap[state.step] || state.step
            console.log('[POST] Previous pressed, going back to', state.step)
            await sendTelegramMessage(chatId,
                prompts[state.step]!,
                state.step === 'variants' ? KEYBOARDS.VARIANTS_OVERVIEW : KEYBOARDS.REPLY
            )
            state.processing = false
            return NextResponse.json({ ok: true })
        }
    }

    // Variant sub-flow: colors → price → stock → uploads
    if (state.variantStep && !['images', 'videos'].includes(state.variantStep)) {
        console.log('[POST] In variant sub-flow, step=', state.variantStep)
        state.variant ??= { imageUrls: [], videoUrls: [] };

        const subSteps = ['colorName', 'colorHex', 'colorId', 'price', 'stock'] as const;
        let idx = subSteps.indexOf(state.variantStep as any);

        // handle Previous
        if (text === '⬅️ Previous') {
            console.log('[Variant] Previous pressed')
            if (idx > 0) {
                state.variantStep = subSteps[idx - 1];
            } else {
                state.step = 'variants';
                await sendTelegramMessage(chatId, formatProductOverview(state.data), KEYBOARDS.VARIANTS_OVERVIEW);
                state.processing = false;
                return NextResponse.json({ ok: true });
            }
            state.processing = false;
            return NextResponse.json({ ok: true });
        }

        // process input for current step
        console.log(`[Variant] Processing input for ${state.variantStep}: '${text}'`)
        switch (state.variantStep) {
            case 'colorName':
                if (!['❌ Skip'].includes(text)) {
                    state.variant.color = { name: text, hex: '', id: '' };
                }
                break;
            case 'colorHex':
                if (!['❌ Skip'].includes(text) && state.variant.color) {
                    state.variant.color.hex = text;
                }
                break;
            case 'colorId':
                if (!['❌ Skip'].includes(text) && state.variant.color) {
                    state.variant.color.id = text;
                }
                break;
            case 'price':
                if (!['❌ Skip'].includes(text)) {
                    const val = parseFloat(text);
                    state.variant.price = isNaN(val) ? 0 : val;
                }
                break;
            case 'stock':
                if (!['❌ Skip'].includes(text)) {
                    const val = parseInt(text, 10);
                    state.variant.stock = isNaN(val) ? 0 : val;
                }
                break;
        }

        // advance to next
        const prevStep = state.variantStep;
        if (state.variantStep === 'stock') {
            state.variantStep = 'images';
        } else {
            idx = Math.min(idx + 1, subSteps.length - 1);
            state.variantStep = subSteps[idx];
        }
        console.log(`[Variant] Moved from ${prevStep} to ${state.variantStep}`)

        // send prompt for new step
        switch (state.variantStep) {
            case 'colorHex':
                await sendTelegramMessage(chatId, '🎨 Enter color HEX (e.g. #6e371b):');
                break;
            case 'colorId':
                await sendTelegramMessage(chatId, '🆔 Enter color ID:');
                break;
            case 'price':
                await sendTelegramMessage(chatId, '💰 Enter variant price (numeric):');
                break;
            case 'stock':
                await sendTelegramMessage(chatId, '📦 Enter stock quantity (integer):');
                break;
            case 'images':
                await sendTelegramMessage(
                    chatId,
                    '📤 Now upload photos (upload or link), then ✅ Done or ❌ Skip.',
                    KEYBOARDS.DONE_CANCEL
                );
                break;
        }

        state.processing = false;
        return NextResponse.json({ ok: true });
    }

    // Main steps
    switch (state.step) {
        case 'name':
            console.log('[Main] name step, text=', text)
            state.data.name = text
            state.step = 'brand'
            await sendTelegramMessage(chatId, '🏷️ Enter brand name:')
            break
        case 'brand':
            console.log('[Main] brand step, text=', text)
            state.data.brand = text
            state.step = 'description'
            await sendTelegramMessage(chatId, '📝 Enter product description:')
            break
        case 'description':
            console.log('[Main] description step, text=', text)
            state.data.description = text
            state.step = 'basePrice'
            await sendTelegramMessage(chatId, '💵 Enter base price (numeric):')
            break
        case 'basePrice':
            console.log('[Main] basePrice step, text=', text)
            const bp2 = parseFloat(text)
            if (isNaN(bp2)) {
                await sendTelegramMessage(chatId, '❌ Invalid price. Enter a number.')
            } else {
                state.data.basePrice = bp2
                state.step = 'categoryId'
                await sendTelegramMessage(chatId, '📁 Enter category ID:')
            }
            break
        case 'categoryId':
            console.log('[Main] categoryId step, text=', text)
            state.data.categoryId = text
            state.step = 'tags'
            await sendTelegramMessage(chatId, '🏷️ Enter tags (comma-separated):')
            break
        case 'tags':
            console.log('[Main] tags step, text=', text)
            state.data.tags = text.split(',').map(t => t.trim())
            state.step = 'variants'
            await sendTelegramMessage(chatId, formatProductOverview(state.data), KEYBOARDS.VARIANTS_OVERVIEW)
            break
        case 'variants':
            console.log('[Main] variants step, text=', text)
            if (text === '➕ Add Variant') {
                state.variantStep = 'colorName'
                state.variant = { imageUrls: [], videoUrls: [] }
                await sendTelegramMessage(chatId, '🎨 Enter color name:')
            } else if (text === '✏️ Edit Variant') {
                const opts = state.data.variants.map((_, i) => [`Variant #${i + 1}`])
                opts.push(['⬅️ Back', '❌ Cancel'])
                KEYBOARDS.SELECT_VARIANT.keyboard = opts
                state.step = 'select_variant'
                await sendTelegramMessage(chatId, 'Select variant to edit:', KEYBOARDS.SELECT_VARIANT)
            } else if (text === '✅ Publish') {
                await handleProductCreation(chatId, state.data)
            }
            break
        case 'select_variant':
            console.log('[Main] select_variant step, text=', text)
            if (text.match(/^Variant #\d+$/)) {
                const idxSel = parseInt(text.split('#')[1], 10) - 1
                if (idxSel >= 0 && idxSel < state.data.variants.length) {
                    state.editVariantIndex = idxSel
                    state.step = 'edit_variant'
                    await sendTelegramMessage(chatId, 'Choose field to edit:', KEYBOARDS.EDIT_VARIANT_FIELDS)
                }
            } else if (text === '⬅️ Back') {
                state.step = 'variants'
                await sendTelegramMessage(chatId, formatProductOverview(state.data), KEYBOARDS.VARIANTS_OVERVIEW)
            }
            break
        case 'edit_variant':
            console.log('[Main] edit_variant step, text=', text)
            const fieldMap: Record<string, keyof Variant> = {
                'Color Name': 'color',
                'Color HEX': 'color',
                Price: 'price',
                Stock: 'stock',
                Images: 'imageUrls',
                Videos: 'videoUrls'
            }
            if (fieldMap[text]) {
                state.editVariantField = fieldMap[text]
                if (text === 'Images' || text === 'Videos') {
                    state.variantStep = text === 'Images' ? 'images' : 'videos'
                    await sendTelegramMessage(chatId, `Now send ${text.toLowerCase()} (upload or link), then ✅ Done or ❌ Skip.`, KEYBOARDS.DONE_CANCEL)
                } else {
                    const prompt =
                        text === 'Price'
                            ? 'Enter new price (numeric):'
                            : text === 'Stock'
                                ? 'Enter new stock (integer):'
                                : text === 'Color Name'
                                    ? 'Enter new color name:'
                                    : 'Enter new color HEX:'
                    await sendTelegramMessage(chatId, prompt)
                }
            } else if (text === '⬅️ Back') {
                state.step = 'variants'
                await sendTelegramMessage(chatId, formatProductOverview(state.data), KEYBOARDS.VARIANTS_OVERVIEW)
            }
            break
    }

    // Upload flows
    if (state.variantStep === 'images') {
        console.log('[Upload] images step, text=', text, ', isPhoto=', isPhoto)
        if (text === '⬅️ Previous') {
            state.variantStep = 'stock'
            await sendTelegramMessage(chatId, '📦 Enter stock quantity (integer):', KEYBOARDS.REPLY)
            return NextResponse.json({ ok: true })
        }
        if (isPhoto) {
            console.log('[Upload] received photo array length=', msg.photo!.length)
            const best = msg.photo![msg.photo!.length - 1]
            if (best.file_size > FILE_SIZE_LIMIT) {
                await sendTelegramMessage(chatId, '❌ Photo too large. Max 10 MB.')
            } else {
                const url = await getTelegramFileUrl(best.file_id)
                state.variant!.imageUrls!.push(url)
                await sendTelegramMessage(chatId, `🖼 Image #${state.variant!.imageUrls!.length} saved. ✅ Done or ❌ Skip.`, KEYBOARDS.DONE_CANCEL)
            }
        } else if (text.startswith('http')) {
            state.variant!.imageUrls!.push(text)
            await sendTelegramMessage(chatId, `🖼 Link saved. ✅ Done or ❌ Skip.`, KEYBOARDS.DONE_CANCEL)
        } else if (text === '✅ Done' || text === '❌ Skip') {
            state.variantStep = 'videos'
            await sendTelegramMessage(chatId, 'Now send videos (upload or link), then ✅ Done or ❌ Skip.', KEYBOARDS.DONE_CANCEL)
        }
        return NextResponse.json({ ok: true })
    }
    if (state.variantStep === 'videos') {
        console.log('[Upload] videos step, text=', text, ', isVideo=', isVideo)
        if (text === '⬅️ Previous') {
            state.variantStep = 'images'
            await sendTelegramMessage(chatId, '📤 Now upload photos (upload or link), then ✅ Done or ❌ Skip.', KEYBOARDS.DONE_CANCEL)
            return NextResponse.json({ ok: true })
        }
        if (isVideo) {
            const v = msg.video!
            console.log('[Upload] video file size=', v.file_size)
            if (v.file_size > FILE_SIZE_LIMIT) {
                await sendTelegramMessage(chatId, '❌ Video too large. Max 10 MB.')
            } else {
                const url = await getTelegramFileUrl(v.file_id)
                state.variant!.videoUrls!.push(url)
                await sendTelegramMessage(chatId, `🎥 Video #${state.variant!.videoUrls!.length} saved. ✅ Done or ❌ Skip.`, KEYBOARDS.DONE_CANCEL)
            }
        } else if (text.startswith('http')) {
            state.variant!.videoUrls!.push(text)
            await sendTelegramMessage(chatId, `🎥 Link saved. ✅ Done or ❌ Skip.`, KEYBOARDS.DONE_CANCEL)
        } else if (text === '✅ Done' || text === '❌ Skip') {
            // finalize new or edited variant
            console.log('[Upload] finalizing variant, edit index=', state.editVariantIndex)
            if (state.editVariantIndex != null) {
                state.data.variants[state.editVariantIndex] = {
                    ...state.data.variants[state.editVariantIndex],
                    ...state.variant!
                } as Variant
            } else {
                state.data.variants.push(state.variant as Variant)
            }
            delete state.variant
            delete state.variantStep
            delete state.editVariantIndex
            delete state.editVariantField
            await sendTelegramMessage(chatId, `✅ Variant saved!\n\n${formatProductOverview(state.data)}`, KEYBOARDS.VARIANTS_OVERVIEW)
        }
        return NextResponse.json({ ok: true })
    }

    state.processing = false
    console.log('[POST] End of handler for chatId=', chatId)
    return NextResponse.json({ ok: true })
}
