export const toFacility = (clinic) => ({
  id: clinic.id,
  name: clinic.name,
  type: clinic.type,
  address: clinic.address,
  area: clinic.area,
  city: clinic.city,
  phone: clinic.phone,
  openingHours: clinic.openingHours ?? undefined,
  image: clinic.image ?? "",
  active: clinic.active,
});

/** The specialty's id IS its slug, exactly as the frontend uses it. */
export const toSpecialty = (specialty) => ({
  id: specialty.id,
  name: specialty.name,
  slug: specialty.id,
  description: specialty.description,
  active: specialty.active,
});
