import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface DrillNodeNavigationProps {
  timeNavigation: {
    nextId?: string;
    prevId?: string;
    onNext?: () => void;
    onPrev?: () => void;
  };
}

export const DrillNodeNavigation: React.FC<DrillNodeNavigationProps> = ({ timeNavigation }) => (
  <div className="flex flex-col gap-3 ml-6 mb-12">
    <button
      onClick={(e) => {
        e.stopPropagation();
        timeNavigation.onPrev?.();
      }}
      disabled={!timeNavigation.prevId}
      className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all ${
        timeNavigation.prevId
          ? 'bg-nexus-800 border-nexus-700 hover:bg-nexus-accent hover:text-white cursor-pointer'
          : 'opacity-20 border-transparent cursor-not-allowed'
      }`}
      title="Previous Era (Past)"
    >
      <ArrowUp size={24} />
    </button>
    <button
      onClick={(e) => {
        e.stopPropagation();
        timeNavigation.onNext?.();
      }}
      disabled={!timeNavigation.nextId}
      className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all ${
        timeNavigation.nextId
          ? 'bg-nexus-800 border-nexus-700 hover:bg-nexus-accent hover:text-white cursor-pointer'
          : 'opacity-20 border-transparent cursor-not-allowed'
      }`}
      title="Next Era (Future)"
    >
      <ArrowDown size={24} />
    </button>
  </div>
);
