import { useEffect, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  useReactFlow,
  MarkerType,
} from 'reactflow';
import dagre from 'dagre';
import 'reactflow/dist/style.css';
import { SaveLayoutButton } from '../SaveLayoutButton';

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 200;
const nodeHeight = 100;

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  dagreGraph.setGraph({
    rankdir: 'TB',
    nodesep: 250,
    ranksep: 300,
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
    id: 'forecast',
    type: 'default',
    position: { x: 0, y: 0 },
    data: { label: '📊 Forecast\nHTTP API' },
    style: { background: '#3b82f6', color: 'white', padding: 18, borderRadius: 8, width: nodeWidth, textAlign: 'center', fontSize: 13 },
  },
  {
    id: 'heartbeat',
    type: 'default',
    position: { x: 0, y: 0 },
    data: { label: '💓 Heartbeat\nScheduler' },
    style: { background: '#10b981', color: 'white', padding: 18, borderRadius: 8, width: nodeWidth, textAlign: 'center', fontSize: 13 },
  },
  {
    id: 'survey',
    type: 'default',
    position: { x: 0, y: 0 },
    data: { label: '🔍 Survey\nMetadata' },
    style: { background: '#10b981', color: 'white', padding: 18, borderRadius: 8, width: nodeWidth, textAlign: 'center', fontSize: 13 },
  },
  {
    id: 'seed',
    type: 'default',
    position: { x: 0, y: 0 },
    data: { label: '🌱 Seed\nFile Discovery' },
    style: { background: '#10b981', color: 'white', padding: 18, borderRadius: 8, width: nodeWidth, textAlign: 'center', fontSize: 13 },
  },
  {
    id: 'harvest',
    type: 'default',
    position: { x: 0, y: 0 },
    data: { label: '🌾 Harvest\nFile Download' },
    style: { background: '#10b981', color: 'white', padding: 18, borderRadius: 8, width: nodeWidth, textAlign: 'center', fontSize: 13 },
  },
  {
    id: 'nexus',
    type: 'default',
    position: { x: 0, y: 0 },
    data: { label: '🔄 Nexus\nRabbitMQ' },
    style: { background: '#f59e0b', color: 'white', padding: 18, borderRadius: 8, width: nodeWidth, textAlign: 'center', fontSize: 13 },
  },
  {
    id: 'zephyr',
    type: 'default',
    position: { x: 0, y: 0 },
    data: { label: '🗄️ Zephyr\nPostgreSQL + PostGIS' },
    style: { background: '#8b5cf6', color: 'white', padding: 18, borderRadius: 8, width: nodeWidth, textAlign: 'center', fontSize: 13 },
  },
  {
    id: 'metoc',
    type: 'default',
    position: { x: 0, y: 0 },
    data: { label: '🌐 METOC Server\nWeather Data API' },
    style: { background: '#6b7280', color: 'white', padding: 18, borderRadius: 8, width: nodeWidth, textAlign: 'center', fontSize: 13 },
  },
];

