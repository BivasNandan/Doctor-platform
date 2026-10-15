import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import { resetDemoDb } from "../services/demo/db.js";

// jsdom lacks these browser APIs.
window.scrollTo = vi.fn();
window.matchMedia = vi.fn().mockImplementation((query) => ({
  matches: false,
  media: query,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
}));

beforeEach(() => {
  resetDemoDb();
  window.location.hash = "";
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.title = "";
});
