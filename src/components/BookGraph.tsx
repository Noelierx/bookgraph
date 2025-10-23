import { useEffect, useRef, useState, useLayoutEffect, useMemo } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { GraphData, RelationshipType } from "@/types/book";

interface BookGraphProps {
  data: GraphData;
  onNodeClick: (nodeId: string) => void;
  width?: number;
  height?: number;
}

// Color mapping for different relationship types
const RELATIONSHIP_COLORS = {
  "similar-themes": "hsl(270, 80%, 65%)",      // Purple
  "similar-plots": "hsl(30, 90%, 60%)",        // Orange
  "similar-concepts": "hsl(190, 80%, 55%)",    // Cyan
  "common-subjects": "hsl(140, 70%, 50%)",     // Green
  "mixed": "hsl(220, 70%, 60%)",               // Blue
};

const RELATIONSHIP_LABELS = {
  "similar-themes": "Similar Themes",
  "similar-plots": "Similar Plots",
  "similar-concepts": "Similar Concepts",
  "common-subjects": "Common Subjects",
  "mixed": "Mixed Relationships",
};

export function BookGraph({ data, onNodeClick, width, height }: BookGraphProps) {
  const fgRef = useRef<any>();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({
    w: width ?? 800,
    h: height ?? 600,
  });
  
  // State to track which relationship types are visible (all enabled by default)
  const [visibleTypes, setVisibleTypes] = useState<Set<RelationshipType>>(
    new Set(["similar-themes", "similar-plots", "similar-concepts", "common-subjects", "mixed"])
  );
  
  // Toggle a relationship type visibility
  const toggleType = (type: RelationshipType) => {
    setVisibleTypes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(type)) {
        newSet.delete(type);
      } else {
        newSet.add(type);
      }
      return newSet;
    });
  };
  
  // Filter the graph data based on visible types
  const filteredData = useMemo(() => {
    return {
      nodes: data.nodes,
      links: data.links.filter((link) => {
        const type = link.type || "mixed";
        return visibleTypes.has(type);
      }),
    };
  }, [data, visibleTypes]);

  // update forces when graphRef is ready or data changes
  useEffect(() => {
    if (fgRef.current) {
      fgRef.current.d3Force("charge").strength(-400);
      fgRef.current.d3Force("link").distance(100);
      
      // Add collision force to prevent nodes from overlapping
      const collisionForce = fgRef.current.d3Force("collide");
      if (collisionForce) {
        collisionForce.radius(20).strength(0.8);
      }
    }
  }, [filteredData]);

  // measure container and keep ForceGraph sized to fill it
  useLayoutEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      setSize({
        w: width ?? Math.max(300, Math.floor(rect.width)),
        h: height ?? Math.max(300, Math.floor(rect.height)),
      });
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [width, height]);

  return (
    <div
      ref={wrapperRef}
      className="relative w-full h-full min-h-[400px] bg-background/50 rounded-lg overflow-hidden border border-border"
      style={{ touchAction: "manipulation" }} // améliorer l'interaction mobile
    >
      <ForceGraph2D
        ref={fgRef}
        graphData={filteredData}
        width={size.w}
        height={size.h}
        backgroundColor="transparent"
        nodeLabel={(node: any) => node.name}
        nodeColor={(node: any) => {
          const index = data.nodes.findIndex(n => n.id === node.id);
          return index % 2 === 0 ? "hsl(270, 80%, 65%)" : "hsl(190, 80%, 55%)";
        }}
        nodeRelSize={8}
        // Custom drawing for nodes — use save/restore and keep pointer hit area in sync
        nodeCanvasObject={(node: any, ctx, globalScale) => {
          const label = node.name;
          const fontSize = 12 / globalScale;
          const radius = 8;
          const nodeColor = data.nodes.findIndex(n => n.id === node.id) % 2 === 0
            ? "hsl(270, 80%, 65%)"
            : "hsl(190, 80%, 55%)";

          ctx.save();
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
          ctx.fillStyle = nodeColor;
          // glow
          ctx.shadowBlur = 15;
          ctx.shadowColor = nodeColor;
          ctx.fill();
          ctx.shadowBlur = 0;

          // label
          ctx.font = `${fontSize}px Inter, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = "hsl(220, 15%, 95%)";
          ctx.fillText(label, node.x, node.y + 15);
          ctx.restore();
        }}
        // Ensure pointer events align with our custom canvas drawing:
        nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
          const radius = 8;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
          ctx.fill();
        }}
        // change cursor on hover for discoverability
        onNodeHover={(node: any | null) => {
          if (node) document.body.style.cursor = "pointer";
          else document.body.style.cursor = "default";
        }}
        linkColor={(link: any) => {
          const type = link.type as RelationshipType | undefined;
          return type ? RELATIONSHIP_COLORS[type] : RELATIONSHIP_COLORS["mixed"];
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
      
      <div className="absolute top-4 right-4 bg-card/90 backdrop-blur-sm px-3 py-2 rounded-md border border-border shadow-lg">
        <div className="text-xs font-semibold mb-2 text-foreground">Relationship Types</div>
        <div className="text-[10px] text-muted-foreground/70 mb-2">Click to filter</div>
        <div className="space-y-1">
          {Object.entries(RELATIONSHIP_LABELS).map(([type, label]) => {
            const isVisible = visibleTypes.has(type as RelationshipType);
            return (
              <div 
                key={type} 
                className="flex items-center gap-2 text-xs cursor-pointer hover:bg-accent/50 rounded px-1 py-0.5 transition-colors"
                onClick={() => toggleType(type as RelationshipType)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleType(type as RelationshipType);
                  }
                }}
                aria-label={`${isVisible ? 'Hide' : 'Show'} ${label}`}
                aria-pressed={isVisible}
              >
                <div 
                  className="w-3 h-0.5 rounded-full transition-opacity" 
                  style={{ 
                    backgroundColor: RELATIONSHIP_COLORS[type as RelationshipType],
                    opacity: isVisible ? 1 : 0.3 
                  }}
                />
                <span 
                  className="transition-opacity"
                  style={{ 
                    opacity: isVisible ? 1 : 0.5,
                    textDecoration: isVisible ? 'none' : 'line-through'
                  }}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
