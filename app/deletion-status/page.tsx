export default function DeletionStatusPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-lg text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Data Deleted Successfully</h1>
                <p className="text-gray-600 mb-4">
                    Your ReplyKaro account data has been permanently deleted as per your request.
                </p>
                <p className="text-sm text-gray-500">
                    This action was completed in compliance with GDPR and data protection regulations.
                </p>
            </div>
        </div>
    );
}
