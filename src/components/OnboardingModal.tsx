'use client';

import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Stepper, { Step } from './Stepper';
import PosterGenerator from './PosterGenerator';

type SiteType = 'Shop' | 'Menu' | null;

export default function OnboardingModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
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
    const [isSaving, setIsSaving] = useState(false);
    const [generatedSlug, setGeneratedSlug] = useState('');

    const [isProcessing, setIsProcessing] = useState(false);
    const audioChunksRef = useRef<Blob[]>([]);

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

        // Cleanup function to ensure scroll is unlocked if component unmounts while open
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

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
                alert('Your Store plan has expired. Please recharge to create a shop.');
                return;
            }
            if (limits.shopUsed >= limits.shopLimit) {
                alert(`You have reached your Shop limit (${limits.shopUsed}/${limits.shopLimit}). Please upgrade your plan.`);
                return;
            }
        } else {
            if (limits.menuExpired) {
                alert('Your Menu plan has expired. Please recharge to create a menu.');
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
                        const response = await fetch('/api/process-voice', {
                            method: 'POST',
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
                        alert('Failed to process voice. Please try again or fill manually.');
                        setStep(3); // Let them fill manually on error
                    } finally {
                        setIsProcessing(false);
                    }
                };

                mediaRecorder.start();
                setIsRecording(true);
            } catch (err) {
                console.error("Error accessing microphone:", err);
                alert("Could not access microphone.");
            }
        } else {
            mediaRecorderRef.current?.stop();
            setIsRecording(false);
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
        const fileExt = file.name.split('.').pop();
        const fileName = `banner-${Math.random()}.${fileExt}`;
        const filePath = `${generatedSlug || 'temp'}/${fileName}`;

        try {
            const { error: uploadError } = await supabase.storage
                .from('product-images')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('product-images')
                .getPublicUrl(filePath);

            setSiteDetails({ ...siteDetails, image_url: publicUrl });
        } catch (error) {
            console.error('Error uploading banner:', error);
            alert('Failed to upload banner');
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${generatedSlug || 'temp'}/${fileName}`;

        try {
            const { error: uploadError } = await supabase.storage
                .from('product-images')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('product-images')
                .getPublicUrl(filePath);

            setCurrentProduct({ ...currentProduct, image_url: publicUrl });
        } catch (error) {
            console.error('Error uploading image:', error);
            alert('Failed to upload image');
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
                alert('Please sign in to publish your site.');
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

                    <div className="flex-1 overflow-y-auto no-scrollbar">
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
                                <div className="flex flex-col items-center text-center pt-8 md:pt-0">
                                    <h2 className="text-xl md:text-3xl font-bold text-[#111418] mb-2">What would you like to build?</h2>
                                    <p className="text-gray-500 mb-8 text-sm md:text-base">Choose the type of website you want to create.</p>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 w-full max-w-2xl mx-auto">
                                        <button onClick={() => handleSelectType('Shop')} className="group flex flex-col items-center p-6 border-2 border-transparent hover:border-primary/50 bg-gray-50 rounded-xl transition-all duration-300 hover:shadow-lg hover:-translate-y-1 text-left w-full">
                                            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                                <span className="material-symbols-outlined text-primary text-3xl">storefront</span>
                                            </div>
                                            <h3 className="text-lg font-bold text-[#111418] mb-1">Shop Website</h3>
                                            <p className="text-sm text-gray-500 text-center">Perfect for selling products, managing inventory, and growing your store.</p>
                                        </button>

                                        <button onClick={() => handleSelectType('Menu')} className="group flex flex-col items-center p-6 border-2 border-transparent hover:border-primary/50 bg-gray-50 rounded-xl transition-all duration-300 hover:shadow-lg hover:-translate-y-1 text-left w-full">
                                            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                                <span className="material-symbols-outlined text-primary text-3xl">restaurant_menu</span>
                                            </div>
                                            <h3 className="text-lg font-bold text-[#111418] mb-1">Menu Website</h3>
                                            <p className="text-sm text-gray-500 text-center">Ideal for restaurants, cafes, and creating digital QR menus.</p>
                                        </button>
                                    </div>
                                </div>
                            </Step>

                            {/* Step 2: Voice Input */}
                            <Step>
                                <div className="flex flex-col items-center text-center">
                                    <div className="w-full flex justify-start mb-4">
                                        <button onClick={() => setStep(1)} className="text-gray-500 hover:text-primary transition-colors flex items-center gap-1 text-sm font-medium">
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
                                    <button onClick={() => setStep(3)} className="mt-4 text-sm text-gray-400 hover:text-primary underline">
                                        Skip and fill manually
                                    </button>
                                </div>
                            </Step>

                            {/* Step 3: Review Form */}
                            <Step>
                                <div className="flex flex-col items-center w-full">
                                    <div className="w-full flex items-center justify-between mb-6">
                                        {/* Back button handled by Stepper footer if enabled, or customized here if needed */}
                                        <h2 className="text-xl md:text-2xl font-bold text-[#111418]">Review Details</h2>
                                    </div>

                                    <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">{labels.name}</label>
                                            <input type="text" value={siteDetails.name} onChange={(e) => setSiteDetails({ ...siteDetails, name: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-gray-50 text-[#111418] outline-none focus:ring-2 focus:ring-primary" placeholder={labels.name} />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Owner Name</label>
                                            <input type="text" value={siteDetails.owner_name} onChange={(e) => setSiteDetails({ ...siteDetails, owner_name: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-gray-50 text-[#111418] outline-none focus:ring-2 focus:ring-primary" placeholder="John Doe" />
                                        </div>

                                        <div className="flex flex-col gap-1 md:col-span-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Tagline</label>
                                            <input type="text" value={siteDetails.tagline} onChange={(e) => setSiteDetails({ ...siteDetails, tagline: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-gray-50 text-[#111418] outline-none focus:ring-2 focus:ring-primary" placeholder="e.g. Curated essentials for everyday living" />
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Contact Number</label>
                                            <input type="text" value={siteDetails.contact_number} onChange={(e) => setSiteDetails({ ...siteDetails, contact_number: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-gray-50 text-[#111418] outline-none focus:ring-2 focus:ring-primary" placeholder="+91 9876543210" />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">WhatsApp Number</label>
                                            <input type="text" value={siteDetails.whatsapp_number} onChange={(e) => setSiteDetails({ ...siteDetails, whatsapp_number: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-gray-50 text-[#111418] outline-none focus:ring-2 focus:ring-primary" placeholder="+91 9876543210" />
                                        </div>
                                        <div className="flex flex-col gap-1 md:col-span-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Email Address</label>
                                            <input type="email" value={siteDetails.email} onChange={(e) => setSiteDetails({ ...siteDetails, email: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-gray-50 text-[#111418] outline-none focus:ring-2 focus:ring-primary" placeholder="hello@example.com" />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">{labels.timing}</label>
                                            <input type="text" value={siteDetails.timing} onChange={(e) => setSiteDetails({ ...siteDetails, timing: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-gray-50 text-[#111418] outline-none focus:ring-2 focus:ring-primary" placeholder="9 AM - 9 PM" />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Established Year</label>
                                            <input type="text" value={siteDetails.established_year} onChange={(e) => setSiteDetails({ ...siteDetails, established_year: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-gray-50 text-[#111418] outline-none focus:ring-2 focus:ring-primary" placeholder="2024" />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Location</label>
                                            <input type="text" value={siteDetails.location} onChange={(e) => setSiteDetails({ ...siteDetails, location: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-gray-50 text-[#111418] outline-none focus:ring-2 focus:ring-primary" placeholder="City" />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">State</label>
                                            <input type="text" value={siteDetails.state} onChange={(e) => setSiteDetails({ ...siteDetails, state: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-gray-50 text-[#111418] outline-none focus:ring-2 focus:ring-primary" placeholder="State" />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Pin Code</label>
                                            <input type="text" value={siteDetails.pincode} onChange={(e) => setSiteDetails({ ...siteDetails, pincode: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-gray-50 text-[#111418] outline-none focus:ring-2 focus:ring-primary" placeholder="123456" />
                                        </div>

                                        <div className="flex flex-col gap-1 md:col-span-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Detailed Address</label>
                                            <textarea rows={2} value={siteDetails.address} onChange={(e) => setSiteDetails({ ...siteDetails, address: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-gray-50 text-[#111418] outline-none focus:ring-2 focus:ring-primary resize-none" placeholder="Full Address"></textarea>
                                        </div>

                                        <div className="flex flex-col gap-1 md:col-span-2 mt-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Social Media (Optional)</label>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                                <input type="text" value={siteDetails.social_links.instagram} onChange={(e) => setSiteDetails({ ...siteDetails, social_links: { ...siteDetails.social_links, instagram: e.target.value } })} className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-gray-50 text-[#111418] outline-none focus:ring-2 focus:ring-primary text-sm" placeholder="Instagram Username" />
                                                <input type="text" value={siteDetails.social_links.facebook} onChange={(e) => setSiteDetails({ ...siteDetails, social_links: { ...siteDetails.social_links, facebook: e.target.value } })} className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-gray-50 text-[#111418] outline-none focus:ring-2 focus:ring-primary text-sm" placeholder="Facebook URL" />
                                                <input type="text" value={siteDetails.social_links.twitter} onChange={(e) => setSiteDetails({ ...siteDetails, social_links: { ...siteDetails.social_links, twitter: e.target.value } })} className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-gray-50 text-[#111418] outline-none focus:ring-2 focus:ring-primary text-sm" placeholder="Twitter Handle" />
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-1 md:col-span-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">About Shop (AI Generated)</label>
                                            <textarea rows={2} value={siteDetails.description} onChange={(e) => setSiteDetails({ ...siteDetails, description: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-gray-50 text-[#111418] outline-none focus:ring-2 focus:ring-primary resize-none" placeholder="Shop Description"></textarea>
                                        </div>

                                        <div className="flex flex-col gap-1 md:col-span-2 mt-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Shop/Restaurant Banner</label>
                                            <div className="flex items-center gap-4">
                                                {siteDetails.image_url && (
                                                    <div className="w-20 h-10 rounded-lg overflow-hidden border border-gray-200">
                                                        <img src={siteDetails.image_url} alt="Banner" className="w-full h-full object-cover" />
                                                    </div>
                                                )}
                                                <label className="cursor-pointer px-4 py-2 bg-blue-50 text-primary font-bold rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2 text-sm">
                                                    <span className="material-symbols-outlined text-lg">add_photo_alternate</span>
                                                    {siteDetails.image_url ? 'Change Banner' : 'Upload Banner'}
                                                    <input type="file" className="hidden" accept="image/*" onChange={handleBannerUpload} />
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                    {/* No footer here, using Stepper footer */}
                                </div>
                            </Step>

                            {/* Step 4: Add Products */}
                            <Step>
                                <div className="flex flex-col items-center w-full">
                                    <div className="w-full flex items-center justify-between mb-6">
                                        <button onClick={() => setStep(3)} className="text-gray-500 hover:text-primary transition-colors flex items-center gap-1 text-sm font-medium">
                                            <span className="material-symbols-outlined text-lg">arrow_back</span> Back
                                        </button>
                                        <div className="flex flex-col items-center">
                                            <h2 className="text-xl md:text-2xl font-bold text-[#111418]">{labels.productsTitle}</h2>
                                            <span className="text-xs font-bold text-primary bg-blue-50 px-2 py-1 rounded-full mt-1">Items Added: {products.length}</span>
                                        </div>
                                        <div className="w-16"></div>
                                    </div>

                                    <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6">

                                        {/* Render Added Products List */}
                                        {products.length > 0 && (
                                            <div className="md:col-span-2 flex flex-col gap-3 mb-4">
                                                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide">{labels.yourItems}</h3>
                                                <div className="grid grid-cols-1 gap-3">
                                                    {products.map((p, idx) => (
                                                        <div key={idx} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-lg">
                                                            <div>
                                                                <p className="font-bold text-[#111418]">{p.name}</p>
                                                                <div className="text-xs text-gray-500 flex gap-2">
                                                                    <span>₹{p.price}</span>
                                                                    {p.desc && <span className="truncate max-w-[150px]">- {p.desc}</span>}
                                                                </div>
                                                            </div>
                                                            <button onClick={() => setProducts(products.filter((_, i) => i !== idx))} className="text-red-500 hover:bg-red-50 p-1 rounded-full text-xs">
                                                                <span className="material-symbols-outlined text-lg">delete</span>
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="md:col-span-2 flex justify-center">
                                            <div
                                                onClick={() => fileInputRef.current?.click()}
                                                className="relative w-40 h-40 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-blue-50 transition-all group overflow-hidden"
                                            >
                                                {currentProduct.image_url ? (
                                                    <img src={currentProduct.image_url} alt="Preview" className="w-full h-full object-cover" />
                                                ) : (
                                                    <>
                                                        <span className="material-symbols-outlined text-4xl text-gray-400 group-hover:text-primary transition-colors">add_a_photo</span>
                                                        <span className="text-xs text-gray-500 mt-2 font-medium">Add Photo</span>
                                                    </>
                                                )}
                                                <input
                                                    type="file"
                                                    ref={fileInputRef}
                                                    onChange={handleImageUpload}
                                                    className="hidden"
                                                    accept="image/*"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-1 md:col-span-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">{labels.productName}</label>
                                            <input type="text" value={currentProduct.name} onChange={(e) => setCurrentProduct({ ...currentProduct, name: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-gray-50 text-[#111418] focus:ring-2 focus:ring-primary outline-none" placeholder={labels.productPlaceholder} />
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            <input type="number" value={currentProduct.price} onChange={(e) => setCurrentProduct({ ...currentProduct, price: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-gray-50 text-[#111418] focus:ring-2 focus:ring-primary outline-none" placeholder="299" />
                                        </div>

                                        <div className="flex flex-col gap-1 md:col-span-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Description</label>
                                            <textarea rows={2} value={currentProduct.desc} onChange={(e) => setCurrentProduct({ ...currentProduct, desc: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-gray-50 text-[#111418] focus:ring-2 focus:ring-primary outline-none resize-none" placeholder="Delicious chicken biryani with spices..." />
                                        </div>


                                    </div>

                                    <div className="w-full mt-6 pt-6 border-t border-gray-100 flex flex-col md:flex-row gap-4 justify-end">
                                        <button disabled={!currentProduct.name || !currentProduct.price} onClick={handleAddProduct} className={`px-6 py-3 border border-primary text-primary hover:bg-blue-50 font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${(!currentProduct.name || !currentProduct.price) ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                            <span className="material-symbols-outlined">add</span> {labels.addBtn}
                                        </button>
                                        <button onClick={handleSaveAndPublish} disabled={isSaving} className="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold rounded-lg shadow-md transition-all hover:scale-105 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
                                            {isSaving ? 'Publishing...' : 'Finish & Publish'} <span className="material-symbols-outlined">rocket_launch</span>
                                        </button>
                                    </div>
                                </div>
                            </Step>

                            {/* Step 5: Success */}
                            <Step>
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
                                            <input type="text" readOnly className="w-full bg-transparent outline-none text-[#111418] font-medium text-sm" value={`${typeof window !== 'undefined' ? window.location.origin : ''}/shop/${generatedSlug}`} />
                                        </div>
                                    </div>

                                    {/* Poster Download Section */}
                                    <div className="w-full flex justify-center mb-6">
                                        <PosterGenerator
                                            siteName={siteDetails.name}
                                            siteUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/shop/${generatedSlug}`}
                                            siteType={siteType || 'Shop'}
                                        />
                                    </div>

                                    <div className="w-full pt-6 border-t border-gray-100 flex flex-col md:flex-row justify-center gap-4">
                                        <a href={`/shop/${generatedSlug}`} target="_blank" className="px-6 py-3 border border-primary text-primary font-bold rounded-full hover:bg-blue-50 transition-colors flex items-center justify-center gap-2">
                                            Visit Website <span className="material-symbols-outlined">open_in_new</span>
                                        </a>
                                        <button onClick={onClose} className="px-8 py-3 bg-primary hover:bg-blue-600 text-white font-bold rounded-full shadow-lg transition-all hover:scale-105 flex items-center gap-2">
                                            Go to Dashboard <span className="material-symbols-outlined">arrow_forward</span>
                                        </button>
                                    </div>
                                </div>
                            </Step>
                        </Stepper>
                    </div>
                </div>
            </div>
        </div>
    );
}
