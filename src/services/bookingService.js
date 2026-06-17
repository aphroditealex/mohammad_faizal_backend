const prisma = require('../db/prismaClient');

/**
 * Validates if the number of attendees exceeds the room capacity.
 */
const validateCapacity = async (meetingRoomId, numberOfAttendees) => {
  const room = await prisma.meetingRoom.findUnique({
    where: { id: meetingRoomId }
  });

  if (!room) {
    throw new Error('Room not found');
  }

  return numberOfAttendees <= room.capacity;
};

/**
 * Checks if there's any schedule conflict/overlap for the room.
 * Logika overlap: start_time_1 < end_time_2 AND end_time_1 > start_time_2
 */
const checkConflict = async (meetingRoomId, dateStr, startTimeStr, endTimeStr, excludeId = null) => {
  // Enforce correct time format HH:mm:ss for MySQL comparison
  const formattedStartTime = startTimeStr.length === 5 ? `${startTimeStr}:00` : startTimeStr;
  const formattedEndTime = endTimeStr.length === 5 ? `${endTimeStr}:00` : endTimeStr;

  // We perform raw query to avoid Prisma's DateTime-TIME mapping timezone issues
  let conflicts;
  if (excludeId) {
    conflicts = await prisma.$queryRaw`
      SELECT id, start_time, end_time 
      FROM bookings 
      WHERE meeting_room_id = ${meetingRoomId} 
        AND date = ${dateStr} 
        AND start_time < ${formattedEndTime} 
        AND end_time > ${formattedStartTime}
        AND id != ${excludeId}
      LIMIT 1
    `;
  } else {
    conflicts = await prisma.$queryRaw`
      SELECT id, start_time, end_time 
      FROM bookings 
      WHERE meeting_room_id = ${meetingRoomId} 
        AND date = ${dateStr} 
        AND start_time < ${formattedEndTime} 
        AND end_time > ${formattedStartTime}
      LIMIT 1
    `;
  }

  return conflicts.length > 0 ? conflicts[0] : null;
};

/**
 * Calculates subtotals for chosen consumptions and the grand total cost.
 */
const calculateConsumptions = async (consumptionIds, numberOfAttendees) => {
  if (!consumptionIds || consumptionIds.length === 0) {
    return { items: [], totalCost: 0 };
  }

  const items = await prisma.consumption.findMany({
    where: {
      id: { in: consumptionIds }
    }
  });

  let totalCost = 0;
  const calculatedItems = items.map(item => {
    const subtotal = item.pricePerPax * numberOfAttendees;
    totalCost += subtotal;
    return {
      consumptionId: item.id,
      name: item.name,
      pricePerPax: item.pricePerPax,
      subtotal
    };
  });

  return {
    items: calculatedItems,
    totalCost
  };
};

module.exports = {
  validateCapacity,
  checkConflict,
  calculateConsumptions
};
