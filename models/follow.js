const mongoose = require('mongoose');

const followerSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Types.ObjectId, // Correctly references ObjectId
        required: true, // Add validation if needed
        ref: 'User', // Optional: reference to the User model
    },
    postId: {
        type: mongoose.Types.ObjectId, // Correctly references ObjectId
        required: true, // Add validation if needed
        ref: 'Post', // Optional: reference to the Post model
    },
});

const Follower = mongoose.model('Follower', followerSchema);

module.exports = Follower;
