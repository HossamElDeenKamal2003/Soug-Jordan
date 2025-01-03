const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
    participants: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        role: {
            type: String,
            enum: ['admin', 'member'],
            default: 'member'
        }
    }],

    users: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],

    conversationId: {
        type: mongoose.Schema.Types.ObjectId, // Persisted field for conversationId
    },
    messages: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    }],
    isGroupChat: {
        type: Boolean,
        default: false
    },
    name: {
        type: String,
        trim: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    deleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

// Include virtuals in JSON output (optional if no other virtuals exist)
conversationSchema.set('toJSON', { virtuals: true });
conversationSchema.set('toObject', { virtuals: true });

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation;
