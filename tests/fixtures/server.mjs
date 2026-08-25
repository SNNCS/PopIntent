import http from "node:http";

const pages = {
  "/target-mismatch": `<!doctype html><html><body>
    <a id="trick" href="/legitimate" target="_blank">Read more</a>
    <script>
      document.querySelector('#trick').addEventListener('click', (event) => {
        event.preventDefault();
        window.open('/ad', '_blank');
      });
    </script>
  </body></html>`,
  "/intentional": `<!doctype html><html><body>
    <a id="legitimate-link" href="/legitimate" target="_blank">Open legitimate page</a>
  </body></html>`,
  "/script-popup": `<!doctype html><html><body>
    <button id="oauth" type="button">Continue with provider</button>
    <script>
      document.querySelector('#oauth').addEventListener('click', () => window.open('/ad', '_blank'));
    </script>
  </body></html>`,
  "/about-blank-mismatch": `<!doctype html><html><body>
    <a id="deferred" href="/legitimate" target="_blank">Open article</a>
    <script>
      document.querySelector('#deferred').addEventListener('click', (event) => {
        event.preventDefault();
        const child = window.open('about:blank', '_blank');
        setTimeout(() => { child.location.href = '/ad'; }, 100);
      });
    </script>
  </body></html>`,
  "/overlay": `<!doctype html><html><head><style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; }
    #underlying { width: 180px; height: 60px; }
    #overlay { position: fixed; inset: 0; opacity: 0; z-index: 999999; }
  </style></head><body>
    <button id="underlying" type="button">Fullscreen</button>
    <a id="overlay" href="/ad" target="_blank" aria-label="Advertisement">Advertisement</a>
  </body></html>`,
  "/iframe-overlay": `<!doctype html><html><body>
    <h1>Embedded player</h1>
    <iframe id="player" title="Embedded player" src="/overlay-frame" width="640" height="360"></iframe>
  </body></html>`,
  "/overlay-frame": `<!doctype html><html><head><style>
    html, body { margin: 0; width: 100%; height: 100%; }
    body { display: grid; place-items: center; }
    #underlying { width: 180px; height: 60px; }
    #overlay { position: fixed; inset: 0; opacity: 0; z-index: 999999; }
  </style></head><body>
    <button id="underlying" type="button">Play video</button>
    <a id="overlay" href="/ad" target="_blank" aria-label="Advertisement">Advertisement</a>
  </body></html>`,
  "/legitimate": "<!doctype html><html><body><h1>Legitimate destination</h1></body></html>",
  "/ad": "<!doctype html><html><body><h1>Unexpected destination</h1></body></html>"
};

const server = http.createServer((request, response) => {
  const body = pages[request.url ?? ""] ?? "Not found";
  response.writeHead(body === "Not found" ? 404 : 200, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store"
  });
  response.end(body);
});

server.listen(4173, "127.0.0.1");

const shutdown = () => server.close(() => process.exit(0));
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
