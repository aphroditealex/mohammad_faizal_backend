const prisma = require('../db/prismaClient');

// GET /api/consumptions
const getAllConsumptions = async (req, res, next) => {
  try {
    const consumptions = await prisma.consumption.findMany({
      orderBy: { id: 'asc' }
    });
    res.status(200).json({
      success: true,
      data: consumptions,
      message: 'Consumptions retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/consumptions
const createConsumption = async (req, res, next) => {
  try {
    const { name, pricePerPax } = req.body;

    const validNames = ['Snack Siang', 'Makan Siang', 'Snack Sore'];
    if (!name || !validNames.includes(name)) {
      return res.status(400).json({
        success: false,
        message: 'Name must be one of: Snack Siang, Makan Siang, Snack Sore',
        data: null
      });
    }

    const price = parseInt(pricePerPax);
    if (isNaN(price) || price < 0) {
      return res.status(400).json({
        success: false,
        message: 'Price per pax must be a non-negative integer',
        data: null
      });
    }

    // Check duplicate
    const existing = await prisma.consumption.findUnique({
      where: { name }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Consumption '${name}' already exists`,
        data: null
      });
    }

    const newConsumption = await prisma.consumption.create({
      data: {
        name,
        pricePerPax: price
      }
    });

    res.status(201).json({
      success: true,
      data: newConsumption,
      message: 'Consumption created successfully'
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/consumptions/:id
const updateConsumption = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { pricePerPax } = req.body;

    const price = parseInt(pricePerPax);
    if (isNaN(price) || price < 0) {
      return res.status(400).json({
        success: false,
        message: 'Price per pax must be a non-negative integer',
        data: null
      });
    }

    const consumptionId = parseInt(id);
    const existing = await prisma.consumption.findUnique({
      where: { id: consumptionId }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Consumption not found',
        data: null
      });
    }

    const updated = await prisma.consumption.update({
      where: { id: consumptionId },
      data: {
        pricePerPax: price
      }
    });

    res.status(200).json({
      success: true,
      data: updated,
      message: 'Consumption price updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/consumptions/:id
const deleteConsumption = async (req, res, next) => {
  try {
    const { id } = req.params;
    const consumptionId = parseInt(id);

    const existing = await prisma.consumption.findUnique({
      where: { id: consumptionId }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Consumption not found',
        data: null
      });
    }

    // Check if used in booking_consumptions
    const usage = await prisma.bookingConsumption.findFirst({
      where: { consumptionId }
    });

    if (usage) {
      return res.status(409).json({
        success: false,
        message: 'Cannot delete consumption because it has been used in bookings',
        data: null
      });
    }

    await prisma.consumption.delete({
      where: { id: consumptionId }
    });

    res.status(200).json({
      success: true,
      data: null,
      message: 'Consumption deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllConsumptions,
  createConsumption,
  updateConsumption,
  deleteConsumption
};
