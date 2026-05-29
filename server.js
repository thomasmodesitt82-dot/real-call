const express = require("express");

const app = express();

let originalCallerCallControlId = null;
let outboundCallControlId = null;

const whitelistData =
require("./whitelist.json");

const whitelist =
whitelistData.whitelist;

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Call screening app is running.");
});

async function dialDestination() {
  const dialResponse = await fetch("https://api.telnyx.com/v2/calls", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.TELNYX_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      connection_id: process.env.TELNYX_CONNECTION_ID,
      from: process.env.BUSINESS_NUMBER,
      to: process.env.DESTINATION_NUMBER
    })
  });

  const dialData = await dialResponse.json();

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

app.post("/incoming-call", async (req, res) => {
  console.log("Incoming call received");
  console.log(JSON.stringify(req.body, null, 2));

  res.status(200).json({ received: true });

  const event = req.body?.data?.event_type;
  const payload = req.body?.data?.payload;
  const callControlId = payload?.call_control_id;
  const callerNumber = payload?.from;

  console.log("Event:", event);
  console.log("Caller:", callerNumber);
  console.log("API key loaded:", process.env.TELNYX_API_KEY ? "YES" : "NO");

  if (event === "call.initiated" && callControlId) {
    try {
      const answerResponse = await fetch(
        `https://api.telnyx.com/v2/calls/${callControlId}/actions/answer`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.TELNYX_API_KEY}`,
            "Content-Type": "application/json"
          }
        }
      );

      const answerText = await answerResponse.text();
      console.log("Answer Status:", answerResponse.status, answerText);

      if (whitelist.includes(callerNumber)) {
        originalCallerCallControlId = callControlId;

        console.log("Whitelisted caller. Skipping screening.");
        console.log("Saved original caller call control ID:", originalCallerCallControlId);

        dialDestination();
        return;
      }

      const gatherResponse = await fetch(
        `https://api.telnyx.com/v2/calls/${callControlId}/actions/gather_using_speak`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.TELNYX_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            payload: "Thank you for calling. Please press 1 to connect.",
            voice: "female",
            language: "en-US",
            valid_digits: "1",
            maximum_digits: 1,
            timeout_millis: 5000,
            maximum_tries: 1
          })
        }
      );

      const gatherText = await gatherResponse.text();
      console.log("Gather Status:", gatherResponse.status, gatherText);
    } catch (error) {
      console.error("Call control error:", error);
    }
  }

  if (event === "call.gather.ended" && callControlId) {
    const digits = payload?.digits;

    console.log("Gather ended. Digits pressed:", digits);

    if (digits === "1") {
      originalCallerCallControlId = callControlId;

      console.log("Caller passed screening.");
      console.log("Saved original caller call control ID:", originalCallerCallControlId);

      try {
       await dialDestination()
      } catch (error) {
        console.error("Dial error:", error);
      }
    } else {
      console.log("Caller failed screening. Hanging up.");

      try {
        const hangupResponse = await fetch(
          `https://api.telnyx.com/v2/calls/${callControlId}/actions/hangup`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.TELNYX_API_KEY}`,
              "Content-Type": "application/json"
            }
          }
        );

        const hangupText = await hangupResponse.text();
        console.log("Hangup Status:", hangupResponse.status, hangupText);
      } catch (error) {
        console.error("Hangup error:", error);
      }
    }
  }

  if (event === "call.answered" && callControlId) {
    if (
      originalCallerCallControlId &&
      callControlId !== originalCallerCallControlId
    ) {
      console.log("Outbound call answered. Bridging calls.");
      console.log("Original caller:", originalCallerCallControlId);
      console.log("Outbound answered:", callControlId);

      try {
        const bridgeResponse = await fetch(
          `https://api.telnyx.com/v2/calls/${originalCallerCallControlId}/actions/bridge`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.TELNYX_API_KEY}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              call_control_id: callControlId
            })
          }
        );

        const bridgeText = await bridgeResponse.text();
        console.log("Bridge Status:", bridgeResponse.status, bridgeText);
      } catch (error) {
        console.error("Bridge error:", error);
      }
    }
  }
});
if (event === "call.hangup") {

  if (
    callControlId === originalCallerCallControlId &&
    outboundCallControlId
  ) {

    console.log(
      "Original caller hung up. Ending outbound call."
    );

    try {

      const cancelResponse =
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

      const cancelText =
      await cancelResponse.text();

      console.log(
        "Outbound Hangup:",
        cancelResponse.status,
        cancelText
      );

      outboundCallControlId = null;
      originalCallerCallControlId = null;

    } catch (error) {

      console.error(
        "Outbound cancel error:",
        error
      );

    }

  }

}
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
