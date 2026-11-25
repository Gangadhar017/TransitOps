// Seed data.
//
// Two layers:
//  1. Fixtures the end-to-end tests rely on: one login per role, and vehicles and
//     drivers covering every rule (expired licence, suspended driver, in-shop and
//     retired vehicles). These are never changed.
//  2. A demo fleet with six months of history, so the dashboard, reports and charts
//     show something real on first load. It uses its own vehicles and drivers and
//     leaves the test fixtures exactly as they were.
//
// Everything is an upsert or guarded by "only when empty", so running it twice is safe.
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const DAY = 24 * 3600 * 1000;
const HOUR = 3600 * 1000;
const daysAgo = (n) => new Date(Date.now() - n * DAY);
const round = (n, places = 0) => Math.round(n * 10 ** places) / 10 ** places;

const DEMO_USERS = [
  { name: 'Fatima Manager', email: 'manager@transitops.com', role: 'FLEET_MANAGER' },
  { name: 'Dev Driver', email: 'driver@transitops.com', role: 'DRIVER' },
  { name: 'Sana Safety', email: 'safety@transitops.com', role: 'SAFETY_OFFICER' },
  { name: 'Arjun Analyst', email: 'analyst@transitops.com', role: 'FINANCIAL_ANALYST' },
];

// kmPerLitre and ratePerKm only shape the generated history; they are not stored.
const DEMO_FLEET = [
  { regNo: 'GJ05KL2468', name: 'Tata Intra V30', type: 'Mini Truck', maxLoadKg: 1300, baseOdometerKm: 52800, acquisitionCost: 780000, region: 'West', kmPerLitre: 14, ratePerKm: 19 },
  { regNo: 'MH14MN1357', name: 'BharatBenz 1617R', type: 'Truck', maxLoadKg: 9000, baseOdometerKm: 188600, acquisitionCost: 2650000, region: 'Central', kmPerLitre: 5.5, ratePerKm: 46 },
  { regNo: 'RJ14PQ8642', name: 'Maruti Super Carry', type: 'Mini Truck', maxLoadKg: 740, baseOdometerKm: 31200, acquisitionCost: 520000, region: 'North', kmPerLitre: 17, ratePerKm: 15 },
  { regNo: 'TN09RS9753', name: 'Force Traveller Van', type: 'Van', maxLoadKg: 1600, baseOdometerKm: 79300, acquisitionCost: 1150000, region: 'South', kmPerLitre: 10.5, ratePerKm: 24 },
  { regNo: 'WB02TU4411', name: 'Eicher Pro 3015', type: 'Truck', maxLoadKg: 7200, baseOdometerKm: 143900, acquisitionCost: 2280000, region: 'East', kmPerLitre: 6.2, ratePerKm: 41 },
];

const DEMO_DRIVERS = [
  { name: 'Imran Sheikh', licenseNo: 'MH-2017-118', licenseCategory: 'HMV', licenseValidDays: 540, contact: '9876500011', safetyScore: 91 },
  { name: 'Kavita Nair', licenseNo: 'TN-2019-207', licenseCategory: 'LMV', licenseValidDays: 410, contact: '9876500012', safetyScore: 97 },
  { name: 'Harpreet Singh', licenseNo: 'RJ-2016-342', licenseCategory: 'HMV', licenseValidDays: 18, contact: '9876500013', safetyScore: 84 }, // expiring soon
  { name: 'Joseph Dsouza', licenseNo: 'WB-2020-455', licenseCategory: 'HMV', licenseValidDays: 700, contact: '9876500014', safetyScore: 89 },
];

const ROUTES = [
  ['Mumbai', 'Pune', 150], ['Pune', 'Nashik', 210], ['Nagpur', 'Hyderabad', 500], ['Delhi', 'Jaipur', 280],
  ['Jaipur', 'Udaipur', 395], ['Chennai', 'Coimbatore', 505], ['Bengaluru', 'Mysuru', 145], ['Kolkata', 'Bhubaneswar', 440],
  ['Ahmedabad', 'Rajkot', 215], ['Surat', 'Indore', 450], ['Kochi', 'Chennai', 690], ['Delhi', 'Chandigarh', 245],
];

