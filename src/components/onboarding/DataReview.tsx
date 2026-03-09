import React from 'react';

interface SiteDetails {
    name: string;
    owner_name: string;
    contact_number: string;
    email: string;
    whatsapp_number: string;
    tagline: string;
    timing: string;
    established_year: string;
    location: string;
    state: string;
    pincode: string;
    address: string;
    description: string;
    image_url: string;
    social_links: { instagram: string; facebook: string; twitter: string };
}

interface DataReviewProps {
    siteDetails: SiteDetails;
    setSiteDetails: React.Dispatch<React.SetStateAction<SiteDetails>>;
    labels: any;
    bannerInputRef: React.RefObject<HTMLInputElement>;
    bannerCameraInputRef: React.RefObject<HTMLInputElement>;
    handleBannerUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
}

export default function DataReview({
    siteDetails,
    setSiteDetails,
    labels,
    bannerInputRef,
    bannerCameraInputRef,
    handleBannerUpload
}: DataReviewProps) {
    return (
        <div className="flex flex-col items-center w-full">
            <div className="w-full flex items-center justify-between mb-6">
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
                        <div className="flex gap-2">
                            <button
                                onClick={() => bannerInputRef.current?.click()}
                                className="px-4 py-2 bg-blue-50 text-primary font-bold rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2 text-sm"
                            >
                                <span className="material-symbols-outlined text-lg">add_photo_alternate</span>
                                {siteDetails.image_url ? 'Change' : 'Gallery'}
                            </button>
                            <button
                                onClick={() => bannerCameraInputRef.current?.click()}
                                className="px-4 py-2 bg-blue-50 text-primary font-bold rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2 text-sm"
                            >
                                <span className="material-symbols-outlined text-lg">photo_camera</span>
                                Camera
                            </button>
                            <input
                                ref={bannerInputRef}
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={handleBannerUpload}
                            />
                            <input
                                ref={bannerCameraInputRef}
                                type="file"
                                className="hidden"
                                accept="image/*"
                                capture="environment"
                                onChange={handleBannerUpload}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
