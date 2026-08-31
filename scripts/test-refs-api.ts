import http from "http";

const options = {
  hostname: "localhost",
  port: 3000,
  path: "/api/enseignant/repartitions/refs",
  method: "GET",
};

const req = http.request(options, (res) => {
  let data = "";
  res.on("data", (chunk) => { data += chunk; });
  res.on("end", () => {
    console.log("Status:", res.statusCode);
    console.log("Body:", data.slice(0, 2000));
  });
});

req.on("error", (e) => {
  console.error("Error:", e.message);
});
req.end();
