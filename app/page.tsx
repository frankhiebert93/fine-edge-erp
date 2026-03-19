"use client";
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Storefront() {
  const [machines, setMachines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReadyMachines();
  }, []);

  async function fetchReadyMachines() {
    // SECURITY: Only pulls name, SN, and photo. Hides your profit margins.
    const { data, error } = await supabase
      .from('inventory')
      .select('id, machine_name, serial_number, image_url')
      .eq('status', 'Ready')
      .order('machine_name', { ascending: true });
      
    if (!error) setMachines(data || []);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <header className="bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto px-6 py-16 text-center">
          <h1 className="text-5xl font-extrabold tracking-tight mb-4 uppercase">Fine Edge Machinery</h1>
          <p className="text-xl text-gray-400 font-medium tracking-wide uppercase mb-8">Certified Refurbished Industrial Equipment</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-16">
        <div className="flex justify-between items-end mb-10 border-b border-gray-300 pb-4">
          <h2 className="text-3xl font-bold text-gray-800">Ready to Ship</h2>
          <p className="text-gray-500 font-semibold">{machines.length} Machines Available</p>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-500 font-bold text-xl">Loading live inventory...</div>
        ) : machines.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-lg border border-gray-200 shadow-sm">
            <h3 className="text-2xl font-bold text-gray-700 mb-2">Inventory Updating</h3>
            <p className="text-gray-500">We are currently refurbishing the next batch of machinery. Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {machines.map((machine) => (
              <div key={machine.id} className="bg-white rounded-xl overflow-hidden shadow-md border border-gray-200">
                <div className="h-64 bg-gray-200 relative">
                  {machine.image_url ? (
                    <img src={machine.image_url} alt={machine.machine_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold">No Photo</div>
                  )}
                  <div className="absolute top-4 right-4 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded shadow">IN STOCK</div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{machine.machine_name}</h3>
                  <p className="text-sm text-gray-500 font-mono bg-gray-100 inline-block px-2 py-1 rounded mb-4 border border-gray-200">S/N: {machine.serial_number}</p>
                  <a href="mailto:fineedgemachines@gmail.com" className="block w-full text-center bg-gray-800 hover:bg-black text-white font-bold py-3 rounded transition">
                    Contact for Pricing
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
