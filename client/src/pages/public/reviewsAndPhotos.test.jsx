import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import App, { AppProviders } from "../../App.jsx";
import { authService } from "../../services/index.js";

function renderApp(path) {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppProviders>
        <App />
      </AppProviders>
    </MemoryRouter>,
  );
  return user;
}

const signInPatient = () =>
  authService.login({ email: "demo.patient@example.test", password: "x", portal: "patient" });

describe("reviews on a doctor's profile", () => {
  it("invites guests to nothing but shows there are no reviews yet", async () => {
    renderApp("/doctors/d3");
    expect(await screen.findByRole("heading", { name: "What patients say." })).toBeInTheDocument();
    expect(await screen.findByText(/No reviews yet/)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Rate your visit" })).not.toBeInTheDocument();
  });

  it("lets a patient with a completed visit rate the doctor, edit it and delete it", async () => {
    await signInPatient();
    const user = renderApp("/doctors/d3");

    expect(await screen.findByRole("heading", { name: "Rate your visit" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Submit review" }));
    expect(await screen.findByText("Choose a rating from 1 to 5.")).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "4 stars" }));
    await user.type(screen.getByLabelText(/Share your experience/), "Clear and kind.");
    await user.click(screen.getByRole("button", { name: "Submit review" }));

    expect(await screen.findByText("Clear and kind.")).toBeInTheDocument();
    expect(screen.getByText("Your review")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Rate your visit" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("img", { name: "4 out of 5 stars" }).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /Edit/ }));
    const form = (await screen.findByRole("heading", { name: "Edit your review" })).closest("form");
    await user.click(within(form).getByRole("radio", { name: "5 stars" }));
    await user.click(within(form).getByRole("button", { name: "Save review" }));
    expect(await screen.findAllByRole("img", { name: "5 out of 5 stars" })).not.toHaveLength(0);

    await user.click(screen.getByRole("button", { name: /Delete/ }));
    await user.click(await screen.findByRole("button", { name: "Delete review" }));
    expect(await screen.findByText(/No reviews yet/)).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Rate your visit" })).toBeInTheDocument();
  });

  it("does not offer the form to a patient who has not visited this doctor", async () => {
    await signInPatient();
    renderApp("/doctors/d1");
    expect(await screen.findByRole("heading", { name: "What patients say." })).toBeInTheDocument();
    expect(await screen.findByText(/No reviews yet/)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Rate your visit" })).not.toBeInTheDocument();
  });
});

describe("profile photo on the patient's profile page", () => {
  it("adds a photo, shows it, then removes it", async () => {
    await signInPatient();
    const user = renderApp("/profile");

    expect(await screen.findByText("Profile photo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Add photo/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Remove/ })).not.toBeInTheDocument();

    const input = screen.getByLabelText("Choose a profile photo");
    await user.upload(input, new File([new Uint8Array(16)], "me.png", { type: "image/png" }));
    expect(await screen.findByText("Your photo was updated.")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Your profile photo" })).toHaveAttribute(
      "src",
      expect.stringMatching(/^data:image\/png/),
    );

    await user.click(screen.getByRole("button", { name: /Remove/ }));
    expect(await screen.findByText("Your photo was removed.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Add photo/ })).toBeInTheDocument();
  });

  it("explains why a file is refused before sending it", async () => {
    await signInPatient();
    const user = renderApp("/profile");
    const input = await screen.findByLabelText("Choose a profile photo");
    // `applyAccept: false` lets the test pick a type the input would normally filter out.
    const picker = userEvent.setup({ applyAccept: false });
    await picker.upload(input, new File(["%PDF"], "cv.pdf", { type: "application/pdf" }));
    expect(await screen.findByText("Choose a JPEG, PNG or WebP picture.")).toBeInTheDocument();
    expect(user).toBeTruthy();
  });
});

describe("administrator pages for patients and reviews", () => {
  const signInAdmin = () =>
    authService.login({ email: "admin@example.test", password: "x", portal: "admin" });

  it("lists patients and suspends one after confirmation", async () => {
    await signInAdmin();
    const user = renderApp("/admin/patients");
    expect(
      await screen.findByRole("heading", { level: 1, name: /Patients, in good standing/ }),
    ).toBeInTheDocument();
    expect(await screen.findByText("demo.patient@example.test")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Suspend" }));
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Suspend" }));
    expect(await screen.findByText("Restore")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Suspended" }));
    expect(await screen.findByText("demo.patient@example.test")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Restore" }));
    expect(await screen.findByText("No patients match this view.")).toBeInTheDocument();
  });

  it("shows the moderation page with an empty state", async () => {
    await signInAdmin();
    renderApp("/admin/reviews");
    expect(
      await screen.findByRole("heading", { level: 1, name: /Reviews, kept honest/ }),
    ).toBeInTheDocument();
    expect(await screen.findByText("No reviews in this view yet.")).toBeInTheDocument();
  });
});
