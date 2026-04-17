'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useSite } from '@/components/SiteContext';
import { useNotifications } from '@/components/NotificationContext';
import toast from 'react-hot-toast';

interface Product {
    id: string;
    name: string;
    description?: string;
    type?: string;        // DB column: Single Item | Variants | Combo
    dish_type?: string;   // DB column: Vegetarian | Egg | Non-Vegetarian
    item_type?: string;   // DB column: single | variant | combo
    food_type?: string;   // DB column: veg | egg | non_veg | unknown
    category?: string;
    selling_price: number;
    is_live?: boolean;
    site_id?: string;
    image_url?: string | null;
    metadata?: Record<string, unknown>;
}

// Maps between UI labels and DB values
const ITEM_TYPE_TO_DB: Record<string, string> = {
    'Single Item': 'single',
    'Variants':    'variant',
    'Combo':       'combo',
};
const DB_TO_ITEM_TYPE: Record<string, string> = {
    'single':  'Single Item',
    'variant': 'Variants',
    'combo':   'Combo',
};
const DISH_TYPE_TO_DB: Record<string, string> = {
    'Vegetarian':     'veg',
    'Egg':            'egg',
    'Non-Vegetarian': 'non_veg',
};
const DB_TO_DISH_TYPE: Record<string, typeof DISH_TYPES[number]> = {
    'veg':     'Vegetarian',
    'egg':     'Non-Vegetarian',
    'non_veg': 'Non-Vegetarian',
    'unknown': 'Non-Vegetarian',
};

interface VariantRow { id: string; size: string; price: string; }
interface ToppingRow { id: string; name: string; price: string; }
interface ComboItemRow { id: string; name: string; qty: string; }

const PRODUCT_TYPES = [
    { label: 'Single Item', sub: 'One product, one price' },
    { label: 'Variants',    sub: 'S, M, L sizes' },
    { label: 'Combo',       sub: 'Multiple items' },
];

const DISH_TYPES = ['Vegetarian', 'Non-Vegetarian'] as const;

const emptyForm = {
    productType: 'Single Item',
    name: '',
    dishType: 'Non-Vegetarian' as typeof DISH_TYPES[number],
    category: '',
    description: '',
    sellingPrice: '',
    originalPrice: '',
    discountEnabled: false,
    available: true,
    imagePreview: null as string | null,  // local objectURL or existing image_url
    imageFile:    null as File | null,    // actual File to upload (null = no new upload)
};

const uid = () => Math.random().toString(36).slice(2);

/* ── Shared sub-components for the drawer ── */

function PriceInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
    return (
        <div className="flex items-center shrink-0" style={{ border: '1px solid #E4E4E7', borderRadius: 8, overflow: 'hidden', width: 110 }}>
            <span style={{ padding: '9px 8px 9px 10px', fontSize: 13, color: '#71717A', background: '#FAFAFA', borderRight: '1px solid #E4E4E7' }}>₹</span>
            <input type="number" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ flex: 1, padding: '9px 8px', fontSize: 13, color: '#0A0A0A', outline: 'none', border: 'none', background: 'transparent', width: 0 }} />
        </div>
    );
}

