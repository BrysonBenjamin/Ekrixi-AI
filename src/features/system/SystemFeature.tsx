import React from 'react';
import { HardDrive, Share2, FileJson, Activity } from 'lucide-react';
import { NexusObject } from '../../types';
import { ThemeMode } from '../../store/useUIStore'; // Corrected import
import { useSystemStats } from './hooks/useSystemStats';
import { SystemHeader } from './components/SystemHeader';
import { StatCard } from './components/StatCard';
import { ThemeSelector } from './components/ThemeSelector';
import { DataSyncPanel } from './components/DataSyncPanel';
import { DangerZone } from './components/DangerZone';
import { UniverseSwitcher } from './components/UniverseSwitcher';
import { LLMSettingsPanel } from './components/LLMSettingsPanel';

export interface SystemFeatureProps {
  // Exported for potential reuse
  registry: Record<string, NexusObject>;
  onImport: (data: Record<string, NexusObject>) => void;
  onClear: () => void;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
}

export const SystemFeature: React.FC<SystemFeatureProps> = ({
  registry,
  onImport,
  onClear,
  theme,
  onThemeChange,
}) => {
  const stats = useSystemStats(registry);

  return (
    <div className="flex flex-col h-full overflow-y-auto no-scrollbar p-6 md:p-10 font-sans">
      <SystemHeader />

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <StatCard
          label="Active Units"
          value={stats.nodeCount}
          icon={HardDrive}
          subtext="Nodes in Registry"
        />
        <StatCard
          label="Neural Links"
          value={stats.linkCount}
          icon={Share2}
          subtext="Active Associations"
        />
        <StatCard
          label="Volumes"
          value={stats.containerCount}
          icon={FileJson}
          subtext="Logical Hierarchies"
        />
        <StatCard
          label="System Payload"
          value={`${stats.sizeKB} KB`}
          icon={Activity}
          subtext="JSON Footprint"
          highlight
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        <UniverseSwitcher />
        <ThemeSelector theme={theme} onThemeChange={onThemeChange} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        <DataSyncPanel registry={registry} onImport={onImport} />
        <LLMSettingsPanel />
      </div>

      <DangerZone onClear={onClear} />
    </div>
  );
};
