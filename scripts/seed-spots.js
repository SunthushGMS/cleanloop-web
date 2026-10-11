/**
 * Demo data for Adopt-a-Spot, so a demo doesn't start from an empty page.
 * Uses the demo accounts from scripts/seed.js (run `npm run seed` first).
 *
 *   node scripts/seed-spots.js           add (or reset) the demo spots
 *   node scripts/seed-spots.js --remove  delete everything this script added
 *
 * Safe to run more than once: it only touches the spots, check-ins and
 * requests with the names below, owned by the demo accounts.
 */
require("dotenv").config({ path: ".env.local" });
const mongoose = require("mongoose");

const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = (n) => new Date(Date.now() - n * DAY_MS);
// Same as localDayKey() in src/lib/spotConstants.js.
const dayKey = (date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Colombo" }).format(date);
const zoneKey = (zone) => zone.trim().toLowerCase().replace(/\s+/g, " ");

// adoptedDaysAgo: null = no volunteer. checkIns: [daysAgo, condition, note], oldest first.
const DEMO_SPOTS = [
  {
    name: "Canal bridge corner",
    street: "Canal Road",
    zone: "Ward 4",
    description: "Household waste is left near the lamp post most weekends.",
    adoptedDaysAgo: 60,
    checkIns: [
      [56, "dumped", "Four sacks of household waste by the lamp post"],
      [42, "needs_attention", "Two bags again, smaller than before"],
      [28, "clean", "Crew cleared it, all clear"],
      [14, "clean", "Still clear"],
      [2, "dumped", "Two sacks of household waste near the lamp post"],
    ],
  },
  {
    name: "Market lane behind stalls",
    street: "Market Road",
    zone: "Ward 4",
    description: "Vegetable waste and boxes from the evening market.",
    adoptedDaysAgo: 45,
    // Last visit 20 days ago, so it shows as stale on the admin page.
    checkIns: [
      [40, "needs_attention", "Boxes stacked against the wall"],
      [20, "clean", "Clear after the market committee cleanup"],
    ],
  },
  {
    name: "Bus stand rear lane",
    street: "Station Road",
    zone: "Ward 5",
    description: "Construction rubble appears behind the shelter.",
    adoptedDaysAgo: 30,
    checkIns: [
      [25, "dumped", "Pile of bricks and cement bags"],
      [11, "needs_attention", "Some rubble left after collection"],
      [3, "clean", "All clear"],
    ],
  },
  {
    name: "Temple road junction",
    street: "Temple Road",
    zone: "Ward 6",
    description: "Garden waste piles up after weekends.",
    adoptedDaysAgo: null,
    checkIns: [],
  },
];

// Pending requests for the admin review queue.
const DEMO_REQUESTS = [
  {
    landmark: "School lane drain",
    street: "School Lane",
    zone: "Ward 5",
    description: "Plastic bags dumped into the drain every week.",
    wantsToAdopt: true,
  },
  {
    // Same place as "Canal bridge corner", typed differently: shows the merge flow.
    landmark: "Canal Rd bridge",
    street: "Canal Rd",
    zone: "ward 4",
    description: "Rubbish by the bridge again.",
    wantsToAdopt: false,
  },
];

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Set MONGODB_URI in .env.local first");
  await mongoose.connect(uri);
  const db = mongoose.connection;

  const users = db.collection("users");
  const volunteer = await users.findOne({ email: "volunteer@cleanloop.test" });
  const admin = await users.findOne({ email: "admin@cleanloop.test" });
  if (!volunteer || !admin) {
    throw new Error("Demo accounts not found. Run `npm run seed` first.");
  }

  const spots = db.collection("spots");
  const checkins = db.collection("checkins");
  const requests = db.collection("spotrequests");

  const spotFilter = { name: { $in: DEMO_SPOTS.map((s) => s.name) }, createdBy: admin._id };
  const requestFilter = {
    landmark: { $in: DEMO_REQUESTS.map((r) => r.landmark) },
    reporter: volunteer._id,
  };

  // Clear previous demo data first, so re-running resets it.
  const existing = await spots.find(spotFilter).project({ _id: 1 }).toArray();
  const removedCheckIns = await checkins.deleteMany({ spot: { $in: existing.map((s) => s._id) } });
  const removedSpots = await spots.deleteMany(spotFilter);
  const removedRequests = await requests.deleteMany(requestFilter);

  if (process.argv.includes("--remove")) {
    console.log(
      `Removed ${removedSpots.deletedCount} demo spots, ${removedCheckIns.deletedCount} check-ins, ` +
        `${removedRequests.deletedCount} requests.`
    );
    await mongoose.disconnect();
    return;
  }

  for (const s of DEMO_SPOTS) {
    const adopted = s.adoptedDaysAgo !== null;
    const now = new Date();
    const { insertedId } = await spots.insertOne({
      name: s.name,
      street: s.street,
      zone: s.zone,
      zoneKey: zoneKey(s.zone),
      description: s.description,
      adopter: adopted ? volunteer._id : null,
      adoptedAt: adopted ? daysAgo(s.adoptedDaysAgo) : null,
      lastCheckIn: null,
      createdBy: admin._id,
      sourceRequest: null,
      createdAt: adopted ? daysAgo(s.adoptedDaysAgo) : now,
      updatedAt: now,
      __v: 0,
    });

    const docs = s.checkIns.map(([ago, condition, note]) => {
      const at = daysAgo(ago);
      return { spot: insertedId, volunteer: volunteer._id, condition, note, day: dayKey(at), createdAt: at, updatedAt: at, __v: 0 };
    });
    if (docs.length) {
      await checkins.insertMany(docs);
      const last = docs[docs.length - 1];
      await spots.updateOne(
        { _id: insertedId },
        { $set: { lastCheckIn: { condition: last.condition, note: last.note, at: last.createdAt, by: volunteer._id } } }
      );
    }
    console.log(`Spot: ${s.name} (${adopted ? "adopted" : "no volunteer"}, ${docs.length} check-ins)`);
  }

  for (const r of DEMO_REQUESTS) {
    const now = new Date();
    await requests.insertOne({
      ...r,
      reporter: volunteer._id,
      photo: null,
      hasPhoto: false,
      status: "pending",
      rejectReason: "",
      spot: null,
      reviewedBy: null,
      reviewedAt: null,
      createdAt: now,
      updatedAt: now,
      __v: 0,
    });
    console.log(`Pending request: ${r.landmark}`);
  }

  console.log("\nLog in as volunteer@cleanloop.test or admin@cleanloop.test to see them.");
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
