import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";

// Sin globals de vitest, Testing Library no limpia solo.
beforeEach(() => {
  if (typeof document === "undefined") return;
  localStorage.clear();
  document.documentElement.removeAttribute("data-tema");
});
afterEach(() => {
  cleanup();
});
