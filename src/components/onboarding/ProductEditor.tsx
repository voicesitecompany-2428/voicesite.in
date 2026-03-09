import React from 'react';

interface Product {
    name: string;
    price: string;
    desc: string;
    image_url: string;
}

interface ProductEditorProps {
    labels: any;
    products: Product[];
    setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
    currentProduct: Product;
    setCurrentProduct: React.Dispatch<React.SetStateAction<Product>>;
    fileInputRef: React.RefObject<HTMLInputElement>;
    productCameraInputRef: React.RefObject<HTMLInputElement>;
    handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
    handleAddProduct: () => void;
    handleSaveAndPublish: () => Promise<void>;
    isSaving: boolean;
    onBack: () => void;
}

export default function ProductEditor({
    labels,
    products,
    setProducts,
    currentProduct,
    setCurrentProduct,
    fileInputRef,
    productCameraInputRef,
    handleImageUpload,
    handleAddProduct,
    handleSaveAndPublish,
    isSaving,
    onBack
}: ProductEditorProps) {
    return (
        <div className="flex flex-col items-center w-full">
            <div className="w-full flex items-center justify-between mb-6">
                <button onClick={onBack} className="text-gray-500 hover:text-primary transition-colors flex items-center gap-1 text-sm font-medium">
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
                        <input
                            type="file"
                            ref={productCameraInputRef}
                            onChange={handleImageUpload}
                            className="hidden"
                            accept="image/*"
                            capture="environment"
                        />
                    </div>
                    <div className="flex justify-center mt-3">
                        <button
                            onClick={() => productCameraInputRef.current?.click()}
                            className="px-4 py-2 bg-blue-50 text-primary font-bold rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2 text-sm"
                        >
                            <span className="material-symbols-outlined text-lg">photo_camera</span> Take Photo
                        </button>
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
    );
}
