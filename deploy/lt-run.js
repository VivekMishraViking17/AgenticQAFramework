const path = require("path");
const lt = require(path.join(__dirname, "lt", "node_modules", "localtunnel"));
const subdomain = process.argv[2] || "agenticqaframework";
const port = Number(process.env.PORT || 8080);

(async () => {
  try {
    const tunnel = await lt({ port, subdomain });
    const url = tunnel.url;
    console.log("");
    console.log("BRANDED_URL=" + url);
    console.log("");
    tunnel.on("close", () => process.exit(1));
    tunnel.on("error", (e) => {
      console.error("Tunnel error:", e.message);
      process.exit(1);
    });
  } catch (e) {
    console.error("Failed:", e.message);
    process.exit(1);
  }
})();
