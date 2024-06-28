import { DateTime } from "luxon";
import { TimeslotTimes } from "../types";
import { envs } from "./main";

function convertTo24hours(period: string, hours: number) {
  // convert to twenty four hours
  if (period === "AM") {
    if (hours !== 12) {
      hours = (hours + 12) % 12;
    } else {
      hours = 0;
    }
  } else {
    if (hours !== 12) {
      hours = hours + 12;
    } else {
      hours = 12;
    }
  }
  return hours;
}

export function convertTZtoUTC(
  date: string,
  time: TimeslotTimes,
  nextDay?: boolean
): Date {
  // Define the regex pattern to parse time and period (AM/PM)
  const timePattern = /(\d{1,2}):(\d{2})\s*(AM|PM)/i;
  const match = time.match(timePattern);

  if (!match) {
    throw new Error("Invalid time format");
  }
  let hours = parseInt(match[1], 10);
  let period = match[3];

  const dateSplit = date.split("-");
  const year = parseInt(dateSplit[0], 10);
  const month = parseInt(dateSplit[1], 10) - 1; // Months are zero-indexed
  let day = parseInt(dateSplit[2], 10);

  hours = convertTo24hours(period, hours);

  if (nextDay) {
    day += 1;
  }

  // Create a Date object in local server time (whatever timezone our server is on)
  const configuredDate = new Date(year, month, day, hours, parseInt(match[2]));

  // return envs.TZ_ENV === "LOCAL"
  //   ? DateTime.fromISO(configuredDate.toISOString(), {
  //       zone: "America/Chicago",
  //     }).toJSDate()
  //   : DateTime.fromISO(configuredDate.toISOString(), {
  //       zone: "America/Los_Angeles",
  //     }).toJSDate();

  return configuredDate;
}

export function checkEnvs():
  | { DATABASE_URL: string; APP_ORIGIN: string; TZ_ENV: string }
  | never {
  const { DATABASE_URL, APP_ORIGIN, TZ_ENV } = process.env;

  if (DATABASE_URL === undefined || DATABASE_URL === "") {
    throw new Error("The environment variable DATABASE_URL isn't set.");
  }

  if (APP_ORIGIN === undefined || APP_ORIGIN === "") {
    throw new Error("The environment variable APP_ORIGIN isn't set.");
  }

  if (TZ_ENV === undefined || TZ_ENV === "") {
    throw new Error("The environment variable TZ_ENV isn't set.");
  }

  return { DATABASE_URL, APP_ORIGIN, TZ_ENV };
}
