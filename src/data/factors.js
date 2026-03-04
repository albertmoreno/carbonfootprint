export const DEFAULT_FACTORS = {
  emissionsGPerPkm: {
    car: {
      petrol: 192,
      diesel: 171,
      hybrid: 112,
      ev: 58,
    },
    bus: 68,
    rail: 35,
    flight: 158,
    bike: 0,
    walk: 0,
  },
  assumptions: {
    railDistanceMultiplier: 0.95,
    flightUplift: 0.09,
    flightLtoKgPerPassenger: 18,
    radiativeForcingMultiplier: 1.9,
  },
};

export const MODE_LABELS = {
  car: "Car",
  bus: "Coach / Bus",
  rail: "Rail",
  flight: "Flight",
  bike: "Bike",
  walk: "Walk",
};
