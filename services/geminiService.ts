
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { LessonPlan, MindMapData, MindMapMode, PresentationScript, ContentResult, CharacterProfile, AppMode, ImageRatio, SpeechEvaluation } from "../types";

// ===== API KEY MANAGEMENT =====
// Priority: localStorage > environment variable
const API_KEY_STORAGE = 'mrs_dung_api_key';
const MODEL_STORAGE = 'mrs_dung_selected_model';

// Model fallback order as per AI_INSTRUCTIONS.md
// Default: gemini-3-flash-preview
// Fallback: gemini-3-flash-preview → gemini-3-pro-preview → gemini-2.5-flash
export const AVAILABLE_MODELS = [
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', isDefault: true },
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
];

export const getApiKey = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(API_KEY_STORAGE);
  }
  return null;
};

export const setApiKey = (key: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(API_KEY_STORAGE, key);
  }
};

export const getSelectedModel = (): string => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(MODEL_STORAGE) || AVAILABLE_MODELS[0].id;
  }
  return AVAILABLE_MODELS[0].id;
};

export const setSelectedModel = (modelId: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(MODEL_STORAGE, modelId);
  }
};

export const hasApiKey = (): boolean => {
  return !!getApiKey();
};

// Create AI instance with API key from localStorage
const getAI = () => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('API_KEY_REQUIRED: Vui lòng nhập API key để sử dụng ứng dụng');
  }
  return new GoogleGenAI({ apiKey });
};

// Retry with model fallback
export const callWithFallback = async <T>(
  fn: (model: string) => Promise<T>,
  startModelIndex: number = 0
): Promise<T> => {
  const models = AVAILABLE_MODELS.slice(startModelIndex);
  let lastError: Error | null = null;

  for (const model of models) {
    try {
      return await fn(model.id);
    } catch (error: any) {
      lastError = error;
      console.warn(`Model ${model.id} failed, trying next...`, error.message);
      // Continue to next model
    }
  }

  // All models failed
  throw lastError || new Error('Tất cả các model đều thất bại');
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = (error) => reject(error);
  });
};

// ===== TTS SYSTEM: Mobile-First with IMMEDIATE Playback =====
// Uses Web Speech API with SYNCHRONOUS speak() for mobile compatibility
// CRITICAL: On Android, speak() MUST be called synchronously in the click handler

let currentUtterance: SpeechSynthesisUtterance | null = null;
let cachedVoice: SpeechSynthesisVoice | null = null;
let ttsInitialized = false;

// Get voices SYNCHRONOUSLY - do not await
const getVoicesSync = (): SpeechSynthesisVoice[] => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return [];
  return window.speechSynthesis.getVoices();
};

// Get the best English voice from available voices - prefer expressive female voices
const getBestVoice = (voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null => {
  if (cachedVoice && voices.includes(cachedVoice)) return cachedVoice;
  if (!voices || voices.length === 0) return null;

  // Priority: Female voices (more melodic) > Google > Microsoft > Native English
  const priorities = [
    // Female Google voices - most natural and melodic
    (v: SpeechSynthesisVoice) => v.name.includes('Google') && v.lang.startsWith('en') && (v.name.includes('Female') || v.name.includes('UK English Female')),
    // Any Google English voice
    (v: SpeechSynthesisVoice) => v.name.includes('Google') && v.lang.startsWith('en'),
    // Microsoft Zira/Aria - expressive female voices
    (v: SpeechSynthesisVoice) => v.name.includes('Microsoft') && v.lang.startsWith('en') && (v.name.includes('Zira') || v.name.includes('Aria') || v.name.includes('Jenny')),
    // Any Microsoft English voice
    (v: SpeechSynthesisVoice) => v.name.includes('Microsoft') && v.lang.startsWith('en'),
    // US English - clearer pronunciation
    (v: SpeechSynthesisVoice) => v.lang === 'en-US',
    // Any English voice
    (v: SpeechSynthesisVoice) => v.lang.startsWith('en'),
  ];

  for (const check of priorities) {
    const voice = voices.find(check);
    if (voice) {
      cachedVoice = voice;
      return voice;
    }
  }

  cachedVoice = voices[0];
  return voices[0];
};

// Pre-load voices in background (non-blocking)
const preloadVoices = () => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  // Try to get voices immediately
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    getBestVoice(voices); // Cache the best voice
    return;
  }

  // Listen for voices to become available
  window.speechSynthesis.onvoiceschanged = () => {
    const v = window.speechSynthesis.getVoices();
    if (v.length > 0) {
      getBestVoice(v); // Cache the best voice
    }
  };
};

