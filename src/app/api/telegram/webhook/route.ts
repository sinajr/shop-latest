// api/telegram/webhook/route.ts
import { NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase/admin'

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`
const ADMIN_TELEGRAM_IDS = (process.env.ADMIN_TELEGRAM_IDS || '5900684159')
    .split(',').map(id => id.trim())

const FILE_SIZE_LIMIT = 2 * 1024 * 1024  // 2 MB

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
    variantStep?: 'colorName' | 'colorHex' | 'colorId' | 'price' | 'stock' | 'images' | 'videos'
    variant?: Partial<Variant>
    editing?: boolean
}

const userStates: Record<string, ProductState> = {}

const KEYBOARDS = {
    REPLY: {
        keyboard: [['⬅️ Previous', '➡️ Next'], ['✅ Skip', '❌ Cancel']],
        resize_keyboard: true
    },
    NEW: {
        keyboard: [['➕ New Product']],
        resize_keyboard: true
    },
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
        keyboard: [['➕ Add Variant', '✏️ Edit'], ['✅ Publish', '❌ Cancel']],
        resize_keyboard: true
    },
    DONE_CANCEL: {
        keyboard: [['✅ Done', '❌ Cancel']],
        resize_keyboard: true
    }
}

async function sendTelegramMessage(chatId: string, text: string, keyboard = KEYBOARDS.REPLY) {
    await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', reply_markup: keyboard })
    })
}

async function getTelegramFileUrl(file_id: string): Promise<string> {
    const res = await fetch(`${TELEGRAM_API_URL}/getFile?file_id=${file_id}`)
    const json = await res.json()
    return `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${json.result.file_path}`
}

function resetUserState(chatId: string) {
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

async function handleProductCreation(chatId: string, data: ProductState['data']) {
    const db = getAdminDb()
    const payload = { ...data, basePrice: Number(data.basePrice) || 0, createdAt: new Date().toISOString() }
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
    const body = await req.json()
    const msg = body.message
    if (!msg) return NextResponse.json({ ok: false })

    const chatId = String(msg.chat.id)
    const text = (msg.text || '').trim()
    const isPhoto = Array.isArray(msg.photo)
    const isVideo = Boolean(msg.video)

    // ─── Auth ───
    if (!ADMIN_TELEGRAM_IDS.includes(chatId)) {
        console.warn('Unauthorized:', chatId)
        return NextResponse.json({ ok: true })
    }

    // ─── Init state ───
    if (!userStates[chatId]) {
        userStates[chatId] = {
            step: 'start',
            data: { name: '', brand: '', description: '', basePrice: '', categoryId: '', tags: [], variants: [] },
            processing: false
        }
    }
    const state = userStates[chatId]
    if (state.processing) {
        await sendTelegramMessage(chatId, '⏳ Please wait…')
        return NextResponse.json({ ok: true })
    }
    state.processing = true

    // ─── /start or New Product ───
    if (['/start', '➕ New Product'].includes(text)) {
        userStates[chatId] = {
            step: 'name',
            data: { name: '', brand: '', description: '', basePrice: '', categoryId: '', tags: [], variants: [] },
            processing: false
        }
        await sendTelegramMessage(chatId, '👋 Enter product name:')
        state.processing = false
        return NextResponse.json({ ok: true })
    }

    // ─── Cancel ───
    if (text === '❌ Cancel') {
        resetUserState(chatId)
        await sendTelegramMessage(chatId, '🚫 Cancelled. /start or ➕ New Product.', KEYBOARDS.NEW)
        state.processing = false
        return NextResponse.json({ ok: true })
    }

    // ─── Global navigation: Previous / Next / Skip ───
    if (!state.variantStep) {
        const advanceMap: Record<string, string> = {
            name: 'brand', brand: 'description', description: 'basePrice',
            basePrice: 'categoryId', categoryId: 'tags', tags: 'variants'
        }
        const backMap: Record<string, string> = {
            brand: 'name', description: 'brand', basePrice: 'description',
            categoryId: 'basePrice', tags: 'categoryId', variants: 'tags'
        }
        const prompts: Record<string, string> = {
            brand: '🏷️ Enter brand name:',
            description: '📝 Enter product description:',
            basePrice: '💵 Enter base price (numeric):',
            categoryId: '📁 Enter category ID:',
            tags: '🏷️ Enter tags (comma-separated):',
            variants: formatProductOverview(state.data)
        }

        if (text === '➡️ Next' || text === '✅ Skip') {
            state.step = advanceMap[state.step] || state.step
            await sendTelegramMessage(chatId,
                prompts[state.step]!,
                state.step === 'variants' ? KEYBOARDS.VARIANTS_OVERVIEW : KEYBOARDS.REPLY
            )
            state.processing = false
            return NextResponse.json({ ok: true })
        }

        if (text === '⬅️ Previous') {
            state.step = backMap[state.step] || state.step
            await sendTelegramMessage(chatId,
                prompts[state.step]!,
                state.step === 'variants' ? KEYBOARDS.VARIANTS_OVERVIEW : KEYBOARDS.REPLY
            )
            state.processing = false
            return NextResponse.json({ ok: true })
        }
    }

    // ─── Variant sub-flow: colors → price → stock → uploads ───
    if (state.variantStep && !['images', 'videos'].includes(state.variantStep)) {
        state.variant ??= { imageUrls: [], videoUrls: [] }
        switch (state.variantStep) {
            case 'colorName':
                state.variant.color = { name: text }
                state.variantStep = 'colorHex'
                await sendTelegramMessage(chatId, '🎨 Enter color HEX (e.g. #6e371b):')
                break
            case 'colorHex':
                state.variant.color.hex = text
                state.variantStep = 'colorId'
                await sendTelegramMessage(chatId, '🆔 Enter color ID:')
                break
            case 'colorId':
                state.variant.color.id = text
                state.variantStep = 'price'
                await sendTelegramMessage(chatId, '💰 Enter variant price (number):')
                break
            case 'price':
                const price = parseFloat(text)
                if (isNaN(price)) {
                    await sendTelegramMessage(chatId, '❌ Invalid price. Enter a number:')
                } else {
                    state.variant.price = price
                    state.variantStep = 'stock'
                    await sendTelegramMessage(chatId, '📦 Enter stock quantity (integer):')
                }
                break
            case 'stock':
                state.variant.stock = parseInt(text) || 0
                state.variantStep = 'images'
                // show the Done button here:
                await sendTelegramMessage(chatId,
                    '📤 Now upload **photos** (≤2 MB each). When finished, tap ✅ Done or ❌ Cancel.',
                    KEYBOARDS.DONE_CANCEL
                )
                break
        }
        state.processing = false
        return NextResponse.json({ ok: true })
    }

    // ─── Collect photos ───
    if (state.variantStep === 'images') {
        if (isPhoto) {
            const best = msg.photo![msg.photo!.length - 1]
            if (best.file_size > FILE_SIZE_LIMIT) {
                await sendTelegramMessage(chatId, '❌ Photo too large (max 2 MB).')
            } else {
                const url = await getTelegramFileUrl(best.file_id)
                state.variant.imageUrls!.push(url)
                await sendTelegramMessage(chatId,
                    `🖼 Photo #${state.variant.imageUrls!.length} saved. Send more or ✅ Done.`,
                    KEYBOARDS.DONE_CANCEL
                )
            }
        }
        else if (text === '✅ Done') {
            state.variantStep = 'videos'
            await sendTelegramMessage(chatId,
                '📤 Now upload **videos** (≤2 MB each). When finished, tap ✅ Done or ❌ Cancel.',
                KEYBOARDS.DONE_CANCEL
            )
        }
        else {
            await sendTelegramMessage(chatId,
                '📤 Please upload photos, then tap ✅ Done or ❌ Cancel.',
                KEYBOARDS.DONE_CANCEL
            )
        }
        state.processing = false
        return NextResponse.json({ ok: true })
    }

    // ─── Collect videos ───
    if (state.variantStep === 'videos') {
        if (isVideo) {
            const v = msg.video!
            if (v.file_size > FILE_SIZE_LIMIT) {
                await sendTelegramMessage(chatId, '❌ Video too large (max 2 MB).')
            } else {
                const url = await getTelegramFileUrl(v.file_id)
                state.variant.videoUrls!.push(url)
                await sendTelegramMessage(chatId,
                    `🎥 Video #${state.variant.videoUrls!.length} saved. Send more or ✅ Done.`,
                    KEYBOARDS.DONE_CANCEL
                )
            }
        }
        else if (text === '✅ Done') {
            state.data.variants.push(state.variant as Variant)
            delete state.variant
            delete state.variantStep
            await sendTelegramMessage(chatId,
                `✅ Variant added!\n\n${formatProductOverview(state.data)}`,
                KEYBOARDS.VARIANTS_OVERVIEW
            )
        }
        else {
            await sendTelegramMessage(chatId,
                '📤 Please upload videos, then tap ✅ Done or ❌ Cancel.',
                KEYBOARDS.DONE_CANCEL
            )
        }
        state.processing = false
        return NextResponse.json({ ok: true })
    }

    // ─── Main flow & edit flow ───
    switch (state.step) {
        case 'name':
            if (state.editing) {
                state.data.name = text
                state.editing = false
                await sendTelegramMessage(chatId,
                    `✅ Name updated.\n\n${formatProductOverview(state.data)}`,
                    KEYBOARDS.VARIANTS_OVERVIEW
                )
            } else {
                state.data.name = text
                state.step = 'brand'
                await sendTelegramMessage(chatId, '🏷️ Enter brand name:')
            }
            break

        case 'brand':
            if (state.editing) {
                state.data.brand = text
                state.editing = false
                await sendTelegramMessage(chatId,
                    `✅ Brand updated.\n\n${formatProductOverview(state.data)}`,
                    KEYBOARDS.VARIANTS_OVERVIEW
                )
            } else {
                state.data.brand = text
                state.step = 'description'
                await sendTelegramMessage(chatId, '📝 Enter description:')
            }
            break

        case 'description':
            if (state.editing) {
                state.data.description = text
                state.editing = false
                await sendTelegramMessage(chatId,
                    `✅ Description updated.\n\n${formatProductOverview(state.data)}`,
                    KEYBOARDS.VARIANTS_OVERVIEW
                )
            } else {
                state.data.description = text
                state.step = 'basePrice'
                await sendTelegramMessage(chatId, '💵 Enter base price (numeric):')
            }
            break

        case 'basePrice':
            const bp = parseFloat(text)
            if (isNaN(bp)) {
                await sendTelegramMessage(chatId, '❌ Invalid. Enter a number for base price:')
            } else {
                state.data.basePrice = bp
                if (state.editing) {
                    state.editing = false
                    await sendTelegramMessage(chatId,
                        `✅ Base price updated.\n\n${formatProductOverview(state.data)}`,
                        KEYBOARDS.VARIANTS_OVERVIEW
                    )
                } else {
                    state.step = 'categoryId'
                    await sendTelegramMessage(chatId, '📁 Enter category ID:')
                }
            }
            break

        case 'categoryId':
            if (state.editing) {
                state.data.categoryId = text
                state.editing = false
                await sendTelegramMessage(chatId,
                    `✅ Category updated.\n\n${formatProductOverview(state.data)}`,
                    KEYBOARDS.VARIANTS_OVERVIEW
                )
            } else {
                state.data.categoryId = text
                state.step = 'tags'
                await sendTelegramMessage(chatId, '🏷️ Enter tags (comma-separated):')
            }
            break

        case 'tags':
            if (state.editing) {
                state.data.tags = text.split(',').map(t => t.trim())
                state.editing = false
                await sendTelegramMessage(chatId,
                    `✅ Tags updated.\n\n${formatProductOverview(state.data)}`,
                    KEYBOARDS.VARIANTS_OVERVIEW
                )
            } else {
                state.data.tags = text.split(',').map(t => t.trim())
                state.step = 'variants'
                await sendTelegramMessage(chatId,
                    formatProductOverview(state.data),
                    KEYBOARDS.VARIANTS_OVERVIEW
                )
            }
            break

        case 'variants':
            if (text === '➕ Add Variant') {
                state.variantStep = 'colorName'
                state.variant = { color: { name: '', hex: '', id: '' }, price: 0, stock: 0, imageUrls: [], videoUrls: [] }
                await sendTelegramMessage(chatId, '🎨 Enter color name (e.g. light green suede):')
            }
            else if (text === '✏️ Edit') {
                state.step = 'edit_select'
                await sendTelegramMessage(chatId, '✏️ Which field to edit?', KEYBOARDS.EDIT_FIELDS)
            }
            else if (text === '✅ Publish') {
                await handleProductCreation(chatId, state.data)
            }
            else if (text === '❌ Cancel') {
                resetUserState(chatId)
                await sendTelegramMessage(chatId, '🚫 Cancelled. /start or ➕ New Product.', KEYBOARDS.NEW)
            }
            break

        case 'edit_select':
            if (['Name', 'Brand', 'Description', 'Base Price', 'Category', 'Tags'].includes(text)) {
                state.editing = true
                state.step = {
                    Name: 'name', Brand: 'brand', Description: 'description',
                    'Base Price': 'basePrice', Category: 'categoryId', Tags: 'tags'
                }[text]!
                const cur = (state.data as any)[state.step]
                await sendTelegramMessage(chatId,
                    `🖊️ Current ${text}: ${Array.isArray(cur) ? cur.join(',') : cur}\nEnter new ${text.toLowerCase()}:`
                )
            }
            else if (text === 'Variants') {
                state.step = 'variants'
                await sendTelegramMessage(chatId, formatProductOverview(state.data), KEYBOARDS.VARIANTS_OVERVIEW)
            }
            else if (text === '⬅️ Back') {
                state.step = 'variants'
                await sendTelegramMessage(chatId, formatProductOverview(state.data), KEYBOARDS.VARIANTS_OVERVIEW)
            }
            else if (text === '❌ Cancel') {
                resetUserState(chatId)
                await sendTelegramMessage(chatId, '🚫 Cancelled. /start or ➕ New Product.', KEYBOARDS.NEW)
            }
            else {
                await sendTelegramMessage(chatId, '❓ Pick one of the buttons.', KEYBOARDS.EDIT_FIELDS)
            }
            break

        default:
            // This will never trigger for a valid step
            await sendTelegramMessage(chatId, '❓ Unknown step. Type /start to restart.')
    }

    state.processing = false
    return NextResponse.json({ ok: true })
}
