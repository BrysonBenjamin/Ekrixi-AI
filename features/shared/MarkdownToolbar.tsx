
import React from 'react';
import { Bold, Italic, Heading1, Heading2, List, Quote, Link2, CaseSensitive } from 'lucide-react';

interface MarkdownToolbarProps {
    textareaRef: React.RefObject<HTMLTextAreaElement | null>;
    content: string;
    onUpdate: (val: string) => void;
}

export const MarkdownToolbar: React.FC<MarkdownToolbarProps> = ({ textareaRef, content, onUpdate }) => {
    
    const applyFormat = (prefix: string, suffix: string = '') => {
        const el = textareaRef.current;
        if (!el) return;

        const start = el.selectionStart;
        const end = el.selectionEnd;
        const selectedText = content.substring(start, end);
        const before = content.substring(0, start);
        const after = content.substring(end);

        const newText = before + prefix + selectedText + suffix + after;
        onUpdate(newText);

        // Maintain focus and reset selection after DOM update
        setTimeout(() => {
            el.focus();
            el.setSelectionRange(start + prefix.length, end + prefix.length);
        }, 0);
    };

    const ToolbarButton = ({ icon: Icon, label, onClick }: { icon: any, label: string, onClick: () => void }) => (
        <button
            onClick={(e) => { e.preventDefault(); onClick(); }}
            className="p-2 rounded-lg bg-nexus-900 border border-nexus-800 text-nexus-muted hover:text-nexus-accent hover:border-nexus-accent transition-all flex items-center justify-center group relative"
            title={label}
        >
            <Icon size={14} strokeWidth={2.5} />
            <span className="absolute bottom-full mb-2 px-2 py-1 bg-nexus-950 border border-nexus-700 rounded text-[8px] font-bold uppercase tracking-widest text-nexus-text opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-xl border-opacity-50">
                {label}
            </span>
        </button>
    );

    return (
        <div className="flex flex-wrap items-center gap-2 p-2 bg-nexus-950/60 backdrop-blur-xl border border-nexus-800 rounded-2xl shadow-xl animate-in slide-in-from-bottom-2 duration-500">
            <ToolbarButton icon={Bold} label="Bold" onClick={() => applyFormat('**', '**')} />
            <ToolbarButton icon={Italic} label="Italic" onClick={() => applyFormat('_', '_')} />
            <div className="w-px h-6 bg-nexus-800 mx-1" />
            <ToolbarButton icon={Heading1} label="Heading 1" onClick={() => applyFormat('# ', '')} />
            <ToolbarButton icon={Heading2} label="Heading 2" onClick={() => applyFormat('## ', '')} />
            <div className="w-px h-6 bg-nexus-800 mx-1" />
            <ToolbarButton icon={List} label="List" onClick={() => applyFormat('- ', '')} />
            <ToolbarButton icon={Quote} label="Blockquote" onClick={() => applyFormat('> ', '')} />
            <ToolbarButton icon={Link2} label="Wiki Link" onClick={() => applyFormat('[[', ']]')} />
            <div className="flex-1" />
            <div className="flex items-center gap-2 px-3 opacity-40">
                <CaseSensitive size={12} className="text-nexus-muted" />
                <span className="text-[8px] font-mono font-black uppercase tracking-widest text-nexus-muted">Manuscript Engine 4.1</span>
            </div>
        </div>
    );
};