// Initialize TTS - call this on first user interaction (e.g., page touch)
export const initTTSOnUserInteraction = (): void => {
  if (ttsInitialized) return;
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  ttsInitialized = true;

  // Warm up the speech synthesis engine with a silent utterance
  // This tricks mobile browsers into allowing future speech
  try {
    const warmup = new SpeechSynthesisUtterance('');
    warmup.volume = 0;
    warmup.rate = 10; // Fast to complete quickly
    window.speechSynthesis.speak(warmup);
    window.speechSynthesis.cancel(); // Cancel immediately
  } catch (e) {
    // Ignore errors during warmup
  }

  // Pre-cache voices
  preloadVoices();
};

// Pre-load voices on page load
if (typeof window !== 'undefined' && window.speechSynthesis) {
  preloadVoices();

  // Also try to init on first touch/click anywhere
  const initOnInteraction = () => {
    initTTSOnUserInteraction();
    document.removeEventListener('touchstart', initOnInteraction);
    document.removeEventListener('click', initOnInteraction);
  };
  document.addEventListener('touchstart', initOnInteraction, { passive: true });
  document.addEventListener('click', initOnInteraction, { passive: true });
}

// Main TTS function - FULLY SYNCHRONOUS for mobile compatibility
// NO AWAITS before speak() - this is critical for Android
export const playGeminiTTS = (text: string): void => {
  // Check availability
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    console.warn('Speech synthesis not available');
    return;
  }

  // Clean text - keep only speakable characters
  const cleanText = text.trim().replace(/[^\w\s.,!?'"-]/g, '');
  if (!cleanText) return;

  // CRITICAL: Cancel any existing speech FIRST
  window.speechSynthesis.cancel();
  currentUtterance = null;

  // Create utterance IMMEDIATELY - no delays
  try {
    const utterance = new SpeechSynthesisUtterance(cleanText);
    currentUtterance = utterance;

    // Get voices synchronously - use cached or whatever is available
    const voices = getVoicesSync();
    const voice = getBestVoice(voices);
    if (voice) {
      utterance.voice = voice;
    }

    // Settings for melodic, engaging pronunciation (trầm bổng, cuốn hút)
    utterance.lang = 'en-US';
    utterance.rate = 0.85;  // Slightly slower for clearer, more expressive speech
    utterance.pitch = 1.1;  // Slightly higher for warmer, more melodic tone
    utterance.volume = 1.0;

    // Event handlers
    utterance.onend = () => {
      currentUtterance = null;
    };

    utterance.onerror = (e) => {
      // Don't log 'interrupted' errors - they're normal when canceling
      if (e.error !== 'interrupted') {
        console.warn('TTS error:', e.error);
      }
      currentUtterance = null;
    };

    // SPEAK IMMEDIATELY - NO DELAYS!
    window.speechSynthesis.speak(utterance);

    // Mobile Chrome/Safari fix: resume if browser pauses speech
    // Check every 100ms and resume if paused
    let resumeAttempts = 0;
    const mobileResumeFix = setInterval(() => {
      resumeAttempts++;

      // Stop checking after speech ends or 30 seconds
      if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending) {
        clearInterval(mobileResumeFix);
        return;
      }

      if (resumeAttempts > 300) { // 30 seconds max
        clearInterval(mobileResumeFix);
        currentUtterance = null;
        return;
      }

      // Resume if paused (happens on some Android devices)
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    }, 100);

  } catch (e) {
    console.error('TTS Error:', e);
  }
};

