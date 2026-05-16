# Single image: builds the React SPA, bundles it into the Spring Boot jar's
# static resources, and runs the jar. One service serves SPA + /api (same
# origin -> no CORS/proxy). Used by Render (render.yaml) and runnable anywhere.

# 1) Build the web SPA (pinned Node 20 — reproducible, avoids host Node issues)
FROM node:20-alpine AS web
WORKDIR /web
COPY apps/web/package.json apps/web/package-lock.json ./
RUN npm ci
COPY apps/web/ ./
RUN npm run build

# 2) Build the Spring Boot fat jar with the SPA on its classpath
FROM maven:3.9-eclipse-temurin-17 AS api
WORKDIR /api
COPY apps/api/pom.xml ./
RUN mvn -q -B dependency:go-offline
COPY apps/api/src ./src
# bundle the built SPA so Spring serves it from classpath:/static
COPY --from=web /web/dist ./src/main/resources/static
RUN mvn -q -B -DskipTests clean package

# 3) Minimal runtime
FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=api /api/target/ecommerce-platform-0.0.1-SNAPSHOT.jar app.jar
# Fit the free 512MB instance; bind to the platform-provided $PORT.
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=70 -XX:+UseSerialGC"
ENV JPA_DDL_AUTO=create-drop
EXPOSE 8080
USER 1000
ENTRYPOINT ["java","-jar","/app/app.jar"]
