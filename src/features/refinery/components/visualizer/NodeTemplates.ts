import { NexusCategory } from '../../../../types';

interface TreeDataNode {
  id: string;
  name: string;
  category?: string;
  reified: boolean;
  gist: string;
}

interface D3HierarchyNode {
  data: TreeDataNode;
}

export const getCategoryColor = (cat: NexusCategory | string | undefined, reified?: boolean) => {
  if (reified) return 'var(--accent-color)';
  switch (cat) {
    case NexusCategory.CHARACTER:
      return '#a855f7';
    case NexusCategory.LOCATION:
      return 'var(--accent-500)';
    case NexusCategory.ORGANIZATION:
      return '#f97316';
    case NexusCategory.ITEM:
      return '#ec4899';
    case NexusCategory.CONCEPT:
      return 'var(--arcane-color)';
    case NexusCategory.EVENT:
      return '#eab308';
    case NexusCategory.STORY:
      return '#e11d48';
    default:
      return '#64748b';
  }
};

export const getCategoryIconSvg = (
  cat: NexusCategory | string | undefined,
  color: string,
  reified?: boolean,
) => {
  const size = 13;
  let path = '';
  if (reified) {
    path =
      '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" x2="12" y1="2" y2="15"/>';
  } else {
    switch (cat) {
      case NexusCategory.CHARACTER:
        path =
          '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>';
        break;
      case NexusCategory.LOCATION:
        path =
          '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>';
        break;
      case NexusCategory.ORGANIZATION:
        path =
          '<rect width="16" height="20" x="4" y="2" rx="2"/><line x1="9" x2="15" y1="18" y2="18"/><line x1="9" x2="15" y1="14" y2="14"/><line x1="9" x2="15" y1="10" y2="10"/><line x1="9" x2="15" y1="6" y2="6"/>';
        break;
      case NexusCategory.ITEM:
        path =
          '<polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/><line x1="13" x2="19" y1="19" y2="13"/><line x1="16" x2="20" y1="16" y2="20"/><line x1="19" x2="21" y1="21" y2="19"/>';
        break;
      case NexusCategory.CONCEPT:
        path =
          '<path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.54Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.54Z"/>';
        break;
      case NexusCategory.EVENT:
        path = '<path d="M4 14.75 12 3l1 10.25h7l-8 11.75-1-10.25H4Z"/>';
        break;
      case NexusCategory.STORY:
        path =
          '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/><circle cx="12" cy="8" r="2"/>';
        break;
      default:
        path =
          '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="16" y2="12"/><line x1="12" x2="12.01" y1="8" y2="8"/>';
    }
  }
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
};

export const createNodeHTML = (
  d: D3HierarchyNode,
  isSelected: boolean,
  isHovered: boolean,
  isExpanded: boolean,
) => {
  const isReifiedNode = d.data.reified;
  const color = getCategoryColor(d.data.category, isReifiedNode);
  const icon = getCategoryIconSvg(d.data.category, color, isReifiedNode);

  const borderColor =
    isSelected || isHovered ? color : isReifiedNode ? 'rgba(249, 115, 22, 0.4)' : 'var(--bg-800)';
  const background = isSelected ? 'var(--bg-900)' : isHovered ? 'var(--bg-800)' : 'var(--bg-900)';
  const textMain = 'var(--text-main)';
  const textMuted = 'var(--text-muted)';

  return `
        <div xmlns="http://www.w3.org/1999/xhtml" class="node-pill flex flex-col rounded-xl border transition-all duration-300 pointer-events-auto cursor-pointer w-full h-full" style="border-color: ${borderColor}; background: ${background};">
            <div class="flex items-center gap-3 p-3 w-full">
                <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border" style="background: ${color}20; border-color: ${color}30;">${icon}</div>
                <div class="flex-1 min-w-0">
                    <div class="text-[12px] font-bold uppercase tracking-tight truncate" style="color: ${textMain};">${d.data.name}</div>
                    <div class="text-[8px] font-mono uppercase tracking-widest mt-0.5 opacity-70" style="color: ${textMuted};">${d.data.category}</div>
                </div>
            </div>
            ${
              isExpanded
                ? `
                <div class="px-4 pb-4 border-t border-white/5 pt-3">
                    <p class="text-[10px] leading-relaxed italic mb-3 line-clamp-3" style="color: ${textMuted};">${d.data.gist}</p>
                </div>
            `
                : ''
            }
        </div>
    `;
};

export const createLinkPillHTML = (verb: string, isReified: boolean, isSelected: boolean) => {
  const color = isReified ? 'var(--accent-color)' : 'var(--arcane-color)';
  const bg = isSelected ? color : 'var(--bg-950)';
  const border = color;
  const textColor = isSelected ? 'var(--bg-950)' : 'var(--text-main)';

  return `
        <div xmlns="http://www.w3.org/1999/xhtml" class="w-full h-full flex items-center justify-center pointer-events-none">
            <div class="link-pill px-3 py-1.5 rounded-full border flex items-center gap-2 transition-all duration-300 pointer-events-auto cursor-pointer" 
                 style="background: ${bg}; border-color: ${border};">
                <span class="text-[9px] font-bold uppercase tracking-[0.15em] whitespace-nowrap" style="color: ${textColor};">${isReified ? 'LOGIC:' : ''} ${verb}</span>
            </div>
        </div>
    `;
};