// Stop any playing audio
export const stopTTS = () => {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  currentUtterance = null;
};

// Optional: Gemini TTS for high-quality audio (can be used as enhancement)
export const generateAudioFromContent = async (text: string): Promise<string> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' }
        }
      }
    },
  });
  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
};

export const generateLessonPlan = async (
  topicInput?: string,
  textInput?: string,
  images: string[] = [],
  onProgress?: (stage: 'core' | 'practice') => void
): Promise<LessonPlan> => {
  const ai = getAI();
  const imageParts = images.map(data => ({ inlineData: { data, mimeType: 'image/jpeg' } }));

  // ==================== PHASE 1: GENERATE CORE LESSON ====================
  const promptCore = `MRS. DUNG AI - EXPERT PEDAGOGY MODE (CHUYÊN GIA TIẾNG ANH).
  TASK: Analyze the provided content (text/images) and create a comprehensive core lesson.
  
  ===== CRITICAL: 100% CONTENT EXTRACTION =====
  ⚠️ QUAN TRỌNG NHẤT: Phải trích xuất CHÍNH XÁC và ĐẦY ĐỦ 100% nội dung từ nguồn!
  - Nếu ảnh/văn bản có 10 từ vựng → tạo ĐÚNG 10 từ vựng, KHÔNG được bỏ sót
  - Nếu ảnh/văn bản có 5 từ vựng → tạo ĐÚNG 5 từ vựng
  - KHÔNG được tự thêm từ vựng mà nguồn không có
  - KHÔNG được bỏ sót bất kỳ từ vựng nào trong nguồn
  - Từ vựng phải GIỐNG HỆT với nội dung gốc (word, IPA, meaning, example)
  
  CRITICAL LANGUAGE REQUIREMENTS:
  - GRAMMAR section:
    * "topic": Keep in English (the grammar rule name)
    * "explanation": MUST be in VIETNAMESE (giải thích bằng tiếng Việt, dễ hiểu cho học sinh)
    * "examples": Each example MUST include Vietnamese translation in format: "English sentence" → "bản dịch tiếng việt viết thường"
  
  - VOCABULARY section (EXTRACT ALL FROM SOURCE):
    * Extract EVERY SINGLE vocabulary word from the source - DO NOT SKIP ANY
    * "word": English word (EXACTLY as shown in source)
    * "ipa": IPA pronunciation (EXACTLY as shown in source if available)
    * "meaning": Vietnamese meaning (EXACTLY as shown in source, lowercase)
    * "example": English example sentence (EXACTLY as shown in source)
    * "sentenceMeaning": Vietnamese translation of example (EXACTLY as shown in source, lowercase)
    * "type": Word type (e.g. noun, verb, adjective, adverb)
    * "emoji": A cute relevant emoji representing the word.
  
  - READING ADVENTURE (reading):
    * "title": English title of the passage.
    * "passage": An English passage (100-150 words) appropriate to the vocabulary level, using at least 5 vocabulary words from the list.
    * "translation": Complete Vietnamese translation of the passage.
    * "comprehension": Create EXACTLY 5 Multiple Choice comprehension questions based on the passage.
      - Each question: "id" (e.g., comp_1 to comp_5), "question", "options" (4 options), "correctAnswer" (0-3), "explanation" (in Vietnamese).
  
  - TEACHER TIPS (teacherTips):
    * A helpful tip in Vietnamese for teachers/parents to support the student's learning of this lesson.
  `;

  const coreInputParts: any[] = [];
  if (textInput) coreInputParts.push({ text: `SOURCE TEXT:\n${textInput}` });
  if (topicInput) coreInputParts.push({ text: `TOPIC FOCUS:\n${topicInput}` });
  coreInputParts.push(...imageParts);
  coreInputParts.push({ text: promptCore });

  if (onProgress) onProgress('core');

  const coreResult = await callWithFallback(async (modelId: string) => {
    console.log(`🤖 [Giai đoạn 1] Đang thử với model: ${modelId}`);
    const response = await ai.models.generateContent({
      model: modelId,
      contents: { parts: coreInputParts },
      config: { responseMimeType: "application/json", responseSchema: lessonCoreSchema }
    });
    return safeJsonParse<any>(response.text);
  });

  // ==================== PHASE 2: GENERATE PRACTICE EXERCISES ====================
  if (onProgress) onProgress('practice');

  const promptPractice = `MRS. DUNG AI - EXPERT EXERCISE GENERATOR.
  TASK: Based on the provided Lesson Core (Vocabulary & Grammar), create a high-quality practice test.
  
  ===== ⚠️⚠️⚠️ CRITICAL WARNING: ZERO TOLERANCE FOR GRADING ERRORS ⚠️⚠️⚠️ =====
  🚨 BẠN ĐANG TẠO BÀI KIỂM TRA CHO HỌC SINH THẬT! 🚨
  - Nếu đáp án SAI → Học sinh bị chấm SAI → Học sinh mất niềm tin → THẤT BẠI!
  - Mỗi câu hỏi PHẢI được kiểm tra 2 LẦN trước khi output
  - KHÔNG ĐƯỢC phép ra đề 1 kiểu, đáp án 1 kiểu khác!
  
  ===== ⚠️ CRITICAL: 80% CONTENT MUST USE INPUT VOCABULARY/GRAMMAR =====
  MANDATORY RULE: At least 80% of ALL exercises (32/40 questions) MUST directly use the vocabulary, 
  grammar patterns, and concepts from the LESSON CORE provided.
  
  ===== ⚠️ CRITICAL: MATCH DIFFICULTY LEVEL WITH INPUT =====
  🎯 GOLDEN RULE: Exercise difficulty MUST match the lesson core example sentences!
  1. If lesson core uses 3-5 word sentences → Exercises use 3-5 word sentences.
  2. If lesson core uses simple verbs (has, is, need) → Exercises use same simple verbs.
  3. If lesson core uses basic structures (S + V + O) → Exercises use same basic structures.
  4. PREFER using the EXACT example sentences from lesson core as exercise base.
  
  ===== EXERCISE TYPES TO GENERATE =====
  1. Create EXACTLY 10 Multiple Choice Questions (multipleChoice)
     - A sentence with ONE blank using "____"
     - 4 options [A, B, C, D] - only ONE grammatically correct
     - correctAnswer: Index of correct option (0-3)
     - explanation: Vietnamese explanation with grammar rule reference.
     
  2. Create EXACTLY 10 Scramble Questions (scramble)
     - scrambled: Array of words from correctSentence, shuffled (MUST contain EXACT same words, no extra/missing)
     - correctSentence: Grammatically correct sentence.
     - translation: Vietnamese translation.
  
  3. Create EXACTLY 10 Fill-in-the-blank Questions (fillBlank)
     - ONLY 1 WORD ANSWER, ONLY 1 BLANK "____"
     - alternativeAnswers: Array of valid alternative answers (if any)
     - clueEmoji: A helpful clue emoji.
     - explanation: Vietnamese explanation.
  
  4. Create EXACTLY 10 Vocabulary Translation Questions (vocabTranslation)
     - Give an English word from vocabulary, select 1 of 4 Vietnamese meanings.
     - Options: 4 choices, correctAnswer (0-3).
  
  5. Create EXACTLY 5 True/False Reading Comprehension Questions (trueFalse + trueFalsePassage)
     - trueFalsePassage: A new reading passage (150-200 words) using at least 5 words from vocabulary.
     - trueFalse: 5 True/False statements based on this passage. (isTrue: boolean)
  
  6. Create EXACTLY 5 Listening Comprehension Questions (listening)
     - audioText: A short English sentence (5-12 words) using lesson vocabulary.
     - options: 4 choices (correct answer is audioText, 3 wrong choices are similar but have 1-2 words changed).
     - correctAnswer: Index of correct option (0-3).
     - explanation: Vietnamese translation of audioText.
  
  7. Create EXACTLY 10 Matching Pairs (matching)
     - left: English word/phrase from vocabulary.
     - right: Vietnamese meaning.
  
  LESSON CORE DATA:
  ${JSON.stringify({ vocabulary: coreResult.vocabulary, grammar: coreResult.grammar })}`;

  const practiceResult = await callWithFallback(async (modelId: string) => {
    console.log(`🤖 [Giai đoạn 2] Đang thử với model: ${modelId}`);
    const response = await ai.models.generateContent({
      model: modelId,
      contents: { parts: [{ text: promptPractice }] },
      config: { responseMimeType: "application/json", responseSchema: lessonPracticeSchema }
    });
    return safeJsonParse<any>(response.text);
  });

  // Combine results into a complete LessonPlan
  return {
    ...coreResult,
    practice: {
      listening: practiceResult.listening,
      megaTest: practiceResult.megaTest
    }
  } as LessonPlan;
};

