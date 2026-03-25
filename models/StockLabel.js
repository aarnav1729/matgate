const mongoose = require('mongoose');

const stockLabelSchema = new mongoose.Schema({
  stockLabelId: { type: String, required: true, unique: true },
  inwardBatchId: { type: String, required: true },
  palletSequence: { type: Number, required: true },
  palletCount: { type: Number, required: true },
  materialCode: { type: String, required: true },
  materialDescription: { type: String, default: '' },
  materialType: { type: String, default: '' },
  baseUoM: { type: String, default: '' },
  initialQuantity: { type: Number, required: true },
  currentQuantity: { type: Number, required: true },
  dmrNumber: { type: String, required: true },
  dmrDate: { type: Date, required: true },
  make: { type: String, default: '' },
  vendorName: { type: String, required: true },
  inwardPrintedBy: { type: String, required: true },
  inwardPrintedByName: { type: String, default: '' },
  inwardPrintedAt: { type: Date, default: Date.now },
  lastIssuedAt: { type: Date, default: null },
  lastIssuedBy: { type: String, default: '' },
  lastIssuedByName: { type: String, default: '' },
  revision: { type: Number, default: 1 },
  status: { type: String, enum: ['active', 'depleted'], default: 'active' },
  qrLookupValue: { type: String, default: '' },
  qrCodeData: { type: String, default: '' },
  qrPayload: { type: String, default: '' }
}, { timestamps: true });

stockLabelSchema.index({ inwardBatchId: 1, palletSequence: 1 });
stockLabelSchema.index({ materialCode: 1, status: 1 });
stockLabelSchema.index({ vendorName: 1 });
stockLabelSchema.index({ inwardPrintedAt: -1 });
stockLabelSchema.index({ qrLookupValue: 1 });

module.exports = mongoose.model('StockLabel', stockLabelSchema);
