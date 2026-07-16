const path = require("path");
const lt = require(path.join(__dirname, "lt", "node_modules", "localtunnel"));

const candidates = [
  "qeagenticframework",
  "agenticqaframework",
  "qeagenticframework-vc",
  "vikingcloud-qeagentic",
];
const port = Number(process.env.PORT || 8080);

(async () => {
  for (const subdomain of candidates) {
    try {
      console.log("Trying subdomain:", subdomain);
      const tunnel = await lt({ port, subdomain, timeout: 15000 });
      console.log("BRANDED_URL=" + tunnel.url);
      tunnel.on("close", () => process.exit(1));
      tunnel.on("error", (e) => console.error("Tunnel error:", e.message));
      return;
    } catch (e) {
      console.error("Failed", subdomain + ":", e.message);
    }
  }
  console.error("All subdomains taken or blocked. Falling back to random tunnel...");
  try {
    const tunnel = await lt({ port, timeout: 15000 });
    console.log("BRANDED_URL=" + tunnel.url);
  } catch (e) {
    console.error("Failed completely:", e.message);
    process.exit(1);
  }
})();
