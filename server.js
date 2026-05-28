const express = require("express");

const app = express();

app.use(express.json());

app.get("/", (req, res) => {

    res.send("Call screening app is running.");

});

app.post("/incoming-call", (req, res) => {

    console.log("Incoming call received");

    console.log(req.body);

    res.json({
        data: {
            result: "received"
        }
    });

});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

    console.log(`Server running on ${PORT}`);

});
