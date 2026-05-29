import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HarnessStudio } from "./HarnessStudio";

describe("HarnessStudio", () => {
  it("renders the empty state", () => {
    render(<HarnessStudio snapshot={{ activeProfileCount: 0, bindings: [], profiles: [] }} />);

    expect(screen.getByRole("heading", { name: "Harness Studio" })).toBeInTheDocument();
    expect(screen.getByText("No harness profile registered")).toBeInTheDocument();
  });

  it("renders inactive harness profiles", () => {
    render(
      <HarnessStudio
        snapshot={{
          activeProfileCount: 0,
          bindings: [],
          profiles: [
            {
              active: false,
              description: "Inactive profile",
              id: "profile-off",
              modules: [],
              name: "Profile Off",
              skillRoutes: [],
              version: "1"
            }
          ]
        }}
      />
    );

    expect(screen.getByText("Profile Off")).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toBeInTheDocument();
  });
});
