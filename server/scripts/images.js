// Photos for the demo doctors and facilities. The files live in client/public/images (see docs/IMAGE_CREDITS.md);
// the database stores the path relative to the website's base URL and the website resolves it.

export const FACILITY_IMAGES = {
  "Carewell Medical Centre": "images/facilities/carewell-medical-centre.jpg",
  "Lakeside Specialist Hospital": "images/facilities/lakeside-specialist-hospital.jpg",
  "Greenline Family Clinic": "images/facilities/greenline-family-clinic.jpg",
  "Dhanmondi Family Health Clinic": "images/facilities/dhanmondi-family-health-clinic.jpg",
  "Uttara Community Hospital": "images/facilities/uttara-community-hospital.jpg",
  "Mirpur Care Clinic": "images/facilities/mirpur-care-clinic.jpg",
  "Bashundhara Medical Institute": "images/facilities/bashundhara-medical-institute.jpg",
  "Mohammadpur Child & Women Clinic": "images/facilities/mohammadpur-child-women-clinic.jpg",
  "Motijheel Diagnostic & Consultation Centre":
    "images/facilities/motijheel-diagnostic-consultation-centre.jpg",
  "Agrabad Specialist Clinic": "images/facilities/agrabad-specialist-clinic.jpg",
  "Zindabazar Health Centre": "images/facilities/zindabazar-health-centre.jpg",
};

/** The demo doctors' sign-in names (before @carewell.test); each has images/doctors/<name>.jpg. */
export const DEMO_DOCTORS = [
  "nusrat.karim",
  "tanvir.hossain",
  "farzana.haque",
  "imran.chowdhury",
  "shirin.akter",
  "rakibul.islam",
  "sadia.rahman",
  "arman.siddique",
  "mehnaz.sultana",
  "zahid.anwar",
  "lamia.parvin",
  "habibur.rahman",
  "anika.tabassum",
  "kamrul.hasan",
  "rubel.yasin",
  "mahbub.alam",
];

export const doctorImage = (local) => `images/doctors/${local}.jpg`;

/** A demo doctor whose name was changed so the photo (a man) matches the name. */
const RENAMES = [{ from: "rubina.yasmin", to: "rubel.yasin", name: "Dr. Rubel Yasin" }];

/** Renames the demo doctors listed above, keeping their profile, appointments and messages. Returns how many. */
export async function applyRenames(prisma) {
  let changed = 0;
  for (const { from, to, name } of RENAMES) {
    const user = await prisma.user.findUnique({ where: { email: `${from}@carewell.test` } });
    if (!user || (await prisma.user.findUnique({ where: { email: `${to}@carewell.test` } }))) continue;
    await prisma.user.update({ where: { id: user.id }, data: { name, email: `${to}@carewell.test` } });
    changed += 1;
  }
  return changed;
}

/** Sets the photo of every demo facility and doctor that exists. Returns how many rows changed. */
export async function applyImages(prisma) {
  let changed = 0;
  for (const [name, image] of Object.entries(FACILITY_IMAGES)) {
    const result = await prisma.clinic.updateMany({
      where: { name, OR: [{ image: null }, { NOT: { image } }] },
      data: { image },
    });
    changed += result.count;
  }
  for (const local of DEMO_DOCTORS) {
    const image = doctorImage(local);
    const result = await prisma.doctor.updateMany({
      where: { user: { email: `${local}@carewell.test` }, OR: [{ image: null }, { NOT: { image } }] },
      data: { image },
    });
    changed += result.count;
  }
  return changed;
}
