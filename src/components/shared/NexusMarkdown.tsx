import React, { useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { User, MapPin, Package, Star, Hash, Building2, FileText, Sparkles } from 'lucide-react';
import { NexusObject } from '../../types';

interface NexusMarkdownProps {
  content: string;
  registry?: Record<string, NexusObject>;
  onLinkClick?: (id: string) => void;
  color?: string;
  className?: string;
}

// Theme-agnostic palette that attempts to work on both Light (as colored text) and Dark (as neon text).
// We use slightly darker shades (500/600 scale) so they are readable against white backgrounds.
const CATEGORY_COLORS: Record<string, string> = {
  CONCEPT: '#0ea5e9', // Sky 500 (Readable on white, bright on dark)
  LOCATION: '#16a34a', // Green 600
  ITEM: '#d97706', // Amber 600
  EVENT: '#e11d48', // Rose 600
  CHARACTER: '#475569', // Slate 600 (Replaces Purple/Arcane for concepts - more neutral/intellectual)
  ORGANIZATION: '#4f46e5', // Indigo 600
  META: '#64748b', // Slate 500
  STORY: '#db2777', // Pink 600
};

// Helper to get icon for category
const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'CHARACTER':
      return <User size={12} />;
    case 'LOCATION':
      return <MapPin size={12} />;
    case 'ITEM':
      return <Package size={12} />;
    case 'EVENT':
      return <Star size={12} />;
    case 'ORGANIZATION':
      return <Building2 size={12} />;
    case 'STORY':
      return <FileText size={12} />;
    case 'META':
      return <Sparkles size={12} />;
    default:
      return <Hash size={12} />;
  }
};

export const NexusMarkdown: React.FC<NexusMarkdownProps> = ({
  content,
  registry = {},
  onLinkClick,
  color,
  className = 'prose max-w-none',
}) => {
  const transformWikiLinks = useCallback(
    (text: string) => {
      if (!text) return '';

      const nodes = Object.values(registry);

      // Create a map of titles to IDs for faster lookup
      const titleToIdMap: Record<string, string> = {};
      nodes.forEach((node) => {
        const anyNode = node as any;
        const title = anyNode.title || anyNode.verb;
        if (title) {
          titleToIdMap[title.toLowerCase()] = node.id;
        }
      });

      // Regex for [[Title]] or [[Title|Alias]]
      return text.replace(/\[\[(.*?)\]\]/g, (match, content) => {
        const rawTitle = content.split('|')[0].trim();
        const searchKey = rawTitle.toLowerCase();

        let id = titleToIdMap[searchKey];
        let displayTitle = rawTitle;

        // Smart Database Interaction: Simple Fuzzy Match if exact match fails
        if (!id && nodes.length > 0) {
          // Find first node where title includes the search key or vice versa
          const bestMatch = nodes.find((n) => {
            const t = ((n as any).title || (n as any).verb || '').toLowerCase();
            return t.includes(searchKey) || searchKey.includes(t);
          });

          if (bestMatch) {
            id = bestMatch.id;
          }
        }

        // If ID exists (exact or fuzzy), it's a resolved link
        if (id) {
          return `[${displayTitle}](#navigate-${encodeURIComponent(id)})`;
        }

        // Otherwise, ghost link
        return `[${displayTitle}](#ghost-${encodeURIComponent(displayTitle)})`;
      });
    },
    [registry],
  );

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node, ...props }) => {
            const href = props.href || '';

            // Handle Internal Navigation
            if (href.startsWith('#navigate-')) {
              const id = decodeURIComponent(href.replace('#navigate-', ''));
              const targetNode = registry[id];
              const category = (targetNode as any)?.category_id || 'CONCEPT';
              const linkColor = CATEGORY_COLORS[category] || color || '#e11d48';

              return (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    if (onLinkClick) onLinkClick(id);
                  }}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md transition-all font-medium text-[0.95em] align-middle hover:bg-opacity-20 hover:scale-105 active:scale-95 mx-0.5"
                  style={{
                    backgroundColor: `${linkColor}15`, // 10% opacity background
                    color: linkColor,
                    border: `1px solid ${linkColor}30`, // Subtle border
                  }}
                  title={`Navigate to: ${(targetNode as any)?.title || id} (${category})`}
                >
                  <span style={{ opacity: 0.7 }}>{getCategoryIcon(category)}</span>
                  <span>{props.children}</span>
                </button>
              );
            }

            // Handle Ghost/Latent Links
            if (href.startsWith('#ghost-')) {
              const ghostTitle = decodeURIComponent(href.replace('#ghost-', ''));
              return (
                <span
                  className="inline-flex items-center gap-1 px-1 rounded transition-colors cursor-help decoration-dotted underline decoration-white/30 hover:decoration-white/60 text-nexus-muted hover:text-white"
                  title={`Latent Unit: ${ghostTitle}`}
                >
                  {props.children}
                </span>
              );
            }

            // Standard External Links
            return (
              <a
                {...props}
                className="text-nexus-accent hover:text-white underline decoration-nexus-accent/50 hover:decoration-white transition-colors font-medium"
                target="_blank"
                rel="noopener noreferrer"
              />
            );
          },
          // Table Support Styling
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-4">
              <table
                className="w-full text-left border-collapse border border-nexus-800 rounded-lg overflow-hidden bg-nexus-900/30"
                {...props}
              />
            </div>
          ),
          thead: ({ node, ...props }) => (
            <thead
              className="bg-nexus-900/60 text-xs uppercase font-bold text-nexus-muted tracking-wider"
              {...props}
            />
          ),
          th: ({ node, ...props }) => <th className="p-3 border-b border-nexus-800" {...props} />,
          td: ({ node, ...props }) => (
            <td
              className="p-3 border-b border-nexus-800/50 text-sm text-nexus-text/80"
              {...props}
            />
          ),
        }}
      >
        {transformWikiLinks(content)}
      </ReactMarkdown>
    </div>
  );
};
