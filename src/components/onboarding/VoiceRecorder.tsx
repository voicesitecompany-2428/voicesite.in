import React from 'react';

interface VoiceRecorderProps {
    siteType: 'Shop' | 'Menu' | null;
    isRecording: boolean;
    isProcessing: boolean;
    toggleRecording: () => void;
    onSkip: () => void;
    onBack: () => void;
}

export default function VoiceRecorder({
    siteType,
    isRecording,
    isProcessing,
    toggleRecording,
    onSkip,
    onBack,
}: VoiceRecorderProps) {
    return (
        <div className="flex flex-col items-center text-center">
            <div className="w-full flex justify-start mb-4">
                <button onClick={onBack} className="text-gray-500 hover:text-primary transition-colors flex items-center gap-1 text-sm font-medium">
                    <span className="material-symbols-outlined text-lg">arrow_back</span> Back
                </button>
            </div>

            <h2 className="text-xl md:text-3xl font-bold text-[#111418] mb-4">Tell us about your {siteType}</h2>

            <div className="bg-blue-50 rounded-xl p-4 mb-8 w-full max-w-lg border border-blue-100">
                <p className="text-sm text-gray-500 mb-2 font-medium">Please mention:</p>
                <ul className="text-sm text-[#111418] grid grid-cols-1 md:grid-cols-2 gap-2 text-left">
                    <li className="flex items-center gap-2"><span className="material-symbols-outlined text-primary text-sm">check_circle</span> Name & Opening Timing</li>
                    <li className="flex items-center gap-2"><span className="material-symbols-outlined text-primary text-sm">check_circle</span> Contact Details & Location</li>
                </ul>
            </div>

            <div className="relative mb-6 flex flex-col items-center">
                <button
                    onClick={toggleRecording}
                    className={`group relative flex items-center justify-center w-32 h-32 rounded-full shadow-xl transition-all duration-300 focus:outline-none ${isRecording
                        ? 'bg-gradient-to-br from-red-500 to-red-600 ring-4 ring-red-100 scale-110'
                        : 'bg-gradient-to-br from-primary to-blue-600 hover:shadow-2xl hover:scale-105 ring-4 ring-blue-100'
                        }`}
                >
                    <span className="material-symbols-outlined text-white" style={{ fontSize: '64px', fontVariationSettings: "'FILL' 1" }}>
                        {isRecording ? 'graphic_eq' : 'mic'}
                    </span>
                </button>
                <p className={`mt-6 text-sm font-medium animate-pulse ${isRecording ? 'text-red-500 font-bold' : 'text-gray-500'}`}>
                    {isProcessing ? 'Processing AI...' : (isRecording ? 'Listening...' : 'Tap to speak')}
                </p>
            </div>

            {/* Manual Skip Option */}
            <button onClick={onSkip} className="mt-4 text-sm text-gray-400 hover:text-primary underline">
                Skip and fill manually
            </button>
        </div>
    );
}
