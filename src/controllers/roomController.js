const prisma = require('../db/prismaClient');

// GET /api/rooms
const getAllRooms = async (req, res, next) => {
  try {
    const rooms = await prisma.meetingRoom.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json({
      success: true,
      data: rooms,
      message: 'Rooms retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/rooms/:id
const getRoomById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const room = await prisma.meetingRoom.findUnique({
      where: { id: parseInt(id) }
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found',
        data: null
      });
    }

    res.status(200).json({
      success: true,
      data: room,
      message: 'Room retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/rooms
const createRoom = async (req, res, next) => {
  try {
    const { name, capacity } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Room name is required',
        data: null
      });
    }

    const capacityInt = parseInt(capacity);
    if (isNaN(capacityInt) || capacityInt < 1 || capacityInt > 200) {
      return res.status(400).json({
        success: false,
        message: 'Capacity must be an integer between 1 and 200',
        data: null
      });
    }

    // Check duplicate name
    const existing = await prisma.meetingRoom.findUnique({
      where: { name: name.trim() }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Room name already exists',
        data: null
      });
    }

    const newRoom = await prisma.meetingRoom.create({
      data: {
        name: name.trim(),
        capacity: capacityInt
      }
    });

    res.status(201).json({
      success: true,
      data: newRoom,
      message: 'Room created successfully'
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/rooms/:id
const updateRoom = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, capacity } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Room name is required',
        data: null
      });
    }

    const capacityInt = parseInt(capacity);
    if (isNaN(capacityInt) || capacityInt < 1 || capacityInt > 200) {
      return res.status(400).json({
        success: false,
        message: 'Capacity must be an integer between 1 and 200',
        data: null
      });
    }

    const roomId = parseInt(id);
    const existingRoom = await prisma.meetingRoom.findUnique({
      where: { id: roomId }
    });

    if (!existingRoom) {
      return res.status(404).json({
        success: false,
        message: 'Room not found',
        data: null
      });
    }

    // Check duplicate name for other rooms
    const duplicate = await prisma.meetingRoom.findFirst({
      where: {
        name: name.trim(),
        id: { not: roomId }
      }
    });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: 'Room name already exists',
        data: null
      });
    }

    const updatedRoom = await prisma.meetingRoom.update({
      where: { id: roomId },
      data: {
        name: name.trim(),
        capacity: capacityInt
      }
    });

    res.status(200).json({
      success: true,
      data: updatedRoom,
      message: 'Room updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/rooms/:id
const deleteRoom = async (req, res, next) => {
  try {
    const { id } = req.params;
    const roomId = parseInt(id);

    const existingRoom = await prisma.meetingRoom.findUnique({
      where: { id: roomId }
    });

    if (!existingRoom) {
      return res.status(404).json({
        success: false,
        message: 'Room not found',
        data: null
      });
    }

    // Check if there are active/upcoming bookings
    // Get start of today (local time)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeBookings = await prisma.booking.findMany({
      where: {
        meetingRoomId: roomId,
        date: {
          gte: today
        }
      },
      include: {
        unit: true
      }
    });

    if (activeBookings.length > 0) {
      // Map to return booking details
      const bookingsInfo = activeBookings.map(b => ({
        booking_id: b.id,
        date: b.date.toISOString().split('T')[0],
        start_time: b.startTime.toISOString().split('T')[1].substring(0, 5),
        end_time: b.endTime.toISOString().split('T')[1].substring(0, 5),
        unit_name: b.unit.name
      }));

      return res.status(409).json({
        success: false,
        message: 'Cannot delete room with active or future bookings',
        data: bookingsInfo
      });
    }

    await prisma.meetingRoom.delete({
      where: { id: roomId }
    });

    res.status(200).json({
      success: true,
      data: null,
      message: 'Room deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom
};
