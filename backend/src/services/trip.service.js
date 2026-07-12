// Trip lifecycle service — the heart of TransitOps.
// EVERY mandatory business rule from the problem statement is enforced here,
// and every status transition runs inside a single DB transaction so a
// half-applied dispatch/complete/cancel is impossible.
const prisma = require('../lib/prisma');
const { ApiError } = require('../middleware/errorHandler');

// Shared validation used on create AND re-checked at dispatch time.
// (tx = transaction client, so dispatch checks are race-safe.)
async function assertAssignable(tx, { vehicleId, driverId, cargoWeightKg }) {
  const vehicle = await tx.vehicle.findUnique({ where: { id: Number(vehicleId) } });
  if (!vehicle) throw new ApiError(404, 'Vehicle not found');

  // Rule: Retired or In-Shop vehicles must never be dispatched
  if (vehicle.status === 'RETIRED') throw new ApiError(400, `${vehicle.name} is retired and cannot be dispatched`);
  if (vehicle.status === 'IN_SHOP') throw new ApiError(400, `${vehicle.name} is in the shop for maintenance`);
  // Rule: a vehicle already On Trip cannot take another trip
  if (vehicle.status === 'ON_TRIP') throw new ApiError(409, `${vehicle.name} is already on a trip`);

  const driver = await tx.driver.findUnique({ where: { id: Number(driverId) } });
  if (!driver) throw new ApiError(404, 'Driver not found');

  // Rule: suspended drivers cannot be assigned
  if (driver.status === 'SUSPENDED') throw new ApiError(400, `${driver.name} is suspended and cannot drive`);
  if (driver.status === 'OFF_DUTY') throw new ApiError(400, `${driver.name} is off duty`);
  // Rule: a driver already On Trip cannot take another trip
  if (driver.status === 'ON_TRIP') throw new ApiError(409, `${driver.name} is already on a trip`);
  // Rule: expired license blocks assignment
  if (driver.licenseExpiry < new Date()) {
    throw new ApiError(400, `${driver.name}'s license expired on ${driver.licenseExpiry.toISOString().slice(0, 10)}`);
  }

  // Rule: cargo weight must not exceed the vehicle's max load capacity
  if (Number(cargoWeightKg) > Number(vehicle.maxLoadKg)) {
    throw new ApiError(400, `Cargo ${cargoWeightKg} kg exceeds ${vehicle.name}'s capacity of ${vehicle.maxLoadKg} kg`);
  }

  return { vehicle, driver };
}

async function createTrip(data, userId) {
  const { source, destination, vehicleId, driverId, cargoWeightKg, plannedDistanceKm } = data;
  if (!source || !source.trim()) throw new ApiError(400, 'Source is required');
  if (!destination || !destination.trim()) throw new ApiError(400, 'Destination is required');
  if (!(Number(cargoWeightKg) > 0)) throw new ApiError(400, 'Cargo weight must be a positive number');
  if (!(Number(plannedDistanceKm) > 0)) throw new ApiError(400, 'Planned distance must be a positive number');

  // Validate at creation for instant feedback (and again at dispatch for safety)
  await assertAssignable(prisma, { vehicleId, driverId, cargoWeightKg });

  return prisma.trip.create({
    data: {
      source: source.trim(),
      destination: destination.trim(),
      cargoWeightKg,
      plannedDistanceKm,
      vehicleId: Number(vehicleId),
      driverId: Number(driverId),
      createdById: userId,
    },
    include: { vehicle: true, driver: true },
  });
}

// DRAFT -> DISPATCHED: vehicle & driver atomically become ON_TRIP
async function dispatchTrip(tripId) {
  return prisma.$transaction(async (tx) => {
    const trip = await tx.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new ApiError(404, 'Trip not found');
    if (trip.status !== 'DRAFT') throw new ApiError(400, `Only Draft trips can be dispatched (current: ${trip.status})`);

    // Re-check every rule at the moment of dispatch — state may have changed since the draft
    const { vehicle } = await assertAssignable(tx, trip);

    await tx.vehicle.update({ where: { id: trip.vehicleId }, data: { status: 'ON_TRIP' } });
    await tx.driver.update({ where: { id: trip.driverId }, data: { status: 'ON_TRIP' } });
    return tx.trip.update({
      where: { id: tripId },
      data: { status: 'DISPATCHED', dispatchedAt: new Date(), startOdometerKm: vehicle.odometerKm },
      include: { vehicle: true, driver: true },
    });
  });
}

// DISPATCHED -> COMPLETED: record odometer + fuel, release vehicle & driver
async function completeTrip(tripId, { endOdometerKm, fuelLiters, fuelCost, revenue }) {
  return prisma.$transaction(async (tx) => {
    const trip = await tx.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new ApiError(404, 'Trip not found');
    if (trip.status !== 'DISPATCHED') throw new ApiError(400, `Only Dispatched trips can be completed (current: ${trip.status})`);

    const end = Number(endOdometerKm);
    if (!(end > 0)) throw new ApiError(400, 'Final odometer reading is required');
    if (end < Number(trip.startOdometerKm)) {
      throw new ApiError(400, `Final odometer (${end}) cannot be less than the start reading (${trip.startOdometerKm})`);
    }

    // Vehicle odometer moves forward with the trip; both statuses return to Available
    await tx.vehicle.update({ where: { id: trip.vehicleId }, data: { status: 'AVAILABLE', odometerKm: end } });
    await tx.driver.update({ where: { id: trip.driverId }, data: { status: 'AVAILABLE' } });

    if (Number(fuelLiters) > 0) {
      await tx.fuelLog.create({
        data: { vehicleId: trip.vehicleId, tripId: trip.id, liters: fuelLiters, cost: fuelCost || 0 },
      });
    }

    return tx.trip.update({
      where: { id: tripId },
      data: { status: 'COMPLETED', completedAt: new Date(), endOdometerKm: end, revenue: revenue || 0 },
      include: { vehicle: true, driver: true },
    });
  });
}

// DRAFT|DISPATCHED -> CANCELLED: a dispatched cancellation restores both to Available
async function cancelTrip(tripId) {
  return prisma.$transaction(async (tx) => {
    const trip = await tx.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new ApiError(404, 'Trip not found');
    if (!['DRAFT', 'DISPATCHED'].includes(trip.status)) {
      throw new ApiError(400, `A ${trip.status.toLowerCase()} trip cannot be cancelled`);
    }

    if (trip.status === 'DISPATCHED') {
      await tx.vehicle.update({ where: { id: trip.vehicleId }, data: { status: 'AVAILABLE' } });
      await tx.driver.update({ where: { id: trip.driverId }, data: { status: 'AVAILABLE' } });
    }

    return tx.trip.update({
      where: { id: tripId },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
      include: { vehicle: true, driver: true },
    });
  });
}

module.exports = { createTrip, dispatchTrip, completeTrip, cancelTrip };
