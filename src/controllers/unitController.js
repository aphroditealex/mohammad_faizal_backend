const prisma = require('../db/prismaClient');

// GET /api/units
const getAllUnits = async (req, res, next) => {
  try {
    const units = await prisma.unit.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json({
      success: true,
      data: units,
      message: 'Units retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/units/:id
const getUnitById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const unit = await prisma.unit.findUnique({
      where: { id: parseInt(id) }
    });

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: 'Unit not found',
        data: null
      });
    }

    res.status(200).json({
      success: true,
      data: unit,
      message: 'Unit retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/units
const createUnit = async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Unit name is required',
        data: null
      });
    }

    // Check duplicate
    const existing = await prisma.unit.findUnique({
      where: { name: name.trim() }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Unit name already exists',
        data: null
      });
    }

    const newUnit = await prisma.unit.create({
      data: { name: name.trim() }
    });

    res.status(201).json({
      success: true,
      data: newUnit,
      message: 'Unit created successfully'
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/units/:id
const updateUnit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Unit name is required',
        data: null
      });
    }

    const unitId = parseInt(id);
    const existingUnit = await prisma.unit.findUnique({
      where: { id: unitId }
    });

    if (!existingUnit) {
      return res.status(404).json({
        success: false,
        message: 'Unit not found',
        data: null
      });
    }

    // Check duplicate for other units
    const duplicate = await prisma.unit.findFirst({
      where: {
        name: name.trim(),
        id: { not: unitId }
      }
    });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: 'Unit name already exists',
        data: null
      });
    }

    const updatedUnit = await prisma.unit.update({
      where: { id: unitId },
      data: { name: name.trim() }
    });

    res.status(200).json({
      success: true,
      data: updatedUnit,
      message: 'Unit updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/units/:id
const deleteUnit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const unitId = parseInt(id);

    const existingUnit = await prisma.unit.findUnique({
      where: { id: unitId }
    });

    if (!existingUnit) {
      return res.status(404).json({
        success: false,
        message: 'Unit not found',
        data: null
      });
    }

    // Check if unit is in bookings
    const bookings = await prisma.booking.findFirst({
      where: { unitId }
    });

    if (bookings) {
      return res.status(409).json({
        success: false,
        message: 'Cannot delete unit because it is linked to existing bookings',
        data: null
      });
    }

    await prisma.unit.delete({
      where: { id: unitId }
    });

    res.status(200).json({
      success: true,
      data: null,
      message: 'Unit deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUnits,
  getUnitById,
  createUnit,
  updateUnit,
  deleteUnit
};