// Days before today on which a demo trip was dispatched. The gaps shrink, so the
// monthly revenue chart climbs the way a growing operation would.
const DISPATCH_DAYS_AGO = [
  172, 165, 158, 151, 145, 139, 133, 127, 121, 116, 111, 106, 101, 96, 91, 86, 81, 76, 72, 68,
  64, 60, 56, 52, 48, 44, 40, 36, 33, 30, 27, 24, 21, 18, 15, 12, 9, 6, 4,
];

const WORKSHOP_VISITS = [
  { regNo: 'MH14MN1357', title: 'Clutch overhaul', cost: 26500, openedDaysAgo: 118, daysInShop: 3 },
  { regNo: 'WB02TU4411', title: 'Tyre replacement (4)', cost: 18400, openedDaysAgo: 83, daysInShop: 1 },
  { regNo: 'TN09RS9753', title: 'AC service and cabin filter', cost: 4200, openedDaysAgo: 47, daysInShop: 1 },
  { regNo: 'GJ05KL2468', title: 'Battery replacement', cost: 7800, openedDaysAgo: 22, daysInShop: 1 },
];

// Completed trips for the demo fleet, oldest first, with each vehicle's odometer
// carried forward from one trip to the next.
function planDemoTrips() {
  const odometer = Object.fromEntries(DEMO_FLEET.map((v) => [v.regNo, v.baseOdometerKm]));
  const trips = DISPATCH_DAYS_AGO.map((dispatchedDaysAgo, i) => {
    const vehicle = DEMO_FLEET[i % DEMO_FLEET.length];
    const driver = DEMO_DRIVERS[i % DEMO_DRIVERS.length];
    const [source, destination, km] = ROUTES[(i * 5) % ROUTES.length];
    const loadFactor = 0.55 + ((i * 7) % 40) / 100; // 55% to 94% of capacity
    const cargoWeightKg = Math.round(vehicle.maxLoadKg * loadFactor);
    const start = odometer[vehicle.regNo];
    odometer[vehicle.regNo] = start + km;
    const dispatchedAt = daysAgo(dispatchedDaysAgo);
    const litres = round(km / vehicle.kmPerLitre, 1);
    return {
      regNo: vehicle.regNo,
      licenseNo: driver.licenseNo,
      source,
      destination,
      plannedDistanceKm: km,
      cargoWeightKg,
      startOdometerKm: start,
      endOdometerKm: start + km,
      revenue: Math.round(km * vehicle.ratePerKm * (0.9 + loadFactor * 0.25)),
      dispatchedAt,
      completedAt: new Date(dispatchedAt.getTime() + (km / 45 + 6) * HOUR),
      fuel: { liters: litres, cost: round(litres * 94.5, 2) },
      toll: vehicle.type === 'Mini Truck' ? Math.round(km * 0.9) : Math.round(km * 1.6),
      parking: i % 3 === 0 ? 150 + (i % 4) * 50 : 0,
    };
  });
  return { trips, finalOdometer: odometer };
}

