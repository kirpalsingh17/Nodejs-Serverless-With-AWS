const express = require("express");
// var products = require('./route/products');
var customer = require("./route/customer");
var shopifyData = require("./route/shopifyData");
const ngrok = require("ngrok");
const cors = require("cors");

const app = express();
// const port = 4000;
// const host = "192.168.0.25";

app.use(express.json());

app.use(
  cors({
    origin:   process.env.SHOPIFY_STORE,
  })
);

// app.use('/', products);
app.use("/", customer);
app.use("/", shopifyData);

app.post("/hello", (req, res, next) => {
  return res.status(200).json({
    message: "Hello from path!",
  });
});

app.get("/", async (req, res) => {
  return res.status(200).json({
    message: "Hello from root!",
  });
});

// app.listen(port, host, () => {
//   console.log(`Example app listening on port ${port}`);
// });
// ngrok.connect(
//   {
//     proto: "http",
//     addr: port,
//   },
//   (err, url) => {
//     if (err) {
//       console.error("Error while connecting Ngrok", err);
//       return new Error("Ngrok Failed");
//     }
//   }
// );

module.exports= app;
