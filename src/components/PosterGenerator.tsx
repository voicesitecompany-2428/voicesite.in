import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface PosterGeneratorProps {
    siteName: string;
    siteUrl: string;
    siteType: 'Shop' | 'Menu';
}

const PosterGenerator: React.FC<PosterGeneratorProps> = ({ siteName, siteUrl, siteType }) => {
    const posterRef = useRef<HTMLDivElement>(null);

    const handleDownload = async () => {
        if (!posterRef.current) return;

        try {
            const canvas = await html2canvas(posterRef.current, {
                scale: 2, // Higher resolution
                useCORS: true,
                backgroundColor: '#EF4444', // Ensure red background
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'px',
                format: [canvas.width, canvas.height]
            });

            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
            pdf.save(`${siteName.replace(/\s+/g, '_')}_Poster.pdf`);
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Failed to generate poster. Please try again.');
        }
    };

    return (
        <div className="flex flex-col items-center">
            {/* Hidden Poster Template (rendered off-screen or hidden but accessible for html2canvas) */}
            <div style={{ position: 'absolute', top: '-10000px', left: 0 }}>
                <div
                    ref={posterRef}
                    className="w-[375px] h-[667px] bg-[#EF4444] flex flex-col items-center justify-between py-12 px-6 text-white font-sans relative overflow-hidden"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                >
                    {/* Grunge/Texture Overlay (Optional - simulated with CSS or image if available) */}

                    {/* Header */}
                    <div className="text-center z-10 mt-10 px-4">
                        <h1 className="text-4xl font-black tracking-tight mb-1 drop-shadow-md uppercase leading-tight" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>{siteName}</h1>
                    </div>

                    {/* Script Text */}
                    <div className="z-10 mt-6 mb-10 transform -rotate-6">
                        {/* Fallback script font style if a specific font isn't loaded, using a cursive generic */}
                        <h2 className="text-7xl font-light text-yellow-300" style={{ fontFamily: "'Brush Script MT', cursive", textShadow: '2px 2px 2px rgba(0,0,0,0.2)' }}>
                            {siteType}
                        </h2>
                    </div>

                    {/* QR Section */}
                    <div className="relative z-10 flex items-center justify-center">
                        {/* Circular Text / Border Simulation */}
                        <div className="absolute w-64 h-64 border-4 border-white rounded-full border-dashed opacity-90 animate-spin-slow"></div>
                        <div className="absolute w-56 h-56 border-2 border-white rounded-full opacity-70"></div>

                        {/* "SCAN ME" Text Simulation - positioned around */}
                        <div className="absolute w-full h-full flex items-center justify-center">
                            {/* Top Text */}
                            <span className="absolute -top-8 text-xl font-black tracking-[0.2em] uppercase text-yellow-300 drop-shadow-md bg-[#EF4444] px-2">Scan Me</span>
                            {/* Bottom Text */}
                            <span className="absolute -bottom-8 text-xl font-black tracking-[0.2em] uppercase text-yellow-300 drop-shadow-md bg-[#EF4444] px-2">Scan Me</span>
                        </div>

                        {/* QR Code */}
                        <div className="bg-white p-4 rounded-2xl shadow-2xl relative z-20 transform rotate-0 hover:rotate-2 transition-transform">
                            <QRCodeSVG
                                value={siteUrl}
                                size={160}
                                level="H"
                                includeMargin={false}
                            />
                        </div>

                        {/* Snowflake/Decoration placeholders */}
                        <div className="absolute left-[-40px] top-[50%] transform -translate-y-1/2">
                            <span className="material-symbols-outlined text-4xl text-white opacity-90 drop-shadow-sm">ac_unit</span>
                        </div>
                        <div className="absolute right-[-40px] top-[50%] transform -translate-y-1/2">
                            <span className="material-symbols-outlined text-4xl text-white opacity-90 drop-shadow-sm">ac_unit</span>
                        </div>
                    </div>

                    {/* Footer Call to Action */}
                    <div className="text-center z-10 mt-auto mb-12">
                        <p className="text-lg font-black tracking-widest uppercase text-white drop-shadow-sm leading-relaxed">Scan the QR Code &</p>
                        <p className="text-lg font-black tracking-widest uppercase text-white drop-shadow-sm leading-relaxed">Order Your Favourites</p>
                    </div>

                    {/* Branding Footer */}
                    <div className="absolute bottom-3 left-0 w-full text-center z-10">
                        <p className="text-[10px] font-medium text-white/70 tracking-widest uppercase">Created by voicesite.in</p>
                    </div>

                    {/* Bottom Border/Texture simulation */}
                    <div className="absolute bottom-0 left-0 w-full h-3 bg-white opacity-20"></div>
                </div>
            </div>

            <button
                onClick={handleDownload}
                className="w-full md:w-auto px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-full shadow-lg transition-all hover:scale-105 flex items-center justify-center gap-2"
            >
                <span className="material-symbols-outlined">download</span> Download Poster
            </button>
        </div>
    );
};

export default PosterGenerator;
