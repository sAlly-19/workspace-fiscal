import { create } from 'zustand';

export type FeedbackKind = 'success' | 'info' | 'warning' | 'error';

export interface FeedbackInput {
  kind: FeedbackKind;
  title: string;
  message: string;
  technicalDetails?: string;
  durationMs?: number;
}

export interface FeedbackItem extends Omit<FeedbackInput, 'durationMs'> {
  id: string;
  durationMs: number | null;
}

interface UiState {
  feedbackQueue: FeedbackItem[];
  pushFeedback: (input: FeedbackInput) => string;
  dismissFeedback: (id?: string) => void;
}

let feedbackSequence = 0;

export function feedbackDuration(kind: FeedbackKind): number | null {
  if (kind === 'success') return 3000;
  if (kind === 'info' || kind === 'warning') return 5000;
  return null;
}

export function formatFeedbackForClipboard(item: FeedbackItem): string {
  const base = `${item.title}\n${item.message}`;
  return item.technicalDetails
    ? `${base}\n\nDetalhes técnicos:\n${item.technicalDetails}`
    : base;
}

export const useUiStore = create<UiState>((set) => ({
  feedbackQueue: [],
  pushFeedback: (input) => {
    const id = `feedback-${Date.now()}-${++feedbackSequence}`;
    const item: FeedbackItem = {
      ...input,
      id,
      durationMs: input.durationMs ?? feedbackDuration(input.kind),
    };
    set((state) => ({ feedbackQueue: [...state.feedbackQueue, item] }));
    return id;
  },
  dismissFeedback: (id) =>
    set((state) => ({
      feedbackQueue: id
        ? state.feedbackQueue.filter((item) => item.id !== id)
        : state.feedbackQueue.slice(1),
    })),
}));
