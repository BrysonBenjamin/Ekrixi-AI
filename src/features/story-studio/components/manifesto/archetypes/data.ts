import {
  Milestone,
  Zap,
  Scale,
  Flame,
  Compass,
  Target,
  ShieldCheck,
  Repeat,
  Trophy,
  List,
  Snowflake,
  GitMerge,
  History,
  Eye,
  Archive,
  Crown,
} from 'lucide-react';
import { LiteraryArchetype } from '../../../types';

export const LITERARY_ARCHETYPES: LiteraryArchetype[] = [
  {
    id: 'THREE_ACT',
    label: 'Three-Act Structure',
    type: 'Linear',
    icon: Milestone,
    desc: 'Traditional Setup, Confrontation, and Resolution.',
    hook: 'The gold standard for commercial fiction and screenplays.',
    slides: [
      {
        title: 'The Status Quo & Inciting Incident',
        content:
          'Act I establishes the normal world before a disruptive event—the Inciting Incident—propels the protagonist out of their comfort zone into the main conflict.',
        icon: Zap,
        visual: 'THREE_ACT_1',
      },
      {
        title: 'The Midpoint Reversal',
        content:
          'Act II is the confrontation. At the Midpoint, the protagonist shifts from reacting to the conflict to taking proactive control, often following a major revelation or high-stakes shift.',
        icon: Scale,
        visual: 'THREE_ACT_2',
      },
      {
        title: 'Climax & Resolution',
        content:
          'Act III brings the tension to a peak. The protagonist faces their greatest challenge, resulting in a final resolution that establishes a new, transformed Status Quo.',
        icon: Flame,
        visual: 'THREE_ACT_3',
      },
    ],
  },
  {
    id: 'HERO_JOURNEY',
    label: "Hero's Journey",
    type: 'Linear',
    icon: Compass,
    desc: 'The monomyth arc of departure, initiation, and return.',
    hook: 'Best for mythic adventures and internal character growth.',
    slides: [
      {
        title: 'Crossing the Threshold',
        content:
          'The hero leaves the Ordinary World for the Special World. This transition marks the point of no return where the rules of reality change.',
        icon: Target,
        visual: 'HERO_1',
      },
      {
        title: 'The Ordeal & Abyss',
        content:
          'Deep within the Special World, the hero faces their shadow self or greatest fear. They must undergo a symbolic death and rebirth to gain the power needed to win.',
        icon: ShieldCheck,
        visual: 'HERO_2',
      },
      {
        title: 'The Master of Two Worlds',
        content:
          "The hero returns with the 'Boon', having integrated the lessons of the journey. They now possess the wisdom to navigate both their old life and the new reality.",
        icon: Repeat,
        visual: 'HERO_3',
      },
    ],
  },
  {
    id: 'SAVE_CAT',
    label: 'Save the Cat!',
    type: 'Linear',
    icon: Trophy,
    desc: '15 beats optimized for pacing and engagement.',
    hook: 'Ensures high audience resonance via specific emotional beats.',
    slides: [
      {
        title: 'The 15 Beats',
        content:
          "A specific sequence from 'Opening Image' to 'Final Image' designed for commercial success.",
        icon: List,
        visual: 'CAT_1',
      },
    ],
  },
  {
    id: 'SNOWFLAKE',
    label: 'Snowflake Method',
    type: 'Expansionist',
    icon: Snowflake,
    desc: 'Fractal growth starting from a single sentence.',
    hook: 'Perfect for deep architects who build complexity through iteration.',
    slides: [
      {
        title: 'Iterative Design',
        content:
          'Start with one sentence, then one paragraph, then character bios, expanding fractal-style.',
        icon: Snowflake,
        visual: 'SNOW_1',
      },
    ],
  },
  {
    id: 'PARALLEL',
    label: 'Parallel Timelines',
    type: 'Nonlinear',
    icon: GitMerge,
    desc: 'Two or more concurrent arcs running in separate eras.',
    hook: 'Creates deep thematic irony and reveals causality over time.',
    slides: [
      {
        title: 'Thematic Mirroring',
        content: 'Events in the past directly reflect or influence the present arc.',
        icon: Repeat,
        visual: 'PARALLEL_1',
      },
    ],
  },
  {
    id: 'BRAIDED',
    label: 'Braided Narrative',
    type: 'Nonlinear',
    icon: GitMerge,
    desc: 'Multiple POV strands interweaving until a single nexus.',
    hook: 'Ideal for large ensemble casts and global-scale events.',
    slides: [
      {
        title: 'Converging Paths',
        content: 'Separate stories that seem unrelated until they collide in a final act.',
        icon: GitMerge,
        visual: 'BRAID_1',
      },
    ],
  },
  {
    id: 'REVERSE',
    label: 'Reverse Chronology',
    type: 'Nonlinear',
    icon: History,
    desc: 'Narrative starts at the end and moves to the beginning.',
    hook: 'Swaps "What happens?" for "How did this happen?".',
    slides: [
      {
        title: 'Causal Retracing',
        content: 'Moving backward through time to find the original spark of conflict.',
        icon: History,
        visual: 'REVERSE_1',
      },
    ],
  },
  {
    id: 'RASHOMON',
    label: 'Rashomon Effect',
    type: 'Nonlinear',
    icon: Target,
    desc: 'One core event seen through multiple subjective lenses.',
    hook: 'Explores the fallibility of memory and truth.',
    slides: [
      {
        title: 'Subjective Truth',
        content: 'The same event told differently by characters with conflicting biases.',
        icon: Eye,
        visual: 'RASH_1',
      },
    ],
  },
  {
    id: 'EPISTOLARY',
    label: 'Epistolary / Fragmented',
    type: 'Non-Traditional',
    icon: Archive,
    desc: 'Story told via documents, logs, and found fragments.',
    hook: 'High immersion through "found footage" logic.',
    slides: [
      {
        title: 'Fragmented Reality',
        content: 'Constructing truth from letters, emails, and logs.',
        icon: Archive,
        visual: 'EPISTLE_1',
      },
    ],
  },
  {
    id: 'TRAGEDY',
    label: 'Greek Tragedy',
    type: 'Classical',
    icon: Crown,
    desc: 'The fall of a high-status protagonist due to a fatal flaw.',
    hook: 'Powerfully explores hubris, fate, and irreversible loss.',
    slides: [
      {
        title: 'The Fatal Flaw',
        content: 'Hamartia leads to a tragic reversal of fortune.',
        icon: Crown,
        visual: 'TRAGEDY_1',
      },
    ],
  },
];