async function seed(client) {
  const prisma = client || new PrismaClient();
  try {
    // --- Roles ---
    const roles = {};
    for (const name of ['FLEET_MANAGER', 'DRIVER', 'SAFETY_OFFICER', 'FINANCIAL_ANALYST']) {
      roles[name] = await prisma.role.upsert({ where: { name }, update: {}, create: { name } });
    }

    // --- Users (password for all demo accounts: Password@123) ---
    const passwordHash = await bcrypt.hash('Password@123', 10);
    for (const u of DEMO_USERS) {
      await prisma.user.upsert({
        where: { email: u.email },
        update: {},
        create: { name: u.name, email: u.email, passwordHash, roleId: roles[u.role].id },
      });
    }

    // --- Test fixtures: vehicles covering every status ---
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

    // --- Test fixtures: drivers (valid, expired licence, suspended, off duty) ---
    const inOneYear = new Date(Date.now() + 365 * DAY);
    const drivers = [
      { name: 'Alex Kumar', licenseNo: 'DL-2020-001', licenseCategory: 'LMV', licenseExpiry: inOneYear, contact: '9876500001', safetyScore: 92, status: 'AVAILABLE' },
      { name: 'Priya Sharma', licenseNo: 'DL-2019-002', licenseCategory: 'HMV', licenseExpiry: inOneYear, contact: '9876500002', safetyScore: 88, status: 'AVAILABLE' },
      { name: 'Ravi Expired', licenseNo: 'DL-2015-003', licenseCategory: 'LMV', licenseExpiry: daysAgo(30), contact: '9876500003', safetyScore: 75, status: 'AVAILABLE' }, // expired -> must be blocked
      { name: 'Sunil Suspended', licenseNo: 'DL-2018-004', licenseCategory: 'HMV', licenseExpiry: inOneYear, contact: '9876500004', safetyScore: 40, status: 'SUSPENDED' }, // suspended -> must be blocked
      { name: 'Meena Rest', licenseNo: 'DL-2021-005', licenseCategory: 'LMV', licenseExpiry: inOneYear, contact: '9876500005', safetyScore: 95, status: 'OFF_DUTY' },
    ];
    const driverRows = {};
    for (const d of drivers) {
      driverRows[d.licenseNo] = await prisma.driver.upsert({ where: { licenseNo: d.licenseNo }, update: {}, create: d });
    }

    // History is only written into an empty database.
    const manager = await prisma.user.findUnique({ where: { email: 'manager@transitops.com' } });
    if (!(await prisma.trip.findFirst())) {
      // Oldest first, so trip numbers run in the order things happened.
      const demo = await seedDemoHistory(prisma, manager.id);

      // --- One completed trip on the test fixtures ---
      const trip = await prisma.trip.create({
        data: {
          source: 'Ahmedabad', destination: 'Mumbai',
          cargoWeightKg: 600, plannedDistanceKm: 530,
          status: 'COMPLETED',
          startOdometerKm: 44680, endOdometerKm: 45210, revenue: 18000,
          dispatchedAt: daysAgo(3), completedAt: daysAgo(2), createdAt: daysAgo(3),
          vehicleId: vehicleRows['GJ01AB1234'].id,
          driverId: driverRows['DL-2020-001'].id,
          createdById: manager.id,
        },
      });
      await prisma.fuelLog.create({ data: { vehicleId: trip.vehicleId, tripId: trip.id, liters: 48.5, cost: 4560, filledAt: trip.completedAt } });
      await prisma.expense.create({ data: { vehicleId: trip.vehicleId, tripId: trip.id, category: 'TOLL', amount: 890, note: 'NH48 tolls', spentAt: trip.completedAt } });
      await prisma.maintenanceLog.create({ data: { vehicleId: vehicleRows['DL05GH3456'].id, title: 'Brake pad replacement', cost: 6500, status: 'OPEN' } });
      await prisma.maintenanceLog.create({ data: { vehicleId: vehicleRows['GJ01AB1234'].id, title: 'Oil change', cost: 2200, status: 'CLOSED', closedAt: new Date() } });

      await seedLiveTrips(prisma, manager.id, demo);
    }

    console.log('Seed complete. Demo logins (password: Password@123):');
    DEMO_USERS.forEach((u) => console.log(`  ${u.role.padEnd(18)} ${u.email}`));
  } finally {
    if (!client) await prisma.$disconnect();
  }
}

