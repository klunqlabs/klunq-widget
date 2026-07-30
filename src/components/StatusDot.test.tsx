// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, screen } from "@testing-library/preact";
import StatusDot from "./StatusDot";

afterEach(cleanup);

describe("StatusDot", () => {
  it("renders checking status with default tooltip", () => {
    render(<StatusDot status="checking" />);
    expect(screen.getByText("Reaching provider...")).toBeInTheDocument();
  });

  it("renders online status with tooltip", () => {
    render(<StatusDot status="online" />);
    expect(screen.getByText("Online")).toBeInTheDocument();
  });

  it("renders no_key status with tooltip", () => {
    render(<StatusDot status="no_key" />);
    expect(screen.getByText("No API key. Try logging in to get one.")).toBeInTheDocument();
  });

  it("renders error status with custom error message", () => {
    render(<StatusDot status="error" errorMessage="401 Unauthorized" />);
    expect(screen.getByText("401 Unauthorized")).toBeInTheDocument();
  });

  it("renders error status with empty tooltip when no message given", () => {
    const { container } = render(<StatusDot status="error" />);
    const tooltip = container.querySelector(".klunq-tooltip");
    expect(tooltip).toBeInTheDocument();
    expect(tooltip?.textContent).toBe("");
  });

  it("applies the correct CSS class for each status", () => {
    const { container } = render(<StatusDot status="online" />);
    const dot = container.querySelector(".klunq-status-online");
    expect(dot).toBeInTheDocument();
  });
});
