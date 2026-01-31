
import React, { useState } from 'react';
import { VocabularyItem } from '../types';
import { playGeminiTTS } from '../services/geminiService';

interface VocabularySectionProps {
  items: VocabularyItem[];
}

export const VocabularySection: React.FC<VocabularySectionProps> = ({ items = [] }) => {
  const [showMeaning, setShowMeaning] = useState(true);

  const handlePlayAudio = (text: string) => {
    playGeminiTTS(text);
  };

  return (
    <div className="space-y-6 md:space-y-12">
      <div className="flex flex-col md:flex-row justify-between items-center border-b-2 md:border-b-4 border-brand-100 pb-4 md:pb-6 gap-4">
        <h2 className="text-2xl md:text-4xl font-black text-brand-800 uppercase tracking-tighter">Vocabulary List 📖</h2>
        <button
          onClick={() => setShowMeaning(!showMeaning)}
          className="text-sm md:text-lg bg-white border-2 md:border-4 border-brand-100 px-4 md:px-6 py-1.5 md:py-2 rounded-full hover:bg-brand-50 transition-all text-brand-600 font-black uppercase tracking-widest shadow-sm"
        >
          {showMeaning ? 'Hide Meaning' : 'Show Meaning'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
        {items.map((item, idx) => (
            <div key={idx} className="bg-white p-4 md:p-8 rounded-2xl md:rounded-[3rem] shadow-xl border-2 md:border-4 border-slate-50 flex flex-col md:flex-row gap-4 md:gap-8 hover:shadow-2xl transition-all items-start group hover:md:-translate-y-2">
              <div className="shrink-0 relative w-20 h-20 md:w-32 md:h-32 bg-brand-50 rounded-xl md:rounded-[2rem] overflow-hidden border-2 md:border-4 border-white shadow-inner flex items-center justify-center transform group-hover:rotate-6 transition-all mx-auto md:mx-0">
                 <span className="text-4xl md:text-7xl select-none">{item.emoji || '📝'}</span>
              </div>
              <div className="flex-1 min-w-0 w-full">
                <div className="flex justify-between items-start w-full">
                  <div className="flex-1">
                    <h3 className="text-2xl md:text-4xl font-black text-brand-900 tracking-tight leading-none mb-1 md:mb-2">{item.word}</h3>
                    <div className="flex flex-wrap items-center gap-2 md:gap-3">
                      <span className="text-brand-600 text-sm md:text-xl font-black font-mono bg-brand-100/50 px-2 md:px-4 py-0.5 md:py-1 rounded-lg md:rounded-xl border md:border-2 border-brand-200">/{item.ipa}/</span>
                      <span className="text-[10px] md:text-sm bg-brand-500 text-white px-2 py-0.5 rounded md:rounded-lg font-black uppercase tracking-widest">{item.type}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handlePlayAudio(item.word)}
                    className="p-2 md:p-4 rounded-full bg-brand-100 text-brand-700 hover:bg-brand-500 hover:text-white transition-all transform active:scale-90 shadow-lg"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" className="md:w-7 md:h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                  </button>
                </div>
                
                <div className={`mt-3 md:mt-6 transition-all duration-300 ${showMeaning ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
                  <p className="text-highlight-600 font-black text-xl md:text-3xl italic tracking-tight">{item.meaning}</p>
                </div>

                <div className="mt-4 md:mt-6 bg-slate-50 p-4 md:p-6 rounded-xl md:rounded-2xl border md:border-2 border-slate-100 relative group/example shadow-inner">
                  <p className="text-slate-700 text-base md:text-xl font-bold italic leading-relaxed pr-8 md:pr-10">
                    "{item.example}"
                  </p>
                  {showMeaning && item.sentenceMeaning && (
                    <p className="text-brand-500 text-[10px] md:text-sm font-black mt-2 md:mt-3 border-t md:border-t-2 border-slate-200 pt-2 md:pt-3 uppercase tracking-wider">
                      ➔ {item.sentenceMeaning}
                    </p>
                  )}
                  <button 
                    onClick={() => handlePlayAudio(item.example)}
                    className="absolute top-2 md:top-4 right-2 md:right-4 p-1.5 md:p-2 rounded-full bg-white text-slate-400 hover:text-brand-500 hover:bg-brand-50 border md:border-2 border-slate-100 shadow-sm transition-all"
                  >
                     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" className="md:w-5 md:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                  </button>
                </div>
              </div>
            </div>
        ))}
      </div>
    </div>
  );
};
