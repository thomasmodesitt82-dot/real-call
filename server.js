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

  if (event === "call.initiated" && callControlId) {
    try {
      const response = await fetch(
        `https://api.telnyx.com/v2/calls/${callControlId}/actions/answer`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.TELNYX_API_KEY}`,
            "Content-Type": "application/json"
          }
        }
      );

      const text = await response.text();
      console.log("Answer Status:", response.status, text);
    } catch (err) {
      console.error("Answer Error:", err);
    }
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
