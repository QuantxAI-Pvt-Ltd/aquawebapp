import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import InsuranceRegistration from "../views/insurance/InsuranceRegistration";


// Mock router
vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: "/insurance-registration" }),
  useSearchParams: () => [new URLSearchParams()],
}));

// Mock i18n
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, defaultVal?: string) => defaultVal || key,
  }),
}));

// Mock axios
vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn((url: string) => {
      if (url.includes("/api/farms/ponds")) {
        return Promise.resolve({
          data: {
            success: true,
            data: [
              { _id: "p1", pondNumber: 1, name: "Pond 1", surveyNumber: "67676776", dimensionAcres: 1.0 },
              { _id: "p2", pondNumber: 2, name: "Pond 2", surveyNumber: "7373787832783/2", dimensionAcres: 1.5 },
              { _id: "p3", pondNumber: 3, name: "Pond 3", surveyNumber: "88990011", dimensionAcres: 2.0 },
            ],
          },
        });
      }
      if (url.includes("/api/farms/")) {
        return Promise.resolve({
          data: { success: true, data: [{ _id: "f1" }] },
        });
      }
      if (url.includes("/api/insurances")) {
        return Promise.resolve({
          data: { success: true, data: [] },
        });
      }
      return Promise.resolve({ data: { success: true } });
    }),
    post: vi.fn(() => Promise.resolve({ data: { success: true } })),
  },
}));

describe("InsuranceRegistration component with Pond Selection Box", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(
      "aqua-session",
      JSON.stringify({ token: "test-token", farmerId: "farmer-123" })
    );
    localStorage.setItem(
      "aqua-farm",
      JSON.stringify({ farmId: "f1", ponds: [] })
    );
  });

  it("renders pond selection box with all farm ponds", async () => {
    render(<InsuranceRegistration />);

    // Check title in Selection Box
    await waitFor(() => {
      expect(screen.getByText("Select Ponds to Insure")).toBeInTheDocument();
    });

    // Check all three ponds are in selection box
    expect(screen.getByText("Pond 1")).toBeInTheDocument();
    expect(screen.getByText("Pond 2")).toBeInTheDocument();
    expect(screen.getByText("Pond 3")).toBeInTheDocument();

    // Check counter shows 3 of 3 selected initially
    expect(screen.getByText("3 of 3 Selected")).toBeInTheDocument();
  });

  it("toggles pond selection and updates configuration tabs dynamically", async () => {
    render(<InsuranceRegistration />);

    await waitFor(() => {
      expect(screen.getByText("3 of 3 Selected")).toBeInTheDocument();
    });

    // Deselect Pond 2 by clicking on it
    const pond2Tile = screen.getByText("Pond 2").closest("div[class*='cursor-pointer']");
    expect(pond2Tile).not.toBeNull();
    fireEvent.click(pond2Tile!);

    await waitFor(() => {
      // Counter updates to 2 of 3 Selected
      expect(screen.getByText("2 of 3 Selected")).toBeInTheDocument();
      // Check that Pond 2 is marked as Excluded
      expect(screen.getByText("Excluded")).toBeInTheDocument();
    });
  });

  it("shows empty state when all ponds are deselected", async () => {
    render(<InsuranceRegistration />);

    await waitFor(() => {
      expect(screen.getByText("Deselect All")).toBeInTheDocument();
    });

    // Click "Deselect All"
    const deselectBtn = screen.getByText("Deselect All");
    fireEvent.click(deselectBtn);

    await waitFor(() => {
      // Empty state message appears
      expect(screen.getByText("No Ponds Selected")).toBeInTheDocument();
      expect(
        screen.getByText(/Please select at least one pond in the box above/i)
      ).toBeInTheDocument();

      // Complete Registration button is disabled
      const completeBtn = screen.getByRole("button", { name: /Complete Registration/i });
      expect(completeBtn).toBeDisabled();
    });
  });

  it("displays proper label for Stocking Density without raw key", async () => {
    render(<InsuranceRegistration />);

    await waitFor(() => {
      expect(screen.getByText(/Stocking Density \(PL \/ m²\)/i)).toBeInTheDocument();
    });

    // Ensure raw key "insurance.density" is not rendered
    expect(screen.queryByText(/insurance\.density/)).toBeNull();
  });
});
