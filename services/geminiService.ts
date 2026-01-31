
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { LessonPlan, MindMapData, MindMapMode, PresentationScript, ContentResult, CharacterProfile, ImageRatio, SpeechEvaluation, CEFRLevel } from "../types";

// Quản lý hàng đợi âm thanh để đọc lần lượt, tuyệt đối không chồng chéo
let audioQueue: string[] = [];
let isProcessingQueue = false;
let activeAudioCtx: AudioContext | null = null;

const safeJsonParse = <T>(text: string): T => {
  let cleanText = text.trim();
  try {
    cleanText = cleanText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    const start = cleanText.indexOf('{');
    const end = cleanText.lastIndexOf('}');
    if (start === -1) throw new Error("Không tìm thấy JSON");
    
    let jsonToParse = cleanText;
    if (end > start) {
      jsonToParse = cleanText.substring(start, end + 1);
    } else {
      jsonToParse = cleanText.substring(start);
    }
    return JSON.parse(jsonToParse) as T;
  } catch (e) {
    console.error("JSON Parse Failure:", text);
    if (text.length > 1000 && !text.endsWith('}')) {
       throw new Error("Tài liệu quá lớn khiến AI không thể đóng gói JSON. Hãy thử nhập ít văn bản hơn hoặc chia nhỏ ảnh!");
    }
    throw new Error("Lỗi cấu trúc dữ liệu từ AI. Hãy nhấn 'Soạn lại' để thử lại nhé!");
  }
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (error) => reject(error);
  });
};

const executeTTS = async (text: string): Promise<void> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
      },
    });
    
    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!audioData) return;

    if (!activeAudioCtx) {
      activeAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    
    if (activeAudioCtx.state === 'suspended') await activeAudioCtx.resume();

    const bytes = Uint8Array.from(atob(audioData), c => c.charCodeAt(0));
    const dataInt16 = new Int16Array(bytes.buffer);
    const buffer = activeAudioCtx.createBuffer(1, dataInt16.length, 24000);
    buffer.getChannelData(0).set(Array.from(dataInt16).map(v => v / 32768.0));
    
    const source = activeAudioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(activeAudioCtx.destination);
    
    return new Promise((resolve) => {
      source.onended = () => resolve();
      source.start();
    });
  } catch (e) {
    console.error("TTS Execution Error:", e);
  }
};

const processAudioQueue = async () => {
  if (isProcessingQueue) return;
  isProcessingQueue = true;
  while (audioQueue.length > 0) {
    const text = audioQueue.shift();
    if (text) await executeTTS(text);
  }
  isProcessingQueue = false;
};

export const playGeminiTTS = async (text: string): Promise<void> => {
  if (!text) return;
  audioQueue.push(text);
  processAudioQueue();
};

export const generateAudioFromContent = async (text: string): Promise<string | null> => {
  if (!text) return null;
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
  } catch (e) {
    return null;
  }
};

