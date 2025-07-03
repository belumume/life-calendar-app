import { render } from "@solidjs/testing-library";
import { describe, it, expect } from "vitest";
import Home from "../index";

describe("Home Page", () => {
  it("renders the main heading", () => {
    const { getByText } = render(() => <Home />);
    expect(getByText("MyLife Calendar")).toBeInTheDocument();
  });

  it("shows the tagline", () => {
    const { getByText } = render(() => <Home />);
    expect(getByText("Track your life journey, one week at a time")).toBeInTheDocument();
  });

  it("displays privacy features", () => {
    const { getByText } = render(() => <Home />);
    expect(getByText(/All data stored locally/)).toBeInTheDocument();
  });
});