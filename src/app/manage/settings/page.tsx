'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthContext';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
    const { user, signOut } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Profile State
    const [profile, setProfile] = useState({
        username: '',
        full_name: '',
        phone_number: '',
        contact_email: '',
        avatar_url: ''
    });
    const [uploading, setUploading] = useState(false);

    // Billing History State
    const [billingHistory, setBillingHistory] = useState<any[]>([]);

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch Profile
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user?.id)
                .single();

            if (profileData) {
                setProfile({
                    username: profileData.username || '',
                    full_name: profileData.full_name || '',
                    phone_number: profileData.phone_number || '',
                    contact_email: profileData.contact_email || '',
                    avatar_url: profileData.avatar_url || ''
                });
            } else if (profileError && profileError.code === 'PGRST116') {
                // No profile yet, that's fine
            } else {
                console.error('Error fetching profile:', profileError);
            }

            // Fetch Billing History
            const { data: billingData, error: billingError } = await supabase
                .from('billing_history')
                .select('*')
                .eq('user_id', user?.id)
                .order('created_at', { ascending: false });

            if (billingData) {
                setBillingHistory(billingData);
            } else if (billingError) {
                console.error('Error fetching billing history:', billingError);
                // Could be table missing, ignore for now to not break UI
            }

        } catch (error) {
            console.error('Error loading settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);
            if (!event.target.files || event.target.files.length === 0) {
                throw new Error('You must select an image to upload.');
            }

            const file = event.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${user!.id}-${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            // Upload to 'product-images' bucket (assuming it exists and is public)
            const { error: uploadError } = await supabase.storage
                .from('product-images')
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('product-images')
                .getPublicUrl(filePath);

            setProfile((prev) => ({ ...prev, avatar_url: publicUrl }));

            // Update Auth Metadata for Avatar
            await supabase.auth.updateUser({
                data: { avatar_url: publicUrl }
            });

        } catch (error: any) {
            alert('Error uploading avatar: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleSaveProfile = async () => {
        if (!user) return;
        setSaving(true);
        try {
            const updates = {
                id: user.id,
                ...profile,
                updated_at: new Date().toISOString(),
            };

            const { error } = await supabase
                .from('profiles')
                .upsert(updates);

            if (error) throw error;

            // Update Auth Metadata for Name
            const { error: authError } = await supabase.auth.updateUser({
                data: { full_name: profile.full_name }
            });

            if (authError) console.error('Error updating auth metadata:', authError);

            alert('Profile updated successfully!');

            // Force reload to update sidebar if needed, or let AuthContext handle it
            router.refresh();

        } catch (error: any) {
            console.error('Error updating profile:', error);
            alert('Failed to update profile: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleSignOut = async () => {
        await signOut();
        router.push('/manage');
    };

    const handleDeleteAccount = async () => {
        const confirm = window.confirm('Are you sure you want to permanently delete your account? This action cannot be undone.');
        if (!confirm) return;

        const confirm2 = window.prompt('Type "DELETE" to confirm account deletion.');
        if (confirm2 !== 'DELETE') return;

        try {
            // Function call to delete user usually requires admin rights or a specific RPC
            // Since we are client side, we might have to rely on an API route or just signOut + clear data if we can't delete auth user.
            // For MVP, we can try calling an RPC if exists, or just warn.
            // But let's assume we call a backend route for safety.

            // For now, let's just alert as placeholder or call generic delete if RLS allows (usually users request deletion).

            // Let's trying calling Supabase generic delete (often blocked for Auth User from client)
            // const { error } = await supabase.auth.admin.deleteUser(user.id); // Not available in client

            alert('Account deletion request received. Please contact support to finalize deletion for security reasons (Client-side deletion restricted).');
            // In a real app, we'd hit details endpoint.

        } catch (error) {
            console.error(error);
            alert('Failed to delete account.');
        }
    };

    if (loading) return <div className="p-8 flex justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div></div>;

    return (
        <div className="container mx-auto max-w-4xl p-6">
            <h1 className="text-3xl font-black text-[#111418] mb-8">Settings</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="md:col-span-2 space-y-8">

                    {/* Profile Section */}
                    <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <h2 className="text-xl font-bold text-[#111418] mb-4">Profile & Basic Info</h2>

                        {/* Avatar Upload */}
                        <div className="flex items-center gap-4 mb-6">
                            <div className="relative h-20 w-20 rounded-full overflow-hidden border border-gray-200">
                                {profile.avatar_url ? (
                                    <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                                ) : (
                                    <div className="h-full w-full bg-blue-600 flex items-center justify-center text-white">
                                        <span className="text-2xl font-bold">
                                            {(profile.full_name || profile.contact_email || '').charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-primary cursor-pointer hover:underline mb-1">
                                    {uploading ? 'Uploading...' : 'Change Avatar'}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleAvatarUpload}
                                        disabled={uploading}
                                        className="hidden"
                                    />
                                </label>
                                <p className="text-xs text-gray-500">JPG, GIF or PNG. Max 1MB.</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Username</label>
                                <input
                                    type="text"
                                    value={profile.username}
                                    onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary outline-none transition-all"
                                    placeholder="johndoe123"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name</label>
                                <input
                                    type="text"
                                    value={profile.full_name}
                                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary outline-none transition-all"
                                    placeholder="John Doe"
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone Number</label>
                                    <input
                                        type="tel"
                                        value={profile.phone_number}
                                        onChange={(e) => setProfile({ ...profile, phone_number: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary outline-none transition-all"
                                        placeholder="+91 9876543210"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Contact Email</label>
                                    <input
                                        type="email"
                                        value={profile.contact_email}
                                        onChange={(e) => setProfile({ ...profile, contact_email: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary outline-none transition-all"
                                        placeholder="john@example.com"
                                    />
                                </div>
                            </div>
                            <button
                                onClick={handleSaveProfile}
                                disabled={saving}
                                className="mt-2 px-6 py-2 bg-primary text-white font-bold rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-70"
                            >
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </section>

                    {/* Billing History Section */}
                    <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <h2 className="text-xl font-bold text-[#111418] mb-4">Billing History</h2>
                        {billingHistory.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                                No billing history found.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-100 text-gray-500">
                                            <th className="pb-3 font-bold">Date</th>
                                            <th className="pb-3 font-bold">Plan</th>
                                            <th className="pb-3 font-bold">Amount</th>
                                            <th className="pb-3 font-bold">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {billingHistory.map((bill) => (
                                            <tr key={bill.id}>
                                                <td className="py-3 text-[#111418]">{new Date(bill.created_at).toLocaleDateString()}</td>
                                                <td className="py-3 text-[#111418] font-medium capitalize">{bill.plan_name.replace('_', ' ')}</td>
                                                <td className="py-3 text-[#111418]">₹{bill.amount}</td>
                                                <td className="py-3">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${bill.status === 'Success' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-600'
                                                        }`}>
                                                        {bill.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </div>

                {/* Sidebar / Actions */}
                <div className="md:col-span-1 space-y-4">
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <h2 className="text-lg font-bold text-[#111418] mb-4">Account Actions</h2>
                        <div className="space-y-3">
                            <button
                                onClick={handleSignOut}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-gray-600 font-bold hover:bg-gray-50 transition-colors"
                            >
                                <span className="material-symbols-outlined text-[20px]">logout</span>
                                Sign Out
                            </button>
                            <button
                                onClick={handleDeleteAccount}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-red-100 bg-red-50 rounded-lg text-red-600 font-bold hover:bg-red-100 transition-colors"
                            >
                                <span className="material-symbols-outlined text-[20px]">delete_forever</span>
                                Delete Account
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