export const analyzeImageAndCreateContent = async (images: string[], mimeType: string, char: CharacterProfile, mode: AppMode, customPrompt?: string, topic?: string, text?: string): Promise<ContentResult> => {
  const ai = getAI();
  const imageParts = images.map(data => ({ inlineData: { data, mimeType } }));
  const prompt = `MRS. DUNG AI - CREATIVE STORYTELLER.
  
  Analyze the input and create:
  1. A magical story featuring ${char.name}.
  2. EXACTLY 10 Comprehension Quiz questions.
  3. EXACTLY 10 Speaking interaction prompts.
  4. A SCIENTIFIC WRITING PROMPT for the student in BOTH English and Vietnamese.
  
  Source material: Topic: ${topic || "N/A"}, Text: ${text || "N/A"}.
  Character context: ${char.promptContext}.`;

  const response = await ai.models.generateContent({
    model: getSelectedModel(),
    contents: { parts: [...imageParts, { text: prompt }] },
    config: { responseMimeType: "application/json", responseSchema: contentResultSchema }
  });
  return safeJsonParse<ContentResult>(response.text);
};

const safeJsonParse = <T>(text: string): T => {
  try {
    let cleanText = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    const start = Math.min(cleanText.indexOf('{') === -1 ? Infinity : cleanText.indexOf('{'), cleanText.indexOf('[') === -1 ? Infinity : cleanText.indexOf('['));
    const end = Math.max(cleanText.lastIndexOf('}'), cleanText.lastIndexOf(']'));
    if (start !== Infinity && end !== -1) cleanText = cleanText.substring(start, end + 1);
    return JSON.parse(cleanText) as T;
  } catch (e) { throw new Error("Lỗi xử lý dữ liệu AI."); }
};

