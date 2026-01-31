
import React, { useState, useEffect, useRef } from 'react';
import { ContentResult } from '../types';
import { AICallModal } from './AICallModal';
import { WritingSection } from './WritingSection';

interface StoryDisplayProps {
  contentResult: ContentResult;
  generatedImage: string;
  originalImages: string[];
  audioUrl: string | null;
  onReset: () => void;
}

export const StoryDisplay: React.FC<StoryDisplayProps> = ({ 
  contentResult, 
  generatedImage, 
  originalImages, 
  audioUrl, 
  onReset 
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeWordIndex, setActiveWordIndex] = useState<number>(-1);
  const [showTranslation, setShowTranslation] = useState(false);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [submittedQuiz, setSubmittedQuiz] = useState<Record<string, number>>({});
  
  const storyText = contentResult?.storyEnglish || "";
  const words = storyText ? storyText.split(/\s+/).filter(w => w.length > 0) : [];
  const wordOffsets = useRef<number[]>([]);
  
  useEffect(() => {
    let currentOffset = 0;
    const offsets: number[] = [];
    words.forEach(word => {
        offsets.push(currentOffset);
        currentOffset += word.length + 1; 
    });
    wordOffsets.current = offsets;
  }, [storyText, words.length]);

  const playAudio = () => {
    window.speechSynthesis.cancel();
    if (isPlaying) { setIsPlaying(false); setActiveWordIndex(-1); return; }
    setIsPlaying(true);
    const utterance = new SpeechSynthesisUtterance(storyText);
    utterance.lang = 'en-US'; 
    utterance.rate = 0.8; 
    utterance.onboundary = (event) => {
        if (event.name === 'word') {
            const charIndex = event.charIndex;
            const index = wordOffsets.current.findIndex((offset, i) => {
                const nextOffset = wordOffsets.current[i + 1] || Infinity;
                return charIndex >= offset && charIndex < nextOffset;
            });
            if (index !== -1) setActiveWordIndex(index);
        }
    };
    utterance.onend = () => { setIsPlaying(false); setActiveWordIndex(-1); };
    window.speechSynthesis.speak(utterance);
  };

  const handleQuizSelect = (qId: string, idx: number) => {
    if (submittedQuiz[qId] !== undefined) return;
    setSubmittedQuiz(prev => ({ ...prev, [qId]: idx }));
  };

  return (
    <div className="space-y-16 pb-24">
      <AICallModal 
        isOpen={isCallModalOpen} 
        onClose={() => setIsCallModalOpen(false)} 
        storyContext={storyText} 
        speakingQuestions={contentResult.speakingQuestions}
      />

      <div className="bg-white rounded-[4rem] shadow-2xl overflow-hidden border-[15px] border-brand-50 animate-fade-in">
         <div className="grid md:grid-cols-2 min-h-[600px]">
            <div className="bg-slate-900 relative flex items-center justify-center group overflow-hidden">
               <img src={generatedImage} alt="Magic Story Scene" className="w-full h-full object-cover absolute inset-0 opacity-90 transition-all duration-1000 transform group-hover:scale-110" />
               <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30"></div>
               <div className="absolute bottom-10 left-10 right-10 flex flex-col gap-4">
                  <button onClick={playAudio} className={`w-full py-6 rounded-[2.5rem] font-black text-2xl flex items-center justify-center gap-4 shadow-2xl transition-all transform active:scale-95 border-b-[10px] ${isPlaying ? 'bg-red-500 text-white border-red-700' : 'bg-brand-500 text-white hover:bg-brand-400 border-brand-700'}`}>
                     {isPlaying ? <span className="animate-pulse">⏹ DỪNG ĐỌC</span> : <><span className="text-3xl">🔊</span> NGHE TRUYỆN</>}
                  </button>
                  <button onClick={() => setIsCallModalOpen(true)} className="w-full py-6 rounded-[2.5rem] font-black text-2xl flex items-center justify-center gap-4 shadow-2xl bg-purple-500 text-white hover:bg-purple-600 transition-all transform active:scale-95 border-b-[10px] border-purple-700">
                      <span className="text-3xl">🎙️</span> GỌI CÔ GIÁO AI
                  </button>
               </div>
            </div>

            <div className="p-10 md:p-20 flex flex-col justify-center bg-white relative">
               <div className="flex justify-between items-center mb-10 border-b-4 border-slate-100 pb-6">
                  <h2 className="text-5xl font-black text-brand-800 uppercase tracking-tighter">Magic Story ✨</h2>
                  <button onClick={() => setShowTranslation(!showTranslation)} className="text-sm font-black px-6 py-2 rounded-full border-4 border-brand-100 text-brand-600 hover:bg-brand-50 transition-colors uppercase tracking-widest">
                      {showTranslation ? 'Ẩn bản dịch' : 'Xem bản dịch'}
                  </button>
               </div>
               <div className="prose prose-xl max-w-none leading-relaxed font-bold text-slate-700 mb-12 italic">
                  <p className="text-2xl md:text-3xl">
                      {words.map((word, index) => (
                          <span key={index} className={`inline-block transition-all duration-300 rounded-xl px-1 mx-0.5 ${index === activeWordIndex ? 'bg-brand-500 text-white scale-110 shadow-xl translate-y-[-2px]' : ''}`}>
                              {word}
                          </span>
                      ))}
                  </p>
               </div>
               {showTranslation && (
                  <div className="animate-bounce-in bg-brand-50 p-8 rounded-[2.5rem] border-4 border-brand-100 shadow-inner mb-10">
                      <p className="text-brand-900 text-xl font-bold leading-relaxed italic">"{contentResult?.translatedText || "Không có bản dịch"}"</p>
                  </div>
               )}
            </div>
         </div>
      </div>

      <section className="bg-white rounded-[4rem] shadow-2xl border-[10px] border-brand-50 p-12 md:p-20">
          <h2 className="text-4xl md:text-5xl font-black text-brand-800 uppercase tracking-tighter mb-12 flex items-center gap-4">
              <span className="text-5xl">📖</span> 10 Reading Challenges
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {(contentResult.comprehensionQuestions || []).map((q, idx) => {
                  const userChoice = submittedQuiz[q.id];
                  const isSubmitted = userChoice !== undefined;
                  return (
                      <div key={q.id} className="bg-slate-50 p-8 rounded-[3rem] border-2 border-slate-100 shadow-sm">
                          <p className="font-black text-2xl text-slate-800 mb-6 flex gap-4 leading-tight">
                              <span className="bg-brand-100 text-brand-700 px-3 py-1 rounded-xl h-fit">Q{idx + 1}</span>
                              {q.question}
                          </p>
                          <div className="space-y-3">
                              {(q.options || []).map((opt, i) => (
                                  <button key={i} onClick={() => handleQuizSelect(q.id, i)} disabled={isSubmitted} className={`w-full text-left p-4 rounded-2xl border-2 font-black transition-all ${isSubmitted ? i === q.correctAnswer ? 'bg-green-100 border-green-500 text-green-700' : userChoice === i ? 'bg-rose-100 border-rose-500 text-rose-700' : 'bg-white opacity-50' : 'bg-white border-slate-200 hover:border-brand-400 hover:bg-brand-50'}`}>
                                      {opt}
                                  </button>
                              ))}
                          </div>
                      </div>
                  );
              })}
          </div>
      </section>

      <section className="bg-brand-900 rounded-[4rem] shadow-2xl border-[10px] border-brand-800 p-12 md:p-20 text-white">
          <h2 className="text-4xl md:text-5xl font-black text-highlight-400 uppercase tracking-tighter mb-12 flex items-center gap-4">
              <span className="text-5xl">🎙️</span> 10 Speaking Interaction Prompts
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(contentResult.speakingQuestions || []).map((sq, idx) => (
                  <div key={sq.id} className="bg-white/5 backdrop-blur-md p-6 rounded-[2.5rem] border-2 border-white/10 group hover:bg-white/10 transition-all">
                      <div className="flex items-start gap-4">
                          <span className="text-highlight-400 font-black text-2xl">0{idx + 1}.</span>
                          <div>
                              <p className="text-2xl font-black text-white mb-3 group-hover:text-highlight-300 transition-colors">{sq.question}</p>
                              <p className="text-brand-200 font-bold italic">"{sq.suggestedAnswer}"</p>
                          </div>
                      </div>
                  </div>
              ))}
          </div>
      </section>

      <section className="animate-fade-in">
        <div className="bg-highlight-400 p-10 md:p-16 rounded-[4rem] shadow-2xl border-[15px] border-white ring-8 ring-highlight-300">
           <h3 className="text-brand-900 font-black text-xl uppercase tracking-widest mb-4">🏆 THỬ THÁCH VIẾT (WRITING CHALLENGE)</h3>
           <WritingSection topic={`${contentResult.writingPromptEn} (${contentResult.writingPromptVi})`} />
        </div>
      </section>

      <div className="flex justify-center pt-10">
          <button onClick={onReset} className="bg-white border-b-[12px] border-slate-200 hover:border-brand-500 hover:text-brand-600 text-slate-500 px-16 py-8 rounded-[3rem] font-black text-3xl transition-all shadow-xl hover:bg-brand-50 active:translate-y-2 active:border-b-0 uppercase tracking-tighter">
             🔄 TẠO CUỘC PHIÊU LƯU MỚI
          </button>
      </div>
    </div>
  );
};
