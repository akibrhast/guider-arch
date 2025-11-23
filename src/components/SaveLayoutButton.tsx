import { Node, Edge } from 'reactflow';

interface SaveLayoutButtonProps {
  nodes: Node[];
  edges: Edge[];
  diagramName: string;
}

export const SaveLayoutButton = ({ nodes, edges, diagramName }: SaveLayoutButtonProps) => {
  // Only show in development mode
  if (import.meta.env.PROD) {
    return null;
  }

  const handleSaveLayout = () => {
    // Extract node positions and IDs
    const nodeLayout = nodes.map(node => ({
      id: node.id,
      position: node.position,
    }));

    // Extract edge routing data (source/target handles and control points)
    const edgeLayout = edges.map(edge => ({
      id: edge.id,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      // Store any custom routing data if present
      ...(edge.data && { data: edge.data }),
    }));

    const layout = {
      nodes: nodeLayout,
      edges: edgeLayout,
    };

    // Create JSON string with proper formatting
    const jsonStr = JSON.stringify(layout, null, 2);

    // Create download link
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${diagramName}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Also log to console for manual copy-paste
    console.log(`Layout for ${diagramName}:`, jsonStr);
    console.log(`Save this to: src/layouts/${diagramName}.json`);
  };

  return (
    <button
      onClick={handleSaveLayout}
      style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        zIndex: 10,
        padding: '8px 16px',
        background: '#3b82f6',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.background = '#2563eb';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.background = '#3b82f6';
      }}
    >
      💾 Save Layout
    </button>
  );
};
