import React from 'react';
import {
  Layers,
  Compass,
  ChevronRight,
  BookOpen,
  ListTree,
  Sword,
  Anchor,
  RefreshCw,
  Trophy,
  Target,
  Cpu,
  Sparkles,
  Flame,
} from 'lucide-react';
import {
  NexusObject,
  NexusCategory,
  ContainmentType,
  HierarchyType,
  isContainer,
  isLink,
  DefaultLayout,
} from '../../types';
import { generateId } from '../../utils/ids';
import { Logo } from '../../components/shared/Logo';
import { useLLM } from '../system/hooks/useLLM';
import { GEMINI_MODELS } from '../../core/llm';
import { SchemaType } from '@google/generative-ai';

interface ManuscriptAnalyzerFeatureProps {
  onCommitBatch: (items: NexusObject[]) => void;
}

type Mode = 'PLANNING' | 'EXTRACTION';
type AnalysisStage = 'IDLE' | 'ANALYZING' | 'RESULT';
type TheoryTemplate = 'THREE_ACT' | 'HERO_JOURNEY' | 'SAVE_CAT' | 'FICHTEAN';

interface TemplateInfo {
  id: TheoryTemplate;
  title: string;
  desc: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

interface TheoryUnit {
  title: string;
  type: string;
  gist: string;
  theory_beat: string;
  parent_title?: string;
}

interface TheoryResponse {
  units: TheoryUnit[];
}

const TEMPLATES: TemplateInfo[] = [
  {
    id: 'THREE_ACT',
    title: 'Three-Act Structure',
    desc: 'The classic Setup, Confrontation, and Resolution arc.',
    icon: Anchor,
  },
  {
    id: 'HERO_JOURNEY',
    title: "The Hero's Journey",
    desc: "Monomyth approach based on Joseph Campbell's theory.",
    icon: Sword,
  },
  {
    id: 'SAVE_CAT',
    title: 'Save the Cat!',
    desc: '15 beats focusing on pacing and audience engagement.',
    icon: Trophy,
  },
  {
    id: 'FICHTEAN',
    title: 'Fichtean Curve',
    desc: 'High-tension structure moving from crisis to crisis.',
    icon: Target,
  },
];

const safeParseJson = <T,>(text: string, fallback: T): T => {
  try {
    const cleaned = text
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();
    return JSON.parse(cleaned);
  } catch (e) {
    return fallback;
  }
};

export const ManuscriptAnalyzerFeature: React.FC<ManuscriptAnalyzerFeatureProps> = ({
  onCommitBatch,
}) => {
  const { generateContent } = useLLM();
  const [mode, setMode] = React.useState<Mode>('PLANNING');
  const [selectedTemplate, setSelectedTemplate] = React.useState<TheoryTemplate>('THREE_ACT');
  const [stage, setStage] = React.useState<AnalysisStage>('IDLE');
  const [ideaSeed, setIdeaSeed] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [blueprint, setBlueprint] = React.useState<NexusObject[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const handleGenerateBlueprint = async () => {
    if (!ideaSeed.trim()) return;
    setStage('ANALYZING');
    setError(null);

    try {
      setStatus(`Mapping '${ideaSeed.slice(0, 20)}...' to ${selectedTemplate} beats...`);
      const theoryResponse = await generateContent({
        model: GEMINI_MODELS.PRO,
        systemInstruction: `You are the 'Ekrixi AI Dramatist'. Your task is to use the ${selectedTemplate} literary theory to build a top-down book structure.
                1. Create Macro Plot Arcs based on the theory beats.
                2. Nest 3-4 Chapters in each Arc.
                3. Nest 2-3 Scenes in each Chapter.
                4. Identify 3 'Thematic Pillars' (CONCEPT notes) that resonate throughout.`,
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: SchemaType.OBJECT,
            properties: {
              units: {
                type: SchemaType.ARRAY,
                items: {
                  type: SchemaType.OBJECT,
                  properties: {
                    title: { type: SchemaType.STRING },
                    type: {
                      type: SchemaType.STRING,
                      description: 'ARC, CHAPTER, SCENE, or THEME',
                    },
                    gist: { type: SchemaType.STRING },
                    theory_beat: {
                      type: SchemaType.STRING,
                      description:
                        "Which part of the theory this unit represents (e.g., 'Incite Incident').",
                    },
                    parent_title: {
                      type: SchemaType.STRING,
                      description: 'Title of the parent unit.',
                    },
                  },
                  required: ['title', 'type', 'gist', 'theory_beat'],
                },
              },
            },
            required: ['units'],
          },
        },
        contents: [{ role: 'user', parts: [{ text: `IDEA SEED: ${ideaSeed}` }] }],
      });

      const result = await theoryResponse.response;
      const theoryData = safeParseJson<TheoryResponse>(result.text() || '{"units": []}', {
        units: [],
      });

      setStatus('Forging the structural blueprint...');
      const finalItems: NexusObject[] = [];
      const titleToId: Record<string, string> = {};
      const now = new Date().toISOString();

      theoryData.units.forEach((u) => {
        const id = generateId();
        titleToId[u.title] = id;
        const isC = u.type === 'ARC' || u.type === 'CHAPTER';

        const node: NexusObject = {
          id,
          _type: isC ? 'CONTAINER_NOTE' : 'SIMPLE_NOTE',
          title: u.title,
          gist: u.gist,
          category_id:
            u.type === 'ARC'
              ? NexusCategory.EVENT
              : u.type === 'THEME'
                ? NexusCategory.CONCEPT
                : NexusCategory.META,
          tags: [u.type, u.theory_beat],
          created_at: now,
          last_modified: now,
          link_ids: [],
          internal_weight: 1.0,
          total_subtree_mass: 0,
          aliases: [],
          prose_content: '',
          is_ghost: false,
        } as NexusObject;

        if (isC && node._type === 'CONTAINER_NOTE') {
          node.children_ids = [];
          node.containment_type =
            u.type === 'ARC' ? ContainmentType.PLOT_ARC : ContainmentType.FOLDER;
          node.is_collapsed = false;
          node.default_layout = u.type === 'ARC' ? DefaultLayout.TIMELINE : DefaultLayout.GRID;
        }

        finalItems.push(node);
      });

      theoryData.units.forEach((u) => {
        const currentId = titleToId[u.title];
        if (u.parent_title && titleToId[u.parent_title] && currentId) {
          const pId = titleToId[u.parent_title];
          const parent = finalItems.find((i) => i.id === pId);
          if (parent && 'children_ids' in parent && parent.children_ids) {
            parent.children_ids.push(currentId);
          }

          finalItems.push({
            id: generateId(),
            _type: 'HIERARCHICAL_LINK',
            source_id: pId,
            target_id: currentId,
            verb: 'contains',
            verb_inverse: 'part of',
            hierarchy_type: HierarchyType.PARENT_OF,
            created_at: now,
            last_modified: now,
            link_ids: [],
            internal_weight: 1.0,
            total_subtree_mass: 0,
          } as NexusObject);
        }

        if (u.type === 'THEME') {
          const scenes = finalItems
            .filter((i) => 'tags' in i && i.tags?.includes('SCENE'))
            .slice(0, 3);
          scenes.forEach((scene) => {
            finalItems.push({
              id: generateId(),
              _type: 'SEMANTIC_LINK',
              source_id: scene.id,
              target_id: currentId,
              verb: 'embodies',
              verb_inverse: 'manifested by',
              created_at: now,
              last_modified: now,
              link_ids: [],
              internal_weight: 1.0,
              total_subtree_mass: 0,
            } as NexusObject);
          });
        }
      });

      setBlueprint(finalItems);
      setStage('RESULT');
    } catch (err) {
      console.error(err);
      const errorMessage =
        err instanceof Error ? err.message : 'Ekrixi AI encountered a creative block.';
      setError(errorMessage);
      setStage('IDLE');
    }
  };

