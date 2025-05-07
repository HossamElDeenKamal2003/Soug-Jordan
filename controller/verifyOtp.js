const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// Initialize WhatsApp client
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// Event listeners
client.on('qr', (qr) => {
    console.log('QR RECEIVED');
    qrcode.generate(qr, { small: true });
});

client.on('authenticated', () => {
    console.log('AUTHENTICATED');
});

client.on('auth_failure', (msg) => {
    console.error('AUTHENTICATION FAILURE', msg);
});

client.on('ready', () => {
    console.log('CLIENT READY');
});

client.on('disconnected', (reason) => {
    console.log('CLIENT DISCONNECTED', reason);
});

// Initialize the client
const initialize = async () => {
    await client.initialize();
};

// Send a message
const sendMessage = async (number, message) => {
    try {
        const formattedNumber = number.replace(/[^\d]/g, '');
        const sanitizedNumber = formattedNumber.includes('@c.us')
            ? formattedNumber
            : `${formattedNumber}@c.us`;

        const result = await client.sendMessage(sanitizedNumber, message);
        return { success: true, result };
    } catch (error) {
        console.error('Error sending message:', error);
        return { success: false, error: error.message };
    }
};


// Get chats
const getChats = async () => {
    try {
        const chats = await client.getChats();
        return { success: true, chats };
    } catch (error) {
        console.error('Error getting chats:', error);
        return { success: false, error: error.message };
    }
};

module.exports = {
    initialize,
    sendMessage,
    getChats
};
