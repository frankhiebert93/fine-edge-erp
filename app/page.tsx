"use client";
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Storefront() {
  const [machines, setMachines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [specSheetMachine, setSpecSheetMachine] = useState<any>(null);

  // --- YOUR OFFICIAL BUSINESS WHATSAPP NUMBER ---
  const WHATSAPP_NUMBER = "526251191400"; 

  useEffect(() => {
    fetchReadyMachines();
  }, []);

  async function fetchReadyMachines() {
    const { data, error } = await supabase
      .from('inventory')
      .select('id, machine_name, serial_number, image_url, video_url, category')
      .eq('status', 'Ready')
      .order('machine_name', { ascending: true });
      
    if (!error) setMachines(data || []);
    setLoading(false);
  }

  // Auto-generate filter buttons based on what is actually in stock
  const dynamicCategories = ['All', ...Array.from(new Set(machines.map(m => m.category || 'Other')))];

  const filteredMachines = machines.filter(m => {
    const matchesSearch = m.machine_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          m.serial_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'All' || (m.category || 'Other') === activeCategory;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <>
      <div className={`min-h-screen bg-gray-100 font-sans ${specSheetMachine ? 'print:hidden hidden' : ''}`}>
        
        {/* HERO SECTION */}
        <header className="bg-gray-900 text-white border-b-8 border-blue-600 relative overflow-hidden">
          <div className="absolute inset-0 bg-black opacity-50"></div> 
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

        {/* CUSTOM FABRICATION BANNER */}
        <div className="bg-gray-800 text-white py-16 border-b-4 border-gray-900">
          <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center gap-8">
            <div className="md:w-2/3">
              <h2 className="text-3xl font-extrabold mb-4 uppercase text-blue-400">Custom Retrofits & Fabrication</h2>
              <p className="text-gray-300 text-lg leading-relaxed">
                Need an outfeed table, custom fixturing, or a modified frame? We don&apos;t just flip machines. Our in-house certified welding and 3D industrial drafting (SolidWorks & AutoCAD) means your machinery is customized to your exact spec before it ever hits a truck.
              </p>
            </div>
            <div className="md:w-1/3 flex justify-center md:justify-end">
              <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=Hola, me interesa una modificación/fabricación a medida para mi equipo.`} target="_blank" rel="noopener noreferrer" className="bg-transparent border-2 border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-gray-900 font-bold py-3 px-6 rounded transition">
                Discuss Custom Mods
              </a>
            </div>
          </div>
        </div>

        {/* INVENTORY SECTION */}
        <main id="inventory" className="max-w-6xl mx-auto px-6 py-16">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
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

          {/* DYNAMIC CATEGORY BUTTONS */}
          <div className="flex gap-3 overflow-x-auto pb-6 mb-4 hide-scrollbar">
            {dynamicCategories.map((cat: any) => (
              <button 
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-6 py-2 rounded-full font-bold text-sm whitespace-nowrap transition-all shadow-sm border ${
                  activeCategory === cat 
                    ? 'bg-blue-600 text-white border-blue-700' 
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

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
                const whatsappMessage = encodeURIComponent(`Hola, me interesa la máquina: ${machine.machine_name} (S/N: ${machine.serial_number}). ¿Me puedes dar precio con envío?`);
                const whatsappLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMessage}`;

                return (
                  <div key={machine.id} className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition duration-300 flex flex-col border border-gray-200 group">
                    <div className="h-64 bg-gray-200 relative overflow-hidden">
                      {machine.image_url ? (
                        <img src={machine.image_url} alt={machine.machine_name} className="w-full h-full object-cover transform group-hover:scale-105 transition duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold">No Photo Available</div>
                      )}
                      <div className="absolute top-4 right-4 bg-green-600 text-white text-xs font-bold px-3 py-1 rounded shadow-md border border-green-500 tracking-wide">
                        IN STOCK
                      </div>
                      {machine.category && machine.category !== 'Other' && (
                        <div className="absolute top-4 left-4 bg-gray-900 bg-opacity-75 text-white text-xs font-bold px-3 py-1 rounded tracking-wide backdrop-blur-sm">
                          {machine.category}
                        </div>
                      )}
                    </div>

                    <div className="p-6 flex-grow flex flex-col">
                      <h3 className="text-2xl font-bold text-gray-900 mb-2 leading-tight">{machine.machine_name}</h3>
                      <p className="text-sm text-gray-600 font-mono bg-gray-100 self-start px-3 py-1 rounded mb-4 border border-gray-300 shadow-inner">
                        S/N: {machine.serial_number}
                      </p>
                      
                      <ul className="text-sm text-gray-600 mb-6 flex-grow space-y-2">
                        <li className="flex items-center gap-2 text-green-700">✓ <span className="font-semibold text-gray-700">Multi-point inspection passed</span></li>
                        <li className="flex items-center gap-2 text-green-700">✓ <span className="font-semibold text-gray-700">Fully refurbished & tested</span></li>
                        <li className="flex items-center gap-2 text-green-700">✓ <span className="font-semibold text-gray-700">Ready for immediate deployment</span></li>
                      </ul>

                      <div className="flex flex-col gap-2 mt-auto">
                        <div className="flex gap-2">
                          <button onClick={() => setSpecSheetMachine(machine)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2 rounded border border-gray-300 transition text-sm">
                            📄 Spec Sheet
                          </button>
                          {machine.video_url && (
                            <a href={machine.video_url} target="_blank" rel="noopener noreferrer" className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold py-2 rounded transition text-sm text-center flex items-center justify-center gap-1">
                              ▶ Watch Video
                            </a>
                          )}
                        </div>
                        <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="block w-full text-center bg-green-600 hover:bg-green-500 text-white font-extrabold text-lg py-3 rounded shadow-md transition transform hover:-translate-y-1">
                          💬 Request Quote
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {/* MACHINE HUNTER SECTION */}
        <div className="bg-gray-200 border-t border-gray-300 py-16">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-3xl font-extrabold text-gray-800 mb-4">Looking for something specific?</h2>
            <p className="text-gray-600 mb-8 text-lg">Our shop floor moves fast. If you need a specific laser, press brake, or CNC that isn&apos;t listed, let our sourcing team find it for you.</p>
            <a href={`mailto:fineedgemachines@gmail.com?subject=Machine Sourcing Request&body=I am looking for:`} className="inline-block bg-gray-800 hover:bg-black text-white font-bold py-3 px-8 rounded shadow transition">
              🔍 Activate Machine Hunter
            </a>
          </div>
        </div>

        {/* FOOTER */}
        <footer className="bg-gray-900 text-gray-400 py-12 text-center border-t-4 border-gray-800">
          <h2 className="font-extrabold text-2xl text-white mb-2 uppercase tracking-wide">Fine Edge Machinery</h2>
          <p className="text-sm mb-4">Cuauhtémoc, Chihuahua, Mexico</p>
          <div className="flex justify-center gap-6 text-sm mb-6">
            <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer" className="text-green-400 hover:text-green-300 transition font-bold">WhatsApp Us</a>
            <a href="mailto:fineedgemachines@gmail.com" className="text-blue-400 hover:text-blue-300 transition font-bold">fineedgemachines@gmail.com</a>
          </div>
          <p className="text-xs text-gray-600">&copy; {new Date().getFullYear()} Fine Edge Machinery. All rights reserved.</p>
        </footer>
      </div>

      {/* ========================================= PRINTABLE PUBLIC SPEC SHEET ========================================= */}
      {specSheetMachine && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-90 flex items-center justify-center z-[100] p-4 overflow-y-auto print:bg-white print:p-0">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl p-8 print:shadow-none print:max-w-none print:p-0 relative">
            <div className="flex justify-between items-center mb-8 pb-4 border-b-2 border-gray-200 print:hidden">
              <h2 className="text-xl font-bold text-gray-700">Official Spec Sheet</h2>
              <div className="flex gap-4">
                <button onClick={() => setSpecSheetMachine(null)} className="px-4 py-2 bg-gray-200 text-gray-700 font-bold rounded hover:bg-gray-300">Close</button>
                <button onClick={() => window.print()} className="px-6 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 shadow">🖨️ Print / Save PDF</button>
              </div>
            </div>
            
            {/* PUBLIC PDF CONTENT */}
            <div className="mb-8 border-b-4 border-gray-900 pb-4 flex justify-between items-end">
              <div>
                <h1 className="text-5xl font-extrabold text-gray-900 tracking-tight">FINE EDGE MACHINERY</h1>
                <p className="text-xl text-gray-500 font-bold mt-1 tracking-widest uppercase">Certified Refurbished Equipment</p>
              </div>
            </div>
            <div className="flex flex-col md:flex-row gap-8">
              <div className="w-full md:w-1/2">
                {specSheetMachine.image_url ? <img src={specSheetMachine.image_url} alt="Machine" className="w-full h-80 object-cover rounded border border-gray-200 shadow-sm print:shadow-none" /> : <div className="w-full h-80 bg-gray-50 flex items-center justify-center rounded border-2 border-dashed border-gray-300"><span className="text-gray-400 font-semibold">No Image Available</span></div>}
              </div>
              <div className="w-full md:w-1/2 flex flex-col">
                <div className="mb-6">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">{specSheetMachine.machine_name}</h2>
                  <p className="text-xl text-gray-600 font-mono bg-gray-100 inline-block px-3 py-1 rounded">S/N: {specSheetMachine.serial_number}</p>
                  {specSheetMachine.category && specSheetMachine.category !== 'Other' && (
                    <p className="mt-2 text-sm font-bold text-blue-600 uppercase tracking-wide">{specSheetMachine.category}</p>
                  )}
                </div>
                <div className="bg-blue-50 border border-blue-100 p-6 rounded-lg mb-6 flex-grow">
                  <h3 className="text-lg font-bold text-blue-900 border-b border-blue-200 pb-2 mb-4">Inspection & Certification</h3>
                  <ul className="list-disc pl-5 text-gray-800 flex flex-col gap-2">
                    <li>Comprehensive multi-point mechanical inspection passed.</li>
                    <li>Electrical systems tested and verified.</li>
                    <li>Factory standard maintenance and deep cleaning performed.</li>
                    <li>Cleared for industrial deployment.</li>
                  </ul>
                </div>
                <div className="mt-auto border-t-2 border-gray-200 pt-4 flex justify-between items-end">
                  <div>
                    <p className="font-bold text-gray-800">Sales & Freight Inquiries:</p>
                    <p className="text-gray-600 font-mono">fineedgemachines@gmail.com</p>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <p className="text-xs text-gray-400 font-bold uppercase mb-1">Scan to WhatsApp</p>
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent('https://wa.me/' + WHATSAPP_NUMBER)}`} 
                      alt="WhatsApp QR Code" 
                      className="w-16 h-16 border border-gray-300 rounded shadow-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
