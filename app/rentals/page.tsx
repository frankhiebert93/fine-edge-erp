"use client";
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import TopNav from '../../components/TopNav';

export default function RentalsStorefront() {
    const [rentals, setRentals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');

    // --- YOUR OFFICIAL BUSINESS WHATSAPP NUMBER ---
    const WHATSAPP_NUMBER = "526251191400";

    useEffect(() => {
        fetchRentals();
    }, []);

    async function fetchRentals() {
        // Pulls live data from your new rental_fleet table!
        const { data, error } = await supabase
            .from('rental_fleet')
            .select('*')
            .order('equipment_name', { ascending: true });

        if (!error) setRentals(data || []);
        setLoading(false);
    }

    // Auto-generate categories based on your fleet
    const dynamicCategories = ['All', ...Array.from(new Set(rentals.map(r => r.category || 'Other')))];

    const filteredRentals = rentals.filter(r => {
        const matchesSearch = (r.equipment_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (r.serial_number || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = activeCategory === 'All' || (r.category || 'Other') === activeCategory;
        return matchesSearch && matchesCategory;
    });

    const formatMXN = (amount: any) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount || 0);

    return (
        <div className="min-h-screen bg-gray-100 font-sans flex flex-col">

            {/* TOP NAVIGATION BAR - Active on Rentals */}
            <TopNav activeTab="rentals" />

            {/* HERO SECTION - Orange Theme */}
            <header className="bg-gray-900 text-white border-b-8 border-orange-500 relative overflow-hidden">
                <div className="absolute inset-0 bg-black opacity-60"></div>
                <div className="relative max-w-6xl mx-auto px-6 py-24 text-center">
                    <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-4 uppercase text-transparent bg-clip-text bg-gradient-to-r from-gray-100 to-gray-400">
                        Fine Edge Rentals
                    </h1>
                    <p className="text-xl md:text-2xl text-orange-400 font-bold tracking-widest uppercase mb-10">
                        Heavy Equipment & Tool Hire
                    </p>
                    <a href="#fleet" className="inline-block bg-orange-600 hover:bg-orange-500 text-white font-extrabold text-lg py-4 px-10 rounded shadow-2xl transition transform hover:-translate-y-1 hover:scale-105">
                        View Rental Fleet
                    </a>
                </div>
            </header>

            {/* RENTAL FLEET GRID */}
            <main id="fleet" className="max-w-6xl mx-auto px-6 py-16 flex-grow w-full">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div>
                        <h2 className="text-3xl font-extrabold text-gray-800">Available Equipment</h2>
                        <p className="text-gray-500 font-semibold">{filteredRentals.length} Units in Fleet</p>
                    </div>
                    <div className="mt-4 md:mt-0 w-full md:w-auto">
                        <input
                            type="text"
                            placeholder="🔍 Search equipment or S/N..."
                            className="w-full md:w-80 p-3 border border-gray-300 rounded text-black shadow-inner focus:outline-none focus:ring-2 focus:ring-orange-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* DYNAMIC CATEGORY BUTTONS (ORANGE) */}
                <div className="flex gap-3 overflow-x-auto pb-6 mb-4 hide-scrollbar">
                    {dynamicCategories.map((cat: any) => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`px-6 py-2 rounded-full font-bold text-sm whitespace-nowrap transition-all shadow-sm border ${activeCategory === cat
                                    ? 'bg-orange-600 text-white border-orange-700'
                                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100 hover:text-gray-900'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="text-center py-20 text-gray-500 font-bold text-xl animate-pulse">
                        Loading live fleet data...
                    </div>
                ) : filteredRentals.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-lg border border-gray-200 shadow-sm">
                        <h3 className="text-2xl font-bold text-gray-700 mb-2">No equipment found.</h3>
                        <p className="text-gray-500">Check back soon or adjust your search.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredRentals.map((rental) => {
                            const isAvailable = rental.status === 'Available';
                            const whatsappMessage = encodeURIComponent(`Hola, me interesa rentar el equipo: ${rental.equipment_name} (S/N: ${rental.serial_number}). ¿Tienen disponibilidad?`);
                            const whatsappLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMessage}`;

                            return (
                                <div key={rental.id} className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition duration-300 flex flex-col border border-gray-200 group">
                                    <div className="h-64 bg-gray-200 relative overflow-hidden">
                                        {rental.image_url ? (
                                            <img src={rental.image_url} alt={rental.equipment_name} className="w-full h-full object-cover transform group-hover:scale-105 transition duration-500" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold bg-gray-100 border-b border-gray-300">
                                                No Photo Available
                                            </div>
                                        )}

                                        {/* STATUS BADGE */}
                                        <div className={`absolute top-4 right-4 text-white text-xs font-extrabold px-3 py-1 rounded shadow-md tracking-wide ${isAvailable ? 'bg-green-600 border border-green-500' : 'bg-red-600 border border-red-500'}`}>
                                            {isAvailable ? 'AVAILABLE' : 'OUT ON RENT'}
                                        </div>

                                        {/* CATEGORY BADGE */}
                                        {rental.category && rental.category !== 'Other' && (
                                            <div className="absolute top-4 left-4 bg-gray-900 bg-opacity-80 text-white text-xs font-bold px-3 py-1 rounded tracking-wide backdrop-blur-sm">
                                                {rental.category}
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-6 flex-grow flex flex-col">
                                        <h3 className="text-2xl font-bold text-gray-900 mb-2 leading-tight">{rental.equipment_name}</h3>
                                        <p className="text-sm text-gray-600 font-mono bg-gray-100 self-start px-3 py-1 rounded mb-4 border border-gray-300 shadow-inner">
                                            S/N: {rental.serial_number || 'N/A'}
                                        </p>

                                        {rental.description && (
                                            <p className="text-sm text-gray-700 mb-4 line-clamp-2 leading-relaxed">
                                                {rental.description}
                                            </p>
                                        )}

                                        {/* RATE DISPLAY BOX */}
                                        <div className="mt-auto mb-6 bg-orange-50 border border-orange-100 rounded-lg p-4 shadow-sm">
                                            <div className="flex justify-between items-center border-b border-orange-200 pb-2 mb-2">
                                                <span className="text-gray-600 font-bold text-sm uppercase tracking-wide">Daily Rate</span>
                                                <span className="text-orange-700 font-extrabold text-lg">{formatMXN(rental.daily_rate)}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-600 font-bold text-sm uppercase tracking-wide">Weekly Rate</span>
                                                <span className="text-orange-700 font-extrabold text-lg">{formatMXN(rental.weekly_rate)}</span>
                                            </div>
                                        </div>

                                        <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="block w-full text-center bg-orange-600 hover:bg-orange-500 text-white font-extrabold text-lg py-3 rounded shadow-md transition transform hover:-translate-y-1">
                                            💬 Reserve Equipment
                                        </a>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* FOOTER */}
            <footer className="bg-gray-900 text-gray-400 py-12 text-center border-t-4 border-gray-800 mt-auto">
                <h2 className="font-extrabold text-2xl text-white mb-2 uppercase tracking-wide">Fine Edge Rentals</h2>
                <p className="text-sm mb-4">Cuauhtémoc, Chihuahua, Mexico</p>
                <div className="flex justify-center gap-6 text-sm mb-6">
                    <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300 transition font-bold">WhatsApp Us</a>
                    <a href="mailto:fineedgemachines@gmail.com" className="text-orange-400 hover:text-orange-300 transition font-bold">fineedgemachines@gmail.com</a>
                </div>
                <p className="text-xs text-gray-600">&copy; {new Date().getFullYear()} Fine Edge Rentals. All rights reserved.</p>
            </footer>
        </div>
    );
}