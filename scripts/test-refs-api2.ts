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
    const json = JSON.parse(data);
    console.log("trimestres count:", json.trimestres?.length || 0);
    console.log("cahiers count:", json.cahiers?.length || 0);
    if (json.trimestres?.length > 0) {
      console.log("First trimestre:", JSON.stringify(json.trimestres[0]));
    }
    if (json.cahiers?.length > 0) {
      console.log("First cahier:", JSON.stringify(json.cahiers[0]));
    }
  });
});

req.on("error", (e) => {
  console.error("Error:", e.message);
});
req.end();
