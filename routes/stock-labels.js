const express = require('express');
const QRCode = require('qrcode');
const StockLabel = require('../models/StockLabel');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const router = express.Router();
const CUSTOM_VENDOR_VALUE = '__custom_vendor__';

function buildIdStamp() {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const r = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${y}${m}${d}-${r}`;
}

function parseISTDate(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const parsed = new Date(`${raw}T00:00:00+05:30`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeLookupCandidate(value) {
  return normalizeText(value);
}

function normalizeVendorName(value, customVendorName) {
  const direct = normalizeText(value);
  if (direct && direct !== CUSTOM_VENDOR_VALUE) return direct;
  return normalizeText(customVendorName);
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

  const prefixedMatch = raw.match(/^(?:MATGATE|MATGATE\||MG\|)\s*((?:STK|INW)-[A-Z0-9-]+)$/i);
  if (prefixedMatch) add(prefixedMatch[1].toUpperCase());

  try {
    const parsed = JSON.parse(raw);
    add(parsed.stockLabelId);
    add(parsed.labelId);
    add(parsed.lookupKey);
  } catch (e) {
    // Ignore non-JSON scans.
  }

  return candidates;
}

async function resolveStockLabel(scanText) {
  const candidates = extractLookupCandidates(scanText);
  if (!candidates.length) return null;

  return StockLabel.findOne({
    $or: [
      { stockLabelId: { $in: candidates } },
      { qrLookupValue: { $in: candidates } },
      { qrPayload: { $in: candidates } }
    ]
  });
}

async function buildQrBundle(lookupValue) {
  const qrPayload = lookupValue;
  const qrCodeData = await QRCode.toDataURL(qrPayload, {
    width: 260,
    margin: 2,
    errorCorrectionLevel: 'M'
  });

  return {
    qrLookupValue: lookupValue,
    qrPayload,
    qrCodeData
  };
}

function serializeLabel(label) {
  return {
    ...label,
    currentQuantity: Number(label.currentQuantity || 0),
    initialQuantity: Number(label.initialQuantity || 0)
  };
}

// Create inward stock labels in one batch and print them onto incoming pallets.
router.post('/inward', authMiddleware, roleMiddleware('stores', 'admin'), async (req, res) => {
  try {
    const {
      materialCode,
      materialDescription,
      materialType,
      baseUoM,
      quantityPerLabel,
      labelCount,
      dmrNumber,
      dmrDate,
      make,
      vendorName,
      customVendorName
    } = req.body || {};

    const perLabelQuantity = Number(quantityPerLabel);
    const palletCount = Number(labelCount);
    const parsedDmrDate = parseISTDate(dmrDate);
    const resolvedVendorName = normalizeVendorName(vendorName, customVendorName);

    if (!materialCode || !perLabelQuantity || !palletCount || !dmrNumber || !parsedDmrDate || !make || !resolvedVendorName) {
      return res.status(400).json({
        error: 'materialCode, quantityPerLabel, labelCount, dmrNumber, dmrDate, make, and vendorName are required'
      });
    }

    if (perLabelQuantity <= 0) {
      return res.status(400).json({ error: 'quantityPerLabel must be greater than 0' });
    }

    if (!Number.isInteger(palletCount) || palletCount <= 0 || palletCount > 200) {
      return res.status(400).json({ error: 'labelCount must be an integer between 1 and 200' });
    }

    const stamp = buildIdStamp();
    const inwardBatchId = `INW-${stamp}`;
    const inwardPrintedAt = new Date();

    const docs = await Promise.all(
      Array.from({ length: palletCount }, async (_, index) => {
        const stockLabelId = `STK-${stamp}-${String(index + 1).padStart(2, '0')}`;
        const qrBundle = await buildQrBundle(stockLabelId);

        return {
          stockLabelId,
          inwardBatchId,
          palletSequence: index + 1,
          palletCount,
          materialCode: normalizeText(materialCode),
          materialDescription: normalizeText(materialDescription),
          materialType: normalizeText(materialType),
          baseUoM: normalizeText(baseUoM),
          initialQuantity: perLabelQuantity,
          currentQuantity: perLabelQuantity,
          dmrNumber: normalizeText(dmrNumber),
          dmrDate: parsedDmrDate,
          make: normalizeText(make),
          vendorName: resolvedVendorName,
          inwardPrintedBy: req.user.username,
          inwardPrintedByName: req.user.name,
          inwardPrintedAt,
          ...qrBundle
        };
      })
    );

    const labels = await StockLabel.insertMany(docs, { ordered: true });

    res.status(201).json({
      inwardBatchId,
      totalLabels: labels.length,
      totalQuantity: labels.length * perLabelQuantity,
      labels: labels.map((label) => serializeLabel(label.toObject()))
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/scan', authMiddleware, async (req, res) => {
  try {
    const { scanText } = req.body || {};
    const label = await resolveStockLabel(scanText);
    if (!label) return res.status(404).json({ error: 'Stock label not found for scanned QR text' });
    res.json(serializeLabel(label.toObject()));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/scan/:stockLabelId', authMiddleware, async (req, res) => {
  try {
    const label = await resolveStockLabel(req.params.stockLabelId);
    if (!label) return res.status(404).json({ error: 'Stock label not found' });
    res.json(serializeLabel(label.toObject()));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/filters', authMiddleware, async (req, res) => {
  try {
    const [vendorNames, materialCodes] = await Promise.all([
      StockLabel.distinct('vendorName'),
      StockLabel.distinct('materialCode')
    ]);

    res.json({
      vendorNames: vendorNames.filter(Boolean).sort(),
      materialCodes: materialCodes.filter(Boolean).sort(),
      statuses: ['active', 'depleted'],
      customVendorValue: CUSTOM_VENDOR_VALUE
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    const {
      search,
      status,
      vendorName,
      materialCode,
      sortBy,
      sortDir,
      page,
      limit,
      all,
      availableOnly
    } = req.query;

    const filter = {};

    if (search) {
      filter.$or = [
        { stockLabelId: { $regex: search, $options: 'i' } },
        { inwardBatchId: { $regex: search, $options: 'i' } },
        { materialCode: { $regex: search, $options: 'i' } },
        { materialDescription: { $regex: search, $options: 'i' } },
        { dmrNumber: { $regex: search, $options: 'i' } },
        { vendorName: { $regex: search, $options: 'i' } },
        { make: { $regex: search, $options: 'i' } }
      ];
    }

    if (availableOnly === 'true') {
      filter.status = 'active';
      filter.currentQuantity = { $gt: 0 };
    } else if (status) {
      filter.status = status;
    }

    if (vendorName) filter.vendorName = vendorName;
    if (materialCode) filter.materialCode = materialCode;

    const sort = {};
    if (sortBy) sort[sortBy] = sortDir === 'asc' ? 1 : -1;
    else {
      sort.inwardPrintedAt = -1;
      sort.stockLabelId = -1;
    }

    if (all === 'true') {
      const labels = await StockLabel.find(filter).sort(sort).lean();
      return res.json({ labels: labels.map(serializeLabel), total: labels.length });
    }

    const p = parseInt(page, 10) || 1;
    const l = Math.min(parseInt(limit, 10) || 25, 200);
    const total = await StockLabel.countDocuments(filter);
    const labels = await StockLabel.find(filter)
      .sort(sort)
      .skip((p - 1) * l)
      .limit(l)
      .lean();

    res.json({
      labels: labels.map(serializeLabel),
      total,
      page: p,
      limit: l,
      pages: Math.ceil(total / l)
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
