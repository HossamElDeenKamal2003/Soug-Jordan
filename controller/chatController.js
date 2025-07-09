const Conversation = require('../models/chat/conversation');
const Message = require('../models/chat/messages');
const mongoose = require('mongoose');
const createError = require('http-errors');
const {sendNotification} = require('../firebase');
const User = require('../models/users');
const notification = require('../models/notifications');
const io = require('../server');

// Create a new conversation
const createConversation = async (req, res) => {
    try {
        const { participants, name, isGroupChat } = req.body;

        // Validate participants
        if (!participants || participants.length < 2) {
            return res.status(400).json({ message: "A conversation requires at least two participants." });
        }

        // Check if a conversation with the same participants already exists
        const existConversation = await Conversation.findOne({
            'participants.user': { $all: participants.map(p => p.user) },
            isGroupChat
        });

        if (existConversation) {
            return res.status(200).json({
                message: "Conversation already exists.",
                conversation: existConversation.toJSON()
            });
        }

        // Extract user IDs for the `users` array
        const users = participants.map(p => p.user);

        // Create the conversation
        const conversation = new Conversation({
            participants,
            users, // Add users extracted from participants
            name,
            isGroupChat,
            conversationId: new mongoose.Types.ObjectId() // Explicitly assign a new ObjectId if needed
        });

        // Assign _id to conversationId
        conversation.conversationId = conversation._id;

        // Save the conversation
        await conversation.save();

        res.status(201).json({
            message: "Conversation created successfully.",
            conversation: conversation.toJSON() // conversationId will be part of the JSON
        });
    } catch (error) {
        res.status(500).json({ message: "Error creating conversation.", error: error.message });
    }
};

const getConversationsByUserId = async (req, res, next) => {
    try {
        const { userId } = req.params;

        // Fetch conversations with the given userId and not deleted
        const conversations = await Conversation.find({
            'participants.user': userId,
            deleted: false
        })
        .populate('participants.user', 'username email')
        .populate('messages')
        .sort({ 'messages.createdAt': -1 }); // Sort by the latest message timestamp

        // If there are no conversations, return an empty array
        if (!conversations || conversations.length === 0) {
            return res.status(200).json({ conversations: [] });
        }

        // Process conversations to get the most recent message for each
        const conversationsWithLastMessage = await Promise.all(
            conversations.map(async (conversation) => {
                const lastMessage = await Message.findOne({
                    conversationId: conversation._id,
                    $or: [{ senderId: userId }, { receiverId: userId }]
                })
                .sort({ createdAt: -1 }) // Sort messages to get the latest
                .lean();

                return {
                    conversationId: conversation.conversationId,
                    participants: conversation.participants,
                    lastMessage: lastMessage || null
                };
            })
        );

        // Sort conversations by the most recent message timestamp
        const sortedConversations = conversationsWithLastMessage.sort((a, b) => {
            const lastMessageA = a.lastMessage ? new Date(a.lastMessage.createdAt) : 0;
            const lastMessageB = b.lastMessage ? new Date(b.lastMessage.createdAt) : 0;
            return lastMessageB - lastMessageA; // Sort by most recent first
        });

        res.status(200).json({ conversations: sortedConversations });
    } catch (error) {
        next(error);
    }
};


// Update conversation
const updateConversation = async (req, res, next) => {
    try {
        const { conversationId } = req.params;
        const updates = req.body;

        const conversation = await Conversation.findByIdAndUpdate(
            conversationId,
            { ...updates, updatedAt: Date.now() },
            { new: true }
        );

        if (!conversation) {
            throw createError(404, "Conversation not found.");
        }

        res.json({
            message: "Conversation updated successfully.",
            conversation
        });
    } catch (error) {
        next(error);
    }
};

