import React from 'react';

type SiteType = 'Shop' | 'Menu';

interface TypeSelectorProps {
    handleSelectType: (type: SiteType) => void;
}

export default function TypeSelector({ handleSelectType }: TypeSelectorProps) {
    return (
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
    );
}
