import { z } from "zod";
import { timeslots, genres } from "../db/schema";

// this file will include zod schemas and typescript types

export type Credentials = z.infer<typeof credentialsSchema>;

export type UserType = "venue" | "musician";

export type EventStatus =
  | "draft"
  | "open"
  | "in-progress"
  | "completed"
  | "closed";

export type ApplicationStatus = (typeof applicantStatuses)[number];

export type MyEvents = z.infer<typeof myEventsDataSchema>;

export type EventListings = MyEvents & {
  venueName: string;
  venueId: string;
  timeslots: (typeof timeslots.$inferSelect)[];
  totalApplicants: number;
  totalTimeslots: number;
  genres: Omit<typeof genres.$inferSelect, "userId">[];
};

export type CreateEvent = z.infer<typeof createEventSchema>;

export type SetApplicantStatusRequest = z.infer<
  typeof setApplicantStatusRequest
>;

export type ApplyTimeslotRequest = z.infer<typeof applyTimeslotRequest>;

export type GoogleInfo = {
  id: string;
  email: string;
  verified_emai: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  locale: string;
};

export const applicantStatuses = ["requested", "accepted", "rejected"] as const;

export type TimeslotTimes = (typeof timeslotsTimes)[number];

export const timeslotsTimes = [
  "12:00AM",
  "12:30AM",
  "12:45AM",
  "1:00AM",
  "1:30AM",
  "1:45AM",
  "2:00AM",
  "2:30AM",
  "2:45AM",
  "3:00AM",
  "3:30AM",
  "3:45AM",
  "4:00AM",
  "4:30AM",
  "4:45AM",
  "5:00AM",
  "5:30AM",
  "5:45AM",
  "6:00AM",
  "6:30AM",
  "6:45AM",
  "7:00AM",
  "7:30AM",
  "7:45AM",
  "8:00AM",
  "8:30AM",
  "8:45AM",
  "9:00AM",
  "9:30AM",
  "9:45AM",
  "10:00AM",
  "10:30AM",
  "10:45AM",
  "11:00AM",
  "11:30AM",
  "11:45AM",
  "12:00PM",
  "12:30PM",
  "12:45PM",
  "1:00PM",
  "1:30PM",
  "1:45PM",
  "2:00PM",
  "2:30PM",
  "2:45PM",
  "3:00PM",
  "3:30PM",
  "3:45PM",
  "4:00PM",
  "4:30PM",
  "4:45PM",
  "5:00PM",
  "5:30PM",
  "5:45PM",
  "6:00PM",
  "6:30PM",
  "6:45PM",
  "7:00PM",
  "7:30PM",
  "7:45PM",
  "8:00PM",
  "8:30PM",
  "8:45PM",
  "9:00PM",
  "9:30PM",
  "9:45PM",
  "10:00PM",
  "10:30PM",
  "10:45PM",
  "11:00PM",
  "11:30PM",
  "11:45PM",
] as const;

export const payArray = [
  25, 50, 75, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500,
] as const;

export const MAX_FILE_SIZE = 1024 * 1024 * 5; // 5 MB
export const ACCEPTED_IMAGE_TYPES = ["image/jpg", "image/jpeg", "image/png"];

export const credentialsSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .min(1, "Email is required")
    .email("Invalid email"),
  password: z
    .string({ required_error: "Password is required" })
    .min(1, "Password is required")
    .min(8, "Password must contain at least 8 characters")
    .max(32, "Password must be less than 32 characters"),
});

export const imageZodSchema = z
  .instanceof(File)
  .refine((file) => file !== null, "An upload is required.")
  .refine(
    (file) => file.size <= MAX_FILE_SIZE,
    "The upload must be a maximum of 5MB."
  )
  .refine((file) => {
    return ACCEPTED_IMAGE_TYPES.includes(file.type);
  }, "Only JPG, JPEG, and PNG are allowed to be uploaded.")
  .nullable();

export const venueFormSchema = z.object({
  venueName: z
    .string()
    .min(5, "Venue name should be at least 5 characters")
    .max(20, "Venue name should be at most 20 characters"),
  address: z.string().min(10, "Location should be at least 10 characters long"),
  bannerImage: imageZodSchema,
});

export const musicianFormSchema = z.object({
  name: z
    .string()
    .min(3, "Venue name should be at least 3 characters")
    .max(20, "Venue name should be at most 20 characters"),
  address: z
    .string()
    .min(10, "Address should be at least 10 characters long")
    .nullable(),
  profileImage: imageZodSchema,
  bannerImage: imageZodSchema,
});

export const myEventsDataSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  status: z.union([
    z.literal("open"),
    z.literal("in-progress"),
    z.literal("completed"),
    z.literal("closed"),
  ]),
  date: z.date(),
  amount: z.number(),
  venueId: z.string().uuid(),
  createdAt: z.date(),
});

export const createEventSchema = z.object({
  name: z
    .string()
    .min(3, "Event name needs at least 3 characters.")
    .max(25, "Event name should be at max 25 characters."),
  date: z.date(),
  pay: constructZodLiteralUnionType(payArray.map((pay) => z.literal(pay))),
  timeslots: z
    .array(
      z.object({
        startTime: z.enum(timeslotsTimes),
        endTime: z.enum(timeslotsTimes),
      })
    )
    .min(1, "You need to submit at least one timeslot"),
});

export const setApplicantStatusRequest = z.object({
  eventId: z.string(),
  applicantId: z.string(),
  timeslotId: z.string(),
  status: constructZodLiteralUnionType(
    applicantStatuses
      .filter((status) => status !== "requested")
      .map((status) => z.literal(status))
  ),
});

export const applyTimeslotRequest = z.object({
  eventId: z.string(),
  timeslotId: z.string(),
});

export function isValidZodLiteralUnion<T extends z.ZodLiteral<unknown>>(
  literals: T[]
): literals is [T, T, ...T[]] {
  return literals.length >= 2;
}

export function constructZodLiteralUnionType<T extends z.ZodLiteral<unknown>>(
  literals: T[]
) {
  if (!isValidZodLiteralUnion(literals)) {
    throw new Error(
      "Literals passed do not meet the criteria for constructing a union schema, the minimum length is 2"
    );
  }
  return z.union(literals);
}
