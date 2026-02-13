import { useEffect, useRef, useMemo, useState } from 'react';
import * as d3 from 'd3';
import {
  NexusObject,
  isLink,
  isReified,
  NexusType,
  TraitLink,
  SimpleNote,
  AggregatedSemanticLink,
  AggregatedHierarchicalLink,
} from '../../../types';
import { VisibleNode } from './useDrilldownRegistry';
import { TimeDimensionService } from '../../../core/services/TimeDimensionService';
import { LinkTier } from '../../../core/types/enums';

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
  isTemporalActive?: boolean;
}

interface UseDrilldownSimulationProps {
  registry: Record<string, VisibleNode>;
  fullRegistry: Record<string, NexusObject>;
  focusId?: string;
  simulatedDate?: { year: number; month: number; day: number };
}

export const useDrilldownSimulation = ({
  registry,
  fullRegistry,
  focusId,
  simulatedDate,
}: UseDrilldownSimulationProps) => {
  const [nodes, setNodes] = useState<SimulationNode[]>([]);
  const [links, setLinks] = useState<SimulationLink[]>([]);

  const positionMap = useRef<Map<string, { x: number; y: number }>>(new Map());
  const simulationRef = useRef<d3.Simulation<SimulationNode, SimulationLink> | null>(null);
  const prevNodesRef = useRef<SimulationNode[] | null>(null);

  const simData = useMemo(() => {
    const activeNodes: SimulationNode[] = (Object.values(registry) as VisibleNode[])
      .filter((obj) => (obj as any).category_id !== 'STATE') // HIDE STATE NODES
      .map((obj) => ({
        id: obj.id,
        object: obj,
      }));

    const activeLinks: SimulationLink[] = [];

    // Helper to check if a link is temporally active
    const checkTemporalStatus = (link: any, date?: { year: number }) => {
      if (!date) return true; // No date simulation = always active
      const linkYear =
        link.temporal_bounds?.effective_date?.year || link.time_data?.year || -Infinity;
      const linkEndYear = link.temporal_bounds?.valid_until?.year || Infinity;
      return linkYear <= date.year && date.year <= linkEndYear;
    };

    // Inject Bubbled Links (State Node -> Parent Logic)
    // This allows a link to "France (1800)" to appear as a link to "France" in the main view.
    // We convert the SimulationNode[] back to SimpleNote[] for the service
    const activeSimpleNotes = (Object.values(registry) as VisibleNode[]).map(
      (n) => n as unknown as SimpleNote,
    );
    const bubbledLinks = TimeDimensionService.getBubbledLinks(fullRegistry, activeSimpleNotes);

    bubbledLinks.forEach((bLink, idx) => {
      // Avoid duplicates if a real link already exists
      const exists = activeLinks.some(
        (l) =>
          (l.source === bLink.source && l.target === bLink.target) ||
          (l.source === bLink.target && l.target === bLink.source),
      );
      if (exists) return;

      // For bubbled links, we assume they are active if the state node was active
      // But since we are hiding state nodes, we need to defer to the link's own bounds if we can find the original link
      // For now, bubbled links are "Active" because getBubbledLinks only returns active states.
      activeLinks.push({
        id: `bubbled-${bLink.source}-${bLink.target}-${idx}`,
        source: bLink.source,
        target: bLink.target,
        verb: bLink.verb,
        verbInverse: 'linked state',
        isReified: false,
        type: NexusType.SIMPLE_LINK,
        originalSourceId: bLink.source, // Approximate
        originalTargetId: bLink.target,
        isTemporalActive: true, // Bubbled links are inherently active because they come from active states
      } as any);
    });

    (Object.values(fullRegistry) as NexusObject[]).forEach((obj) => {
      if (!isLink(obj)) return;

      if ((obj as any).time_state?.parent_identity_id || (obj as any).time_data?.base_node_id)
        return; // Skip temporal reified skins for now, handled below
      const link = obj as any;
      const sId = link.source_id;
      const tId = link.target_id;

      const sBaseId =
        (fullRegistry[sId] as any)?.time_state?.parent_identity_id ||
        (fullRegistry[sId] as any)?.time_data?.base_node_id ||
        sId;
      const tBaseId =
        (fullRegistry[tId] as any)?.time_state?.parent_identity_id ||
        (fullRegistry[tId] as any)?.time_data?.base_node_id ||
        tId;

      // 1. Both endpoints (base nodes) must be in visible registry
      if (!registry[sBaseId] || !registry[tBaseId]) return;

      // 2. Atomic Snapshot Check (Updated for Time State):
      // If the link explicitly targets a snapshot (sId != sBaseId), it must match the active one.
      // If it targets a base (sId == sBaseId), it only shows if NO snapshot is active (strict atomic).
      const sActiveId = registry[sBaseId].activeTemporalId || sBaseId;
      const tActiveId = registry[tBaseId].activeTemporalId || tBaseId;

      // Relaxed Check: Allow link if it points to the Active Snapshot OR the Base Node (Inheritance)
      const isSourceValid = sId === sActiveId || sId === sBaseId;
      const isTargetValid = tId === tActiveId || tId === tBaseId;

      if (!isSourceValid || !isTargetValid) return;

      // 3. Temporal Filtering (Backup): Link must not be in the future relative to the era
      // Now checking valid_until range!
      const isTemporalActive = checkTemporalStatus(link, simulatedDate);

      if (isReified(obj) && registry[obj.id]) {
        const reified = obj as AggregatedSemanticLink;

        // --- Granularity Shifting Logic ---
        // If this is a nested reified link (has parent_container_id),
        // only show it if the parent is the one in focus.
        if (reified.parent_container_id && reified.parent_container_id !== focusId) {
          // Check if parent is also in registry. If it is, and we aren't focusing it, hide the child to keep graph clean.
          if (registry[reified.parent_container_id]) return;
        }

        // Reified structural lines are active if the Reified Node itself is temporally consistent
        activeLinks.push({
          id: `${obj.id}-structural-s`,
          source:
            (fullRegistry[reified.source_id] as SimpleNote)?.time_state?.parent_identity_id ||
            (fullRegistry[reified.source_id] as SimpleNote)?.time_data?.base_node_id ||
            reified.source_id,
          target: obj.id,
          verb: link.verb,
          isReified: true,
          isStructuralLine: true,
          type: obj._type as NexusType,
          isTemporalActive: true,
        } as any);
        activeLinks.push({
          id: `${obj.id}-structural-t`,
          source: obj.id,
          target:
            (fullRegistry[reified.target_id] as SimpleNote)?.time_state?.parent_identity_id ||
            (fullRegistry[reified.target_id] as SimpleNote)?.time_data?.base_node_id ||
            reified.target_id,
          verb: link.verb,
          isReified: true,
          isStructuralLine: true,
          type: obj._type as NexusType,
          isTemporalActive: true,
        } as any);
      } else if (!isReified(obj)) {
        activeLinks.push({
          id: obj.id,
          source: sBaseId,
          target: tBaseId,
          verb: link.verb || 'binds',
          verbInverse: link.verb_inverse || 'part of',
          isReified: false,
          isStructuralLine: false,
          type: obj._type as NexusType,
          originalSourceId: sId,
          originalTargetId: tId,
          isTemporalActive: isTemporalActive, // Pass this down
        } as any);
      }
    });

    return { nodes: activeNodes, links: activeLinks };
  }, [registry, fullRegistry, simulatedDate, focusId]);

  useEffect(() => {
    if (!simData.nodes.length) {
      queueMicrotask(() => {
        setNodes([]);
        setLinks([]);
      });
      return;
    }

    const idsChanged =
      !prevNodesRef.current ||
      prevNodesRef.current.length !== simData.nodes.length ||
      simData.nodes.some((n, i) => n.id !== prevNodesRef.current?.[i]?.id);

    prevNodesRef.current = simData.nodes;

    // Initialize positions from ref safely inside effect
    simData.nodes.forEach((node, idx) => {
      const prevPos = positionMap.current.get(node.id);
      if (prevPos) {
        node.x = prevPos.x;
        node.y = prevPos.y;
      } else {
        node.x = ((idx * 50) % 200) - 100;
        node.y = ((idx * 50 * 0.7) % 200) - 100;
      }
    });

    if (simulationRef.current) {
      if (idsChanged || simulationRef.current.alpha() < 0.05) {
        simulationRef.current.stop();
      } else {
        // Just update nodes in existing simulation without high alpha restart
        simulationRef.current.nodes(simData.nodes);
        if (simulationRef.current.force('link')) {
          (
            simulationRef.current.force('link') as d3.ForceLink<SimulationNode, SimulationLink>
          ).links(simData.links);
        }
        // Force a sync to React state so LOD and temporal overrides update in the UI
        queueMicrotask(() => {
          setNodes([...simData.nodes]);
          setLinks([...simData.links]);
        });
        return;
      }
    }

    const simulation = d3
      .forceSimulation<SimulationNode>(simData.nodes)
      .force(
        'link',
        d3
          .forceLink<SimulationNode, SimulationLink>(simData.links)
          .id((d) => d.id)
          .distance((d) => (d.isStructuralLine ? 1500 : 2500))
          .strength((d) => (d.isStructuralLine ? 1.0 : 0.6)),
      )
      .force('charge', d3.forceManyBody().strength(-150000))
      .force('collide', d3.forceCollide().radius(700).iterations(8))
      .force(
        'radial',
        d3
          .forceRadial<SimulationNode>(
            (d) => {
              if (d.id === focusId) return 0;
              const absDepth = Math.abs(d.object.depth);
              return d.object.pathType === 'ancestor' ? absDepth * 1800 : absDepth * 2800;
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

    simulation
      .alpha(idsChanged ? 1 : 0.3)
      .alphaDecay(0.02)
      .restart();
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

    // Force initial render state to prevent "invisible nodes" bug on fresh load
    queueMicrotask(() => {
      setNodes([...simData.nodes]);
      setLinks([...simData.links]);
    });

    return () => simulation.stop();
  }, [simData, focusId]);

  return { nodes, links, simulationRef };
};
