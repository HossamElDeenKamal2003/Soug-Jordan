const mongoose = require('mongoose');
const moment = require('moment-timezone');

// Helper function to convert strings to lowercase
const toLower = (v) => typeof v === 'string' ? v.toLowerCase() : v;

const productSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  title: {
    type: String,
    set: toLower
  },
  description: {
    type: String,
    set: toLower
  },
  location: {
    type: String,
    set: toLower
  },
  metaLocation: {
    type: String,
    set: toLower
  },
  ArmetaLocation: {
    type: String,
    set: toLower
  },
  ArLocation: {
    type: String,
    set: toLower
  },
  content: {
    type: String,
    set: toLower
  },
  price: {
    type: Number,
  },
  condition: {
    type: String,
    set: toLower
  },
  category: {
    type: String,
    set: toLower
  },
  gearType: {
    type: String,
    set: toLower
  },
  fuelType: {
    type: String,
    set: toLower
  },
  is40W: {
    type: String,
    set: toLower
  },
  metaCategory: {
    type: String,
    set: toLower
  },
  carType: {
    type: String,
    set: toLower
  },
  modelCar: {
    type: String,
    set: toLower
  },
  special: {
    type: String,
    set: toLower
  },
  images: {
    type: [String],
    default: [],
  },
  global: {
    type: Boolean,
    default: true,
  },
  viewers: {
    type: [],
  },
  carDetails: {
    type: String,
    set: toLower
  },
  landTo: {
    type: String,
    set: toLower
  },
  spaceLand: {
    type: String,
    set: toLower
  },
  owner: {
    type: String,
    set: toLower
  },
  marhon: {
    type: String,
    set: toLower
  },
  nearTo: {
    type: [],
  },
  direction: {
    type: String,
    set: toLower
  },
  adNumber: {
    type: String,
  },
  mileage: {
    type: String,
  },
  carRate: {
    type: String,
  },
  saleState: {
    type: String,
    set: toLower
  },
  numberOfrooms: {
    type: String,
  },
  numberOfbathrooms: {
    type: String,
  },
  buildingSpace: {
    type: String,
  },
  buildingFloor: {
    type: String,
  },
  buildingAge: {
    type: String,
  },
  floorOption: {
    type: String,
    set: toLower
  },
  arDetails: {
    type: String,
    set: toLower
  },
  buildingArea: {
    type: String
  },
  landArea: {
    type: String
  },
  unit: {
    type: String,
    set: toLower
  },
  mafrosha: {
    type: String,
    set: toLower
  },
  lastPostTimeAdded: {
    type: Date,
    default: () => moment.tz('Asia/Amman').toDate()
  },
  createdAt: {
    type: Date,
    default: () => moment.tz('Asia/Amman').toDate(),
  },
  updatedAt: {
    type: Date,
    default: () => moment.tz('Asia/Amman').toDate(),
  },
  updatedAtHistory: [{ type: Date }], // If you want to track history
});

// Add pre-save hook for array fields that might contain strings
productSchema.pre('save', function(next) {
  if (this.nearTo && Array.isArray(this.nearTo)) {
    this.nearTo = this.nearTo.map(item =>
        typeof item === 'string' ? item.toLowerCase() : item
    );
  }
  next();
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;