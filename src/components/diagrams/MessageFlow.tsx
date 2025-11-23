import { useEffect, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ConnectionMode,
  MarkerType,
  Position,
} from 'reactflow';
import dagre from 'dagre';
import 'reactflow/dist/style.css';
import { SaveLayoutButton } from '../SaveLayoutButton';

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 220;
const nodeHeight = 100;

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  dagreGraph.setGraph({
    rankdir: 'TB',
    nodesep: 200,
    ranksep: 250,
    marginx: 80,
    marginy: 80,
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.position = {
      x: nodeWithPosition.x - nodeWidth / 2,
      y: nodeWithPosition.y - nodeHeight / 2,
    };
  });

  return { nodes, edges };
};

const initialNodes: Node[] = [
  // External triggers
  {
    id: 'http-client',
    position: { x: 0, y: 0 },
    data: { label: '🌐 External API Call' },
    style: { background: '#3b82f6', color: 'white', padding: 15, borderRadius: 8, width: nodeWidth, textAlign: 'center', fontSize: 13 },
  },
  {
    id: 'scheduled-heartbeat',
    position: { x: 0, y: 0 },
    data: { label: '⏰ Scheduled Heartbeat\nEvery 6h' },
    style: { background: '#ec4899', color: 'white', padding: 15, borderRadius: 8, width: nodeWidth, textAlign: 'center', fontSize: 13 },
  },

  // Forecast path
  {
    id: 'forecast',
    position: { x: 0, y: 0 },
    data: { label: '📊 Forecast Service\n(HTTP)' },
    style: { background: '#3b82f6', color: 'white', padding: 15, borderRadius: 8, width: nodeWidth, textAlign: 'center', fontSize: 13 },
  },

  // Heartbeat service
  {
    id: 'heartbeat',
    position: { x: 0, y: 0 },
    data: { label: '💓 Heartbeat Service' },
    style: { background: '#10b981', color: 'white', padding: 15, borderRadius: 8, width: nodeWidth, textAlign: 'center', fontSize: 13 },
  },

  // Database
  {
    id: 'zephyr',
    position: { x: 0, y: 0 },
    data: { label: '🗄️ Zephyr\nPostgreSQL + PostGIS\n(metadata + rasters)' },
    style: { background: '#8b5cf6', color: 'white', padding: 15, borderRadius: 8, width: nodeWidth, textAlign: 'center', fontSize: 13 },
  },

  // Message broker
  {
    id: 'rabbitmq',
    position: { x: 0, y: 0 },
    data: { label: '🔄 RabbitMQ Nexus\n(3 queues)' },
    style: { background: '#f59e0b', color: 'white', padding: 15, borderRadius: 8, width: nodeWidth, textAlign: 'center', fontSize: 13 },
  },

  // Worker services
  {
    id: 'survey',
    position: { x: 0, y: 0 },
    data: { label: '🔍 Survey Service\n(Query METOC metadata)' },
    style: { background: '#10b981', color: 'white', padding: 15, borderRadius: 8, width: nodeWidth, textAlign: 'center', fontSize: 13 },
  },
  {
    id: 'seed',
    position: { x: 0, y: 0 },
    data: { label: '🌱 Seed Service\n(Read DB + List Files)' },
    style: { background: '#10b981', color: 'white', padding: 15, borderRadius: 8, width: nodeWidth, textAlign: 'center', fontSize: 13 },
  },
  {
    id: 'harvest',
    position: { x: 0, y: 0 },
    data: { label: '🌾 Harvest Service\n(Download + Store)' },
    style: { background: '#10b981', color: 'white', padding: 15, borderRadius: 8, width: nodeWidth, textAlign: 'center', fontSize: 13 },
    sourcePosition: Position.Right,
    targetPosition: Position.Right,
  },

  // External METOC
  {
    id: 'metoc',
    position: { x: 0, y: 0 },
    data: { label: '🌐 METOC Server\n(External Weather Data)' },
    style: { background: '#6b7280', color: 'white', padding: 15, borderRadius: 8, width: nodeWidth, textAlign: 'center', fontSize: 13 },
  },
];

