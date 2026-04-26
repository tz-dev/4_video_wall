#!/usr/bin/env python3
import json
import os
import re
import urllib.request
import urllib.parse
from http.server import HTTPServer, SimpleHTTPRequestHandler

CLIPS_DIR = os.path.join(os.path.dirname(__file__), "clips")
os.makedirs(CLIPS_DIR, exist_ok=True)


class Handler(SimpleHTTPRequestHandler):

    def do_POST(self):
        if self.path == "/api/download-clip":
            self._handle_download_clip()
        else:
            self.send_error(404)

    def _handle_download_clip(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length))
            url = body.get("url", "").strip()
            clip_id = body.get("id", "clip")

            if not url:
                self._json(400, {"ok": False, "error": "No URL provided"})
                return

            # Dateiname aus URL ableiten
            parsed = urllib.parse.urlparse(url)
            raw_name = os.path.basename(parsed.path) or "video.mp4"
            # Nur sichere Zeichen behalten
            safe_name = re.sub(r"[^a-zA-Z0-9._-]", "_", raw_name)
            filename = f"{clip_id}_{safe_name}"
            dest = os.path.join(CLIPS_DIR, filename)

            # Download
            urllib.request.urlretrieve(url, dest)

            local_path = f"/clips/{filename}"
            self._json(200, {"ok": True, "localPath": local_path, "filename": filename})

        except Exception as e:
            self._json(500, {"ok": False, "error": str(e)})

    def _json(self, status, data):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        print(f"[server] {fmt % args}")


if __name__ == "__main__":
    port = 8000
    print(f"Serving on http://localhost:{port}  —  clips saved to ./clips/")
    HTTPServer(("", port), Handler).serve_forever()