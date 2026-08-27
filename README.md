# ALPR · Harry Ludemann

1. **Website** (`alpr.harryludemann.com`) — Next.js on Vercel.
2. **API** (`alpr.api.harryludemann.com`) — FastAPI on a Raspberry Pi.

The browser sends photos straight to the Pi.

## Local website

```bash
npm install
cp .env.example .env.local   # optional; defaults already point at the public API
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). For a local Pi/API, set:

```
NEXT_PUBLIC_ALPR_API_URL=http://localhost:8000
```

## Raspberry Pi API

Needs a 64-bit Pi (Pi 4 4GB+ or Pi 5). First boot downloads the ONNX models.

```bash
cd pi
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app:app --host 0.0.0.0 --port 8000
```

Or with Docker:

```bash
cd pi
cp .env.example .env
docker compose up -d --build
```

Health: `GET http://PI_IP:8000/health`  
Recognize: `POST /recognize` with form field `image`.

### Public hostname (Nginx Proxy Manager)

If the Pi already publishes other sites through the nginx GUI, add one more proxy host. Do not expose port 8000 on the internet.

1. DNS: `A` (or `CNAME`) for `alpr.api.harryludemann.com` → the same public address your other NPM sites use.
2. In **Proxy Hosts → Add Proxy Host**:
   - Domain: `alpr.api.harryludemann.com`
   - Scheme: `http`
   - Forward hostname / IP:
     - NPM in Docker on the **same Pi**: `172.17.0.1` (Docker bridge to the host)
     - NPM on the host, not in Docker: `127.0.0.1`
     - NPM on another machine: the Pi’s LAN IP
   - Forward port: `8000`
   - Websockets: off
   - Block Common Exploits: on
3. SSL tab: Request a Let’s Encrypt certificate, Force SSL, HTTP/2.
4. Advanced tab (needed — default nginx rejects 8 MB uploads and the Pi can take a while):

```nginx
client_max_body_size 10m;
proxy_read_timeout 120s;
proxy_send_timeout 120s;
proxy_connect_timeout 30s;
```

Then `https://alpr.api.harryludemann.com/health` should return JSON. The Vercel site already calls that host.

Cloudflare Tunnel (`cloudflared.yml.example`) is only needed if you do **not** already have 80/443 reaching this nginx. Caddy (`Caddyfile`) is an alternative if you are not using the GUI.

### systemd (venv install)

Edit user/paths in `alpr.service`, then:

```bash
sudo cp alpr.service /etc/systemd/system/
sudo systemctl enable --now alpr
```

## Deploy the website to Vercel

1. Push this repo to GitHub.
2. Import the project in Vercel (framework: Next.js, root directory: `.`).
3. Set env vars:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://alpr.harryludemann.com` |
| `NEXT_PUBLIC_ALPR_API_URL` | `https://alpr.api.harryludemann.com` |

4. Add the domain `alpr.harryludemann.com` in Vercel.

CORS on the Pi already allows that origin (see `ALLOWED_ORIGINS` in `pi/.env.example`).
