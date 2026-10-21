import { describe, expect, it } from "vitest";
import { directionsUrl, distanceKm, formatKm } from "./distance";

describe("distanceKm", () => {
  it("is zero for the same point", () => {
    expect(distanceKm([-26.2, 28.04], [-26.2, 28.04])).toBe(0);
  });

  it("matches the known distance from Johannesburg to Pretoria (~54 km)", () => {
    const km = distanceKm([-26.2041, 28.0473], [-25.7479, 28.2293]);
    expect(km).toBeGreaterThan(53);
    expect(km).toBeLessThan(55);
  });
});

describe("formatKm", () => {
  it("shows metres under a kilometre, rounded to 10 m", () => {
    expect(formatKm(0.853)).toBe("850 m");
    expect(formatKm(0.004)).toBe("0 m");
  });

  it("shows kilometres with one decimal", () => {
    expect(formatKm(3.44)).toBe("3.4 km");
  });
});

describe("directionsUrl", () => {
  it("uses coordinates when known", () => {
    expect(directionsUrl(-26.2, 28.04, "Bree")).toBe("https://www.google.com/maps/dir/?api=1&destination=-26.2%2C28.04");
  });

  it("falls back to the address, encoded", () => {
    expect(directionsUrl(null, null, "Bree Taxi Rank & Co")).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=Bree%20Taxi%20Rank%20%26%20Co",
    );
  });
});
