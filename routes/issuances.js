const express = require('express');
const QRCode = require('qrcode');
const Issuance = require('../models/Issuance');
const StockLabel = require('../models/StockLabel');
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

function getISTDayKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

function getISTDayBounds(date = new Date()) {
  const dayKey = getISTDayKey(date);
  return {
    start: new Date(`${dayKey}T00:00:00+05:30`),
    end: new Date(`${dayKey}T23:59:59.999+05:30`)
  };
}

function normalizeLookupCandidate(value) {
  return String(value || '').trim();
}

function normalizeQuantity(value) {
  return Number(Number(value).toFixed(6));
}

function toTatMinutes(start, end) {
  if (!start || !end) return null;
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  if (Number.isNaN(startTime) || Number.isNaN(endTime) || endTime < startTime) return null;
  return Math.round((endTime - startTime) / 60000);
}

function average(values) {
  const filtered = values.filter((value) => typeof value === 'number' && !Number.isNaN(value));
  if (!filtered.length) return null;
  return Math.round(filtered.reduce((sum, value) => sum + value, 0) / filtered.length);
}

function extractLookupCandidates(scanText) {
  const raw = normalizeLookupCandidate(scanText);
  if (!raw) return [];

  const seen = new Set();
  const candidates = [];
  const add = (value) => {
    const normalized = normalizeLookupCandidate(value);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    candidates.push(normalized);
  };

  add(raw);

  const upperRaw = raw.toUpperCase();
  if (upperRaw !== raw) add(upperRaw);

  const prefixedMatch = raw.match(/^(?:MATGATE|MATGATE\||MG\|)\s*(MG-[A-Z0-9-]+)$/i);
  if (prefixedMatch) add(prefixedMatch[1].toUpperCase());

  try {
    const parsed = JSON.parse(raw);
    add(parsed.issuanceId);
    add(parsed.id);
    add(parsed.lookupKey);
  } catch (e) {
    // Ignore non-JSON scan text.
  }

  return candidates;
}

async function resolveIssuance(scanText) {
  const candidates = extractLookupCandidates(scanText);
  if (!candidates.length) return null;

  return Issuance.findOne({
    $or: [
      { issuanceId: { $in: candidates } },
      { qrLookupValue: { $in: candidates } },
      { qrPayload: { $in: candidates } }
    ]
  });
}

async function buildIssueQrBundle(lookupValue) {
  const qrPayload = lookupValue;
  const qrCodeData = await QRCode.toDataURL(qrPayload, {
    width: 300,
    margin: 2,
    errorCorrectionLevel: 'M'
  });

  return {
    qrLookupValue: lookupValue,
    qrPayload,
    qrCodeData
  };
}

function serializeStockLabel(label) {
  return {
    ...label,
    currentQuantity: Number(label.currentQuantity || 0),
    initialQuantity: Number(label.initialQuantity || 0)
  };
}

function serializeIssuance(issuance) {
  const item = issuance.toObject ? issuance.toObject() : issuance;

  return {
    ...item,
    quantity: Number(item.quantity || 0),
    sourceInitialQuantity: Number(item.sourceInitialQuantity || 0),
    sourceQuantityBefore: Number(item.sourceQuantityBefore || 0),
    sourceQuantityAfter: Number(item.sourceQuantityAfter || 0),
    tatInwardToIssueMinutes: toTatMinutes(item.sourceInwardPrintedAt, item.issuedAt),
    tatIssueToReceiveMinutes: toTatMinutes(item.issuedAt, item.receivedAt),
    tatInwardToReceiveMinutes: toTatMinutes(item.sourceInwardPrintedAt, item.receivedAt)
  };
}

