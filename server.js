const express = require("express");

const app = express();
app.use(express.json());

const TELNYX_API_KEY = process.env.TELNYX_API_KEY;

async function telnyxCommand(callControlId, action, body = {}) {
  const response = await fetch(
    `https://api.telnyx.com/v2/calls/${callControlId}/actions/${action}`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${TELNYX_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    }
  );

  const text = await response.text();
  console.log(`Telnyx ${action} response:`, response.status, text);
}

app.get("/", (req, res) => {
  res.send("Call screening app is running.");
});

app.post("/incoming-call", async (req, res) => {
  const event = req.body?.data?.event_type;
  const payload = req.body?.data?.payload;
  const callControlId = payload?.call_control_id;

  console.log("Incoming Telnyx event:", event);

  res.status(200).json({ received: true });

  try {
    if (event === "call.initiated" && callControlId) {
      await telnyxCommand(callControlId, "answer");

      await telnyxCommand(callControlId, "speak", {
        payload: "This is Real Call. Please press 7 to continue.",
        voice: "female"
      });
    }
  } catch (error) {
    console.error("Telnyx command error:", error);
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
