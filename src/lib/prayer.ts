/**
 * Prayer times worked out from the sun's position (no internet needed), following the standard
 * method described at praytimes.org. Fajr and Isha use 18° below the horizon (University of Islamic
 * Sciences, Karachi, the usual method in Pakistan); Maghrib is sunset. Accurate to a minute or two;
 * local masjid timetables can differ slightly, so sehri ends a few minutes early to be safe.
 */

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

function sun(jd: number) {
  const d = jd - 2451545.0;
  const g = (357.529 + 0.98560028 * d) % 360;
  const q = (280.459 + 0.98564736 * d) % 360;
  const l = (q + 1.915 * Math.sin(rad(g)) + 0.02 * Math.sin(rad(2 * g))) % 360;
  const e = 23.439 - 0.00000036 * d;
  const ra = deg(Math.atan2(Math.cos(rad(e)) * Math.sin(rad(l)), Math.cos(rad(l)))) / 15;
  const decl = deg(Math.asin(Math.sin(rad(e)) * Math.sin(rad(l))));
  const eqt = q / 15 - ((ra + 24) % 24);
  return { decl, eqt: ((eqt + 12) % 24 + 24) % 24 - 12 };
}

export type PrayerTimes = { fajr: number; sunrise: number; dhuhr: number; maghrib: number; isha: number };

/** Minutes after local midnight for `date` (YYYY-MM-DD) at a place; `tz` = hours from UTC. */
export function prayerTimes(date: string, lat: number, lng: number, tz: number, angle = 18): PrayerTimes {
  const [y, m, d] = date.split("-").map(Number);
  const jd = Date.UTC(y, m - 1, d) / 86_400_000 + 2440587.5 - lng / 360;
  const { decl, eqt } = sun(jd + 0.5);
  const noon = 12 + tz - lng / 15 - eqt;
  // hours from noon until the sun is `a` degrees below the horizon
  const span = (a: number) =>
    deg(Math.acos((-Math.sin(rad(a)) - Math.sin(rad(decl)) * Math.sin(rad(lat))) / (Math.cos(rad(decl)) * Math.cos(rad(lat))))) / 15;
  const toMin = (h: number) => Math.round(h * 60);
  return {
    fajr: toMin(noon - span(angle)),
    sunrise: toMin(noon - span(0.833)),
    dhuhr: toMin(noon) + 1,
    maghrib: toMin(noon + span(0.833)) + 1,
    isha: toMin(noon + span(angle)),
  };
}

/** 5:04 AM style, from minutes after midnight. */
export function clock(min: number): string {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  return `${h % 12 || 12}:${String(m % 60).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

/** "HH:MM" (24 h), for the eating-window clock. */
export const hhmm = (min: number) => {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};
