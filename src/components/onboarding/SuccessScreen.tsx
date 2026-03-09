import React from 'react';
import PosterGenerator from '../PosterGenerator';

interface SuccessScreenProps {
    siteDetails: { name: string };
    generatedSlug: string;
    siteType: 'Shop' | 'Menu' | null;
    onClose: () => void;
}

export default function SuccessScreen({
    siteDetails,
    generatedSlug,
    siteType,
    onClose
}: SuccessScreenProps) {
    const siteUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/shop/${generatedSlug}`;

    return (
        <div className="flex flex-col items-center text-center">
            <div className="mb-6 flex justify-center">
                <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center animate-bounce">
                    <span className="material-symbols-outlined text-6xl text-green-500">check_circle</span>
                </div>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-[#111418] mb-2">Congratulations! 🎉</h2>
            <p className="text-gray-500 mb-8">You have created a website.</p>

            <div className="w-full max-w-md bg-blue-50 rounded-xl p-6 border border-blue-100 mb-6">
                <p className="text-sm font-bold text-gray-500 mb-2 uppercase tracking-wide">Your Website Link</p>
                <div className="flex items-center gap-2 bg-white rounded-lg p-2 border border-gray-200">
                    <span className="material-symbols-outlined text-gray-400 ml-2">link</span>
                    <input type="text" readOnly className="w-full bg-transparent outline-none text-[#111418] font-medium text-sm" value={siteUrl} />
                </div>
            </div>

            {/* Poster Download Section */}
            <div className="w-full flex justify-center mb-6">
                <PosterGenerator
                    siteName={siteDetails.name}
                    siteUrl={siteUrl}
                    siteType={siteType || 'Shop'}
                />
            </div>

            <div className="w-full pt-6 border-t border-gray-100 flex flex-col md:flex-row justify-center gap-4">
                <a href={`/shop/${generatedSlug}`} target="_blank" rel="noreferrer" className="px-6 py-3 border border-primary text-primary font-bold rounded-full hover:bg-blue-50 transition-colors flex items-center justify-center gap-2">
                    Visit Website <span className="material-symbols-outlined">open_in_new</span>
                </a>
                <button onClick={onClose} className="px-8 py-3 bg-primary hover:bg-blue-600 text-white font-bold rounded-full shadow-lg transition-all hover:scale-105 flex items-center gap-2">
                    Go to Dashboard <span className="material-symbols-outlined">arrow_forward</span>
                </button>
            </div>
        </div>
    );
}
