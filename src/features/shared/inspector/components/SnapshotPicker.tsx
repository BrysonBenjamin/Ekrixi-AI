import React, { useMemo, useState } from 'react';
import { History, Calendar, Check, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { TimeDimensionService } from '../../../../core/services/TimeDimensionService';
import { NexusObject, NexusNote } from '../../../../types';
import { getTimeState, formatTemporalRange } from '../../../../core/utils/nexus-accessors';

interface SnapshotPickerProps {
  baseNodeId: string;
  selectedSnapshotId?: string;
  registry: Record<string, NexusObject>;
  onSelect: (snapshotId: string | undefined) => void;
  label: string;
}

export const SnapshotPicker: React.FC<SnapshotPickerProps> = ({
  baseNodeId,
  selectedSnapshotId,
  registry,
  onSelect,
  label,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  const snapshots = useMemo(() => {
    return TimeDimensionService.getTimeStack(registry, baseNodeId);
  }, [baseNodeId, registry]);

  const selectedSnapshot = snapshots.find((s) => s.id === selectedSnapshotId);

  const filteredSnapshots = useMemo(() => {
    if (!searchTerm) return snapshots;
    return snapshots.filter((s) => {
      const ts = getTimeState(s);
      return (
        ts?.effective_date?.year?.toString().includes(searchTerm) ||
        (s as NexusNote).title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [snapshots, searchTerm]);

  const formatDate = (note: NexusNote) => {
    const ts = getTimeState(note);
    return formatTemporalRange(ts?.effective_date, ts?.valid_until, 'Base Concept (Timeless)');
  };

  const handleOpen = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
      });
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className="space-y-1 relative group">
      <label className="text-[7px] font-mono font-bold text-nexus-muted/60 uppercase ml-1">
        {label}
      </label>
      <div>
        <button
          ref={buttonRef}
          onClick={handleOpen}
          className={`w-full bg-nexus-900/50 border border-nexus-800 rounded-lg px-3 py-2 flex items-center justify-between text-[10px] hover:border-nexus-accent/30 transition-colors ${isOpen ? 'ring-1 ring-nexus-accent/30 border-nexus-accent/30' : ''}`}
        >
          <div className="flex items-center gap-2 truncate">
            <History
              size={12}
              className={selectedSnapshotId ? 'text-nexus-accent' : 'text-nexus-muted'}
            />
            <span
              className={`font-mono truncate ${selectedSnapshotId ? 'text-nexus-text' : 'text-nexus-muted'}`}
            >
              {selectedSnapshot ? formatDate(selectedSnapshot) : 'Base Concept (Timeless)'}
            </span>
          </div>
          {isOpen ? (
            <ChevronUp size={12} className="opacity-50" />
          ) : (
            <ChevronDown size={12} className="opacity-50" />
          )}
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-[998]" onClick={() => setIsOpen(false)} />
            <div
              className="fixed z-[999] bg-nexus-950 border border-nexus-800 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] p-2 animate-in fade-in zoom-in-95 duration-200"
              style={{
                top: coords.top,
                left: coords.left,
                width: Math.max(coords.width, 200),
              }}
            >
              <div className="relative mb-2">
                <Search
                  size={10}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-nexus-muted"
                />
                <input
                  autoFocus
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filter by era..."
                  className="w-full bg-nexus-900 border border-nexus-800 rounded-lg py-1.5 pl-7 pr-2 text-[9px] text-nexus-text outline-none focus:border-nexus-accent placeholder:text-nexus-muted/50"
                />
              </div>

              <div className="max-h-[160px] overflow-y-auto space-y-1 no-scrollbar">
                <button
                  onClick={() => {
                    onSelect(undefined);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-all ${
                    !selectedSnapshotId
                      ? 'bg-nexus-accent/10 text-nexus-accent'
                      : 'hover:bg-nexus-900 text-nexus-muted'
                  }`}
                >
                  <div className="w-6 h-6 rounded-md bg-nexus-900 border border-nexus-800 flex items-center justify-center shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-nexus-muted opacity-50" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[9px] font-maven font-bold">Base Concept</div>
                    <div className="text-[7px] opacity-40 uppercase tracking-wide">Timeless</div>
                  </div>
                  {!selectedSnapshotId && <Check size={10} />}
                </button>

                <div className="h-px bg-nexus-800/50 my-1 mx-2" />

                {filteredSnapshots.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      onSelect(s.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-all ${
                      s.id === selectedSnapshotId
                        ? 'bg-nexus-accent/10 text-nexus-accent ring-1 ring-nexus-accent/20'
                        : 'hover:bg-nexus-900 text-nexus-text'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-md bg-nexus-900 border border-nexus-800 flex items-center justify-center shrink-0 text-nexus-muted">
                      <Calendar size={10} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[9px] font-mono font-bold truncate">{formatDate(s)}</div>
                      <div className="text-[7px] opacity-40 truncate">
                        {s.gist?.slice(0, 25) || 'No gist recorded'}
                        {s.gist?.length > 25 ? '...' : ''}
                      </div>
                    </div>
                    {s.id === selectedSnapshotId && <Check size={10} />}
                  </button>
                ))}

                {filteredSnapshots.length === 0 && (
                  <div className="p-3 text-center text-[9px] text-nexus-muted opacity-50 italic">
                    No snapshots found
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
