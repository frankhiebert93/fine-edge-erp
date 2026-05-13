import Link from 'next/link';

export default function TopNav({ activeTab }: { activeTab: 'machinery' | 'rentals' }) {
    return (
        <div className="bg-black text-gray-400 text-sm font-extrabold tracking-wide print:hidden">
            <div className="max-w-6xl mx-auto flex justify-start items-end pt-3 px-6 gap-2">
                <Link
                    href="/"
                    className={`px-8 py-3 rounded-t-lg transition-all duration-300 ${activeTab === 'machinery'
                            ? 'bg-gray-900 text-white border-t-4 border-blue-600'
                            : 'hover:bg-gray-800 hover:text-white border-t-4 border-transparent'
                        }`}
                >
                    🏗️ BUY MACHINERY
                </Link>
                <Link
                    href="/rentals"
                    className={`px-8 py-3 rounded-t-lg transition-all duration-300 ${activeTab === 'rentals'
                            ? 'bg-gray-900 text-white border-t-4 border-orange-500'
                            : 'hover:bg-gray-800 hover:text-white border-t-4 border-transparent'
                        }`}
                >
                    🚜 RENT EQUIPMENT
                </Link>
            </div>
        </div>
    );
}