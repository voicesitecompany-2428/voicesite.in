/** Plain-language messages for the number-change flow. Client-safe. */
export function friendlyPhoneChangeError(code: string): string {
    switch (code) {
        case 'auth/credential-already-in-use':
        case 'auth/account-exists-with-different-credential':
            return 'This number already has a vsite account. Use a different number.';
        case 'auth/requires-recent-login':
            return 'For your safety, please sign out and sign in again, then change your number.';
        case 'auth/invalid-verification-code':
            return 'Incorrect OTP. Please try again.';
        case 'auth/code-expired':
            return 'OTP has expired. Please request a new one.';
        case 'auth/too-many-requests':
            return 'Too many attempts. Please wait a few minutes and try again.';
        case 'auth/invalid-phone-number':
            return 'Invalid phone number. Please check and try again.';
        case 'auth/network-request-failed':
            return 'Network error. Please check your connection.';
        default:
            return 'Something went wrong. Please try again.';
    }
}
