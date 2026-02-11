import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../core/firebase';

const COLLECTION_NAME = 'user_surveys';

export interface SurveyData {
  worldBuildingProblems: string;
  chatbotProblems: string;
  chatbotWishes: string;
  userId?: string; // Optional, can be anonymous
}

export const SurveyService = {
  submitSurvey: async (data: SurveyData): Promise<void> => {
    try {
      await addDoc(collection(db, COLLECTION_NAME), {
        ...data,
        createdAt: serverTimestamp(),
        platform: 'web',
      });
    } catch (error) {
      console.error('Error submitting survey:', error);
      throw error;
    }
  },
};
