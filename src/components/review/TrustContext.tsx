import { createContext, useContext } from 'react';
import type { ProposedEdit } from '@/data/feedback';
export const TrustContext = createContext<{ edits: ProposedEdit[]; feedbackVersion: number; sendFeedback: (edits: ProposedEdit[], example: string) => void }>({ edits: [], feedbackVersion: 0, sendFeedback: () => {} });
export const useTrust = () => useContext(TrustContext);