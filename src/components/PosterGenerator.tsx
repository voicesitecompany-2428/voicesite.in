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
                scale: 3, // Higher resolution for better print quality
                useCORS: true,
                backgroundColor: '#FFC83B', // Match the yellow background
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'px',
                format: [canvas.width / 3, canvas.height / 3] // Adjust PDF size to match rendered size
            });

            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 3, canvas.height / 3);
            pdf.save(`${siteName.replace(/\s+/g, '_')}_Poster.pdf`);
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Failed to generate poster. Please try again.');
        }
    };

    return (
        <div className="flex flex-col items-center">
            {/* Poster Template (Visible for preview, also used for generation) */}
            <div className="relative mb-6 shadow-2xl rounded-sm overflow-hidden border-8 border-white/50">
                <div
                    ref={posterRef}
                    className="w-[350px] h-[495px] bg-[#FFC83B] flex flex-col relative overflow-hidden"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                >
                    {/* --- Content --- */}

                    {/* Shop Name */}
                    <div className="w-full text-center mt-[40px] z-20">
                        <h1 className="text-5xl text-black font-black tracking-tighter leading-none transform -rotate-2" style={{ fontFamily: "Impact, sans-serif" }}>
                            {siteName || "SHOP NAME"}
                        </h1>
                    </div>

                    {/* Scan Here + Arrow (Top Left relative to center) */}
                    <div className="absolute top-[110px] left-[30px] z-20 flex flex-col items-start transform -rotate-6">
                        <span className="text-sm font-black uppercase tracking-widest text-black mb-1" style={{ fontFamily: "'Courier New', monospace" }}>SCAN HERE</span>
                        {/* Curved Arrow SVG */}
                        <svg width="60" height="40" viewBox="0 0 60 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-black ml-4">
                            <path d="M2 10C15 0 40 0 50 15C55 22 55 30 50 35M50 35L40 30M50 35L55 25" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>

                    {/* Crown (Top Right) */}
                    <div className="absolute top-[110px] right-[30px] z-20 transform rotate-12">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-black">
                            <path d="M2 20h20" />
                            <path d="M5 20v-9L2 7l6-2 4 6 4-6 6 2-3 4v9" />
                        </svg>
                    </div>

                    {/* Loop/Squiggle (Left) */}
                    <div className="absolute top-[200px] left-[20px] z-20 transform -rotate-12">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-black">
                            <path d="M12 2C8 2 4 6 4 10C4 18 16 16 16 10C16 6 12 6 10 9" />
                        </svg>
                    </div>


                    {/* Paper Plane (Right Middle) */}
                    <div className="absolute top-[240px] right-[20px] z-20 transform -rotate-12">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-black">
                            <path d="M22 2L11 13" />
                            <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                        </svg>
                    </div>

                    {/* Envelope (Bottom Left) */}
                    <div className="absolute bottom-[60px] left-[30px] z-20 transform rotate-6">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-black">
                            <rect width="20" height="16" x="2" y="4" rx="2" />
                            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                        </svg>
                    </div>

                    {/* Wavy Lines (Bottom Right) */}
                    <div className="absolute bottom-[60px] right-[30px] z-20 transform animate-pulse">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-black">
                            <path d="M2 8l4-4 4 4" />
                            <path d="M2 12l4-4 4 4" />
                            <path d="M2 16l4-4 4 4" />
                            <path d="M14 6l4 4 4-4" />
                            <path d="M14 10l4 4 4-4" />
                        </svg>
                    </div>

                    {/* Center QR Code Area */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 w-full flex flex-col items-center justify-center">
                        <div className="w-[220px] h-[2px] bg-black/10 rounded-full mb-8 filter blur-[1px]"></div>

                        <div className="p-4 bg-white rounded-xl shadow-sm rotate-1">
                            <QRCodeSVG
                                value={siteUrl}
                                size={180}
                                level="H"
                                includeMargin={true}
                                fgColor="#000000"
                                bgColor="#FFFFFF"
                            />
                        </div>

                        <div className="w-[220px] h-[2px] bg-black/10 rounded-full mt-8 filter blur-[1px]"></div>
                    </div>


                    {/* Footer - created by */}
                    <div className="absolute bottom-5 w-full text-center z-20">
                        <p className="text-sm font-medium text-black lowercase tracking-wider" style={{ fontFamily: "'Courier New', monospace" }}>
                            created by -voicesite.in
                        </p>
                    </div>

                </div>
            </div>

            <button
                onClick={handleDownload}
                className="px-8 py-3 bg-[#111418] hover:bg-black text-white font-bold rounded-full shadow-xl transition-all hover:scale-105 flex items-center justify-center gap-2"
            >
                <span className="material-symbols-outlined">download</span> Download Poster
            </button>
        </div>
    );
};

export default PosterGenerator;
