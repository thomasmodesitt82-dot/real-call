const express = require("express");

const app = express();

let originalCallerCallControlId = null;
let outboundCallControlId = null;

const whitelistData = require("./whitelist.json");
const whitelist = whitelistData.whitelist;

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Call screening app is running.");
});

async function dialDestination() {

  const dialResponse = await fetch(
    "https://api.telnyx.com/v2/calls",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.TELNYX_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        connection_id:
          process.env.TELNYX_CONNECTION_ID,

        from:
          process.env.BUSINESS_NUMBER,

        to:
          process.env.DESTINATION_NUMBER
      })
    }
  );

  const dialData =
    await dialResponse.json();

  console.log(
    "Dial Status:",
    dialResponse.status,
    JSON.stringify(dialData)
  );

  outboundCallControlId =
    dialData?.data?.call_control_id;

  console.log(
    "Saved outbound call:",
    outboundCallControlId
  );

}

app.post(
"/incoming-call",
async (req, res) => {

  console.log(
    "Incoming call received"
  );

  console.log(
    JSON.stringify(
      req.body,
      null,
      2
    )
  );

  res.status(200).json({
    received: true
  });

  const event =
    req.body?.data?.event_type;

  const payload =
    req.body?.data?.payload;

  const callControlId =
    payload?.call_control_id;

  const callerNumber =
    payload?.from;

  console.log(
    "Event:",
    event
  );

  console.log(
    "Caller:",
    callerNumber
  );

  if (
    event === "call.initiated" &&
    callControlId
  ) {

    try {

      const answerResponse =
      await fetch(
        `https://api.telnyx.com/v2/calls/${callControlId}/actions/answer`,
        {
          method: "POST",
          headers: {
            Authorization:
            `Bearer ${process.env.TELNYX_API_KEY}`,
            "Content-Type":
            "application/json"
          }
        }
      );

      console.log(
        "Answer Status:",
        answerResponse.status
      );

      if (
        whitelist.includes(
          callerNumber
        )
      ) {

        originalCallerCallControlId =
          callControlId;

        console.log(
          "Whitelisted caller"
        );

        await dialDestination();

        return;

      }

      const gatherResponse =
      await fetch(
        `https://api.telnyx.com/v2/calls/${callControlId}/actions/gather_using_speak`,
        {
          method: "POST",
          headers: {
            Authorization:
            `Bearer ${process.env.TELNYX_API_KEY}`,
            "Content-Type":
            "application/json"
          },
          body: JSON.stringify({

            payload:
            "Thank you for calling. Please press 1 to connect.",

            voice:
            "female",

            language:
            "en-US",

            valid_digits:
            "1",

            maximum_digits:
            1,

            timeout_millis:
            5000,

            maximum_tries:
            1

          })
        }
      );

      console.log(
        "Gather Status:",
        gatherResponse.status
      );

    } catch (error) {

      console.error(error);

    }

  }

  if (
    event === "call.gather.ended" &&
    callControlId
  ) {

    const digits =
      payload?.digits;

    if (
      digits === "1"
    ) {

      originalCallerCallControlId =
        callControlId;
await fetch(
  `https://api.telnyx.com/v2/calls/${callControlId}/actions/speak`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.TELNYX_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      payload: "Please hold while we connect your call.",
      voice: "female",
      language: "en-US"
    })
  }
);
      
      await dialDestination();

    }

    else {

      await fetch(
        `https://api.telnyx.com/v2/calls/${callControlId}/actions/hangup`,
        {
          method: "POST",
          headers: {
            Authorization:
            `Bearer ${process.env.TELNYX_API_KEY}`,
            "Content-Type":
            "application/json"
          }
        }
      );

    }

  }

  if (
    event === "call.answered" &&
    callControlId
  ) {

    if (

      originalCallerCallControlId &&

      callControlId !==
      originalCallerCallControlId

    ) {

      await fetch(

        `https://api.telnyx.com/v2/calls/${originalCallerCallControlId}/actions/bridge`,

        {

          method: "POST",

          headers: {

            Authorization:
            `Bearer ${process.env.TELNYX_API_KEY}`,

            "Content-Type":
            "application/json"

          },

          body: JSON.stringify({

            call_control_id:
            callControlId

          })

        }

      );

    }

  }

  if (
    event === "call.hangup" &&
    callControlId
  ) {

    if (

      callControlId ===
      originalCallerCallControlId &&

      outboundCallControlId

    ) {

      console.log(
        "Cancelling outbound ring"
      );

      await fetch(

        `https://api.telnyx.com/v2/calls/${outboundCallControlId}/actions/hangup`,

        {

          method: "POST",

          headers: {

            Authorization:
            `Bearer ${process.env.TELNYX_API_KEY}`,

            "Content-Type":
            "application/json"

          }

        }

      );

      outboundCallControlId =
        null;

      originalCallerCallControlId =
        null;

    }

  }

});

const PORT =
process.env.PORT || 3000;

app.listen(
PORT,
() => {

console.log(
`Server running on ${PORT}`
);

});
