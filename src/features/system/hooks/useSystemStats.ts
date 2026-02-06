import { useMemo } from 'react';
import { NexusObject, isLink, isContainer } from '../../../types';

export const useSystemStats = (registry: Record<string, NexusObject>) => {
  return useMemo(() => {
    const allObjects = Object.values(registry) as NexusObject[];
    const nodes = allObjects.filter((n) => !isLink(n));
    const links = allObjects.filter((n) => isLink(n));
    const containers = nodes.filter((n) => isContainer(n));
    const totalSize = JSON.stringify(registry).length;

    return {
      nodeCount: nodes.length,
      linkCount: links.length,
      containerCount: containers.length,
      sizeKB: (totalSize / 1024).toFixed(2),
    };
  }, [registry]);
};
