const express = require("express");

const app = express();

let originalCallerCallControlId = null;

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Call screening app is running.");
});

app.post("/incoming-call", async (req, res) => {
  console.log("Incoming call received");
  console.log(JSON.stringify(req.body, null, 2));

  res.status(200).json({ received: true });

  const event = req.body?.data?.event_type;
  const callControlId = req.body?.data?.payload?.call_control_id;

  console.log("Event:", event);
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

      const gatherResponse = await fetch(
        `https://api.telnyx.com/v2/calls/${callControlId}/actions/gather_using_speak`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.TELNYX_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            payload: "Thank you for calling. Please press 1 to continue.",
            voice: "female",
            language: "en-US",
            valid_digits: "1",
            maximum_digits: 1,
            timeout_millis: 10000
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
    const digits = req.body?.data?.payload?.digits;

    console.log("Gather ended. Digits pressed:", digits);

    if (digits === "1") {
      originalCallerCallControlId = callControlId;

      console.log("Caller passed screening.");
      console.log("Saved original caller ID:", originalCallerCallControlId);

      try {
        const dialResponse = await fetch(`https://api.telnyx.com/v2/calls`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.TELNYX_API_KEY}`,
            "Content-Type": "application/json"
          },
   body: JSON.stringify({
  connection_id: process.env.TELNYX_CONNECTION_ID,
  from: req.body?.data?.payload?.from,
  to: "+18125317290"
})

        const dialText = await dialResponse.text();
        console.log("Dial Status:", dialResponse.status, dialText);
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

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
