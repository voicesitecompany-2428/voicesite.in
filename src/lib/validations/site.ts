import { z } from 'zod';

export const SiteCreateSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    location: z.string().optional(),
    state: z.string().optional(),
    pincode: z.string().optional(),
    description: z.string().optional(),
    owner_name: z.string().optional(),
    contact_number: z.string().optional(),
    address: z.string().optional(),
    timing: z.string().optional(),
    established_year: z.string().optional(),
    tagline: z.string().optional(),
    image_url: z.string().url().optional().or(z.literal('')),
    whatsapp_number: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
    social_links: z.object({
        instagram: z.string().optional(),
        facebook: z.string().optional(),
        twitter: z.string().optional(),
    }).optional(),
    type: z.enum(['Shop', 'Menu']).default('Shop'),
    products: z.array(z.object({
        name: z.string().min(1, "Product name is required"),
        price: z.union([z.string(), z.number()]),
        desc: z.string().optional(),
        image_url: z.string().optional().or(z.literal('')),
    })).optional().default([]),
});

export type SiteCreateInput = z.infer<typeof SiteCreateSchema>;
