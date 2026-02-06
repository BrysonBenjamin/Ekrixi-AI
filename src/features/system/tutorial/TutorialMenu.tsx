import React from 'react';
import { CheckCircle2, PlayCircle, BookOpen } from 'lucide-react';
import { useTutorial } from './useTutorial';
import { TUTORIALS } from './tutorialRegistry';

export const TutorialMenu: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const { startTutorial, completedTutorials } = useTutorial();

  return (
    <div className="bg-nexus-900 border border-nexus-800 rounded-xl shadow-2xl p-4 w-72 animate-in fade-in zoom-in-95 duration-200">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-nexus-800">
        <BookOpen className="text-nexus-accent w-5 h-5" />
        <h3 className="font-bold text-nexus-text">Interactive Tutorials</h3>
      </div>

      <div className="space-y-2">
        {Object.values(TUTORIALS).map((tutorial) => {
          const isCompleted = completedTutorials.includes(tutorial.id);

          return (
            <button
              key={tutorial.id}
              onClick={() => {
                startTutorial(tutorial.id);
                onClose?.();
              }}
              className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-nexus-800 transition-colors text-left group"
            >
              <div
                className={`mt-0.5 ${isCompleted ? 'text-green-500' : 'text-nexus-muted group-hover:text-nexus-accent'}`}
              >
                {isCompleted ? <CheckCircle2 size={16} /> : <PlayCircle size={16} />}
              </div>
              <div>
                <div className="text-sm font-medium text-nexus-text group-hover:text-white transition-colors">
                  {tutorial.title}
                </div>
                <div className="text-xs text-nexus-muted mt-0.5 line-clamp-2">
                  {tutorial.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
