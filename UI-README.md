# GUIDER Architecture Visualization UI

An interactive React-based visualization of the GUIDER distributed microservices architecture, built with Vite and React Flow.

## Features

- **Interactive Architecture Diagrams**: Explore 4 different views of the GUIDER system
  - System Overview: High-level microservices architecture
  - Message Flow: Service interactions and data flow
  - Correlation ID Flow: Distributed tracing architecture
  - Kubernetes Infrastructure: Deployment architecture

- **Fully Interactive**: Zoom, pan, and explore each diagram
- **Dark/Light Mode**: Automatic theme switching based on system preferences
- **Responsive Design**: Works on desktop and tablet devices
- **Type-Safe**: Built with TypeScript for reliability

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **React Flow** - Interactive node-based diagrams
- **Lucide React** - Icon library

## Getting Started

### Prerequisites

- Node.js 18+ or compatible runtime
- Yarn package manager

### Installation

```bash
# Install dependencies
yarn install
```

### Development

```bash
# Start development server
yarn dev
```

The application will be available at `http://localhost:5173`

### Build for Production

```bash
# Build optimized production bundle
yarn build

# Preview production build locally
yarn preview
```

## Project Structure

```
src/
├── components/
│   ├── diagrams/           # Diagram components
│   │   ├── SystemOverview.tsx
│   │   ├── MessageFlow.tsx
│   │   ├── CorrelationFlow.tsx
│   │   └── KubernetesInfra.tsx
│   └── layout/             # Layout components
│       ├── Header.tsx
│       └── TabNavigation.tsx
├── types/                  # TypeScript type definitions
│   └── index.ts
├── App.tsx                 # Main application component
├── App.css                 # Application styles
├── main.tsx                # Application entry point
└── index.css               # Global styles
```

## Diagram Components

### System Overview
Visualizes the 5 core microservices and supporting infrastructure:
- Forecast API (HTTP Service) - Reads forecast data from Zephyr
- Survey Service (Metadata Population) - Queries METOC for model metadata (COAMPS), writes coverage and availability data to Zephyr
- Seed Service (File Discovery) - Reads availability data from Zephyr, queries METOC for available files, publishes file metadata to RabbitMQ
- Harvest Service (File Download) - Downloads raster files from METOC, writes them to Zephyr
- Heartbeat Service (Scheduler) - Triggers data collection every 6 hours via RabbitMQ
- Nexus (RabbitMQ message broker) - 3 queues: heartbeat.survey, heartbeat.seed, harvest.filemetadata
- Zephyr (PostgreSQL + PostGIS database) - Stores metadata and raster files
- External METOC Server - Weather data source
- Observability Stack (Promtail, Loki, Grafana)

### Message Flow
Shows the complete message flow and service interactions:
- **Forecast Path**: External API → Forecast Service → Read from Zephyr
- **Heartbeat Path**: Scheduled trigger → Heartbeat → RabbitMQ → Survey & Seed services
- **Survey Workflow**: Consumes heartbeat → Queries METOC for metadata → Writes coverage/availability to Zephyr
- **Seed Workflow**: Consumes heartbeat → Reads availability from Zephyr → Queries METOC for files → Publishes to RabbitMQ
- **Harvest Workflow**: Consumes file metadata → Downloads rasters from METOC → Writes to Zephyr

### Correlation ID Flow
Demonstrates distributed tracing implementation:
- HTTP request correlation ID propagation
- RabbitMQ envelope structure
- Context management
- Logger correlation
- End-to-end request tracking

### Kubernetes Infrastructure
Displays the Kubernetes deployment architecture:
- Nginx Ingress with mutual TLS
- Service deployments and replicas
- RabbitMQ and PostgreSQL infrastructure
- Secrets and ConfigMaps
- Storage classes and persistent volumes
- Azure Container Registry integration

## Customization

### Adding New Diagrams

1. Create a new component in `src/components/diagrams/`
2. Define nodes and edges using React Flow
3. Add the diagram to `src/types/index.ts` in the `DIAGRAM_TABS` array
4. Import and render in `src/App.tsx`

### Styling

- Global styles: `src/index.css`
- Component styles: `src/App.css`
- React Flow customization: Override React Flow CSS classes

### Color Scheme

The application uses a consistent color palette:
- **Blue (#3b82f6)**: HTTP/API services
- **Green (#10b981)**: Background services
- **Orange (#f59e0b)**: Message broker
- **Purple (#8b5cf6)**: Database
- **Gray (#6b7280)**: External services
- **Pink (#ec4899)**: Observability

## Controls

- **Mouse Drag**: Pan the diagram
- **Mouse Wheel**: Zoom in/out
- **Controls Panel**:
  - Zoom in/out buttons
  - Fit view button
  - Interactive toggle
- **MiniMap**: Overview and quick navigation

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## License

Copyright © 2025 EXCET, Inc. All rights reserved.

## Related Documentation

- [Main README](README.md) - GUIDER system documentation
- [Correlation IDs](CORRELATION_IDS.md) - Distributed tracing details
- [Observability](OBSERVABILITY.md) - Logging and monitoring

## Contributing

When adding new diagrams or features:
1. Follow the existing component structure
2. Use TypeScript for type safety
3. Maintain consistent styling with the existing design
4. Test on both dark and light modes
5. Ensure responsive behavior

## Troubleshooting

### TypeScript Errors

If you see TypeScript errors related to `reactflow`:
```bash
# Clean and reinstall dependencies
rm -rf node_modules .yarn/cache yarn.lock
yarn install
```

### Build Errors

```bash
# Clear Vite cache
rm -rf node_modules/.vite
yarn dev
```

### Port Already in Use

```bash
# Start on a different port
yarn dev --port 3001
```
