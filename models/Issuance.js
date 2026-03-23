const mongoose = require('mongoose');

const issuanceSchema = new mongoose.Schema({
  issuanceId: { type: String, required: true, unique: true },
  materialCode: { type: String, required: true },
  materialDescription: { type: String, required: true },
  materialType: { type: String, default: '' },
  baseUoM: { type: String, default: '' },
  quantity: { type: Number, required: true },
  dmrNumber: { type: String, required: true },
  issuedBy: { type: String, required: true },       // username
  issuedByName: { type: String, default: '' },
  issuedAt: { type: Date, default: Date.now },
  qrLookupValue: { type: String, default: '' },     // canonical text encoded into QR
  qrCodeData: { type: String },                      // base64 QR image
  qrPayload: { type: String },                       // stored QR text (legacy or canonical)

  // Receipt tracking
  status: { type: String, enum: ['issued', 'received', 'rejected'], default: 'issued' },
  receivedBy: { type: String, default: null },
  receivedByName: { type: String, default: '' },
  receivedAt: { type: Date, default: null },
  receiptRemarks: { type: String, default: '' }
}, { timestamps: true });

issuanceSchema.index({ materialCode: 1, issuedAt: -1 });
issuanceSchema.index({ status: 1 });
issuanceSchema.index({ qrLookupValue: 1 });

module.exports = mongoose.model('Issuance', issuanceSchema);
