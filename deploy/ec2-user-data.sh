#!/usr/bin/env bash
# EC2 user-data — paste into "Advanced details > User data" when launching the
# instance (Amazon Linux 2023, t3.micro). Installs Java 17, creates the esy
# service user/dirs, and a systemd unit. The jar is uploaded separately (see
# deploy/README.md); the service auto-starts once the jar is present.
set -euxo pipefail

# --- Java 17 (Amazon Corretto) ---
dnf install -y java-17-amazon-corretto-headless

# --- service user + dirs ---
id esy >/dev/null 2>&1 || useradd --system --home /var/lib/esy --shell /usr/sbin/nologin esy
mkdir -p /opt/esy /var/lib/esy /etc/esy
chown -R esy:esy /opt/esy /var/lib/esy

# --- environment (EDIT JWT_SECRET to a long random value) ---
cat >/etc/esy/esy-api.env <<'ENV'
SERVER_PORT=8080
JWT_SECRET=CHANGE_ME_to_a_64+_char_random_string_before_first_real_use_0123456789
SPRING_DATASOURCE_URL=jdbc:h2:file:/var/lib/esy/esydb;DB_CLOSE_DELAY=-1
JPA_DDL_AUTO=update
ENV
chmod 600 /etc/esy/esy-api.env

# --- systemd unit ---
cat >/etc/systemd/system/esy-api.service <<'UNIT'
[Unit]
Description=esy Spring Boot API
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=esy
Group=esy
EnvironmentFile=/etc/esy/esy-api.env
ExecStart=/usr/bin/java -jar /opt/esy/esy-api.jar
WorkingDirectory=/var/lib/esy
SuccessExitStatus=143
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
ProtectSystem=full
ReadWritePaths=/var/lib/esy

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable esy-api.service
# Will keep restarting until /opt/esy/esy-api.jar is uploaded, then it runs.
systemctl start esy-api.service || true