const lessonCoreSchema = {
  type: Type.OBJECT,
  properties: {
    topic: { type: Type.STRING },
    vocabulary: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          word: { type: Type.STRING },
          emoji: { type: Type.STRING },
          ipa: { type: Type.STRING },
          meaning: { type: Type.STRING },
          example: { type: Type.STRING },
          sentenceMeaning: { type: Type.STRING },
          type: { type: Type.STRING }
        },
        required: ["word", "ipa", "meaning", "example", "type", "emoji"]
      }
    },
    grammar: {
      type: Type.OBJECT,
      properties: {
        topic: { type: Type.STRING },
        explanation: { type: Type.STRING },
        examples: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["topic", "explanation", "examples"]
    },
    reading: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        passage: { type: Type.STRING },
        translation: { type: Type.STRING },
        comprehension: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctAnswer: { type: Type.INTEGER },
              explanation: { type: Type.STRING }
            },
            required: ["id", "question", "options", "correctAnswer"]
          }
        }
      },
      required: ["title", "passage", "translation", "comprehension"]
    },
    teacherTips: { type: Type.STRING }
  },
  required: ["topic", "vocabulary", "grammar", "reading", "teacherTips"]
};

const lessonPracticeSchema = {
  type: Type.OBJECT,
  properties: {
    listening: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          audioText: { type: Type.STRING },
          options: { type: Type.ARRAY, items: { type: Type.STRING } },
          correctAnswer: { type: Type.INTEGER },
          explanation: { type: Type.STRING }
        },
        required: ["id", "audioText", "options", "correctAnswer"]
      }
    },
    megaTest: {
      type: Type.OBJECT,
      properties: {
        multipleChoice: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctAnswer: { type: Type.INTEGER },
              explanation: { type: Type.STRING }
            },
            required: ["id", "question", "options", "correctAnswer"]
          }
        },
        scramble: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              scrambled: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctSentence: { type: Type.STRING },
              translation: { type: Type.STRING }
            },
            required: ["id", "scrambled", "correctSentence"]
          }
        },
        fillBlank: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              question: { type: Type.STRING },
              correctAnswer: { type: Type.STRING },
              alternativeAnswers: { type: Type.ARRAY, items: { type: Type.STRING } },
              clueEmoji: { type: Type.STRING },
              explanation: { type: Type.STRING }
            },
            required: ["id", "question", "correctAnswer"]
          }
        },
        vocabTranslation: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              word: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctAnswer: { type: Type.INTEGER },
              explanation: { type: Type.STRING }
            },
            required: ["id", "word", "options", "correctAnswer"]
          }
        },
        trueFalsePassage: { type: Type.STRING },
        trueFalse: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              statement: { type: Type.STRING },
              isTrue: { type: Type.BOOLEAN },
              explanation: { type: Type.STRING }
            },
            required: ["id", "statement", "isTrue", "explanation"]
          }
        },
        matching: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              left: { type: Type.STRING },
              right: { type: Type.STRING }
            },
            required: ["id", "left", "right"]
          }
        }
      },
      required: ["multipleChoice", "scramble", "fillBlank", "vocabTranslation", "trueFalsePassage", "trueFalse", "matching"]
    }
  },
  required: ["listening", "megaTest"]
};


