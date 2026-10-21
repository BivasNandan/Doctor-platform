import "../src/config/env.js"; // loads .env.local before Prisma starts
import { prisma } from "../src/config/prisma.js";
import { applyImages, applyRenames } from "./images.js";

// Gives the demo doctors and facilities their photos (and applies the one demo-doctor rename that matches a photo).
// Safe to run more than once; it only changes rows that differ. `npm run seed:images`
try {
  const renamed = await applyRenames(prisma);
  const changed = await applyImages(prisma);
  console.log(`Demo photos applied: ${changed} row(s) updated, ${renamed} doctor(s) renamed.`);
} finally {
  await prisma.$disconnect();
}
