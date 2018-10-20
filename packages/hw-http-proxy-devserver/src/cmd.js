import TransportNodeHid from "@ledgerhq/hw-transport-node-hid";
import http from "http";
import express from "express";
import cors from "cors";
import WebSocket from "ws";
import bodyParser from "body-parser";

const PORT = process.env.PORT || "8435";

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());

app.get("/", (req, res) => {
  console.log("HTTP: GET /");
  res.sendStatus(200);
});

let pending = false;
app.post("/", bodyParser.json(), async (req, res) => {
  console.log("HTTP: POST /");
  if (!req.body) return res.sendStatus(400);
  let data = null,
    error = null;
  if (pending) {
    return res
      .status(400)
      .json({ error: "an exchange query was already pending" });
  }
  pending = true;
  try {
    const transport = await TransportNodeHid.create(5000);
    data = await transport.exchange(Buffer.from(req.body.apduHex, "hex"));
  } catch (e) {
    error = e.toString();
  }
  pending = false;
  const result = { data, error };
  if (data) {
    console.log("APDU:", req.body.apduHex, "=>", data.toString("hex"));
  } else {
    console.log("APDU failed:", req.body.apduHex, "=>", error);
  }
  res.json(result);
});

let wsIndex = 0;
wss.on("connection", async ws => {
  const index = ++wsIndex;
  console.log("WS: new connection (" + index + ")");
  try {
    const transport = await TransportNodeHid.create(5000);

    transport.on("disconnect", () => ws.close());

    ws.on("close", () => {
      console.log("WS: close (" + index + ")");
      transport.close();
    });

    ws.on("message", async apduHex => {
      try {
        const res = await transport.exchange(Buffer.from(apduHex, "hex"));
        console.log("APDU:", apduHex, "=>", res.toString("hex"));
        ws.send(
          JSON.stringify({ type: "response", data: res.toString("hex") })
        );
      } catch (e) {
        console.log("APDU failed:", apduHex, "=>", e);
        ws.send(JSON.stringify({ type: "error", error: e.message }));
      }
    });

    ws.send(JSON.stringify({ type: "opened" }));
  } catch (e) {
    ws.close();
  }
});

server.listen(PORT, () => {
  console.log("hw-transport-http-proxy-debug listening on " + PORT + "...");
});
