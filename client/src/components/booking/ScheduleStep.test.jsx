import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../context/LanguageContext.jsx";
import ScheduleStep from "./ScheduleStep.jsx";

const slots = (data) => ({ data, loading: false, error: null, reload: () => {} });

describe("ScheduleStep", () => {
  it("shows a booked time as unavailable, explains why on hover, and ignores clicks", async () => {
    const user = userEvent.setup();
    const onTime = vi.fn();
    render(
      <LanguageProvider>
        <ScheduleStep
          date="2026-11-02"
          time=""
          onDate={() => {}}
          onTime={onTime}
          slots={slots([
            { id: "a", label: "4:00 PM", status: "available" },
            { id: "b", label: "4:10 PM", status: "booked" },
            { id: "c", label: "4:20 PM", status: "available" },
          ])}
        />
      </LanguageProvider>,
    );

    const booked = screen.getByRole("button", { name: /4:10 PM/ });
    expect(booked).toHaveAttribute("aria-disabled", "true");
    expect(booked).toHaveAttribute("title", "This time is already booked. Choose another time.");
    expect(booked).toHaveTextContent("Booked");
    await user.click(booked);
    expect(onTime).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /4:20 PM/ }));
    expect(onTime).toHaveBeenCalledWith(expect.objectContaining({ label: "4:20 PM" }));
  });
});
