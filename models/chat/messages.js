const mongoose = require('mongoose');
const moment = require('moment-timezone');

// Handle time for Egyptian time zone
const handleTime = function() {
    // Get the current date and time in the Egyptian time zone
    const date = moment().tz("Africa/Cairo").format();  // ISO format: "YYYY-MM-DDTHH:mm:ssZ"
    return date;
};

const messageSchema = new mongoose.Schema({
    conversationId: {
        type: mongoose.Schema.Types.ObjectId, // Change to ObjectId
        ref: 'Conversation' // This will reference the Conversation model
    },
    title: {
        type: Boolean,
        default: false
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId, // Change to ObjectId
        ref: 'User'
    },
    receiverId: {
        type: mongoose.Schema.Types.ObjectId, // Change to ObjectId
        ref: 'User'
    },
    text: {
        type: String
    },
    imageUrl: {
        type: String
    },
    description: {
        type: String
    },
    createdAt: {
        type: Date,
        default: handleTime // Call handleTime when creating a new message
    }
});


const messages = mongoose.model('messages', messageSchema);

module.exports = messages;
