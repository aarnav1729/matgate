const express = require('express');
const QRCode = require('qrcode');
const Issuance = require('../models/Issuance');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const router = express.Router();

function generateIssuanceId() {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const r = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `MG-${y}${m}${d}-${r}`;
}

function toIST(date) {
  return new Date(date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
}

// Create issuance (Stores only)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { materialCode, materialDescription, materialType, baseUoM, quantity, dmrNumber } = req.body;
    if (!materialCode || !quantity || !dmrNumber) {
      return res.status(400).json({ error: 'materialCode, quantity, and dmrNumber are required' });
    }

    const issuanceId = generateIssuanceId();
    const issuedAt = new Date();

    // QR payload
    const qrPayload = JSON.stringify({
      id: issuanceId,
      mat: materialCode,
      desc: materialDescription,
      qty: quantity,
      uom: baseUoM,
      dmr: dmrNumber,
      by: req.user.name,
      at: toIST(issuedAt)
    });

    // Generate QR code as data URL
    const qrCodeData = await QRCode.toDataURL(qrPayload, {
      width: 300,
      margin: 2,
      errorCorrectionLevel: 'M'
    });

    const issuance = await Issuance.create({
      issuanceId,
      materialCode,
      materialDescription: materialDescription || '',
      materialType: materialType || '',
      baseUoM: baseUoM || '',
      quantity,
      dmrNumber,
      issuedBy: req.user.username,
      issuedByName: req.user.name,
      issuedAt,
      qrCodeData,
      qrPayload
    });

    res.status(201).json(issuance);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Receive / confirm receipt (Production)
router.post('/receive/:issuanceId', authMiddleware, async (req, res) => {
  try {
    const { receiptRemarks } = req.body;
    const issuance = await Issuance.findOne({ issuanceId: req.params.issuanceId });
    if (!issuance) return res.status(404).json({ error: 'Issuance not found' });
    if (issuance.status === 'received') return res.status(400).json({ error: 'Already received' });

    issuance.status = 'received';
    issuance.receivedBy = req.user.username;
    issuance.receivedByName = req.user.name;
    issuance.receivedAt = new Date();
    issuance.receiptRemarks = receiptRemarks || '';
    await issuance.save();

    res.json(issuance);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Reject receipt
router.post('/reject/:issuanceId', authMiddleware, async (req, res) => {
  try {
    const { receiptRemarks } = req.body;
    const issuance = await Issuance.findOne({ issuanceId: req.params.issuanceId });
    if (!issuance) return res.status(404).json({ error: 'Issuance not found' });

    issuance.status = 'rejected';
    issuance.receivedBy = req.user.username;
    issuance.receivedByName = req.user.name;
    issuance.receivedAt = new Date();
    issuance.receiptRemarks = receiptRemarks || '';
    await issuance.save();

    res.json(issuance);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Scan / lookup by issuance ID (for QR scan result)
router.get('/scan/:issuanceId', authMiddleware, async (req, res) => {
  try {
    const issuance = await Issuance.findOne({ issuanceId: req.params.issuanceId }).lean();
    if (!issuance) return res.status(404).json({ error: 'Issuance not found' });
    res.json(issuance);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// List all issuances with filters
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { search, status, materialCode, dateFrom, dateTo, sortBy, sortDir, page, limit, all } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { issuanceId: { $regex: search, $options: 'i' } },
        { materialCode: { $regex: search, $options: 'i' } },
        { materialDescription: { $regex: search, $options: 'i' } },
        { dmrNumber: { $regex: search, $options: 'i' } }
      ];
    }
    if (status) filter.status = status;
    if (materialCode) filter.materialCode = materialCode;
    if (dateFrom || dateTo) {
      filter.issuedAt = {};
      if (dateFrom) filter.issuedAt.$gte = new Date(dateFrom);
      if (dateTo) filter.issuedAt.$lte = new Date(dateTo + 'T23:59:59.999Z');
    }

    const sort = {};
    if (sortBy) sort[sortBy] = sortDir === 'desc' ? -1 : 1;
    else sort.issuedAt = -1;

    if (all === 'true') {
      const issuances = await Issuance.find(filter).sort(sort).lean();
      return res.json({ issuances, total: issuances.length });
    }

    const p = parseInt(page) || 1;
    const l = Math.min(parseInt(limit) || 50, 200);
    const total = await Issuance.countDocuments(filter);
    const issuances = await Issuance.find(filter).sort(sort).skip((p - 1) * l).limit(l).lean();
    res.json({ issuances, total, page: p, limit: l, pages: Math.ceil(total / l) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get QR code image for an issuance
router.get('/qr/:issuanceId', authMiddleware, async (req, res) => {
  try {
    const issuance = await Issuance.findOne({ issuanceId: req.params.issuanceId }).lean();
    if (!issuance) return res.status(404).json({ error: 'Not found' });
    res.json({ qrCodeData: issuance.qrCodeData, qrPayload: issuance.qrPayload });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Dashboard stats
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [total, issued, received, rejected, todayCount] = await Promise.all([
      Issuance.countDocuments(),
      Issuance.countDocuments({ status: 'issued' }),
      Issuance.countDocuments({ status: 'received' }),
      Issuance.countDocuments({ status: 'rejected' }),
      Issuance.countDocuments({ issuedAt: { $gte: today } })
    ]);
    res.json({ total, issued, received, rejected, todayCount });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
