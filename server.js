const express = require("express");

const app = express();

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

      const speakResponse = await fetch(
        `https://api.telnyx.com/v2/calls/${callControlId}/actions/speak`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.TELNYX_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            payload: "Thank you for calling. Please press 1 to continue.",
            voice: "Joanna",
            language: "en-US"
          })
        }
      );

      const speakText = await speakResponse.text();
      console.log("Speak Status:", speakResponse.status, speakText);

    } catch (error) {
      console.error("Call control error:", error);
    }
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
