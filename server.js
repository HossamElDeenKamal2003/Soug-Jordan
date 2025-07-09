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
        res.send(`
  <html>
  <head>
    <meta property="al:ios:url" content="jordensouqqq://productDetails/${productId}">
    <meta property="al:ios:app_store_id" content="738HFR9XNT">
    <meta property="al:ios:app_name" content="Jordensouq">
    <meta property="al:web:url" content="https://backend.jordan-souq.com/productDetails/${productId}">
    <script>
      // Try universal link first
      window.location.href = "https://backend.jordan-souq.com/productDetails/${productId}";
      setTimeout(function() {
        // Fallback to website if app doesn't open
        window.location.href = "https://frontendsouqjordan.vercel.app/details/${productId}";
      }, 500);
    </script>
  </head>
  <body>
    <a href="https://backend.jordan-souq.com/productDetails/${productId}">
      Open in App
    </a>
  </body>
  </html>
`);
    }
})

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
const { setupChatSockets } = require('./controller/chatController');
setupChatSockets(io);
app.use('/api/conversations', conversationRoutes);
app.use('/users', users);
app.use('/product', productions);
app.use('/comments', comments);
app.use('/admin', admin);
app.get('/', (req, res) => {
    res.send('Express Server Running');
});

// Example of sending the app download links (android and ios)
app.get('/invite', async (req, res) => {
    try {
        const androidLink = "https://play.google.com/store/apps/details?id=com.Shehab.Jordensouqq";
        const iosLink = "https://apps.apple.com/us/app/%D8%B3%D9%88%D9%82-%D8%A7%D9%84%D8%A3%D8%B1%D8%AF%D9%86/id6744337417?l=ar";
        const bankAccount = "0948108510400004";
        const iban = "0670000948108510400004";
        const click = "00797185955";
        const profit = .01;
        const bankName = "AlAhly";
        const display = true;
        res.status(200).json({ android: androidLink, ios: iosLink, bankAccount: bankAccount, profit: profit, iban: iban, click: click, bankName: bankName, display: display });
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

app.patch('/:userId/:notificationId', async (req, res) => {
    const { userId, notificationId } = req.params;

    try {
        const notification2 = await notification.findOneAndUpdate(
            { _id: notificationId, userId: userId },
            { isSeen: true },
            { new: true }
        );

        if (!notification2) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        res.status(200).json(notification2);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: error.message });
    }
});

const { sendNotification } = require('./firebase');
app.post('/sendNotificationAPI',async (req, res) => {
    try {
        const { token, title, body, chatId } = req.body;

        if (!token || !title || !body) {
            return res.status(400).json({ message: "token, title, and body are required" });
        }

        const message = { title, body };
        const result = await sendNotification(token, message, chatId);

        if (result.success) {
            return res.status(200).json({ message: "Notification sent", data: result.response });
        } else {
            return res.status(500).json({ message: result.message });
        }
    } catch (error) {
        console.error("Unexpected error:", error);
        return res.status(500).json({ message: "Server error" });
    }
});

// Server listening on the given port (default to 3000)
const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`App Running on Port ${port}`);
});
