import { DateTime } from "luxon";
import { timeslotsTimes, TimeslotTimes } from "../types";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { timeslots } from "../db/schema";
import { updateStatus, releaseFunds } from "../jobs";
import schedule from "node-schedule";
import { checkEnvs, convertTZtoUTC } from "./helpers";

export const envs = checkEnvs();

/**
 *
 * @returns events that are open and also have open timeslots
 */
export async function getAvailableEvents() {
  const overrideTimeZone = DateTime.fromISO(new Date().toISOString(), {
    zone: "America/Chicago",
  }).toISO();

  if (overrideTimeZone === null) {
    throw new Error("Unable to override timezone");
  }

  const availableEvents = await db.query.events.findMany({
    where: (events, { eq, and }) =>
      and(
        eq(events.status, "open"),
        eq(events.date, overrideTimeZone?.split("T")[0])
      ),
    with: {
      timeslots: {
        where: eq(timeslots.status, "open"),
      },
    },
  });

  return availableEvents;
}
export function convertTimeslots(
  availableEvents: Awaited<ReturnType<typeof getAvailableEvents>>
) {
  // convert timeslot into a UTC
  const times: {
    id: string;
    startTime: Date;
    endTime: Date;
    twoHoursAfter: Date;
    eventId: string;
  }[] = [];
  for (const event of availableEvents) {
    times.push(
      ...event.timeslots.map((timeslot) => {
        // gotta make sure the endtime is next day
        let nextDayForEndTime = false;
        const potentialEndTimesBeforeTomorrow = [];
        const spaceBetween =
          timeslotsTimes.length - timeslotsTimes.indexOf(timeslot.startTime);

        for (let i = 0; i < spaceBetween; i++) {
          potentialEndTimesBeforeTomorrow.push(
            timeslotsTimes.indexOf(timeslot.startTime) + i
          );
        }

        if (
          !potentialEndTimesBeforeTomorrow.includes(
            timeslotsTimes.indexOf(timeslot.endTime)
          )
        ) {
          nextDayForEndTime = true;
        }

        const startTime = convertTZtoUTC(event.date, timeslot.startTime);
        const endTime = convertTZtoUTC(
          event.date,
          timeslot.endTime,
          nextDayForEndTime
        );

        // checks if the 2 hours after is the next day
        const nextDayAfterTwoHours =
          timeslotsTimes.indexOf(timeslot.endTime) + 6 >= timeslotsTimes.length;
        const twoHoursTime =
          (timeslotsTimes.indexOf(timeslot.endTime) + 6) %
          timeslotsTimes.length;
        const twoHoursAfter = convertTZtoUTC(
          event.date,
          timeslotsTimes[twoHoursTime],
          nextDayAfterTwoHours || nextDayForEndTime
        );

        return {
          id: timeslot.id,
          startTime,
          endTime,
          twoHoursAfter,
          eventId: timeslot.eventId,
        };
      })
    );
  }

  return times;
}
export function scheduleJobs(
  times: ReturnType<typeof convertTimeslots>,
  onCompletion: (timeslotId: string) => void
) {
  // schedule a job to happen for the start time, end time, and two hours after endTime timeslots
  return times.map((times) => {
    // if the times are in the past due to the scheduler missing them then reschedule
    // if (times.startTime < new Date()) {
    //   const currentCSTUTC = DateTime.fromISO(new Date().toISOString(), {
    //     zone: "America/Chicago",
    //   });

    //   const newStartTime = new Date(
    //     currentCSTUTC.toJSDate().getUTCMilliseconds() + 2 * 60 * 1000
    //   ); // 2 minutes in future

    //   times.startTime = newStartTime;
    // }

    return {
      id: times.id,
      startJob: schedule.scheduleJob(
        times.startTime,
        async () => await updateStatus(times.id, "start")
      ),
      endJob: schedule.scheduleJob(times.endTime, async () => {
        await updateStatus(times.id, "end");
        onCompletion(times.id);
      }),
      twoHoursAfter: schedule.scheduleJob(
        times.twoHoursAfter,
        async () =>
          await releaseFunds({ timeslotId: times.id, eventId: times.eventId })
      ),
    };
  });
}
