import React, { useRef, useState } from 'react';
import { Download, Upload, Cloud, CloudLightning, LogOut, Loader2 } from 'lucide-react';
import { NexusObject } from '../../../types';
import { useGoogleDrive } from '../hooks/useGoogleDrive';
import { useSessionStore } from '../../../store/useSessionStore';
import { config } from '../../../config';

interface DataSyncPanelProps {
  registry: Record<string, NexusObject>;
  onImport: (data: Record<string, NexusObject>) => void;
}

export const DataSyncPanel: React.FC<DataSyncPanelProps> = ({ registry, onImport }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { login, logout, user, token, isSyncing, syncToDrive, loadFromDrive } = useGoogleDrive();
  const { activeUniverseId, universes } = useSessionStore();
  const activeUniverse = universes.find((u) => u.id === activeUniverseId);

  const [syncStatus, setSyncStatus] = useState<{
    msg: string;
    type: 'success' | 'error' | 'neutral';
  } | null>(null);

  const handleExport = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(registry, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute('href', dataStr);
    downloadAnchorNode.setAttribute(
      'download',
      `nexus_backup_${new Date().toISOString().split('T')[0]}.json`,
    );
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        // Support both raw registry map and the format used by Drive (wrapped in meta)
        const data = parsed.registry || parsed;
        onImport(data);
        setSyncStatus({ msg: 'Local Import Successful', type: 'success' });
        setTimeout(() => setSyncStatus(null), 3000);
      } catch (err) {
        console.error('Import failed', err);
        setSyncStatus({ msg: 'Import Failed: Invalid JSON', type: 'error' });
      }
    };
    reader.readAsText(file);
  };

  const handleDriveSync = async () => {
    if (!activeUniverseId || !activeUniverse) return;
    const result = await syncToDrive(activeUniverseId, activeUniverse.name, registry);
    if (result.success) {
      setSyncStatus({ msg: 'Synced to Google Drive', type: 'success' });
    } else {
      setSyncStatus({ msg: 'Sync Failed', type: 'error' });
    }
    setTimeout(() => setSyncStatus(null), 3000);
  };

  const handleDriveLoad = async () => {
    if (!activeUniverseId) return;
    setSyncStatus({ msg: 'Downloading...', type: 'neutral' });
    const data = await loadFromDrive(activeUniverseId);
    if (data) {
      onImport(data);
      setSyncStatus({ msg: 'Loaded from Drive', type: 'success' });
    } else {
      setSyncStatus({ msg: 'Load Failed / File Not Found', type: 'error' });
    }
    setTimeout(() => setSyncStatus(null), 3000);
  };

  return (
    <div className="bg-nexus-900 border border-nexus-800 rounded-3xl p-8 shadow-xl">
      <h2 className="text-lg font-display font-bold text-nexus-text mb-6 flex items-center gap-3">
        <CloudLightning size={20} className="text-nexus-accent" />
        Data Synchronization
      </h2>

      {/* Local Sync */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <button
          onClick={handleExport}
          className="flex flex-col items-center justify-center p-6 bg-nexus-950 border border-nexus-800 rounded-2xl hover:border-nexus-accent hover:text-nexus-accent transition-all group"
        >
          <Upload size={24} className="mb-3 text-nexus-muted group-hover:text-nexus-accent" />
          <span className="text-xs font-black uppercase tracking-widest text-nexus-text">
            Backup IDR
          </span>
          <span className="text-[10px] text-nexus-muted mt-1 opacity-50">Local JSON Export</span>
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center justify-center p-6 bg-nexus-950 border border-nexus-800 rounded-2xl hover:border-nexus-accent hover:text-nexus-accent transition-all group relative overflow-hidden"
        >
          <Download size={24} className="mb-3 text-nexus-muted group-hover:text-nexus-accent" />
          <span className="text-xs font-black uppercase tracking-widest text-nexus-text">
            Restore IDR
          </span>
          <span className="text-[10px] text-nexus-muted mt-1 opacity-50">Local JSON Import</span>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFile}
            className="hidden"
            accept=".json"
          />
        </button>
      </div>

      {/* Cloud Sync (Beta) */}
      {config.features.enableSSO && (
        <div className="pt-6 border-t border-nexus-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-nexus-text flex items-center gap-2">
              <Cloud size={16} className={token ? 'text-nexus-accent' : 'text-nexus-muted'} />
              Cloud Uplink (Beta)
            </h3>
            {token && user && (
              <div className="flex items-center gap-3">
                <span className="text-[10px] bg-green-500/10 text-green-500 px-2 py-1 rounded-full border border-green-500/20 font-mono">
                  CONNECTED: {user.email}
                </span>
                <button
                  onClick={logout}
                  className="p-1 hover:text-red-400 text-nexus-muted transition-colors"
                >
                  <LogOut size={14} />
                </button>
              </div>
            )}
          </div>

          {!token ? (
            <button
              onClick={() => login()}
              className="w-full py-3 bg-nexus-950 border border-nexus-800 hover:bg-white hover:text-black hover:border-white rounded-xl text-sm font-black uppercase tracking-widest transition-all text-nexus-muted flex items-center justify-center gap-2"
            >
              <Cloud size={16} /> Authenticate Google Link
            </button>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleDriveSync}
                  disabled={isSyncing}
                  className="py-3 bg-nexus-accent text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-nexus-accent/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSyncing ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Upload size={14} />
                  )}
                  Push to Cloud
                </button>
                <button
                  onClick={handleDriveLoad}
                  disabled={isSyncing}
                  className="py-3 bg-nexus-950 border border-nexus-800 hover:border-nexus-accent text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSyncing ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Download size={14} />
                  )}
                  Pull from Cloud
                </button>
              </div>
              {syncStatus && (
                <div
                  className={`text-[10px] text-center font-mono py-2 rounded-lg border ${
                    syncStatus.type === 'success'
                      ? 'bg-green-500/10 border-green-500/30 text-green-400'
                      : syncStatus.type === 'error'
                        ? 'bg-red-500/10 border-red-500/30 text-red-400'
                        : 'bg-nexus-800/50 border-nexus-700 text-nexus-muted'
                  }`}
                >
                  {syncStatus.msg}
                </div>
              )}
              <p className="text-[10px] text-nexus-muted text-center opacity-50 font-serif italic">
                Syncs to 'nexus_universe_{activeUniverseId}.json' in App Data
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
