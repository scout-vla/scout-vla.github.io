#!/usr/bin/env python3
"""Local preview server for the site.

Like `python3 -m http.server`, but threaded, HTTP/1.1, and with byte-range
(HTTP 206) support. Browsers stream <video> with range requests; without them
Chrome keeps stalled connections open and runs out of its per-host connection
limit when several large videos load at once. GitHub Pages supports ranges, so
this matches production behaviour.

    python3 scripts/serve.py [port]      # default 8000

Only what the deployed site publishes (index.html and static/) is served, and
only on localhost: the repo root also holds private, gitignored files such as
.anon-denylist and local/.
"""
import os
import posixpath
import re
import sys
import urllib.parse
from functools import partial
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RANGE_RE = re.compile(r"bytes=(\d*)-(\d*)$")
# Mirrors .github/scripts/stage-site.sh: everything else stays private.
PUBLIC_FILES = {"/", "/index.html"}
PUBLIC_PREFIXES = ("/static/",)


class RangeRequestHandler(SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def is_public(self):
        path = urllib.parse.unquote(urllib.parse.urlsplit(self.path).path)
        norm = posixpath.normpath(path)
        if path.endswith("/") and norm != "/":
            norm += "/"
        path = norm
        if any(part.startswith(".") for part in path.split("/") if part):
            return False
        return path in PUBLIC_FILES or path.startswith(PUBLIC_PREFIXES)

    def send_head(self):
        self._range = None
        if not self.is_public():
            self.send_error(HTTPStatus.NOT_FOUND, "File not found")
            return None
        header = self.headers.get("Range")
        path = self.translate_path(self.path)
        if not header or not os.path.isfile(path):
            return super().send_head()

        match = RANGE_RE.match(header.strip())
        size = os.path.getsize(path)
        if not match or (not match.group(1) and not match.group(2)):
            return super().send_head()
        if match.group(1):
            start = int(match.group(1))
            end = int(match.group(2)) if match.group(2) else size - 1
        else:  # suffix range: last N bytes
            start = max(size - int(match.group(2)), 0)
            end = size - 1
        end = min(end, size - 1)
        if start > end:
            self.send_response(HTTPStatus.REQUESTED_RANGE_NOT_SATISFIABLE)
            self.send_header("Content-Range", f"bytes */{size}")
            self.send_header("Content-Length", "0")
            self.end_headers()
            return None

        f = open(path, "rb")
        f.seek(start)
        self._range = (start, end)
        self.send_response(HTTPStatus.PARTIAL_CONTENT)
        self.send_header("Content-Type", self.guess_type(path))
        self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.send_header("Content-Length", str(end - start + 1))
        self.send_header("Accept-Ranges", "bytes")
        self.end_headers()
        return f

    def copyfile(self, source, outputfile):
        if not self._range:
            return super().copyfile(source, outputfile)
        remaining = self._range[1] - self._range[0] + 1
        while remaining > 0:
            chunk = source.read(min(64 * 1024, remaining))
            if not chunk:
                break
            outputfile.write(chunk)
            remaining -= len(chunk)

    def end_headers(self):
        if not self._headers_buffer or b"Accept-Ranges" not in b"".join(self._headers_buffer):
            self.send_header("Accept-Ranges", "bytes")
        super().end_headers()


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    handler = partial(RangeRequestHandler, directory=ROOT)
    with ThreadingHTTPServer(("127.0.0.1", port), handler) as httpd:
        print(f"Serving {ROOT} at http://localhost:{port}/ (Ctrl+C to stop)")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