router.post('/', authMiddleware, roleMiddleware('stores', 'admin'), async (req, res) => {
  const session = await Issuance.startSession();

  try {
    const rawItems = Array.isArray(req.body?.items)
      ? req.body.items
      : req.body?.stockLabelId
        ? [{ stockLabelId: req.body.stockLabelId, issueQuantity: req.body.issueQuantity || req.body.quantity }]
        : [];

    if (!rawItems.length) {
      return res.status(400).json({ error: 'At least one stock label issue item is required' });
    }

    const duplicates = new Set();
    rawItems.forEach((item) => {
      const stockLabelId = normalizeLookupCandidate(item.stockLabelId);
      if (stockLabelId) duplicates.add(stockLabelId);
    });
    if (duplicates.size !== rawItems.length) {
      return res.status(400).json({ error: 'Duplicate stock labels cannot be issued in the same request' });
    }

    const issuances = [];
    const balanceLabels = [];
    let depletedCount = 0;

    await session.withTransaction(async () => {
      for (const entry of rawItems) {
        const stockLabelId = normalizeLookupCandidate(entry.stockLabelId);
        const issueQuantity = normalizeQuantity(Number(entry.issueQuantity));

        if (!stockLabelId || !issueQuantity || issueQuantity <= 0) {
          throw new Error('Each issue item requires stockLabelId and a positive issueQuantity');
        }

        const stockLabel = await StockLabel.findOne({ stockLabelId }).session(session);
        if (!stockLabel) throw new Error(`Stock label ${stockLabelId} not found`);
        if (stockLabel.status !== 'active' || stockLabel.currentQuantity <= 0) {
          throw new Error(`Stock label ${stockLabelId} is not available for issue`);
        }
        if (issueQuantity > stockLabel.currentQuantity) {
          throw new Error(`Issue quantity for ${stockLabelId} cannot exceed available stock`);
        }

        const issuedAt = new Date();
        const sourceQuantityBefore = normalizeQuantity(stockLabel.currentQuantity);
        const sourceQuantityAfter = normalizeQuantity(sourceQuantityBefore - issueQuantity);
        const issuanceId = generateIssuanceId();
        const qrBundle = await buildIssueQrBundle(issuanceId);

        const issuance = new Issuance({
          issuanceId,
          materialCode: stockLabel.materialCode,
          materialDescription: stockLabel.materialDescription,
          materialType: stockLabel.materialType,
          baseUoM: stockLabel.baseUoM,
          quantity: issueQuantity,
          dmrNumber: stockLabel.dmrNumber,
          dmrDate: stockLabel.dmrDate,
          make: stockLabel.make,
          vendorName: stockLabel.vendorName,
          sourceLabelId: stockLabel.stockLabelId,
          sourceBatchId: stockLabel.inwardBatchId,
          sourceLabelRevision: stockLabel.revision,
          sourceInitialQuantity: stockLabel.initialQuantity,
          sourceQuantityBefore,
          sourceQuantityAfter,
          sourceInwardPrintedAt: stockLabel.inwardPrintedAt,
          sourceInwardPrintedByName: stockLabel.inwardPrintedByName,
          issuedBy: req.user.username,
          issuedByName: req.user.name,
          issuedAt,
          ...qrBundle
        });

        stockLabel.currentQuantity = sourceQuantityAfter;
        stockLabel.lastIssuedAt = issuedAt;
        stockLabel.lastIssuedBy = req.user.username;
        stockLabel.lastIssuedByName = req.user.name;
        if (sourceQuantityAfter <= 0) {
          stockLabel.status = 'depleted';
          depletedCount += 1;
        } else {
          stockLabel.revision += 1;
        }

        await issuance.save({ session });
        await stockLabel.save({ session });

        issuances.push(serializeIssuance(issuance));
        if (stockLabel.status === 'active' && stockLabel.currentQuantity > 0) {
          balanceLabels.push(serializeStockLabel(stockLabel.toObject()));
        }
      }
    });

    res.status(201).json({
      createdCount: issuances.length,
      depletedCount,
      issuances,
      balanceLabels
    });
  } catch (e) {
    const statusCode = /not found/i.test(e.message)
      ? 404
      : /required|positive|duplicate|cannot|available|exceed/i.test(e.message)
        ? 400
        : 500;
    res.status(statusCode).json({ error: e.message });
  } finally {
    session.endSession();
  }
});

