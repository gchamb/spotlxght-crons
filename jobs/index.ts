import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { applications, events, timeslots } from "../db/schema";
import { ReleaseFundsRequest } from "../types";
import { envs } from "../utils/main";
import { sendEmail } from "../utils/helpers";

/**
 * This function updates the status of both the timeslot and event as one transaction
 * @param timeslotId
 * @param type
 * @returns void
 *
 *
 */
export async function updateStatus(
  timeslotId: string,
  type: "start" | "end"
): Promise<void> {
  await db.transaction(async (tx) => {
    // get the timeslot
    const timeslot = await tx.query.timeslots.findFirst({
      where: and(eq(timeslots.id, timeslotId)),
      with: {
        event: {
          columns: {
            status: true,
          },
          with: {
            timeslots: true,
          },
        },
      },
    });

    if (timeslot === undefined) {
      console.log(`Timeslot ID ${timeslotId} doesn't exist.`);
      return;
    }

    // update the status to in-progress or completed
    // update the event status
    if (type === "start" && timeslot.status === "open") {
      await tx
        .update(timeslots)
        .set({ status: "in-progress" })
        .where(eq(timeslots.id, timeslotId));
      console.log(`timeslot id ${timeslotId} was updated to in-progress.`);
      if (timeslot.event.status === "open") {
        await tx
          .update(events)
          .set({ status: "in-progress" })
          .where(eq(events.id, timeslot.eventId));
        console.log(`event id ${timeslot.eventId} was updated to in-progress.`);
      }
    }
    if (type === "end" && timeslot.status === "in-progress") {
      await tx
        .update(timeslots)
        .set({ status: "completed" })
        .where(eq(timeslots.id, timeslotId));
      console.log(`timeslot id ${timeslotId} was updated to completed.`);

      // check if the other timeslots are completed. if so then set the status of the event to completed
      if (timeslot.event.status === "in-progress") {
        const { timeslots: dataTimeslots } = timeslot.event;

        const allCompleted = dataTimeslots
          .filter((timeslotItem) => timeslotItem.id !== timeslotId)
          .every((timeslotItem) => {
            console.log(timeslotId, timeslotItem.id, timeslotItem.status);
            return timeslotItem.status === "completed";
          });

        if (allCompleted) {
          await tx
            .update(events)
            .set({ status: "completed" })
            .where(eq(events.id, timeslot.eventId));
          console.log(`event id ${timeslot.eventId} was updated to completed.`);
        }
      }
    }
  });
}

export async function releaseFunds({
  timeslotId,
  eventId,
}: {
  timeslotId: string;
  eventId: string;
}) {
  // get the applicant of this timeslot
  const applicant = await db.query.applications.findFirst({
    where: and(
      eq(applications.timeslotId, timeslotId),
      eq(applications.eventId, eventId),
      eq(applications.status, "accepted")
    ),
    columns: {
      userId: true,
      timeslotId: true,
      eventId: true,
    },
    with: {
      event: {
        columns: {
          name: true,
        },
        with: {
          user: {
            columns: {
              email: true,
            },
          },
        },
      },
      user: {
        columns: {
          email: true,
        },
      },
    },
  });

  if (applicant === undefined) {
    return;
  }

  try {
    const data: ReleaseFundsRequest = {
      eventId,
      timeslotId,
      userId: applicant.userId,
    };

    await fetch(`${envs.APP_ORIGIN}/api/stripe/release`, {
      method: "POST",
      body: JSON.stringify(data),
      headers: {
        "Content-Type": "application/json",
      },
    });
    // email venue that we automatically released funds
    await sendEmail({
      subject: `Automatically released funds for ${applicant.event.name}`,
      emails: [applicant.user.email, applicant.event.user.email],
      message: `It's been two hours after the end timeslot. The funds have been automatically released to the musician.`,
      type: "default",
    });
  } catch (err) {
    // email us if this fails
    // email the venue and user this failed
    await sendEmail({
      subject: `Automatically released funds has failed for ${applicant.event.name}`,
      emails: ["gchamb.dev@gmail.com", "jcelaya775@gmail.com"],
      message: `Automatically releasing funds after two hours post end timeslot has failed. Timeslot ID:${applicant.timeslotId} EventID: ${applicant.eventId}`,
      type: "default",
    });
  }
}
