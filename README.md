# ping-icmp-api

Lightweight ICMP ping web server.

Features
- HTTP endpoint to ping an IPv4 address: GET /ping?host=<ip>
- Health check: GET /health
- Optional Basic Auth (controlled via environment variables)

This README explains how to run the service with Docker Compose, how to call the endpoints with curl, and how to deploy the provided Apps Script files to a Google Spreadsheet using `clasp`.

## Quick facts (from this repository)
- Default Flask port: 5001 (the container exposes `5001:5001` in `docker-compose.yml`)
- Docker image installs `iputils-ping` so the `ping` binary is available
- `docker-compose.yml` grants the container the Linux capabilities NET_RAW and NET_ADMIN which are required to send ICMP packets

---

## Run with Docker Compose

1. Make sure Docker and Docker Compose are installed on your machine.

2. From the repository root, build and start the service:

```bash
docker compose up --build -d
```

3. Verify the container is running:

```bash
docker compose ps
```

Notes about capabilities and ICMP
- ICMP requires raw socket privileges. The `docker-compose.yml` provided sets `cap_add: [NET_RAW, NET_ADMIN]` for the `ping-server` service. If your environment prevents granting these capabilities, you may need to run the container as `privileged: true` (less secure) or run the service on a host with proper permissions.
- Some managed environments (cloud providers, restricted Docker installs) still block ICMP from containers. If ping from inside the container fails, try an interactive shell into the container and run `ping 1.1.1.1` to debug.

## Environment variables

You can override these in `docker-compose.yml` or via environment when running the container:

- `BASIC_AUTH_ENABLED` – Defaults to `1` in the app (but the compose file sets `false`). Use `1|true|yes|on` to enable basic auth, or `0|false|no|off` to disable.
- `BASIC_AUTH_USER` – Username for Basic Auth (default: `admin`).
- `BASIC_AUTH_PASS` – Password for Basic Auth (default: `Secr3t@123`).

If Basic Auth is enabled, call the endpoint with HTTP Basic credentials (examples below).

## Endpoints and curl examples

Health check:

```bash
curl http://localhost:5001/health
# Expected response: OK
```

Ping endpoint (no auth / auth examples):

# If Basic Auth is disabled (compose defaults to `BASIC_AUTH_ENABLED=false`):
```bash
curl 'http://localhost:5001/ping?host=1.1.1.1'
```

# If Basic Auth is enabled (example credentials `admin:Secr3t@123`):
```bash
curl -u admin:Secr3t@123 'http://localhost:5001/ping?host=1.1.1.1'
```

Expected status codes
- 200 OK — when ping succeeds (>= MIN_SUCCESS_PACKETS; default 1 of 2)
- 500 Internal Server Error — when ping fails (0 packets received)
- 400 Bad Request — when `host` param is missing or IP is invalid
- 401 Unauthorized — when Basic Auth is enabled and credentials are missing/invalid

## Troubleshooting

- If `curl` shows a failure message but running `ping` directly on the host works, check:
  - The container has NET_RAW capability (see `docker compose exec <service> bash` and run `ping`).
  - The host/ISP/network doesn't block ICMP from within containers.
  - The correct `ping` binary exists inside the container (`iputils-ping` is installed in the Dockerfile).

- If you see different language/locale output from `ping` parsing, the server attempts to parse both Linux and Windows ping output. If parsing still fails, try increasing `PING_COUNT` or adjusting the code to parse the local `ping` output format.

## Deploying the Apps Script (`app-scripts/`) into a Google Sheet (manual, browser)

If you prefer a quick manual deploy using only your browser (no CLI), follow these steps:

1. Open the spreadsheet in your browser: https://docs.google.com/spreadsheets/d/1TPpnZ_w6Dzidxq7R9mhG4WY3pOC3yZd1tH2OI64b56U/edit
2. Make a copy (File → Make a copy) so you have your own editable spreadsheet.
3. Open the Apps Script editor for that copy: Extensions → Apps Script.
4. In the Apps Script editor create new script files to match the files in `app-scripts/` (for example `Code.gs`, `trigger.gs`, `Config.gs`, `Utils.gs`, and `appscripts.json` if needed).
5. Copy the contents of each corresponding file from this repository and paste into the matching file in the editor. Save each file.
6. Run the main function (for example `monitorAllVPS` or a setup function). The editor will prompt you to authorize the script—follow the authorization flow and grant the requested permissions.
7. Create the time-driven trigger from the editor: click the triggers (clock) icon in the left sidebar or go to Triggers → Add Trigger, then configure it to run `monitorAllVPS` on a time-driven schedule (e.g., hourly).
8. Test by running a function manually or by checking the spreadsheet for expected changes.

