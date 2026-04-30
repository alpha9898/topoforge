import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import UploadPage from "@/app/upload/page";

vi.mock("next/navigation", () => ({
  usePathname: () => "/upload",
  useRouter: () => ({ push: vi.fn() })
}));

vi.mock("@/lib/api", () => ({
  parseProject: vi.fn(),
  uploadFile: vi.fn()
}));

vi.mock("@/lib/project-state", () => ({
  resetProjectState: vi.fn(),
  saveAiPreferences: vi.fn(),
  saveProjectId: vi.fn(),
  saveTopology: vi.fn()
}));

describe("UploadPage", () => {
  it("shows a validation error for unsupported files", () => {
    render(<UploadPage />);
    const input = document.querySelector("input[type='file']") as HTMLInputElement;

    fireEvent.change(input, { target: { files: [new File(["x"], "notes.txt", { type: "text/plain" })] } });

    expect(screen.getByText("Use an Excel or CSV file.")).toBeInTheDocument();
  });
});
