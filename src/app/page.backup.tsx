'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

// Types
type ProcessingStep = 'idle' | 'uploading' | 'transcribing' | 'extracting' | 'creating' | 'done' | 'error';

type ShopType = 'ecommerce' | 'cloud_kitchen' | 'clothes_shop' | 'retail' | 'mobile_service';

interface ShopData {
    shopName: string;
    shopType: ShopType | null;
    shopNameAudioUrl: string | null;
    detailsAudioUrl: string | null;
    productAudioUrls: (string | null)[];
}

const SHOP_TYPES: { value: ShopType; label: string; icon: string }[] = [
    { value: 'ecommerce', label: 'E-Commerce', icon: '🛒' },
    { value: 'cloud_kitchen', label: 'Cloud Kitchen', icon: '🍳' },
    { value: 'clothes_shop', label: 'Clothes Shop', icon: '👕' },
    { value: 'retail', label: 'Retail', icon: '🏪' },
    { value: 'mobile_service', label: 'Mobile Service & Sales', icon: '📱' },
];

// Recording time limits in seconds
const STEP1_TIME_LIMIT = 12;
const STEP2_TIME_LIMIT = 28;
const STEP3_TIME_LIMIT = 28;

export default function HomePage() {
    // Wizard state
    const [currentStep, setCurrentStep] = useState(1);
    const [shopData, setShopData] = useState<ShopData>({
        shopName: '',
        shopType: null,
        shopNameAudioUrl: null,
        detailsAudioUrl: null,
        productAudioUrls: [null, null, null],
    });

    // Recording state
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [currentRecordingTarget, setCurrentRecordingTarget] = useState<'name' | 'details' | 'product0' | 'product1' | 'product2' | null>(null);
    const [audioBlobs, setAudioBlobs] = useState<{
        name: Blob | null;
        details: Blob | null;
        products: (Blob | null)[];
    }>({
        name: null,
        details: null,
        products: [null, null, null],
    });

    // Processing state
    const [processingStep, setProcessingStep] = useState<ProcessingStep>('idle');
    const [error, setError] = useState<string | null>(null);
    const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);

    // Refs
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Get time limit based on current recording target
    const getTimeLimit = useCallback(() => {
        if (currentRecordingTarget === 'name') return STEP1_TIME_LIMIT;
        return currentRecordingTarget === 'details' ? STEP2_TIME_LIMIT : STEP3_TIME_LIMIT;
    }, [currentRecordingTarget]);

    // Start recording with timer
    const startRecording = useCallback(async (target: 'name' | 'details' | 'product0' | 'product1' | 'product2') => {
        try {
            setError(null);
            setCurrentRecordingTarget(target);
            setRecordingTime(0);

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus',
            });

            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });

                // Save blob to appropriate state
                if (target === 'name') {
                    setAudioBlobs(prev => ({ ...prev, name: blob }));
                } else if (target === 'details') {
                    setAudioBlobs(prev => ({ ...prev, details: blob }));
                } else {
                    const productIndex = parseInt(target.replace('product', ''));
                    setAudioBlobs(prev => ({
                        ...prev,
                        products: prev.products.map((p, i) => i === productIndex ? blob : p),
                    }));
                }

                stream.getTracks().forEach(track => track.stop());
                setCurrentRecordingTarget(null);
            };

            mediaRecorder.start(1000);
            setIsRecording(true);

            // Start timer
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

        } catch (err) {
            setError('Failed to access microphone. Please allow microphone access.');
            console.error(err);
        }
    }, []);

    // Stop recording
    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
    }, [isRecording]);

    // Auto-stop when time limit reached
    useEffect(() => {
        const limit = getTimeLimit();
        if (isRecording && recordingTime >= limit) {
            stopRecording();
        }
    }, [recordingTime, isRecording, getTimeLimit, stopRecording]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        };
    }, []);

    // Upload audio and get URL
    const uploadAudio = async (blob: Blob, filename: string): Promise<string> => {
        const formData = new FormData();
        formData.append('audio', blob, filename);

        const res = await fetch('/api/voice/upload', {
            method: 'POST',
            body: formData,
        });

        if (!res.ok) throw new Error('Upload failed');
        const { audioUrl } = await res.json();
        return audioUrl;
    };

    // Process all audio and create website
    const processAndCreate = async () => {
        if (!audioBlobs.name || !audioBlobs.details || audioBlobs.products.some(p => !p) || !shopData.shopType) {
            setError('Please complete all recordings and select a shop type.');
            return;
        }

        try {
            setError(null);
            setProcessingStep('uploading');

            // Upload all audio files
            const [nameUrl, detailsUrl, ...productUrls] = await Promise.all([
                uploadAudio(audioBlobs.name, 'shop-name.webm'),
                uploadAudio(audioBlobs.details, 'shop-details.webm'),
                ...audioBlobs.products.map((p, i) => uploadAudio(p!, `product-${i + 1}.webm`)),
            ]);

            // Process shop name
            setProcessingStep('transcribing');
            const nameRes = await fetch('/api/voice/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audioUrl: nameUrl, context: 'name' }),
            });
            const { extractedData: nameData } = await nameRes.json();

            // Process details
            const detailsRes = await fetch('/api/voice/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audioUrl: detailsUrl, context: 'details' }),
            });
            const { transcription: detailsTranscription, extractedData: detailsData } = await detailsRes.json();

            // Process products
            setProcessingStep('extracting');
            const productTranscriptions = await Promise.all(
                productUrls.map(async (url) => {
                    const res = await fetch('/api/voice/process', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ audioUrl: url, context: 'product' }),
                    });
                    return res.json();
                })
            );

            // Create website with properly structured data
            setProcessingStep('creating');
            const createRes = await fetch('/api/site/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    extractedData: {
                        shopName: nameData?.shopName || 'My Shop',
                        shopType: shopData.shopType,
                        description: detailsData?.description,
                        location: detailsData?.location,
                        timings: detailsData?.timings,
                        contact: {
                            phone: detailsData?.phone,
                        },
                        products: productTranscriptions.map(p => p.extractedData?.product || { name: p.transcription, price: 0 }),
                    },
                    transcription: `${nameData?.shopName}. ${detailsTranscription}. ${productTranscriptions.map(p => p.transcription).join('. ')}`,
                }),
            });

            if (!createRes.ok) throw new Error('Failed to create website');
            const { websiteUrl } = await createRes.json();
            setGeneratedUrl(websiteUrl);
            setProcessingStep('done');

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
            setProcessingStep('error');
        }
    };

    // Check if can proceed to next step
    const canProceedStep1 = audioBlobs.name && shopData.shopType;
    const canProceedStep2 = audioBlobs.details;
    const canCreateWebsite = audioBlobs.products.every(p => p !== null);

    // Render recording button
    const RecordButton = ({
        target,
        timeLimit,
        size = 'large',
    }: {
        target: 'name' | 'details' | 'product0' | 'product1' | 'product2';
        timeLimit: number;
        size?: 'large' | 'small';
    }) => {
        const isThisRecording = isRecording && currentRecordingTarget === target;
        const hasRecording = target === 'name' ? audioBlobs.name :
            target === 'details' ? audioBlobs.details :
                audioBlobs.products[parseInt(target.replace('product', ''))];

        const progress = isThisRecording ? (recordingTime / timeLimit) * 100 : 0;
        const buttonSize = size === 'large' ? 'w-28 h-28' : 'w-20 h-20';
        const iconSize = size === 'large' ? 'text-4xl' : 'text-2xl';

        return (
            <div className="flex flex-col items-center gap-2">
                <div className="relative">
                    {/* Progress ring */}
                    {isThisRecording && (
                        <svg className={`absolute -inset-2 ${size === 'large' ? 'w-32 h-32' : 'w-24 h-24'}`} viewBox="0 0 100 100">
                            <circle
                                cx="50" cy="50" r="45"
                                fill="none"
                                stroke="#374151"
                                strokeWidth="4"
                            />
                            <circle
                                cx="50" cy="50" r="45"
                                fill="none"
                                stroke="#ef4444"
                                strokeWidth="4"
                                strokeDasharray={`${progress * 2.83} 283`}
                                strokeLinecap="round"
                                transform="rotate(-90 50 50)"
                                className="transition-all duration-1000"
                            />
                        </svg>
                    )}

                    <button
                        onClick={() => isThisRecording ? stopRecording() : startRecording(target)}
                        disabled={isRecording && !isThisRecording}
                        className={`${buttonSize} rounded-full flex items-center justify-center ${iconSize} transition-all duration-300 ${isThisRecording
                            ? 'bg-red-500 hover:bg-red-600 animate-pulse shadow-lg shadow-red-500/50'
                            : hasRecording
                                ? 'bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/30'
                                : 'bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg shadow-purple-500/30'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {isThisRecording ? '⏹️' : hasRecording ? '✅' : '🎙️'}
                    </button>
                </div>

                {/* Timer display */}
                <p className="text-slate-400 text-sm font-mono">
                    {isThisRecording
                        ? `${recordingTime}s / ${timeLimit}s`
                        : hasRecording
                            ? 'Recorded ✓'
                            : `Max ${timeLimit}s`
                    }
                </p>

                {/* Audio preview */}
                {hasRecording && !isThisRecording && (
                    <audio
                        controls
                        src={URL.createObjectURL(hasRecording)}
                        className="w-full max-w-xs h-8"
                    />
                )}
            </div>
        );
    };

    // Progress indicator
    const ProgressIndicator = () => (
        <div className="flex items-center justify-center gap-2 mb-8">
            {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${currentStep === step
                        ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white scale-110'
                        : currentStep > step
                            ? 'bg-green-500 text-white'
                            : 'bg-slate-700 text-slate-400'
                        }`}>
                        {currentStep > step ? '✓' : step}
                    </div>
                    {step < 3 && (
                        <div className={`w-16 h-1 mx-2 rounded ${currentStep > step ? 'bg-green-500' : 'bg-slate-700'}`} />
                    )}
                </div>
            ))}
        </div>
    );

    // Reset wizard
    const resetWizard = () => {
        setCurrentStep(1);
        setShopData({
            shopName: '',
            shopType: null,
            shopNameAudioUrl: null,
            detailsAudioUrl: null,
            productAudioUrls: [null, null, null],
        });
        setAudioBlobs({ name: null, details: null, products: [null, null, null] });
        setProcessingStep('idle');
        setError(null);
        setGeneratedUrl(null);
    };

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
            <div className="container mx-auto px-4 py-8 max-w-2xl">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                        🎤 Voice to Website
                    </h1>
                    <p className="text-slate-400">Create your shop in 3 simple steps</p>
                </div>

                {/* Progress */}
                <ProgressIndicator />

                {/* Step 1: Shop Name & Type */}
                {currentStep === 1 && processingStep === 'idle' && (
                    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700">
                        <h2 className="text-xl font-semibold mb-6 text-center">Step 1: Shop Name & Type</h2>

                        {/* Shop Name Recording */}
                        <div className="text-center mb-8">
                            <p className="text-slate-300 mb-4">🎙️ Say your shop name</p>
                            <RecordButton target="name" timeLimit={STEP1_TIME_LIMIT} />
                        </div>

                        {/* Shop Type Selection */}
                        <div className="mb-8">
                            <p className="text-slate-300 mb-4 text-center">Select your shop type:</p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {SHOP_TYPES.map((type) => (
                                    <button
                                        key={type.value}
                                        onClick={() => setShopData(prev => ({ ...prev, shopType: type.value }))}
                                        className={`p-4 rounded-xl border-2 transition-all ${shopData.shopType === type.value
                                            ? 'border-purple-500 bg-purple-500/20'
                                            : 'border-slate-600 hover:border-slate-500 bg-slate-700/50'
                                            }`}
                                    >
                                        <div className="text-2xl mb-1">{type.icon}</div>
                                        <div className="text-sm">{type.label}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Next Button */}
                        <button
                            onClick={() => setCurrentStep(2)}
                            disabled={!canProceedStep1}
                            className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next → Step 2
                        </button>
                    </div>
                )}

                {/* Step 2: Description & Contact */}
                {currentStep === 2 && processingStep === 'idle' && (
                    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700">
                        <h2 className="text-xl font-semibold mb-6 text-center">Step 2: Shop Details</h2>

                        <div className="text-center mb-8">
                            <p className="text-slate-300 mb-2">🎙️ Tell us about your shop</p>
                            <p className="text-slate-500 text-sm mb-4">
                                Include: Description, Location, Phone Number
                            </p>
                            <RecordButton target="details" timeLimit={STEP2_TIME_LIMIT} />
                        </div>

                        {/* Navigation Buttons */}
                        <div className="flex gap-4">
                            <button
                                onClick={() => setCurrentStep(1)}
                                className="flex-1 py-4 bg-slate-700 hover:bg-slate-600 rounded-xl font-semibold transition-all"
                            >
                                ← Back
                            </button>
                            <button
                                onClick={() => setCurrentStep(3)}
                                disabled={!canProceedStep2}
                                className="flex-1 py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next → Step 3
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Products */}
                {currentStep === 3 && processingStep === 'idle' && (
                    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700">
                        <h2 className="text-xl font-semibold mb-6 text-center">Step 3: Add Products</h2>

                        <p className="text-slate-400 text-center text-sm mb-6">
                            Record 3 products with name, price, and description
                        </p>

                        <div className="grid grid-cols-3 gap-4 mb-8">
                            {[0, 1, 2].map((index) => (
                                <div key={index} className="text-center">
                                    <p className="text-slate-300 mb-2 font-medium">Product {index + 1}</p>
                                    <RecordButton
                                        target={`product${index}` as 'product0' | 'product1' | 'product2'}
                                        timeLimit={STEP3_TIME_LIMIT}
                                        size="small"
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Links Info */}
                        <div className="mb-6 p-4 bg-slate-700/50 rounded-xl">
                            <h3 className="text-sm font-semibold text-slate-300 mb-2">📌 After creation you&apos;ll get:</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2 text-green-400">
                                    <span>🌐</span>
                                    <span>Website Link - Your public shop page</span>
                                </div>
                                <div className="flex items-center gap-2 text-purple-400">
                                    <span>⚙️</span>
                                    <span>Manage Link - Edit your shop anytime</span>
                                </div>
                            </div>
                        </div>

                        {/* Navigation Buttons */}
                        <div className="flex gap-4">
                            <button
                                onClick={() => setCurrentStep(2)}
                                className="flex-1 py-4 bg-slate-700 hover:bg-slate-600 rounded-xl font-semibold transition-all"
                            >
                                ← Back
                            </button>
                            <button
                                onClick={processAndCreate}
                                disabled={!canCreateWebsite}
                                className="flex-1 py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                🚀 Create Website
                            </button>
                        </div>
                    </div>
                )}

                {/* Processing Status */}
                {processingStep !== 'idle' && processingStep !== 'done' && processingStep !== 'error' && (
                    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700">
                        <h3 className="text-lg font-semibold mb-4 text-center">Creating Your Website...</h3>

                        <div className="space-y-3">
                            {(['uploading', 'transcribing', 'extracting', 'creating'] as ProcessingStep[]).map((s) => {
                                const isActive = processingStep === s;
                                const steps = ['uploading', 'transcribing', 'extracting', 'creating', 'done'];
                                const isComplete = steps.indexOf(processingStep) > steps.indexOf(s);
                                const labels: Record<string, string> = {
                                    uploading: '📤 Uploading audio files...',
                                    transcribing: '🎤 Transcribing with Sarvam AI...',
                                    extracting: '🤖 Extracting data with GPT-4o...',
                                    creating: '🏗️ Creating your website...',
                                };

                                return (
                                    <div
                                        key={s}
                                        className={`p-3 rounded-lg flex items-center gap-3 transition-all ${isActive ? 'bg-purple-500/20 border border-purple-500/50' :
                                            isComplete ? 'bg-green-500/20 border border-green-500/50' :
                                                'bg-slate-700/30 border border-transparent'
                                            }`}
                                    >
                                        <span className={isActive ? 'animate-spin' : ''}>
                                            {isComplete ? '✅' : isActive ? '⏳' : '⭕'}
                                        </span>
                                        <span className={isActive ? 'text-purple-300' : isComplete ? 'text-green-300' : 'text-slate-500'}>
                                            {labels[s]}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Success */}
                {processingStep === 'done' && generatedUrl && (
                    <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-sm rounded-2xl p-8 border border-green-500/50 text-center">
                        <h3 className="text-2xl font-bold text-green-400 mb-4">🎉 Website Created!</h3>
                        <p className="text-slate-300 mb-6">Your shop website is ready:</p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-4">
                            <a
                                href={generatedUrl}
                                className="inline-block px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 rounded-xl font-semibold transition-all"
                            >
                                👀 View Website
                            </a>
                            <a
                                href="/manage"
                                className="inline-block px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-xl font-semibold transition-all"
                            >
                                ⚙️ Manage Shop
                            </a>
                        </div>
                        <p className="text-slate-400 text-sm font-mono">{generatedUrl}</p>
                        <p className="mt-2 text-slate-500 text-xs">
                            💡 Login with your phone number to edit your shop anytime
                        </p>
                        <button
                            onClick={resetWizard}
                            className="mt-6 px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                        >
                            🔄 Create Another
                        </button>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mt-6">
                        <p className="text-red-400">❌ {error}</p>
                        <button
                            onClick={() => setError(null)}
                            className="mt-3 px-4 py-2 bg-red-500/30 hover:bg-red-500/40 rounded-lg text-sm transition-colors"
                        >
                            Dismiss
                        </button>
                    </div>
                )}

                {/* Tips */}
                <div className="text-center text-slate-500 text-sm mt-8">
                    <p>💡 Speak clearly in any language - we support Hindi, Tamil, Telugu, and more!</p>
                </div>
            </div>
        </main>
    );
}
