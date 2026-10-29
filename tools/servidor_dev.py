"""Servidor local de desenvolvimento (só para gerar as imagens do antes e depois).

Serve o site como o serve.ps1 e aceita POST /__capturar?nome=foto1 com uma
imagem em data URL, salvando em img/render/<nome>.jpg. Escuta só em 127.0.0.1.

    python tools/servidor_dev.py 8771
"""

import base64
import re
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

RAIZ = Path(__file__).resolve().parent.parent
DESTINO = RAIZ / "img" / "render"


class Handler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".json": "application/json",
        ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()

    def do_POST(self):
        url = urlparse(self.path)
        nome = parse_qs(url.query).get("nome", [""])[0]
        if url.path != "/__capturar" or not re.fullmatch(r"[a-z0-9-]{1,40}", nome):
            self.send_error(400, "pedido invalido")
            return
        corpo = self.rfile.read(int(self.headers.get("Content-Length", 0))).decode("ascii")
        if not corpo.startswith("data:image/jpeg;base64,"):
            self.send_error(400, "esperado data URL jpeg")
            return
        DESTINO.mkdir(parents=True, exist_ok=True)
        arquivo = DESTINO / f"{nome}.jpg"
        arquivo.write_bytes(base64.b64decode(corpo.split(",", 1)[1]))
        self.send_response(200)
        self.end_headers()
        self.wfile.write(f"salvo {arquivo.name} ({arquivo.stat().st_size} bytes)".encode())


if __name__ == "__main__":
    porta = int(sys.argv[1]) if len(sys.argv) > 1 else 8771
    servidor = ThreadingHTTPServer(("127.0.0.1", porta), partial(Handler, directory=str(RAIZ)))
    print(f"Servindo {RAIZ} em http://localhost:{porta}/", flush=True)
    servidor.serve_forever()
