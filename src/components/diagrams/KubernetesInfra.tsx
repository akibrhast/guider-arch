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
} from 'reactflow';
import dagre from 'dagre';
import 'reactflow/dist/style.css';
import { SaveLayoutButton } from '../SaveLayoutButton';

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 240;
const nodeHeight = 120;

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  dagreGraph.setGraph({
    rankdir: 'TB',
    nodesep: 180,
    ranksep: 220,
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
  {
    id: 'ingress',
    position: { x: 0, y: 0 },
    data: { label: '🌐 Nginx Ingress\nMutual TLS\ncdvn-guider-02.precisedevnet.com' },
    style: { background: '#3b82f6', color: 'white', padding: 15, borderRadius: 8, width: nodeWidth, textAlign: 'center', fontSize: 12 },
  },
  {
    id: 'forecast-deploy',
    position: { x: 0, y: 0 },
    data: { label: '📊 Forecast\nDeployment\nReplicas: 1\nPort: 8080' },
    style: { background: '#10b981', color: 'white', padding: 12, borderRadius: 8, width: nodeWidth, textAlign: 'center', fontSize: 11 },
  },
  {
    id: 'survey-deploy',
    position: { x: 0, y: 0 },
    data: { label: '🔍 Survey\nDeployment\nReplicas: 1' },
    style: { background: '#10b981', color: 'white', padding: 12, borderRadius: 8, width: nodeWidth, textAlign: 'center', fontSize: 11 },
  },
  {
    id: 'seed-deploy',
    position: { x: 0, y: 0 },
    data: { label: '🌱 Seed\nDeployment\nReplicas: 1' },
    style: { background: '#10b981', color: 'white', padding: 12, borderRadius: 8, width: nodeWidth, textAlign: 'center', fontSize: 11 },
  },
  {
    id: 'harvest-deploy',
    position: { x: 0, y: 0 },
    data: { label: '🌾 Harvest\nDeployment\nReplicas: 1' },
    style: { background: '#10b981', color: 'white', padding: 12, borderRadius: 8, width: nodeWidth, textAlign: 'center', fontSize: 11 },
  },
  {
    id: 'heartbeat-deploy',
    position: { x: 0, y: 0 },
    data: { label: '💓 Heartbeat\nDeployment\nReplicas: 1' },
    style: { background: '#10b981', color: 'white', padding: 12, borderRadius: 8, width: nodeWidth, textAlign: 'center', fontSize: 11 },
  },
  {
    id: 'nexus',
    position: { x: 0, y: 0 },
    data: { label: '🔄 Nexus (RabbitMQ 4.0)\nDeployment\nPort: 5672 (AMQP)\nClusterIP Service\nSecret: nexus-pw' },
    style: { background: '#f59e0b', color: 'white', padding: 12, borderRadius: 8, width: nodeWidth, textAlign: 'center', fontSize: 11 },
  },
  {
    id: 'zephyr',
    position: { x: 0, y: 0 },
    data: { label: '🗄️ Zephyr\nPostgreSQL 17 + PostGIS 3.5\nPort: 5432 | PVC: 200Gi\nNodePort: 30004\nMigration Job' },
    style: { background: '#8b5cf6', color: 'white', padding: 12, borderRadius: 8, width: nodeWidth, textAlign: 'center', fontSize: 11 },
  },
  {
    id: 'secrets',
    position: { x: 0, y: 0 },
    data: { label: '🔐 Secrets\nguiderregcreds (ACR)\nmetoc-tls | devnet-tls\ndevnet-ca-cert' },
    style: { background: '#ef4444', color: 'white', padding: 12, borderRadius: 8, width: nodeWidth, textAlign: 'center', fontSize: 11 },
  },
  {
    id: 'storage',
    position: { x: 0, y: 0 },
    data: { label: '💾 Storage Class\nceph-rbd\nCeph RBD Backend' },
    style: { background: '#6b7280', color: 'white', padding: 12, borderRadius: 8, width: nodeWidth, textAlign: 'center', fontSize: 11 },
  },
  {
    id: 'registry',
    position: { x: 0, y: 0 },
    data: { label: '📦 Azure Container Registry\nguiderregistry.azurecr.io' },
    style: { background: '#0ea5e9', color: 'white', padding: 12, borderRadius: 8, width: nodeWidth, textAlign: 'center', fontSize: 11 },
  },
];

const initialEdges = [
  // Ingress to Forecast
  {
    id: 'e1',
    source: 'ingress',
    target: 'forecast-deploy',
    label: 'HTTPS',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#3b82f6', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
  },
  // Forecast to Zephyr
  {
    id: 'e2',
    source: 'forecast-deploy',
    target: 'zephyr',
    label: 'Query DB',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#10b981', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
  },
  // Services to Nexus
  {
    id: 'e3',
    source: 'survey-deploy',
    target: 'nexus',
    label: 'AMQP',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#10b981', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
  },
  {
    id: 'e4',
    source: 'seed-deploy',
    target: 'nexus',
    label: 'AMQP',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#10b981', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
  },
  {
    id: 'e5',
    source: 'harvest-deploy',
    target: 'nexus',
    label: 'AMQP',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#10b981', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
  },
  {
    id: 'e6',
    source: 'heartbeat-deploy',
    target: 'nexus',
    label: 'Publish',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#10b981', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
  },
  // Services to Zephyr
  {
    id: 'e7',
    source: 'survey-deploy',
    target: 'zephyr',
    label: 'Write metadata',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#10b981', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
  },
  {
    id: 'e8',
    source: 'seed-deploy',
    target: 'zephyr',
    label: 'Read DB',
    type: 'smoothstep',
    style: { stroke: '#10b981', strokeDasharray: '5,5', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
  },
  {
    id: 'e9',
    source: 'harvest-deploy',
    target: 'zephyr',
    label: 'Store rasters',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#10b981', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
  },
  // Zephyr to Storage
  {
    id: 'e10',
    source: 'zephyr',
    target: 'storage',
    label: 'PVC',
    type: 'smoothstep',
    style: { stroke: '#8b5cf6', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#8b5cf6' },
  },
  // Registry to Deployments
  {
    id: 'e11',
    source: 'registry',
    target: 'forecast-deploy',
    label: 'Pull Images',
    type: 'smoothstep',
    style: { stroke: '#0ea5e9', strokeDasharray: '5,5', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#0ea5e9' },
  },
  {
    id: 'e12',
    source: 'registry',
    target: 'survey-deploy',
    label: 'Pull Images',
    type: 'smoothstep',
    style: { stroke: '#0ea5e9', strokeDasharray: '5,5', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#0ea5e9' },
  },
  {
    id: 'e13',
    source: 'registry',
    target: 'seed-deploy',
    label: 'Pull Images',
    type: 'smoothstep',
    style: { stroke: '#0ea5e9', strokeDasharray: '5,5', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#0ea5e9' },
  },
  {
    id: 'e14',
    source: 'registry',
    target: 'harvest-deploy',
    label: 'Pull Images',
    type: 'smoothstep',
    style: { stroke: '#0ea5e9', strokeDasharray: '5,5', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#0ea5e9' },
  },
  {
    id: 'e15',
    source: 'registry',
    target: 'heartbeat-deploy',
    label: 'Pull Images',
    type: 'smoothstep',
    style: { stroke: '#0ea5e9', strokeDasharray: '5,5', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#0ea5e9' },
  },
  // Secrets to Services
  {
    id: 'e16',
    source: 'secrets',
    target: 'forecast-deploy',
    label: 'TLS Certs',
    type: 'smoothstep',
    style: { stroke: '#ef4444', strokeDasharray: '5,5', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' },
  },
  {
    id: 'e17',
    source: 'secrets',
    target: 'survey-deploy',
    label: 'TLS Certs',
    type: 'smoothstep',
    style: { stroke: '#ef4444', strokeDasharray: '5,5', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' },
  },
  {
    id: 'e18',
    source: 'secrets',
    target: 'seed-deploy',
    label: 'TLS Certs',
    type: 'smoothstep',
    style: { stroke: '#ef4444', strokeDasharray: '5,5', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' },
  },
  {
    id: 'e19',
    source: 'secrets',
    target: 'harvest-deploy',
    label: 'TLS Certs',
    type: 'smoothstep',
    style: { stroke: '#ef4444', strokeDasharray: '5,5', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' },
  },
];

// Helper function to load saved layout
const loadSavedLayout = async (): Promise<Record<string, { x: number; y: number }> | null> => {
  try {
    const response = await fetch('/src/layouts/kubernetesInfra.json');
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

export const KubernetesInfra = () => {
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
    <div style={{ width: '100%', height: '1100px', position: 'relative' }}>
      <SaveLayoutButton nodes={nodes} edges={edges} diagramName="kubernetesInfra" />
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
