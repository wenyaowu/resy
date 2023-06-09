import fetch from "node-fetch";
import retry from "retry";
import { NextApiRequest, NextApiResponse } from "next";

const sharedHeaders = {
  "content-type": "application/json",
  accept: "application/json, text/plain, */*",
  authority: "api.resy.com",
  authorization: 'ResyAPI api_key="VbWk7s3L4KiK5fzlO7JD3Q5EYolJI7n5"',
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-site",
  "x-resy-auth-token":
    "eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiJ9.eyJleHAiOjE2ODk2MjkwNDEsInVpZCI6MjA5MTEzMSwiZ3QiOiJjb25zdW1lciIsImdzIjpbXSwibGFuZyI6ImVuLXVzIiwiZXh0cmEiOnsiZ3Vlc3RfaWQiOjEwMzM5MDcwfX0.ALFl2xZrqJHBaGkmv-7w3P0Hg-QZIOdnW9urWkWDFoLkK_sP51Cg2e8QvUrksd8kUHQY0H4cjqVaxMX_KujzeoJaANazpg3wcQmsVYo3NVceYvsHmR_uLbaLnWCEloZc38Jvil1bD0WSvzah9gVYMD-Asdjl4oUasBW1gp4iHbYr8u96",
  "x-resy-universal-auth":
    "eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiJ9.eyJleHAiOjE2ODk2MjkwNDEsInVpZCI6MjA5MTEzMSwiZ3QiOiJjb25zdW1lciIsImdzIjpbXSwibGFuZyI6ImVuLXVzIiwiZXh0cmEiOnsiZ3Vlc3RfaWQiOjEwMzM5MDcwfX0.ALFl2xZrqJHBaGkmv-7w3P0Hg-QZIOdnW9urWkWDFoLkK_sP51Cg2e8QvUrksd8kUHQY0H4cjqVaxMX_KujzeoJaANazpg3wcQmsVYo3NVceYvsHmR_uLbaLnWCEloZc38Jvil1bD0WSvzah9gVYMD-Asdjl4oUasBW1gp4iHbYr8u96",
};

const makeReservation = async (
  date: string,
  partySize: number,
  restaurantId: string,
  startTime: string,
  endTime: string
) => {
  try {
    const requestBody: any = {
      day: date, // Desired reservation date
      party_size: partySize, // Number of guests
      venue_id: restaurantId, // Resy restaurant ID
      contact: {
        first_name: "Evan",
        last_name: "Wu",
        email: "evanwu0225@gmail.com",
        phone: "3109234718",
      },
    };

    // Fetch available timeslots
    const response = await fetch(
      `https://api.resy.com/4/find?lat=0&long=0&day=${date}&party_size=${partySize}&venue_id=${restaurantId}`,
      {
        method: "GET",
        headers: {
          ...sharedHeaders,
          origin: "https://resy.com",
          referer: "https://resy.com",
          "x-origin": "https://resy.com",
        },
      }
    );

    if (response.ok) {
      const data: any = await response.json();

      const timeslots = data?.results?.venues[0]?.slots;

      // Filter timeslots within the desired time range
      const filteredTimeslots = timeslots.filter((timeslot: any) => {
        const time = timeslot?.date?.start
          ?.split(" ")[1]
          ?.split(":")
          .slice(0, 2)
          .join(":");
        return time >= startTime && time <= endTime;
      });

      if (filteredTimeslots.length > 0) {
        // Choose the best available timeslot (e.g., the earliest one)
        // Perform the reservation
        const bestTimeslot = filteredTimeslots[0];
        console.log("Best available timeslot:", bestTimeslot?.date?.start);
        const operation = retry.operation({
          retries: 3, // Number of retries
          factor: 2, // Backoff factor
          minTimeout: 1000, // Minimum timeout in milliseconds
          maxTimeout: 3000, // Maximum timeout in milliseconds
        });

        const bookTokenRequestBody: any = {
          commit: 1,
          config_id: bestTimeslot?.config?.token,
          day: date,
          party_size: partySize,
        };
        console.log(bookTokenRequestBody);
        // Get book_token
        const bookTokenResponse = await fetch(
          "https://api.resy.com/3/details",
          {
            method: "POST",
            headers: {
              ...sharedHeaders,
              Connection: "keep-alive",
              origin: "https://widgets.resy.com",
              referer: "https://widgets.resy.com/",
              "x-origin": "https://widgets.resy.com",
            },
            body: JSON.stringify(bookTokenRequestBody),
          }
        );

        const bookTokenData: any = await bookTokenResponse.json();
        console.log(bookTokenData);
        // operation.attempt(async (currentAttempt: number) => {
        //   try {
        //     const reservationResponse = await fetch(
        //       "https://api.resy.com/4/reservations",
        //       {
        //         method: "POST",
        //         headers: {
        //           "Content-Type": "application/json",
        //           Authorization: `Bearer ${API_KEY}`,
        //         },
        //         body: JSON.stringify(requestBody),
        //       }
        //     );

        //     if (reservationResponse.ok) {
        //       const reservationData = await reservationResponse.json();
        //       console.log("Reservation created:", reservationData);
        //     } else {
        //       const error = new Error(
        //         `Failed to create reservation: ${reservationResponse.status} ${reservationResponse.statusText}`
        //       );
        //       if (operation.retry(error)) {
        //         console.log(
        //           `Retrying reservation (attempt ${currentAttempt + 1})...`
        //         );
        //         return;
        //       }
        //       console.error("Exceeded maximum number of retries.");
        //     }
        //   } catch (error: any) {
        //     if (operation.retry(error)) {
        //       console.log(
        //         `Retrying reservation (attempt ${currentAttempt + 1})...`
        //       );
        //       return;
        //     }
        //     console.error("Exceeded maximum number of retries.");
        //   }
        // });
      } else {
        console.error(
          "No available timeslots found within the specified time range."
        );
      }
    } else {
      console.error(
        "Failed to fetch timeslots:",
        response.status,
        response.statusText
      );
    }
  } catch (error) {
    console.error("An error occurred:", error);
  }
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const date = req.body.date; // Desired reservation date
  const partySize = req.body.partySize; // Number of guests
  const restaurantId = req.body.restaurantId; // Resy restaurant ID
  const startTime = req.body.startTime; // Desired start time (e.g., '18:00')
  const endTime = req.body.endTime; // Desired end time (e.g., '20:00')

  if (!date || !partySize || !restaurantId || !startTime || !endTime) {
    console.log("missing");
    res
      .status(400)
      .json({ error: "Invalid request. Missing required parameters." });
    return;
  }

  // // Schedule the reservation script to run immediately
  makeReservation(date, partySize, restaurantId, startTime, endTime);

  res
    .status(200)
    .json({ message: "Reservation script scheduled successfully." });
}
