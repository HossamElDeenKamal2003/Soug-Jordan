const mongoose = require('mongoose');
const moment = require('moment-timezone'); // Import moment-timezone

const notificationSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
    postId: {
        type: String
    },
    body: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        required: true,
    },
    createdAt: {
        type: String, // Store as a formatted string
    },
});

// Middleware to set createdAt with Cairo time zone
notificationSchema.pre('save', function (next) {
    if (!this.createdAt) {
        this.createdAt = moment().tz('Africa/Cairo').format('YYYY-MM-DD HH:mm:ss'); // Format date to Cairo time zone
    }
    next();
});

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
