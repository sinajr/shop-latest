require('dotenv').config();

const TELEGRAM_BOT_TOKEN = '7692567895:AAHAM_ngd_WCGn_MvPMV29qkqlDkVmRKlHg';
const WEBHOOK_URL = 'https://elitestufftrade.com/api/telegram/webhook';

console.log('🔧 Setting up webhook with:');
console.log('Bot Token:', TELEGRAM_BOT_TOKEN);
console.log('Webhook URL:', WEBHOOK_URL);

async function setupWebhook() {
    try {
        const response = await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: WEBHOOK_URL,
                    allowed_updates: ['message'],
                }),
            }
        );

        const data = await response.json();
        console.log('Response:', data);

        if (data.ok) {
            console.log('✅ Webhook set up successfully!');
        } else {
            console.error('❌ Failed to set up webhook:', data.description);
            if (data.error_code === 404) {
                console.error('This usually means the bot token is invalid or the bot was deleted');
            }
        }
    } catch (error) {
        console.error('❌ Error setting up webhook:', error);
    }
}

setupWebhook(); 