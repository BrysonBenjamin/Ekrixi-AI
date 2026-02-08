import React, { useState } from 'react';
import {
  Globe,
  Plus,
  Trash2,
  CheckCircle,
  FolderOpen,
  ArrowRight,
  X,
  Edit2,
  Save,
} from 'lucide-react';
import { useSessionStore, UniverseMetadata } from '../../../store/useSessionStore';
import { useRegistryStore } from '../../../store/useRegistryStore';

export const UniverseSwitcher = () => {
  const {
    universes,
    activeUniverseId,
    createUniverse,
    setActiveUniverse,
    deleteUniverse,
    updateUniverseMeta,
  } = useSessionStore();

  const { loadUniverse } = useRegistryStore();

  const [isCreating, setIsCreating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [newUniverseName, setNewUniverseName] = useState('');
  const [newUniverseDesc, setNewUniverseDesc] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleCreate = async () => {
    if (!newUniverseName.trim() || isProcessing) return;
    setIsProcessing(true);
    try {
      const id = await createUniverse(newUniverseName, newUniverseDesc);
      setActiveUniverse(id);
      loadUniverse(id);
      setNewUniverseName('');
      setNewUniverseDesc('');
      setIsCreating(false);
    } catch (err) {
      console.error('Failed to create universe:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSwitch = (id: string) => {
    if (activeUniverseId === id || editingId || isProcessing) return;
    setActiveUniverse(id);
    loadUniverse(id);
  };

  const handleStartEdit = (universe: UniverseMetadata, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isProcessing) return;
    setEditingId(universe.id);
    setEditValue(universe.name);
  };

  const handleSaveEdit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (editingId && editValue.trim() && !isProcessing) {
      setIsProcessing(true);
      try {
        await updateUniverseMeta(editingId, { name: editValue.trim() });
        setEditingId(null);
        setEditValue('');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (universes.length <= 1 || isProcessing) return;

    if (deleteConfirmId === id) {
      setIsProcessing(true);
      try {
        await deleteUniverse(id);
        setDeleteConfirmId(null);
      } catch (err) {
        // UI already logs via store, but we reset confirmed state
        setDeleteConfirmId(null);
      } finally {
        setIsProcessing(false);
      }
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
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCreate();
          }}
          className="mb-6 animate-in slide-in-from-top-2"
        >
          <div className="flex gap-2">
            <input
              autoFocus
              type="text"
              value={newUniverseName}
              onChange={(e) => setNewUniverseName(e.target.value)}
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

      <div className="space-y-3 max-h-80 overflow-y-auto no-scrollbar pr-2">
        {universes.map((u) => {
          const isActive = activeUniverseId === u.id;
          const isDeleting = deleteConfirmId === u.id;
          const isEditing = editingId === u.id;

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
                {isEditing ? (
                  <form onSubmit={handleSaveEdit} className="flex gap-2 mb-1">
                    <input
                      autoFocus
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="flex-1 bg-nexus-900 border border-nexus-700 rounded-lg px-2 py-1 text-sm text-nexus-text focus:outline-none"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <button
                      type="submit"
                      className="p-1 text-nexus-accent hover:text-white"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Save size={14} />
                    </button>
                    <button
                      type="button"
                      className="p-1 text-nexus-muted hover:text-red-500"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(null);
                      }}
                    >
                      <X size={14} />
                    </button>
                  </form>
                ) : (
                  <div
                    className={`text-sm font-bold truncate ${isActive ? 'text-nexus-text' : 'text-nexus-muted group-hover:text-nexus-text'}`}
                  >
                    {u.name}
                  </div>
                )}
                <div className="text-[10px] text-nexus-muted uppercase tracking-widest font-mono flex items-center gap-2">
                  <span>{u.nodeCount} ANCHORS</span>
                  <span>•</span>
                  <span>{u.chatCount || 0} CHATS</span>
                  <span>•</span>
                  <span className="opacity-50">
                    {u.lastActive ? new Date(u.lastActive).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {!isEditing && (
                  <button
                    onClick={(e) => handleStartEdit(u, e)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-nexus-muted hover:text-nexus-accent transition-all"
                  >
                    <Edit2 size={14} />
                  </button>
                )}

                {isActive && !isEditing && (
                  <CheckCircle size={16} className="text-nexus-accent shrink-0" />
                )}

                {!isActive && universes.length > 1 && !isEditing && (
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
            </div>
          );
        })}
      </div>
    </div>
  );
};