// Soft delete conversation
const deleteConversation = async (req, res, next) => {
    try {
        const { conversationId } = req.params;

        const conversation = await Conversation.findOneAndUpdate(
            { _id: conversationId, deleted: false },
            { deleted: true },
            { new: true }
        );

        if (!conversation) {
            throw createError(404, "Conversation not found or already deleted.");
        }

        res.json({
            message: "Conversation deleted successfully.",
            conversation
        });
    } catch (error) {
        next(error);
    }
};

// controller/chatController.js

const getConversationById = async (req, res, next) => {
    try {
        const { id: conversationId } = req.params;
        const userId = req.header('userId');
        if (!conversationId) {
            return res.status(400).json({ message: "Missing conversationId in URL." });
        }
        if (!userId) {
            return res.status(400).json({ message: "Missing userId in header." });
        }

        const conversation = await Conversation.findById(conversationId)
            .populate('participants.user', 'username email');

        if (!conversation) {
            throw createError(404, "Conversation not found.");
        }

        const convId = new mongoose.Types.ObjectId(conversationId);
        const recvId = new mongoose.Types.ObjectId(userId);

        const messages = await Message.find({ conversationId: convId })
            .populate('senderId', 'username email')
            .populate('receiverId', 'username email');

        res.json({
            message: "Messages retrieved successfully.",
            conversation,
            messages
        });

        await Message.updateMany(
            { conversationId: convId, receiverId: recvId, status: { $ne: 'read' } },
            { $set: { status: 'read' } }
        );
    } catch (error) {
        next(error);
    }
};

const sendMessage = async (req, res, next) => {
    try {
        const { id: conversationId } = req.params;
        const { senderId, text, receiverId, title, imageUrl, description } = req.body;

        if (!conversationId || !senderId || !text || !receiverId) {
            return res.status(400).json({message: 'Missing Required Fields'})
        }

        // Save the message
        const message = new Message({
            conversationId,
            senderId,
            title: title || false,
            receiverId,
            imageUrl,
            description,
            text,
            status: 'sent'
        });

        await message.save();
        console.log("Message saved:", message);
        // Emit Socket.IO events
        if (global.io) {
            global.io.emit(`newMessage/${receiverId}`, message);
            global.io.emit(`internalMessages/${conversationId}`, message);
            // Emit event to notify client to mark message as read
            global.io.emit(`markAsRead/${receiverId}`, { userId: receiverId, messageId: message._id });
        }
        console.log("Socket events emitted for new message");

        // Create a notification in DB
        const newNotification = new notification({
            userId: receiverId,
            postId: "",
            title: 'New Message',
            body: 'You have received a new message.',
            type: 'Message',
            isSeen: false,
        });

        await newNotification.save();

        // Fetch receiver's FCM token
        const receiver = await User.findById(receiverId).select('userFCMToken');
        // // Optionally, return sender's user data
        const userData = await User.findById(senderId).select('-password');
        res.status(200).json({
            message: "Message sent successfully",
            messageData: message,
            userData
        });
        // Send push notification if token exists
        console.log("Receiver", receiver);
        if (receiver && receiver.userFCMToken) {
            await sendNotification(receiver.userFCMToken, {
                title: "New Message",
                body: "You have received a new message.",
            });
            console.log("Push notification sent to receiver:", receiverId);
        }


    } catch (error) {
        next(error);
    }
};

const setupChatSockets = (io) => {
    io.on("connection", (socket) => {
        console.log("Socket connected", socket.id);

        // Delivered
        socket.on("messageDelivered", async ({ messageId }) => {
            console.log("Message delivered event received for messageId:##########################");
            try {
                await Message.findByIdAndUpdate(messageId, { status: 'delivered' });
            } catch (err) {
                console.error("Error setting message as delivered:", err);
            }
        });
        socket.on("markAsRead", async ({ messageId, userId }) => {
            try {
                console.log("Message delivered event received for messageId:##########################");

                const message = await Message.findById(messageId);
                if (!message) return;

                if (String(message.receiverId) === String(userId)) {
                    await Message.findByIdAndUpdate(messageId, { status: 'read' });
                    global.io.emit(`messageRead/${messageId}`, { messageId, userId, isSeen: true });
                }
            } catch (err) {
                console.error("Error marking message as read:", err);
            }
        });
    });
};