const initialEdges = [
  // Forecast reads from Zephyr
  {
    id: 'e-forecast-zephyr',
    source: 'forecast',
    target: 'zephyr',
    animated: true,
    label: 'Read',
    type: 'smoothstep',
    style: { stroke: '#3b82f6', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
  },

  // Heartbeat to Nexus
  {
    id: 'e-heartbeat-nexus',
    source: 'heartbeat',
    target: 'nexus',
    animated: true,
    label: 'Publish every 6h',
    type: 'smoothstep',
    style: { stroke: '#10b981', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
  },

  // Nexus to Survey, Seed, and Harvest
  {
    id: 'e-nexus-survey',
    source: 'nexus',
    target: 'survey',
    animated: true,
    label: 'Consume heartbeat',
    type: 'smoothstep',
    style: { stroke: '#f59e0b', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' },
  },
  {
    id: 'e-nexus-seed',
    source: 'nexus',
    target: 'seed',
    animated: true,
    label: 'Consume heartbeat',
    type: 'smoothstep',
    style: { stroke: '#f59e0b', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' },
  },
  {
    id: 'e-nexus-harvest',
    source: 'nexus',
    target: 'harvest',
    animated: true,
    label: 'Consume file metadata',
    type: 'smoothstep',
    style: { stroke: '#f59e0b', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' },
  },

  // Survey workflow
  {
    id: 'e-survey-metoc',
    source: 'survey',
    target: 'metoc',
    label: 'Query metadata',
    type: 'smoothstep',
    style: { stroke: '#10b981', strokeDasharray: '5,5', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
  },
  {
    id: 'e-survey-zephyr',
    source: 'survey',
    target: 'zephyr',
    animated: true,
    label: 'Write metadata',
    type: 'smoothstep',
    style: { stroke: '#10b981', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
  },

  // Seed workflow
  {
    id: 'e-zephyr-seed',
    source: 'zephyr',
    target: 'seed',
    label: 'Read availability',
    type: 'smoothstep',
    style: { stroke: '#8b5cf6', strokeDasharray: '5,5', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#8b5cf6' },
  },
  {
    id: 'e-seed-metoc',
    source: 'seed',
    target: 'metoc',
    label: 'Query files',
    type: 'smoothstep',
    style: { stroke: '#10b981', strokeDasharray: '5,5', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
  },
  {
    id: 'e-seed-nexus',
    source: 'seed',
    target: 'nexus',
    animated: true,
    label: 'Publish file metadata',
    type: 'smoothstep',
    style: { stroke: '#10b981', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
  },

  // Harvest workflow
  {
    id: 'e-harvest-metoc',
    source: 'harvest',
    target: 'metoc',
    label: 'Download rasters',
    type: 'smoothstep',
    style: { stroke: '#10b981', strokeDasharray: '5,5', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
  },
  {
    id: 'e-harvest-zephyr',
    source: 'harvest',
    target: 'zephyr',
    sourceHandle: 'right',
    targetHandle: 'right',
    animated: true,
    label: 'Write rasters',
    type: 'smoothstep',
    style: { stroke: '#10b981', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
  },
];

// Helper function to load saved layout
const loadSavedLayout = async (): Promise<Record<string, { x: number; y: number }> | null> => {
  try {
    const response = await fetch('/src/layouts/systemOverview.json');
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

// Inner component that uses useReactFlow hook - must be rendered inside ReactFlow
const ViewportController = ({ shouldFitView }: { shouldFitView: boolean }) => {
  const reactFlowInstance = useReactFlow();

  useEffect(() => {
    // Function to set viewport programmatically
    (window as any).__setViewport = (viewport: { x: number; y: number; zoom: number }) => {
      reactFlowInstance.setViewport(viewport, { duration: 0 });
    };

    // Function to get current viewport
    (window as any).__getViewport = () => reactFlowInstance.getViewport();

    // Function to reset animation timeline (for synchronized tile captures)
    (window as any).__resetAnimation = () => {
      (window as any).__animationStart = performance.now();
    };

    // Initialize animation start time
    (window as any).__animationStart = performance.now();

    return () => {
      // Cleanup
      delete (window as any).__setViewport;
      delete (window as any).__getViewport;
      delete (window as any).__resetAnimation;
      delete (window as any).__animationStart;
    };
  }, [reactFlowInstance]);

  // Trigger fitView when layout is loaded
  useEffect(() => {
    if (shouldFitView) {
      // Small delay to ensure nodes are rendered
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.08, minZoom: 0.1, maxZoom: 2 });
      }, 100);
    }
  }, [shouldFitView, reactFlowInstance]);

  return null; // This component only sets up window functions
};

export const SystemOverview = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);
  const [layoutLoaded, setLayoutLoaded] = useState(false);

  useEffect(() => {
    // Load saved layout if available
    loadSavedLayout().then(savedLayout => {
      if (savedLayout) {
        // Apply saved positions to nodes
        const nodesWithSavedPositions = applySavedPositions(initialNodes, savedLayout);
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
    <div style={{ width: '100%', height: '900px', position: 'relative' }}>
      <SaveLayoutButton nodes={nodes} edges={edges} diagramName="systemOverview" />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
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
