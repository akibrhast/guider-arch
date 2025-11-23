import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';

const initialNodes: Node[] = [
  {
    id: 'http-request',
    position: { x: 50, y: 50 },
    data: { label: '📨 HTTP Request\nX-Correlation-ID: abc123' },
    style: { background: '#3b82f6', color: 'white', padding: 15, borderRadius: 8, width: 200, textAlign: 'center' },
  },
  {
    id: 'rabbitmq-msg',
    position: { x: 550, y: 50 },
    data: { label: '📬 RabbitMQ Message Flow' },
    style: { background: '#f59e0b', color: 'white', padding: 15, borderRadius: 8, width: 220, textAlign: 'center' },
  },
  {
    id: 'middleware',
    position: { x: 50, y: 180 },
    data: { label: '🔧 Forecast Middleware\n• Extract Header\n• OR Generate\n• Add to Context\n• Add to Response' },
    style: { background: '#3b82f6', color: 'white', padding: 15, borderRadius: 8, width: 200, textAlign: 'center', fontSize: 12 },
  },
  {
    id: 'heartbeat-service',
    position: { x: 550, y: 180 },
    data: { label: '💓 Heartbeat Service\ncorrelation.Generate()' },
    style: { background: '#10b981', color: 'white', padding: 15, borderRadius: 8, width: 220, textAlign: 'center' },
  },
  {
    id: 'envelope',
    position: { x: 550, y: 310 },
    data: { label: '📦 Envelope[T]\n{\n  correlation_id: "abc123"\n  timestamp\n  payload: T\n}' },
    style: { background: '#f59e0b', color: 'white', padding: 15, borderRadius: 8, width: 220, textAlign: 'center', fontSize: 12, fontFamily: 'monospace' },
  },
  {
    id: 'context',
    position: { x: 50, y: 340 },
    data: { label: '🔗 Context with ID\nctx = correlation.WithID(ctx, id)' },
    style: { background: '#8b5cf6', color: 'white', padding: 15, borderRadius: 8, width: 200, textAlign: 'center', fontSize: 12 },
  },
  {
    id: 'nexus',
    position: { x: 550, y: 450 },
    data: { label: '🔄 RabbitMQ Nexus\nJSON Message' },
    style: { background: '#f59e0b', color: 'white', padding: 15, borderRadius: 8, width: 220, textAlign: 'center' },
  },
  {
    id: 'handler',
    position: { x: 50, y: 490 },
    data: { label: '⚙️ Handler\nlogger, id := correlation.Logger(ctx)\nAll logs include correlation_id' },
    style: { background: '#3b82f6', color: 'white', padding: 15, borderRadius: 8, width: 200, textAlign: 'center', fontSize: 11 },
  },
  {
    id: 'consumer',
    position: { x: 550, y: 590 },
    data: { label: '📥 Consumer\n• Unwrap Envelope\n• Extract correlation_id\n• Create logger with ID' },
    style: { background: '#10b981', color: 'white', padding: 15, borderRadius: 8, width: 220, textAlign: 'center', fontSize: 12 },
  },
  {
    id: 'logs',
    position: { x: 300, y: 730 },
    data: { label: '📊 All Logs Include correlation_id\nQueryable in Grafana!' },
    style: { background: '#ec4899', color: 'white', padding: 20, borderRadius: 8, width: 270, textAlign: 'center', fontWeight: 'bold' },
  },
];

const initialEdges: Edge[] = [
  {
    id: 'e1',
    source: 'http-request',
    target: 'middleware',
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed },
  },
  {
    id: 'e2',
    source: 'middleware',
    target: 'context',
    label: 'ctx = correlation.WithID(ctx, id)',
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed },
  },
  {
    id: 'e3',
    source: 'context',
    target: 'handler',
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed },
  },
  {
    id: 'e4',
    source: 'handler',
    target: 'logs',
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed },
    label: 'Log with ID',
  },
  {
    id: 'e5',
    source: 'rabbitmq-msg',
    target: 'heartbeat-service',
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed },
  },
  {
    id: 'e6',
    source: 'heartbeat-service',
    target: 'envelope',
    label: 'correlation.Generate()',
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed },
  },
  {
    id: 'e7',
    source: 'envelope',
    target: 'nexus',
    label: 'JSON',
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed },
  },
  {
    id: 'e8',
    source: 'nexus',
    target: 'consumer',
    label: 'Consume',
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed },
  },
  {
    id: 'e9',
    source: 'consumer',
    target: 'logs',
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed },
    label: 'Log with ID',
  },
];

export const CorrelationFlow = () => {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  return (
    <div style={{ width: '100%', height: '850px' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        attributionPosition="bottom-left"
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
};
