// models/reply.js
const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
    postId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
        required: true
    },
    parentId: { // For replies to comments
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment',
        //required: true // Required to ensure it's always associated with a comment
    },
    commenterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    commenterName: {
        type: String,
        required: true // Ensure this field is required if necessary
    },
    content: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Replay = mongoose.model('replies', replySchema);
module.exports = Replay;
