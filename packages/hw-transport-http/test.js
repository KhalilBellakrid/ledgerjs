require("babel-polyfill");
const wSU = require(".").default;

wSU("http://localhost:8435")
  .create()
  .then(t => t.send(0xe0, 0xd2, 0, 0).then(r => t.close().then(() => r)))
  .then(
    r => console.log("Res:", r.slice(0, r.length - 2).toString()),
    e => console.log("Failed:", e)
  );

wSU("ws://localhost:8435")
  .create()
  .then(t => t.send(0xe0, 0xd2, 0, 0).then(r => t.close().then(() => r)))
  .then(
    r => console.log("Res:", r.slice(0, r.length - 2).toString()),
    e => console.log("Failed:", e)
  );
