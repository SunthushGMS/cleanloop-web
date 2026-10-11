/**
 * Seeds one demo account per role (two crew members), two demo zones (with
 * known stops), a truck, published Ward 4 schedules, and today's route, so Sprint Review can log
 * in as any persona immediately — including the new zone-dropdown flow.
 *
 * Run with: npm run seed   (reads MONGODB_URI from .env.local)
 */
require("dotenv").config({ path: ".env.local" });
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const DEMO_PASSWORD = "Password123";

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Set MONGODB_URI in .env.local first");

  await mongoose.connect(uri);

  const UserSchema = new mongoose.Schema(
    {
      name: String,
      email: String,
      passwordHash: String,
      role: String,
      zone: String,
    },
    { timestamps: true }
  );
  const RouteSchema = new mongoose.Schema(
    {
      zone: String,
      date: Date,
      assignedTo: mongoose.Schema.Types.ObjectId,
      crew: [mongoose.Schema.Types.ObjectId],
      vehicle: mongoose.Schema.Types.ObjectId,
      stops: [{ label: String, completed: Boolean, completedAt: Date }],
      startedAt: Date,
      completedAt: Date,
    },
    { timestamps: true }
  );
  // Mirrors src/lib/models/Zone.js closely enough for seeding. Kept as a
  // separate schema here (same pattern already used above for
  // User/Route) rather than importing the Next.js app's model file into
  // this standalone CommonJS script.
  const ZoneSchema = new mongoose.Schema(
    {
      name: { type: String, unique: true, trim: true },
      stops: [{ type: String, trim: true }],
    },
    { timestamps: true }
  );

  const ResourceSchema = new mongoose.Schema(
    {
      name: String,
      category: String,
      identifier: String,
      status: String,
      condition: String,
      quantity: Number,
      zone: String,
      meta: { type: Map, of: String },
    },
    { timestamps: true }
  );
  const ScheduleSchema = new mongoose.Schema(
    {
      zone: String,
      dayOfWeek: String,
      wasteType: String,
      startTime: String,
      endTime: String,
      notes: String,
      status: String,
      publishedAt: Date,
      createdBy: mongoose.Schema.Types.ObjectId,
    },
    { timestamps: true }
  );

  const User = mongoose.models.User || mongoose.model("User", UserSchema);
  const Resource = mongoose.models.Resource || mongoose.model("Resource", ResourceSchema);
  const Schedule = mongoose.models.Schedule || mongoose.model("Schedule", ScheduleSchema);
  const Route = mongoose.models.Route || mongoose.model("Route", RouteSchema);
  const Zone = mongoose.models.Zone || mongoose.model("Zone", ZoneSchema);

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const demoUsers = [
    { name: "Nadeesha Perera", email: "resident@cleanloop.test", role: "resident", zone: "Ward 4" },
    { name: "Chamathka Samarasinghe", email: "admin@cleanloop.test", role: "admin", zone: null },
    { name: "Daniel Sams", email: "employee@cleanloop.test", role: "employee", zone: null },
    { name: "Kasun Fernando", email: "employee2@cleanloop.test", role: "employee", zone: null },
    { name: "Community Coordinator", email: "volunteer@cleanloop.test", role: "volunteer", zone: null },
  ];

  const createdUsers = {};
  for (const u of demoUsers) {
    const existing = await User.findOneAndUpdate(
      { email: u.email },
      { ...u, passwordHash },
      { upsert: true, new: true }
    );
    createdUsers[u.email] = existing;
    console.log(`Upserted ${u.role}: ${u.email}`);
  }

  // Seed two zones so every dropdown across the app (registration,
  // schedules, resources, route builder) has real data immediately —
  // Ward 4's stops deliberately match the sample route below, so route
  // builder testing works without any manual Zone manager setup first.
  const demoZones = [
    { name: "Ward 4", stops: ["12 Lotus Lane", "14 Lotus Lane", "Corner of Palm & 3rd"] },
    { name: "Ward 7", stops: ["3 Cinnamon Road", "5 Cinnamon Road", "Riverside Market"] },
  ];
  for (const z of demoZones) {
    await Zone.findOneAndUpdate({ name: z.name }, z, { upsert: true });
    console.log(`Upserted zone: ${z.name}`);
  }

  const admin = createdUsers["admin@cleanloop.test"];
  const driver = createdUsers["employee@cleanloop.test"];
  const helper = createdUsers["employee2@cleanloop.test"];

  // A truck for team & vehicle allocation (CPT-39).
  const truck = await Resource.findOneAndUpdate(
    { category: "truck", identifier: "WP-CAB-4021" },
    {
      name: "Compactor Truck 1",
      category: "truck",
      identifier: "WP-CAB-4021",
      status: "active",
      condition: "good",
      quantity: 1,
      zone: "Ward 4",
      meta: { plate: "WP-CAB-4021", fuelType: "diesel" },
    },
    { upsert: true, new: true }
  );
  console.log("Upserted truck: Compactor Truck 1");

  // Published schedules for Ward 4 so the resident dashboard (CPT-36)
  // has something to show.
  const demoSchedules = [
    { zone: "Ward 4", dayOfWeek: "Tuesday", wasteType: "general", startTime: "07:00", endTime: "10:00", notes: "Bins out by 7am, lids closed." },
    { zone: "Ward 4", dayOfWeek: "Friday", wasteType: "recycling", startTime: "08:00", endTime: "11:00", notes: "" },
  ];
  for (const sch of demoSchedules) {
    await Schedule.findOneAndUpdate(
      { zone: sch.zone, dayOfWeek: sch.dayOfWeek, wasteType: sch.wasteType },
      { ...sch, status: "published", publishedAt: new Date(), createdBy: admin._id },
      { upsert: true }
    );
  }
  console.log("Upserted Ward 4 schedules");

  // Route dates are calendar days stored as UTC midnight (see
  // todayBounds() in src/lib/routes.js), so "today" is built the same way.
  const now = new Date();
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

  await Route.findOneAndUpdate(
    { zone: "Ward 4", assignedTo: driver._id },
    {
      zone: "Ward 4",
      date: today,
      assignedTo: driver._id,
      crew: [helper._id],
      vehicle: truck._id,
      startedAt: null,
      completedAt: null,
      stops: [
        { label: "12 Lotus Lane", completed: false, completedAt: null },
        { label: "14 Lotus Lane", completed: false, completedAt: null },
        { label: "Corner of Palm & 3rd", completed: false, completedAt: null },
      ],
    },
    { upsert: true }
  );
  console.log("Upserted today's Ward 4 route (Daniel + Kasun, Compactor Truck 1)");

  console.log(`\nAll demo accounts use the password: ${DEMO_PASSWORD}`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});