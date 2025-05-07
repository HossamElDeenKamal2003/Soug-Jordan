require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const socketIo = require('socket.io');
const http = require('http');
const whatsappController = require('./controller/verifyOtp');

// Call initialize once when the server starts
whatsappController.initialize()
    .then(() => console.log('WhatsApp initialized'))
    .catch((err) => console.error('WhatsApp init error:', err));

const app = express();

// Middleware setup
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));
app.use(cors());
app.use(morgan('dev'));
const path = require('path');
app.use(express.static(path.join(__dirname, 'views')));
// Serve static files from .well-known directory
app.use('/.well-known', express.static(path.join(__dirname, '.well-known'), {
    setHeaders: (res, path) => {
        if (path.includes('apple-app-site-association')) {
            res.setHeader('Content-Type', 'application/json');
        }
        if (path.includes('assetlinks.json')) {
            res.setHeader('Content-Type', 'application/json');
        }
    }
}));

app.get('/productDetails/:productId', (req, res) => {
    const { productId } = req.params;
    const userAgent = req.headers['user-agent'] || '';
    const isAndroid = userAgent.match(/android/i);
    const isiOS = userAgent.match(/iphone|ipad|ipod/i);

    if (isAndroid) {
        // Android Intent
        res.send(`
      <html>
      <head>
        <script>
          window.location.href = "intent://backend.jordan-souq.com/productDetails/${productId}#Intent;scheme=https;package=com.Shehab.Jordensouqq;end";
          setTimeout(function() {
            window.location.href = "https://frontendsouqjordan.vercel.app/details/${productId}";
          }, 500);
        </script>
      </head>
      <body>
        <a href="intent://backend.jordan-souq.com/productDetails/${productId}#Intent;scheme=https;package=com.Shehab.Jordensouqq;end">
          Open in App
        </a>
      </body>
      </html>
    `);
    } else if (isiOS) {
        // iOS Universal Link
        res.send(`
      <html>
      <head>
        <meta property="al:ios:url" content="jordensouqq://productDetails/${productId}">
        <meta property="al:ios:app_store_id" content="YOUR_APP_STORE_ID">
        <meta property="al:ios:app_name" content="Your App Name">
        <script>
          window.location.href = "https://frontendsouqjordan.vercel.app/details/${productId}";
        </script>
      </head>
      <body>
        <a href="https://backend.jordan-souq.com/productDetails/${productId}">
          Open in App
        </a>
      </body>
      </html>
    `);
    } else {
        res.redirect(`https://frontendsouqjordan.vercel.app/details/${productId}`);
    }
});

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
        const bankAccount = "892038921";
        const profit = .1;
        const bankName = "AlAhly";
        const display = true;
        res.status(200).json({ android: androidLink, ios: iosLink, bankAccount: bankAccount, profit: profit, bankName: bankName, display: display });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message });
    }
});

// // Create conversation API (Chat related)
// app.post('/conversations', async (req, res) => {
//     const { participants } = req.body;
//     try {
//         let conversation = await Conversation.findOne({
//             participants: { $all: participants, $size: participants.length }
//         });
//
//         if (!conversation) {
//             conversation = new Conversation({ participants });
//             await conversation.save();
//         }
//         res.status(201).json({ conversationId: conversation._id });
//     } catch (error) {
//         res.status(500).json({ error: 'Failed to create conversation' });
//     }
// });
//
// // Send message API (Chat related)
// app.post('/messages', async (req, res) => {
//     const { conversationId, from, to, msg, media, mediaType } = req.body;
//
//     try {
//         const conversation = await Conversation.findById(conversationId);
//         if (!conversation) {
//             return res.status(404).json({ error: 'Conversation not found' });
//         }
//
//         const message = new Message({ conversationId, from, to, msg, media, mediaType });
//         await message.save();
//
//         io.to(conversationId.toString()).emit('new message', message);
//
//         res.status(201).json(message);
//     } catch (error) {
//         res.status(500).json({ error: 'Failed to send message' });
//     }
// });
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
