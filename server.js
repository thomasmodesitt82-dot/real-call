const express = require("express");

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Call screening app is running.");
});

app.post("/incoming-call", (req, res) => {

  console.log("Incoming call received");

  console.log(JSON.stringify(req.body, null, 2));

  res.status(200).json({
    received: true
  });

});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

  console.log(`Server running on ${PORT}`);

});
