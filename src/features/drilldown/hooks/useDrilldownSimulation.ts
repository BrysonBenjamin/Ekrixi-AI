import { useEffect, useRef, useMemo, useState } from 'react';
import * as d3 from 'd3';
import {
  NexusObject,
  isLink,
  isReified,
  NexusType,
  SemanticLink,
  HierarchicalLink,
} from '../../../types';
import { VisibleNode } from '../DrilldownFeature';

export interface SimulationNode extends d3.SimulationNodeDatum {
  id: string;
  object: VisibleNode;
  x?: number;
  y?: number;
}

export interface SimulationLink extends d3.SimulationLinkDatum<SimulationNode> {
  id: string;
  source: string | number | SimulationNode;
  target: string | number | SimulationNode;
  verb: string;
  verbInverse?: string;
  isReified: boolean;
  isStructuralLine?: boolean;
  type: NexusType;
  originalSourceId?: string;
  originalTargetId?: string;
}

interface UseDrilldownSimulationProps {
  registry: Record<string, VisibleNode>;
  fullRegistry: Record<string, NexusObject>;
  focusId?: string;
}

export const useDrilldownSimulation = ({
  registry,
  fullRegistry,
  focusId,
}: UseDrilldownSimulationProps) => {
  const [nodes, setNodes] = useState<SimulationNode[]>([]);
  const [links, setLinks] = useState<SimulationLink[]>([]);

  const positionMap = useRef<Map<string, { x: number; y: number }>>(new Map());
  const simulationRef = useRef<d3.Simulation<SimulationNode, SimulationLink> | null>(null);

  const simData = useMemo(() => {
    const activeNodes: SimulationNode[] = (Object.values(registry) as VisibleNode[]).map((obj) => ({
      id: obj.id,
      object: obj,
    }));

    const activeLinks: SimulationLink[] = [];
    (Object.values(fullRegistry) as NexusObject[]).forEach((obj) => {
      if (!isLink(obj)) return;
      const link = obj as SemanticLink | HierarchicalLink;
      const sId = link.source_id;
      const tId = link.target_id;

      if (isReified(obj) && registry[obj.id] && registry[sId] && registry[tId]) {
        activeLinks.push({
          id: `${obj.id}-structural-s`,
          source: sId,
          target: obj.id,
          verb: (obj as SemanticLink).verb,
          isReified: true,
          isStructuralLine: true,
          type: obj._type as NexusType,
        });
        activeLinks.push({
          id: `${obj.id}-structural-t`,
          source: obj.id,
          target: tId,
          verb: (obj as SemanticLink).verb,
          isReified: true,
          isStructuralLine: true,
          type: obj._type as NexusType,
        });
      } else if (registry[sId] && registry[tId]) {
        activeLinks.push({
          id: obj.id,
          source: sId,
          target: tId,
          verb: (obj as SemanticLink | HierarchicalLink).verb || 'bound to',
          verbInverse: (obj as SemanticLink | HierarchicalLink).verb_inverse || 'part of',
          isReified: false,
          isStructuralLine: false,
          type: obj._type as NexusType,
          originalSourceId: sId,
          originalTargetId: tId,
        });
      }
    });

    return { nodes: activeNodes, links: activeLinks };
  }, [registry, fullRegistry]);

  useEffect(() => {
    if (!simData.nodes.length) {
      // Use queueMicrotask to avoid state updates during render if called synchronously
      queueMicrotask(() => {
        setNodes([]);
        setLinks([]);
      });
      return;
    }

    // Initialize positions from ref safely inside effect
    simData.nodes.forEach((node, idx) => {
      const prevPos = positionMap.current.get(node.id);
      if (prevPos) {
        node.x = prevPos.x;
        node.y = prevPos.y;
      } else {
        // Start closer to center to avoid "flying in" from edges
        node.x = ((idx * 50) % 200) - 100;
        node.y = ((idx * 50 * 0.7) % 200) - 100;
      }
    });

    if (simulationRef.current) simulationRef.current.stop();

    const simulation = d3
      .forceSimulation<SimulationNode>(simData.nodes)
      .force(
        'link',
        d3
          .forceLink<SimulationNode, SimulationLink>(simData.links)
          .id((d) => d.id)
          .distance((d) => (d.isStructuralLine ? 400 : 650))
          .strength((d) => (d.isStructuralLine ? 1.0 : 0.6)),
      )
      .force('charge', d3.forceManyBody().strength(-45000))
      .force('collide', d3.forceCollide().radius(400).iterations(4))
      .force(
        'radial',
        d3
          .forceRadial<SimulationNode>(
            (d) => {
              if (d.id === focusId) return 0;
              const absDepth = Math.abs(d.object.depth);
              return d.object.pathType === 'ancestor' ? absDepth * 600 : absDepth * 900;
            },
            0,
            0,
          )
          .strength(1.2),
      )
      .force(
        'centering',
        d3.forceX().strength((d) => (d.id === focusId ? 0.6 : 0.05)),
      )
      .force(
        'centering-y',
        d3.forceY().strength((d) => (d.id === focusId ? 0.6 : 0.05)),
      );

    simulation.alpha(1).alphaDecay(0.02).restart();
    simulationRef.current = simulation;

    simulation.on('tick', () => {
      simData.nodes.forEach((node) => {
        if (node.x !== undefined && node.y !== undefined) {
          positionMap.current.set(node.id, { x: node.x, y: node.y });
        }
      });
      setNodes([...simData.nodes]);
      setLinks([...simData.links]);
    });

    return () => simulation.stop();
  }, [simData, focusId]);

  return { nodes, links, simulationRef };
};