const contentResultSchema = {
  type: Type.OBJECT,
  properties: {
    storyEnglish: { type: Type.STRING },
    translatedText: { type: Type.STRING },
    writingPromptEn: { type: Type.STRING },
    writingPromptVi: { type: Type.STRING },
    vocabulary: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { word: { type: Type.STRING }, meaning: { type: Type.STRING }, emoji: { type: Type.STRING } } } },
    imagePrompt: { type: Type.STRING },
    comprehensionQuestions: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, question: { type: Type.STRING }, options: { type: Type.ARRAY, items: { type: Type.STRING } }, correctAnswer: { type: Type.INTEGER }, explanation: { type: Type.STRING } } } },
    speakingQuestions: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, question: { type: Type.STRING }, suggestedAnswer: { type: Type.STRING } } } }
  },
  required: ["storyEnglish", "translatedText", "writingPromptEn", "writingPromptVi", "vocabulary", "imagePrompt", "comprehensionQuestions", "speakingQuestions"]
};

export const generateMindMap = async (content: any, mode: MindMapMode): Promise<MindMapData> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Create a professional Mind Map following Tony Buzan's principles for: ${JSON.stringify(content)}. 
    Structure: Root node is the main topic. Child nodes are key sub-concepts with emojis. 
    Output strictly in JSON format matching the schema.`,
    config: { responseMimeType: "application/json", responseSchema: mindMapSchema }
  });
  return safeJsonParse<MindMapData>(response.text);
};

export const evaluateSpeech = async (base64Audio: string): Promise<SpeechEvaluation> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: { parts: [{ inlineData: { data: base64Audio, mimeType: 'audio/wav' } }, { text: "Evaluate the student's speaking performance on a scale of 0-10. Provide encouraging feedback in Vietnamese." }] },
    config: { responseMimeType: "application/json", responseSchema: speechEvaluationSchema }
  });
  return safeJsonParse<SpeechEvaluation>(response.text);
};

export const generateStoryImage = async (prompt: string, style: string, ratio: ImageRatio): Promise<string> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [{ text: `A high-quality educational illustration for kids: ${prompt}. Artistic Style: ${style}. High resolution, 8k, vibrant colors.` }] },
    config: { imageConfig: { aspectRatio: ratio } }
  });
  for (const part of response.candidates[0].content.parts) { if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`; }
  throw new Error("Image generation failed");
};

