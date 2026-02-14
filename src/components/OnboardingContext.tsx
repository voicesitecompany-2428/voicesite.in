'use client';

import React, { createContext, useContext, useState } from 'react';

interface IOardingContext {
    isModalOpen: boolean;
    openModal: () => void;
    closeModal: () => void;
}

const OnboardingContext = createContext<IOardingContext>({
    isModalOpen: false,
    openModal: () => { },
    closeModal: () => { },
});

export const useOnboarding = () => useContext(OnboardingContext);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <OnboardingContext.Provider value={{ isModalOpen, openModal: () => setIsModalOpen(true), closeModal: () => setIsModalOpen(false) }}>
            {children}
        </OnboardingContext.Provider>
    );
}
