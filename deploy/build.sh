#!/usr/bin/env bash
# Build the two deployable artifacts:
#   - apps/api/target/ecommerce-platform-0.0.1-SNAPSHOT.jar  (Spring Boot fat jar)
#   - apps/web/dist/                                          (static SPA for S3)
#
# Usage:  ./deploy/build.sh
# Requires: JDK 17 + Maven, Node 18-22 + npm. JDK 25 is NOT supported by this
# Spring Boot 3.2 build — point JAVA_HOME at a 17 JDK if you have multiple.
set -euo pipefail
cd "$(dirname "$0")/.."

JAR="apps/api/target/ecommerce-platform-0.0.1-SNAPSHOT.jar"

echo "==> Building backend jar"
( cd apps/api && mvn -q -DskipTests clean package )
test -f "$JAR" || { echo "ERROR: $JAR not produced"; exit 1; }

echo "==> Building frontend (apps/web/dist)"
( cd apps/web && npm ci && npm run build )
test -f apps/web/dist/index.html || { echo "ERROR: web build missing"; exit 1; }

echo
echo "Artifacts ready:"
echo "  backend : $JAR ($(du -h "$JAR" | cut -f1))"
echo "  frontend: apps/web/dist/ ($(du -sh apps/web/dist | cut -f1))"
echo
echo "Next: follow deploy/README.md (upload jar to EC2, sync dist/ to S3)."
