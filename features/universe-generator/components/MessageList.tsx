import React, { useRef, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { MessageNode, ChatSession } from '../types';
import { MessageBubble } from './MessageBubble';
import { NexusObject } from '../../../types';

interface MessageListProps {
    thread: MessageNode[];
    session: ChatSession;
    isLoading: boolean;
    editMessage: (nodeId: string, text: string) => void;
    regenerate: (nodeId: string) => void;
    navigateBranch: (nodeId: string, direction: 'prev' | 'next') => void;
    onScan: (text: string) => void;
    registry?: Record<string, NexusObject>;
}

export const MessageList: React.FC<MessageListProps> = ({ 
    thread, 
    session, 
    isLoading,
    editMessage,
    regenerate,
    navigateBranch,
    onScan,
    registry = {}
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    const lastMessageText = thread.length > 0 ? thread[thread.length - 1].text : '';

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [thread.length, isLoading, lastMessageText]);

    if (thread.length === 0) {
        return null;
    }

    return (
        <div 
            ref={scrollRef}
            className="w-full h-full overflow-y-auto px-4 md:px-0 py-6 scroll-smooth"
        >
            <div className="max-w-3xl mx-auto">
                {thread.map(node => (
                    <MessageBubble 
                        key={node.id} 
                        node={node} 
                        session={session} 
                        editMessage={editMessage}
                        regenerate={regenerate}
                        navigateBranch={navigateBranch}
                        onScan={onScan}
                        registry={registry}
                    />
                ))}
                
                {isLoading && lastMessageText.length === 0 && (
                    <div className="flex items-center gap-3 text-nexus-accent text-xs animate-pulse ml-0 mt-4 pl-4 md:pl-0">
                        <Sparkles size={14} />
                        <span className="uppercase tracking-widest font-bold">Computing...</span>
                    </div>
                )}
                
                <div className="h-4" />
            </div>
        </div>
    );
};