import React, { useState } from 'react';
import { ThinkingProcessStep, GovernedSearchResult } from '../../core/services/ArangoSearchService';
import {
  ChevronDown,
  ChevronRight,
  Activity,
  ShieldAlert,
  ShieldCheck,
  Zap,
  Database,
  GitCommit,
} from 'lucide-react';

interface ThinkingProcessViewerProps {
  result: GovernedSearchResult;
}

export const ThinkingProcessViewer: React.FC<ThinkingProcessViewerProps> = ({ result }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border border-base-700 bg-base-900 rounded-lg overflow-hidden mb-2">
      <div
        className="flex items-center justify-between p-3 cursor-pointer bg-base-800 hover:bg-base-750 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          {result.is_filtered_out ? (
            <ShieldAlert className="w-4 h-4 text-red-400" />
          ) : (
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          )}
          <span
            className={`text-sm font-medium ${result.is_filtered_out ? 'text-red-300' : 'text-emerald-100'}`}
          >
            {getNodeLabel(result.node)}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-base-400 font-mono">
            {result.thinking_process.reduce((acc, s) => acc + s.durationMs, 0)}ms
          </span>
          <span
            className={`text-xs font-bold px-1.5 py-0.5 rounded ${getScoreColor(result.score)}`}
          >
            {Math.round(result.score * 100)}%
          </span>
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-base-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-base-500" />
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="p-3 space-y-3 bg-base-900/50">
          {result.blocker && (
            <div className="p-2 bg-red-900/20 border border-red-800/50 rounded text-xs text-red-200 mb-2 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">BLOCKED BY GOVERNANCE</div>
                <div>{result.blocker}</div>
              </div>
            </div>
          )}

          <div className="space-y-4 relative">
            <div className="absolute left-2.5 top-2 bottom-2 w-px bg-base-800" />

            {result.thinking_process.map((step, idx) => (
              <div key={idx} className="relative pl-6">
                <div
                  className={`absolute left-0 top-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center bg-base-900 ${getStatusColor(step.status)}`}
                >
                  <StepIcon stage={step.stage} />
                </div>

                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-xs font-bold text-base-300 uppercase tracking-wider mb-0.5">
                      {step.stage.replace('_', ' ')}
                    </div>
                    <div className="text-sm text-base-100 mb-1">{step.description}</div>
                  </div>
                  <span className="text-[10px] text-base-500 font-mono">{step.durationMs}ms</span>
                </div>

                <div className="mt-1 bg-base-950 rounded p-2 text-[10px] font-mono text-base-400 overflow-x-auto">
                  <pre>{JSON.stringify(step.data, null, 2)}</pre>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// --- Helpers ---

function getScoreColor(score: number) {
  if (score >= 0.9) return 'bg-emerald-500/20 text-emerald-300';
  if (score >= 0.7) return 'bg-blue-500/20 text-blue-300';
  if (score >= 0.5) return 'bg-yellow-500/20 text-yellow-300';
  return 'bg-base-700 text-base-400';
}

function getStatusColor(status: ThinkingProcessStep['status']) {
  switch (status) {
    case 'PASS':
      return 'border-emerald-500 text-emerald-500';
    case 'BLOCK':
      return 'border-red-500 text-red-500';
    case 'WARN':
      return 'border-yellow-500 text-yellow-500';
    case 'INFO':
      return 'border-blue-500 text-blue-500';
    default:
      return 'border-base-600 text-base-600';
  }
}

function StepIcon({ stage }: { stage: ThinkingProcessStep['stage'] }) {
  switch (stage) {
    case 'VECTOR_RETRIEVAL':
      return <Database className="w-2.5 h-2.5" />;
    case 'LINEAGE_AUDIT':
      return <GitCommit className="w-2.5 h-2.5" />;
    case 'CONSTRAINT_CHECK':
      return <ShieldAlert className="w-2.5 h-2.5" />;
    case 'SEMANTIC_BOOST':
      return <Zap className="w-2.5 h-2.5" />;
    case 'FINAL_VALIDATION':
      return <Activity className="w-2.5 h-2.5" />;
    default:
      return <div className="w-1.5 h-1.5 bg-current rounded-full" />;
  }
}

function getNodeLabel(node: GovernedSearchResult['node']): string {
  // Check for title (NexusNote, Reified Links, or plain objects with title)
  if ('title' in node && typeof node.title === 'string') {
    return node.title;
  }
  // Check for link properties
  if ('verb' in node && typeof node.verb === 'string') {
    return `Link: ${node.verb}`;
  }
  // Fallback to ID
  return node.id;
}
