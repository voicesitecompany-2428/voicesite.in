'use client';

import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { compressImage } from '@/utils/compressImage';
import Stepper, { Step } from './Stepper';

// New Sub-Components
import TypeSelector from './onboarding/TypeSelector';
import VoiceRecorder from './onboarding/VoiceRecorder';
import DataReview from './onboarding/DataReview';
import ProductEditor from './onboarding/ProductEditor';
import SuccessScreen from './onboarding/SuccessScreen';

// --- Types ---
interface OnboardingModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type SiteType = 'Shop' | 'Menu' | null;

export default function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
    // Stepper uses 1-based index, so we'll map our 0-4 steps to 1-5
    // 0: Selection -> Step 1
    // 1: Voice -> Step 2
    // 2: Review -> Step 3
    // 3: Products -> Step 4
    // 4: Success -> Step 5
    const [step, setStep] = useState<number>(1);
    const [siteType, setSiteType] = useState<SiteType>(null);
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Real Data States
    const [siteDetails, setSiteDetails] = useState({
        name: '',
        owner_name: '',
        contact_number: '',
        email: '',
        whatsapp_number: '',
        tagline: '',
        timing: '',
        established_year: '',
        location: '',
        state: '',
        pincode: '',
        address: '',
        description: '',
        image_url: '',
        social_links: { instagram: '', facebook: '', twitter: '' }
    });

    const [products, setProducts] = useState<any[]>([]);
    const [currentProduct, setCurrentProduct] = useState({ name: '', price: '', desc: '', image_url: '' });
    const fileInputRef = useRef<HTMLInputElement>(null);
    const bannerInputRef = useRef<HTMLInputElement>(null);
    const productCameraInputRef = useRef<HTMLInputElement>(null);
    const bannerCameraInputRef = useRef<HTMLInputElement>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [generatedSlug, setGeneratedSlug] = useState('');

    const [isProcessing, setIsProcessing] = useState(false);
    const audioChunksRef = useRef<Blob[]>([]);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Reset on close or open
    const [limits, setLimits] = useState({
        shopLimit: 0,
        menuLimit: 0,
        shopUsed: 0,
        menuUsed: 0,
        storeExpired: false,
        menuExpired: false,
        loading: true
    });

    // Reset on close or open
    useEffect(() => {
        if (isOpen) {
            // Lock body scroll
            document.body.style.overflow = 'hidden';

            setStep(1);
            setSiteType(null);
            setIsRecording(false);
            setProducts([]);
            setCurrentProduct({ name: '', price: '', desc: '', image_url: '' });
            setSiteDetails({
                name: '',
                owner_name: '',
                contact_number: '',
                email: '',
                whatsapp_number: '',
                tagline: '',
                timing: '',
                established_year: '',
                location: '',
                state: '',
                pincode: '',
                address: '',
                description: '',
                image_url: '',
                social_links: { instagram: '', facebook: '', twitter: '' }
            });
            setIsSaving(false);
            setIsProcessing(false);
            audioChunksRef.current = [];

            // Fetch limits
            fetchLimits();
        } else {
            // Unlock body scroll
            document.body.style.overflow = 'unset';
        }

        // Cleanup function to ensure scroll is unlocked and media is released if component unmounts
        return () => {
            document.body.style.overflow = 'unset';
            // Release microphone if still recording
            streamRef.current?.getTracks().forEach(track => track.stop());
            streamRef.current = null;
            mediaRecorderRef.current = null;
        };
    }, [isOpen]);

    // Auto-scroll to top when step changes (better mobile UX)
    useEffect(() => {
        scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, [step]);

    const fetchLimits = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const { data: sub } = await supabase
                .from('user_subscriptions')
                .select('shop_limit, menu_limit, store_expires_at, menu_expires_at')
                .eq('user_id', session.user.id)
                .single();

            // Count sites (without user_id filter for legacy compatibility, relying on RLS/visibility)
            // Actually, we should use the same logic as Sidebar/DashboardHeader now (relying on RLS is fine as we fixed ownership)
            const { data: sites } = await supabase
                .from('sites')
                .select('id, type')
                .eq('user_id', session.user.id);

            const shopUsed = sites?.filter(s => s.type === 'Shop').length || 0;
            const menuUsed = sites?.filter(s => s.type === 'Menu').length || 0;

            if (sub) {
                const now = new Date();
                setLimits({
                    shopLimit: sub.shop_limit || 0,
                    menuLimit: sub.menu_limit || 0,
                    shopUsed,
                    menuUsed,
                    storeExpired: new Date(sub.store_expires_at) < now,
                    menuExpired: new Date(sub.menu_expires_at) < now,
                    loading: false
                });
            }
        } catch (error) {
            console.error('Error fetching limits:', error);
        }
    };

    const handleSelectType = (type: 'Shop' | 'Menu') => {
        if (limits.loading) return;

        if (type === 'Shop') {
            if (limits.storeExpired) {
                toast.error('Your Store plan has expired. Please recharge to create a shop.');
                return;
            }
            if (limits.shopUsed >= limits.shopLimit) {
                alert(`You have reached your Shop limit (${limits.shopUsed}/${limits.shopLimit}). Please upgrade your plan.`);
                return;
            }
        } else {
            if (limits.menuExpired) {
                toast.error('Your Menu plan has expired. Please recharge to create a menu.');
                return;
            }
            if (limits.menuUsed >= limits.menuLimit) {
                alert(`You have reached your Menu limit (${limits.menuUsed}/${limits.menuLimit}). Please upgrade your plan.`);
                return;
            }
        }

        setSiteType(type);
        setStep(2);
    };

    const labels = siteType === 'Menu' ? {
        name: 'Restaurant/Cafe Name',
        timing: 'Opening Hours',
        productsTitle: 'Add Menu Items',
        productName: 'Dish Name',
        yourItems: 'Your Menu Items',
        addBtn: 'Add Item',
        productPlaceholder: 'e.g. Pasta'
    } : {
        name: 'Shop Name',
        timing: 'Shop Timing',
        productsTitle: 'Add Products',
        productName: 'Product Name',
        yourItems: 'Your Products',
        addBtn: 'Add Product',
        productPlaceholder: 'e.g. Biryani'
    };


    const toggleRecording = async () => {
        if (!isRecording) {
            audioChunksRef.current = []; // Clear previous
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                streamRef.current = stream; // Store for cleanup
                const mediaRecorder = new MediaRecorder(stream);
                mediaRecorderRef.current = mediaRecorder;

                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        audioChunksRef.current.push(event.data);
                    }
                };

                mediaRecorder.onstop = async () => {
                    setIsProcessing(true);
                    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

                    const formData = new FormData();
                    formData.append('audio', audioBlob, 'voice_input.webm');
                    if (siteType) {
                        formData.append('type', siteType);
                    }

                    try {
                        // Get auth token for the API call
                        const { data: { session } } = await supabase.auth.getSession();
                        if (!session?.access_token) {
                            throw new Error('You must be logged in to use voice input');
                        }

                        const response = await fetch('/api/process-voice', {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${session.access_token}`,
                            },
                            body: formData,
                        });

                        if (!response.ok) throw new Error('Failed to process voice');

                        const result = await response.json();
                        const data = result.data;

                        console.log("Full AI Result:", result);
                        console.log("Extracted Data:", data);
                        console.log("AI Products:", data.products);

                        // Populate Forms
                        setSiteDetails(prev => ({
                            ...prev,
                            name: data.name || '',
                            owner_name: data.owner_name || '',
                            contact_number: data.contact_number || '',
                            timing: data.timing || '',
                            established_year: data.established_year || '',
                            location: data.location || '',
                            state: data.state || '',
                            pincode: data.pincode || '',
                            address: data.address || '',
                            description: data.description || '', // AI Generated Description
                            email: '',
                            whatsapp_number: data.contact_number || '',
                            tagline: ''
                        }));

                        const aiProducts = data.products || data.items;
                        if (aiProducts && Array.isArray(aiProducts)) {
                            setProducts(prev => [...prev, ...aiProducts.map((p: any) => ({
                                name: p.name,
                                price: p.price,
                                desc: p.desc || p.description, // Handle mismatch if any
                                image_url: '' // API doesn't return image
                            }))]);
                        }

                        setStep(3); // Move to review
                    } catch (error) {
                        console.error('Error processing voice:', error);
                        toast.error('Failed to process voice. Please try again or fill manually.');
                        setStep(3); // Let them fill manually on error
                    } finally {
                        setIsProcessing(false);
                    }
                };

                mediaRecorder.start();
                setIsRecording(true);
            } catch (err) {
                console.error("Error accessing microphone:", err);
                toast.error('Could not access microphone. Please check permissions.');
            }
        } else {
            mediaRecorderRef.current?.stop();
            setIsRecording(false);
            // Stop all audio tracks to release the microphone
            streamRef.current?.getTracks().forEach(track => track.stop());
            streamRef.current = null;
            // Processing happens in onstop event
        }
    };

    /* 
       Wait, replacing the above with a more robust Ref-based implementation for chunks 
       to guarantee we have the data when stop is clicked.
    */



    const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];

        try {
            // Compress image before upload
            const compressed = await compressImage(file, { maxWidth: 1600, quality: 0.85 });
            const fileExt = compressed.name.split('.').pop() || 'jpg';
            const fileName = `banner-${Math.random()}.${fileExt}`;
            const filePath = `${generatedSlug || 'temp'}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('product-images')
                .upload(filePath, compressed);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('product-images')
                .getPublicUrl(filePath);

            setSiteDetails({ ...siteDetails, image_url: publicUrl });
        } catch (error) {
            console.error('Error uploading banner:', error);
            toast.error('Failed to upload banner');
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];

        try {
            // Compress image before upload
            const compressed = await compressImage(file, { maxWidth: 800, quality: 0.8 });
            const fileExt = compressed.name.split('.').pop() || 'jpg';
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${generatedSlug || 'temp'}/products/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('product-images')
                .upload(filePath, compressed);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('product-images')
                .getPublicUrl(filePath);

            setCurrentProduct({ ...currentProduct, image_url: publicUrl });
        } catch (error) {
            console.error('Error uploading image:', error);
            toast.error('Failed to upload image');
        }
    };

    const handleAddProduct = () => {
        if (currentProduct.name && currentProduct.price) {
            setProducts([...products, currentProduct]);
            setCurrentProduct({ name: '', price: '', desc: '', image_url: '' });
        }
    };

    const handleSaveAndPublish = async () => {
        setIsSaving(true);
        try {
            // Get Session for Token
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                toast.error('Please sign in to publish your site.');
                return;
            }

            const payload = {
                type: siteType,
                ...siteDetails,
                products: products.map(p => ({
                    name: p.name,
                    price: parseFloat(p.price),
                    desc: p.desc,
                    image_url: p.image_url
                }))
            };

            const response = await fetch('/api/site/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to create site');
            }

            setGeneratedSlug(result.slug);
            setStep(5);
        } catch (error: any) {
            console.error('Error saving site:', error);
            alert(error.message || 'Failed to save website. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white md:bg-black/50 md:backdrop-blur-sm transition-all duration-300">
            <div className="flex h-full w-full items-center justify-center p-0 md:p-4">
                <div className="relative w-full h-full md:h-auto md:max-w-4xl md:max-h-[90vh] overflow-hidden bg-white md:rounded-2xl md:shadow-2xl flex flex-col">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 z-10 p-2 rounded-full hover:bg-gray-100 transition-colors"
                    >
                        <span className="material-symbols-outlined text-gray-500">close</span>
                    </button>

                    <div ref={scrollContainerRef} className="flex-1 overflow-y-auto no-scrollbar scroll-smooth">
                        <Stepper
                            currentStep={step}
                            onStepChange={setStep}
                            onFinalStepCompleted={() => { }}
                            backButtonText="Back"
                            nextButtonText={step === 4 ? (isSaving ? 'Publishing...' : 'Finish & Publish') : "Next"}
                            // Hide default buttons on specific steps where we have custom controls or logic
                            footerClassName={(step === 1 || step === 2 || step === 4 || step === 5) ? 'hidden' : ''}
                            // We can use nextButtonProps to handle "Next" click for Step 3 if we want to use the default button
                            nextButtonProps={{
                                onClick: () => {
                                    if (step === 3) setStep(4);
                                }
                            }}
                            stepContainerClassName="px-4 py-6 md:px-8 md:pt-8 md:pb-4"
                            contentClassName="px-4 pb-8 md:px-8"
                            stepCircleContainerClassName="shadow-none border-none max-w-none w-full"
                        >
                            {/* Step 1: Selection */}
                            <Step>
                                <TypeSelector handleSelectType={handleSelectType} />
                            </Step>

                            {/* Step 2: Voice Input */}
                            <Step>
                                <VoiceRecorder
                                    siteType={siteType}
                                    isRecording={isRecording}
                                    isProcessing={isProcessing}
                                    toggleRecording={toggleRecording}
                                    onSkip={() => setStep(3)}
                                    onBack={() => setStep(1)}
                                />
                            </Step>

                            {/* Step 3: Review Form */}
                            <Step>
                                <DataReview
                                    siteDetails={siteDetails}
                                    setSiteDetails={setSiteDetails}
                                    labels={labels}
                                    bannerInputRef={bannerInputRef}
                                    bannerCameraInputRef={bannerCameraInputRef}
                                    handleBannerUpload={handleBannerUpload}
                                />
                            </Step>

                            {/* Step 4: Add Products */}
                            <Step>
                                <ProductEditor
                                    labels={labels}
                                    products={products}
                                    setProducts={setProducts}
                                    currentProduct={currentProduct}
                                    setCurrentProduct={setCurrentProduct}
                                    fileInputRef={fileInputRef}
                                    productCameraInputRef={productCameraInputRef}
                                    handleImageUpload={handleImageUpload}
                                    handleAddProduct={handleAddProduct}
                                    handleSaveAndPublish={handleSaveAndPublish}
                                    isSaving={isSaving}
                                    onBack={() => setStep(3)}
                                />
                            </Step>

                            {/* Step 5: Success */}
                            <Step>
                                <SuccessScreen
                                    siteDetails={siteDetails}
                                    generatedSlug={generatedSlug}
                                    siteType={siteType}
                                    onClose={onClose}
                                />
                            </Step>
                        </Stepper>
                    </div>
                </div>
            </div>
        </div>
    );
}
