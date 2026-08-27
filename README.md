# ALPR · Harry Ludemann

Two pieces:

1. **Website** (`alpr.harryludemann.com`) — Next.js on Vercel. Upload a photo, draw boxes, show NZ plates.
2. **API** (`alpr.api.harryludemann.com`) — FastAPI on a Raspberry Pi. Runs YOLOv9 plate detection + MobileViT OCR (the same `fast_alpr` stack as the old script, minus EasyOCR/Tesseract so the Pi fits in RAM).

The browser talks to the Pi **directly**. Images never pass through Vercel (Vercel’s body-size limit would clip them anyway).

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

### Public hostname (recommended: Cloudflare Tunnel)

Home networks are often behind CGNAT, so a tunnel is simpler than port-forwarding.

```bash
cloudflared tunnel login
cloudflared tunnel create alpr-api
cloudflared tunnel route dns alpr-api alpr.api.harryludemann.com
```

Copy `cloudflared.yml.example` to `~/.cloudflared/config.yml`, fill in the tunnel id, then:

```bash
cloudflared tunnel run alpr-api
```

If the Pi has a public IP instead, point an A/AAAA record at it and put Caddy in front with the included `Caddyfile`.

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

## What changed from the old script

Kept: YOLOv9 detector, global-plates OCR, 5% box padding, NZ regex, character confusion map.

Dropped for the Pi: EasyOCR, Tesseract, albumentations, and fuzzy-matching against a known answer list (that was a test harness, not production).
