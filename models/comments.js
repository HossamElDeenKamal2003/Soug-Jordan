// models/comment.js
const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    postId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
        required: true
    },
    parentId: { // For replies
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment',
        //default: null
    },
    commenterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    commenterName: {
        type: String,
        //required: true
    },
    content: {
        type: String,
        //required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Comment = mongoose.model('Comment', commentSchema);
module.exports = Comment;
