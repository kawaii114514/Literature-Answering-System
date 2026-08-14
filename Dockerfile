FROM maven:3.9.11-eclipse-temurin-17 AS build
WORKDIR /workspace
COPY pom.xml ./
COPY src ./src
RUN mvn -q -DskipTests package

FROM eclipse-temurin:17-jre
WORKDIR /app
RUN useradd --system --uid 10001 literature
COPY --from=build /workspace/target/literature-answering-system-0.0.1-SNAPSHOT.jar app.jar
RUN mkdir -p /app/data/uploads && chown -R literature:literature /app
USER literature
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]