  return (
    <div className="flex flex-col h-full bg-nexus-950 font-sans text-nexus-text">
      <header className="h-20 border-b border-nexus-800 bg-nexus-900/50 backdrop-blur-md flex items-center px-10 justify-between shrink-0 z-30 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-nexus-accent/10 rounded-xl border border-nexus-accent/30 flex items-center justify-center">
            <Logo size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-display font-black text-nexus-text tracking-tighter uppercase">
              Ekrixi <span className="text-nexus-accent">AI Blueprint</span>
            </h1>
            <p className="text-[10px] text-nexus-muted font-mono uppercase tracking-[0.3em]">
              Theoretical Drafting Core v5.0
            </p>
          </div>
        </div>

        {stage === 'RESULT' ? (
          <div className="flex items-center gap-6">
            <button
              onClick={() => setStage('IDLE')}
              className="text-[10px] font-black text-nexus-muted hover:text-nexus-text uppercase tracking-widest px-4 py-2 flex items-center gap-2 group"
            >
              <RefreshCw
                size={12}
                className="group-hover:rotate-180 transition-transform duration-500"
              />
              Discard & Re-Plan
            </button>
            <button
              onClick={() => onCommitBatch(blueprint)}
              className="bg-nexus-accent text-white px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:brightness-110 transition-all shadow-xl shadow-nexus-accent/20"
            >
              Export Structure <ChevronRight size={14} />
            </button>
          </div>
        ) : (
          <div className="flex bg-nexus-950 border border-nexus-800 rounded-full p-1 shadow-inner">
            <button
              onClick={() => setMode('PLANNING')}
              className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${mode === 'PLANNING' ? 'bg-nexus-accent text-white shadow-lg' : 'text-nexus-muted hover:text-nexus-text'}`}
            >
              Structure Focus
            </button>
            <button
              onClick={() => setMode('EXTRACTION')}
              className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${mode === 'EXTRACTION' ? 'bg-nexus-accent text-white shadow-lg' : 'text-nexus-muted hover:text-nexus-text'}`}
            >
              Extract Logic
            </button>
          </div>
        )}
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar p-8 md:p-12 bg-nexus-950">
        <div className="max-w-6xl mx-auto h-full">
          {stage === 'IDLE' && mode === 'PLANNING' && (
            <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-8 duration-1000">
              <div className="mb-12 space-y-4 text-center">
                <h2 className="text-4xl font-display font-black text-nexus-text tracking-tight uppercase">
                  The Dramatist's Ledger
                </h2>
                <p className="text-nexus-muted text-lg font-serif italic leading-relaxed max-w-3xl mx-auto">
                  "Seed a single premise. Select a narrative frame. Ekrixi AI will manifest a
                  hierarchical sequence of arcs, chapters, and thematic anchors."
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTemplate(t.id)}
                    className={`
                                            p-6 rounded-3xl border text-left transition-all group
                                            ${
                                              selectedTemplate === t.id
                                                ? 'bg-nexus-accent/5 border-nexus-accent shadow-lg shadow-nexus-accent/5'
                                                : 'bg-nexus-900 border-nexus-800 hover:border-nexus-700'
                                            }
                                        `}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl mb-4 flex items-center justify-center border transition-all ${selectedTemplate === t.id ? 'bg-nexus-accent text-white' : 'bg-nexus-950 border-nexus-800 text-nexus-muted group-hover:text-nexus-text'}`}
                    >
                      <t.icon size={20} />
                    </div>
                    <h3
                      className={`text-xs font-display font-black uppercase tracking-widest mb-2 transition-colors ${selectedTemplate === t.id ? 'text-nexus-accent' : 'text-nexus-text'}`}
                    >
                      {t.title}
                    </h3>
                    <p className="text-[10px] text-nexus-muted leading-relaxed font-serif italic">
                      {t.desc}
                    </p>
                  </button>
                ))}
              </div>

              <div className="flex-1 relative group mb-8 min-h-[250px]">
                <div className="absolute -inset-1 bg-gradient-to-br from-nexus-accent/20 to-transparent rounded-[40px] blur opacity-10 group-focus-within:opacity-30 transition-all" />
                <textarea
                  value={ideaSeed}
                  onChange={(e) => setIdeaSeed(e.target.value)}
                  placeholder="Describe your mythos... 'A space-western where water is the only currency and a rogue pilot finds a map to an ocean planet.'"
                  className="relative w-full h-full bg-nexus-900 border border-nexus-800 rounded-[40px] p-10 text-nexus-text text-xl leading-relaxed outline-none focus:border-nexus-accent transition-all resize-none no-scrollbar placeholder:text-nexus-muted/40 font-serif"
                />
              </div>

              <button
                onClick={handleGenerateBlueprint}
                disabled={!ideaSeed.trim()}
                className={`
                                    h-20 rounded-[32px] font-display font-black text-xs uppercase tracking-[0.5em] flex items-center justify-center gap-5 transition-all
                                    ${
                                      ideaSeed.trim()
                                        ? 'bg-nexus-accent text-white hover:brightness-110 shadow-[0_0_40px_rgba(6,182,212,0.2)] active:scale-[0.98]'
                                        : 'bg-nexus-900 text-nexus-muted border border-nexus-800 cursor-not-allowed'
                                    }
                                `}
              >
                <Sparkles size={20} />
                Initiate Synthesis
              </button>
            </div>
          )}

          {stage === 'ANALYZING' && (
            <div className="h-full flex flex-col items-center justify-center animate-in fade-in duration-700">
              <div className="relative mb-16">
                <div className="absolute inset-0 bg-nexus-accent/20 rounded-full blur-[100px] animate-pulse" />
                <div className="relative w-48 h-48 rounded-[56px] bg-nexus-900 border border-nexus-accent/30 flex items-center justify-center shadow-2xl overflow-hidden">
                  <Logo size={128} />
                </div>
                <div className="absolute -top-4 -right-4 w-16 h-16 rounded-[28px] bg-nexus-950 border border-nexus-800 flex items-center justify-center animate-bounce shadow-xl">
                  <Target size={24} className="text-nexus-accent" />
                </div>
              </div>
              <div className="max-w-md w-full space-y-8 text-center">
                <h2 className="text-3xl font-display font-black text-nexus-text tracking-widest uppercase animate-pulse">
                  {status}
                </h2>
                <div className="relative h-1.5 w-full bg-nexus-900 rounded-full overflow-hidden border border-nexus-800 shadow-inner">
                  <div className="absolute inset-0 bg-nexus-accent animate-progress-flow w-1/2" />
                </div>
                <div className="flex justify-between px-2 text-[8px] font-mono text-nexus-muted font-bold uppercase tracking-widest">
                  <span>BEAT_MAP</span>
                  <span>HIERARCHY_FORGE</span>
                  <span>THEME_SYNC</span>
                </div>
              </div>
            </div>
          )}

          {stage === 'RESULT' && (
            <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-6 duration-700">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <StatBox
                  label="Narrative Arcs"
                  val={blueprint.filter((i) => (i as any).tags?.includes('ARC')).length}
                />
                <StatBox
                  label="Chapters Planned"
                  val={blueprint.filter((i) => (i as any).tags?.includes('CHAPTER')).length}
                />
                <StatBox
                  label="Thematic Pillars"
                  val={blueprint.filter((i) => (i as any).tags?.includes('THEME')).length}
                />
              </div>

              <div className="flex-1 bg-nexus-900 border border-nexus-800 rounded-[40px] p-10 overflow-y-auto no-scrollbar shadow-2xl">
                <h3 className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-[0.5em] mb-12 flex items-center gap-3">
                  <ListTree size={16} className="text-nexus-accent" /> Ekrixi Logic Skeleton
                </h3>

                <div className="space-y-12">
                  {blueprint
                    .filter((i) => !isLink(i) && (i as any).tags?.includes('ARC'))
                    .map((arc) => (
                      <div key={arc.id} className="space-y-8">
                        <div className="flex items-center gap-6 group">
                          <div className="w-16 h-16 rounded-2xl bg-nexus-accent/5 border border-nexus-accent/30 flex items-center justify-center text-nexus-accent shadow-sm group-hover:scale-105 transition-transform">
                            <Layers size={28} />
                          </div>
                          <div>
                            <h4 className="text-2xl font-display font-black text-nexus-text uppercase tracking-tight group-hover:text-nexus-accent transition-colors">
                              {(arc as any).title}
                            </h4>
                            <p className="text-[10px] text-nexus-muted font-mono uppercase tracking-[0.2em] mt-1">
                              THEORY_BEAT: {(arc as any).tags?.[1]}
                            </p>
                          </div>
                        </div>

                        <div className="ml-0 lg:ml-20 grid grid-cols-1 md:grid-cols-2 gap-4">
                          {blueprint
                            .filter(
                              (i) =>
                                !isLink(i) &&
                                (i as any).tags?.includes('CHAPTER') &&
                                blueprint.some(
                                  (l) =>
                                    isLink(l) && l.source_id === arc.id && l.target_id === i.id,
                                ),
                            )
                            .map((ch) => (
                              <div
                                key={ch.id}
                                className="bg-nexus-950/50 border border-nexus-800 rounded-3xl p-6 hover:border-nexus-accent/40 hover:bg-nexus-950 transition-all group/ch shadow-sm"
                              >
                                <div className="flex items-center gap-3 mb-4">
                                  <BookOpen
                                    size={16}
                                    className="text-nexus-muted group-hover/ch:text-nexus-accent"
                                  />
                                  <h5 className="text-sm font-display font-bold text-nexus-text uppercase">
                                    {(ch as any).title}
                                  </h5>
                                </div>
                                <p className="text-[11px] text-nexus-muted italic font-serif leading-relaxed line-clamp-2">
                                  "{(ch as any).gist}"
                                </p>

                                <div className="mt-4 pt-4 border-t border-nexus-800 flex flex-wrap gap-2">
                                  {blueprint
                                    .filter(
                                      (i) =>
                                        !isLink(i) &&
                                        (i as any).tags?.includes('SCENE') &&
                                        blueprint.some(
                                          (l) =>
                                            isLink(l) &&
                                            l.source_id === ch.id &&
                                            l.target_id === i.id,
                                        ),
                                    )
                                    .map((sc) => (
                                      <span
                                        key={sc.id}
                                        className="px-2 py-1 bg-nexus-900 border border-nexus-800 rounded text-[8px] font-mono text-nexus-muted uppercase tracking-widest font-bold"
                                      >
                                        {(sc as any).title}
                                      </span>
                                    ))}
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    ))}
                </div>

                <div className="mt-20 pt-10 border-t border-nexus-800/50">
                  <h3 className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-[0.5em] mb-8">
                    Thematic Foundations
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {blueprint
                      .filter((i) => !isLink(i) && (i as any).tags?.includes('THEME'))
                      .map((theme) => (
                        <div
                          key={theme.id}
                          className="p-8 bg-nexus-accent/5 border border-nexus-accent/10 rounded-[32px] flex items-start gap-4 shadow-sm hover:border-nexus-accent/30 transition-all"
                        >
                          <Flame size={20} className="text-nexus-accent shrink-0" />
                          <div>
                            <h4 className="text-sm font-display font-black text-nexus-text uppercase tracking-wider">
                              {(theme as any).title}
                            </h4>
                            <p className="text-[10px] text-nexus-muted font-serif italic mt-2">
                              "{(theme as any).gist}"
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <style>{`
                @keyframes progress-flow {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                .animate-progress-flow {
                    animation: progress-flow 2s infinite linear;
                }
            `}</style>
    </div>
  );
};

const StatBox = ({ label, val }: { label: string; val: number }) => (
  <div className="bg-nexus-900 border border-nexus-800 rounded-[32px] p-6 hover:border-nexus-accent/30 transition-all group shadow-sm">
    <div className="text-[10px] font-display font-black text-nexus-muted uppercase tracking-widest mb-1 group-hover:text-nexus-accent transition-colors">
      {label}
    </div>
    <div className="text-4xl font-display font-black text-nexus-text tracking-tighter">{val}</div>
  </div>
);
