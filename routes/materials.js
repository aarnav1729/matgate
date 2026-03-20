const express = require('express');
const Material = require('../models/Material');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// List with search, sort, filter, pagination
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { search, materialType, materialGroup, baseUoM, sortBy, sortDir, page, limit, all } = req.query;
    const filter = { isActive: true };

    if (search) {
      filter.$or = [
        { materialCode: { $regex: search, $options: 'i' } },
        { materialDescription: { $regex: search, $options: 'i' } }
      ];
    }
    if (materialType) filter.materialType = materialType;
    if (materialGroup) filter.materialGroup = materialGroup;
    if (baseUoM) filter.baseUoM = baseUoM;

    const sort = {};
    if (sortBy) sort[sortBy] = sortDir === 'desc' ? -1 : 1;
    else sort.materialCode = 1;

    if (all === 'true') {
      const materials = await Material.find(filter).sort(sort).lean();
      return res.json({ materials, total: materials.length });
    }

    const p = parseInt(page) || 1;
    const l = Math.min(parseInt(limit) || 50, 200);
    const total = await Material.countDocuments(filter);
    const materials = await Material.find(filter).sort(sort).skip((p - 1) * l).limit(l).lean();
    res.json({ materials, total, page: p, limit: l, pages: Math.ceil(total / l) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Filter options (distinct values)
router.get('/filters', authMiddleware, async (req, res) => {
  try {
    const [materialTypes, materialGroups, baseUoMs] = await Promise.all([
      Material.distinct('materialType', { isActive: true }),
      Material.distinct('materialGroup', { isActive: true }),
      Material.distinct('baseUoM', { isActive: true })
    ]);
    res.json({
      materialTypes: materialTypes.filter(Boolean).sort(),
      materialGroups: materialGroups.filter(Boolean).sort(),
      baseUoMs: baseUoMs.filter(Boolean).sort()
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Lookup by code (for dropdown autofill)
router.get('/lookup/:code', authMiddleware, async (req, res) => {
  try {
    const mat = await Material.findOne({ materialCode: req.params.code, isActive: true }).lean();
    if (!mat) return res.status(404).json({ error: 'Material not found' });
    res.json(mat);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Search for dropdown (autocomplete)
router.get('/search', authMiddleware, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json([]);
    const materials = await Material.find({
      isActive: true,
      $or: [
        { materialCode: { $regex: q, $options: 'i' } },
        { materialDescription: { $regex: q, $options: 'i' } }
      ]
    }).limit(20).lean();
    res.json(materials);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Create
router.post('/', authMiddleware, async (req, res) => {
  try {
    const mat = await Material.create(req.body);
    res.status(201).json(mat);
  } catch (e) {
    if (e.code === 11000) return res.status(400).json({ error: 'Material code already exists' });
    res.status(500).json({ error: e.message });
  }
});

// Update
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const mat = await Material.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!mat) return res.status(404).json({ error: 'Not found' });
    res.json(mat);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete (soft)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const mat = await Material.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!mat) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Export all (for Excel)
router.get('/export', authMiddleware, async (req, res) => {
  try {
    const { search, materialType, materialGroup, baseUoM } = req.query;
    const filter = { isActive: true };
    if (search) {
      filter.$or = [
        { materialCode: { $regex: search, $options: 'i' } },
        { materialDescription: { $regex: search, $options: 'i' } }
      ];
    }
    if (materialType) filter.materialType = materialType;
    if (materialGroup) filter.materialGroup = materialGroup;
    if (baseUoM) filter.baseUoM = baseUoM;

    const materials = await Material.find(filter).sort({ materialCode: 1 }).lean();
    res.json(materials);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