// Demo fleet, its drivers, six months of completed trips and past workshop visits.
async function seedDemoHistory(prisma, managerId) {
  const { trips, finalOdometer } = planDemoTrips();

  const vehicleId = {};
  for (const v of DEMO_FLEET) {
    const row = await prisma.vehicle.upsert({
      where: { regNo: v.regNo },
      update: {},
      create: {
        regNo: v.regNo, name: v.name, type: v.type, maxLoadKg: v.maxLoadKg,
        odometerKm: finalOdometer[v.regNo], acquisitionCost: v.acquisitionCost, region: v.region, status: 'AVAILABLE',
      },
    });
    vehicleId[v.regNo] = row.id;
  }

  const driverId = {};
  for (const d of DEMO_DRIVERS) {
    const row = await prisma.driver.upsert({
      where: { licenseNo: d.licenseNo },
      update: {},
      create: {
        name: d.name, licenseNo: d.licenseNo, licenseCategory: d.licenseCategory,
        licenseExpiry: new Date(Date.now() + d.licenseValidDays * DAY),
        contact: d.contact, safetyScore: d.safetyScore, status: 'AVAILABLE',
      },
    });
    driverId[d.licenseNo] = row.id;
  }

  for (const t of trips) {
    const trip = await prisma.trip.create({
      data: {
        source: t.source, destination: t.destination,
        cargoWeightKg: t.cargoWeightKg, plannedDistanceKm: t.plannedDistanceKm,
        status: 'COMPLETED',
        startOdometerKm: t.startOdometerKm, endOdometerKm: t.endOdometerKm, revenue: t.revenue,
        dispatchedAt: t.dispatchedAt, completedAt: t.completedAt, createdAt: t.dispatchedAt,
        vehicleId: vehicleId[t.regNo], driverId: driverId[t.licenseNo], createdById: managerId,
      },
    });
    await prisma.fuelLog.create({ data: { vehicleId: trip.vehicleId, tripId: trip.id, liters: t.fuel.liters, cost: t.fuel.cost, filledAt: t.completedAt } });
    await prisma.expense.create({ data: { vehicleId: trip.vehicleId, tripId: trip.id, category: 'TOLL', amount: t.toll, note: `${t.source} to ${t.destination} tolls`, spentAt: t.completedAt } });
    if (t.parking) {
      await prisma.expense.create({ data: { vehicleId: trip.vehicleId, tripId: trip.id, category: 'PARKING', amount: t.parking, note: `Overnight parking, ${t.destination}`, spentAt: t.completedAt } });
    }
  }

  for (const w of WORKSHOP_VISITS) {
    await prisma.maintenanceLog.create({
      data: {
        vehicleId: vehicleId[w.regNo], title: w.title, cost: w.cost, status: 'CLOSED',
        openedAt: daysAgo(w.openedDaysAgo), closedAt: daysAgo(w.openedDaysAgo - w.daysInShop),
      },
    });
  }

  return { vehicleId, driverId, finalOdometer };
}

// What is happening today: one trip called off, one on the road, one waiting for dispatch.
async function seedLiveTrips(prisma, managerId, { vehicleId, driverId, finalOdometer }) {
  await prisma.trip.create({
    data: {
      source: 'Kolkata', destination: 'Bhubaneswar', cargoWeightKg: 5200, plannedDistanceKm: 440, status: 'CANCELLED',
      createdAt: daysAgo(2), cancelledAt: daysAgo(1),
      vehicleId: vehicleId['WB02TU4411'], driverId: driverId['WB-2020-455'], createdById: managerId,
    },
  });

  // On the road right now: truck and driver are both ON_TRIP.
  const truck = 'MH14MN1357';
  const onTheRoad = 'MH-2017-118';
  await prisma.trip.create({
    data: {
      source: 'Nagpur', destination: 'Hyderabad', cargoWeightKg: 7400, plannedDistanceKm: 500,
      status: 'DISPATCHED', startOdometerKm: finalOdometer[truck], dispatchedAt: new Date(Date.now() - 5 * HOUR), createdAt: new Date(Date.now() - 6 * HOUR),
      vehicleId: vehicleId[truck], driverId: driverId[onTheRoad], createdById: managerId,
    },
  });
  await prisma.vehicle.update({ where: { id: vehicleId[truck] }, data: { status: 'ON_TRIP' } });
  await prisma.driver.update({ where: { id: driverId[onTheRoad] }, data: { status: 'ON_TRIP' } });

  // A draft waiting for dispatch.
  await prisma.trip.create({
    data: {
      source: 'Chennai', destination: 'Coimbatore', cargoWeightKg: 1200, plannedDistanceKm: 505, status: 'DRAFT',
      vehicleId: vehicleId['TN09RS9753'], driverId: driverId['TN-2019-207'], createdById: managerId,
    },
  });
}

module.exports = { seed, DEMO_USERS };

if (require.main === module) {
  seed().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
