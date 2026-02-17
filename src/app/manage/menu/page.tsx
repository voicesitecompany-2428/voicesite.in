'use client';

import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Shop, Product } from '@/lib/supabase';
import Image from 'next/image';
import EditModal from '@/components/EditModal';
import PosterGenerator from '@/components/PosterGenerator';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/components/AuthContext';

export default function MyMenuPage() {
    const { user } = useAuth();
    const [shops, setShops] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedShopId, setExpandedShopId] = useState<string | null>(null);
    const router = useRouter();

    const [subscription, setSubscription] = useState<any>(null);

    useEffect(() => {
        if (user) {
            fetchShops();
            fetchSubscription();
        }
    }, [user]);

    const fetchSubscription = async () => {
        if (!user) return;
        const { data } = await supabase
            .from('user_subscriptions')
            .select('menu_plan, menu_limit')
            .eq('user_id', user.id)
            .single();
        if (data) setSubscription(data);
    };

    const fetchShops = async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('sites')
                .select('*, products(*)')
                .eq('type', 'Menu')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setShops(data || []);
            if (data && data.length > 0 && !expandedShopId) {
                setExpandedShopId(data[0].id);
            }
        } catch (error) {
            console.error('Error fetching menus:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleShopLive = async (id: string, currentStatus: boolean | undefined) => {
        const newStatus = !currentStatus;
        try {
            const { error } = await supabase
                .from('sites')
                .update({ is_live: newStatus })
                .eq('id', id);

            if (error) throw error;
            setShops(shops.map(s => s.id === id ? { ...s, is_live: newStatus } : s));
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Failed to update status');
        }
    };

    const handleDeleteShop = async (shopId: string) => {
        try {
            const { error } = await supabase.rpc('delete_site', { site_id: shopId });
            if (error) throw error;

            // Remove from local state
            setShops(shops.filter(s => s.id !== shopId));
            setExpandedShopId(null);
        } catch (error) {
            console.error('Error deleting menu:', error);
            alert('Failed to delete menu');
        }
    };

    return (
        <div className="p-8 max-w-5xl mx-auto pb-32 md:pb-8">
            <h1 className="text-3xl font-bold mb-8">Menu Management</h1>

            <div className="space-y-6">
                {loading ? (
                    <div className="flex flex-col gap-4">
                        {[1, 2].map(i => (
                            <div key={i} className="h-48 bg-gray-100 rounded-xl animate-pulse"></div>
                        ))}
                    </div>
                ) : shops.length === 0 ? (
                    <div className="text-center p-12 bg-gray-50 rounded-xl border-dashed border-2 border-gray-200">
                        <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">restaurant_menu</span>
                        <p className="text-gray-500 text-lg font-medium">No menus found.</p>
                        <p className="text-gray-400 text-sm mt-2">Create one to get started!</p>
                    </div>
                ) : (
                    shops.map(shop => (
                        <ShopCard
                            key={shop.id}
                            shop={shop}
                            subscription={subscription}
                            isExpanded={expandedShopId === shop.id}
                            onToggleExpand={() => setExpandedShopId(expandedShopId === shop.id ? null : shop.id)}
                            onToggleLive={() => toggleShopLive(shop.id, shop.is_live)}
                            onUpdate={fetchShops}
                            onDelete={() => handleDeleteShop(shop.id)}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

function ShopCard({ shop, subscription, isExpanded, onToggleExpand, onToggleLive, onUpdate, onDelete }: {
    shop: any;
    subscription: any;
    isExpanded: boolean;
    onToggleExpand: () => void;
    onToggleLive: () => void;
    onUpdate: () => void;
    onDelete: () => void;
}) {
    const [activeTab, setActiveTab] = useState<'products' | 'info'>('products');

    // Editing State
    const [editingSection, setEditingSection] = useState<'basic' | 'contact' | 'location' | 'product' | 'timings' | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Deletion State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteConfirmationName, setDeleteConfirmationName] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    // Form Data
    const [formData, setFormData] = useState<any>({});
    const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
    const bannerInputRef = useRef<HTMLInputElement>(null);
    const bannerCameraInputRef = useRef<HTMLInputElement>(null);
    const productInputRef = useRef<HTMLInputElement>(null);
    const productCameraInputRef = useRef<HTMLInputElement>(null);

    // Initialize edit handlers
    const handleEditBasic = () => {
        setFormData({
            name: shop.name,
            tagline: shop.tagline || '',
            description: shop.description || ''
        });
        setEditingSection('basic');
    };

    const handleEditContact = () => {
        setFormData({
            phone: shop.contact_number || '',
            email: shop.email || '',
            whatsapp: shop.whatsapp_number || ''
        });
        setEditingSection('contact');
    };

    const handleEditLocation = () => {
        setFormData({
            location: shop.location || ''
        });
        setEditingSection('location');
    };

    const handleEditTimings = () => {
        setFormData({
            timings: shop.timing || ''
        });
        setEditingSection('timings');
    };

    const handleAddProduct = () => {
        const currentCount = shop.products?.length || 0;
        const plan = subscription?.menu_plan || 'menu_base';
        const limit = plan === 'menu_pro' ? 20 : 15;

        if (currentCount >= limit) {
            alert(`Menu item limit reached for ${plan === 'menu_pro' ? 'Pro' : 'Starter'} plan (${limit} max). Upgrade to add more.`);
            return;
        }

        setEditingProduct({ name: '', price: 0, description: '', image_url: '' });
        setEditingSection('product');
    };

    const handleEditProduct = (product: Product) => {
        setEditingProduct({ ...product });
        setEditingSection('product');
    };

    const handleBannerClick = () => {
        bannerInputRef.current?.click();
    };

    const handleBannerCameraClick = () => {
        bannerCameraInputRef.current?.click();
    };

    const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `banner-${shop.id}-${Date.now()}.${fileExt}`;
            const filePath = `${shop.slug}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('product-images')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('product-images')
                .getPublicUrl(filePath);

            const { error: dbError } = await supabase
                .from('sites')
                .update({ image_url: publicUrl })
                .eq('id', shop.id);

            if (dbError) throw dbError;

            onUpdate();
        } catch (error) {
            console.error('Error uploading banner:', error);
            alert('Failed to upload banner');
        }
    };

    // Save Handlers
    const handleSaveBasic = async () => {
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('sites')
                .update({
                    name: formData.name,
                    tagline: formData.tagline,
                    description: formData.description
                })
                .eq('id', shop.id);

            if (error) throw error;
            onUpdate();
            setEditingSection(null);
        } catch (error) {
            console.error('Error saving basic info:', error);
            alert('Failed to save changes');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveContact = async () => {
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('sites')
                .update({
                    contact_number: formData.phone,
                    email: formData.email,
                    whatsapp_number: formData.whatsapp || formData.phone
                })
                .eq('id', shop.id);

            if (error) throw error;
            onUpdate();
            setEditingSection(null);
        } catch (error) {
            console.error('Error saving contact:', error);
            alert('Failed to save changes');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveLocation = async () => {
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('sites')
                .update({
                    location: formData.location
                })
                .eq('id', shop.id);

            if (error) throw error;
            onUpdate();
            setEditingSection(null);
        } catch (error) {
            console.error('Error saving location:', error);
            alert('Failed to save changes');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveTimings = async () => {
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('sites')
                .update({
                    timing: formData.timings
                })
                .eq('id', shop.id);

            if (error) throw error;
            onUpdate();
            setEditingSection(null);
        } catch (error) {
            console.error('Error saving timings:', error);
            alert('Failed to save changes');
        } finally {
            setIsSaving(false);
        }
    };

    const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !editingProduct) return;

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `prod-${Math.random()}.${fileExt}`;
            const filePath = `${shop.slug}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('product-images')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('product-images')
                .getPublicUrl(filePath);

            setEditingProduct({ ...editingProduct, image_url: publicUrl });
        } catch (error) {
            console.error('Error uploading product image:', error);
            alert('Failed to upload image');
        }
    };

    const handleSaveProduct = async () => {
        if (!editingProduct?.name || !editingProduct?.price) return;
        setIsSaving(true);
        try {
            const productData = {
                name: editingProduct.name,
                price: parseFloat(editingProduct.price.toString()),
                description: editingProduct.description,
                image_url: editingProduct.image_url,
                site_id: shop.id
            };

            if (editingProduct.id) {
                const { error } = await supabase
                    .from('products')
                    .update(productData)
                    .eq('id', editingProduct.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('products')
                    .insert([productData]);
                if (error) throw error;
            }

            onUpdate();
            setEditingSection(null);
            setEditingProduct(null);
        } catch (error) {
            console.error('Error saving item:', error);
            alert('Failed to save item');
        } finally {
            setIsSaving(false);
        }
    };

    // Delete Confirmation Logic
    const handleConfirmDelete = async () => {
        if (deleteConfirmationName !== shop.name) return;

        setIsDeleting(true);
        try {
            await onDelete();
            // Modal closes as component unmounts
        } catch (error) {
            console.error('Error deleting:', error);
            setIsDeleting(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-300">
            {/* Header */}
            <div className="p-4 md:p-6 flex items-center justify-between bg-white cursor-pointer group" onClick={onToggleExpand}>
                <div className="flex items-center gap-3 md:gap-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200 flex-shrink-0">
                        {shop.image_url ? (
                            <Image src={shop.image_url} alt={shop.name} width={48} height={48} className="object-cover w-full h-full" />
                        ) : (
                            <span className="material-symbols-outlined text-gray-400">restaurant</span>
                        )}
                    </div>
                    <div>
                        <h2 className="text-lg md:text-xl font-bold text-gray-900 leading-tight">{shop.name}</h2>
                        <a href={`/shop/${shop.slug}`} target="_blank" onClick={(e) => e.stopPropagation()} className="text-xs md:text-sm text-blue-600 hover:underline flex items-center gap-1 py-1">
                            Visit Menu <span className="material-symbols-outlined text-[14px] md:text-[16px]">open_in_new</span>
                        </a>
                    </div>
                </div>

                <div className="flex items-center gap-2 md:gap-4">
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <span className="text-xs font-medium text-gray-500 hidden md:inline">Live Status</span>
                        <button
                            onClick={onToggleLive}
                            className={`w-12 h-7 rounded-full p-1 transition-colors duration-200 ease-in-out ${shop.is_live ? 'bg-green-500' : 'bg-gray-300'} flex items-center`}
                            title={shop.is_live ? "Live" : "Draft"}
                        >
                            <div className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${shop.is_live ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                    </div>
                    <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
                        <span className={`material-symbols-outlined transform transition-transform duration-300 text-gray-500 ${isExpanded ? 'rotate-180' : ''}`}>
                            expand_more
                        </span>
                    </button>
                </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="border-t border-gray-100">
                    <div className="border-b border-gray-100 px-4 md:px-6 flex">
                        <button
                            onClick={() => setActiveTab('products')}
                            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'products' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            Menu Items
                        </button>
                        <button
                            onClick={() => setActiveTab('info')}
                            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'info' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            Site Info
                        </button>
                    </div>

                    <div className="p-6 bg-gray-50/50">
                        {activeTab === 'products' ? (
                            <ProductsList
                                shop={shop}
                                onAdd={handleAddProduct}
                                onEdit={handleEditProduct}
                            />
                        ) : (
                            <SiteInfo
                                shop={shop}
                                onEditBasic={handleEditBasic}
                                onEditContact={handleEditContact}
                                onEditLocation={handleEditLocation}
                                onEditBanner={handleBannerClick}
                                onEditBannerCamera={handleBannerCameraClick}
                                onEditTimings={handleEditTimings}
                                onDeleteClick={() => setIsDeleteModalOpen(true)}
                            />
                        )}
                        <input type="file" ref={bannerInputRef} onChange={handleBannerUpload} className="hidden" accept="image/*" />
                        <input type="file" ref={bannerCameraInputRef} onChange={handleBannerUpload} className="hidden" accept="image/*" capture="environment" />
                    </div>
                </div>
            )}

            {/* Edit Basic Info Modal */}
            <EditModal
                isOpen={editingSection === 'basic'}
                onClose={() => setEditingSection(null)}
                title="Edit Basic Information"
                onSave={handleSaveBasic}
                isSaving={isSaving}
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Restaurant Name</label>
                        <input
                            type="text"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                            value={formData.name || ''}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tagline</label>
                        <input
                            type="text"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                            value={formData.tagline || ''}
                            onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                            rows={3}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
                            value={formData.description || ''}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>
                </div>
            </EditModal>

            {/* Edit Contact Modal */}
            <EditModal
                isOpen={editingSection === 'contact'}
                onClose={() => setEditingSection(null)}
                title="Edit Contact Details"
                onSave={handleSaveContact}
                isSaving={isSaving}
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                        <input
                            type="text"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                            value={formData.phone || ''}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Number</label>
                        <input
                            type="text"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                            value={formData.whatsapp || ''}
                            onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                            placeholder="Same as phone if empty"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                        <input
                            type="email"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                            value={formData.email || ''}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>
                </div>
            </EditModal>

            {/* Edit Location Modal */}
            <EditModal
                isOpen={editingSection === 'location'}
                onClose={() => setEditingSection(null)}
                title="Edit Location"
                onSave={handleSaveLocation}
                isSaving={isSaving}
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                        <input
                            type="text"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                            value={formData.location || ''}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            placeholder="City, Area, or Full Address"
                        />
                    </div>
                </div>
            </EditModal>

            {/* Edit Timings Modal */}
            <EditModal
                isOpen={editingSection === 'timings'}
                onClose={() => setEditingSection(null)}
                title="Edit Operating Hours"
                onSave={handleSaveTimings}
                isSaving={isSaving}
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Operating Hours</label>
                        <input
                            type="text"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                            value={formData.timings || ''}
                            onChange={(e) => setFormData({ ...formData, timings: e.target.value })}
                            placeholder="e.g. Mon-Sun: 11AM - 11PM"
                        />
                    </div>
                </div>
            </EditModal>

            {/* Edit Product Modal */}
            <EditModal
                isOpen={editingSection === 'product'}
                onClose={() => { setEditingSection(null); setEditingProduct(null); }}
                title={editingProduct?.id ? 'Edit Menu Item' : 'Add New Item'}
                onSave={handleSaveProduct}
                isSaving={isSaving}
                saveLabel={editingProduct?.id ? 'Save Changes' : 'Add Item'}
            >
                <div className="space-y-6">
                    <div className="flex justify-center gap-4">
                        <div
                            onClick={() => productInputRef.current?.click()}
                            className="relative w-32 h-32 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-blue-50 transition-all group overflow-hidden bg-gray-50"
                        >
                            {editingProduct?.image_url ? (
                                <Image src={editingProduct.image_url} alt="Preview" fill className="object-cover" />
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-3xl text-gray-400 group-hover:text-primary transition-colors">add_photo_alternate</span>
                                    <span className="text-xs text-gray-500 mt-1 font-medium">Gallery</span>
                                </>
                            )}
                            <input
                                type="file"
                                ref={productInputRef}
                                onChange={handleProductImageUpload}
                                className="hidden"
                                accept="image/*"
                            />
                        </div>

                        <div
                            onClick={() => productCameraInputRef.current?.click()}
                            className="relative w-32 h-32 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-blue-50 transition-all group overflow-hidden bg-gray-50"
                        >
                            <>
                                <span className="material-symbols-outlined text-3xl text-gray-400 group-hover:text-primary transition-colors">photo_camera</span>
                                <span className="text-xs text-gray-500 mt-1 font-medium">Camera</span>
                            </>
                            <input
                                type="file"
                                ref={productCameraInputRef}
                                onChange={handleProductImageUpload}
                                className="hidden"
                                accept="image/*"
                                capture="environment"
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                value={editingProduct?.name || ''}
                                onChange={(e) => setEditingProduct(prev => prev ? { ...prev, name: e.target.value } : null)}
                                placeholder="e.g. Butter Chicken"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
                            <input
                                type="number"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                value={editingProduct?.price || ''}
                                onChange={(e) => setEditingProduct(prev => prev ? { ...prev, price: parseFloat(e.target.value) } : null)}
                                placeholder="0.00"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                            <textarea
                                rows={2}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
                                value={editingProduct?.description || ''}
                                onChange={(e) => setEditingProduct(prev => prev ? { ...prev, description: e.target.value } : null)}
                                placeholder="Brief description of the item..."
                            />
                        </div>
                    </div>
                </div>

            </EditModal >

            {/* Delete Confirmation Modal */}
            {
                isDeleteModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl transform transition-all animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex items-center gap-3 text-red-600 mb-4">
                                <span className="material-symbols-outlined text-3xl">warning</span>
                                <h3 className="text-xl font-bold">Delete Menu?</h3>
                            </div>

                            <p className="text-gray-600 mb-6 leading-relaxed">
                                This action cannot be undone. This will permanently delete
                                <span className="font-bold text-gray-900 mx-1">{shop.name}</span>
                                and all of its data.
                            </p>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Please type <span className="font-bold select-all">{shop.name}</span> to confirm.
                                </label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                                    value={deleteConfirmationName}
                                    onChange={(e) => setDeleteConfirmationName(e.target.value)}
                                    placeholder={shop.name}
                                    autoFocus
                                />
                            </div>

                            <div className="flex items-center gap-3 justify-end">
                                <button
                                    onClick={() => {
                                        setIsDeleteModalOpen(false);
                                        setDeleteConfirmationName('');
                                    }}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirmDelete}
                                    disabled={deleteConfirmationName !== shop.name || isDeleting}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {isDeleting ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Deleting...
                                        </>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined text-sm">delete</span>
                                            Delete
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

        </div >
    );
}

function ProductsList({ shop, onAdd, onEdit }: { shop: any; onAdd: () => void; onEdit: (p: Product) => void }) {
    const products = shop.products || [];
    const [localProducts, setLocalProducts] = useState(products);

    // Sync local products when shop changes
    useEffect(() => {
        setLocalProducts(shop.products || []);
    }, [shop.products]);

    // Optimistic toggle for product live status
    const toggleProductLive = async (productId: string | undefined, currentStatus: boolean | undefined, index: number) => {
        if (!productId) return;
        const newStatus = !currentStatus;

        // Optimistic update
        const newProducts = [...localProducts];
        newProducts[index] = { ...newProducts[index], is_live: newStatus };
        setLocalProducts(newProducts);

        try {
            const { error } = await supabase.from('products').update({ is_live: newStatus }).eq('id', productId);
            if (error) throw error;
        } catch (error) {
            console.error('Error updating product status:', error);
            // Revert on error
            const revertedProducts = [...localProducts];
            revertedProducts[index] = { ...revertedProducts[index], is_live: currentStatus };
            setLocalProducts(revertedProducts);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-bold text-gray-900">Menu Items</h3>
                    <p className="text-sm text-gray-500">Manage your menu offerings</p>
                </div>
                <button
                    onClick={onAdd}
                    className="px-4 py-2 bg-white border border-gray-200 text-blue-600 hover:bg-blue-50 font-semibold rounded-lg text-sm flex items-center gap-2 shadow-sm transition-all hover:scale-105"
                >
                    <span className="material-symbols-outlined text-sm">add</span>
                    Add Item
                </button>
            </div>

            {localProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 bg-white rounded-lg border border-dashed border-gray-300 text-center">
                    <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">restaurant_menu</span>
                    <p className="text-gray-500 text-sm">No items added yet.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3">
                    {localProducts.map((product: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl group hover:shadow-md hover:border-blue-100 transition-all">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden relative border border-gray-200">
                                    {product.image_url ? (
                                        <Image src={product.image_url} alt={product.name} fill className="object-cover" />
                                    ) : (
                                        <span className="material-symbols-outlined absolute inset-0 flex items-center justify-center text-gray-400 text-sm">restaurant</span>
                                    )}
                                </div>
                                <div>
                                    <span className="font-bold text-gray-900 block">{product.name}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-md">₹{product.price}</span>
                                        {product.description && <span className="text-xs text-gray-400 truncate max-w-[150px] hidden md:block">• {product.description}</span>}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2" title="Toggle Visibility">
                                    <button
                                        onClick={() => toggleProductLive(product.id, !!product.is_live, idx)}
                                        className={`w-9 h-5 rounded-full p-0.5 transition-colors ${product.is_live !== false ? 'bg-blue-600' : 'bg-gray-300'}`}
                                    >
                                        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${product.is_live !== false ? 'translate-x-4' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                                <div className="h-6 w-px bg-gray-200"></div>
                                <button
                                    onClick={() => onEdit(product)}
                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[20px]">edit</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function SiteInfo({
    shop,
    onEditBasic,
    onEditContact,
    onEditLocation,
    onEditBanner,
    onEditBannerCamera,
    onEditTimings,
    onDeleteClick
}: {
    shop: any;
    onEditBasic: () => void;
    onEditContact: () => void;
    onEditLocation: () => void;
    onEditBanner: () => void;
    onEditBannerCamera: () => void;
    onEditTimings: () => void;
    onDeleteClick: () => void;
}) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column: Basic Info */}
            <div className="space-y-6">
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm relative group hover:border-blue-200 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            <span className="material-symbols-outlined text-gray-400">info</span> Basic Information
                        </h3>
                        <button onClick={onEditBasic} className="text-gray-400 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-lg transition-colors">
                            <span className="material-symbols-outlined text-sm">edit</span>
                        </button>
                    </div>

                    <div className="space-y-5">
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Restaurant Name</label>
                            <p className="font-medium text-gray-900 text-lg">{shop.name}</p>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Tagline</label>
                            <p className="font-medium text-gray-700">{shop.tagline || <span className="text-gray-400 italic">No tagline added</span>}</p>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Description</label>
                            <p className="text-sm text-gray-600 leading-relaxed">{shop.description || <span className="text-gray-400 italic">No description added</span>}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm relative group hover:border-blue-200 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            <span className="material-symbols-outlined text-gray-400">contact_phone</span> Contact Details
                        </h3>
                        <button onClick={onEditContact} className="text-gray-400 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-lg transition-colors">
                            <span className="material-symbols-outlined text-sm">edit</span>
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                <span className="material-symbols-outlined text-sm">call</span>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase block">Phone</label>
                                <p className="font-medium text-gray-900">{shop.contact_number || '-'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                                <span className="material-symbols-outlined text-sm">chat</span>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase block">WhatsApp</label>
                                <p className="font-medium text-gray-900">{shop.whatsapp_number || shop.contact_number || '-'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
                                <span className="material-symbols-outlined text-sm">mail</span>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase block">Email</label>
                                <p className="font-medium text-gray-900">{shop.email || '-'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>


            {/* Right Column: Banner & Contact & Location */}
            <div className="space-y-6">
                {/* Marketing Assets */}
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm relative group hover:border-blue-200 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="font-bold text-gray-900 flex items-center gap-2">
                            <span className="material-symbols-outlined text-gray-400">campaign</span> Marketing Assets
                        </h4>
                    </div>
                    <div className="flex flex-col items-center">
                        <PosterGenerator
                            siteName={shop.name}
                            siteUrl={`https://voicesite.in/shop/${shop.slug}`}
                            siteType="Menu"
                        />
                    </div>
                </div>

                {/* Site Banner */}
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm relative group hover:border-blue-200 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="font-bold text-gray-900 flex items-center gap-2">
                            <span className="material-symbols-outlined text-gray-400">image</span> Site Banner
                        </h4>
                        <div className="flex gap-2">
                            <button onClick={onEditBanner} className="text-gray-400 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-lg transition-colors" title="Upload from Gallery">
                                <span className="material-symbols-outlined text-sm">add_photo_alternate</span>
                            </button>
                            <button onClick={onEditBannerCamera} className="text-gray-400 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-lg transition-colors" title="Take Photo">
                                <span className="material-symbols-outlined text-sm">photo_camera</span>
                            </button>
                        </div>
                    </div>
                    <div className="h-48 bg-gray-100 rounded-lg flex items-center justify-center relative overflow-hidden group/image ">
                        {/* Removed onClick from container to avoid ambiguity, relying on icons now */}
                        {shop.image_url ? (
                            <>
                                <Image src={shop.image_url} alt="Banner" fill className="object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                    <button onClick={onEditBanner} className="p-2 bg-white rounded-full text-gray-700 hover:text-blue-600 transition-colors" title="Gallery">
                                        <span className="material-symbols-outlined">add_photo_alternate</span>
                                    </button>
                                    <button onClick={onEditBannerCamera} className="p-2 bg-white rounded-full text-gray-700 hover:text-blue-600 transition-colors" title="Camera">
                                        <span className="material-symbols-outlined">photo_camera</span>
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center gap-4 text-gray-400">
                                <span className="text-sm font-medium">Upload Banner</span>
                                <div className="flex gap-4">
                                    <button onClick={onEditBanner} className="flex flex-col items-center gap-1 hover:text-blue-500 transition-colors">
                                        <span className="material-symbols-outlined text-3xl">add_photo_alternate</span>
                                        <span className="text-xs">Gallery</span>
                                    </button>
                                    <button onClick={onEditBannerCamera} className="flex flex-col items-center gap-1 hover:text-blue-500 transition-colors">
                                        <span className="material-symbols-outlined text-3xl">photo_camera</span>
                                        <span className="text-xs">Camera</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Location Info */}
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm relative group hover:border-blue-200 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="font-bold text-gray-900 flex items-center gap-2">
                            <span className="material-symbols-outlined text-gray-400">location_on</span> Location
                        </h4>
                        <button onClick={onEditLocation} className="text-gray-400 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-lg transition-colors">
                            <span className="material-symbols-outlined text-sm">edit</span>
                        </button>
                    </div>
                    <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-blue-600 shadow-sm shrink-0">
                            <span className="material-symbols-outlined text-xl">map</span>
                        </div>
                        <div>
                            <p className="font-bold text-gray-900 mb-1">Address</p>
                            <p className="text-gray-700 leading-relaxed">{shop.location || 'No location address added.'}</p>
                        </div>
                    </div>
                </div>

                {/* Timings Info */}
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm relative group hover:border-blue-200 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="font-bold text-gray-900 flex items-center gap-2">
                            <span className="material-symbols-outlined text-gray-400">schedule</span> Operating Hours
                        </h4>
                        <button onClick={onEditTimings} className="text-gray-400 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-lg transition-colors">
                            <span className="material-symbols-outlined text-sm">edit</span>
                        </button>
                    </div>
                    <div className="flex items-start gap-4 p-4 bg-purple-50 rounded-lg border border-purple-100">
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-purple-600 shadow-sm shrink-0">
                            <span className="material-symbols-outlined text-xl">timer</span>
                        </div>
                        <div>
                            <p className="font-bold text-gray-900 mb-1">Schedule</p>
                            <p className="text-gray-700 leading-relaxed">{shop.timing || 'No schedule added.'}</p>
                        </div>
                    </div>
                </div>

                {/* Delete Website Section */}
                <div className="bg-white p-6 rounded-xl border border-red-100 shadow-sm relative group hover:border-red-200 transition-colors">
                    <div className="flex items-center justify-between">
                        <h4 className="font-bold text-red-600 flex items-center gap-2">
                            <span className="material-symbols-outlined">delete_forever</span> Danger Zone
                        </h4>
                        <button
                            onClick={onDeleteClick}
                            className="text-red-600 hover:text-white border border-red-200 hover:bg-red-600 px-4 py-2 rounded-lg transition-all text-sm font-medium flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined text-sm">delete</span>
                            Delete Menu
                        </button>
                    </div>
                    <p className="text-gray-500 text-xs mt-2">
                        Permanently delete this menu and all its data. This action cannot be undone.
                    </p>
                </div>

            </div>
        </div>
    );
}
