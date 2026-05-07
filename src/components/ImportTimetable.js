import React, { useState } from 'react';

export default function ImportTimetable() {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [parsedData, setParsedData] = useState(null);
  
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (!file) return;
    setIsUploading(true);
    setUploadProgress(0);

    // Simulate OCR and AI parsing progress
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          setParsedData({
            teachers: ["Dr. Sharma", "Prof. Verma"],
            subjects: ["Advanced AI", "Cloud Computing"],
            rooms: ["Lab A", "Room 404"],
            message: "AI successfully extracted 15 timetable entries."
          });
          return 100;
        }
        return prev + 5;
      });
    }, 150);
  };

  return (
    <div className="glass-card p-6 rounded-2xl border border-white/10 text-slate-200">
      <h2 className="text-2xl font-bold mb-4 text-white">AI Timetable Import</h2>
      <p className="text-sm text-slate-400 mb-6">
        Upload a PDF, Image, or Excel timetable. Our AI will automatically extract teachers, subjects, classrooms, and timings using OCR and GPT-based parsing.
      </p>

      <div className="border-2 border-dashed border-slate-600 rounded-xl p-8 text-center bg-slate-800/30 hover:bg-slate-800/50 transition-colors">
        <svg className="w-12 h-12 text-slate-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p className="text-sm text-slate-300 mb-2">Drag and drop your file here, or click to browse</p>
        <input 
          type="file" 
          accept=".pdf,.png,.jpg,.jpeg,.xlsx,.csv" 
          onChange={handleFileChange} 
          className="hidden" 
          id="file-upload" 
        />
        <label htmlFor="file-upload" className="cursor-pointer inline-block bg-white/10 hover:bg-white/20 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors">
          Select File
        </label>
        {file && <p className="mt-4 text-sm text-emerald-400 font-medium">Selected: {file.name}</p>}
      </div>

      {file && !parsedData && (
        <div className="mt-6 flex justify-end">
          <button 
            onClick={handleUpload} 
            disabled={isUploading}
            className="btn-gradient px-6 py-2 flex items-center gap-2"
          >
            {isUploading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                Processing AI OCR... {uploadProgress}%
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z" />
                </svg>
                Parse Timetable Data
              </>
            )}
          </button>
        </div>
      )}

      {isUploading && (
        <div className="mt-6 w-full bg-slate-800 rounded-full h-2.5">
          <div className="bg-gradient-to-r from-violet-500 to-indigo-500 h-2.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
        </div>
      )}

      {parsedData && (
        <div className="mt-8 animate-fade-in-up">
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-start gap-3 mb-6">
            <svg className="w-5 h-5 text-emerald-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <div>
              <h4 className="text-emerald-300 font-bold">Extraction Successful</h4>
              <p className="text-sm text-emerald-200/80">{parsedData.message}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Teachers Found</h5>
              <ul className="text-sm space-y-1">
                {parsedData.teachers.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Subjects Found</h5>
              <ul className="text-sm space-y-1">
                {parsedData.subjects.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Rooms Found</h5>
              <ul className="text-sm space-y-1">
                {parsedData.rooms.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button className="px-4 py-2 text-sm font-medium rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
              Edit Data
            </button>
            <button className="btn-gradient px-6 py-2 text-sm">
              Auto-Fill Scheduler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
