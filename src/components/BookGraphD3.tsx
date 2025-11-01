import { useEffect, useRef, useState, useLayoutEffect, useMemo, useCallback } from "react";
import { GraphData, RelationshipType } from "@/types/book";
import * as d3 from "d3";

interface BookGraphProps {
  data: GraphData;
  onNodeClick: (nodeId: string) => void;
  onVisibleTypesChange?: (visibleTypes: Set<RelationshipType>) => void;
  width?: number;
  height?: number;
}

interface Node extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  group: number;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string | Node;
  target: string | Node;
  strength: number;
  type: RelationshipType;
  reason: string;
}

const RELATIONSHIP_COLORS = {
  "similar-themes": "#8b5cf6",
  "similar-plots": "#f97316",
  "similar-concepts": "#06b6d4",
  "common-subjects": "#10b981",
};

const RELATIONSHIP_LABELS = {
  "similar-themes": "Similar Themes",
  "similar-plots": "Similar Plots",
  "similar-concepts": "Similar Concepts",
  "common-subjects": "Common Subjects",
};

export function BookGraphD3({ data, onNodeClick, onVisibleTypesChange, width, height }: BookGraphProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  
  const [size, setSize] = useState<{ w: number; h: number }>({
    w: width ?? 800,
    h: height ?? 600,
  });
  
  const [visibleTypes, setVisibleTypes] = useState<Set<RelationshipType>>(
    new Set(["similar-themes", "similar-plots", "similar-concepts", "common-subjects"])
  );

  const { nodes, links } = useMemo(() => {
    const nodes: Node[] = data.nodes.map((node, index) => ({
      id: node.id,
      name: node.name.length > 20 ? node.name.substring(0, 20) + "..." : node.name,
      group: index % 5,
    }));

    const links: Link[] = data.links
      .filter((link) => visibleTypes.has(link.type || "similar-concepts"))
      .map((link) => ({
        source: link.source,
        target: link.target,
        strength: link.strength || 0.5,
        type: link.type || "similar-concepts",
        reason: link.reason || "",
      }));

    return { nodes, links };
  }, [data, visibleTypes]);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const { w, h } = size;

    const simulation = d3.forceSimulation<Node>(nodes)
      .force("link", d3.forceLink<Node, Link>(links).id(d => d.id).distance(150))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(w / 2, h / 2))
      .force("collision", d3.forceCollide().radius(40))
      .alpha(0.3)
      .alphaDecay(0.1);

    const container = svg.append("g");

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 2])
      .on("zoom", (event) => {
        container.attr("transform", event.transform);
      });

    svg.call(zoom);

    const link = container.append("g")
      .selectAll("line")
      .data(links)
      .enter().append("line")
      .attr("stroke", d => RELATIONSHIP_COLORS[d.type])
      .attr("stroke-opacity", 0.4)
      .attr("stroke-width", 1);

    const node = container.append("g")
      .selectAll("g")
      .data(nodes)
      .enter().append("g");

    node.append("circle")
      .attr("r", 8)
      .attr("fill", "#6366f1")
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        event.stopPropagation();
        onNodeClick(d.id);
      })
      .on("mouseenter", (event, d) => {
        d3.select(event.currentTarget).attr("r", 10);
        
        if (tooltipRef.current) {
          const book = data.nodes.find(n => n.id === d.id)?.book;
          if (book) {
            tooltipRef.current.style.display = 'block';
            tooltipRef.current.innerHTML = book.title;
          }
        }
      })
      .on("mouseleave", (event, d) => {
        d3.select(event.currentTarget).attr("r", 8);
        
        if (tooltipRef.current) {
          tooltipRef.current.style.display = 'none';
        }
      });

    node.append("text")
      .attr("dy", 20)
      .attr("text-anchor", "middle")
      .style("font-size", "10px")
      .style("font-weight", "bold")
      .style("fill", "#e2e8f0")
      .style("pointer-events", "none")
      .text(d => d.name.substring(0, 15));

    const drag = d3.drag<SVGGElement, Node>()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.1).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    node.call(drag);

    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as Node).x!)
        .attr("y1", d => (d.source as Node).y!)
        .attr("x2", d => (d.target as Node).x!)
        .attr("y2", d => (d.target as Node).y!);

      node.attr("transform", d => `translate(${d.x},${d.y})`);
    });

    setTimeout(() => {
      simulation.stop();
    }, 3000);

    return () => {
      simulation.stop();
    };

  }, [nodes, links, size, onNodeClick, data.nodes]);

  const toggleType = (type: RelationshipType) => {
    setVisibleTypes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(type)) {
        newSet.delete(type);
      } else {
        newSet.add(type);
      }
      onVisibleTypesChange?.(newSet);
      return newSet;
    });
  };

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
      className="relative w-full h-full min-h-[400px] rounded-lg overflow-hidden border border-border"
    >
      <svg
        ref={svgRef}
        width={size.w}
        height={size.h}
        className="w-full h-full"
      />
      
      <div
        ref={tooltipRef}
        className="absolute z-10 bg-black/80 text-white px-2 py-1 rounded text-xs pointer-events-none"
        style={{ display: 'none' }}
      />
      
      <div className="absolute bottom-4 left-4 text-xs text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded">
        Drag nodes • Scroll to zoom • Click for details • {data.nodes.length} books • {links.length} connections
      </div>
      
      <div className="absolute top-4 right-4 bg-slate-800/90 px-3 py-3 rounded-lg text-xs border border-slate-700 backdrop-blur-sm">
        <div className="text-slate-200 font-semibold mb-2 text-sm">Connection Types</div>
        <div className="space-y-2">
          {Object.entries(RELATIONSHIP_LABELS).map(([type, label]) => {
            const isVisible = visibleTypes.has(type as RelationshipType);
            const connectionCount = links.filter(link => link.type === type).length;
            return (
              <div 
                key={type} 
                className="flex items-center justify-between gap-2 cursor-pointer hover:bg-slate-700/50 rounded px-2 py-1 transition-colors"
                onClick={() => toggleType(type as RelationshipType)}
              >
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full border border-slate-600" 
                    style={{ 
                      backgroundColor: RELATIONSHIP_COLORS[type as RelationshipType],
                      opacity: isVisible ? 1 : 0.3 
                    }}
                  />
                  <span 
                    className="text-slate-300 text-xs"
                    style={{ 
                      opacity: isVisible ? 1 : 0.5
                    }}
                  >
                    {label}
                  </span>
                </div>
                <span className="text-slate-400 text-xs font-mono">
                  {connectionCount}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
