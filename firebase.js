const admin = require('firebase-admin');
const serviceAccount = require('./jordensouq-firebase-adminsdk-y38g4-d896960e95.json');

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
            ...(chatId && { chatId }),
            type: "Message",
        },
        token: token  // ✅ REQUIRED: who to send the message to
    };
    console.log("fcm token", token);
    try {
        const response = await admin.messaging().send(payload);
        console.log('Notification sent successfully:', response);
        return response;
    } catch (error) {
        console.error('Error sending notification:', error);

        // Handle invalid token or argument
        if (error.errorInfo?.code === 'messaging/invalid-argument') {
            console.log(`The token ${token} is invalid or not a valid FCM registration token.`);
            return { success: false, message: 'Invalid FCM registration token' };
        }

        if (error.errorInfo?.code === 'messaging/registration-token-not-registered') {
            console.log(`The token ${token} is no longer valid.`);
            return { success: false, message: 'Token is no longer valid' };
        }

        // Retry on internal error
        if (error.code === 'messaging/internal-error' && retries > 0) {
            console.log(`Retrying... (${3 - retries + 1})`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            return sendNotification(token, message, chatId, retries - 1);  // ✅ also fix argument order
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
            ...(postId && { postId }),
            type: "Message",
        },
        token: token  // ✅ This line is necessary
    };

    try {
        const response = await admin.messaging().send(payload);
        console.log('Notification sent successfully:', response);
        return response;
    } catch (error) {
        console.error('Error sending notification:', error);

        // Handle specific FCM errors
        if (error.errorInfo?.code === 'messaging/invalid-argument') {
            console.log(`The token ${token} is invalid or not a valid FCM registration token.`);
            return { success: false, message: 'Invalid FCM registration token' };
        }

        if (error.errorInfo?.code === 'messaging/registration-token-not-registered') {
            console.log(`The token ${token} is no longer valid.`);
            return { success: false, message: 'Token is no longer valid' };
        }

        // Retry for internal server errors
        if (error.code === 'messaging/internal-error' && retries > 0) {
            console.log(`Retrying... (${3 - retries + 1})`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            return productNotification(token, message, postId, retries - 1);  // ✅ Correct recursive call
        }

        throw error;
    }
};


module.exports = {sendNotification, productNotification};