export const correctWriting = async (userText: string, creativePrompt: string): Promise<any> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Evaluate and correct this student writing: "${userText}". The topic was: "${creativePrompt}". Provide a score (0-10), feedback, fixed text, and detailed error list.`,
    config: { responseMimeType: "application/json", responseSchema: writingCorrectionSchema }
  });
  return safeJsonParse<any>(response.text);
};

export const generatePresentation = async (data: MindMapData): Promise<PresentationScript> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Create a professional English presentation script for a student based on this Mind Map data: ${JSON.stringify(data)}. 
    Include a warm introduction, body sections for each node, and a polite conclusion. 
    Provide both English script and Vietnamese translation.`,
    config: { responseMimeType: "application/json", responseSchema: presentationSchema }
  });
  return safeJsonParse<PresentationScript>(response.text);
};

export const generateMindMapPrompt = async (content: any, mode: MindMapMode): Promise<string> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `TASK: Generate a single, highly detailed English prompt for drawing a professional Tony Buzan Mind Map using AI art tools (like Midjourney or DALL-E). 
    CONTENT SOURCE: ${JSON.stringify(content)}. 
    
    PROMPT SPECIFICATIONS:
    - Style: 3D Organic Tony Buzan Mind Map, Pixar-style animation render.
    - Central Theme: A clear 3D icon representing the lesson topic at the center.
    - Branches: Curvy, organic, thick-to-thin colorful branches spreading outwards.
    - Elements: Floating keywords in English, cute 3D emojis/icons next to branches.
    - Environment: Clean bright studio background, 8k resolution, cinematic lighting, vibrant pedagogical colors.
    - Exclude: No text other than the keywords. 
    
    JUST PROVIDE THE RAW PROMPT STRING.`
  });
  return response.text;
};

const mindMapSchema = { type: Type.OBJECT, properties: { center: { type: Type.OBJECT, properties: { title_en: { type: Type.STRING }, title_vi: { type: Type.STRING }, emoji: { type: Type.STRING } } }, nodes: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { text_en: { type: Type.STRING }, text_vi: { type: Type.STRING }, emoji: { type: Type.STRING } } } } } };
const presentationSchema = { type: Type.OBJECT, properties: { introduction: { type: Type.OBJECT, properties: { english: { type: Type.STRING }, vietnamese: { type: Type.STRING } } }, body: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { keyword: { type: Type.STRING }, script: { type: Type.STRING } } } }, conclusion: { type: Type.OBJECT, properties: { english: { type: Type.STRING }, vietnamese: { type: Type.STRING } } } } };
const speechEvaluationSchema = { type: Type.OBJECT, properties: { scores: { type: Type.OBJECT, properties: { pronunciation: { type: Type.NUMBER } } }, overallScore: { type: Type.NUMBER }, feedback: { type: Type.STRING } } };
const writingCorrectionSchema = { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, feedback: { type: Type.STRING }, fixedText: { type: Type.STRING }, breakdown: { type: Type.OBJECT, properties: { vocabulary: { type: Type.NUMBER }, grammar: { type: Type.NUMBER } } }, errors: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { original: { type: Type.STRING }, fixed: { type: Type.STRING }, reason: { type: Type.STRING } } } }, suggestions: { type: Type.STRING } } };
