const admin = require('firebase-admin');
const serviceAccount = require('./jordensouq-firebase-adminsdk-y38g4-77384e28cc.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const sendNotification = async (token, message, chatId = null, retries = 3) => {
    const payload = {
        notification: {
            title: message.title,
            body: message.body,
        },
        data: {
            ...(chatId && { chatId }), // Add chatId if defined
            type: "Message",
        },
    };

    try {
        const response = await admin.messaging().send(payload);
        console.log('Notification sent successfully:', response);
        return response;
    } catch (error) {
        console.error('Error sending notification:', error);

        // Handle invalid FCM token or invalid argument errors gracefully
        if (error.errorInfo && error.errorInfo.code === 'messaging/invalid-argument') {
            console.log(`The token ${token} is invalid or not a valid FCM registration token.`);
            return { success: false, message: 'Invalid FCM registration token' };
        }

        if (error.errorInfo && error.errorInfo.code === 'messaging/registration-token-not-registered') {
            console.log(`The token ${token} is no longer valid.`);
            return { success: false, message: 'Token is no longer valid' };
        }

        // Retry for internal server errors
        if (error.code === 'messaging/internal-error' && retries > 0) {
            console.log(`Retrying... (${3 - retries + 1})`);

            await new Promise(resolve => setTimeout(resolve, 2000));
            return sendNotification(token, message, retries - 1);
        }

        throw error;
    }
};
const productNotification = async (token, message, postId = null, retries = 3) => {
    const payload = {
        notification: {
            title: message.title,
            body: message.body,
        },
        data: {
            ...(postId && { postId }), // Add chatId if defined
            type: "Message",
        },
    };

    try {
        const response = await admin.messaging().send(payload);
        console.log('Notification sent successfully:', response);
        return response;
    } catch (error) {
        console.error('Error sending notification:', error);

        // Handle invalid FCM token or invalid argument errors gracefully
        if (error.errorInfo && error.errorInfo.code === 'messaging/invalid-argument') {
            console.log(`The token ${token} is invalid or not a valid FCM registration token.`);
            return { success: false, message: 'Invalid FCM registration token' };
        }

        if (error.errorInfo && error.errorInfo.code === 'messaging/registration-token-not-registered') {
            console.log(`The token ${token} is no longer valid.`);
            return { success: false, message: 'Token is no longer valid' };
        }

        // Retry for internal server errors
        if (error.code === 'messaging/internal-error' && retries > 0) {
            console.log(`Retrying... (${3 - retries + 1})`);

            await new Promise(resolve => setTimeout(resolve, 2000));
            return sendNotification(token, message, retries - 1);
        }

        throw error;
    }
};

module.exports = {sendNotification, productNotification};
