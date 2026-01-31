
import React, { useState } from 'react';
import { generateMindMap, fileToBase64, generatePresentation, playGeminiTTS } from '../services/geminiService';
import { MindMapData, MindMapMode, PresentationScript } from '../types';
import { MindMap } from './MindMap';
import { PresentationScriptView } from './PresentationScript';

export const MindMapTab: React.FC = () => {
  const [mode, setMode] = useState<MindMapMode>(MindMapMode.TOPIC);
  const [inputContent, setInputContent] = useState('');
  const [mindMapData, setMindMapData] = useState<MindMapData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [presentation, setPresentation] = useState<PresentationScript | null>(null);
  const [isGeneratingPres, setIsGeneratingPres] = useState(false);
  const [studentName, setStudentName] = useState('');

  const handleGenerate = async () => {
    if (mode === MindMapMode.IMAGE && selectedFiles.length === 0) {
      setError("Vui lòng chọn ít nhất 1 ảnh nhé!");
      return;
    }
    if (mode !== MindMapMode.IMAGE && !inputContent.trim()) {
      setError("Vui lòng nhập nội dung con muốn tạo sơ đồ nhé!");
      return;
    }

    setIsLoading(true);
    setError(null);
    setMindMapData(null);
    setPresentation(null); 

    try {
      let contentToProcess: any = inputContent;
      if (mode === MindMapMode.IMAGE) {
        contentToProcess = await Promise.all(selectedFiles.map(async (file) => ({
          data: await fileToBase64(file),
          mimeType: file.type || 'image/jpeg'
        })));
      }
      const result = await generateMindMap(contentToProcess, mode);
      setMindMapData(result);
    } catch (err: any) {
      setError(err.message || "Bé ơi, có lỗi khi tạo sơ đồ.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeneratePresentation = async () => {
      if (!mindMapData) return;
      setIsGeneratingPres(true);
      try {
          const script = await generatePresentation(mindMapData);
          setPresentation(script);
          // Play audio intro after generating
          playGeminiTTS(script.introduction.english);
      } catch (e) { alert("Lỗi khi soạn bài nói!"); } finally { setIsGeneratingPres(false); }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      // Added explicit type cast to File[] to ensure compatibility with URL.createObjectURL
      const files = Array.from(e.target.files) as File[];
      setSelectedFiles(files);
      
      // Fix: Revoke the blob URL to free up memory with proper type safety
      imagePreviews.forEach((url: string) => {
        // Narrowing url type to string before calling revokeObjectURL
        if (typeof url === 'string' && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
      // Explicitly typing map parameter to File
      setImagePreviews(files.map((f: File) => URL.createObjectURL(f)));
    }
  };

  return (
    <div className="w-full">
      <div className="text-center mb-10">
        <h2 className="text-4xl md:text-6xl font-black text-indigo-600 font-display mb-3">Kids Mindmap Maker</h2>
        <p className="text-lg text-slate-500 max-w-lg mx-auto font-medium">Biến mọi nội dung thành sơ đồ tư duy tuyệt đẹp!</p>
      </div>

      <div className="max-w-5xl mx-auto space-y-8">
        <div className="bg-white rounded-[2rem] shadow-xl p-8">
          <div className="flex flex-wrap gap-2 mb-6">
            {[MindMapMode.TOPIC, MindMapMode.TEXT, MindMapMode.IMAGE].map((m) => (
              <button key={m} onClick={() => setMode(m)} className={`flex-1 py-3 rounded-xl font-bold transition-all ${mode === m ? 'bg-indigo-500 text-white' : 'bg-slate-50 text-slate-500'}`}>
                {m}
              </button>
            ))}
          </div>
          <div className="space-y-6">
            {mode === MindMapMode.IMAGE ? (
               <div className="flex flex-col gap-4">
                 <input type="file" accept="image/*" multiple onChange={handleFileChange} className="w-full p-4 border-2 border-dashed border-indigo-200 rounded-xl" />
                 <div className="flex gap-2 overflow-x-auto pb-2">
                    {imagePreviews.map((src, i) => (
                      <img key={i} src={src} className="w-20 h-20 object-cover rounded-lg border-2 border-indigo-100" />
                    ))}
                 </div>
               </div>
            ) : (
               <textarea value={inputContent} onChange={e => setInputContent(e.target.value)} placeholder="Nhập nội dung bài học..." className="w-full p-4 text-lg rounded-xl border-2 border-slate-200 h-32" />
            )}
            <button onClick={handleGenerate} disabled={isLoading} className="w-full py-4 bg-indigo-500 text-white rounded-xl font-black text-xl shadow-lg hover:bg-indigo-600 transition-all">
               {isLoading ? 'Đang tạo sơ đồ...' : '🚀 Tạo Sơ Đồ Tư Duy'}
            </button>
            {error && <p className="text-red-500 text-center font-bold">⚠️ {error}</p>}
          </div>
        </div>

        {mindMapData && (
          <div className="animate-fade-in flex flex-col items-center">
             <MindMap data={mindMapData} />
             <div className="w-full max-w-4xl mt-16 pt-10 border-t-4 border-dashed border-indigo-100">
                <div className="text-center mb-8 space-y-4">
                   <h3 className="text-3xl font-black text-indigo-600 font-display mb-2">🎤 Chế Độ Thuyết Trình</h3>
                   <input type="text" placeholder="Nhập tên của con để in giấy chứng nhận..." value={studentName} onChange={e => setStudentName(e.target.value)} className="p-4 w-full max-w-md rounded-xl border-2 border-indigo-100 font-bold text-center outline-none bg-indigo-50/30" />
                </div>
                <button onClick={handleGeneratePresentation} disabled={isGeneratingPres} className="w-full py-5 bg-emerald-500 text-white font-black rounded-xl shadow-lg hover:bg-emerald-600 transition-all text-xl uppercase tracking-tighter">
                   {isGeneratingPres ? 'Đang soạn bài thuyết trình...' : '📝 Soạn Bài Thuyết Trình'}
                </button>
                {presentation && <PresentationScriptView script={presentation} studentName={studentName} />}
             </div>
          </div>
        )}
      </div>
    </div>
  );
};
