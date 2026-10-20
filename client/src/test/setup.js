import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import { resetDemoDb } from "../services/demoBackend.js";

// jsdom lacks these browser APIs.
window.scrollTo = vi.fn();
window.matchMedia = vi.fn().mockImplementation((query) => ({
  matches: false,
  media: query,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
}));

// jsdom has no IntersectionObserver (framer-motion's whileInView needs one). Treat everything as visible.
class FakeIntersectionObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe(element) {
    this.callback([{ isIntersecting: true, intersectionRatio: 1, target: element }], this);
  }
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
window.IntersectionObserver = FakeIntersectionObserver;
globalThis.IntersectionObserver = FakeIntersectionObserver;

beforeEach(() => {
  resetDemoDb();
  window.location.hash = "";
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.title = "";
});
