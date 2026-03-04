const EARTH_RADIUS_KM = 6371;

const toRad = (deg) => (deg * Math.PI) / 180;

export const haversineKm = (from, to) => {
  const dLat = toRad(to.lat - from.lat);
  const dLon = toRad(to.lon - from.lon);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.lat)) *
      Math.cos(toRad(to.lat)) *
      Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const calcEmissions = ({
  mode,
  km,
  passengers,
  factors,
  carFuel,
  flightRf,
  includeLto,
}) => {
  const distanceKm = Math.max(0, km);
  const pax = Math.max(1, Number(passengers) || 1);

  let gPerPkm = 0;
  if (mode === "car") {
    gPerPkm =
      factors.emissionsGPerPkm.car[carFuel] ||
      factors.emissionsGPerPkm.car.petrol;
  } else {
    gPerPkm = factors.emissionsGPerPkm[mode] ?? 0;
  }

  // All totals are for the whole trip (all passengers), for fair comparison.
  let totalKg = (distanceKm * gPerPkm) / 1000;

  if (mode === "car") {
    // gPerPkm is per vehicle; totalKg is already total car emissions (no change).
  } else if (mode === "flight") {
    // Cruise: per passenger-km × passengers. LTO: per passenger × passengers.
    totalKg = totalKg * pax;
    if (includeLto) {
      totalKg += factors.assumptions.flightLtoKgPerPassenger * pax;
    }
    if (flightRf) {
      totalKg *= factors.assumptions.radiativeForcingMultiplier;
    }
  } else {
    // Bus, rail, bike, walk: gPerPkm is per passenger-km → multiply by passengers for total trip.
    totalKg = totalKg * pax;
  }

  return {
    totalKg,
    gPerPkm,
    distanceKm,
    perPassengerKg: totalKg / pax,
  };
};
