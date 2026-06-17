const prisma = require('../db/prismaClient');
const {
  validateCapacity,
  checkConflict,
  calculateConsumptions
} = require('../services/bookingService');

// Helper to format Time object to HH:mm
const formatTime = (timeInput) => {
  if (!timeInput) return '';
  const dateObj = new Date(timeInput);
  return dateObj.toISOString().split('T')[1].substring(0, 5);
};

// Helper to format Date object to YYYY-MM-DD
const formatDate = (dateInput) => {
  if (!dateInput) return '';
  const dateObj = new Date(dateInput);
  return dateObj.toISOString().split('T')[0];
};

// Transform database booking record with relations to API response format
const transformBooking = (booking) => {
  const consumptions = booking.bookingConsumptions.map(bc => ({
    id: bc.consumption.id,
    name: bc.consumption.name,
    price_per_pax: bc.consumption.pricePerPax,
    subtotal: bc.subtotal
  }));

  const totalCost = consumptions.reduce((sum, item) => sum + item.subtotal, 0);

  return {
    id: booking.id,
    unit_id: booking.unitId,
    unit_name: booking.unit.name,
    meeting_room_id: booking.meetingRoomId,
    meeting_room_name: booking.meetingRoom.name,
    meeting_room_capacity: booking.meetingRoom.capacity,
    date: formatDate(booking.date),
    start_time: formatTime(booking.startTime),
    end_time: formatTime(booking.endTime),
    number_of_attendees: booking.numberOfAttendees,
    consumptions: consumptions,
    total_cost: totalCost,
    created_at: booking.createdAt,
    updated_at: booking.updatedAt
  };
};

