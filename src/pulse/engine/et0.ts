// FAO-56 Penman-Monteith reference evapotranspiration (Allen et al., 1998).
// Equation numbers refer to FAO Irrigation and Drainage Paper 56.

const GSC = 0.082; // solar constant, MJ m⁻² min⁻¹
const SIGMA = 4.903e-9; // Stefan-Boltzmann, MJ K⁻⁴ m⁻² day⁻¹

/** Saturation vapour pressure (kPa), Eq. 11. */
export function saturationVapourPressure(t: number): number {
  return 0.6108 * Math.exp((17.27 * t) / (t + 237.3));
}

/** Slope of the saturation vapour pressure curve (kPa/°C), Eq. 13. */
export function vapourPressureSlope(t: number): number {
  return (4098 * saturationVapourPressure(t)) / (t + 237.3) ** 2;
}

/** Psychrometric constant (kPa/°C) from elevation (m), Eqs. 7–8. */
export function psychrometricConstant(elevation: number): number {
  const pressure = 101.3 * ((293 - 0.0065 * elevation) / 293) ** 5.26;
  return 0.000665 * pressure;
}

/** Wind speed at 2 m from a measurement at height z (m), Eq. 47. */
export function windAt2m(speed: number, height: number): number {
  return (speed * 4.87) / Math.log(67.8 * height - 5.42);
}

export function dayOfYear(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  return Math.floor((date.getTime() - start) / 86_400_000);
}

/** Extraterrestrial radiation Ra (MJ m⁻² day⁻¹), Eqs. 21–25. */
export function extraterrestrialRadiation(latitudeDeg: number, doy: number): number {
  const phi = (latitudeDeg * Math.PI) / 180;
  const dr = 1 + 0.033 * Math.cos(((2 * Math.PI) / 365) * doy);
  const delta = 0.409 * Math.sin(((2 * Math.PI) / 365) * doy - 1.39);
  const ws = Math.acos(Math.max(-1, Math.min(1, -Math.tan(phi) * Math.tan(delta))));
  return (
    ((24 * 60) / Math.PI) *
    GSC *
    dr *
    (ws * Math.sin(phi) * Math.sin(delta) + Math.cos(phi) * Math.cos(delta) * Math.sin(ws))
  );
}

/** Clear-sky radiation Rso, Eq. 37. */
export function clearSkyRadiation(ra: number, elevation: number): number {
  return (0.75 + 2e-5 * elevation) * ra;
}

/** Solar radiation from the temperature range (Hargreaves), Eq. 50. kRs = 0.16 for interior locations. */
export function solarRadiationFromTemperature(tMax: number, tMin: number, ra: number, kRs = 0.16): number {
  return kRs * Math.sqrt(Math.max(0, tMax - tMin)) * ra;
}

export interface PenmanMonteithInput {
  tMax: number; // °C
  tMin: number; // °C
  u2: number; // m/s at 2 m
  rs: number; // incoming solar radiation, MJ m⁻² day⁻¹
  ea: number; // actual vapour pressure, kPa
  latitude: number; // degrees
  elevation: number; // m
  doy: number; // day of year
  g?: number; // soil heat flux, ≈ 0 for daily steps
}

/** Daily reference evapotranspiration ET0 (mm/day), Eq. 6. */
export function penmanMonteithET0(input: PenmanMonteithInput): number {
  const { tMax, tMin, u2, rs, ea, latitude, elevation, doy, g = 0 } = input;
  const tMean = (tMax + tMin) / 2;
  const delta = vapourPressureSlope(tMean);
  const gamma = psychrometricConstant(elevation);
  const es = (saturationVapourPressure(tMax) + saturationVapourPressure(tMin)) / 2;

  const ra = extraterrestrialRadiation(latitude, doy);
  const rso = clearSkyRadiation(ra, elevation);
  const rns = (1 - 0.23) * rs; // Eq. 38, albedo 0.23
  const relativeShortwave = Math.min(1, rs / rso);
  const rnl =
    SIGMA *
    (((tMax + 273.16) ** 4 + (tMin + 273.16) ** 4) / 2) *
    (0.34 - 0.14 * Math.sqrt(Math.max(0, ea))) *
    (1.35 * relativeShortwave - 0.35); // Eq. 39
  const rn = rns - rnl;

  const numerator = 0.408 * delta * (rn - g) + gamma * (900 / (tMean + 273)) * u2 * Math.max(0, es - ea);
  const denominator = delta + gamma * (1 + 0.34 * u2);
  return Math.max(0, numerator / denominator);
}

/** Crop evapotranspiration under standard conditions, ETc = Kc × ET0 (Eq. 56). */
export function cropET(et0: number, kc: number): number {
  return Math.max(0, kc * et0);
}
