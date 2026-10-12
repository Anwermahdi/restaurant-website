import { createServer } from "vite";
import React from "react";
import { renderToString } from "react-dom/server";

const server = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "silent",
});
try {
  const mod = await server.ssrLoadModule("/src/App.jsx");
  const html = renderToString(React.createElement(mod.default));
  console.log(`RENDER OK length=${html.length}`);
  console.log(html.slice(0, 300));
} catch (e) {
  console.error("RENDER FAIL:", e.message);
  console.error(e.stack?.split("\n").slice(0, 8).join("\n"));
} finally {
  await server.close();
}