Notes:
- The browser flow is straightforward: create files, paste code, save, authorize, and add triggers via the UI. It works well for quick deployments and small projects.
- If you need to push updates frequently or want source control, consider using `clasp` (CLI) later to link a local directory to the Apps Script project.

## Security notes

- Do not enable Basic Auth with default credentials on a publicly reachable server. If exposing this service, set strong credentials via environment variables.
- Running containers with elevated capabilities (NET_RAW/NET_ADMIN) increases the host attack surface — only run trusted images and restrict network exposure where possible.

## Example full workflow

1. Copy the spreadsheet in the browser and note the spreadsheet ID.
2. Install `clasp` and `npm install -g @google/clasp`.
3. `clasp login` and authenticate.
4. `clasp create --type sheets --title "icmp-monitor-scripts" --rootDir ./app-scripts --parentId <SPREADSHEET_ID>`
5. `clasp push --cwd ./app-scripts`
6. `docker compose up --build -d`
7. Test with `curl` as shown above.

## If you want me to perform the Apps Script deployment for you

- I cannot access your Google account or create copies of your spreadsheet from here. If you'd like, I can produce a small shell script or GitHub Actions workflow that runs `clasp` (you would need to provide credentials or set up a service account and secrets). Tell me which approach you prefer and I will draft it.

---

If anything in this README doesn't match your local setup (different port, enabled auth, etc.), tell me what you want to change and I can update the README or the Compose file accordingly.

# Ping ICMP API Server

Lightweight Flask API server that runs ICMP ping(s) against an IPv4 address.

This README explains how to start the service using Docker Compose and how to call it from a client using curl.

## Files you should have
- `app.py` — the Flask application
- `Dockerfile` and `docker-compose.yml` — containerization and compose configuration
- `requirements.txt` — Python dependencies

## Start the server with Docker Compose

1. Build and start, Override Basic Auth credentials before starting, for example:

```bash
export BASIC_AUTH_ENABLE=true
export BASIC_AUTH_USER=admin
export BASIC_AUTH_PASS=Secr3t@123
docker-compose up --build -d
```

Alternatively edit `docker-compose.yml` to set env vars permanently.

2. Follow logs:

```bash
docker-compose logs -f
```

3. Stop and remove the containers:

```bash
docker-compose down
```

## HTTP endpoints
- GET /health — simple health check (no auth required)
- GET /ping?host=<IPv4> — run ping against the given IPv4 address (Basic Auth required)

Notes:
- The service validates IPv4 addresses in dotted-quad form (e.g. `8.8.8.8`).
- The container must have the system `ping` binary available and the host/container network must allow ICMP.

## Usage examples (curl)
Replace the username/password and host as needed.

- Health check (no auth):

```bash
curl "http://localhost:5001/health"
```

- Ping an IP (example with default credentials `admin:Secr3t@123`):

```bash
curl -u admin:Secr3t@123 "http://localhost:5001/ping?host=8.8.8.8"
```

Behavior:
- If the ping attempt(s) succeed (per the app's configured policy), you will receive HTTP 200 and the body will contain the ping output.
- If the ping fails per the app's policy, you will receive HTTP 500 and the body will include the ping output or error details.

## Troubleshooting
- Permission/ICMP: Some environments require elevated privileges to send ICMP packets. This app calls the OS `ping` binary, so behavior follows the OS/container policy.
- If you see `Unauthorized` in HTTP response, verify `BASIC_AUTH_USER`/`BASIC_AUTH_PASS` in the container environment.

## Quick local run (optional)
If you prefer not to use Docker:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Then use the same `curl` commands above against `http://localhost:5001`.

## Security note
Do not commit real credentials into the repository. Use environment variables or a secrets manager for production deployments.
