import { useEffect, useRef, useMemo, useState } from 'react';
import * as d3 from 'd3';
import {
  NexusObject,
  NexusNote,
  isLink,
  isReified,
  NexusType,
  AggregatedSimpleLink,
  NexusCategory,
  NexusLink,
  isBinaryLink,
  isM2M,
} from '../../../types';
import { VisibleNode } from './useDrilldownRegistry';
import { TimeDimensionService } from '../../../core/services/TimeDimensionService';
import {
  getTimeState,
  getParentIdentityId,
  getEffectiveDate,
  isHistoricalSnapshot,
} from '../../../core/utils/nexus-accessors';
import { RegistryIndexes } from './useRegistryIndexes';

export interface SimulationNode extends d3.SimulationNodeDatum {
  id: string;
  object: VisibleNode;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface SimulationLink extends d3.SimulationLinkDatum<SimulationNode> {
  id: string;
  source: string | number | SimulationNode;
  target: string | number | SimulationNode;
  verb: string;
  verbInverse?: string;
  isReified: boolean;
  isStructuralLine?: boolean;
  isM2M?: boolean;
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
  indexes: RegistryIndexes;
}

export const useDrilldownSimulation = ({
  registry,
  fullRegistry,
  focusId,
  simulatedDate,
  indexes,
}: UseDrilldownSimulationProps) => {
  const [nodes, setNodes] = useState<SimulationNode[]>([]);
  const [links, setLinks] = useState<SimulationLink[]>([]);

  const positionMap = useRef<Map<string, { x: number; y: number }>>(new Map());
  const simulationRef = useRef<d3.Simulation<SimulationNode, SimulationLink> | null>(null);
  const prevNodesRef = useRef<SimulationNode[] | null>(null);

  const simData = useMemo(() => {
    const activeNodes: SimulationNode[] = (Object.values(registry) as VisibleNode[])
      .filter((obj) => (obj as NexusNote).category_id !== NexusCategory.STATE) // HIDE STATE NODES (keep graph clean)
      .map((obj) => ({
        id: obj.id,
        object: obj,
      }));

    const activeLinks: SimulationLink[] = [];

    // Helper to check if a link is temporally active
    const checkTemporalStatus = (link: NexusObject, date?: { year: number }) => {
      if (!date) return true; // No date simulation = always active
      const linkDate = getEffectiveDate(link);
      const linkYear = linkDate?.year ?? -Infinity;
      const ts = getTimeState(link);
      const linkEndYear = ts?.valid_until?.year ?? Infinity;
      return linkYear <= date.year && date.year <= linkEndYear;
    };

    // Inject Bubbled Links (State Node -> Parent Logic)
    // This allows a link to "France (1800)" to appear as a link to "France" in the main view.
    const activeNexusNotes = (Object.values(registry) as VisibleNode[])
      .filter((n) => !isLink(n)) // Ensure only notes passed
      .map((n) => n as unknown as NexusNote);

    const bubbledLinks = TimeDimensionService.getBubbledLinks(fullRegistry, activeNexusNotes);

    bubbledLinks.forEach((bLink, idx) => {
      // Avoid duplicates if a real link already exists
      const exists = activeLinks.some(
        (l) =>
          (l.source === bLink.source && l.target === bLink.target) ||
          (l.source === bLink.target && l.target === bLink.source),
      );
      if (exists) return;

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
      } as SimulationLink);
    });

    indexes.allLinks.forEach((obj) => {
      // Skip temporal reified skins for now, handled below
      if (isHistoricalSnapshot(obj)) return;

      const link = obj; // isLink(obj) is true
      const sId = link.source_id;
      const tId = link.target_id;

      // Resolve Base IDs
      const sObj = fullRegistry[sId];
      const tObj = fullRegistry[tId];
      const sBaseId = getParentIdentityId(sObj) || sId;
      const tBaseId = getParentIdentityId(tObj) || tId;

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
      const isTemporalActive = checkTemporalStatus(link, simulatedDate);

      if (isReified(obj) && registry[obj.id] && isBinaryLink(obj)) {
        const reified = obj as AggregatedSimpleLink;

        // --- Granularity Shifting Logic ---
        // If this is a nested reified link (has parent_container_id is not in interface but might exist in data?)
        // NexusNote/Link interface doesn't show parent_container_id, relying on graph topology.
        // Assuming containment logic is handled by Children IDs in v2.

        // Reified structural lines are active if the Reified Node itself is temporally consistent
        const sSourceObj = fullRegistry[reified.source_id];
        const sTargetObj = fullRegistry[reified.target_id];

        activeLinks.push({
          id: `${obj.id}-structural-s`,
          source: getParentIdentityId(sSourceObj) || reified.source_id,
          target: obj.id,
          verb: link.verb,
          isReified: true,
          isStructuralLine: true,
          type: obj._type as NexusType,
          isTemporalActive: true,
        } as SimulationLink);

        activeLinks.push({
          id: `${obj.id}-structural-t`,
          source: obj.id,
          target: getParentIdentityId(sTargetObj) || reified.target_id,
          verb: link.verb,
          isReified: true,
          isStructuralLine: true,
          type: obj._type as NexusType,
          isTemporalActive: true,
        } as SimulationLink);
      } else if (isReified(obj) && registry[obj.id] && isM2M(obj)) {
        // M2M Hub-and-spoke: one structural line per participant → hub
        const hub = obj as unknown as {
          participants: { node_id: string; role_id: string; verb: string }[];
        };
        for (const p of hub.participants) {
          const baseId = getParentIdentityId(fullRegistry[p.node_id]) || p.node_id;
          if (!registry[baseId]) continue;
          activeLinks.push({
            id: `${obj.id}-m2m-${p.node_id}`,
            source: baseId,
            target: obj.id,
            verb: p.verb,
            isReified: true,
            isStructuralLine: true,
            isM2M: true,
            type: obj._type as NexusType,
            isTemporalActive: true,
          } as SimulationLink);
        }
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
        } as SimulationLink);
      }
    });

    return { nodes: activeNodes, links: activeLinks };
  }, [registry, fullRegistry, simulatedDate, focusId, indexes]);

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
        // Directed initial placement: Seed positions logically but less "exploded"
        const depth = node.object.depth || 0;
        const siblings = simData.nodes.filter((n) => (n.object.depth || 0) === depth);
        const sibIdx = siblings.indexOf(node);

        // Slightly tighter horizontal spread
        node.x = (sibIdx - siblings.length / 2) * 1600;

        // PathType based layering - reduced vertical steps
        if (node.object.pathType === 'ancestor') {
          node.y = -depth * 2500 - 1500;
        } else if (node.object.pathType === 'descendant') {
          node.y = depth * 2500 + 1500;
        } else {
          // Focus / Lateral
          node.y = (idx % 2 === 0 ? 1 : -1) * 300;
        }

        node.vx = 0;
        node.vy = 0;
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
          .distance((d) => (d.isStructuralLine ? 1400 : 2200)) // Reduced from 1800/3000
          .strength((d) => (d.isStructuralLine ? 1.0 : 0.45)),
      )
      .force('charge', d3.forceManyBody().strength(-180000)) // Reduced from -300000
      .force('collide', d3.forceCollide().radius(1000).iterations(10)) // Reduced from 1200
      .force(
        'radial',
        d3
          .forceRadial<SimulationNode>(
            (d) => {
              if (d.id === focusId) return 0;
              const absDepth = Math.abs(d.object.depth);
              // Root view ring - reduced from 8000
              if (!focusId) return 5500;
              return d.object.pathType === 'ancestor' ? absDepth * 1800 : absDepth * 3200;
            },
            0,
            0,
          )
          .strength(focusId ? 1.0 : 0.4),
      )
      .force(
        'centering',
        d3.forceX().strength((d) => (d.id === focusId ? 0.6 : 0.02)),
      )
      .force(
        'centering-y',
        d3.forceY().strength((d) => (d.id === focusId ? 0.6 : 0.02)),
      );

    simulation
      .alpha(idsChanged ? 1 : 0.3)
      .alphaDecay(focusId ? 0.02 : 0.035)
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
