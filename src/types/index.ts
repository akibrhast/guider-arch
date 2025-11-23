export interface DiagramTab {
  id: string;
  name: string;
  description: string;
}

export const DIAGRAM_TABS: DiagramTab[] = [
  {
    id: 'overview',
    name: 'System Overview',
    description: 'GUIDER distributed microservices architecture',
  },
  {
    id: 'message-flow',
    name: 'Message Flow',
    description: 'Service interactions and data flow',
  },
  {
    id: 'correlation',
    name: 'Correlation ID Flow',
    description: 'Distributed tracing architecture',
  },
  {
    id: 'kubernetes',
    name: 'Kubernetes Infrastructure',
    description: 'Deployment architecture',
  },
];
