import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DoctorProfileFields from "../components/doctors/DoctorProfileFields.jsx";
import { specialtyService } from "../services/index.js";
import { CatalogProvider, useCatalog } from "./CatalogContext.jsx";

function SpecialtyNames() {
  const { specialties } = useCatalog();
  return <p>{specialties.map((item) => item.name).join(", ") || "none yet"}</p>;
}

describe("CatalogProvider", () => {
  it("retries when the first load fails (e.g. the API was still starting)", async () => {
    const spy = vi
      .spyOn(specialtyService, "list")
      .mockRejectedValueOnce(new Error("The service is not reachable."));
    render(
      <CatalogProvider>
        <SpecialtyNames />
      </CatalogProvider>,
    );
    expect(await screen.findByText(/Cardiology/, {}, { timeout: 5000 })).toBeInTheDocument();
    expect(spy.mock.calls.length).toBeGreaterThanOrEqual(2);
    spy.mockRestore();
  });
});

describe("DoctorProfileFields", () => {
  const doctor = {
    name: "Dr. Late Load",
    specialtyId: "neurology",
    qualifications: ["MBBS"],
    facilityIds: ["f2"],
  };

  it("selects the doctor's specialty and ticks their clinics even when the lists arrive late", () => {
    const { rerender } = render(<DoctorProfileFields doctor={doctor} specialties={[]} facilities={[]} />);
    rerender(
      <DoctorProfileFields
        doctor={doctor}
        specialties={[
          { id: "cardiology", name: "Cardiology" },
          { id: "neurology", name: "Neurology" },
        ]}
        facilities={[
          { id: "f1", name: "Carewell Medical Centre", area: "Dhanmondi" },
          { id: "f2", name: "Lakeside Specialist Hospital", area: "Gulshan" },
        ]}
      />,
    );
    expect(screen.getByLabelText("Specialty")).toHaveValue("neurology");
    expect(screen.getByLabelText(/Lakeside Specialist Hospital/)).toBeChecked();
    expect(screen.getByLabelText(/Carewell Medical Centre/)).not.toBeChecked();
  });
});
