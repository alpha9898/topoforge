import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { StandardPathPanel } from "@/components/StandardPathPanel";
import type { TopologyResponse } from "@/lib/types";

const topology: TopologyResponse = {
  title: "Test",
  devices: [
    { id: "admin", name: "Admin", type: "admin_endpoint", x: 0, y: 0, width: 160, height: 80, ports: [], aliases: [] },
    { id: "vpn-gateway", name: "VPN Gateway", type: "vpn_gateway", x: 0, y: 0, width: 160, height: 80, ports: [], aliases: [] },
    { id: "internet", name: "Internet", type: "cloud", x: 0, y: 0, width: 160, height: 80, ports: [], aliases: [] }
  ],
  cables: [],
  issues: [],
  zones: [],
  legend: [],
  notes: []
};

describe("StandardPathPanel", () => {
  it("submits standard path edits", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn().mockResolvedValue(undefined);
    render(<StandardPathPanel topology={topology} busy={false} onApply={onApply} />);

    const adminInput = screen.getByDisplayValue("Admin");
    await user.clear(adminInput);
    await user.type(adminInput, "NOC Admin");
    await user.click(screen.getByRole("button", { name: /apply path edits/i }));

    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({
        device_updates: [expect.objectContaining({ id: "admin", name: "NOC Admin" })]
      })
    );
  });
});
