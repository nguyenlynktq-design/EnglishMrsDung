
export type CEFRLevel = 'Starter (A1)' | 'Elementary (A2)' | 'Intermediate (B1)';

export interface VocabularyItem {
  word: string;
  emoji: string;
  ipa: string;
  meaning: string;
  example: string;
  sentenceMeaning: string;
  type: string;
}

export interface GrammarSection {
  topic: string;
  explanation: string;
  examples: string[];
}

export interface MultipleChoiceQ {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface ScrambleQ {
  id: string;
  scrambled: string[];
  correctSentence: string;
  translation: string;
}

export interface FillBlankQuestion {
  id: string;
  question: string;
  correctAnswer: string;
  clueEmoji: string;
  explanation?: string;
  options?: string[];
}

// Alias for FillBlankQuestion used in some components
export type FillInputQ = FillBlankQuestion;

export interface ErrorIdQ {
  id: string;
  sentence: string;
  options: string[]; 
  correctOptionIndex: number;
  explanation: string;
}

export interface MatchingPair {
  id: string;
  left: string; 
  right: string; 
}

export interface ListeningQ {
  id: string;
  question: string;
  audioText: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface ReadingAdventure {
  title: string;
  passage: string;
  translation: string;
  comprehension: MultipleChoiceQ[];
}

export interface SpeakingQ {
  id: string;
  question: string;
  suggestedAnswer: string;
}

export interface PracticeContent {
  megaTest: {
    multipleChoice: MultipleChoiceQ[]; 
    scramble: ScrambleQ[]; 
    fillBlank: FillBlankQuestion[]; 
    errorId: ErrorIdQ[]; 
    listening: ListeningQ[];
    matching: MatchingPair[]; 
  };
}

export interface LessonPlan {
  topic: string;
  vocabulary: VocabularyItem[];
  grammar: GrammarSection;
  reading: ReadingAdventure;
  practice: PracticeContent;
  teacherTips: string;
}

export interface MindMapData {
  center: {
    title_en: string;
    title_vi: string;
    emoji?: string; 
  };
  nodes: Array<{
    text_en: string;
    text_vi: string;
    emoji?: string;
    color?: string;
  }>;
}

export enum MindMapMode {
  TOPIC = 'TOPIC',
  TEXT = 'TEXT',
  IMAGE = 'IMAGE'
}

export enum AppMode {
  CREATIVE = 'CREATIVE',
  LEARNING = 'LEARNING'
}

export interface ContentResult {
  storyEnglish: string;
  translatedText: string;
  writingPromptEn: string;
  writingPromptVi: string;
  vocabulary: VocabularyItem[];
  imagePrompt: string;
  comprehensionQuestions: MultipleChoiceQ[];
  speakingQuestions: SpeakingQ[];
}

export interface PresentationScript {
  introduction: { english: string; vietnamese: string; };
  body: Array<{ keyword: string; script: string; }>;
  conclusion: { english: string; vietnamese: string; };
}

export interface SpeechEvaluation {
  scores: { pronunciation: number };
  overallScore: number;
  feedback: string;
}

export enum LoadingStep {
  IDLE = 'Idle',
  ANALYZING = 'Analyzing content...',
  GENERATING_IMAGE = 'Generating magic image...',
  GENERATING_AUDIO = 'Creating Mrs. Dung\'s voice...',
  COMPLETED = 'Completed!'
}

export interface CharacterProfile {
  id: string;
  name: string;
  emoji: string;
  promptContext: string;
  stylePrompt: string;
  colorClass: string;
}

export type ImageRatio = '1:1' | '16:9' | '9:16';

export interface AppState {
  selectedCharacter: CharacterProfile;
  selectedMode: string;
  selectedRatio: ImageRatio;
  customPrompt: string;
  originalImages: string[];
  generatedImage: string | null;
  audioUrl: string | null;
  contentResult: ContentResult | null;
  isLoading: boolean;
  loadingStep: LoadingStep;
  error: string | null;
}
