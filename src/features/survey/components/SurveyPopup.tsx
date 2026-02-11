import React, { useEffect, useRef, useState } from 'react';
import { X, Send, MessageSquarePlus } from 'lucide-react';
import gsap from 'gsap';
import { SurveyService, SurveyData } from '../services/surveyService';
import { useAuth } from '../../../core/auth/AuthContext';

const MAX_CHARS = 500;
const STORAGE_KEY = 'ekrixi_survey_completed_v1';

export const SurveyPopup = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const [formData, setFormData] = useState<Omit<SurveyData, 'userId'>>({
    worldBuildingProblems: '',
    chatbotProblems: '',
    chatbotWishes: '',
  });

  useEffect(() => {
    // Check if user has already completed the survey
    const hasCompleted = localStorage.getItem(STORAGE_KEY);
    if (!hasCompleted) {
      // Show after a short delay to not be intrusive immediately
      const timer = setTimeout(() => setIsOpen(true), 15000); // 15 seconds delay
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      const tl = gsap.timeline();
      if (backdropRef.current) {
        tl.to(backdropRef.current, {
          opacity: 1,
          duration: 0.3,
          ease: 'power2.out',
        });
      }
      if (contentRef.current) {
        tl.fromTo(
          contentRef.current,
          {
            scale: 0.9,
            opacity: 0,
            y: 20,
          },
          {
            scale: 1,
            opacity: 1,
            y: 0,
            duration: 0.5,
            ease: 'expo.out',
          },
          '-=0.1',
        );
      }
    }
  }, [isOpen]);

  const handleClose = () => {
    const tl = gsap.timeline({
      onComplete: () => setIsOpen(false),
    });
    if (contentRef.current) {
      tl.to(contentRef.current, {
        scale: 0.9,
        opacity: 0,
        y: 20,
        duration: 0.3,
        ease: 'power2.in',
      });
    }
    if (backdropRef.current) {
      tl.to(
        backdropRef.current,
        {
          opacity: 0,
          duration: 0.2,
          ease: 'power2.in',
        },
        '-=0.1',
      );
    }

    // If closed without submitting, we might want to show it again later?
    // For now, let's treat "closing" as "not interested right now" but not "never again"
    // Unless successful, then we mark as done.
  };

  const handleChange = (field: keyof typeof formData, value: string) => {
    if (value.length <= MAX_CHARS) {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.worldBuildingProblems && !formData.chatbotProblems && !formData.chatbotWishes) {
      return; // Don't submit empty
    }

    setIsSubmitting(true);
    try {
      await SurveyService.submitSurvey({
        ...formData,
        userId: user ? user.uid : 'anonymous',
      });

      // Mark as completed
      localStorage.setItem(STORAGE_KEY, 'true');
      setIsSuccess(true);

      // Auto close after success message
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (error) {
      console.error('Failed to submit survey', error);
      // Ideally show error state
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-nexus-950/80 backdrop-blur-md opacity-0"
        onClick={handleClose}
      />

      {/* Modal Content */}
      <div
        ref={contentRef}
        className="relative w-full max-w-2xl bg-nexus-900 border border-nexus-800 rounded-2xl overflow-hidden shadow-2xl shadow-nexus-accent/10 opacity-0 max-h-[90vh] flex flex-col"
      >
        {isSuccess ? (
          <div className="p-12 flex flex-col items-center justify-center text-center space-y-4 h-full min-h-[400px]">
            <div className="p-4 rounded-full bg-green-500/10 text-green-500 mb-2">
              <Send size={48} />
            </div>
            <h3 className="text-2xl font-display font-bold text-nexus-text">Thank You!</h3>
            <p className="text-nexus-muted max-w-md">
              Your feedback is invaluable in helping us build the ultimate world-building engine.
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-6 border-b border-nexus-800 flex justify-between items-center bg-nexus-900/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-nexus-accent/10 text-nexus-accent">
                  <MessageSquarePlus size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-nexus-text">Help Us Improve Ekrixi</h2>
                  <p className="text-xs text-nexus-muted">
                    Your thoughts shape the future of this tool.
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 rounded-full hover:bg-nexus-800 text-nexus-muted hover:text-nexus-text transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
              <form id="survey-form" onSubmit={handleSubmit} className="space-y-6">
                <SurveyQuestion
                  label="What are your biggest problems with world building?"
                  subLabel="(Put anything you can think of)"
                  value={formData.worldBuildingProblems}
                  onChange={(val) => handleChange('worldBuildingProblems', val)}
                />

                <SurveyQuestion
                  label="What are your biggest problems with chatbots?"
                  subLabel="(Put anything you can think of)"
                  value={formData.chatbotProblems}
                  onChange={(val) => handleChange('chatbotProblems', val)}
                />

                <SurveyQuestion
                  label="What do you wish you could do with chatbots that you can't do right now?"
                  value={formData.chatbotWishes}
                  onChange={(val) => handleChange('chatbotWishes', val)}
                />
              </form>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-nexus-800 bg-nexus-900/50 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-nexus-muted hover:text-nexus-text transition-colors"
              >
                Maybe Later
              </button>
              <button
                type="submit"
                form="survey-form"
                disabled={isSubmitting}
                className="px-6 py-2 bg-nexus-accent hover:bg-nexus-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg transition-all shadow-lg shadow-nexus-accent/20 flex items-center gap-2"
              >
                {isSubmitting ? 'Sending...' : 'Submit Feedback'}
                {!isSubmitting && <Send size={16} />}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const SurveyQuestion = ({
  label,
  subLabel,
  value,
  onChange,
}: {
  label: string;
  subLabel?: string;
  value: string;
  onChange: (val: string) => void;
}) => (
  <div className="space-y-2">
    <label className="block text-sm font-medium text-nexus-text">
      {label}
      {subLabel && (
        <span className="text-nexus-muted ml-1 font-normal opacity-70 block text-xs mt-0.5">
          {subLabel}
        </span>
      )}
    </label>
    <div className="relative">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-24 bg-nexus-950 border border-nexus-800 rounded-xl p-3 text-sm text-nexus-text placeholder-nexus-muted/30 focus:outline-none focus:ring-1 focus:ring-nexus-accent resize-none transition-all"
        placeholder="Type your thoughts here..."
      />
      <div
        className={`absolute bottom-2 right-2 text-[10px] font-medium ${value.length >= MAX_CHARS ? 'text-red-400' : 'text-nexus-muted/50'}`}
      >
        {value.length}/{MAX_CHARS}
      </div>
    </div>
  </div>
);