function DeleteBtn({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
    return (
        <button type="button" onClick={onClick} disabled={disabled}
            className="flex items-center justify-center hover:bg-red-50 transition-colors shrink-0"
            style={{ width: 32, height: 38, borderRadius: 6, border: 'none', background: 'none', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.3 : 1 }}
        >
            <span className="material-symbols-outlined" style={{ fontSize: 17, color: '#E7000B' }}>delete</span>
        </button>
    );
}

function SectionRows({ label, rows, onAdd, addLabel, renderRow }: {
    label: string; rows: { id: string }[]; onAdd: () => void; addLabel: string;
    renderRow: (row: any) => React.ReactNode;
}) {
    return (
        <div style={{ marginBottom: 20 }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#0A0A0A' }}>{label} <span style={{ color: '#E7000B' }}>*</span></span>
                <button type="button" onClick={onAdd} className="flex items-center gap-1 hover:opacity-80 transition-opacity" style={{ fontSize: 13, fontWeight: 600, color: '#5137EF', background: 'none', border: 'none', cursor: 'pointer' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 15 }}>add</span>
                    {addLabel}
                </button>
            </div>
            <div className="flex flex-col gap-2">{rows.map(renderRow)}</div>
        </div>
    );
}

function PriceFields({ form, setForm, lbl }: { form: any; setForm: any; inp?: React.CSSProperties; lbl: React.CSSProperties }) {
    const sp  = Number(form.sellingPrice)  || 0;
    const op  = Number(form.originalPrice) || 0;
    const pct = op > sp && op > 0 ? Math.round((1 - sp / op) * 100) : 0;

    return (
        <div style={{ marginBottom: 20 }}>
            {/* Discount toggle row */}
            <div className="flex items-center justify-between" style={{ padding: '12px 14px', border: '1px solid #E4E4E7', borderRadius: form.discountEnabled ? '10px 10px 0 0' : 10, background: '#FAFAFA', marginBottom: 0 }}>
                <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#0A0A0A' }}>Offer / Discount</p>
                    <p style={{ fontSize: 12, color: '#71717A', marginTop: 2 }}>Show strikethrough MRP &amp; discount badge</p>
                </div>
                <button type="button" onClick={() => setForm((f: any) => ({ ...f, discountEnabled: !f.discountEnabled }))}
                    style={{ position: 'relative', display: 'flex', alignItems: 'center', width: 43, height: 24, borderRadius: 9999, background: form.discountEnabled ? '#13801C' : '#D4D4D8', border: 'none', cursor: 'pointer', transition: 'background 0.2s', padding: 0, flexShrink: 0 }}
                >
                    <span style={{ position: 'absolute', top: 3, left: form.discountEnabled ? 22 : 3, width: 18, height: 18, borderRadius: '50%', background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
                </button>
            </div>

            {/* Price inputs */}
            <div style={{ padding: '14px', border: '1px solid #E4E4E7', borderTop: 'none', borderRadius: '0 0 10px 10px', background: '#FFFFFF' }}>
                <div className={`grid gap-3 ${form.discountEnabled ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {/* Selling price — always shown */}
                    <div>
                        <label style={lbl}>{form.discountEnabled ? 'Selling Price (Offer)' : 'Selling Price'}<span style={{ color: '#E7000B' }}> *</span></label>
                        <div className="flex items-center" style={{ border: '1px solid #E4E4E7', borderRadius: 8, overflow: 'hidden' }}>
                            <span style={{ padding: '9px 10px 9px 12px', fontSize: 13, color: '#71717A', background: '#FAFAFA', borderRight: '1px solid #E4E4E7' }}>₹</span>
                            <input type="number" value={form.sellingPrice} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f: any) => ({ ...f, sellingPrice: e.target.value }))} placeholder="0" style={{ flex: 1, padding: '9px 10px', fontSize: 13, color: '#0A0A0A', outline: 'none', border: 'none', background: 'transparent', width: 0 }} />
                        </div>
                    </div>

                    {/* Original price — only when discount is on */}
                    {form.discountEnabled && (
                        <div>
                            <label style={lbl}>Original Price (MRP)</label>
                            <div className="flex items-center" style={{ border: '1px solid #E4E4E7', borderRadius: 8, overflow: 'hidden' }}>
                                <span style={{ padding: '9px 10px 9px 12px', fontSize: 13, color: '#71717A', background: '#FAFAFA', borderRight: '1px solid #E4E4E7' }}>₹</span>
                                <input type="number" value={form.originalPrice} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f: any) => ({ ...f, originalPrice: e.target.value }))} placeholder="0" style={{ flex: 1, padding: '9px 10px', fontSize: 13, color: '#0A0A0A', outline: 'none', border: 'none', background: 'transparent', width: 0 }} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Auto-calculated discount preview */}
                {form.discountEnabled && pct > 0 && (
                    <div className="flex items-center gap-2" style={{ marginTop: 10 }}>
                        <span style={{ fontSize: 12, color: '#52525C' }}>Discount calculated:</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', background: '#DCFCE7', borderRadius: 4, padding: '2px 8px', fontSize: 12, fontWeight: 600, color: '#13801C' }}>Flat {pct}% Off</span>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function ProductInventoryPage() {
    const { activeSite } = useSite();
    const { missingImageCount, refresh: refreshNotifications } = useNotifications();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [siteId, setSiteId] = useState<string | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
    const [form, setForm] = useState({ ...emptyForm });
    const [showAddCategory, setShowAddCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [categories, setCategories] = useState<string[]>([]);
    const [variants, setVariants] = useState<VariantRow[]>([{ id: uid(), size: '', price: '' }]);
    const [toppings, setToppings] = useState<ToppingRow[]>([{ id: uid(), name: '', price: '' }]);
    const [comboItems, setComboItems] = useState<ComboItemRow[]>([{ id: uid(), name: '', qty: '1' }]);
    const imageInputRef = useRef<HTMLInputElement>(null);

    const fetchProducts = useCallback(async (id: string) => {
        setLoading(true);
        setProducts([]);
        setSiteId(id);
        const { data } = await supabase
            .from('products')
            .select('id, name, description, type, dish_type, item_type, food_type, category, selling_price, is_live, image_url, metadata')
            .eq('site_id', id)
            .order('sort_order', { ascending: true });
        const all: Product[] = (data ?? []).map((p: any) => ({ ...p, site_id: id }));
        setProducts(all);
        const cats = Array.from(new Set(all.map((p: Product) => p.category).filter(Boolean))) as string[];
        setCategories(cats);
        setLoading(false);
    }, []);

    useEffect(() => {
        if (activeSite?.id) fetchProducts(activeSite.id);
    }, [activeSite?.id, fetchProducts]);

    const toggleAvailability = async (id: string, current: boolean) => {
        const { error } = await supabase.from('products').update({ is_live: !current }).eq('id', id);
        if (error) { toast.error('Failed to update'); return; }
        setProducts(prev => prev.map(p => p.id === id ? { ...p, is_live: !current } : p));
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        const { error } = await supabase.from('products').delete().eq('id', deleteTarget.id);
        if (error) { toast.error('Failed to delete'); return; }
        setProducts(prev => prev.filter(p => p.id !== deleteTarget.id));
        setDeleteTarget(null);
    };

    const openDrawer = () => {
        setEditingProduct(null);
        setForm({ ...emptyForm, imagePreview: null, imageFile: null });
        setShowAddCategory(false);
        setNewCategoryName('');
        setVariants([{ id: uid(), size: '', price: '' }]);
        setToppings([{ id: uid(), name: '', price: '' }]);
        setComboItems([{ id: uid(), name: '', qty: '1' }]);
        setDrawerOpen(true);
    };

    const openEditDrawer = (product: Product) => {
        setEditingProduct(product);
        const productType = (product.type as string) || DB_TO_ITEM_TYPE[product.item_type ?? ''] || 'Single Item';
        const dishType    = (product.dish_type as typeof DISH_TYPES[number]) || DB_TO_DISH_TYPE[product.food_type ?? ''] || 'Non-Vegetarian';
        const meta        = product.metadata ?? {};

        setForm({
            productType,
            name:            product.name,
            dishType,
            category:        product.category || '',
            description:     product.description || '',
            sellingPrice:    String(product.selling_price ?? 0),
            originalPrice:   meta.original_price ? String(meta.original_price) : '',
            discountEnabled: !!(meta.discount_enabled),
            available:       product.is_live !== false,
            imagePreview:    product.image_url ?? null,
            imageFile:       null,
        });
        setShowAddCategory(false);
        setNewCategoryName('');

        // Restore variants/toppings/combo from metadata
        const savedVariants = Array.isArray(meta.variants) && (meta.variants as any[]).length > 0
            ? (meta.variants as any[]).map((v: any) => ({ id: uid(), size: v.size ?? '', price: v.price ?? '' }))
            : [{ id: uid(), size: '', price: '' }];
        const savedToppings = Array.isArray(meta.toppings) && (meta.toppings as any[]).length > 0
            ? (meta.toppings as any[]).map((t: any) => ({ id: uid(), name: t.name ?? '', price: t.price ?? '' }))
            : [{ id: uid(), name: '', price: '' }];
        const savedCombo = Array.isArray(meta.comboItems) && (meta.comboItems as any[]).length > 0
            ? (meta.comboItems as any[]).map((c: any) => ({ id: uid(), name: c.name ?? '', qty: c.qty ?? '1' }))
            : [{ id: uid(), name: '', qty: '1' }];

        setVariants(savedVariants);
        setToppings(savedToppings);
        setComboItems(savedCombo);
        setDrawerOpen(true);
    };

    const closeDrawer = () => { setDrawerOpen(false); setEditingProduct(null); };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setForm(f => ({
            ...f,
            imageFile:    file,
            imagePreview: URL.createObjectURL(file),
        }));
    };

    // Variant helpers
    const addVariant = () => setVariants(v => [...v, { id: uid(), size: '', price: '' }]);
    const removeVariant = (id: string) => setVariants(v => v.filter(r => r.id !== id));
    const updateVariant = (id: string, field: 'size' | 'price', val: string) =>
        setVariants(v => v.map(r => r.id === id ? { ...r, [field]: val } : r));

    // Topping helpers
    const addTopping = () => setToppings(t => [...t, { id: uid(), name: '', price: '' }]);
    const removeTopping = (id: string) => setToppings(t => t.filter(r => r.id !== id));
    const updateTopping = (id: string, field: 'name' | 'price', val: string) =>
        setToppings(t => t.map(r => r.id === id ? { ...r, [field]: val } : r));

    // Combo item helpers
    const addComboItem = () => setComboItems(c => [...c, { id: uid(), name: '', qty: '1' }]);
    const removeComboItem = (id: string) => setComboItems(c => c.filter(r => r.id !== id));
    const updateComboItem = (id: string, field: 'name' | 'qty', val: string) =>
        setComboItems(c => c.map(r => r.id === id ? { ...r, [field]: val } : r));

    const handleSaveProduct = async () => {
        if (!form.name.trim()) { toast.error('Product name is required'); return; }
        if (form.sellingPrice !== '' && Number(form.sellingPrice) < 0) { toast.error('Price cannot be negative'); return; }

        setSaving(true);

        const metadata: Record<string, unknown> = {};
        if (form.productType === 'Variants') {
            metadata.variants = variants.filter(v => v.size.trim());
            metadata.toppings = toppings.filter(t => t.name.trim());
        }
        if (form.productType === 'Combo') {
            metadata.comboItems = comboItems.filter(c => c.name.trim());
        }
        // Discount / offer pricing
        if (form.discountEnabled && form.originalPrice) {
            const sp  = Number(form.sellingPrice) || 0;
            const op  = Number(form.originalPrice) || 0;
            metadata.discount_enabled = true;
            metadata.original_price   = op;
            metadata.discount_pct     = op > sp && op > 0 ? Math.round((1 - sp / op) * 100) : 0;
        } else {
            metadata.discount_enabled = false;
        }

        // Upload new image if one was selected
        let imageUrl: string | null = editingProduct?.image_url ?? null;
        if (form.imageFile) {
            const ext  = form.imageFile.name.split('.').pop() ?? 'jpg';
            const path = `${siteId ?? 'unknown'}/${Date.now()}.${ext}`;
            const { error: uploadError } = await supabase.storage
                .from('product-images')
                .upload(path, form.imageFile, { upsert: true, contentType: form.imageFile.type });
            if (uploadError) {
                toast.error('Image upload failed — product saved without image');
            } else {
                const { data: urlData } = supabase.storage
                    .from('product-images')
                    .getPublicUrl(path);
                imageUrl = urlData.publicUrl;
            }
        }

        const row = {
            name:          form.name.trim(),
            description:   form.description.trim() || undefined,
            type:          form.productType,
            dish_type:     form.dishType,
            item_type:     ITEM_TYPE_TO_DB[form.productType] ?? 'single',
            food_type:     DISH_TYPE_TO_DB[form.dishType]    ?? 'unknown',
            category:      form.category.trim() || undefined,
            selling_price: Number(form.sellingPrice) || 0,
            is_live:       form.available,
            image_url:     imageUrl,
            metadata:      Object.keys(metadata).length > 0 ? metadata : {},
        };

        if (editingProduct) {
            const { error } = await supabase
                .from('products')
                .update(row)
                .eq('id', editingProduct.id);
            if (error) { toast.error('Failed to update product'); setSaving(false); return; }
            setProducts(prev => prev.map(p =>
                p.id === editingProduct.id ? { ...p, ...row } : p
            ) as Product[]);
            toast.success('Product updated!');
        } else {
            if (!siteId) { toast.error('No store found. Please complete onboarding first.'); setSaving(false); return; }
            const { data, error } = await supabase
                .from('products')
                .insert({ ...row, site_id: siteId })
                .select('id, name, description, type, dish_type, item_type, food_type, category, selling_price, is_live, image_url, metadata')
                .single();
            if (error || !data) { toast.error('Failed to add product'); setSaving(false); return; }
            setProducts(prev => [{ ...data, site_id: siteId }, ...prev]);
            toast.success('Product added!');
        }

        // Keep local category list in sync so next product can reuse it
        const savedCat = form.category.trim();
        if (savedCat && !categories.includes(savedCat)) {
            setCategories(prev => [...prev, savedCat]);
        }

        setSaving(false);
        closeDrawer();
        // Re-check notification dots — image may have been added
        refreshNotifications();
    };

    // Shared styles
    const inp: React.CSSProperties = { width: '100%', border: '1px solid #E4E4E7', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: '#0A0A0A', outline: 'none', background: '#FFFFFF' };
    const lbl: React.CSSProperties = { fontSize: 14, fontWeight: 600, color: '#0A0A0A', lineHeight: '20px', marginBottom: 8, display: 'block' };
    const isVariants = form.productType === 'Variants';
    const isCombo    = form.productType === 'Combo';

    const COLS = ['PRODUCT', 'DESCRIPTION', 'TYPE', 'CATEGORY', 'PRICE', 'AVAILABILITY', 'ACTIONS'];

    // Sort: missing image (score 2) + toggled off (score 1) → highest score first
    const sortedProducts = [...products].sort((a, b) => {
        const score = (p: Product) => (!p.image_url ? 2 : 0) + (p.is_live === false ? 1 : 0);
        return score(b) - score(a);
    });

    return (
        <div className="px-4 lg:px-8 py-5 lg:py-8">

            {/* Page header */}
            <div className="flex items-start justify-between mb-5 lg:mb-6">
                <div>
                    <h1 className="font-semibold text-[#0A0A0A]" style={{ fontSize: 26, lineHeight: '32px' }}>Product Inventory</h1>
                    <p className="text-[#52525C] mt-1" style={{ fontSize: 14, lineHeight: '22px', fontWeight: 400 }}>Manage your Store Products &amp; Menu</p>
                </div>
                <button
                    className="flex items-center gap-1.5 text-white hover:opacity-90 transition-opacity shrink-0"
                    style={{ background: '#5137EF', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 500 }}
                    onClick={openDrawer}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: 15 }}>add</span>
                    Add Product
                </button>
            </div>

            {/* ── Missing image alert banner ── */}
            {missingImageCount > 0 && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: '#FFF7ED', border: '1px solid #FED7AA',
                    borderRadius: 10, padding: '10px 16px', marginBottom: 20,
                }}>
                    <span className="material-symbols-outlined shrink-0" style={{ fontSize: 20, color: '#EA580C' }}>
                        photo_camera
                    </span>
                    <div className="flex-1">
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#9A3412', margin: 0 }}>
                            {missingImageCount} product{missingImageCount > 1 ? 's' : ''} missing an image
                        </p>
                        <p style={{ fontSize: 12, color: '#C2410C', margin: '2px 0 0' }}>
                            Tap the <span style={{ fontWeight: 600 }}>edit</span> button on any highlighted product to add a photo.
                        </p>
                    </div>
                </div>
            )}

            {/* ── DESKTOP TABLE (md+) ── */}
            <div className="hidden lg:block bg-white overflow-hidden" style={{ border: '1px solid #E4E4E7', borderRadius: 14 }}>
                <div className="grid" style={{ gridTemplateColumns: '160px 1fr 110px 110px 80px 110px 80px', background: '#F4F4F4', borderBottom: '1px solid #E4E4E7', padding: '0 24px' }}>
                    {COLS.map(col => (
                        <div key={col} className="text-[#71717A]" style={{ padding: '12px 0', fontSize: 12, fontWeight: 500, letterSpacing: '0.6px', textTransform: 'uppercase' }}>{col}</div>
                    ))}
                </div>
                {loading ? (
                    <div className="py-16 text-center text-sm text-[#99A1AF]">Loading…</div>
                ) : sortedProducts.length === 0 ? (
                    <div className="py-16 flex flex-col items-center gap-2">
                        <span className="material-symbols-outlined text-[#D4D4D8]" style={{ fontSize: 48 }}>inventory_2</span>
                        <p className="text-sm text-[#99A1AF]">No products yet. Add your first product.</p>
                    </div>
                ) : sortedProducts.map((product, idx) => {
                    const isOn = product.is_live !== false;
                    const typeLabel = DB_TO_ITEM_TYPE[product.item_type ?? ''] ?? 'Single Item';
                    const noImage = !product.image_url;
                    return (
                        <div key={product.id} className="grid items-center" style={{ gridTemplateColumns: '160px 1fr 110px 110px 80px 110px 80px', padding: '0 24px', minHeight: 50, borderBottom: idx < sortedProducts.length - 1 ? '1px solid #E4E4E7' : 'none', background: noImage ? '#FFFBF5' : 'transparent' }}>
                            <div className="truncate pr-3 flex items-center gap-1.5" style={{ fontSize: 12, fontWeight: 500, color: '#0A0A0A' }}>
                                {noImage && (
                                    <span title="No image — tap edit to add one" style={{
                                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                        width: 16, height: 16, borderRadius: '50%',
                                        background: '#E7000B', flexShrink: 0,
                                    }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: 10, color: '#fff', fontVariationSettings: "'FILL' 1" }}>camera_alt</span>
                                    </span>
                                )}
                                {product.name}
                            </div>
                            <div className="truncate pr-4" style={{ fontSize: 12, color: '#52525C' }}>{product.description || '—'}</div>
                            <div><span style={{ display: 'inline-flex', alignItems: 'center', background: '#F0EDFF', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 500, color: '#5137EF' }}>{typeLabel}</span></div>
                            <div style={{ fontSize: 12, color: '#52525C' }}>{product.category || '—'}</div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#0A0A0A' }}>₹{product.selling_price}</div>
                            <div>
                                <button onClick={() => toggleAvailability(product.id, isOn)} style={{ position: 'relative', display: 'flex', alignItems: 'center', width: 43, height: 20, borderRadius: 9999, background: isOn ? '#00A63E' : '#EE5A4F', border: 'none', cursor: 'pointer', transition: 'background 0.2s', padding: 0 }}>
                                    <span style={{ position: 'absolute', top: 2, left: isOn ? 25 : 2, width: 16, height: 16, borderRadius: '50%', background: '#FFFFFF', transition: 'left 0.2s' }} />
                                </button>
                            </div>
                            <div className="flex items-center gap-2">
                                <button className="flex items-center justify-center hover:bg-neutral-100 transition-colors" style={{ width: 32, height: 32, borderRadius: 6 }} onClick={() => openEditDrawer(product)}>
                                    <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#0A0A0A' }}>edit</span>
                                </button>
                                <button className="flex items-center justify-center hover:bg-red-50 transition-colors" style={{ width: 32, height: 32, borderRadius: 6 }} onClick={() => setDeleteTarget({ id: product.id, name: product.name })}>
                                    <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#E7000B' }}>delete</span>
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── MOBILE CARDS ── */}
            <div className="lg:hidden overflow-hidden" style={{ border: '1px solid #E4E4E7', borderRadius: 14 }}>
                {loading ? (
                    <div className="py-16 text-center text-sm text-[#99A1AF]">Loading…</div>
                ) : sortedProducts.length === 0 ? (
                    <div className="py-16 flex flex-col items-center gap-2">
                        <span className="material-symbols-outlined text-[#D4D4D8]" style={{ fontSize: 40 }}>inventory_2</span>
                        <p className="text-sm text-[#99A1AF]">No products yet.</p>
                    </div>
                ) : sortedProducts.map((product, idx) => {
                    const isOn = product.is_live !== false;
                    const typeLabel = DB_TO_ITEM_TYPE[product.item_type ?? ''] ?? 'Single Item';
                    const noImage = !product.image_url;
                    return (
                        <div
                            key={product.id}
                            style={{ padding: '14px 16px', background: noImage ? '#FFFBF5' : '#FFFFFF', borderBottom: idx < sortedProducts.length - 1 ? '1px solid #E4E4E7' : 'none' }}
                        >
                            {/* Row 1: Name + Actions */}
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    {noImage && (
                                        <span style={{
                                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                            width: 18, height: 18, borderRadius: '50%',
                                            background: '#E7000B', flexShrink: 0,
                                        }}>
                                            <span className="material-symbols-outlined" style={{ fontSize: 11, color: '#fff', fontVariationSettings: "'FILL' 1" }}>camera_alt</span>
                                        </span>
                                    )}
                                    <span style={{ fontSize: 14, fontWeight: 600, color: '#0A0A0A' }}>{product.name}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button className="flex items-center justify-center hover:bg-neutral-100 transition-colors" style={{ width: 30, height: 30, borderRadius: 6 }} onClick={() => openEditDrawer(product)}>
                                        <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#0A0A0A' }}>edit</span>
                                    </button>
                                    <button className="flex items-center justify-center hover:bg-red-50 transition-colors" style={{ width: 30, height: 30, borderRadius: 6 }} onClick={() => setDeleteTarget({ id: product.id, name: product.name })}>
                                        <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#E7000B' }}>delete</span>
                                    </button>
                                </div>
                            </div>
                            {/* Row 2: Type badge + Price + Toggle */}
                            <div className="flex items-center gap-3">
                                <span style={{ display: 'inline-flex', alignItems: 'center', background: '#F0EDFF', borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 500, color: '#5137EF' }}>{typeLabel}</span>
                                <span style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A' }}>₹{product.selling_price}</span>
                                <button onClick={() => toggleAvailability(product.id, isOn)} style={{ position: 'relative', display: 'flex', alignItems: 'center', width: 40, height: 20, borderRadius: 9999, background: isOn ? '#00A63E' : '#EE5A4F', border: 'none', cursor: 'pointer', transition: 'background 0.2s', padding: 0, marginLeft: 'auto' }}>
                                    <span style={{ position: 'absolute', top: 2, left: isOn ? 22 : 2, width: 16, height: 16, borderRadius: '50%', background: '#FFFFFF', transition: 'left 0.2s' }} />
                                </button>
                            </div>
                            {product.category && (
                                <p style={{ fontSize: 11, color: '#99A1AF', marginTop: 4 }}>{product.category}</p>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* ── DELETE CONFIRMATION MODAL ── */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.35)' }}>
                    <div className="bg-white flex flex-col items-center" style={{ width: 400, borderRadius: 16, padding: '32px 28px 24px', position: 'relative', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>

                        {/* Close */}
                        <button
                            onClick={() => setDeleteTarget(null)}
                            className="absolute flex items-center justify-center hover:bg-neutral-100 transition-colors"
                            style={{ top: 16, right: 16, width: 28, height: 28, borderRadius: 6, border: 'none', background: 'none', cursor: 'pointer' }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#71717A' }}>close</span>
                        </button>

                        {/* Icon */}
                        <div className="flex items-center justify-center" style={{ width: 56, height: 56, borderRadius: '50%', background: '#FEE2E2', marginBottom: 20 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 28, color: '#E7000B' }}>warning</span>
                        </div>

                        {/* Title */}
                        <h3 className="font-semibold text-[#0A0A0A] text-center" style={{ fontSize: 20, lineHeight: '28px', marginBottom: 8 }}>
                            Delete Product?
                        </h3>

                        {/* Subtitle */}
                        <p className="text-[#71717A] text-center" style={{ fontSize: 14, lineHeight: '20px', marginBottom: 16 }}>
                            Are you sure you want to delete this product from your inventory?
                        </p>

                        {/* Product name chip */}
                        <div
                            className="w-full text-center font-medium"
                            style={{ background: '#FEE2E2', borderRadius: 8, padding: '10px 16px', fontSize: 14, color: '#0A0A0A', marginBottom: 10 }}
                        >
                            &ldquo;{deleteTarget.name}&rdquo;
                        </div>

                        {/* Warning */}
                        <p className="text-[#99A1AF] text-center" style={{ fontSize: 12, marginBottom: 24 }}>
                            This action cannot be undone.
                        </p>

                        {/* Buttons */}
                        <div className="flex items-center gap-3 w-full">
                            <button
                                onClick={() => setDeleteTarget(null)}
                                className="flex-1 hover:bg-neutral-50 transition-colors"
                                style={{ border: '1px solid #E4E4E7', borderRadius: 8, padding: '11px 0', fontSize: 14, fontWeight: 500, color: '#0A0A0A', background: '#FFFFFF', cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 hover:opacity-90 transition-opacity"
                                style={{ background: '#E7000B', borderRadius: 8, padding: '11px 0', fontSize: 14, fontWeight: 500, color: '#FFFFFF', border: 'none', cursor: 'pointer' }}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── ADD PRODUCT DRAWER ── */}
            {drawerOpen && (
                <>
                    <div className="fixed inset-0" style={{ background: 'rgba(0,0,0,0.25)', zIndex: 55 }} onClick={closeDrawer} />

                    <div className="fixed top-0 right-0 flex flex-col bg-white" style={{ width: 'min(500px, 100vw)', height: '100dvh', boxShadow: '-4px 0 24px rgba(0,0,0,0.10)', zIndex: 60 }}>

                        {/* Header */}
                        <div style={{ padding: '22px 24px 16px', borderBottom: '1px solid #E4E4E7', flexShrink: 0 }}>
                            <div className="flex items-start justify-between">
                                <div>
                                    <h2 className="font-semibold text-[#0A0A0A]" style={{ fontSize: 22, lineHeight: '28px' }}>{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
                                    <p className="text-[#71717A]" style={{ fontSize: 13, marginTop: 2 }}>{editingProduct ? 'Update the product details below' : 'Fill in the product details below'}</p>
                                </div>
                                <button onClick={closeDrawer} className="flex items-center justify-center hover:bg-neutral-100 transition-colors" style={{ width: 32, height: 32, borderRadius: 6 }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#71717A' }}>close</span>
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto" style={{ padding: '20px 24px' }}>

                            {/* Product Image */}
                            <div style={{ marginBottom: 20 }}>
                                <label style={lbl}>Product Image</label>
                                <div
                                    className="flex flex-col items-center justify-center cursor-pointer"
                                    style={{ border: '1.5px dashed #C4C4C4', borderRadius: 12, padding: '28px 16px', background: '#FAFAFA' }}
                                    onClick={() => imageInputRef.current?.click()}
                                >
                                    {form.imagePreview ? (
                                        <>
                                            <img src={form.imagePreview} alt="preview" style={{ maxHeight: 90, maxWidth: '100%', objectFit: 'contain', borderRadius: 8, marginBottom: 10 }} />
                                            <button type="button" onClick={e => { e.stopPropagation(); imageInputRef.current?.click(); }} className="hover:bg-neutral-50 transition-colors" style={{ border: '1px solid #E4E4E7', borderRadius: 8, padding: '6px 18px', fontSize: 13, fontWeight: 600, color: '#0A0A0A', background: '#FFFFFF' }}>Change Image</button>
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex items-center justify-center" style={{ width: 52, height: 52, borderRadius: '50%', background: '#F0F0F0', marginBottom: 10 }}>
                                                <span className="material-symbols-outlined" style={{ fontSize: 24, color: '#71717A' }}>upload</span>
                                            </div>
                                            <p className="font-semibold text-[#0A0A0A]" style={{ fontSize: 14, marginBottom: 4 }}>Upload product image</p>
                                            <p className="text-[#99A1AF] text-center" style={{ fontSize: 12, marginBottom: 12 }}>PNG, JPG or WebP (Max 2MB)</p>
                                            <button type="button" onClick={e => { e.stopPropagation(); imageInputRef.current?.click(); }} className="hover:bg-neutral-50 transition-colors" style={{ border: '1px solid #E4E4E7', borderRadius: 8, padding: '7px 20px', fontSize: 13, fontWeight: 600, color: '#0A0A0A', background: '#FFFFFF' }}>Choose File</button>
                                        </>
                                    )}
                                    <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                                </div>
                            </div>

                            {/* Product Type */}
                            <div style={{ marginBottom: 20 }}>
                                <label style={lbl}>Product Type <span style={{ color: '#E7000B' }}>*</span></label>
                                <div className="grid grid-cols-3 gap-3">
                                    {PRODUCT_TYPES.map(pt => {
                                        const active = form.productType === pt.label;
                                        return (
                                            <button key={pt.label} type="button"
                                                onClick={() => setForm(f => ({ ...f, productType: pt.label }))}
                                                style={{ border: active ? '2px solid #5137EF' : '1.5px solid #E4E4E7', borderRadius: 10, padding: '12px 10px', background: active ? '#F0EDFF' : '#FFFFFF', textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s' }}
                                            >
                                                <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', marginBottom: 2 }}>{pt.label}</p>
                                                <p style={{ fontSize: 11, color: '#71717A' }}>{pt.sub}</p>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Product Name */}
                            <div style={{ marginBottom: 20 }}>
                                <label style={lbl}>Product Name <span style={{ color: '#E7000B' }}>*</span></label>
                                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g., Masala Chai" style={inp} />
                            </div>

                            {/* Dish Type */}
                            <div style={{ marginBottom: 20 }}>
                                <label style={lbl}>Dish Type <span style={{ color: '#E7000B' }}>*</span></label>
                                <div className="flex items-center gap-5">
                                    {DISH_TYPES.map(dt => (
                                        <label key={dt} className="flex items-center gap-2 cursor-pointer" style={{ fontSize: 14, color: '#0A0A0A' }}>
                                            <input type="radio" name="dishType" value={dt} checked={form.dishType === dt} onChange={() => setForm(f => ({ ...f, dishType: dt }))} style={{ accentColor: '#5137EF', width: 16, height: 16 }} />
                                            {dt}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Category */}
                            <div style={{ marginBottom: 20 }}>
                                <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                                    <label style={{ ...lbl, marginBottom: 0 }}>Category</label>
                                    {!showAddCategory && (
                                        <button type="button" onClick={() => setShowAddCategory(true)} style={{ fontSize: 13, fontWeight: 600, color: '#5137EF', background: 'none', border: 'none', cursor: 'pointer' }}>+ Add New</button>
                                    )}
                                </div>

                                {/* Existing category chips */}
                                {categories.length > 0 && (
                                    <div className="flex flex-wrap gap-2" style={{ marginBottom: showAddCategory ? 12 : 0 }}>
                                        {categories.map(cat => {
                                            const active = form.category === cat;
                                            return (
                                                <button
                                                    key={cat}
                                                    type="button"
                                                    onClick={() => setForm(f => ({ ...f, category: active ? '' : cat }))}
                                                    style={{
                                                        border: active ? '2px solid #5137EF' : '1.5px solid #E4E4E7',
                                                        borderRadius: 20,
                                                        padding: '5px 14px',
                                                        fontSize: 12,
                                                        fontWeight: 500,
                                                        background: active ? '#F0EDFF' : '#FFFFFF',
                                                        color: active ? '#5137EF' : '#52525C',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.15s',
                                                    }}
                                                >
                                                    {cat}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Inline add-new form */}
                                {showAddCategory && (
                                    <div style={{ border: '1px solid #E4E4E7', borderRadius: 10, padding: '14px 16px', background: '#FAFAFA' }}>
                                        <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
                                            <p style={{ fontSize: 14, fontWeight: 600, color: '#0A0A0A' }}>New Category</p>
                                            <button type="button" onClick={() => { setShowAddCategory(false); setNewCategoryName(''); }} className="flex items-center justify-center hover:bg-neutral-100" style={{ width: 24, height: 24, borderRadius: 6, border: 'none', background: 'none', cursor: 'pointer' }}>
                                                <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#71717A' }}>close</span>
                                            </button>
                                        </div>
                                        <input
                                            type="text"
                                            value={newCategoryName}
                                            onChange={e => setNewCategoryName(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    if (!newCategoryName.trim()) return;
                                                    const name = newCategoryName.trim();
                                                    if (!categories.includes(name)) setCategories(p => [...p, name]);
                                                    setForm(f => ({ ...f, category: name }));
                                                    setNewCategoryName('');
                                                    setShowAddCategory(false);
                                                }
                                            }}
                                            placeholder="e.g., South Indian"
                                            style={{ ...inp, marginBottom: 12 }}
                                            autoFocus
                                        />
                                        <div className="flex items-center justify-end gap-2">
                                            <button type="button" onClick={() => { setShowAddCategory(false); setNewCategoryName(''); }} className="hover:bg-neutral-50" style={{ border: '1px solid #E4E4E7', borderRadius: 8, padding: '7px 20px', fontSize: 13, fontWeight: 500, color: '#0A0A0A', background: '#FFFFFF', cursor: 'pointer' }}>Cancel</button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (!newCategoryName.trim()) return;
                                                    const name = newCategoryName.trim();
                                                    if (!categories.includes(name)) setCategories(p => [...p, name]);
                                                    setForm(f => ({ ...f, category: name }));
                                                    setNewCategoryName('');
                                                    setShowAddCategory(false);
                                                }}
                                                className="hover:opacity-90"
                                                style={{ background: '#5137EF', borderRadius: 8, padding: '7px 20px', fontSize: 13, fontWeight: 500, color: '#FFFFFF', border: 'none', cursor: 'pointer' }}
                                            >
                                                Add
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Show selected category name when no chips visible yet */}
                                {categories.length === 0 && !showAddCategory && (
                                    <p style={{ fontSize: 12, color: '#99A1AF', marginTop: 2 }}>No categories yet — click &ldquo;+ Add New&rdquo; to create one.</p>
                                )}
                            </div>

                            {/* Description */}
                            <div style={{ marginBottom: 20 }}>
                                <label style={lbl}>
                                    {isCombo ? 'Combo Description' : 'Description'}
                                </label>
                                {isCombo && (
                                    <p style={{ fontSize: 12, color: '#71717A', marginBottom: 8 }}>
                                        This text shows on the menu card. List what's included, e.g. "250 ml Coca-Cola, 1 big fried rice, 250 g French fries"
                                    </p>
                                )}
                                <textarea
                                    value={form.description}
                                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    placeholder={isCombo ? 'e.g., 250 ml Coca-Cola, 1 big fried rice, 250 g French fries' : 'Brief description of your product...'}
                                    rows={isCombo ? 2 : 3}
                                    style={{ ...inp, resize: 'none' }}
                                />
                            </div>

                            {/* ── VARIANTS: size variants + toppings ── */}
                            {isVariants && (
                                <>
                                    <SectionRows
                                        label="Size Variants"
                                        rows={variants}
                                        onAdd={addVariant}
                                        addLabel="Add Variant"
                                        renderRow={(v) => (
                                            <div key={v.id} className="flex items-center gap-2">
                                                <input type="text" value={v.size} onChange={e => updateVariant(v.id, 'size', e.target.value)} placeholder="Size (e.g., Small)" style={{ ...inp, flex: 1 }} />
                                                <PriceInput value={v.price} onChange={val => updateVariant(v.id, 'price', val)} placeholder="0" />
                                                <DeleteBtn onClick={() => removeVariant(v.id)} disabled={variants.length === 1} />
                                            </div>
                                        )}
                                    />
                                    <SectionRows
                                        label="Add on or Toppings"
                                        rows={toppings}
                                        onAdd={addTopping}
                                        addLabel="Add Item"
                                        renderRow={(t) => (
                                            <div key={t.id} className="flex items-center gap-2">
                                                <input type="text" value={t.name} onChange={e => updateTopping(t.id, 'name', e.target.value)} placeholder="Toppings (e.g., Chocolate, jelly)" style={{ ...inp, flex: 1 }} />
                                                <PriceInput value={t.price} onChange={val => updateTopping(t.id, 'price', val)} placeholder="Price" />
                                                <DeleteBtn onClick={() => removeTopping(t.id)} disabled={toppings.length === 1} />
                                            </div>
                                        )}
                                    />
                                </>
                            )}

                            {/* ── COMBO: combo items (shown in detail popup) ── */}
                            {isCombo && (
                                <>
                                    <p style={{ fontSize: 12, color: '#71717A', marginBottom: 8, marginTop: -8 }}>
                                        Items below appear in the "What's included" detail popup when customer taps the card.
                                    </p>
                                    <SectionRows
                                        label="Combo Items"
                                        rows={comboItems}
                                        onAdd={addComboItem}
                                        addLabel="Add Item"
                                        renderRow={(c) => (
                                            <div key={c.id} className="flex items-center gap-2">
                                                <input type="text" value={c.name} onChange={e => updateComboItem(c.id, 'name', e.target.value)} placeholder="Item name (e.g., Coca-Cola 250ml)" style={{ ...inp, flex: 1 }} />
                                                <input type="number" value={c.qty} onChange={e => updateComboItem(c.id, 'qty', e.target.value)} placeholder="Qty" min="1"
                                                    style={{ ...inp, width: 60, flexShrink: 0, textAlign: 'center' }} />
                                                <DeleteBtn onClick={() => removeComboItem(c.id)} disabled={comboItems.length === 1} />
                                            </div>
                                        )}
                                    />
                                </>
                            )}

                            {/* ── PRICE FIELDS: common for all types ── */}
                            <PriceFields form={form} setForm={setForm} inp={inp} lbl={lbl} />

                            {/* Available for Orders */}
                            <div className="flex items-center justify-between" style={{ padding: '14px 16px', border: '1px solid #E4E4E7', borderRadius: 10, background: '#FAFAFA' }}>
                                <div>
                                    <p style={{ fontSize: 14, fontWeight: 600, color: '#0A0A0A' }}>Available for Orders</p>
                                    <p style={{ fontSize: 12, color: '#71717A', marginTop: 2 }}>Make this product available to customers</p>
                                </div>
                                <button type="button" onClick={() => setForm(f => ({ ...f, available: !f.available }))}
                                    style={{ position: 'relative', display: 'flex', alignItems: 'center', width: 43, height: 24, borderRadius: 9999, background: form.available ? '#00A63E' : '#D4D4D8', border: 'none', cursor: 'pointer', transition: 'background 0.2s', padding: 0, flexShrink: 0 }}
                                >
                                    <span style={{ position: 'absolute', top: 3, left: form.available ? 22 : 3, width: 18, height: 18, borderRadius: '50%', background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
                                </button>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3" style={{ padding: '16px 24px', borderTop: '1px solid #E4E4E7', flexShrink: 0 }}>
                            <button onClick={closeDrawer} className="hover:bg-neutral-50 transition-colors" style={{ border: '1px solid #E4E4E7', borderRadius: 8, padding: '10px 24px', fontSize: 14, fontWeight: 500, color: '#0A0A0A', background: '#FFFFFF', cursor: 'pointer' }}>Cancel</button>
                            <button onClick={handleSaveProduct} disabled={saving} className="hover:opacity-90 transition-opacity" style={{ background: '#5137EF', borderRadius: 8, padding: '10px 24px', fontSize: 14, fontWeight: 500, color: '#FFFFFF', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                                {saving ? (
                                    <span className="flex items-center gap-2">
                                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                        {editingProduct ? 'Saving…' : 'Adding…'}
                                    </span>
                                ) : editingProduct ? 'Save Changes' : 'Add Product'}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
