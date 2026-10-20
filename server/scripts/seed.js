import { prisma } from "../src/config/prisma.js";
import { hashPassword } from "../src/services/auth.js";

// Creates the first administrator and the reference data the app needs to be usable.
// Safe to run more than once: it updates what exists and creates what is missing.
//
//   SEED_ADMIN_EMAIL     (default admin@carewell.test)
//   SEED_ADMIN_PASSWORD  (required, at least 10 characters; set it in the root .env.local)

const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@carewell.test").trim().toLowerCase();
const password = process.env.SEED_ADMIN_PASSWORD ?? "";

if (password.length < 10) {
  console.error("Set SEED_ADMIN_PASSWORD (10+ characters) in the root .env.local first.");
  process.exit(1);
}

const specialties = [
  { id: "cardiology", name: "Cardiology", description: "Heart & circulation" },
  { id: "dermatology", name: "Dermatology", description: "Skin & hair" },
  { id: "pediatrics", name: "Pediatrics", description: "Children’s health" },
  { id: "dentistry", name: "Dentistry", description: "Dental care" },
  { id: "neurology", name: "Neurology", description: "Brain & nerves" },
  { id: "gynecology", name: "Gynecology", description: "Women’s health" },
];

const clinics = [
  {
    name: "Carewell Medical Centre",
    type: "clinic",
    address: "House 18, Road 27",
    area: "Dhanmondi",
    city: "Dhaka",
    phone: "+880 2 5500 1200",
    openingHours: "8:00 AM–9:00 PM",
    image: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Lakeside Specialist Hospital",
    type: "hospital",
    address: "Plot 6, Road 71",
    area: "Gulshan",
    city: "Dhaka",
    phone: "+880 2 5881 4500",
    openingHours: "Open 24 hours",
    image: "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Greenline Family Clinic",
    type: "clinic",
    address: "House 9, Road 11",
    area: "Banani",
    city: "Dhaka",
    phone: "+880 2 8822 1000",
    openingHours: "9:00 AM–8:00 PM",
    image: "https://images.unsplash.com/photo-1631815588090-d4bfec5b1ccb?auto=format&fit=crop&w=900&q=80",
  },
];

try {
  const passwordHash = await hashPassword(password);
  const admin = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: "admin", accountStatus: "active", emailVerifiedAt: new Date() },
    create: {
      name: "Carewell administrator",
      email,
      passwordHash,
      role: "admin",
      emailVerifiedAt: new Date(),
    },
  });

  for (const specialty of specialties)
    await prisma.specialty.upsert({ where: { id: specialty.id }, update: {}, create: specialty });

  let createdClinics = 0;
  for (const clinic of clinics) {
    const exists = await prisma.clinic.findFirst({ where: { name: clinic.name } });
    if (!exists) {
      await prisma.clinic.create({ data: clinic });
      createdClinics += 1;
    }
  }

  console.log(`Administrator ready: ${admin.email}`);
  console.log(
    `Specialties: ${specialties.length} ensured. Clinics: ${createdClinics} created, ${clinics.length - createdClinics} already existed.`,
  );
} catch (error) {
  console.error("Seeding failed:", error.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
