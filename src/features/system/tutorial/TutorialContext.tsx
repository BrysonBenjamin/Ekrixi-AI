import React, { createContext, useState, useCallback, useEffect, useRef } from 'react';
import { driver, Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { TUTORIALS } from './tutorialRegistry';

interface TutorialContextType {
  activeTutorial: string | null;
  startTutorial: (tutorialId: string) => void;
  stopTutorial: () => void;
  completedTutorials: string[];
  isTutorialActive: boolean;
}

export const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

export const TutorialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTutorial, setActiveTutorial] = useState<string | null>(null);
  const [completedTutorials, setCompletedTutorials] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('ekrixi_completed_tutorials');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const driverRef = useRef<Driver | null>(null);

  // Initialize driver on mount
  useEffect(() => {
    const dri = driver({
      animate: true,
      showProgress: true,
      allowClose: true,
      doneBtnText: 'Done',
      nextBtnText: 'Next',
      prevBtnText: 'Previous',
      onDestroyStarted: () => {
        setActiveTutorial(null);
      },
    });
    driverRef.current = dri;

    return () => {
      if (driverRef.current) {
        driverRef.current.destroy();
      }
    };
  }, []);

  // Persist completed tutorials
  useEffect(() => {
    localStorage.setItem('ekrixi_completed_tutorials', JSON.stringify(completedTutorials));
  }, [completedTutorials]);

  const stopTutorial = useCallback(() => {
    if (driverRef.current) {
      driverRef.current.destroy();
      setActiveTutorial(null);
    }
  }, []);

  const startTutorial = useCallback(
    (tutorialId: string) => {
      const tutorial = TUTORIALS[tutorialId];
      if (!tutorial || !driverRef.current) return;

      setActiveTutorial(tutorialId);

      // Configure driver for this specific tutorial
      driverRef.current.setConfig({
        steps: tutorial.steps,
        onDestroyStarted: () => {
          if (!completedTutorials.includes(tutorialId)) {
            setCompletedTutorials((prev) => [...prev, tutorialId]);
          }
          setActiveTutorial(null);
          driverRef.current?.destroy(); // Ensure text is cleared
        },
      });

      driverRef.current.drive();
    },
    [completedTutorials],
  );

  return (
    <TutorialContext.Provider
      value={{
        activeTutorial,
        startTutorial,
        stopTutorial,
        completedTutorials,
        isTutorialActive: !!activeTutorial,
      }}
    >
      {children}
    </TutorialContext.Provider>
  );
};
