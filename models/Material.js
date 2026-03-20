const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema({
  materialCode: { type: String, required: true, unique: true, index: true },
  materialType: { type: String, required: true },
  baseUoM: { type: String, required: true },
  materialGroup: { type: String, default: '' },
  materialDescription: { type: String, default: '' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

materialSchema.index({ materialDescription: 'text', materialCode: 'text' });

module.exports = mongoose.model('Material', materialSchema);
