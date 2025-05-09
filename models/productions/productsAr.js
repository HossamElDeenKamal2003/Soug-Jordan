const mongoose = require('mongoose');
const moment = require('moment-timezone');

const productSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        
    },
    title: {
        type: String,
        
    },
    description:{
        type: String,
        
    },
    location: {
        type: String
    },
    content: {
        type: String,
    
    },
    price: {
        type: Number,
    },
    condition:{
        type: String,
    },
    category: {
        type: String
    },
    gearType:{
        type: String
    },
    fuelType:{
        type: String
    },
    is40W:{
        type: String
    },
    metaCategory: {
        type: String,
    },
    carType: {
        type: String
    },
    modelCar: {
        type: String
    },
    special: {
        type: String
    },
    images: [{
        type: String 
    }],
    global: {
        type: Boolean,
        default: true
    },
    viewers: {
        type: []
    },
    carDetails: {
        type: String
    },
    // lands
    landTo:{
        type: String
    },
    spaceLand:{
        type: String,
    },
    owner:{
        type: String
    },
    marhon: {
        type: String
    },
    nearTo:{
        type:[]
    },
    direction:{
        type: String
    },
    adNumber: {
        type: String
    },
    mileage:{
        type: String
    },
    carRate:{
        type: String
    },
    saleState:{
        type: String
    },
    // building
    numberOfrooms:{
        type: String
    },
    numberOfbathrooms:{
        type: String
    },
    buildingSpace: {
        type: String
    },
    buildingFloor: {
        type: String
    },
    buildingAge:{
        type: String
    },
    mafrosha:{
        type: String
    },
    viewers: {
        type: []
    },
    createdAt: {
        type: Date,
        default: () => moment.tz('Asia/Amman').toDate()
    },
});

const productsAr = mongoose.model('productsAr', productSchema);

module.exports = productsAr;
