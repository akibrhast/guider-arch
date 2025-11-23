# GUIDER

**GUIDER** is a distributed microservices system for weather data collection, processing, and forecasting. It integrates with METOC (Meteorological and Oceanographic) services to gather weather data, store it in a PostGIS-enabled database, and provide forecast APIs.

## Table of Contents

- [System Overview](#system-overview)
- [Architecture](#architecture)
- [Services](#services)
- [Correlation ID Implementation](#correlation-id-implementation)
- [Database Architecture](#database-architecture)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Observability Stack](#observability-stack)
- [Development](#development)
- [CI/CD Pipeline](#cicd-pipeline)

---

## System Overview

GUIDER is composed of **5 core microservices** plus supporting infrastructure (database, message broker, observability stack):

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           GUIDER System Architecture                          │
└──────────────────────────────────────────────────────────────────────────────┘

                     ┌──────────────────────────────────┐
                     │     External METOC Server        │
                     │  (Weather Data Source)           │
                     └────┬─────────────────────┬───────┘
                          │                     │
                    Query Metadata      Query Available Files
                          │                     │
                          │                     │
    ┌─────────────┐       │                     │         ┌─────────────┐
    │  Forecast   │       │                     │         │  Heartbeat  │
    │  Service    │       │                     │         │  (Scheduler)│
    │  (HTTP API) │       │                     │         └──────┬──────┘
    └──────┬──────┘       │                     │                │
           │              │                     │                │ Every 6h
           │ Read         │                     │                │ Publishes
           │              │                     │                │
           │              ▼                     │                ▼
           │        ┌──────────┐               │         ┌─────────────┐
           │        │  Survey  │               │         │    Nexus    │
           │        │ Service  │◄──────────────┼─────────┤  (RabbitMQ) │
           │        └────┬─────┘  Consumes     │         └──────┬──────┘
           │             │        heartbeat     │                │
           │             │ Write                │                │ Consumes
           │             │ metadata             │                │ heartbeat
           │             │                      │                │
           ▼             ▼                      │                ▼
    ┌──────────────────────────┐               │          ┌──────────┐
    │        Zephyr            │               │          │   Seed   │
    │   (PostgreSQL+PostGIS)   │               │          │ Service  │
    └────────▲─────────────────┘               │          └────┬─────┘
             │                                  │               │
             │ Write                            │               │ Read DB
             │ raster                           └───────────────┤ Query METOC
             │ files                                            │
             │                                                  │ Publishes
             │                                                  │ file metadata
             │                                                  │
             │                                                  ▼
             │                                           ┌─────────────┐
             │                                           │    Nexus    │
             │                                           │  (RabbitMQ) │
             │                                           └──────┬──────┘
             │                                                  │
             │                                                  │ Consumes
             │                                                  │ file metadata
             │                                                  │
             │                                                  ▼
             │                                            ┌──────────┐
             └────────────────────────────────────────────┤ Harvest  │
                                                          │ Service  │
                                                          └──────────┘

                        ┌────────────────────────────────────┐
                        │     Observability Stack            │
                        │  - Promtail (log collection)       │
                        │  - Loki (log aggregation)          │
                        │  - Grafana (visualization)         │
                        │  Monitors all services via labels  │
                        └────────────────────────────────────┘

Legend:
  → Data/Message Flow
  Services: Forecast (HTTP only), Survey/Seed/Harvest (RabbitMQ consumers)
  Nexus: Three queues (heartbeat.survey, heartbeat.seed, harvest.filemetadata)
  Zephyr: Survey writes metadata, Harvest writes rasters, Forecast reads all
```

**Technology Stack:**
- **Language**: Go 1.23+
- **Database**: PostgreSQL 17 + PostGIS 3.5
- **Message Broker**: RabbitMQ 4.0
- **Container Runtime**: Podman / Kubernetes
- **Observability**: Promtail + Loki + Grafana
- **CI/CD**: Azure Pipelines
- **Deployment**: Kubernetes with Kustomize, Azure Container Registry

---

## Architecture

### Service Flow Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         Message Flow & Interactions                         │
└────────────────────────────────────────────────────────────────────────────┘

External API Call                         Scheduled Heartbeat (Every 6h)
      │                                            │
      ▼                                            │ Generates Correlation ID
┌───────────┐                                      │
│ Forecast  │                                      ▼
│  Service  │                               ┌──────────────┐
│  (HTTP)   │                               │  Heartbeat   │
└─────┬─────┘                               │   Service    │
      │                                     └──────┬───────┘
      │ Read forecast data                         │
      │                                            │ Publishes to Nexus
      ▼                                            │
┌──────────────────┐                     ┌─────────┴──────────┐
│     Zephyr       │                     │                    │
│ PostgreSQL+PostGIS│                     ▼                    ▼
└────▲─────────▲───┘           heartbeat.survey    heartbeat.seed
     │         │                        │                    │
     │         │ Write                  │                    │
     │         │ raster files           ▼                    ▼
     │         │                  ┌──────────┐         ┌──────────┐
     │         │                  │  Survey  │         │   Seed   │
     │         │                  │ Service  │         │ Service  │
     │         │                  └────┬─────┘         └────┬─────┘
     │         │                       │                    │
     │         │                       │ Query              │ Read availability
     │         │                       │ METOC              │ Query METOC for files
     │         │                       │                    │
     │         │                       ▼                    ▼
     │         │                 ┌─────────────────────────────────┐
     │         │                 │      External METOC Server       │
     │         │                 │   (Weather Data Source API)      │
     │         │                 └──────┬───────────────────┬───────┘
     │         │                        │                   │
     │         │        Metadata (COAMPS model) ◄───────────┘
     │         │                        │                   │
     │         │                        ▼                   │ Available files JSON
     │         │                  Write metadata            │
     │         │                  to Zephyr DB              │
     │         │                        │                   │
     │  Write  │                        │                   │
     │ metadata│◄───────────────────────┘                   │
     │         │                                            │
     │         │                                            ▼
     │         │                                    Publish file metadata
     │         │                                    to harvest.filemetadata
     │         │                                            │
     │         │                                            ▼
     │         │                                      ┌──────────┐
     │         │                                      │ Harvest  │
     │         └──────────────────────────────────────┤ Service  │
     │                                                └────┬─────┘
     │                                                     │
     │                                                     │ Download files
     │                                                     │ from METOC
     │                                                     │
     └─────────────────────────────────────────────────────┘
                                         Store raster files in Zephyr
```

### Data Flow Timeline

```
Time ─────────────────────────────────────────────────────────────────────►

T+0s    Heartbeat: Generate Correlation ID (550e8400-...)
         │
         ├──► Survey Queue (heartbeat message)
         └──► Seed Queue (heartbeat message)

T+1s    Survey: Receive message, extract correlation_id
         │      Create correlation-aware logger
         │      Query METOC API for model metadata (COAMPS)
         │      Write coverage and availability data to Zephyr
         └──► Log: "Survey ping received" {correlation_id: "550e8400..."}

T+2s    Seed: Receive message, extract correlation_id
         │    Create correlation-aware logger
         │    Read availability data from Zephyr
         │    Query METOC API for available files
         │    Publish file metadata to Harvest Queue (correlation_id propagates)
         └──► Log: "Files discovered" {correlation_id: "550e8400...", file_count}

T+3s    Harvest: Receive file metadata, extract correlation_id
         │       Create correlation-aware logger
         │       Download raster files from METOC
         │       Write raster data to Zephyr database
         └──► Log: "File processed" {correlation_id: "550e8400...", file_name}

─────────────────────────────────────────────────────────────────────────►
        All logs queryable in Grafana by correlation_id!
```

---

## Services

### 1. **Forecast Service** (HTTP API)

**Purpose**: Provides RESTful API for querying weather forecast data

**Key Features**:
- HTTP server on port 8080
- Correlation ID middleware for request tracing
- Gzip compression for responses
- Database queries using PostGIS spatial functions

**Endpoints**:
- `GET /forecast?coverage={COVERAGE}` - Get forecast for coverage area

**Code**: [services/forecast/](services/forecast/)

**Docker Image**: `guiderregistry.azurecr.io/guiderregistry/forecast:latest`

---

### 2. **Heartbeat Service** (Scheduler)

**Purpose**: Periodic task scheduler that triggers data collection workflows

**Key Features**:
- Runs every 6 hours (configurable)
- Generates correlation IDs for each cycle
- Publishes heartbeat messages to Survey and Seed services via RabbitMQ

**Message Flow**:
```go
// Every 6 hours:
correlationID := correlation.Generate()
heartbeat := Envelope{
    CorrelationID: correlationID,
    Timestamp: time.Now(),
    Payload: time.Now(),
}
publisher.Publish(ctx, "heartbeat.survey", heartbeat)
publisher.Publish(ctx, "heartbeat.seed", heartbeat)
```

**Code**: [services/heartbeat/](services/heartbeat/)

**Docker Image**: `guiderregistry.azurecr.io/guiderregistry/heartbeat:latest`

---

### 3. **Survey Service** (Metadata Population)

**Purpose**: Queries METOC server for weather model metadata and populates the database with coverage and availability data

**Key Features**:
- Consumes heartbeat messages from RabbitMQ
- Queries METOC API for model metadata (COAMPS)
- Writes coverage and availability data to Zephyr database
- Validates TLS certificates

**Workflow**:
```
1. Receive heartbeat message (with correlation_id)
2. Create correlation-aware logger
3. Query METOC API for model metadata (COAMPS)
4. Write coverage data to Zephyr database
5. Write availability data to Zephyr database (variables × analyses)
6. Log result: "Survey ping received" {correlation_id}
```

**Code**: [services/survey/](services/survey/)

**Docker Image**: `guiderregistry.azurecr.io/guiderregistry/survey:latest`

---

### 4. **Seed Service** (File Discovery)

**Purpose**: Discovers available weather data files from METOC server

**Key Features**:
- Consumes heartbeat messages from RabbitMQ
- Queries METOC API for available files
- Publishes file metadata to Harvest queue
- Correlation ID propagates to downstream services

**Workflow**:
```
1. Receive heartbeat (with correlation_id)
2. Query METOC /availabilities endpoint
3. Parse JSON file list
4. For each file:
   - Wrap in Envelope with same correlation_id
   - Publish to harvest.filemetadata queue
5. Log: "Files discovered" {correlation_id, file_count}
```

**Code**: [services/seed/](services/seed/)

**Docker Image**: `guiderregistry.azurecr.io/guiderregistry/seed:latest`

---

### 5. **Harvest Service** (File Download & Storage)

**Purpose**: Downloads weather data files and stores them in the database

**Key Features**:
- Consumes file metadata messages from RabbitMQ
- Downloads files from METOC server
- Stores availability data in PostgreSQL/PostGIS
- Retries on failure

**Workflow**:
```
1. Receive file metadata (with correlation_id)
2. Download file from METOC server
3. Parse weather data
4. Store in Zephyr database (zephyr.availabilities table)
5. Log: "File processed" {correlation_id, file_name, size}
```

**Code**: [services/harvest/](services/harvest/)

**Docker Image**: `guiderregistry.azurecr.io/guiderregistry/harvest:latest`

---

## Correlation ID Implementation

### Overview

Correlation IDs enable **distributed tracing** across all services. Every request (HTTP or message queue) receives a **unique UUID** that propagates through all service interactions and appears in all log entries.

See [CORRELATION_IDS.md](CORRELATION_IDS.md) for complete documentation.

### Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                    Correlation ID Flow Architecture                         │
└────────────────────────────────────────────────────────────────────────────┘

  HTTP Request                              RabbitMQ Message Flow
  ════════════                              ═══════════════════════

┌─────────────┐                           ┌──────────────┐
│ HTTP Client │                           │  Heartbeat   │
└──────┬──────┘                           │   Service    │
       │                                  └──────┬───────┘
       │ X-Correlation-ID: abc123               │ correlation.Generate()
       │                                        │
       ▼                                        ▼
┌────────────────┐                      ┌─────────────────┐
│   Forecast     │                      │ Envelope[T]     │
│   Middleware   │                      ├─────────────────┤
├────────────────┤                      │ correlation_id  │
│ Extract Header │                      │ timestamp       │
│ OR Generate    │                      │ payload: T      │
│ Add to Context │                      └────┬────────────┘
│ Add to Response│                           │
└────┬───────────┘                           │ JSON
     │                                        │
     ├──► ctx = correlation.WithID(ctx, id)  │
     │                                        ▼
     │                                 ┌──────────────┐
     ▼                                 │   RabbitMQ   │
┌────────────────┐                    │    Nexus     │
│   Handler      │                    └──────┬───────┘
│ logger, id :=  │                           │
│  correlation.  │                           │ Consume
│  Logger(ctx)   │                           │
└────────────────┘                           ▼
     │                                ┌──────────────┐
     │                                │   Consumer   │
     │                                ├──────────────┤
     ├──► All logs include:           │ Unwrap       │
     │    {correlation_id: "abc123"}  │ Envelope     │
     │                                │ Extract      │
     └──► Response Header:            │ correlation  │
          X-Correlation-ID: abc123    └──────┬───────┘
                                             │
                                             ▼
                                      ctx = correlation.WithID(ctx, msg.CorrelationID)
                                      logger = correlation.LoggerWithID(logger, msg.CorrelationID)
                                             │
                                             ▼
                                      All logs include correlation_id
```

### Message Envelope Structure

All RabbitMQ messages are wrapped in an envelope for metadata propagation:

```json
{
  "correlation_id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-01-20T10:30:45Z",
  "payload": {
    "time": "2025-01-20T10:30:45Z"
  }
}
```

**Implementation**: [internal/nexus/envelope.go](internal/nexus/envelope.go)

### Correlation-Aware Components

| Component | Location | Purpose |
|-----------|----------|---------|
| **Core Package** | [internal/correlation/](internal/correlation/) | ID generation, context management, logger wrapping |
| **Envelope** | [internal/nexus/envelope.go](internal/nexus/envelope.go) | Message wrapper with correlation metadata |
| **Producer** | [internal/nexus/producer.go](internal/nexus/producer.go) | Auto-wraps messages with correlation ID from context |
| **Consumer** | [internal/nexus/consumer.go](internal/nexus/consumer.go) | Unwraps envelopes, extracts correlation ID |
| **HTTP Middleware** | [services/forecast/middleware.go](services/forecast/middleware.go#L51) | Extracts from `X-Correlation-ID` header |

### Usage Example

```go
// In HTTP handler (Forecast service)
func handleRequest(w http.ResponseWriter, r *http.Request) {
    // Middleware already added correlation_id to context
    logger, correlationID := correlation.Logger(r.Context(), baseLogger)

    logger.Info("processing request", slog.String("path", r.URL.Path))
    // Logs: {"correlation_id":"550e8400-...", "msg":"processing request", ...}

    // Response includes correlation ID header
    w.Header().Set("X-Correlation-ID", correlationID)
}

// In message consumer (Survey/Seed/Harvest services)
func processMessage(msg nexus.Message[Heartbeat]) {
    // Create context with correlation ID
    msgCtx := correlation.WithID(ctx, msg.CorrelationID)

    // Create correlation-aware logger
    msgLogger := correlation.LoggerWithID(logger, msg.CorrelationID)

    msgLogger.Info("processing heartbeat", slog.Time("time", msg.Payload))
    // Logs: {"correlation_id":"550e8400-...", "msg":"processing heartbeat", ...}
}
```

### Benefits

✅ **Request Tracing**: Track a single request across all microservices
✅ **Debugging**: Find all logs related to a specific operation with one Grafana query
✅ **Performance Analysis**: Measure end-to-end latency
✅ **Error Correlation**: Associate errors with their initiating request

**Grafana Query Example**:
```logql
{environment="devel"} | json | correlation_id="550e8400-e29b-41d4-a716-446655440000"
```

Shows complete request flow across Heartbeat → Survey/Seed → Harvest → Database

---

## Database Architecture

**Database Name**: Zephyr
**Technology**: PostgreSQL 17 + PostGIS 3.5
**Purpose**: Weather data availability storage with geospatial capabilities

See [db/README.md](db/README.md) for complete documentation.

### Database Schema Overview

```
┌────────────────────────────────────────────────────────┐
│              Zephyr Database Schema                     │
├────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────┐          │
│  │         availabilities                   │          │
│  ├──────────────────────────────────────────┤          │
│  │ id (SERIAL PRIMARY KEY)                  │          │
│  │ file_name (TEXT)                         │          │
│  │ coverage_area (TEXT)                     │          │
│  │ start_time (TIMESTAMPTZ)                 │          │
│  │ end_time (TIMESTAMPTZ)                   │          │
│  │ forecast_reference (TIMESTAMPTZ)         │          │
│  │ geom (GEOMETRY - PostGIS)                │          │
│  │ created_at (TIMESTAMPTZ)                 │          │
│  │ updated_at (TIMESTAMPTZ)                 │          │
│  └──────────────────────────────────────────┘          │
│                                                         │
│  Indexes:                                               │
│  - idx_coverage_area (coverage_area)                    │
│  - idx_time_range (start_time, end_time)                │
│  - idx_geom (GIST spatial index)                        │
│                                                         │
└────────────────────────────────────────────────────────┘
```

### Migration Management

**Tool**: [golang-migrate/migrate](https://github.com/golang-migrate/migrate)

**Migration Files**: `db/migrations/*.sql`

**Migration Workflow**:

```
┌─────────────────────────────────────────────────────────────┐
│               Database Migration Workflow                    │
└─────────────────────────────────────────────────────────────┘

Development:
    1. Create migration:
       └──► migrate create -ext sql -dir db/migrations -seq add_table_name

    2. Write up/down SQL:
       └──► db/migrations/000001_add_table_name.up.sql
       └──► db/migrations/000001_add_table_name.down.sql

    3. Test locally:
       └──► task zephyr:migrate:up
       └──► task zephyr:migrate:down

Production (Kubernetes):
    1. Build migration image:
       └──► Dockerfile includes db/migrations/

    2. Kubernetes Job runs:
       ┌────────────────────────────────────┐
       │  Migration Job (Init Container)    │
       ├────────────────────────────────────┤
       │  1. Wait for PostgreSQL ready      │
       │  2. Run: migrate -path /migrations │
       │           -database postgres://... │
       │           up                       │
       │  3. Exit on success                │
       └────────────────────────────────────┘

    3. Application pods start after migration completes
```

**Kubernetes Migration Job**: [manifests/zephyr/migratejob.yaml](manifests/zephyr/migratejob.yaml)

### Database Connection

**Configuration via Environment Variables**:

```bash
PGHOST=zephyr-service        # Kubernetes service name
PGPORT=5432
PGUSER=guider
PGPASSWORD=<from-secret>     # Injected via Kubernetes Secret
PGDATABASE=zephyr
```

**Connection Details**:
- **Driver**: [jackc/pgx/v5](https://github.com/jackc/pgx) (native Go PostgreSQL driver)
- **Connection Pool**: Managed by pgx pooling
- **TLS**: Enabled in production

---

## Kubernetes Deployment

### Infrastructure Overview

```
┌────────────────────────────────────────────────────────────────────────────┐
│                    Kubernetes Cluster (Namespace: guider)                   │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │                        Ingress Layer                            │       │
│  │  ┌────────────────────────────────────────────────────────┐     │       │
│  │  │ Nginx Ingress (Mutual TLS)                             │     │       │
│  │  │ - cdvn-guider-02.precisedevnet.com                     │     │       │
│  │  │ - vs-guider.precisedevnet.com                          │     │       │
│  │  │ - TLS Secret: devnet-tls                               │     │       │
│  │  │ - Client Cert Verification: devnet-ca-cert             │     │       │
│  │  └──────────────────────┬─────────────────────────────────┘     │       │
│  └─────────────────────────┼───────────────────────────────────────┘       │
│                            │                                                │
│  ┌─────────────────────────▼───────────────────────────────────────┐       │
│  │                    Application Services                         │       │
│  │                                                                  │       │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │       │
│  │  │  Forecast    │  │   Survey     │  │    Seed      │          │       │
│  │  │ Deployment   │  │ Deployment   │  │ Deployment   │          │       │
│  │  │ Replicas: 1  │  │ Replicas: 1  │  │ Replicas: 1  │          │       │
│  │  │ Port: 8080   │  │              │  │              │          │       │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │       │
│  │         │                 │                 │                   │       │
│  │  ┌──────▼──────┐  ┌───────▼──────┐  ┌───────▼──────┐           │       │
│  │  │  Harvest    │  │  Heartbeat   │  │ ClusterIP    │           │       │
│  │  │ Deployment  │  │ Deployment   │  │  Services    │           │       │
│  │  │ Replicas: 1 │  │ Replicas: 1  │  │              │           │       │
│  │  └─────────────┘  └──────────────┘  └──────────────┘           │       │
│  │                                                                  │       │
│  └──────────────────────────────────────────────────────────────────┘       │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │                   Infrastructure Services                       │       │
│  │                                                                  │       │
│  │  ┌──────────────────────────┐    ┌──────────────────────────┐   │       │
│  │  │        Nexus             │    │        Zephyr            │   │       │
│  │  │   (RabbitMQ 4.0)         │    │  (PostgreSQL 17 +        │   │       │
│  │  │  ┌────────────────────┐  │    │       PostGIS 3.5)       │   │       │
│  │  │  │ Deployment         │  │    │  ┌────────────────────┐  │   │       │
│  │  │  │ Replicas: 1        │  │    │  │ Deployment         │  │   │       │
│  │  │  │ Port: 5672 (AMQP)  │  │    │  │ Replicas: 1        │  │   │       │
│  │  │  └────────────────────┘  │    │  │ Port: 5432         │  │   │       │
│  │  │  ┌────────────────────┐  │    │  └────────────────────┘  │   │       │
│  │  │  │ ClusterIP Service  │  │    │  ┌────────────────────┐  │   │       │
│  │  │  │ nexus-service:5672 │  │    │  │ ClusterIP Service  │  │   │       │
│  │  │  └────────────────────┘  │    │  │ zephyr-service:5432│  │   │       │
│  │  │  ┌────────────────────┐  │    │  └────────────────────┘  │   │       │
│  │  │  │ Secret: nexus-pw   │  │    │  ┌────────────────────┐  │   │       │
│  │  │  └────────────────────┘  │    │  │ NodePort Service   │  │   │       │
│  │  └──────────────────────────┘    │  │ Port: 30004        │  │   │       │
│  │                                   │  └────────────────────┘  │   │       │
│  │                                   │  ┌────────────────────┐  │   │       │
│  │                                   │  │ PVC: zephyr-data   │  │   │       │
│  │                                   │  │ 200Gi (Ceph RBD)   │  │   │       │
│  │                                   │  └────────────────────┘  │   │       │
│  │                                   │  ┌────────────────────┐  │   │       │
│  │                                   │  │ Secret: zephyr-pw  │  │   │       │
│  │                                   │  └────────────────────┘  │   │       │
│  │                                   │  ┌────────────────────┐  │   │       │
│  │                                   │  │ Migration Job      │  │   │       │
│  │                                   │  │ (Init Container)   │  │   │       │
│  │                                   │  └────────────────────┘  │   │       │
│  │                                   └──────────────────────────┘   │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │                         Secrets                                 │       │
│  │  - guiderregcreds (Azure Container Registry)                    │       │
│  │  - metoc-tls (METOC TLS certificates)                           │       │
│  │  - devnet-tls (Devnet TLS certificates)                         │       │
│  │  - devnet-ca-cert (Devnet CA certificate)                       │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                             │
│  Storage Class: ceph-rbd (Ceph RBD backend)                                 │
│  Network: ClusterIP (internal) + NodePort (external DB access)              │
│  Image Registry: guiderregistry.azurecr.io                                  │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

### Deployment Manifests

**Location**: [manifests/](manifests/)

| Resource Type | Files | Purpose |
|---------------|-------|---------|
| **Namespace** | [namespace.yaml](manifests/namespace.yaml) | `guider` namespace for all resources |
| **Deployments** | forecast/, harvest/, heartbeat/, seed/, survey/, nexus/, zephyr/ | Service deployments |
| **Services** | */service.yaml | ClusterIP services for internal communication |
| **Ingress** | [forecast/ingress.yaml](manifests/forecast/ingress.yaml) | External access with mutual TLS |
| **PersistentVolumeClaim** | [zephyr/pvc.yaml](manifests/zephyr/pvc.yaml) | 200Gi Ceph RBD storage |
| **ConfigMap** | [heartbeat/configmap.yaml](manifests/heartbeat/configmap.yaml) | Nexus configuration |
| **Job** | [zephyr/migratejob.yaml](manifests/zephyr/migratejob.yaml) | Database migration |

### Service Configuration

**All services use Azure Container Registry**:

```yaml
image: guiderregistry.azurecr.io/guiderregistry/<service>:latest
imagePullSecrets:
  - name: guiderregcreds
```

**Environment Variables injected via Secrets**:

```yaml
# Database credentials (from zephyr-pw secret)
- name: PGUSER
  valueFrom:
    secretKeyRef:
      name: zephyr-pw
      key: user

# RabbitMQ credentials (from nexus-pw secret)
- name: NEXUS_USER
  valueFrom:
    secretKeyRef:
      name: nexus-pw
      key: user
```

**TLS Certificates mounted as volumes**:

```yaml
volumes:
  - name: metoc-tls
    secret:
      secretName: metoc-tls
volumeMounts:
  - name: metoc-tls
    mountPath: /etc/ssl/metoc
    readOnly: true
```

### Health Checks

```yaml
# PostgreSQL readiness probe
readinessProbe:
  exec:
    command: ["pg_isready", "-U", "guider"]
  initialDelaySeconds: 5
  periodSeconds: 10

# RabbitMQ liveness probe
livenessProbe:
  exec:
    command: ["rabbitmq-diagnostics", "ping"]
  initialDelaySeconds: 30
  periodSeconds: 30
```

### kubectl Management

**Common Operations** (defined in [task/K8sTasks.yml](task/K8sTasks.yml)):

```bash
# Connect to namespace with busybox
task k8s:connect

# View logs for a service
task k8s:forecast:logs
task k8s:survey:logs
task k8s:heartbeat:logs

# Direct pod access
task k8s:direct

# Configure RabbitMQ
task k8s:nexus:configure
```

**Raw kubectl commands**:

```bash
# Get all pods in namespace
kubectl get pods --namespace guider

# View logs
kubectl logs <pod-name> --namespace guider

# Execute command in pod
kubectl exec --namespace guider <pod-name> -- <command>

# Port forward for local access
kubectl port-forward --namespace guider service/zephyr-service 5432:5432
```

---

## Observability Stack

**Components**: Promtail + Loki + Grafana

See [OBSERVABILITY.md](OBSERVABILITY.md) for complete documentation.

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   Observability Stack Architecture                           │
└─────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│                      Podman Containers                                  │
│  (All services with --label service=NAME --label environment=ENV)      │
│                                                                         │
│  ┌──────────┐  ┌─────────┐  ┌────────┐  ┌─────────┐  ┌──────────┐    │
│  │ Survey   │  │  Seed   │  │Harvest │  │Heartbeat│  │ Forecast │    │
│  │ Service  │  │ Service │  │Service │  │ Service │  │ Service  │    │
│  └────┬─────┘  └────┬────┘  └───┬────┘  └────┬────┘  └────┬─────┘    │
│       │             │            │            │            │           │
│       │ stdout/stderr (JSON formatted logs)   │            │           │
│       └─────────────┴────────────┴────────────┴────────────┘           │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   │ Podman socket
                                   │ /run/podman/podman.sock
                                   │
                      ┌────────────▼──────────────┐
                      │       Promtail            │
                      ├───────────────────────────┤
                      │ - Auto-discovers          │
                      │   containers via socket   │
                      │ - Extracts labels         │
                      │ - Parses JSON logs        │
                      │ - Extracts correlation_id │
                      │ - Adds timestamps         │
                      └────────────┬──────────────┘
                                   │
                                   │ HTTP POST
                                   │ /loki/api/v1/push
                                   │
                      ┌────────────▼──────────────┐
                      │         Loki              │
                      ├───────────────────────────┤
                      │ - Aggregates logs         │
                      │ - Indexes by labels:      │
                      │   * service               │
                      │   * environment           │
                      │   * container_name        │
                      │ - Stores log streams      │
                      │ - Exposes query API       │
                      └────────────┬──────────────┘
                                   │
                                   │ LogQL queries
                                   │ HTTP :3100/loki/api/v1/query
                                   │
                      ┌────────────▼──────────────┐
                      │        Grafana            │
                      ├───────────────────────────┤
                      │ - Visualizes logs         │
                      │ - Real-time queries       │
                      │ - Dashboard creation      │
                      │ - Alerting                │
                      │                           │
                      │ http://localhost:3000     │
                      │ admin / admin             │
                      └───────────────────────────┘
```

### Log Flow with Correlation IDs

```
Service Logs (JSON):
{
  "time": "2025-01-20T10:30:45Z",
  "level": "INFO",
  "msg": "Survey ping received",
  "correlation_id": "550e8400-e29b-41d4-a716-446655440000",
  "function": "processPing"
}
           │
           │ Promtail scrapes via Podman socket
           ▼
Promtail Processing:
- Parse JSON
- Extract fields: level, msg, time, correlation_id
- Add labels: service=survey, environment=devel
- Send to Loki
           │
           ▼
Loki Storage:
Stream: {service="survey", environment="devel"}
Entry:  {"correlation_id":"550e8400...", "msg":"Survey ping received", ...}
           │
           ▼
Grafana Query (LogQL):
{service="survey"} | json | correlation_id="550e8400-e29b-41d4-a716-446655440000"
           │
           ▼
Result: All logs across ALL services for this specific request!
```

### Configuration

**Promtail Config**: [observability/promtail-config.yml](observability/promtail-config.yml)

**Key Features**:
- Auto-discovery via `/run/podman/podman.sock`
- Label filtering: only scrapes containers with `service` label
- JSON log parsing with correlation ID extraction
- Timestamp extraction from log `time` field

**Container Labels** (required):

```bash
podman run --detach \
  --label service=survey \
  --label environment=devel \
  my-image
```

Promtail automatically discovers and scrapes logs from labeled containers.

### Management Commands

```bash
# Start observability stack
task observability:up

# Stop observability stack
task observability:down

# Check status
task observability:status

# View logs
task observability:loki:logs
task observability:grafana:logs
```

### Grafana Query Examples

**All logs from survey service**:
```logql
{service="survey"}
```

**Trace complete request by correlation ID**:
```logql
{environment="devel"} | json | correlation_id="550e8400-e29b-41d4-a716-446655440000"
```

**All errors across services**:
```logql
{environment="devel"} | json | level="ERROR"
```

**Error rate per service**:
```logql
sum by (service) (
  rate({environment="devel"} | json | level="ERROR" [5m])
)
```

### Benefits

✅ **Zero per-service configuration** - Just add container labels
✅ **Automatic discovery** - Promtail finds all containers
✅ **Correlation ID extraction** - Automatic from JSON logs
✅ **Real-time monitoring** - Logs appear immediately in Grafana
✅ **Distributed tracing** - Track requests across all services

---

## Development

### Prerequisites

- **Go 1.23+**
- **Podman** (or Docker)
- **Task** (taskfile.dev)
- **PostgreSQL 17** (for local development)
- **RabbitMQ 4.0** (for local development)

### Project Structure

```
guider/
├── cmd/                          # Command-line tools
│   ├── nexuslistener/            # RabbitMQ listener utility
│   └── updatedeploy/             # Kustomization update tool
├── db/                           # Database migrations
│   └── migrations/               # SQL migration files
├── internal/                     # Internal packages
│   ├── correlation/              # Correlation ID management
│   ├── metoc/                    # METOC API client
│   ├── nexus/                    # RabbitMQ wrapper
│   └── zephyr/                   # PostgreSQL/PostGIS client
├── manifests/                    # Kubernetes manifests
│   ├── forecast/                 # Forecast service K8s resources
│   ├── harvest/                  # Harvest service K8s resources
│   ├── heartbeat/                # Heartbeat service K8s resources
│   ├── nexus/                    # RabbitMQ K8s resources
│   ├── seed/                     # Seed service K8s resources
│   ├── survey/                   # Survey service K8s resources
│   ├── zephyr/                   # PostgreSQL K8s resources
│   └── namespace.yaml            # Namespace definition
├── observability/                # Observability stack
│   ├── promtail-config.yml       # Promtail configuration
│   ├── loki-config.yml           # Loki configuration
│   └── grafana-datasource.yml    # Grafana datasource config
├── services/                     # Microservices
│   ├── forecast/                 # Forecast API service
│   ├── harvest/                  # File download service
│   ├── heartbeat/                # Scheduler service
│   ├── seed/                     # File discovery service
│   └── survey/                   # Health check service
├── task/                         # Task definitions
│   ├── DockerTasks.yml           # Docker build tasks
│   ├── HarvestTasks.yml          # Harvest service tasks
│   ├── HeartbeatTasks.yml        # Heartbeat service tasks
│   ├── K8sTasks.yml              # Kubernetes tasks
│   ├── NexusTasks.yml            # RabbitMQ tasks
│   ├── ObservabilityTasks.yml    # Observability tasks
│   ├── SeedTasks.yml             # Seed service tasks
│   ├── SurveyTasks.yml           # Survey service tasks
│   └── ZephyrTasks.yml           # PostgreSQL tasks
├── Taskfile.yml                  # Main task definitions
├── go.mod                        # Go module definition
├── go.sum                        # Go dependency checksums
├── CORRELATION_IDS.md            # Correlation ID documentation
├── OBSERVABILITY.md              # Observability documentation
└── README.md                     # This file
```

### Local Development Workflow

**1. Start infrastructure services**:

```bash
# Start PostgreSQL
task zephyr:up

# Start RabbitMQ
task nexus:run

# Start observability stack
task observability:up
```

**2. Run migrations**:

```bash
task zephyr:migrate:up
```

**3. Build and run a service**:

```bash
# Build
task survey:build

# Run in development mode (with hot reload)
task survey:devel

# Or run in container
task survey:run
```

**4. View logs in Grafana**:

Open http://localhost:3000, navigate to Explore, query:

```logql
{service="survey", environment="devel"}
```

### Running Tests

```bash
# Run all tests
go test ./...

# Run with coverage
go test -cover ./...

# Run specific service tests
go test ./services/survey/...

# Run integration tests (requires testcontainers)
go test -tags=integration ./...
```

### Linting

```bash
# Run golangci-lint
golangci-lint run

# Or via task
task lint
```

---

## CI/CD Pipeline

### GitOps Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CI/CD Pipeline Flow                                  │
└─────────────────────────────────────────────────────────────────────────────┘

Developer Push to main
         │
         ▼
┌─────────────────────────┐
│  Azure Pipelines        │
│  (GuiderAgent Pool)     │
└────────┬────────────────┘
         │
         ├──► 1. Run Unit Tests & Linting
         │    └──► golangci-lint run
         │    └──► ginkgo tests
         │
         ├──► 2. Build Docker Image
         │    └──► docker build -t guiderregistry.azurecr.io/.../forecast:${GIT_HASH}
         │    └──► docker tag latest
         │
         ├──► 3. Push to Azure Container Registry
         │    └──► docker push guiderregistry.azurecr.io/.../forecast:${GIT_HASH}
         │    └──► docker push guiderregistry.azurecr.io/.../forecast:latest
         │
         ├──► 4. Checkout Deploy Repository
         │    └──► git clone git://GUIDER/deploy
         │
         ├──► 5. Update Kustomization
         │    └──► Download updatedeploy binary (from Pipeline 18)
         │    └──► updatedeploy -hash ${GIT_HASH} \
         │              -image "guider/forecast" \
         │              -path deploy/guider/forecast/overlays/dev/kustomization.yaml
         │
         ├──► 6. Commit to Deploy Repo
         │    └──► git add .
         │    └──► git commit -m "update: forecast build hash"
         │    └──► git push
         │
         └──► 7. ArgoCD / Flux (or manual kubectl apply)
              └──► Kubernetes pulls new image with ${GIT_HASH} tag
              └──► Rolling update deployment
              └──► Pods restart with new code

Result: New version deployed to Kubernetes cluster
```

### Pipeline Files

**Location**: [Pipelines/](Pipelines/)

| Pipeline | Purpose | Triggers |
|----------|---------|----------|
| [azure-pipelines.yml](azure-pipelines.yml) | Unit tests & linting | All branches |
| [build/forecast.yml](Pipelines/build/forecast.yml) | Build & deploy Forecast service | main, ci/*, release/* |
| [build/survey.yml](Pipelines/build/survey.yml) | Build & deploy Survey service | main, ci/*, release/* |
| [build/seed.yml](Pipelines/build/seed.yml) | Build & deploy Seed service | main, ci/*, release/* |
| [build/harvest.yml](Pipelines/build/harvest.yml) | Build & deploy Harvest service | main, ci/*, release/* |
| [build/heartbeat.yml](Pipelines/build/heartbeat.yml) | Build & deploy Heartbeat service | main, ci/*, release/* |
| [kubectl.yml](Pipelines/kubectl.yml) | Install kubectl | Manual |
| [secrets/devnet-secrets.yml](Pipelines/secrets/devnet-secrets.yml) | Deploy Kubernetes secrets | Manual |

### updatedeploy Tool

**Purpose**: Updates Kustomization files with new image tags

**Location**: [cmd/updatedeploy/](cmd/updatedeploy/)

**Usage**:

```bash
updatedeploy -hash <git-commit-hash> \
  -image "guider/forecast" \
  -path deploy-repo/overlays/dev/kustomization.yaml
```

**What it does**:
1. Parses Kustomization YAML using `sigs.k8s.io/kustomize/api`
2. Finds image with matching name (`guider/forecast`)
3. Updates `newTag` field with git commit hash
4. Writes updated YAML back to file

**Example Kustomization**:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: guider
images:
  - name: guider/forecast
    newName: guiderregistry.azurecr.io/guiderregistry/forecast
    newTag: 071f749abc123  # ← Updated by updatedeploy
resources:
  - ../../base
```

### Deployment Environments

| Environment | Kustomize Overlay | Namespace | Description |
|-------------|-------------------|-----------|-------------|
| **Development** | `overlays/dev/` | `guider-dev` | Development/testing environment |
| **Production** | `overlays/prod/` | `guider` | Production environment |

### Secret Management

**Secrets created via Azure Pipelines** ([Pipelines/secrets/devnet-secrets.yml](Pipelines/secrets/devnet-secrets.yml)):

```yaml
- task: KubernetesManifest@1
  inputs:
    action: 'createSecret'
    secretType: 'generic'
    secretName: 'zephyr-pw'
    secretArguments: |
      --from-literal=user=$(PGUSER)
      --from-literal=password=$(PGPASSWORD)
      --from-literal=db=$(PGDATABASE)
```

**Secrets stored in Azure Pipelines Secure Files**:
- TLS certificates (metoc-tls, devnet-tls)
- CA certificates (devnet-ca-cert)
- Database credentials
- RabbitMQ credentials
- Container registry credentials

---

## Quick Reference

### Service Ports

| Service | Port | Protocol | Access |
|---------|------|----------|--------|
| Forecast | 8080 | HTTP | Via Ingress |
| Zephyr | 5432 | PostgreSQL | ClusterIP + NodePort 30004 |
| Nexus | 5672 | AMQP | ClusterIP |
| Loki | 3100 | HTTP | localhost |
| Grafana | 3000 | HTTP | localhost |
| Promtail | 9080 | HTTP | localhost |

### Environment Variables

**Database** (all services):
```bash
PGHOST=zephyr-service
PGPORT=5432
PGUSER=guider
PGPASSWORD=<secret>
PGDATABASE=zephyr
```

**RabbitMQ** (Survey/Seed/Harvest/Heartbeat):
```bash
NEXUS_HOST=nexus-service
NEXUS_PORT=5672
NEXUS_USER=<secret>
NEXUS_PASSWORD=<secret>
NEXUS_VHOST=/
```

**METOC** (Survey/Seed/Harvest):
```bash
METOC_HOST=metoc.example.com
METOC_TLS_CERT=/etc/ssl/metoc/tls.crt
METOC_TLS_KEY=/etc/ssl/metoc/tls.key
```

### Common Task Commands

```bash
# Infrastructure
task zephyr:up              # Start PostgreSQL
task nexus:run              # Start RabbitMQ
task observability:up       # Start Loki + Grafana + Promtail

# Services
task forecast:build         # Build Forecast service
task survey:devel           # Run Survey in development mode
task harvest:run            # Run Harvest in container

# Database
task zephyr:migrate:up      # Run migrations
task zephyr:migrate:down    # Rollback migration

# Logs
task k8s:forecast:logs      # View Forecast logs (K8s)
task survey:logs            # View Survey logs (Podman)

# Cleanup
task observability:clean    # Remove observability containers
task zephyr:down            # Stop PostgreSQL
```

### Key Documentation Files

- [CORRELATION_IDS.md](CORRELATION_IDS.md) - Distributed tracing implementation
- [OBSERVABILITY.md](OBSERVABILITY.md) - Loki + Grafana setup
- [db/README.md](db/README.md) - Database schema and migrations

---

## Contributing

### Code Style

- Follow [Effective Go](https://go.dev/doc/effective_go)
- Run `golangci-lint run` before committing
- Use structured logging with `log/slog`
- Include correlation IDs in all logs

### Adding New Services

1. Create service directory in `services/<service-name>/`
2. Implement with correlation ID support
3. Add Dockerfile
4. Create Kubernetes manifests in `manifests/<service-name>/`
5. Add Task definitions in `task/<ServiceName>Tasks.yml`
6. Create Azure Pipeline in `Pipelines/build/<service>.yml`
7. Update this README

### Testing

- Write unit tests for all business logic
- Use [Ginkgo](https://onsi.github.io/ginkgo/) + [Gomega](https://onsi.github.io/gomega/) for BDD-style tests
- Use [testcontainers](https://golang.testcontainers.org/) for integration tests
- Aim for >80% code coverage

---

## License

Copyright © 2025 EXCET, Inc. All rights reserved.

---

## Support

For issues, questions, or contributions, contact the GUIDER development team or open an issue in the Azure DevOps repository.

**Azure DevOps**: `dev.azure.com/excet/guider/guider`

---

*Generated by Claude Code on 2025-11-22*