export const generateLessonPlan = async (topicInput?: string, textInput?: string, images: string[] = [], level: CEFRLevel = 'Starter (A1)'): Promise<LessonPlan> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const imageParts = images.map(data => ({ inlineData: { data, mimeType: 'image/jpeg' } }));
  
  const systemInstruction = `BẠN LÀ MRS. DUNG AI - CHUYÊN GIA KHẢO THÍ VÀ BIÊN SOẠN GIÁO TRÌNH TIẾNG ANH CHUẨN QUỐC TẾ.
  
  NHIỆM VỤ CỐT LÕI:
  1. QUÉT TOÀN BỘ nội dung văn bản và hình ảnh được cung cấp. TRÍCH XUẤT tất cả từ vựng, mẫu câu và kiến thức ngữ pháp quan trọng nhất.
  2. SOẠN GIÁO ÁN trình độ ${level} dựa trên các thông tin vừa trích xuất.
  3. TẠO ĐỦ 50 CÂU HỎI LUYỆN TẬP (10 CÂU MỖI PHẦN) - KHÔNG ĐƯỢC THIẾU.
  
  CƠ CẤU 50 CÂU HỎI (BẮT BUỘC):
  - 10 LISTENING: audioText cực ngắn (giọng Kore), câu hỏi xoay quanh nội dung nghe.
  - 10 ERROR IDENTIFICATION: Tìm 1 lỗi sai trong câu trích từ bài học. Cung cấp 4 cụm từ trích từ câu đó làm options.
  - 10 FILL BLANK: Điền từ khóa quan trọng vào câu trích từ tài liệu.
  - 10 MULTIPLE CHOICE: Kiểm tra mức độ hiểu nội dung tổng quát.
  - 10 SCRAMBLE: Sắp xếp các từ thành câu hoàn chỉnh đúng ngữ pháp từ bài học.

  YÊU CẦU KỸ THUẬT:
  - Phản hồi duy nhất 1 JSON.
  - Văn phong Mrs. Dung: Nhiệt huyết, tận tâm, yêu thương trẻ em.
  - Giải thích ngữ pháp bằng Tiếng Việt súc tích, dễ hiểu.
  - Temperature: 0.0 để đảm bảo độ chính xác tuyệt đối từ tài liệu.
  
  BẮT ĐẦU QUÉT TÀI LIỆU VÀ SOẠN BÀI NGAY.`;

  const inputParts: any[] = [];
  if (textInput) inputParts.push({ text: `VĂN BẢN ĐẦU VÀO:\n${textInput}` });
  if (topicInput) inputParts.push({ text: `CHỦ ĐỀ ĐẦU VÀO:\n${topicInput}` });
  inputParts.push(...imageParts);

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview', 
    contents: { parts: inputParts },
    config: { 
      systemInstruction,
      responseMimeType: "application/json", 
      responseSchema: lessonSchema,
      temperature: 0.0, 
      maxOutputTokens: 8192 
    }
  });

  return safeJsonParse<LessonPlan>(response.text);
};

const lessonSchema = {
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
        required: ["word", "emoji", "ipa", "meaning", "example", "sentenceMeaning", "type"]
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
            required: ["id", "question", "options", "correctAnswer", "explanation"]
          } 
        } 
      },
      required: ["title", "passage", "translation", "comprehension"]
    },
    practice: { 
      type: Type.OBJECT, 
      properties: { 
        megaTest: { 
          type: Type.OBJECT, 
          properties: { 
            multipleChoice: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, question: { type: Type.STRING }, options: { type: Type.ARRAY, items: { type: Type.STRING } }, correctAnswer: { type: Type.INTEGER }, explanation: { type: Type.STRING } }, required: ["id", "question", "options", "correctAnswer", "explanation"] } }, 
            scramble: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, scrambled: { type: Type.ARRAY, items: { type: Type.STRING } }, correctSentence: { type: Type.STRING }, translation: { type: Type.STRING } }, required: ["id", "scrambled", "correctSentence", "translation"] } }, 
            fillBlank: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, question: { type: Type.STRING }, correctAnswer: { type: Type.STRING }, clueEmoji: { type: Type.STRING }, explanation: { type: Type.STRING } }, required: ["id", "question", "correctAnswer", "clueEmoji", "explanation"] } }, 
            errorId: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, sentence: { type: Type.STRING }, options: { type: Type.ARRAY, items: { type: Type.STRING } }, correctOptionIndex: { type: Type.INTEGER }, explanation: { type: Type.STRING } }, required: ["id", "sentence", "options", "correctOptionIndex", "explanation"] } },
            listening: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, question: { type: Type.STRING }, audioText: { type: Type.STRING }, options: { type: Type.ARRAY, items: { type: Type.STRING } }, correctAnswer: { type: Type.INTEGER }, explanation: { type: Type.STRING } }, required: ["id", "question", "audioText", "options", "correctAnswer", "explanation"] } },
            matching: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, left: { type: Type.STRING }, right: { type: Type.STRING } }, required: ["id", "left", "right"] } }
          },
          required: ["multipleChoice", "scramble", "fillBlank", "errorId", "listening", "matching"]
        } 
      },
      required: ["megaTest"]
    },
    teacherTips: { type: Type.STRING }
  },
  required: ["topic", "vocabulary", "grammar", "reading", "practice", "teacherTips"]
};

export const analyzeImageAndCreateContent = async (images: string[], mimeType: string, char: CharacterProfile, mode: string, customPrompt?: string, topic?: string, text?: string): Promise<ContentResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const imageParts = images.map(data => ({ inlineData: { data, mimeType } }));
  const systemInstruction = `BẠN LÀ MRS. DUNG. Tạo câu chuyện phép thuật cho bé. Trả về JSON.`;
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: { parts: [...imageParts, { text: "Soạn truyện ngay." }] },
    config: { systemInstruction, responseMimeType: "application/json", responseSchema: contentResultSchema, temperature: 0.1 }
  });
  return safeJsonParse<ContentResult>(response.text);
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

