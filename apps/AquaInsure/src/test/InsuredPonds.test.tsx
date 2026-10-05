import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import InsuredPonds from "../views/insurance/InsuredPonds";

// Mock router
let mockSearchParams = new URLSearchParams();
vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: "/insured-ponds" }),
  useSearchParams: () => [mockSearchParams],
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
              {
                _id: "p1",
                pondNumber: 1,
                name: "Pond 1",
                surveyNumber: "67676776",
                dimensionAcres: 1.0,
                photo: "https://example.com/pond1.jpg",
                address: { village: "Pondur", district: "Nellore" },
              },
              {
                _id: "p2",
                pondNumber: 2,
                name: "Pond 2",
                surveyNumber: "73737878",
                dimensionAcres: 1.5,
                address: { village: "Pondur", district: "Nellore" },
              },
              {
                _id: "p3",
                pondNumber: 3,
                name: "Pond 3",
                surveyNumber: "99881122",
                dimensionAcres: 2.0,
                address: { village: "Pondur", district: "Nellore" },
              },
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
        // Only Pond 1 and Pond 3 are insured!
        return Promise.resolve({
          data: {
            success: true,
            data: [
              {
                _id: "ins-1",
                pondId: { _id: "p1" },
                species: "vannamei",
                stockingDensity: 45,
                stockingDate: "2026-10-05T00:00:00.000Z",
                insuranceType: "comprehensive",
                insurancePeriodDays: 120,
              },
              {
                _id: "ins-3",
                pondId: { _id: "p3" },
                species: "tiger",
                stockingDensity: 30,
                stockingDate: "2026-09-15T00:00:00.000Z",
                insuranceType: "basic",
                insurancePeriodDays: 90,
              },
            ],
          },
        });
      }
      return Promise.resolve({ data: { success: true } });
    }),
    patch: vi.fn(() => Promise.resolve({ data: { success: true } })),
  },
}));

describe("InsuredPonds Read-Only Dashboard View", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(
      "aqua-session",
      JSON.stringify({ token: "test-token", farmerId: "farmer-123" })
    );
    localStorage.setItem("aqua-reg-complete", "1");
    mockSearchParams = new URLSearchParams("view=readonly");
  });

  it("renders read-only view displaying ONLY the insured ponds", async () => {
    render(<InsuredPonds />);

    // Wait for data hydration
    await waitFor(() => {
      expect(screen.getByText("Verified Insured Ponds")).toBeInTheDocument();
    });

    // Check header counter shows 2 Insured
    expect(screen.getByText("2 Insured")).toBeInTheDocument();

    // Pond 1 (insured) and Pond 3 (insured) MUST be displayed
    expect(screen.getByText("Pond 1")).toBeInTheDocument();
    expect(screen.getByText("Pond 3")).toBeInTheDocument();

    // Pond 2 (NOT insured) MUST NOT be displayed!
    expect(screen.queryByText("Pond 2")).toBeNull();
  });

  it("displays policy specifications in read-only format without editable inputs", async () => {
    render(<InsuredPonds />);

    await waitFor(() => {
      expect(screen.getByText("Verified Insured Ponds")).toBeInTheDocument();
    });

    // Species should be displayed as text
    expect(screen.getByText("L. Vannamei (Whiteleg)")).toBeInTheDocument();
    expect(screen.getByText("P. Monodon (Black Tiger)")).toBeInTheDocument();

    // Policy types should be displayed as text
    expect(screen.getByText("Comprehensive (All Risks)")).toBeInTheDocument();
    expect(screen.getByText("Standard Basic (Calamity)")).toBeInTheDocument();

    // Densities should be displayed
    expect(screen.getByText("45 PL / m²")).toBeInTheDocument();
    expect(screen.getByText("30 PL / m²")).toBeInTheDocument();

    // Periods should be displayed
    expect(screen.getByText("120 Days")).toBeInTheDocument();
    expect(screen.getByText("90 Days")).toBeInTheDocument();

    // Ensure Read-Only badge is visible
    expect(screen.getByText("Read-Only")).toBeInTheDocument();
    // Ensure NO Edit button exists
    expect(screen.queryByText("Edit")).toBeNull();

    // Ensure NO editable number/text input fields exist
    expect(screen.queryByPlaceholderText("e.g. 1.2")).toBeNull();
    // Ensure NO camera/take photo buttons exist
    expect(screen.queryByText("Take Photo")).toBeNull();
    expect(screen.queryByText("Upload File")).toBeNull();
    // Ensure NO onboarding submission button exists
    expect(screen.queryByText(/Next: Configure Insurance/i)).toBeNull();
  });
});
