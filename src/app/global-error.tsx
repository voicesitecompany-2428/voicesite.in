'use client'; // Error boundaries must be Client Components

export default function GlobalError({
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    error: _error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        // global-error must include html and body tags
        <html>
            <body>
                <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
                    <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full text-center border-t-4 border-red-500">
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <span className="material-symbols-outlined text-red-600 text-5xl">report</span>
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900 mb-3 tracking-tight">System Error</h2>
                        <p className="text-gray-600 mb-8 leading-relaxed">
                            We encountered a critical problem loading the application. Our team has been notified.
                        </p>
                        <button
                            onClick={() => reset()}
                            className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold py-4 px-6 rounded-xl transition-all shadow-md active:scale-[0.98]"
                        >
                            Try to recover
                        </button>
                    </div>
                </div>
            </body>
        </html>
    );
}
