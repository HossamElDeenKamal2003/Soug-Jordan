// routes/commentRoutes.js
const express = require('express');
const router = express.Router();
const {
    createComment,
    getCommentsByPostId,
    addReplyToComment
} = require('../controller/comments');

// Create a comment
router.post('/create-comment', createComment);

// Get comments for a post
router.get('/get-comments/:postId', getCommentsByPostId);
router.post('/add-reply', addReplyToComment)
module.exports = router;
