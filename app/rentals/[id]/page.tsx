"use client";
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import TopNav from '../../../components/TopNav';

export default function EquipmentDetail({ params }: { params: { id: string } }) {
    const [equipment, setEquipment] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // --- YOUR WHATSAPP NUMBER ---
    const WHATSAPP_NUMBER = "526251191400";

    useEffect(() => {
        async function fetchEquipment() {
            const { data, error } = await supabase
                .from('rental_fleet')
                .select('*')
                .eq('id', params.id)
                .single();

            if (!error && data) {
                setEquipment(data);
            }
            setLoading(false);
        }
        fetchEquipment();
    }, [params.id]);

    if (loading) {
        return <div className="min-h-screen bg-gray-100 flex items-center justify-center font-bold text-xl text-gray-500 animate-pulse">Loading Equipment Details...</div>;
    }

    if (!equipment) {
        return (
            <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
                <h1 className="text-3xl font-bold text-gray-800 mb-4">Equipment Not Found</h1>
                <a href="/rentals" className="text-orange-600 font-bold hover:underline">← Back to Fleet</a>
            </div>
        );
    }

    const isAvailable = equipment.status === 'Available';
    // PRE-FILLED MESSAGE WITH THE SPECIFIC MACHINE SCANNED!
    const whatsappMessage = encodeURIComponent(`Hola, acabo de escanear el código QR del ${equipment.equipment_name} (S/N: ${equipment.serial_number || 'N/A'}). ¿Tienen disponibilidad?`);
    const whatsappLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMessage}`;
    const formatMXN = (amount: any) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount || 0);

    return (
        <div className="min-h-screen bg-gray-100 font-sans flex flex-col">
            <TopNav activeTab="rentals" />

            <main className="max-w-4xl mx-auto px-6 py-12 w-full flex-grow">
                <a href="/rentals" className="text-gray-500 font-bold hover:text-orange-600 mb-6 inline-block transition">← Back to Fleet</a>

                <div className="bg-white rounded-xl shadow-xl overflow-hidden border-t-8 border-orange-500 flex flex-col md:flex-row">
                    {/* PHOTO SECTION */}
                    <div className="md:w-1/2 bg-gray-200 relative min-h-[300px]">
                        {equipment.image_url ? (
                            <img src={equipment.image_url} alt={equipment.equipment_name} className="w-full h-full object-cover absolute inset-0" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold absolute inset-0 bg-gray-100">No Photo</div>
                        )}
                        <div className={`absolute top-4 left-4 text-white text-xs font-extrabold px-3 py-1 rounded shadow-md tracking-wide ${isAvailable ? 'bg-green-600 border border-green-500' : 'bg-red-600 border border-red-500'}`}>
                            {isAvailable ? 'AVAILABLE FOR RENT' : 'CURRENTLY RENTED - INQUIRE ANYWAY'}
                        </div>
                    </div>

                    {/* DETAILS SECTION */}
                    <div className="md:w-1/2 p-8 flex flex-col">
                        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">{equipment.equipment_name}</h1>
                        <p className="text-sm text-gray-600 font-mono bg-gray-100 self-start px-3 py-1 rounded border border-gray-300 shadow-inner mb-6">
                            S/N: {equipment.serial_number || 'N/A'}
                        </p>

                        {equipment.description && (
                            <div className="mb-6">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Specifications</h3>
                                <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">{equipment.description}</p>
                            </div>
                        )}

                        <div className="mt-auto mb-8 bg-orange-50 border border-orange-200 rounded-lg p-5 shadow-sm">
                            <div className="flex justify-between items-center border-b border-orange-200 pb-3 mb-3">
                                <span className="text-gray-600 font-bold text-sm uppercase tracking-wide">Daily Rate</span>
                                <span className="text-orange-700 font-extrabold text-2xl">{formatMXN(equipment.daily_rate)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600 font-bold text-sm uppercase tracking-wide">Weekly Rate</span>
                                <span className="text-orange-700 font-extrabold text-2xl">{formatMXN(equipment.weekly_rate)}</span>
                            </div>
                        </div>

                        <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="block w-full text-center bg-green-600 hover:bg-green-500 text-white font-extrabold text-xl py-4 rounded-lg shadow-lg transition transform hover:-translate-y-1">
                            💬 Request via WhatsApp
                        </a>
                    </div>
                </div>
            </main>
        </div>
    );
}