const getAllMessages = async (req, res, next) => {
    try {
        const { id: conversationId } = req.params;
        const userId = req.header('userId');
        if (!conversationId) {
            return res.status(400).json({ message: "Missing conversationId in URL." });
        }
        if (!userId) {
            return res.status(400).json({ message: "Missing userId in header." });
        }
        console.log("userId", userId);
        console.log("conversationId", conversationId);
        // Correct usage: call ObjectId as a function
        const convId = new mongoose.Types.ObjectId(conversationId);
        const recvId = new mongoose.Types.ObjectId(userId);
        const messages = await Message.find({ conversationId: convId })
            .populate('senderId', 'username email')
            .populate('receiverId', 'username email');

        res.json({
            message: "Messages retrieved successfully.",
            messages
        });
        await Message.updateMany(
            { conversationId: convId, receiverId: recvId, status: { $ne: 'read' } },
            { $set: { status: 'read' } }
        );


    } catch (error) {
        next(error);
    }
};
// Get all conversations with last message
// Get all conversations with last message and isSeen property
// Check if user is sender or receiver and set isSeen accordingly
const getAllConversations = async (req, res, next) => {
    try {
        const { id: userId } = req.params;

        const conversations = await Conversation.find({
            'participants.user': userId,
            deleted: false
        })
            .populate('participants.user', 'username email')
            .populate('messages');

        const conversationsWithLastMessage = await Promise.all(
            conversations.map(async (conversation) => {
                const lastMessage = await Message.findOne({
                    conversationId: conversation._id,
                    $or: [{ senderId: userId }, { receiverId: userId }]
                })
                    .sort({ createdAt: -1 })
                    .lean();

                if (lastMessage) {
                    if (String(lastMessage.senderId) === String(userId)) {
                        lastMessage.isSeen = true;
                    } else if (String(lastMessage.receiverId) === String(userId)) {
                        lastMessage.isSeen = lastMessage.status === 'read';
                    } else {
                        lastMessage.isSeen = false;
                    }
                }

                return {
                    conversationId: conversation.conversationId,
                    participants: conversation.participants,
                    lastMessage: lastMessage || null
                };
            })
        );
        res.json({ conversations: conversationsWithLastMessage });
    } catch (error) {
        next(error);
    }
};
const markMessageDelivered = async (req, res, next) => {
    try {
        const { messageId } = req.body;
        if (!messageId) return res.status(400).json({ message: "Missing messageId" });

        await Message.findByIdAndUpdate(messageId, { status: 'delivered' });
        // Optionally emit socket event here
        if (global.io) {
            global.io.emit(`messageDelivered/${messageId}`);
        }
        res.json({ message: "Message marked as delivered." });
    } catch (error) {
        next(error);
    }
};

const markMessagesRead = async (req, res, next) => {
    try {
        const { conversationId, userId } = req.body;
        if (!conversationId || !userId) return res.status(400).json({ message: "Missing conversationId or userId" });

        // Update all messages in the conversation where receiver is the user
        await Message.updateMany(
            { conversationId, receiverId: userId, status: { $ne: 'read' } },
            { $set: { status: 'read' } }
        );
        // Optionally emit socket event here
        if (global.io) {
            global.io.emit(`messagesRead/${conversationId}/${userId}`);
        }
        res.json({ message: "All messages marked as read." });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createConversation,
    getConversationsByUserId,
    updateConversation,
    deleteConversation,
    getConversationById,
    sendMessage,
    getAllConversations,
    getAllMessages,
    setupChatSockets,
    markMessageDelivered,
    markMessagesRead
};