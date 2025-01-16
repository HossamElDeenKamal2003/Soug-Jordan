const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    phoneNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    password: {
        type: String,
        required: true,
    },
    username: {
        type: String,
        required: true,
    },
    userFCMToken: {
        type: String,
        default: ""
    },
    profileImage: {
        type: String,
        default: ""
    },
    coverImage: {
        type: String,
        default: ""
    },

});



const User = mongoose.model('User', userSchema);

module.exports = User;
