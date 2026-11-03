import { describe, expect, it } from "vitest";
import { validateLocation } from "./validateLocation";

describe("validateLocation", () => {
  it("accepts and normalises valid input", () => {
    expect(
      validateLocation({ name: "  Suria KLCC ", latitude: " 3.157324409", longitude: "101.7121981 " }),
    ).toEqual({
      input: { name: "Suria KLCC", latitude: 3.157324409, longitude: 101.7121981 },
      errors: null,
    });
  });

  it("accepts boundary and negative values", () => {
    expect(validateLocation({ name: "x", latitude: "-90", longitude: "180" }).errors).toBeNull();
  });

  it.each([
    [{ name: "", latitude: "1", longitude: "1" }, "name", /Enter a name/],
    [{ name: "x".repeat(201), latitude: "1", longitude: "1" }, "name", /under 200/],
    [{ name: "x", latitude: "", longitude: "1" }, "latitude", /Enter a latitude/],
    [{ name: "x", latitude: "abc", longitude: "1" }, "latitude", /decimal number/],
    [{ name: "x", latitude: "1e3", longitude: "1" }, "latitude", /decimal number/],
    [{ name: "x", latitude: "90.1", longitude: "1" }, "latitude", /between -90 and 90/],
    [{ name: "x", latitude: "1", longitude: "-180.5" }, "longitude", /between -180 and 180/],
  ] as const)("rejects %j", (values, field, message) => {
    const { errors } = validateLocation(values);
    expect(errors?.[field]).toMatch(message);
  });
});
