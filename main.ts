import schedule from "node-schedule";
import {
  scheduleJobs,
  getAvailableEvents,
  convertTimeslots,
} from "./utils/main";
import { DateTime } from "luxon";

const jobs = new Map<string, ReturnType<typeof scheduleJobs>[number]>();
const everyMin = schedule.scheduleJob("* * * * *", async () => {
  console.log(
    "Executed at",
    DateTime.fromISO(new Date().toISOString(), {
      zone: "America/Chicago",
    }).toLocaleString(DateTime.DATETIME_FULL)
  );
  // query for the available events
  // query for open so we know they've paid
  const data = await getAvailableEvents();

  let times = convertTimeslots(data);
  console.log("converted times", times);

  // only add new jobs
  // since we are querying every 15 mins we need to check if we don't currently have a job for that timeslot
  for (const time of times) {
    console.log(time.startTime.toISOString(), time.endTime.toISOString());
    if (jobs.has(time.id)) {
      times = times.filter((timeItem) => timeItem.id !== time.id);
    }
  }

  if (times.length > 0) {
    // schedule the jobs
    // store the jobs in map
    // when completed delete the reference
    scheduleJobs(times, (timeslotId: string) => {
      if (jobs.has(timeslotId)) {
        jobs.delete(timeslotId);
      }
      console.log("job completed", timeslotId);
      // email the venue that timeslot is ended and you can release the funds
    }).forEach((job) => {
      jobs.set(job.id, job);
    });
  }

  console.log("current jobs", jobs);
});