const initialEdges = [
  // Forecast path
  {
    id: 'e1',
    source: 'http-client',
    target: 'forecast',
    animated: true,
    type: 'smoothstep',
    style: { stroke: '#3b82f6', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
  },
  {
    id: 'e2',
    source: 'forecast',
    target: 'zephyr',
    label: 'Read forecast data',
    animated: true,
    type: 'smoothstep',
    style: { stroke: '#3b82f6', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
  },

  // Heartbeat triggers
  {
    id: 'e3',
    source: 'scheduled-heartbeat',
    target: 'heartbeat',
    label: 'Generate Correlation ID',
    animated: true,
    type: 'smoothstep',
    style: { stroke: '#ec4899', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#ec4899' },
  },
  {
    id: 'e4',
    source: 'heartbeat',
    target: 'rabbitmq',
    label: 'Publish to queues',
    animated: true,
    type: 'smoothstep',
    style: { stroke: '#10b981', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
  },

  // RabbitMQ to workers
  {
    id: 'e5',
    source: 'rabbitmq',
    target: 'survey',
    label: 'heartbeat.survey',
    animated: true,
    type: 'smoothstep',
    style: { stroke: '#f59e0b', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' },
  },
  {
    id: 'e6',
    source: 'rabbitmq',
    target: 'seed',
    label: 'heartbeat.seed',
    animated: true,
    type: 'smoothstep',
    style: { stroke: '#f59e0b', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' },
  },

  // Survey workflow
  {
    id: 'e7',
    source: 'survey',
    target: 'metoc',
    label: 'Query metadata (COAMPS)',
    type: 'smoothstep',
    style: { stroke: '#10b981', strokeDasharray: '5,5', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
  },
  {
    id: 'e8',
    source: 'survey',
    target: 'zephyr',
    label: 'Write coverage + availability',
    animated: true,
    type: 'smoothstep',
    style: { stroke: '#10b981', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
  },

  // Seed workflow
  {
    id: 'e9',
    source: 'zephyr',
    target: 'seed',
    label: 'Read availability',
    type: 'smoothstep',
    style: { stroke: '#8b5cf6', strokeDasharray: '5,5', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#8b5cf6' },
  },
  {
    id: 'e10',
    source: 'seed',
    target: 'metoc',
    label: 'Query files',
    type: 'smoothstep',
    style: { stroke: '#10b981', strokeDasharray: '5,5', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
  },
  {
    id: 'e11',
    source: 'seed',
    target: 'rabbitmq',
    label: 'Publish file metadata',
    animated: true,
    type: 'smoothstep',
    style: { stroke: '#10b981', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
  },

  // Harvest workflow
  {
    id: 'e12',
    source: 'rabbitmq',
    target: 'harvest',
    label: 'harvest.filemetadata',
    animated: true,
    type: 'smoothstep',
    style: { stroke: '#f59e0b', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' },
  },
  {
    id: 'e13',
    source: 'harvest',
    target: 'metoc',
    label: 'Download rasters',
    type: 'smoothstep',
    style: { stroke: '#10b981', strokeDasharray: '5,5', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
  },
  {
    id: 'e14',
    source: 'harvest',
    target: 'zephyr',
    label: 'Write rasters',
    animated: true,
    type: 'smoothstep',
    style: { stroke: '#10b981', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
  },
];

// Helper function to load saved layout
const loadSavedLayout = async (): Promise<Record<string, { x: number; y: number }> | null> => {
  try {
    const response = await fetch('/layouts/messageFlow.json');
    if (!response.ok) return null;
    const savedLayout = await response.json();

    // Handle new format (with nodes/edges) - just extract nodes
    if (savedLayout.nodes) {
      const positionMap: Record<string, { x: number; y: number }> = {};
      savedLayout.nodes.forEach((item: { id: string; position: { x: number; y: number } }) => {
        positionMap[item.id] = item.position;
      });
      return positionMap;
    }

    // Handle old format (array of nodes only)
    const positionMap: Record<string, { x: number; y: number }> = {};
    savedLayout.forEach((item: { id: string; position: { x: number; y: number } }) => {
      positionMap[item.id] = item.position;
    });
    return positionMap;
  } catch (error) {
    // File doesn't exist or can't be loaded, use dagre layout
    return null;
  }
};

// Helper function to apply saved positions to nodes
const applySavedPositions = (
  nodes: Node[],
  savedPositions: Record<string, { x: number; y: number }>
): Node[] => {
  return nodes.map(node => {
    if (savedPositions[node.id]) {
      return {
        ...node,
        position: savedPositions[node.id],
      };
    }
    return node;
  });
};

const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
  initialNodes,
  initialEdges
);

// ViewportController to trigger fitView after layout loads
const ViewportController = ({ shouldFitView }: { shouldFitView: boolean }) => {
  const reactFlowInstance = useReactFlow();

  useEffect(() => {
    if (shouldFitView) {
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.08, minZoom: 0.1, maxZoom: 2 });
      }, 100);
    }
  }, [shouldFitView, reactFlowInstance]);

  return null;
};

export const MessageFlow = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);
  const [layoutLoaded, setLayoutLoaded] = useState(false);

  useEffect(() => {
    // Load saved layout if available
    loadSavedLayout().then(savedPositions => {
      if (savedPositions) {
        // Apply saved positions to nodes
        const nodesWithSavedPositions = applySavedPositions(initialNodes, savedPositions);
        setNodes(nodesWithSavedPositions);
        setEdges(initialEdges);
      } else {
        // Use dagre auto-layout
        const { nodes: newNodes, edges: newEdges } = getLayoutedElements(
          initialNodes,
          initialEdges
        );
        setNodes(newNodes);
        setEdges(newEdges);
      }
      setLayoutLoaded(true);
    });
  }, [setNodes, setEdges]);

  return (
    <div style={{ width: '100%', height: '1000px', position: 'relative' }}>
      <SaveLayoutButton nodes={nodes} edges={edges} diagramName="messageFlow" />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        connectionMode={ConnectionMode.Loose}
        defaultEdgeOptions={{
          type: 'smoothstep',
        }}
        minZoom={0.1}
        maxZoom={2}
      >
        <ViewportController shouldFitView={layoutLoaded} />
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
};
