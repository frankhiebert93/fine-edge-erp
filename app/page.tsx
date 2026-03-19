"use client";
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Storefront() {
  const [machines, setMachines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // --- REPLACE WITH YOUR ACTUAL WHATSAPP NUMBER ---
  const WHATSAPP_NUMBER = "526251191400"; 

  useEffect(() => {
    fetchReadyMachines();
  }, []);

  async function fetchReadyMachines() {
    const { data, error } = await supabase
      .from('inventory')
      .select('id, machine_name, serial_number, image_url')
      .eq('status', 'Ready')
      .order('machine_name', { ascending: true });
      
    if (!error) setMachines(data || []);
    setLoading(false);
  }

  const filteredMachines = machines.filter(m => 
    m.machine_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.serial_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      
      {/* HERO SECTION */}
      {/* To add a background image later, add: style={{ backgroundImage: "url('YOUR_IMAGE_LINK')", backgroundSize: 'cover', backgroundPosition: 'center' }} */}
      <header className="bg-gray-900 text-white border-b-8 border-blue-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-50"></div> {/* Dark overlay for future images */}
        <div className="relative max-w-6xl mx-auto px-6 py-24 text-center">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-4 uppercase text-transparent bg-clip-text bg-gradient-to-r from-gray-100 to-gray-400">
            Fine Edge Machinery
          </h1>
          <p className="text-xl md:text-2xl text-blue-400 font-bold tracking-widest uppercase mb-10">
            Certified Refurbished Industrial Equipment
          </p>
          <a href="#inventory" className="inline-block bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-lg py-4 px-10 rounded shadow-2xl transition transform hover:-translate-y-1 hover:scale-105">
            View Ready Inventory
          </a>
        </div>
      </header>

      {/* TRUST BADGES SECTION */}
      <div className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="p-4">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2 uppercase">Rigorous Inspection</h3>
              <p className="text-gray-600">Every machine undergoes a strict multi-point diagnostic check before it ever hits our floor.</p>
            </div>
            <div className="p-4 border-t md:border-t-0 md:border-l md:border-r border-gray-200">
              <div className="text-4xl mb-4">⚙️</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2 uppercase">Expert Refurbishment</h3>
              <p className="text-gray-600">Rebuilt to heavy-duty certified welding and fabrication standards to guarantee deployment readiness.</p>
            </div>
            <div className="p-4">
              <div className="text-4xl mb-4">📍</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2 uppercase">Local & Reliable</h3>
              <p className="text-gray-600">Based in Cuauhtémoc, Chihuahua. We provide transparent pricing and reliable freight solutions.</p>
            </div>
          </div>
        </div>
      </div>

      {/* INVENTORY SECTION */}
      <main id="inventory" className="max-w-6xl mx-auto px-6 py-16">
        
        {/* Search Bar & Title */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div>
            <h2 className="text-3xl font-extrabold text-gray-800">Ready to Ship</h2>
            <p className="text-gray-500 font-semibold">{filteredMachines.length} Machines Available</p>
          </div>
          <div className="mt-4 md:mt-0 w-full md:w-auto">
            <input 
              type="text" 
              placeholder="🔍 Search for a machine or S/N..." 
              className="w-full md:w-80 p-3 border border-gray-300 rounded text-black shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="text-center py-20 text-gray-500 font-bold text-xl animate-pulse">
            Loading live inventory from shop floor...
          </div>
        ) : filteredMachines.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-lg border border-gray-200 shadow-sm">
            <h3 className="text-2xl font-bold text-gray-700 mb-2">No matches found.</h3>
            <p className="text-gray-500">We might be refurbishing what you need right now. Reach out to ask!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredMachines.map((machine) => {
              // Pre-fill the WhatsApp message and encode it for URLs
              const whatsappMessage = encodeURIComponent(`Hola, me interesa la máquina: ${machine.machine_name} (S/N: ${machine.serial_number}). ¿Me puedes dar precio con envío?`);
              const whatsappLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMessage}`;

              return (
                <div key={machine.id} className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition duration-300 flex flex-col border border-gray-200 group">
                  {/* MACHINE IMAGE */}
                  <div className="h-64 bg-gray-200 relative overflow-hidden">
                    {machine.image_url ? (
                      <img src={machine.image_url} alt={machine.machine_name} className="w-full h-full object-cover transform group-hover:scale-105 transition duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold">
                        No Photo Available
                      </div>
                    )}
                    <div className="absolute top-4 right-4 bg-green-600 text-white text-xs font-bold px-3 py-1 rounded shadow-md border border-green-500 tracking-wide">
                      IN STOCK
                    </div>
                  </div>

                  {/* MACHINE DETAILS */}
                  <div className="p-6 flex-grow flex flex-col">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2 leading-tight">{machine.machine_name}</h3>
                    <p className="text-sm text-gray-600 font-mono bg-gray-100 self-start px-3 py-1 rounded mb-4 border border-gray-300 shadow-inner">
                      S/N: {machine.serial_number}
                    </p>
                    
                    <ul className="text-sm text-gray-600 mb-8 flex-grow space-y-2">
                      <li className="flex items-center gap-2 text-green-700">✓ <span className="font-semibold text-gray-700">Multi-point inspection passed</span></li>
                      <li className="flex items-center gap-2 text-green-700">✓ <span className="font-semibold text-gray-700">Fully refurbished & tested</span></li>
                      <li className="flex items-center gap-2 text-green-700">✓ <span className="font-semibold text-gray-700">Ready for immediate deployment</span></li>
                    </ul>

                    {/* WHATSAPP CTA BUTTON */}
                    <a 
                      href={whatsappLink} 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full text-center bg-green-600 hover:bg-green-500 text-white font-extrabold text-lg py-3 rounded shadow-md transition transform hover:-translate-y-1 flex items-center justify-center gap-2"
                    >
                      <span>💬</span> Request Quote via WhatsApp
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="bg-gray-900 text-gray-400 py-12 text-center border-t-4 border-gray-800">
        <h2 className="font-extrabold text-2xl text-white mb-2 uppercase tracking-wide">Fine Edge Machinery</h2>
        <p className="text-sm mb-4">Cuauhtémoc, Chihuahua, Mexico</p>
        <div className="flex justify-center gap-6 text-sm mb-6">
          <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer" className="text-green-400 hover:text-green-300 transition font-bold">
            WhatsApp Us
          </a>
          <a href="mailto:fineedgemachines@gmail.com" className="text-blue-400 hover:text-blue-300 transition font-bold">
            fineedgemachines@gmail.com
          </a>
        </div>
        <p className="text-xs text-gray-600">&copy; {new Date().getFullYear()} Fine Edge Machinery. All rights reserved.</p>
      </footer>
    </div>
  );
}
