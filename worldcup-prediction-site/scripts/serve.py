from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from socketserver import TCPServer
import os


class LocalHTTPServer(ThreadingHTTPServer):
    def server_bind(self):
        TCPServer.server_bind(self)
        self.server_name = "127.0.0.1"
        self.server_port = self.server_address[1]


def main():
    root = Path(__file__).resolve().parents[1]
    dist = root / "dist"
    if dist.exists():
        os.chdir(str(dist))
    else:
        os.chdir(str(root / "src"))
    server = LocalHTTPServer(("127.0.0.1", 5174), SimpleHTTPRequestHandler)
    print("Serving http://127.0.0.1:5174")
    server.serve_forever()


if __name__ == "__main__":
    main()