router.post('/receive/:issuanceId', authMiddleware, roleMiddleware('production', 'admin'), async (req, res) => {
  try {
    const { receiptRemarks } = req.body || {};
    const issuance = await Issuance.findOne({ issuanceId: req.params.issuanceId });
    if (!issuance) return res.status(404).json({ error: 'Issuance not found' });
    if (issuance.status !== 'issued') {
      return res.status(400).json({ error: `Cannot receive a ${issuance.status} issuance` });
    }

    issuance.status = 'received';
    issuance.receivedBy = req.user.username;
    issuance.receivedByName = req.user.name;
    issuance.receivedAt = new Date();
    issuance.receiptRemarks = receiptRemarks || '';
    await issuance.save();

    res.json(serializeIssuance(issuance));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/reject/:issuanceId', authMiddleware, roleMiddleware('production', 'admin'), async (req, res) => {
  try {
    const { receiptRemarks } = req.body || {};
    if (!String(receiptRemarks || '').trim()) {
      return res.status(400).json({ error: 'receiptRemarks are required when rejecting an issuance' });
    }

    const issuance = await Issuance.findOne({ issuanceId: req.params.issuanceId });
    if (!issuance) return res.status(404).json({ error: 'Issuance not found' });
    if (issuance.status !== 'issued') {
      return res.status(400).json({ error: `Cannot reject a ${issuance.status} issuance` });
    }

    issuance.status = 'rejected';
    issuance.receivedBy = req.user.username;
    issuance.receivedByName = req.user.name;
    issuance.receivedAt = new Date();
    issuance.receiptRemarks = receiptRemarks || '';
    await issuance.save();

    res.json(serializeIssuance(issuance));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/scan', authMiddleware, async (req, res) => {
  try {
    const { scanText } = req.body || {};
    const issuance = await resolveIssuance(scanText);
    if (!issuance) return res.status(404).json({ error: 'Issuance not found for scanned QR text' });
    res.json(serializeIssuance(issuance));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/scan/:issuanceId', authMiddleware, async (req, res) => {
  try {
    const issuance = await resolveIssuance(req.params.issuanceId);
    if (!issuance) return res.status(404).json({ error: 'Issuance not found' });
    res.json(serializeIssuance(issuance));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    const {
      search,
      status,
      materialCode,
      dateFrom,
      dateTo,
      sortBy,
      sortDir,
      page,
      limit,
      all
    } = req.query;

    const filter = {};

    if (search) {
      filter.$or = [
        { issuanceId: { $regex: search, $options: 'i' } },
        { sourceLabelId: { $regex: search, $options: 'i' } },
        { materialCode: { $regex: search, $options: 'i' } },
        { materialDescription: { $regex: search, $options: 'i' } },
        { dmrNumber: { $regex: search, $options: 'i' } },
        { vendorName: { $regex: search, $options: 'i' } },
        { make: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) filter.status = status;
    if (materialCode) filter.materialCode = materialCode;
    if (dateFrom || dateTo) {
      filter.issuedAt = {};
      if (dateFrom) filter.issuedAt.$gte = new Date(`${dateFrom}T00:00:00+05:30`);
      if (dateTo) filter.issuedAt.$lte = new Date(`${dateTo}T23:59:59.999+05:30`);
    }

    const sort = {};
    if (sortBy) sort[sortBy] = sortDir === 'asc' ? 1 : -1;
    else sort.issuedAt = -1;

    if (all === 'true') {
      const issuances = await Issuance.find(filter).sort(sort).lean();
      return res.json({ issuances: issuances.map(serializeIssuance), total: issuances.length });
    }

    const p = parseInt(page, 10) || 1;
    const l = Math.min(parseInt(limit, 10) || 50, 200);
    const total = await Issuance.countDocuments(filter);
    const issuances = await Issuance.find(filter)
      .sort(sort)
      .skip((p - 1) * l)
      .limit(l)
      .lean();

    res.json({
      issuances: issuances.map(serializeIssuance),
      total,
      page: p,
      limit: l,
      pages: Math.ceil(total / l)
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/qr/:issuanceId', authMiddleware, async (req, res) => {
  try {
    const issuance = await Issuance.findOne({ issuanceId: req.params.issuanceId }).lean();
    if (!issuance) return res.status(404).json({ error: 'Not found' });
    res.json({ qrCodeData: issuance.qrCodeData, qrPayload: issuance.qrPayload });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const { start, end } = getISTDayBounds();
    const [
      total,
      issued,
      received,
      rejected,
      issuedTodayCount,
      inwardTodayCount,
      acceptedTodayCount,
      activeStock
    ] = await Promise.all([
      Issuance.countDocuments(),
      Issuance.countDocuments({ status: 'issued' }),
      Issuance.countDocuments({ status: 'received' }),
      Issuance.countDocuments({ status: 'rejected' }),
      Issuance.countDocuments({ issuedAt: { $gte: start, $lte: end } }),
      StockLabel.countDocuments({ inwardPrintedAt: { $gte: start, $lte: end } }),
      Issuance.countDocuments({ status: 'received', receivedAt: { $gte: start, $lte: end } }),
      StockLabel.aggregate([
        { $match: { status: 'active', currentQuantity: { $gt: 0 } } },
        {
          $group: {
            _id: null,
            activeLabels: { $sum: 1 },
            availableQuantity: { $sum: '$currentQuantity' }
          }
        }
      ])
    ]);

    res.json({
      total,
      issued,
      received,
      rejected,
      todayCount: issuedTodayCount,
      issuedTodayCount,
      inwardTodayCount,
      acceptedTodayCount,
      activeLabels: activeStock[0]?.activeLabels || 0,
      availableQuantity: Number(activeStock[0]?.availableQuantity || 0)
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/analytics', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const now = new Date();
    const { start, end } = getISTDayBounds(now);

    const [acceptedDocs, pendingDocs, activeStockStats, todayCounts] = await Promise.all([
      Issuance.find({
        status: 'received',
        issuedAt: { $ne: null },
        receivedAt: { $ne: null },
        sourceInwardPrintedAt: { $ne: null }
      })
        .sort({ receivedAt: -1 })
        .lean(),
      Issuance.find({ status: 'issued' }).sort({ issuedAt: 1 }).lean(),
      StockLabel.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            quantity: { $sum: '$currentQuantity' }
          }
        }
      ]),
      Promise.all([
        StockLabel.countDocuments({ inwardPrintedAt: { $gte: start, $lte: end } }),
        Issuance.countDocuments({ issuedAt: { $gte: start, $lte: end } }),
        Issuance.countDocuments({ status: 'received', receivedAt: { $gte: start, $lte: end } })
      ])
    ]);

    const accepted = acceptedDocs.map(serializeIssuance);
    const pending = pendingDocs.map((item) => ({
      ...serializeIssuance(item),
      pendingReceiptAgeMinutes: toTatMinutes(item.issuedAt, now)
    }));

    const activeSummary = activeStockStats.reduce(
      (accumulator, row) => {
        accumulator[row._id] = {
          count: row.count,
          quantity: Number(row.quantity || 0)
        };
        return accumulator;
      },
      {}
    );

    const summary = {
      activeLabels: activeSummary.active?.count || 0,
      depletedLabels: activeSummary.depleted?.count || 0,
      availableQuantity: activeSummary.active?.quantity || 0,
      inwardPrintedToday: todayCounts[0],
      issuedToday: todayCounts[1],
      acceptedToday: todayCounts[2],
      avgInwardToIssueMinutes: average(accepted.map((item) => item.tatInwardToIssueMinutes)),
      avgIssueToReceiveMinutes: average(accepted.map((item) => item.tatIssueToReceiveMinutes)),
      avgInwardToReceiveMinutes: average(accepted.map((item) => item.tatInwardToReceiveMinutes)),
      pendingReceiptCount: pending.length,
      pendingReceiptAvgAgeMinutes: average(pending.map((item) => item.pendingReceiptAgeMinutes))
    };

    const slowestAccepted = [...accepted]
      .filter((item) => typeof item.tatInwardToReceiveMinutes === 'number')
      .sort((a, b) => b.tatInwardToReceiveMinutes - a.tatInwardToReceiveMinutes)
      .slice(0, 8);

    const oldestPending = [...pending]
      .filter((item) => typeof item.pendingReceiptAgeMinutes === 'number')
      .sort((a, b) => b.pendingReceiptAgeMinutes - a.pendingReceiptAgeMinutes)
      .slice(0, 8);

    res.json({ summary, slowestAccepted, oldestPending });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
