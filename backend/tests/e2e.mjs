// End-to-end test of every mandatory business rule against the live API
const BASE = 'http://localhost:5000/api';
let token = '';
const req = async (method, path, body) => {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json().catch(() => ({})) };
};
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);

// 1. Auth
let r = await req('POST', '/auth/login', { email: 'manager@transitops.com', password: 'wrong' });
check('Wrong password rejected (401)', r.status === 401);
r = await req('POST', '/auth/login', { email: 'not-an-email', password: 'x' });
check('Invalid email format rejected (400)', r.status === 400, r.data.error);
r = await req('POST', '/auth/login', { email: 'manager@transitops.com', password: 'Password@123' });
check('Manager login works', r.status === 200 && !!r.data.token);
token = r.data.token;

// 2. Look up seeded records
const vehicles = (await req('GET', '/vehicles')).data;
const drivers = (await req('GET', '/drivers')).data;
const van = vehicles.find((v) => v.regNo === 'GJ01AB1234'); // 750 kg, AVAILABLE
const alex = drivers.find((d) => d.name === 'Alex Kumar');
const expired = drivers.find((d) => d.name === 'Ravi Expired');
const suspended = drivers.find((d) => d.name === 'Sunil Suspended');
const retired = vehicles.find((v) => v.status === 'RETIRED');

// 3. Duplicate registration number
r = await req('POST', '/vehicles', { regNo: 'GJ01AB1234', name: 'Dup', type: 'Van', maxLoadKg: 100, acquisitionCost: 1 });
check('Duplicate reg no rejected (409)', r.status === 409, r.data.error);

// 4. Business-rule rejections on trip creation
r = await req('POST', '/trips', { source: 'A', destination: 'B', vehicleId: van.id, driverId: alex.id, cargoWeightKg: 9999, plannedDistanceKm: 10 });
check('Overweight cargo rejected', r.status === 400, r.data.error);
r = await req('POST', '/trips', { source: 'A', destination: 'B', vehicleId: van.id, driverId: expired.id, cargoWeightKg: 100, plannedDistanceKm: 10 });
check('Expired-license driver rejected', r.status === 400, r.data.error);
r = await req('POST', '/trips', { source: 'A', destination: 'B', vehicleId: van.id, driverId: suspended.id, cargoWeightKg: 100, plannedDistanceKm: 10 });
check('Suspended driver rejected', r.status === 400, r.data.error);
r = await req('POST', '/trips', { source: 'A', destination: 'B', vehicleId: retired.id, driverId: alex.id, cargoWeightKg: 100, plannedDistanceKm: 10 });
check('Retired vehicle rejected', r.status === 400, r.data.error);

// 5. Full happy-path lifecycle
r = await req('POST', '/trips', { source: 'Surat', destination: 'Pune', vehicleId: van.id, driverId: alex.id, cargoWeightKg: 500, plannedDistanceKm: 420 });
check('Valid trip created as DRAFT', r.status === 201 && r.data.status === 'DRAFT');
const tripId = r.data.id;

r = await req('POST', `/trips/${tripId}/dispatch`);
check('Dispatch works', r.status === 200 && r.data.status === 'DISPATCHED');
check('  → vehicle flips to ON_TRIP', r.data.vehicle.status === 'ON_TRIP');
check('  → driver flips to ON_TRIP', r.data.driver.status === 'ON_TRIP');

// Double-assignment while on trip
r = await req('POST', '/trips', { source: 'X', destination: 'Y', vehicleId: van.id, driverId: alex.id, cargoWeightKg: 100, plannedDistanceKm: 10 });
check('Double-assignment of on-trip vehicle/driver rejected (409)', r.status === 409, r.data.error);

const startOdo = Number(van.odometerKm);
r = await req('POST', `/trips/${tripId}/complete`, { endOdometerKm: startOdo - 100 });
check('Odometer going backwards rejected', r.status === 400, r.data.error);

r = await req('POST', `/trips/${tripId}/complete`, { endOdometerKm: startOdo + 420, fuelLiters: 38, fuelCost: 3600, revenue: 15000 });
check('Complete works', r.status === 200 && r.data.status === 'COMPLETED');
check('  → vehicle back to AVAILABLE, odometer updated', r.data.vehicle.status === 'AVAILABLE' && Number(r.data.vehicle.odometerKm) === startOdo + 420);
check('  → driver back to AVAILABLE', r.data.driver.status === 'AVAILABLE');

// 6. Maintenance flow
r = await req('POST', '/maintenance', { vehicleId: van.id, title: 'E2E test service', cost: 1000 });
check('Maintenance opened, vehicle IN_SHOP', r.status === 201 && r.data.vehicle.status === 'IN_SHOP');
const maintId = r.data.id;
let avail = (await req('GET', '/vehicles?available=true')).data;
check('  → in-shop vehicle hidden from dispatch pool', !avail.some((v) => v.id === van.id));
r = await req('POST', `/maintenance/${maintId}/close`, { cost: 1200 });
check('Maintenance closed, vehicle AVAILABLE again', r.status === 200);
avail = (await req('GET', '/vehicles?available=true')).data;
check('  → vehicle back in dispatch pool', avail.some((v) => v.id === van.id));

// 7. RBAC: analyst cannot create vehicles
const analystLogin = await req('POST', '/auth/login', { email: 'analyst@transitops.com', password: 'Password@123' });
token = analystLogin.data.token;
r = await req('POST', '/vehicles', { regNo: 'ZZ99ZZ9999', name: 'Nope', type: 'Van', maxLoadKg: 1, acquisitionCost: 1 });
check('RBAC: analyst blocked from creating vehicles (403)', r.status === 403, r.data.error);

// 8. Reports + dashboard
r = await req('GET', '/reports/vehicles');
check('Reports return data with ROI/efficiency', r.status === 200 && r.data.length > 0 && 'roi' in r.data[0]);
r = await req('GET', '/dashboard');
check('Dashboard KPIs work', r.status === 200 && 'fleetUtilization' in r.data);
const csv = await fetch(BASE + '/reports/vehicles?format=csv', { headers: { Authorization: `Bearer ${token}` } });
check('CSV export works', csv.status === 200 && (csv.headers.get('content-type') || '').includes('csv'));

console.log(results.join('\n'));
const fails = results.filter((x) => x.startsWith('FAIL')).length;
console.log(`\n${results.length - fails}/${results.length} passed`);
process.exit(fails ? 1 : 0);
