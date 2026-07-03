import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve("frontend");
const port = Number(process.env.PORT ?? 4173);
const host = process.env.HOST ?? "127.0.0.1";

const types = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
]);

const server = http.createServer(async (req, res) => {
  try {
    const parsed = new URL(req.url ?? "/", `http://${host}:${port}`);
    const safePath = path
      .normalize(decodeURIComponent(parsed.pathname ?? "/"))
      .replace(/^(\.\.[/\\])+/, "");
    const relative = safePath === "/" ? "index.html" : safePath.slice(1);
    const filePath = path.join(root, relative);
    if (!filePath.startsWith(root)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }
    const data = await fs.readFile(filePath);
    res.writeHead(200, {
      "content-type": types.get(path.extname(filePath)) ?? "application/octet-stream",
    });
    res.end(data);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
});

server.listen(port, host, () => {
  console.log(`ProofPay frontend: http://${host}:${port}`);
});