// GET /api/bookings
const getAllBookings = async (req, res, next) => {
  try {
    const bookings = await prisma.booking.findMany({
      include: {
        unit: true,
        meetingRoom: true,
        bookingConsumptions: {
          include: {
            consumption: true
          }
        }
      },
      orderBy: { date: 'desc' }
    });

    const formattedBookings = bookings.map(transformBooking);

    res.status(200).json({
      success: true,
      data: formattedBookings,
      message: 'Bookings retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/bookings/:id
const getBookingById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(id) },
      include: {
        unit: true,
        meetingRoom: true,
        bookingConsumptions: {
          include: {
            consumption: true
          }
        }
      }
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
        data: null
      });
    }

    res.status(200).json({
      success: true,
      data: transformBooking(booking),
      message: 'Booking retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/bookings
const createBooking = async (req, res, next) => {
  try {
    const unitId = req.body.unit_id || req.body.unitId;
    const meetingRoomId = req.body.meeting_room_id || req.body.meetingRoomId;
    const dateStr = req.body.date;
    const startTimeStr = req.body.start_time || req.body.startTime;
    const endTimeStr = req.body.end_time || req.body.endTime;
    const numberOfAttendees = req.body.number_of_attendees || req.body.numberOfAttendees;
    const consumptionIds = req.body.consumption_ids || req.body.consumptionIds || [];

    // Validations
    if (!unitId || !meetingRoomId || !dateStr || !startTimeStr || !endTimeStr || !numberOfAttendees) {
      return res.status(400).json({
        success: false,
        message: 'All fields (unit_id, meeting_room_id, date, start_time, end_time, number_of_attendees) are required',
        data: null
      });
    }

    const uId = parseInt(unitId);
    const rId = parseInt(meetingRoomId);
    const numAttendees = parseInt(numberOfAttendees);

    // 1. Capacity validation
    const room = await prisma.meetingRoom.findUnique({ where: { id: rId } });
    if (!room) {
      return res.status(400).json({
        success: false,
        message: 'Meeting room not found',
        data: null
      });
    }

    if (numAttendees > room.capacity) {
      return res.status(400).json({
        success: false,
        message: `Number of attendees (${numAttendees}) exceeds room capacity (${room.capacity})`,
        data: null
      });
    }

    // 2. Schedule conflict validation
    const conflict = await checkConflict(rId, dateStr, startTimeStr, endTimeStr);
    if (conflict) {
      // Fetch details of conflicting booking
      const conflictDetail = await prisma.booking.findUnique({
        where: { id: conflict.id },
        include: { unit: true }
      });
      return res.status(409).json({
        success: false,
        message: 'Ruang sudah dibooking pada waktu tersebut',
        conflict: {
          booking_id: conflictDetail.id,
          unit_name: conflictDetail.unit.name,
          start_time: formatTime(conflictDetail.startTime),
          end_time: formatTime(conflictDetail.endTime)
        }
      });
    }

    // 3. Calculate consumption costs
    const numericConsIds = consumptionIds.map(id => parseInt(id));
    const { items, totalCost } = await calculateConsumptions(numericConsIds, numAttendees);

    // 4. Create in Database
    const createdBooking = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.create({
        data: {
          unitId: uId,
          meetingRoomId: rId,
          date: new Date(`${dateStr}T00:00:00.000Z`),
          startTime: new Date(`1970-01-01T${startTimeStr}:00.000Z`),
          endTime: new Date(`1970-01-01T${endTimeStr}:00.000Z`),
          numberOfAttendees: numAttendees
        }
      });

      if (items.length > 0) {
        await tx.bookingConsumption.createMany({
          data: items.map(item => ({
            bookingId: booking.id,
            consumptionId: item.consumptionId,
            subtotal: item.subtotal
          }))
        });
      }

      return booking;
    });

    // 5. Fetch full booking details for response
    const fullBooking = await prisma.booking.findUnique({
      where: { id: createdBooking.id },
      include: {
        unit: true,
        meetingRoom: true,
        bookingConsumptions: {
          include: {
            consumption: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: transformBooking(fullBooking),
      message: 'Booking berhasil dibuat'
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/bookings/:id
const updateBooking = async (req, res, next) => {
  try {
    const { id } = req.params;
    const bookingId = parseInt(id);

    const unitId = req.body.unit_id || req.body.unitId;
    const meetingRoomId = req.body.meeting_room_id || req.body.meetingRoomId;
    const dateStr = req.body.date;
    const startTimeStr = req.body.start_time || req.body.startTime;
    const endTimeStr = req.body.end_time || req.body.endTime;
    const numberOfAttendees = req.body.number_of_attendees || req.body.numberOfAttendees;
    const consumptionIds = req.body.consumption_ids || req.body.consumptionIds || [];

    // Validations
    if (!unitId || !meetingRoomId || !dateStr || !startTimeStr || !endTimeStr || !numberOfAttendees) {
      return res.status(400).json({
        success: false,
        message: 'All fields (unit_id, meeting_room_id, date, start_time, end_time, number_of_attendees) are required',
        data: null
      });
    }

    const uId = parseInt(unitId);
    const rId = parseInt(meetingRoomId);
    const numAttendees = parseInt(numberOfAttendees);

    const existingBooking = await prisma.booking.findUnique({
      where: { id: bookingId }
    });

    if (!existingBooking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
        data: null
      });
    }

    // 1. Capacity validation
    const room = await prisma.meetingRoom.findUnique({ where: { id: rId } });
    if (!room) {
      return res.status(400).json({
        success: false,
        message: 'Meeting room not found',
        data: null
      });
    }

    if (numAttendees > room.capacity) {
      return res.status(400).json({
        success: false,
        message: `Number of attendees (${numAttendees}) exceeds room capacity (${room.capacity})`,
        data: null
      });
    }

    // 2. Schedule conflict validation (excluding current booking ID)
    const conflict = await checkConflict(rId, dateStr, startTimeStr, endTimeStr, bookingId);
    if (conflict) {
      const conflictDetail = await prisma.booking.findUnique({
        where: { id: conflict.id },
        include: { unit: true }
      });
      return res.status(409).json({
        success: false,
        message: 'Ruang sudah dibooking pada waktu tersebut',
        conflict: {
          booking_id: conflictDetail.id,
          unit_name: conflictDetail.unit.name,
          start_time: formatTime(conflictDetail.startTime),
          end_time: formatTime(conflictDetail.endTime)
        }
      });
    }

    // 3. Calculate consumption costs
    const numericConsIds = consumptionIds.map(id => parseInt(id));
    const { items } = await calculateConsumptions(numericConsIds, numAttendees);

    // 4. Update Database
    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          unitId: uId,
          meetingRoomId: rId,
          date: new Date(`${dateStr}T00:00:00.000Z`),
          startTime: new Date(`1970-01-01T${startTimeStr}:00.000Z`),
          endTime: new Date(`1970-01-01T${endTimeStr}:00.000Z`),
          numberOfAttendees: numAttendees
        }
      });

      // Clear existing consumptions
      await tx.bookingConsumption.deleteMany({
        where: { bookingId }
      });

      // Insert new consumptions
      if (items.length > 0) {
        await tx.bookingConsumption.createMany({
          data: items.map(item => ({
            bookingId: bookingId,
            consumptionId: item.consumptionId,
            subtotal: item.subtotal
          }))
        });
      }
    });

    // 5. Fetch updated booking
    const updatedBooking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        unit: true,
        meetingRoom: true,
        bookingConsumptions: {
          include: {
            consumption: true
          }
        }
      }
    });

    res.status(200).json({
      success: true,
      data: transformBooking(updatedBooking),
      message: 'Booking berhasil diperbarui'
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/bookings/:id
const deleteBooking = async (req, res, next) => {
  try {
    const { id } = req.params;
    const bookingId = parseInt(id);

    const existingBooking = await prisma.booking.findUnique({
      where: { id: bookingId }
    });

    if (!existingBooking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
        data: null
      });
    }

    await prisma.booking.delete({
      where: { id: bookingId }
    });

    res.status(200).json({
      success: true,
      data: null,
      message: 'Booking deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllBookings,
  getBookingById,
  createBooking,
  updateBooking,
  deleteBooking
};
