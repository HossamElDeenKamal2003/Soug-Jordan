require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const socketIo = require('socket.io');
const http = require('http');

// Initialize Express app
const app = express();

// Middleware setup
app.use(express.json());
app.use(cors());
app.use(morgan('dev'));

// Initialize HTTP server and Socket.IO
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
});

// Attach Socket.IO to global object for access in other files
global.io = io;
module.exports = io
console.log("Socket.IO initialized:", !!global.io);

// Handle new Socket.IO connections
io.on('connection', (socket) => {
    console.log("A client connected:", socket.id);
    // You can add further socket event listeners here
});

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// Environment Variables (JWT_SECRET and others)
const jwtSecret = process.env.JWT_SECRET;

// Routes Setup
const users = require('./router/userRouter');
const productions = require('./router/productionsRouter');
const comments = require('./router/comments');
const conversationRoutes = require('./router/chatRouter');
const admin = require('./router/adminRouter');

app.use('/api/conversations', conversationRoutes);
app.use('/users', users);
app.use('/product', productions);
app.use('/comments', comments);
app.use('/admin', admin);

// Basic Route to confirm server is running
app.get('/', (req, res) => {
    res.send('Express Server Running');
});

// Example of sending the app download links (android and ios)
app.get('/invite', async (req, res) => {
    try {
        const androidLink = "http://A7A-android.com";
        const iosLink = "http://A7A-ios.com";
        res.status(200).json({ android: androidLink, ios: iosLink });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message });
    }
});

// Create conversation API (Chat related)
app.post('/conversations', async (req, res) => {
    const { participants } = req.body;
    try {
        let conversation = await Conversation.findOne({
            participants: { $all: participants, $size: participants.length }
        });

        if (!conversation) {
            conversation = new Conversation({ participants });
            await conversation.save();
        }
        res.status(201).json({ conversationId: conversation._id });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create conversation' });
    }
});

// Send message API (Chat related)
app.post('/messages', async (req, res) => {
    const { conversationId, from, to, msg, media, mediaType } = req.body;

    try {
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        const message = new Message({ conversationId, from, to, msg, media, mediaType });
        await message.save();

        io.to(conversationId.toString()).emit('new message', message);

        res.status(201).json(message);
    } catch (error) {
        res.status(500).json({ error: 'Failed to send message' });
    }
});
const notification = require('./models/notifications');
const User = require('./models/users');
app.get('/notification/:id', async (req, res) => {
    const userId = req.params.id;
    try {
        const notifications = await notification.find({ userId: userId }).lean();
        
        const userData = await User.findOne({ _id: userId });
        const notificationsWithUserData = notifications.map(notification => {
            return { ...notification, userData }; 
        });
        
        res.status(200).json({ notifications: notificationsWithUserData });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: error.message });
    }
});



// Server listening on the given port (default to 3000)
const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`App Running on Port ${port}`);
});