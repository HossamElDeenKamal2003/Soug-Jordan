// controllers/commentController.js
const Comment = require('../models/comments');
const Post = require('../models/productions/production');
const User = require('../models/users');
const replySchema = require('../models/reply');
const Replay = require('../models/reply');
const {sendNotification} = require('../firebase');
const follow = require('../models/follow');
const Notification = require('../models/notifications');
// Create a comment
const createComment = async (req, res) => {
    try {
        const { userId, postId, commenterId, content, parentId } = req.body;

        // Validate commenter
        const user = await User.findById(commenterId);
        if (!user) {
            return res.status(404).json({ message: 'Commenter not found' });
        }

        // Validate post and get post owner
        const post = await Post.findById(postId).populate('userId', 'username userFCMToken');
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // Validate parent comment if replying to a comment
        if (parentId) {
            const parentComment = await Comment.findById(parentId);
            if (!parentComment) {
                return res.status(404).json({ message: 'Parent comment not found' });
            }
        }

        // Create and save the new comment
        const newComment = new Comment({
            userId,
            postId,
            parentId: parentId || null,
            commenterId: user._id,
            commenterName: user.username,
            content,
        });

        const savedComment = await newComment.save();

        // Notify the post owner (if it's not the commenter themselves)
        const notificationPromises = [];

        if (post.userId._id.toString() !== commenterId.toString()) {
            const ownerNotificationTitle = 'New Comment on Your Post!';
            const ownerNotificationBody = `${user.username} commented: "${content}"`;

            // Send FCM notification to post owner if they have a token
            if (post.userId.userFCMToken) {
                notificationPromises.push(
                    sendNotification(post.userId.userFCMToken, {
                        title: ownerNotificationTitle,
                        body: ownerNotificationBody
                    }, postId).catch(error => {
                        console.error(`Failed to send notification to post owner ${post.userId._id}:`, error.message);
                    })
                );
            }

            // Save notification to database for post owner
            notificationPromises.push(
                new Notification({
                    userId: post.userId._id,
                    title: ownerNotificationTitle,
                    postId,
                    body: ownerNotificationBody,
                    type: 'comment',
                    isSeen: true,
                    triggeredBy: commenterId
                }).save()
            );
        }

        // Notify followers of the post (excluding the post owner and commenter)
        const followers = await follow.find({
            postId,
            userId: { $nin: [post.userId._id, commenterId] } // Exclude owner and commenter
        }).populate('userId', 'username profileImage userFCMToken');

        const followerNotificationTitle = 'New Comment on a Post You Follow!';
        const followerNotificationBody = `${user.username} commented: "${content}"`;

        // Send notifications to followers via FCM
        followers.forEach(follower => {
            const followerUser = follower.userId;
            if (followerUser?.userFCMToken) {
                notificationPromises.push(
                    sendNotification(followerUser.userFCMToken, {
                        title: followerNotificationTitle,
                        body: followerNotificationBody
                    }, postId).catch(error => {
                        console.error(`Failed to send notification to follower ${followerUser._id}:`, error.message);
                    })
                );
            }

            // Save notification to database for followers
            notificationPromises.push(
                new Notification({
                    userId: followerUser._id,
                    title: followerNotificationTitle,
                    postId,
                    body: followerNotificationBody,
                    type: 'comment',
                    triggeredBy: commenterId
                }).save()
            );
        });

        // Wait for all notifications to complete
        await Promise.all(notificationPromises);

        // Send response
        res.status(201).json({
            message: 'Comment created successfully',
            comment: savedComment
        });

    } catch (error) {
        console.error('Error creating comment:', error);
        res.status(500).json({
            message: 'Error creating comment',
            error: error.message
        });
    }
};

const getNotification = async (req, res) => {
    const userId = req.params.id;
    try {
        // Fetch notifications for the user and populate commenter details and postId
        const notifications = await Notification.find({ userId })
            .sort({ createdAt: -1 })
            .populate({
                path: 'userId', // Populate userId (commenter data)
                select: 'username profileImage', // Include specific fields
            });

        // Return notifications along with user and postId details
        res.status(200).json({ notifications });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ message: error.message });
    }
};

const getCommentsByPostId = async function (req, res) {
    try {
        const postId = req.params.postId;

        // Find comments for the given post and populate commenterId with user data
        const comments = await Comment.find({ postId })
            .populate({ 
                path: 'commenterId', 
                select: 'username email', 
            })
            .sort({ createdAt: 1 });
        const response = comments.map(comment => ({
            ...comment._doc, // Spread the comment document
            user: comment.commenterId, // Attach user data under the 'user' key
        }));

        res.status(200).json(response);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching comments', error });
    }
};

const addReplyToComment = async function(req, res) {
    try {
        const { postId, commenterId, content, parentId } = req.body;

        // Validate user
        const user = await User.findById(commenterId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Validate post
        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // Validate parent comment
        const parentComment = await Comment.findById(parentId);
        // if (!parentComment) {
        //     return res.status(404).json({ message: 'Parent comment not found' });
        // }
 
        // Create the new reply
        const reply = new Replay({
            postId,
            parentId, // Associate this reply with the parent comment
            commenterId: user._id,
            commenterName: user.username,
            content
        });

        // Save the reply to the database
        const savedReply = await reply.save();
        res.status(200).json(savedReply);
    } catch (error) {
        res.status(500).json({ message: 'Error adding reply', error });
    }
}


module.exports = {
    createComment,
    getCommentsByPostId,
    addReplyToComment,
    getNotification
};
