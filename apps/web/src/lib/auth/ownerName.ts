/**
 * The owner's own name, as typed at signup or on the name editor. Client-safe,
 * so the form and the server agree on what is accepted.
 *
 * A phone number is refused on purpose: the header once showed numbers that
 * had landed in `full_name`, and DashboardHeader still carries a repair for it.
 */

const MAX_NAME = 60;

export function cleanOwnerName(input: unknown): string | null {
    if (typeof input !== 'string') return null;
    const name = input.trim().replace(/\s+/g, ' ');
    if (!name || name.length > MAX_NAME) return null;
    if (/^\+?[\d\s-]{7,}$/.test(name)) return null;
    // At least one letter in any script, so Tamil names pass and "...." does not.
    if (!/\p{L}/u.test(name)) return null;
    return name;
}
