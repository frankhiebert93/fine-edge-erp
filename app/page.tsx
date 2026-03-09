"use client";
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const COLUMNS = ['Intake', 'Refurbishing', 'Ready', 'Sold'];

export default function ERPPortal() {
  const [activeTab, setActiveTab] = useState('kanban'); 
  const [searchTerm, setSearchTerm] = useState('');

  // --- STATE: MACHINERY ---
  const [machines, setMachines] = useState<any[]>([]);  
  const [isAdding, setIsAdding] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<any>(null);
  const [specSheetMachine, setSpecSheetMachine] = useState<any>(null); 

  // Add & Edit Forms (Machinery)
  const [formData, setFormData] = useState({ machine_name: '', serial_number: '', purchase_price: '', purchase_iva: '', shipping_in_cost: '', import_fee: '' });
  const [editingMachine, setEditingMachine] = useState<any>(null);
  const [editFormData, setEditFormData] = useState<any>({ machine_name: '', serial_number: '', purchase_price: '', purchase_iva: '', shipping_in_cost: '', import_fee: '' });
  
  const [repairForm, setRepairForm] = useState({ item_description: '', part_cost: '', labor_hours: '', invoice_id: '' });
  const [imageFile, setImageFile] = useState<any>(null);
  const [pedimentoFile, setPedimentoFile] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);

  // --- STATE: SELLING A MACHINE ---
  const [sellingMachine, setSellingMachine] = useState<any>(null);
  const [sellForm, setSellForm] = useState({ sale_price: '', sale_iva: '' });
  const [saleInvoiceFile, setSaleInvoiceFile] = useState<any>(null);

  // --- STATE: INVOICES & PROVIDERS ---
  const [providers, setProviders] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isAddingProvider, setIsAddingProvider] = useState(false);
  const [isAddingInvoice, setIsAddingInvoice] = useState(false);
  const [providerForm, setProviderForm] = useState({ name: '', contact_info: '', notes: '' });
  
  // Updated Invoice State with no_factura toggle
  const [invoiceForm, setInvoiceForm] = useState({ provider_id: '', invoice_number: '', total_amount: '', iva_amount: '', invoice_date: '', notes: '', no_factura: false });
  const [invoiceFile, setInvoiceFile] = useState<any>(null);
  const [isUploadingInvoice, setIsUploadingInvoice] = useState(false);

  // Edit Forms (Invoices)
  const [editingInvoice, setEditingInvoice] = useState<any>(null);
  const [editInvoiceForm, setEditInvoiceForm] = useState<any>({ provider_id: '', invoice_number: '', total_amount: '', iva_amount: '', invoice_date: '', notes: '', no_factura: false });

  useEffect(() => {
    fetchInventory();
    fetchProvidersAndInvoices();
  }, []);

  async function fetchInventory() {
    const { data, error } = await supabase.from('inventory')
      .select('*, repair_logs(*, parts_invoices(invoice_number, file_url, providers(name)))')
      .order('date_acquired', { ascending: false });
    if (!error) setMachines(data || []);
  }

  async function fetchProvidersAndInvoices() {
    const { data: provData } = await supabase.from('providers').select('*').order('name');
    if (provData) setProviders(provData);
    const { data: invData } = await supabase.from('parts_invoices').select('*, providers(name)').order('invoice_date', { ascending: false });
    if (invData) setInvoices(invData);
  }

  // --- CALCULATIONS & METRICS ---
  const calculateTotalCost = (machine: any) => {
    return Number(machine.purchase_price) + 
           Number(machine.shipping_in_cost) + 
           Number(machine.import_fee || 0) + 
           (machine.repair_logs?.reduce((sum: any, log: any) => sum + Number(log.part_cost), 0) || 0);
  };
  const formatMXN = (amount: any) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);

  // Dashboard Math
  const inShopMachines = machines.filter((m: any) => m.status !== 'Sold');
  const soldMachines = machines.filter((m: any) => m.status === 'Sold');
  
  const currentInventoryValue = inShopMachines.reduce((total: any, m: any) => total + calculateTotalCost(m), 0);
  const totalInvoicesValue = invoices.reduce((total: any, inv: any) => total + Number(inv.total_amount), 0);
  const netProfit = soldMachines.reduce((total: any, m: any) => total + (Number(m.sale_price) - calculateTotalCost(m)), 0);

  const totalIvaPaid = machines.reduce((sum: any, m: any) => sum + Number(m.purchase_iva || 0), 0) + 
                       invoices.reduce((sum: any, inv: any) => sum + Number(inv.iva_amount || 0), 0);
  const totalIvaCollected = soldMachines.reduce((sum: any, m: any) => sum + Number(m.sale_iva || 0), 0);
  const netIva = totalIvaCollected - totalIvaPaid;

  const filteredMachines = machines.filter((machine: any) => 
    machine.machine_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    machine.serial_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- EXPORT TO EXCEL/CSV LOGIC ---
  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map((row: any) => 
      Object.values(row).map((val: any) => {
        if (val === null || val === undefined) return '""';
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(',')
    );
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
  };

  const exportMachines = () => {
    const formattedData = machines.map((m: any) => ({
      Machine_Name: m.machine_name,
      Serial_Number: m.serial_number,
      Status: m.status,
      Purchase_Price: m.purchase_price,
      Purchase_IVA: m.purchase_iva,
      Shipping_Cost: m.shipping_in_cost,
      Import_Fee: m.import_fee,
      Total_Invested: calculateTotalCost(m),
      Sale_Price: m.sale_price,
      Sale_IVA: m.sale_iva,
      Date_Acquired: m.date_acquired ? m.date_acquired.split('T')[0] : ''
    }));
    exportToCSV(formattedData, `FineEdge_Machines_${new Date().toISOString().split('T')[0]}`);
  };

  const exportInvoices = () => {
    const formattedData = invoices.map((inv: any) => ({
      Date: inv.invoice_date,
      Provider: inv.providers?.name || 'Unknown',
      Invoice_Number: inv.invoice_number,
      Total_Amount: inv.total_amount,
      IVA_Paid: inv.iva_amount,
      Notes: inv.notes
    }));
    exportToCSV(formattedData, `FineEdge_Invoices_${new Date().toISOString().split('T')[0]}`);
  };

  // --- KANBAN & SALES LOGIC ---
  const handleDragStart = (e: any, machineId: any) => e.dataTransfer.setData('machineId', machineId);
  const handleDragOver = (e: any) => e.preventDefault();
  
  const handleDrop = async (e: any, newStatus: any) => {
    e.preventDefault();
    const machineId = e.dataTransfer.getData('machineId');
    if (newStatus === 'Sold') {
      const machine = machines.find((m: any) => m.id === machineId);
      setSellingMachine(machine);
      return; 
    }
    setMachines((prev: any[]) => prev.map((m: any) => m.id === machineId ? { ...m, status: newStatus, sale_price: 0, sale_iva: 0 } : m));
    await supabase.from('inventory').update({ status: newStatus, sale_price: 0, sale_iva: 0 }).eq('id', machineId);
  };

  async function handleSellMachine(e: any) {
    e.preventDefault();
    setIsUploading(true);
    let saleInvoiceUrl = sellingMachine.sale_invoice_url;

    if (saleInvoiceFile) {
      const fileName = `sale-${Date.now()}-${saleInvoiceFile.name}`;
      const { error } = await supabase.storage.from('machine-docs').upload(fileName, saleInvoiceFile);
      if (!error) saleInvoiceUrl = supabase.storage.from('machine-docs').getPublicUrl(fileName).data.publicUrl;
    }

    const { error } = await supabase.from('inventory').update({ 
      status: 'Sold', 
      sale_price: parseFloat(sellForm.sale_price) || 0, 
      sale_iva: parseFloat(sellForm.sale_iva) || 0,
      sale_invoice_url: saleInvoiceUrl
    }).eq('id', sellingMachine.id);

    if (!error) { 
      setSellingMachine(null); 
      setSellForm({ sale_price: '', sale_iva: '' }); 
      setSaleInvoiceFile(null);
      fetchInventory(); 
    }
    setIsUploading(false);
  }

  async function handleAddMachine(e: any) {
    e.preventDefault();
    setIsUploading(true);
    let imageUrl = null;
    let pedimentoUrl = null;

    if (imageFile) {
      const fileName = `img-${Date.now()}-${imageFile.name}`;
      const { error } = await supabase.storage.from('machine-images').upload(fileName, imageFile);
      if (!error) imageUrl = supabase.storage.from('machine-images').getPublicUrl(fileName).data.publicUrl;
    }
    
    if (pedimentoFile) {
      const fileName = `pedimento-${Date.now()}-${pedimentoFile.name}`;
      const { error } = await supabase.storage.from('machine-docs').upload(fileName, pedimentoFile);
      if (!error) pedimentoUrl = supabase.storage.from('machine-docs').getPublicUrl(fileName).data.publicUrl;
    }

    const { error } = await supabase.from('inventory').insert([{
      machine_name: formData.machine_name, serial_number: formData.serial_number,
      purchase_price: parseFloat(formData.purchase_price) || 0, purchase_iva: parseFloat(formData.purchase_iva) || 0, 
      shipping_in_cost: parseFloat(formData.shipping_in_cost) || 0, import_fee: parseFloat(formData.import_fee) || 0,
      status: 'Intake', image_url: imageUrl, pedimento_url: pedimentoUrl
    }]);

    if (!error) { 
      setIsAdding(false); 
      setFormData({ machine_name: '', serial_number: '', purchase_price: '', purchase_iva: '', shipping_in_cost: '', import_fee: '' }); 
      setImageFile(null); 
      setPedimentoFile(null);
      fetchInventory(); 
    }
    setIsUploading(false);
  }

  // --- EDIT MACHINE LOGIC ---
  function openEditModal(machine: any) {
    setEditingMachine(machine);
    setEditFormData({
      machine_name: machine.machine_name || '',
      serial_number: machine.serial_number || '',
      purchase_price: machine.purchase_price || '',
      purchase_iva: machine.purchase_iva || '',
      shipping_in_cost: machine.shipping_in_cost || '',
      import_fee: machine.import_fee || ''
    });
  }

  async function handleUpdateMachine(e: any) {
    e.preventDefault();
    setIsUploading(true);
    let pedimentoUrl = editingMachine.pedimento_url;

    if (pedimentoFile) {
      const fileName = `pedimento-${Date.now()}-${pedimentoFile.name}`;
      const { error } = await supabase.storage.from('machine-docs').upload(fileName, pedimentoFile);
      if (!error) pedimentoUrl = supabase.storage.from('machine-docs').getPublicUrl(fileName).data.publicUrl;
    }

    const { error } = await supabase.from('inventory').update({
      machine_name: editFormData.machine_name,
      serial_number: editFormData.serial_number,
      purchase_price: parseFloat(editFormData.purchase_price) || 0,
      purchase_iva: parseFloat(editFormData.purchase_iva) || 0,
      shipping_in_cost: parseFloat(editFormData.shipping_in_cost) || 0,
      import_fee: parseFloat(editFormData.import_fee) || 0,
      pedimento_url: pedimentoUrl
    }).eq('id', editingMachine.id);
    
    if (!error) {
      setEditingMachine(null);
      setPedimentoFile(null);
      fetchInventory();
    }
    setIsUploading(false);
  }

  async function handleAddRepair(e: any) {
    e.preventDefault();
    const payload: any = {
      inventory_id: selectedMachine.id, item_description: repairForm.item_description,
      part_cost: parseFloat(repairForm.part_cost) || 0, labor_hours: parseFloat(repairForm.labor_hours) || 0,
    };
    if (repairForm.invoice_id) payload.invoice_id = repairForm.invoice_id;
    await supabase.from('repair_logs').insert([payload]);
    setRepairForm({ item_description: '', part_cost: '', labor_hours: '', invoice_id: '' }); fetchInventory(); 
    const { data } = await supabase.from('inventory').select('*, repair_logs(*, parts_invoices(invoice_number, file_url, providers(name)))').eq('id', selectedMachine.id).single();
    setSelectedMachine(data);
  }

  async function handleDeleteRepair(repairId: any) {
    await supabase.from('repair_logs').delete().eq('id', repairId); fetchInventory();
    const { data } = await supabase.from('inventory').select('*, repair_logs(*, parts_invoices(invoice_number, file_url, providers(name)))').eq('id', selectedMachine.id).single();
    setSelectedMachine(data);
  }

  // --- PROVIDER & INVOICE LOGIC ---
  async function handleAddProvider(e: any) {
    e.preventDefault();
    await supabase.from('providers').insert([providerForm]);
    setIsAddingProvider(false); setProviderForm({ name: '', contact_info: '', notes: '' }); fetchProvidersAndInvoices();
  }

  async function handleAddInvoice(e: any) {
    e.preventDefault();
    setIsUploadingInvoice(true);
    let fileUrl = null;
    if (invoiceFile) {
      const fileName = `${Date.now()}-${invoiceFile.name}`;
      const { error } = await supabase.storage.from('invoices').upload(fileName, invoiceFile);
      if (!error) fileUrl = supabase.storage.from('invoices').getPublicUrl(fileName).data.publicUrl;
    }
    await supabase.from('parts_invoices').insert([{
      provider_id: invoiceForm.provider_id, 
      invoice_number: invoiceForm.no_factura ? 'Sin Factura' : invoiceForm.invoice_number,
      total_amount: parseFloat(invoiceForm.total_amount) || 0, 
      iva_amount: invoiceForm.no_factura ? 0 : (parseFloat(invoiceForm.iva_amount) || 0),
      invoice_date: invoiceForm.invoice_date || new Date().toISOString().split('T')[0], 
      notes: invoiceForm.notes, 
      file_url: fileUrl
    }]);
    setIsAddingInvoice(false); 
    setInvoiceForm({ provider_id: '', invoice_number: '', total_amount: '', iva_amount: '', invoice_date: '', notes: '', no_factura: false }); 
    setInvoiceFile(null); 
    fetchProvidersAndInvoices();
    setIsUploadingInvoice(false);
  }

  function openEditInvoiceModal(invoice: any) {
    setEditingInvoice(invoice);
    const isSinFactura = invoice.invoice_number === 'Sin Factura';
    setEditInvoiceForm({
      provider_id: invoice.provider_id || '',
      invoice_number: invoice.invoice_number || '',
      total_amount: invoice.total_amount || '',
      iva_amount: invoice.iva_amount || '',
      invoice_date: invoice.invoice_date || '',
      notes: invoice.notes || '',
      no_factura: isSinFactura
    });
  }

  async function handleUpdateInvoice(e: any) {
    e.preventDefault();
    const { error } = await supabase.from('parts_invoices').update({
      provider_id: editInvoiceForm.provider_id,
      invoice_number: editInvoiceForm.no_factura ? 'Sin Factura' : editInvoiceForm.invoice_number,
      total_amount: parseFloat(editInvoiceForm.total_amount) || 0,
      iva_amount: editInvoiceForm.no_factura ? 0 : (parseFloat(editInvoiceForm.iva_amount) || 0),
      invoice_date: editInvoiceForm.invoice_date,
      notes: editInvoiceForm.notes
    }).eq('id', editingInvoice.id);
    
    if (!error) {
      setEditingInvoice(null);
      fetchProvidersAndInvoices();
    }
  }

  const calculateIva = (amount: any) => (parseFloat(amount) * 0.16).toFixed(2);

  return (
    <>
      <div className={`min-h-screen bg-gray-100 p-8 ${specSheetMachine ? 'print:hidden hidden' : ''}`}>
        
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Fine Edge Machines - ERP</h1>
        </div>

        {/* DASHBOARD METRICS */}
        <div className="flex flex-wrap gap-6 mb-8">
          <div className="flex-1 min-w-[200px] bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
            <h3 className="text-gray-500 text-sm font-bold uppercase tracking-wide mb-1">Active Shop Machines</h3>
            <p className="text-3xl font-bold text-gray-800">{inShopMachines.length}</p>
          </div>
          <div className="flex-1 min-w-[200px] bg-white p-6 rounded-lg shadow border-l-4 border-orange-500">
            <h3 className="text-gray-500 text-sm font-bold uppercase tracking-wide mb-1">Current Inventory Value</h3>
            <p className="text-3xl font-bold text-orange-600">{formatMXN(currentInventoryValue)}</p>
          </div>
          <div className="flex-1 min-w-[200px] bg-white p-6 rounded-lg shadow border-l-4 border-gray-400">
            <h3 className="text-gray-500 text-sm font-bold uppercase tracking-wide mb-1">Total Expenses</h3>
            <p className="text-3xl font-bold text-gray-600">{formatMXN(totalInvoicesValue)}</p>
          </div>
          <div className={`flex-1 min-w-[200px] bg-white p-6 rounded-lg shadow border-l-4 ${netIva > 0 ? 'border-red-500' : 'border-teal-500'}`}>
            <h3 className="text-gray-500 text-sm font-bold uppercase tracking-wide mb-1">Net IVA Balance</h3>
            <p className={`text-3xl font-bold ${netIva > 0 ? 'text-red-600' : 'text-teal-600'}`}>{formatMXN(netIva)}</p>
            <p className="text-xs text-gray-400 mt-1">{netIva > 0 ? 'You owe SAT' : 'Balance in favor'}</p>
          </div>
          <div className={`flex-1 min-w-[200px] bg-white p-6 rounded-lg shadow border-l-4 ${netProfit >= 0 ? 'border-green-500' : 'border-red-500'}`}>
            <h3 className="text-gray-500 text-sm font-bold uppercase tracking-wide mb-1">Realized Profit/Loss</h3>
            <p className={`text-3xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatMXN(netProfit)}</p>
            <p className="text-xs text-gray-400 mt-1">From sold machines</p>
          </div>
        </div>

        {/* TABS & SEARCH */}
        <div className="flex justify-between items-end mb-8 border-b pb-4">
          <div className="flex gap-4">
            <button onClick={() => setActiveTab('kanban')} className={`px-6 py-2 rounded font-bold transition ${activeTab === 'kanban' ? 'bg-blue-600 text-white shadow' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>Machinery Board</button>
            <button onClick={() => setActiveTab('invoices')} className={`px-6 py-2 rounded font-bold transition ${activeTab === 'invoices' ? 'bg-blue-600 text-white shadow' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>Parts & Purchases</button>
          </div>
          
          {activeTab === 'kanban' && (
            <div className="flex gap-4 items-center">
              <input type="text" placeholder="🔍 Search name or S/N..." className="p-2 border border-gray-300 rounded text-black w-64 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              <button onClick={exportMachines} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-bold shadow transition">📊 Export CSV</button>
              <button onClick={() => setIsAdding(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-bold shadow transition">+ Add Machine</button>
            </div>
          )}

          {activeTab === 'invoices' && (
            <div className="flex gap-4 items-center">
              <button onClick={exportInvoices} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-bold shadow transition">📊 Export CSV</button>
            </div>
          )}
        </div>

        {/* ========================================= TAB 1: KANBAN BOARD ========================================= */}
        {activeTab === 'kanban' && (
          <div className="flex gap-6 overflow-x-auto pb-4">
            {COLUMNS.map(column => (
              <div key={column} className="bg-gray-200 p-4 rounded-lg w-80 flex-shrink-0 min-h-[500px]" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, column)}>
                <h2 className="font-bold text-lg mb-4 text-gray-700 uppercase tracking-wide border-b-2 border-gray-300 pb-2">
                  {column} ({filteredMachines.filter((m: any) => m.status === column).length})
                </h2>
                <div className="flex flex-col gap-4">
                  {filteredMachines.filter((m: any) => m.status === column).map((machine: any) => {
                    const machineProfit = Number(machine.sale_price) - calculateTotalCost(machine);
                    return (
                      <div key={machine.id} draggable onDragStart={(e) => handleDragStart(e, machine.id)} onClick={() => setSelectedMachine(machine)} className="bg-white p-4 rounded shadow cursor-grab active:cursor-grabbing border-l-4 border-blue-500 hover:shadow-lg transition transform hover:-translate-y-1">
                        {machine.image_url && <img src={machine.image_url} alt="Machine" className="w-full h-40 object-cover rounded mb-3 border" />}
                        <h3 className="font-bold text-gray-800">{machine.machine_name}</h3>
                        <p className="text-sm text-gray-500 mb-2">SN: {machine.serial_number}</p>
                        
                        {machine.status === 'Sold' && (
                           <div className="bg-gray-50 border p-2 rounded text-xs mb-2">
                             <span className="font-bold text-gray-700">Sold for:</span> {formatMXN(machine.sale_price)} <br/> 
                             <span className="font-bold text-gray-700">IVA:</span> {formatMXN(machine.sale_iva)} <br/>
                             <span className={`font-bold mt-1 block border-t pt-1 ${machineProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                               Profit: {formatMXN(machineProfit)}
                             </span>
                           </div>
                        )}

                        <div className="flex justify-between items-center text-sm font-medium text-gray-700 mt-4 border-t pt-2 border-b pb-2 mb-2">
                          <span>Total Invested:</span>
                          <span className="text-gray-800 font-bold">{formatMXN(calculateTotalCost(machine))}</span>
                        </div>

                        {/* Document Links */}
                        <div className="flex gap-2 text-xs font-bold mt-2">
                          {machine.pedimento_url && <a href={machine.pedimento_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline bg-blue-50 px-2 py-1 rounded" onClick={(e) => e.stopPropagation()}>📄 Pedimento</a>}
                          {machine.sale_invoice_url && <a href={machine.sale_invoice_url} target="_blank" rel="noreferrer" className="text-green-600 hover:underline bg-green-50 px-2 py-1 rounded" onClick={(e) => e.stopPropagation()}>🧾 Sale Invoice</a>}
                        </div>
                        
                        <div className="flex gap-2 mt-4">
                          <button onClick={(e) => { e.stopPropagation(); setSpecSheetMachine(machine); }} className="w-1/2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold py-2 rounded transition border border-gray-300">
                            📄 Spec Sheet
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); openEditModal(machine); }} className="w-1/2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold py-2 rounded transition border border-blue-200">
                            ✏️ Edit
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ========================================= TAB 2: INVOICES & PROVIDERS ========================================= */}
        {activeTab === 'invoices' && (
          <div className="bg-white p-6 rounded-lg shadow min-h-[500px]">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="text-2xl font-bold text-gray-800">Parts & Purchases</h2>
              <div className="flex gap-4">
                <button onClick={() => setIsAddingProvider(true)} className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded font-bold shadow transition">+ New Provider</button>
                <button onClick={() => setIsAddingInvoice(true)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-bold shadow transition">+ Add Purchase</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-700">
                    <th className="p-3 border-b">Date</th><th className="p-3 border-b">Provider</th><th className="p-3 border-b">Inv / Ticket #</th><th className="p-3 border-b">Total Amount</th><th className="p-3 border-b">IVA Paid</th><th className="p-3 border-b">Receipt</th><th className="p-3 border-b">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.length === 0 ? <tr><td colSpan={7} className="p-4 text-center text-gray-500">No purchases logged yet.</td></tr> : (
                    invoices.map((inv: any) => (
                      <tr key={inv.id} className="hover:bg-gray-50 border-b text-gray-800">
                        <td className="p-3">{inv.invoice_date}</td><td className="p-3 font-semibold">{inv.providers?.name || 'Unknown'}</td>
                        <td className="p-3">
                           {inv.invoice_number === 'Sin Factura' ? <span className="bg-gray-200 text-gray-600 px-2 py-1 rounded text-xs font-bold">Sin Factura</span> : inv.invoice_number}
                        </td>
                        <td className="p-3 font-bold text-gray-800">{formatMXN(inv.total_amount)}</td>
                        <td className="p-3 text-red-600">{formatMXN(inv.iva_amount)}</td>
                        <td className="p-3">{inv.file_url ? <a href={inv.file_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm font-bold">View</a> : <span className="text-gray-400 text-sm">No file</span>}</td>
                        <td className="p-3">
                          <button onClick={() => openEditInvoiceModal(inv)} className="text-blue-600 hover:text-blue-800 text-sm font-bold bg-blue-50 px-2 py-1 rounded border border-blue-200">✏️ Edit</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- ADD INVOICE MODAL --- */}
        {isAddingInvoice && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
              <h2 className="text-2xl font-bold mb-4 text-gray-800">Log Part Purchase</h2>
              <form onSubmit={handleAddInvoice} className="flex flex-col gap-4">
                
                {/* No Factura Toggle */}
                <label className="flex items-center gap-2 mb-2 p-2 bg-gray-50 border rounded cursor-pointer hover:bg-gray-100">
                  <input type="checkbox" className="w-4 h-4 text-blue-600" checked={invoiceForm.no_factura} onChange={e => {
                    const isChecked = e.target.checked;
                    setInvoiceForm({...invoiceForm, no_factura: isChecked, invoice_number: isChecked ? 'Sin Factura' : '', iva_amount: isChecked ? '0' : ''});
                  }} />
                  <span className="text-sm font-bold text-gray-700">Non-Invoice Purchase (Sin Factura)</span>
                </label>

                <select required className="w-full p-2 border rounded text-black" value={invoiceForm.provider_id} onChange={e => setInvoiceForm({...invoiceForm, provider_id: e.target.value})}>
                  <option value="">Select a provider...</option>
                  {providers.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <div className="flex gap-4">
                  <input type="text" placeholder="Invoice / Ticket #" disabled={invoiceForm.no_factura} className="p-2 w-1/2 border rounded text-black disabled:bg-gray-200 disabled:text-gray-500" value={invoiceForm.invoice_number} onChange={e => setInvoiceForm({...invoiceForm, invoice_number: e.target.value})} />
                  <input required type="date" className="p-2 w-1/2 border rounded text-black" value={invoiceForm.invoice_date} onChange={e => setInvoiceForm({...invoiceForm, invoice_date: e.target.value})} />
                </div>
                <div className="flex gap-4 items-end">
                  <div className="w-1/2">
                    <label className="block text-xs font-bold text-gray-500 uppercase">{invoiceForm.no_factura ? 'Total Paid' : 'Subtotal / Total'}</label>
                    <input required type="number" step="0.01" className="p-2 w-full border rounded text-black font-bold" value={invoiceForm.total_amount} onChange={e => setInvoiceForm({...invoiceForm, total_amount: e.target.value})} />
                  </div>
                  <div className="w-1/2">
                    <label className="flex justify-between text-xs font-bold text-gray-500 uppercase">
                      <span>IVA Paid</span>
                      {!invoiceForm.no_factura && <button type="button" tabIndex={-1} onClick={() => setInvoiceForm({...invoiceForm, iva_amount: calculateIva(invoiceForm.total_amount)})} className="text-blue-600 hover:underline">Auto 16%</button>}
                    </label>
                    <input required type="number" step="0.01" disabled={invoiceForm.no_factura} className="p-2 w-full border rounded text-black text-red-600 disabled:bg-gray-200 disabled:text-gray-500" value={invoiceForm.iva_amount} onChange={e => setInvoiceForm({...invoiceForm, iva_amount: e.target.value})} />
                  </div>
                </div>
                <textarea placeholder="Notes / Items Bought" className="p-2 border rounded text-black h-20" value={invoiceForm.notes} onChange={e => setInvoiceForm({...invoiceForm, notes: e.target.value})} />
                <input type="file" onChange={(e: any) => setInvoiceFile(e.target.files[0])} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700" />
                <div className="flex justify-end gap-2 mt-4"><button type="button" onClick={() => setIsAddingInvoice(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button><button type="submit" disabled={isUploadingInvoice} className="px-4 py-2 bg-green-600 text-white rounded font-bold">Save Purchase</button></div>
              </form>
            </div>
          </div>
        )}

        {/* --- EDIT INVOICE MODAL --- */}
        {editingInvoice && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl border-t-8 border-blue-500">
              <h2 className="text-2xl font-bold mb-4 text-gray-800">Edit Purchase</h2>
              <form onSubmit={handleUpdateInvoice} className="flex flex-col gap-4">

                {/* No Factura Toggle */}
                <label className="flex items-center gap-2 mb-2 p-2 bg-gray-50 border rounded cursor-pointer hover:bg-gray-100">
                  <input type="checkbox" className="w-4 h-4 text-blue-600" checked={editInvoiceForm.no_factura} onChange={e => {
                    const isChecked = e.target.checked;
                    setEditInvoiceForm({...editInvoiceForm, no_factura: isChecked, invoice_number: isChecked ? 'Sin Factura' : '', iva_amount: isChecked ? '0' : ''});
                  }} />
                  <span className="text-sm font-bold text-gray-700">Non-Invoice Purchase (Sin Factura)</span>
                </label>

                <select required className="w-full p-2 border rounded text-black" value={editInvoiceForm.provider_id} onChange={e => setEditInvoiceForm({...editInvoiceForm, provider_id: e.target.value})}>
                  <option value="">Select a provider...</option>
                  {providers.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <div className="flex gap-4">
                  <input type="text" placeholder="Invoice / Ticket #" disabled={editInvoiceForm.no_factura} className="p-2 w-1/2 border rounded text-black disabled:bg-gray-200 disabled:text-gray-500" value={editInvoiceForm.invoice_number} onChange={e => setEditInvoiceForm({...editInvoiceForm, invoice_number: e.target.value})} />
                  <input required type="date" className="p-2 w-1/2 border rounded text-black" value={editInvoiceForm.invoice_date} onChange={e => setEditInvoiceForm({...editInvoiceForm, invoice_date: e.target.value})} />
                </div>
                <div className="flex gap-4 items-end">
                  <div className="w-1/2">
                    <label className="block text-xs font-bold text-gray-500 uppercase">{editInvoiceForm.no_factura ? 'Total Paid' : 'Subtotal / Total'}</label>
                    <input required type="number" step="0.01" className="p-2 w-full border rounded text-black font-bold" value={editInvoiceForm.total_amount} onChange={e => setEditInvoiceForm({...editInvoiceForm, total_amount: e.target.value})} />
                  </div>
                  <div className="w-1/2">
                    <label className="flex justify-between text-xs font-bold text-gray-500 uppercase">
                      <span>IVA Paid</span>
                      {!editInvoiceForm.no_factura && <button type="button" tabIndex={-1} onClick={() => setEditInvoiceForm({...editInvoiceForm, iva_amount: calculateIva(editInvoiceForm.total_amount)})} className="text-blue-600 hover:underline">Auto 16%</button>}
                    </label>
                    <input required type="number" step="0.01" disabled={editInvoiceForm.no_factura} className="p-2 w-full border rounded text-black text-red-600 disabled:bg-gray-200 disabled:text-gray-500" value={editInvoiceForm.iva_amount} onChange={e => setEditInvoiceForm({...editInvoiceForm, iva_amount: e.target.value})} />
                  </div>
                </div>
                <textarea placeholder="Notes / Items Bought" className="p-2 border rounded text-black h-20" value={editInvoiceForm.notes} onChange={e => setEditInvoiceForm({...editInvoiceForm, notes: e.target.value})} />
                
                <div className="flex justify-end gap-2 mt-4"><button type="button" onClick={() => setEditingInvoice(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button><button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700">Update Purchase</button></div>
              </form>
            </div>
          </div>
        )}

        {/* --- ADD PROVIDER MODAL --- */}
        {isAddingProvider && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
              <h2 className="text-2xl font-bold mb-4 text-gray-800">Add New Provider</h2>
              <form onSubmit={handleAddProvider} className="flex flex-col gap-4">
                <input required type="text" placeholder="Company Name" className="p-2 border rounded text-black" value={providerForm.name} onChange={e => setProviderForm({...providerForm, name: e.target.value})} />
                <input type="text" placeholder="Contact Info" className="p-2 border rounded text-black" value={providerForm.contact_info} onChange={e => setProviderForm({...providerForm, contact_info: e.target.value})} />
                <textarea placeholder="Notes" className="p-2 border rounded text-black h-20" value={providerForm.notes} onChange={e => setProviderForm({...providerForm, notes: e.target.value})} />
                <div className="flex justify-end gap-2 mt-4"><button type="button" onClick={() => setIsAddingProvider(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button><button type="submit" className="px-4 py-2 bg-gray-800 text-white rounded font-bold hover:bg-black">Save Provider</button></div>
              </form>
            </div>
          </div>
        )}

        {/* --- SELL MACHINE MODAL --- */}
        {sellingMachine && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-xl border-t-8 border-green-500">
              <h2 className="text-2xl font-bold mb-2 text-gray-800">Sell Machine</h2>
              <p className="text-gray-600 mb-6 font-semibold">{sellingMachine.machine_name} (SN: {sellingMachine.serial_number})</p>
              <form onSubmit={handleSellMachine} className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Final Sale Price (Subtotal)</label>
                  <input required type="number" step="0.01" className="w-full p-3 border rounded text-black font-bold text-lg" value={sellForm.sale_price} onChange={e => setSellForm({...sellForm, sale_price: e.target.value})} />
                </div>
                <div>
                  <label className="flex justify-between text-sm font-bold text-gray-700 mb-1"><span>IVA Collected</span><button type="button" tabIndex={-1} onClick={() => setSellForm({...sellForm, sale_iva: calculateIva(sellForm.sale_price)})} className="text-blue-600 hover:underline">Auto 16%</button></label>
                  <input required type="number" step="0.01" className="w-full p-3 border rounded text-black text-green-700 font-bold" value={sellForm.sale_iva} onChange={e => setSellForm({...sellForm, sale_iva: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Upload Sale Invoice (Optional)</label>
                  <input type="file" onChange={(e: any) => setSaleInvoiceFile(e.target.files[0])} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700" />
                </div>
                <div className="flex justify-end gap-2 mt-4"><button type="button" onClick={() => { setSellingMachine(null); fetchInventory(); }} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button><button type="submit" disabled={isUploading} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-bold shadow">Confirm Sale</button></div>
              </form>
            </div>
          </div>
        )}

        {/* --- ADD MACHINE MODAL --- */}
        {isAdding && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
               <h2 className="text-2xl font-bold mb-4 text-gray-800">Log New Machine</h2>
               <form onSubmit={handleAddMachine} className="flex flex-col gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Machine Photo</label>
                    <input type="file" accept="image/*" onChange={(e: any) => setImageFile(e.target.files[0])} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Pedimento Document</label>
                    <input type="file" accept=".pdf,image/*" onChange={(e: any) => setPedimentoFile(e.target.files[0])} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700" />
                  </div>

                  <input required placeholder="Machine Name" className="p-2 border rounded text-black" value={formData.machine_name} onChange={e => setFormData({...formData, machine_name: e.target.value})} />
                  <input required placeholder="Serial Number" className="p-2 border rounded text-black" value={formData.serial_number} onChange={e => setFormData({...formData, serial_number: e.target.value})} />
                  
                  <div className="flex gap-4">
                     <div className="w-1/2">
                       <label className="block text-xs font-bold text-gray-500 uppercase">Purchase Price</label>
                       <input required type="number" step="0.01" className="p-2 w-full border rounded text-black" value={formData.purchase_price} onChange={e => setFormData({...formData, purchase_price: e.target.value})} />
                     </div>
                     <div className="w-1/2">
                       <label className="flex justify-between text-xs font-bold text-gray-500 uppercase">
                         <span>IVA Paid</span>
                         <button type="button" tabIndex={-1} onClick={() => setFormData({...formData, purchase_iva: calculateIva(formData.purchase_price)})} className="text-blue-600 hover:underline">Auto 16%</button>
                       </label>
                       <input required type="number" step="0.01" className="p-2 w-full border rounded text-black text-red-600" value={formData.purchase_iva} onChange={e => setFormData({...formData, purchase_iva: e.target.value})} />
                     </div>
                  </div>

                  <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase">Shipping & Import (No IVA)</label>
                     <div className="flex gap-4 mt-1">
                       <input required type="number" step="0.01" placeholder="Shipping Cost" className="p-2 w-1/2 border rounded text-black" value={formData.shipping_in_cost} onChange={e => setFormData({...formData, shipping_in_cost: e.target.value})} />
                       <input required type="number" step="0.01" placeholder="Import Fee" className="p-2 w-1/2 border rounded text-black" value={formData.import_fee} onChange={e => setFormData({...formData, import_fee: e.target.value})} />
                     </div>
                  </div>

                  <div className="flex justify-end gap-2 mt-4"><button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button><button type="submit" disabled={isUploading} className="px-4 py-2 bg-blue-600 text-white rounded font-bold">Save Machine</button></div>
               </form>
            </div>
          </div>
        )}

        {/* --- EDIT MACHINE MODAL --- */}
        {editingMachine && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl border-t-8 border-blue-500">
               <h2 className="text-2xl font-bold mb-4 text-gray-800">Edit Machine Details</h2>
               <form onSubmit={handleUpdateMachine} className="flex flex-col gap-4">
                  <input required placeholder="Machine Name" className="p-2 border rounded text-black" value={editFormData.machine_name} onChange={e => setEditFormData({...editFormData, machine_name: e.target.value})} />
                  <input required placeholder="Serial Number" className="p-2 border rounded text-black" value={editFormData.serial_number} onChange={e => setEditFormData({...editFormData, serial_number: e.target.value})} />
                  
                  <div className="flex gap-4">
                     <div className="w-1/2">
                       <label className="block text-xs font-bold text-gray-500 uppercase">Purchase Price</label>
                       <input required type="number" step="0.01" className="p-2 w-full border rounded text-black" value={editFormData.purchase_price} onChange={e => setEditFormData({...editFormData, purchase_price: e.target.value})} />
                     </div>
                     <div className="w-1/2">
                       <label className="flex justify-between text-xs font-bold text-gray-500 uppercase">
                         <span>IVA Paid</span>
                         <button type="button" tabIndex={-1} onClick={() => setEditFormData({...editFormData, purchase_iva: calculateIva(editFormData.purchase_price)})} className="text-blue-600 hover:underline">Auto 16%</button>
                       </label>
                       <input required type="number" step="0.01" className="p-2 w-full border rounded text-black text-red-600" value={editFormData.purchase_iva} onChange={e => setEditFormData({...editFormData, purchase_iva: e.target.value})} />
                     </div>
                  </div>

                  <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase">Shipping & Import (No IVA)</label>
                     <div className="flex gap-4 mt-1">
                       <input required type="number" step="0.01" placeholder="Shipping Cost" className="p-2 w-1/2 border rounded text-black" value={editFormData.shipping_in_cost} onChange={e => setEditFormData({...editFormData, shipping_in_cost: e.target.value})} />
                       <input required type="number" step="0.01" placeholder="Import Fee" className="p-2 w-1/2 border rounded text-black" value={editFormData.import_fee} onChange={e => setEditFormData({...editFormData, import_fee: e.target.value})} />
                     </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Upload/Replace Pedimento</label>
                    <input type="file" accept=".pdf,image/*" onChange={(e: any) => setPedimentoFile(e.target.files[0])} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700" />
                    {editingMachine.pedimento_url && <p className="text-xs text-blue-600 mt-1">A pedimento is currently attached.</p>}
                  </div>

                  <div className="flex justify-end gap-2 mt-4"><button type="button" onClick={() => setEditingMachine(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button><button type="submit" disabled={isUploading} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold">Update Details</button></div>
               </form>
            </div>
          </div>
        )}

        {/* --- REPAIR MANAGER MODAL --- */}
        {selectedMachine && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl shadow-xl flex flex-col max-h-[90vh]">
              <div className="flex justify-between items-start mb-4">
                <div><h2 className="text-2xl font-bold text-gray-800">{selectedMachine.machine_name}</h2><p className="text-gray-500">SN: {selectedMachine.serial_number}</p></div>
                <button onClick={() => setSelectedMachine(null)} className="text-gray-500 hover:text-red-500 text-2xl font-bold">&times;</button>
              </div>
              {selectedMachine.image_url && <img src={selectedMachine.image_url} alt="Machine" className="w-full h-48 object-cover rounded mb-4 border" />}
              <div className="bg-gray-100 p-4 rounded mb-4 flex justify-between text-lg"><span className="font-semibold text-gray-700">Total Invested Cost:</span><span className="font-bold text-orange-600">{formatMXN(calculateTotalCost(selectedMachine))}</span></div>
              <h3 className="font-bold text-gray-700 border-b pb-2 mb-4">Parts & Labor Log</h3>
              <div className="overflow-y-auto mb-6 flex-grow">
                {selectedMachine.repair_logs?.length === 0 ? <p className="text-gray-500 text-sm italic">No repairs logged yet.</p> : (
                  <ul className="flex flex-col gap-2">
                    {selectedMachine.repair_logs?.map((log: any) => (
                      <li key={log.id} className="flex justify-between items-start bg-gray-50 p-2 border rounded text-black">
                        <div className="flex flex-col">
                          <div><span className="font-semibold">{log.item_description}</span><span className="text-xs text-gray-500 ml-2">({log.labor_hours} hrs)</span></div>
                          {log.parts_invoices && <span className="text-xs text-blue-600 mt-1 flex items-center gap-1">🧾 {log.parts_invoices.providers?.name} Inv: {log.parts_invoices.invoice_number}</span>}
                        </div>
                        <div className="flex items-center gap-4"><span className="font-medium text-green-700">{formatMXN(log.part_cost)}</span><button onClick={() => handleDeleteRepair(log.id)} className="text-red-500 hover:text-red-700 text-sm font-bold">X</button></div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <form onSubmit={handleAddRepair} className="bg-blue-50 p-4 rounded border border-blue-100 flex flex-col gap-2">
                <div className="flex gap-2 w-full">
                  <input required placeholder="Fix (e.g., New Motor)" className="flex-grow p-2 border rounded text-black" value={repairForm.item_description} onChange={e => setRepairForm({...repairForm, item_description: e.target.value})} />
                  <input required type="number" step="0.01" placeholder="Cost" className="w-24 p-2 border rounded text-black" value={repairForm.part_cost} onChange={e => setRepairForm({...repairForm, part_cost: e.target.value})} />
                  <input type="number" step="0.1" placeholder="Hours" className="w-24 p-2 border rounded text-black" value={repairForm.labor_hours} onChange={e => setRepairForm({...repairForm, labor_hours: e.target.value})} />
                  <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-4 rounded font-bold">+</button>
                </div>
                <select className="w-full p-2 border rounded text-sm text-gray-700 mt-1" value={repairForm.invoice_id} onChange={e => setRepairForm({...repairForm, invoice_id: e.target.value})}>
                  <option value="">-- Optional: Link to an Invoice --</option>
                  {invoices.map((inv: any) => <option key={inv.id} value={inv.id}>{inv.providers?.name} | Inv: {inv.invoice_number}</option>)}
                </select>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* ========================================= PRINTABLE PDF SPEC SHEET ========================================= */}
      {specSheetMachine && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-[100] p-4 overflow-y-auto print:bg-white print:p-0">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl p-8 print:shadow-none print:max-w-none print:p-0">
            <div className="flex justify-between items-center mb-8 pb-4 border-b-2 border-gray-200 print:hidden">
              <h2 className="text-xl font-bold text-gray-700">Spec Sheet Preview</h2>
              <div className="flex gap-4">
                <button onClick={() => setSpecSheetMachine(null)} className="px-4 py-2 bg-gray-200 text-gray-700 font-bold rounded hover:bg-gray-300">Close</button>
                <button onClick={() => window.print()} className="px-6 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 shadow">🖨️ Save as PDF</button>
              </div>
            </div>
            <div className="mb-8 border-b-4 border-gray-900 pb-4 flex justify-between items-end">
              <div>
                <h1 className="text-5xl font-extrabold text-gray-900 tracking-tight">FINE EDGE MACHINES</h1>
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
                </div>
                <div className="bg-blue-50 border border-blue-100 p-6 rounded-lg mb-6 flex-grow">
                  <h3 className="text-lg font-bold text-blue-900 border-b border-blue-200 pb-2 mb-4">Inspection & Refurbishment Details</h3>
                  <ul className="list-disc pl-5 text-gray-800 flex flex-col gap-2">
                    <li>Comprehensive multi-point inspection passed.</li>
                    {specSheetMachine.repair_logs?.map((log: any) => <li key={log.id} className="font-semibold">{log.item_description}</li>)}
                    {(!specSheetMachine.repair_logs || specSheetMachine.repair_logs.length === 0) && <li>Factory standard maintenance and cleaning performed.</li>}
                    <li>Ready for immediate deployment.</li>
                  </ul>
                </div>
                <div className="mt-auto border-t-2 border-gray-200 pt-4">
                  <p className="font-bold text-gray-800">Contact Us:</p>
                  <p className="text-gray-600">fineedgemachines@gmail.com</p>
                  <p className="text-gray-600 italic mt-2">Pricing and freight shipping options available upon request.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
