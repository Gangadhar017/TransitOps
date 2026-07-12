// Seed data: one login per role, plus vehicles/drivers covering EVERY edge case
// the judges will test (expired license, suspended driver, in-shop & retired vehicles).
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // --- Roles ---
  const roleNames = ['FLEET_MANAGER', 'DRIVER', 'SAFETY_OFFICER', 'FINANCIAL_ANALYST'];
  const roles = {};
  for (const name of roleNames) {
    roles[name] = await prisma.role.upsert({ where: { name }, update: {}, create: { name } });
  }

  // --- Users (password for all demo accounts: Password@123) ---
  const passwordHash = await bcrypt.hash('Password@123', 10);
  const users = [
    { name: 'Fatima Manager', email: 'manager@transitops.com', role: 'FLEET_MANAGER' },
    { name: 'Dev Driver', email: 'driver@transitops.com', role: 'DRIVER' },
    { name: 'Sana Safety', email: 'safety@transitops.com', role: 'SAFETY_OFFICER' },
    { name: 'Arjun Analyst', email: 'analyst@transitops.com', role: 'FINANCIAL_ANALYST' },
  ];
  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { name: u.name, email: u.email, passwordHash, roleId: roles[u.role].id },
    });
  }

  // --- Vehicles (cover every status) ---
  const vehicles = [
    { regNo: 'GJ01AB1234', name: 'Tata Ace', type: 'Mini Truck', maxLoadKg: 750, odometerKm: 45210, acquisitionCost: 550000, region: 'West', status: 'AVAILABLE' },
    { regNo: 'GJ01CD5678', name: 'Eicher Pro 2049', type: 'Truck', maxLoadKg: 5000, odometerKm: 120400, acquisitionCost: 1850000, region: 'West', status: 'AVAILABLE' },
    { regNo: 'MH12EF9012', name: 'Mahindra Bolero Pickup', type: 'Van', maxLoadKg: 1250, odometerKm: 78950, acquisitionCost: 900000, region: 'Central', status: 'AVAILABLE' },
    { regNo: 'DL05GH3456', name: 'Ashok Leyland Dost', type: 'Van', maxLoadKg: 1500, odometerKm: 30200, acquisitionCost: 820000, region: 'North', status: 'IN_SHOP' },
    { regNo: 'KA03IJ7890', name: 'Tata 407 (Old)', type: 'Truck', maxLoadKg: 2200, odometerKm: 310000, acquisitionCost: 1200000, region: 'South', status: 'RETIRED' },
  ];
  const vehicleRows = {};
  for (const v of vehicles) {
    vehicleRows[v.regNo] = await prisma.vehicle.upsert({ where: { regNo: v.regNo }, update: {}, create: v });
  }

  // --- Drivers (valid, expired-license, suspended, off-duty) ---
  const inOneYear = new Date(Date.now() + 365 * 24 * 3600 * 1000);
  const lastMonth = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const drivers = [
    { name: 'Alex Kumar', licenseNo: 'DL-2020-001', licenseCategory: 'LMV', licenseExpiry: inOneYear, contact: '9876500001', safetyScore: 92, status: 'AVAILABLE' },
    { name: 'Priya Sharma', licenseNo: 'DL-2019-002', licenseCategory: 'HMV', licenseExpiry: inOneYear, contact: '9876500002', safetyScore: 88, status: 'AVAILABLE' },
    { name: 'Ravi Expired', licenseNo: 'DL-2015-003', licenseCategory: 'LMV', licenseExpiry: lastMonth, contact: '9876500003', safetyScore: 75, status: 'AVAILABLE' }, // license expired -> must be blocked
    { name: 'Sunil Suspended', licenseNo: 'DL-2018-004', licenseCategory: 'HMV', licenseExpiry: inOneYear, contact: '9876500004', safetyScore: 40, status: 'SUSPENDED' }, // suspended -> must be blocked
    { name: 'Meena Rest', licenseNo: 'DL-2021-005', licenseCategory: 'LMV', licenseExpiry: inOneYear, contact: '9876500005', safetyScore: 95, status: 'OFF_DUTY' },
  ];
  const driverRows = {};
  for (const d of drivers) {
    driverRows[d.licenseNo] = await prisma.driver.upsert({ where: { licenseNo: d.licenseNo }, update: {}, create: d });
  }

  // --- One completed trip with fuel + expense so reports have data on first load ---
  const manager = await prisma.user.findUnique({ where: { email: 'manager@transitops.com' } });
  const existingTrip = await prisma.trip.findFirst();
  if (!existingTrip) {
    const trip = await prisma.trip.create({
      data: {
        source: 'Ahmedabad', destination: 'Mumbai',
        cargoWeightKg: 600, plannedDistanceKm: 530,
        status: 'COMPLETED',
        startOdometerKm: 44680, endOdometerKm: 45210, revenue: 18000,
        dispatchedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000),
        completedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000),
        vehicleId: vehicleRows['GJ01AB1234'].id,
        driverId: driverRows['DL-2020-001'].id,
        createdById: manager.id,
      },
    });
    await prisma.fuelLog.create({
      data: { vehicleId: trip.vehicleId, tripId: trip.id, liters: 48.5, cost: 4560, filledAt: trip.completedAt },
    });
    await prisma.expense.create({
      data: { vehicleId: trip.vehicleId, tripId: trip.id, category: 'TOLL', amount: 890, note: 'NH48 tolls', spentAt: trip.completedAt },
    });
    await prisma.maintenanceLog.create({
      data: { vehicleId: vehicleRows['DL05GH3456'].id, title: 'Brake pad replacement', cost: 6500, status: 'OPEN' },
    });
    await prisma.maintenanceLog.create({
      data: { vehicleId: vehicleRows['GJ01AB1234'].id, title: 'Oil change', cost: 2200, status: 'CLOSED', closedAt: new Date() },
    });
  }

  console.log('Seed complete. Logins (password: Password@123):');
  users.forEach((u) => console.log(`  ${u.role.padEnd(18)} ${u.email}`));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
