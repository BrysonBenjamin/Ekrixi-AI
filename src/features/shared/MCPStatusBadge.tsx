// ============================================================
// MCP Status Badge — Connection Indicator
// Shows 🟢 Connected / 🔴 Disconnected / 🟡 Connecting / ❌ Error
// ============================================================

import React from 'react';
import { Wifi, WifiOff, Loader2, AlertTriangle } from 'lucide-react';
import type { MCPConnectionStatus } from '../../core/services/MCPScannerClient';

interface MCPStatusBadgeProps {
  status: MCPConnectionStatus;
  error?: string;
  compact?: boolean;
  className?: string;
}

const STATUS_CONFIG: Record<
  MCPConnectionStatus,
  { label: string; color: string; bg: string; border: string; icon: React.ReactNode }
> = {
  connected: {
    label: 'MCP ONLINE',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    icon: <Wifi size={12} />,
  },
  connecting: {
    label: 'MCP CONNECTING',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    icon: <Loader2 size={12} className="animate-spin" />,
  },
  disconnected: {
    label: 'MCP OFFLINE',
    color: 'text-nexus-muted',
    bg: 'bg-nexus-800',
    border: 'border-nexus-700',
    icon: <WifiOff size={12} />,
  },
  error: {
    label: 'MCP ERROR',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    icon: <AlertTriangle size={12} />,
  },
};

export const MCPStatusBadge: React.FC<MCPStatusBadgeProps> = ({
  status,
  error,
  compact = false,
  className = '',
}) => {
  const cfg = STATUS_CONFIG[status];

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 ${cfg.color} ${className}`}
        title={error || cfg.label}
      >
        {cfg.icon}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest ${cfg.color} ${cfg.bg} ${cfg.border} ${className}`}
      title={error || undefined}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
};
