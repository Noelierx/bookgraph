import { useEffect, useRef } from "react";
import { ForceGraph2D } from "react-force-graph";
import { GraphData } from "@/types/book";

interface BookGraphProps {
  data: GraphData;
  onNodeClick: (nodeId: string) => void;
  width?: number;
  height?: number;
}

export function BookGraph({ data, onNodeClick, width = 800, height = 600 }: BookGraphProps) {
  const fgRef = useRef<any>();

  useEffect(() => {
    if (fgRef.current) {
      fgRef.current.d3Force("charge").strength(-400);
      fgRef.current.d3Force("link").distance(100);
    }
  }, []);

  return (
    <div className="relative w-full h-full bg-background/50 rounded-lg overflow-hidden border border-border">
      <ForceGraph2D
        ref={fgRef}
        graphData={data}
        width={width}
        height={height}
        backgroundColor="transparent"
        nodeLabel={(node: any) => node.name}
        nodeColor={(node: any) => {
          const index = data.nodes.findIndex(n => n.id === node.id);
          return index % 2 === 0 ? "hsl(270, 80%, 65%)" : "hsl(190, 80%, 55%)";
        }}
        nodeRelSize={8}
        nodeCanvasObject={(node: any, ctx, globalScale) => {
          const label = node.name;
          const fontSize = 12 / globalScale;
          ctx.font = `${fontSize}px Inter, sans-serif`;
          
          // Draw node circle
          const nodeColor = data.nodes.findIndex(n => n.id === node.id) % 2 === 0 
            ? "hsl(270, 80%, 65%)" 
            : "hsl(190, 80%, 55%)";
          
          ctx.beginPath();
          ctx.arc(node.x, node.y, 8, 0, 2 * Math.PI);
          ctx.fillStyle = nodeColor;
          ctx.fill();
          
          // Add glow effect
          ctx.shadowBlur = 15;
          ctx.shadowColor = nodeColor;
          ctx.fill();
          ctx.shadowBlur = 0;
          
          // Draw label
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = "hsl(220, 15%, 95%)";
          ctx.fillText(label, node.x, node.y + 15);
        }}
        linkColor={(link: any) => {
          const strength = link.strength || 0.5;
          return strength > 0.7 
            ? "hsl(270, 80%, 65%)" 
            : "hsl(270, 40%, 45%)";
        }}
        linkWidth={(link: any) => {
          const strength = link.strength || 0.5;
          return Math.max(1, strength * 3);
        }}
        linkDirectionalParticles={2}
        linkDirectionalParticleWidth={(link: any) => {
          const strength = link.strength || 0.5;
          return strength * 2;
        }}
        onNodeClick={(node: any) => onNodeClick(node.id)}
        cooldownTicks={100}
        enableNodeDrag={true}
        enableZoomInteraction={true}
        enablePanInteraction={true}
      />
      
      <div className="absolute bottom-4 left-4 text-xs text-muted-foreground bg-card/80 backdrop-blur-sm px-3 py-2 rounded-md border border-border">
        Drag nodes • Scroll to zoom • Click for details
      </div>
    </div>
  );
}
