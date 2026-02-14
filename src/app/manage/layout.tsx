import type { Metadata } from 'next';
import ManageLayoutClient from '@/components/ManageLayoutClient';

export const metadata: Metadata = {
    title: 'Dashboard - Voice to Website',
    description: 'Manage your shop and website',
};

export default function ManageLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ManageLayoutClient>
            {children}
        </ManageLayoutClient>
    );
}
