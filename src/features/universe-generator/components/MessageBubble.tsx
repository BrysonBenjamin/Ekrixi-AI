import React, { useState, useEffect, useRef } from 'react';
import { NexusMarkdown } from '../../../components/shared/NexusMarkdown';
import {
  Bot,
  Copy,
  RotateCw,
  ScanLine,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Check,
  X,
  GitBranch,
  User,
} from 'lucide-react';
import { MessageNode, ChatSession } from '../types';
import { NexusObject } from '../../../types';

interface MessageBubbleProps {
  node: MessageNode;
  session: ChatSession;
  editMessage: (nodeId: string, text: string) => void;
  regenerate: (nodeId: string) => void;
  navigateBranch: (nodeId: string, direction: 'prev' | 'next') => void;
  onScan: (text: string) => void;
  registry?: Record<string, NexusObject>;
}

const TooltipButton = ({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label?: string;
  onClick?: () => void;
  disabled?: boolean;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`
            p-1.5 rounded-lg transition-all flex items-center gap-1 group relative
            ${disabled ? 'text-nexus-800 cursor-not-allowed opacity-20' : 'text-nexus-muted hover:text-nexus-text hover:bg-nexus-800/50 active:scale-95'}
        `}
    title={label}
  >
    <Icon size={13} />
  </button>
);

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  node,
  session,
  editMessage,
  regenerate,
  navigateBranch,
  onScan,
  registry = {},
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isUser = node.role === 'user';
  const isError = node.isError;

  let siblingCount = 1;
  let currentSiblingIndex = 0;

  if (node.parentId && session.messageMap[node.parentId]) {
    const parent = session.messageMap[node.parentId];
    siblingCount = parent.childrenIds.length;
    currentSiblingIndex = parent.childrenIds.indexOf(node.id);
  } else if (!node.parentId && session.rootNodeIds) {
    siblingCount = session.rootNodeIds.length;
    currentSiblingIndex = session.rootNodeIds.indexOf(node.id);
  }

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [editText, isEditing]);

  const handleEditSave = () => {
    if (editText.trim() !== '') {
      editMessage(node.id, editText);
    }
    setIsEditing(false);
  };

  return (
    <div className={`flex w-full group ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex flex-col ${isUser ? 'items-end max-w-[85%]' : 'items-start w-full'}`}>
        {/* Header - Compact */}
        {!isEditing && (
          <div
            className={`flex items-center gap-1.5 mb-1.5 opacity-50 ${isUser ? 'flex-row-reverse' : ''}`}
          >
            {isUser ? (
              <User size={10} className="text-nexus-accent" />
            ) : (
              <Bot size={10} className="text-nexus-arcane" />
            )}
            <span className="text-[9px] font-display font-black tracking-[0.15em] uppercase">
              {isUser ? 'You' : 'AI'}
            </span>
          </div>
        )}

        {/* Message Bubble - Compact ChatGPT-style */}
        <div
          className={`
                    relative transition-all duration-300
                    ${
                      isUser
                        ? 'bg-nexus-700/80 text-nexus-text rounded-2xl rounded-tr-md px-4 py-3 border border-nexus-600/50 shadow-sm'
                        : isEditing
                          ? 'w-full'
                          : 'text-nexus-text w-full'
                    } 
                    ${isError ? 'text-red-400 border-red-500/30 bg-red-500/10' : ''}
                `}
        >
          {isEditing ? (
            <div className="w-full bg-nexus-900 border border-nexus-800 rounded-2xl p-4 shadow-xl">
              <textarea
                ref={textareaRef}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full bg-transparent text-nexus-text outline-none resize-none leading-relaxed text-sm no-scrollbar"
                rows={1}
                autoFocus
              />
              <div className="flex items-center justify-end gap-2 pt-3 mt-3 border-t border-nexus-800">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 rounded-lg text-[9px] font-display font-bold text-nexus-muted hover:text-nexus-text transition-all flex items-center gap-1.5 uppercase tracking-wider"
                >
                  <X size={10} /> Cancel
                </button>
                <button
                  onClick={handleEditSave}
                  className="px-4 py-1.5 rounded-lg text-[9px] font-display font-black bg-nexus-accent text-white hover:brightness-110 transition-all flex items-center gap-1.5 uppercase tracking-wider shadow-sm"
                >
                  <Check size={10} /> Save
                </button>
              </div>
            </div>
          ) : (
            <div className="prose-compact">
              <NexusMarkdown
                content={node.text || (node.isStreaming ? '...' : '')}
                registry={registry}
                onLinkClick={(id) =>
                  window.dispatchEvent(new CustomEvent('nexus-navigate', { detail: id }))
                }
              />
            </div>
          )}
        </div>

        {/* Actions - Compact */}
        {!isEditing && (
          <div
            className={`
                        flex flex-wrap items-center gap-1.5 mt-2 transition-opacity duration-200
                        ${isUser ? 'opacity-0 group-hover:opacity-100' : 'opacity-70 group-hover:opacity-100'}
                    `}
          >
            {siblingCount > 1 && (
              <div className="flex items-center gap-0.5 bg-nexus-900/50 rounded-full px-1.5 py-0.5 border border-nexus-800/50">
                <button
                  onClick={() => navigateBranch(node.id, 'prev')}
                  disabled={currentSiblingIndex === 0}
                  className={`p-0.5 rounded-full transition-colors ${currentSiblingIndex === 0 ? 'text-nexus-800' : 'text-nexus-muted hover:text-nexus-accent'}`}
                >
                  <ChevronLeft size={12} />
                </button>
                <div className="flex items-center gap-1 px-1.5 text-[8px] font-mono font-black text-nexus-muted uppercase">
                  <GitBranch size={8} className="text-nexus-accent/50" />
                  <span>
                    {currentSiblingIndex + 1}/{siblingCount}
                  </span>
                </div>
                <button
                  onClick={() => navigateBranch(node.id, 'next')}
                  disabled={currentSiblingIndex === siblingCount - 1}
                  className={`p-0.5 rounded-full transition-colors ${currentSiblingIndex === siblingCount - 1 ? 'text-nexus-800' : 'text-nexus-muted hover:text-nexus-accent'}`}
                >
                  <ChevronRight size={12} />
                </button>
              </div>
            )}

            <div className="flex items-center gap-0.5">
              {isUser ? (
                <>
                  <TooltipButton
                    icon={Pencil}
                    label="Edit"
                    onClick={() => {
                      setEditText(node.text);
                      setIsEditing(true);
                    }}
                  />
                  <TooltipButton
                    icon={RotateCw}
                    label="Re-Branch"
                    onClick={() => regenerate(node.id)}
                  />
                </>
              ) : (
                !node.isStreaming &&
                !isError && (
                  <>
                    <TooltipButton
                      icon={Copy}
                      label="Copy"
                      onClick={() => navigator.clipboard.writeText(node.text)}
                    />
                    <TooltipButton
                      icon={RotateCw}
                      label="Regenerate"
                      onClick={() => regenerate(node.id)}
                    />
                    <button
                      onClick={() => onScan(node.text)}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-nexus-800/50 hover:bg-nexus-accent hover:text-white text-nexus-accent text-[8px] font-display font-black transition-all uppercase tracking-wider border border-nexus-700/50 ml-1"
                    >
                      <ScanLine size={11} /> Scan
                    </button>
                  </>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
