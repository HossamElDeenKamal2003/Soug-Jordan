const mongoose = require('mongoose');
const favouriteSchema = new mongoose.Schema({
    userId: {
        type: String
    },
    productId: {
        type: String
    }
});

const favouriteModel = mongoose.model('favourite', favouriteSchema);

module.exports = favouriteModel;