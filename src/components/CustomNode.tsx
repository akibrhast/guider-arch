import { memo, CSSProperties } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

interface CustomNodeData {
  label: string;
  style?: CSSProperties;
}

export const CustomNode = memo(({ data }: NodeProps<CustomNodeData>) => {
  const isDevelopment = !import.meta.env.PROD;

  return (
    <div style={data.style}>
      {/* Connection handles on all 4 sides - only visible in development */}
      {isDevelopment && (
        <>
          <Handle
            type="source"
            position={Position.Top}
            id="top"
            style={{ background: '#555', opacity: 0.3 }}
          />
          <Handle
            type="source"
            position={Position.Right}
            id="right"
            style={{ background: '#555', opacity: 0.3 }}
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="bottom"
            style={{ background: '#555', opacity: 0.3 }}
          />
          <Handle
            type="source"
            position={Position.Left}
            id="left"
            style={{ background: '#555', opacity: 0.3 }}
          />
          {/* Target handles */}
          <Handle
            type="target"
            position={Position.Top}
            id="top-target"
            style={{ background: '#555', opacity: 0.3 }}
          />
          <Handle
            type="target"
            position={Position.Right}
            id="right-target"
            style={{ background: '#555', opacity: 0.3 }}
          />
          <Handle
            type="target"
            position={Position.Bottom}
            id="bottom-target"
            style={{ background: '#555', opacity: 0.3 }}
          />
          <Handle
            type="target"
            position={Position.Left}
            id="left-target"
            style={{ background: '#555', opacity: 0.3 }}
          />
        </>
      )}
      <div dangerouslySetInnerHTML={{ __html: data.label.replace(/\n/g, '<br/>') }} />
    </div>
  );
});

CustomNode.displayName = 'CustomNode';
