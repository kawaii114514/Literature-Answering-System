FROM maven:3.9.11-eclipse-temurin-17 AS build
WORKDIR /workspace
COPY pom.xml ./
COPY src ./src
RUN mvn -q -DskipTests package

FROM eclipse-temurin:17-jre
WORKDIR /app
RUN apt-get update \
    && apt-get install --no-install-recommends --yes curl \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --system --uid 10001 literature
COPY --from=build /workspace/target/literature-answering-system-0.0.1-SNAPSHOT.jar app.jar
RUN mkdir -p /app/data/uploads /app/data/lucene \
    && chown -R literature:literature /app
USER literature
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=5s --start-period=45s --retries=12 \
    CMD curl --fail --silent http://127.0.0.1:8080/actuator/health || exit 1
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
