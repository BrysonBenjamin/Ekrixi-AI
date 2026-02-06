import React, { useState } from 'react';
import { Globe, Plus, Trash2, CheckCircle, FolderOpen, ArrowRight, X } from 'lucide-react';
import { useSessionStore } from '../../../store/useSessionStore';
import { useRegistryStore } from '../../../store/useRegistryStore';

export const UniverseSwitcher = () => {
  const { universes, activeUniverseId, createUniverse, setActiveUniverse, deleteUniverse } =
    useSessionStore();
  const { loadUniverse } = useRegistryStore();
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const id = createUniverse(newName, 'New Exploration');
    setActiveUniverse(id); // Set session active
    loadUniverse(id); // Hydrate registry

    setNewName('');
    setIsCreating(false);
  };

  const handleSwitch = (id: string) => {
    if (activeUniverseId === id) return;
    setActiveUniverse(id);
    loadUniverse(id);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (universes.length <= 1) return;

    if (deleteConfirmId === id) {
      // Actually delete
      deleteUniverse(id);
      // If we deleted the active one, the store handles switching active ID, but we need to hydrate it
      // We can't easily allow sync here without a bit of tricky logic.
      // Safest: reload page or use an effect.
      // For now, let's assume the session store updating activeUniverseId triggers the App.tsx effect!
      setDeleteConfirmId(null);
    } else {
      setDeleteConfirmId(id);
      setTimeout(() => setDeleteConfirmId(null), 3000);
    }
  };

  return (
    <div className="bg-nexus-900 border border-nexus-800 rounded-3xl p-8 shadow-xl">
      <h2 className="text-lg font-display font-bold text-nexus-text mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Globe size={20} className="text-nexus-accent" />
          Universe Selector
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="p-2 bg-nexus-950 hover:bg-nexus-accent hover:text-white rounded-xl border border-nexus-800 transition-all text-nexus-muted"
        >
          <Plus size={16} />
        </button>
      </h2>

      {isCreating && (
        <form onSubmit={handleCreate} className="mb-6 animate-in slide-in-from-top-2">
          <div className="flex gap-2">
            <input
              autoFocus
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Designation..."
              className="flex-1 bg-nexus-950 border border-nexus-800 rounded-xl px-4 py-2 text-sm text-nexus-text focus:outline-none focus:border-nexus-accent"
            />
            <button type="submit" className="p-2 bg-nexus-accent text-white rounded-xl">
              <ArrowRight size={16} />
            </button>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="p-2 bg-nexus-950 text-nexus-muted rounded-xl hover:text-red-500"
            >
              <X size={16} />
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3 max-h-60 overflow-y-auto no-scrollbar pr-2">
        {universes.map((u) => {
          const isActive = activeUniverseId === u.id;
          const isDeleting = deleteConfirmId === u.id;

          return (
            <div
              key={u.id}
              onClick={() => handleSwitch(u.id)}
              className={`
                                group relative flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer
                                ${
                                  isActive
                                    ? 'bg-nexus-accent/10 border-nexus-accent'
                                    : 'bg-nexus-950/30 border-nexus-800 hover:border-nexus-700 hover:bg-nexus-950'
                                }
                            `}
            >
              <div
                className={`p-2.5 rounded-xl transition-colors ${isActive ? 'bg-nexus-accent text-white' : 'bg-nexus-800 text-nexus-muted'}`}
              >
                <FolderOpen size={18} />
              </div>

              <div className="flex-1 min-w-0">
                <div
                  className={`text-sm font-bold truncate ${isActive ? 'text-nexus-text' : 'text-nexus-muted group-hover:text-nexus-text'}`}
                >
                  {u.name}
                </div>
                <div className="text-[10px] text-nexus-muted uppercase tracking-widest font-mono flex items-center gap-2">
                  {u.nodeCount} ANCHORS •{' '}
                  <span className="opacity-50">{new Date(u.lastActive).toLocaleDateString()}</span>
                </div>
              </div>

              {isActive && <CheckCircle size={16} className="text-nexus-accent shrink-0" />}

              {/* Delete Button (Only visible on hover for non-active, or always if deleting) */}
              {!isActive && universes.length > 1 && (
                <button
                  onClick={(e) => handleDelete(u.id, e)}
                  className={`
                                        opacity-0 group-hover:opacity-100 p-2 rounded-lg transition-all
                                        ${isDeleting ? 'opacity-100 bg-red-500 text-white' : 'hover:bg-red-500/10 hover:text-red-500 text-nexus-muted'}
                                    `}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