export const generateStoryImage = async (prompt: string, style: string, ratio: ImageRatio): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [{ text: `${prompt}. Style: ${style}` }] },
    config: { imageConfig: { aspectRatio: ratio } }
  });
  for (const part of response.candidates[0].content.parts) { if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`; }
  throw new Error("Không thể vẽ ảnh.");
};

export const generateMindMap = async (content: any, mode: MindMapMode): Promise<MindMapData> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Tạo sơ đồ tư duy JSON: ${JSON.stringify(content)}.`,
    config: { systemInstruction: "CHỈ TRẢ VỀ JSON.", responseMimeType: "application/json", responseSchema: mindMapSchema, temperature: 0.0 }
  });
  return safeJsonParse<MindMapData>(response.text);
};

const mindMapSchema = { 
  type: Type.OBJECT, 
  properties: { 
    center: { type: Type.OBJECT, properties: { title_en: { type: Type.STRING }, title_vi: { type: Type.STRING }, emoji: { type: Type.STRING } } }, 
    nodes: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { text_en: { type: Type.STRING }, text_vi: { type: Type.STRING }, emoji: { type: Type.STRING }, color: { type: Type.STRING } } } } 
  } 
};

export const correctWriting = async (userText: string, creativePrompt: string): Promise<any> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Chấm bài viết: "${userText}".`,
    config: { systemInstruction: "CHỈ TRẢ VỀ JSON.", responseMimeType: "application/json", responseSchema: writingCorrectionSchema, temperature: 0.0 }
  });
  return safeJsonParse<any>(response.text);
};

const writingCorrectionSchema = { 
  type: Type.OBJECT, 
  properties: { 
    score: { type: Type.NUMBER }, 
    feedback: { type: Type.STRING }, 
    fixedText: { type: Type.STRING }, 
    breakdown: { type: Type.OBJECT, properties: { vocabulary: { type: Type.NUMBER }, grammar: { type: Type.NUMBER } } }, 
    errors: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { original: { type: Type.STRING }, fixed: { type: Type.STRING }, reason: { type: Type.STRING } } } }, 
    suggestions: { type: Type.STRING } 
  } 
};

export const evaluateSpeech = async (base64Audio: string): Promise<SpeechEvaluation> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: { parts: [{ inlineData: { data: base64Audio, mimeType: 'audio/wav' } }, { text: "Chấm điểm phát âm." }] },
    config: { systemInstruction: "CHỈ TRẢ VỀ JSON.", responseMimeType: "application/json", responseSchema: speechEvaluationSchema, temperature: 0.0 }
  });
  return safeJsonParse<SpeechEvaluation>(response.text);
};

const speechEvaluationSchema = { 
  type: Type.OBJECT, 
  properties: { 
    scores: { type: Type.OBJECT, properties: { pronunciation: { type: Type.NUMBER } } }, 
    overallScore: { type: Type.NUMBER }, 
    feedback: { type: Type.STRING } 
  } 
};

export const generatePresentation = async (data: MindMapData): Promise<PresentationScript> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Soạn kịch bản thuyết trình: ${JSON.stringify(data)}.`,
    config: { systemInstruction: "CHỈ TRẢ VỀ JSON.", responseMimeType: "application/json", responseSchema: presentationSchema, temperature: 0.0 }
  });
  return safeJsonParse<PresentationScript>(response.text);
};

const presentationSchema = { 
  type: Type.OBJECT, 
  properties: { 
    introduction: { type: Type.OBJECT, properties: { english: { type: Type.STRING }, vietnamese: { type: Type.STRING } } }, 
    body: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { keyword: { type: Type.STRING }, script: { type: Type.STRING } } } }, 
    conclusion: { type: Type.OBJECT, properties: { english: { type: Type.STRING }, vietnamese: { type: Type.STRING } } } 
  } 
};

export const generateMindMapPrompt = async (content: any, mode: MindMapMode): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({ 
    model: 'gemini-3-pro-preview', 
    contents: `Tạo Midjourney prompt cho: ${JSON.stringify(content)}.`,
    config: { temperature: 0.0 }
  });
  return response.text;
};
