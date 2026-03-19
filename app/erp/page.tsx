"use client";
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

const COLUMNS = ['Intake', 'Refurbishing', 'Ready', 'Sold'];

export default function ERPPortal() {
  const [activeTab, setActiveTab] = useState('kanban'); 
  const [searchTerm, setSearchTerm] = useState('');

  // --- SECURITY: ADMIN MODE ---
  const [isAdmin, setIsAdmin] = useState(false);

  const handleAdminToggle = () => {
    if (isAdmin) {
      setIsAdmin(false); 
    } else {
      const pin = window.prompt("Enter Admin PIN to unlock editing:");
      // CHANGE THIS PIN RIGHT HERE:
      if (pin === "6542") { 
        setIsAdmin(true);
      } else if (pin !== null) {
        alert("Incorrect PIN. View Only Mode active.");
      }
    }
  };

  // --- HELPER: FILE SANITIZER & CALENDAR ---
  const sanitizeFileName = (name: string) => name.replace(/[^a-zA-Z0-9.\-_]/g, '_');

  const handleAddToCalendar = (e: any, title: string, date: string, description: string) => {
    e.stopPropagation(); 
    if (!date) return alert("Please set a due date first!");
    const cleanDate = date.replace(/-/g, '');
    const icsContent = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nDTSTART;VALUE=DATE:${cleanDate}\nDTEND;VALUE=DATE:${cleanDate}\nSUMMARY:${title}\nDESCRIPTION:${description}\nEND:VEVENT\nEND:VCALENDAR`;
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = `${sanitizeFileName(title)}.ics`;
    link.click();
  };

  // --- STATE: MACHINERY ---
  const [machines, setMachines] = useState<any[]>([]);  
  const [isAdding, setIsAdding] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<any>(null);
  const [specSheetMachine, setSpecSheetMachine] = useState<any>(null); 

  // ADDED CATEGORY FIELD HERE
  const [formData, setFormData] = useState({ machine_name: '', serial_number: '', category: '', purchase_price: '', purchase_iva: '', shipping_in_cost: '', import_fee: '', video_url: '' });
  const [editingMachine, setEditingMachine] = useState<any>(null);
  const [editFormData, setEditFormData] = useState<any>({ machine_name: '', serial_number: '', category: '', purchase_price: '', purchase_iva: '', shipping_in_cost: '', import_fee: '', invoice_date: '', due_date: '', video_url: '' });
  
  const [repairForm, setRepairForm] = useState({ item_description: '', part_cost: '', labor_hours: '', invoice_id: '' });
  const [imageFile, setImageFile] = useState<any>(null);
  const [pedimentoFile, setPedimentoFile] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [sellingMachine, setSellingMachine] = useState<any>(null);
  const [sellForm, setSellForm] = useState({ sale_price: '', sale_iva: '', is_paid: false, invoice_date: '', due_date: '' });
  const [saleInvoiceFile, setSaleInvoiceFile] = useState<any>(null);

  // --- STATE: INVOICES & PROVIDERS ---
  const [providers, setProviders] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isAddingProvider, setIsAddingProvider] = useState(false);
  const [isAddingInvoice, setIsAddingInvoice] = useState(false);
  const [providerForm, setProviderForm] = useState({ name: '', contact_info: '', notes: '' });
  
  const [invoiceForm, setInvoiceForm] = useState({ provider_id: '', invoice_number: '', total_amount: '', iva_amount: '', invoice_date: '', due_date: '', notes: '', no_factura: false, is_paid: false });
  const [invoiceFile, setInvoiceFile] = useState<any>(null);
  const [isUploadingInvoice, setIsUploadingInvoice] = useState(false);

  const [editingInvoice, setEditingInvoice] = useState<any>(null);
  const [editInvoiceForm, setEditInvoiceForm] = useState<any>({ provider_id: '', invoice_number: '', total_amount: '', iva_amount: '', invoice_date: '', due_date: '', notes: '', no_factura: false, is_paid: false });

  // --- STATE: SAT PAYMENTS ---
  const [satPayments, setSatPayments] = useState<any[]>([]);
  const [isAddingSatPayment, setIsAddingSatPayment] = useState(false);
  const [satPaymentForm, setSatPaymentForm] = useState({ payment_date: '', amount: '', notes: '' });
  const [satReceiptFile, setSatReceiptFile] = useState<any>(null);
  const [isUploadingSat, setIsUploadingSat] = useState(false);
  
  const [editingSatPayment, setEditingSatPayment] = useState<any>(null);
  const [editSatPaymentForm, setEditSatPaymentForm] = useState<any>({ payment_date: '', amount: '', notes: '' });

  const [exchangeRate, setExchangeRate] = useState('18.00');

  // --- STATE: CASH BOX ---
  const [cashBoxLogs, setCashBoxLogs] = useState<any[]>([]);
  const [isAddingCash, setIsAddingCash] = useState(false);
  const [showCashHistory, setShowCashHistory] = useState(false);
  const [cashForm, setCashForm] = useState({ amount: '', notes: '', date: '' });

  useEffect(() => {
    fetchInventory();
    fetchProvidersAndInvoices();
    fetchSatPayments();
    fetchCashBox();
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

  async function fetchSatPayments() {
    const { data, error } = await supabase.from('iva_payments').select('*').order('payment_date', { ascending: false });
    if (!error) setSatPayments(data || []);
  }

  async function fetchCashBox() {
    const { data, error } = await supabase.from('cash_box').select('*');
    if (!error) setCashBoxLogs(data || []);
  }

  // --- CALCULATIONS & METRICS ---
  const calculateTotalCost = (machine: any) => {
    return Number(machine.purchase_price) + 
           Number(machine.shipping_in_cost) + 
           Number(machine.import_fee || 0) + 
           (machine.repair_logs?.reduce((sum: any, log: any) => sum + Number(log.part_cost), 0) || 0);
  };
  const formatMXN = (amount: any) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);

  const inShopMachines = machines.filter((m: any) => m.status !== 'Sold');
  const soldMachines = machines.filter((m: any) => m.status === 'Sold');
  
  const currentInventoryValue = inShopMachines.reduce((total: any, m: any) => total + calculateTotalCost(m), 0);
  const totalInvoicesValue = invoices.reduce((total: any, inv: any) => total + Number(inv.total_amount), 0); 
  const netProfit = soldMachines.reduce((total: any, m: any) => total + (Number(m.sale_price) - calculateTotalCost(m)), 0);

  const totalIvaPaid = machines.reduce((sum: any, m: any) => sum + Number(m.purchase_iva || 0), 0) + 
                       invoices.filter((inv:any) => inv.is_paid).reduce((sum: any, inv: any) => sum + Number(inv.iva_amount || 0), 0);
  const totalIvaCollected = soldMachines.filter((m:any) => m.is_paid).reduce((sum: any, m: any) => sum + Number(m.sale_iva || 0), 0);
  const grossIvaBalance = totalIvaCollected - totalIvaPaid;
  const totalIvaPaidToSat = satPayments.reduce((sum: any, p: any) => sum + Number(p.amount), 0);
  const currentIvaOwed = grossIvaBalance - totalIvaPaidToSat;

  const totalCashIn = soldMachines.filter((m:any) => m.is_paid).reduce((sum: any, m: any) => sum + Number(m.sale_price) + Number(m.sale_iva || 0), 0);
  const paidInvoicesValue = invoices.filter((inv:any) => inv.is_paid).reduce((sum: any, inv: any) => sum + Number(inv.total_amount), 0);
  const totalMachineSpend = machines.reduce((sum: any, m: any) => sum + Number(m.purchase_price) + Number(m.purchase_iva || 0) + Number(m.shipping_in_cost) + Number(m.import_fee || 0), 0);
  const unlinkedRepairsCost = machines.reduce((sum: any, m: any) => sum + (m.repair_logs?.filter((log: any) => !log.invoice_id).reduce((s: any, l: any) => s + Number(l.part_cost), 0) || 0), 0);
  const totalCashOut = totalMachineSpend + paidInvoicesValue + totalIvaPaidToSat + unlinkedRepairsCost;
  const netCashFlow = totalCashIn - totalCashOut;

  const cashBoxTotal = cashBoxLogs.reduce((sum: any, log: any) => sum + Number(log.amount), 0);

  const filteredMachines = machines.filter((machine: any) => 
    machine.machine_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    machine.serial_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- EXPORT LOGIC ---
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
      Category: m.category || 'Other',
      Serial_Number: m.serial_number,
      Status: m.status,
      Paid_By_Customer: m.is_paid ? 'Yes' : 'No',
      Invoice_Sent: m.invoice_date || '',
      Payment_Due: m.due_date || '',
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
      Is_Paid: inv.is_paid ? 'Yes' : 'No',
      Payment_Due: inv.due_date || '',
      Notes: inv.notes
    }));
    exportToCSV(formattedData, `FineEdge_Invoices_${new Date().toISOString().split('T')[0]}`);
  };

  // --- KANBAN & SALES LOGIC ---
  const handleDragStart = (e: any, machineId: any) => { if (!isAdmin) return; e.dataTransfer.setData('machineId', machineId); };
  const handleDragOver = (e: any) => { if (!isAdmin) return; e.preventDefault(); };
  
  const handleDrop = async (e: any, newStatus: any) => {
    if (!isAdmin) return;
    e.preventDefault();
    const machineId = e.dataTransfer.getData('machineId');
    if (newStatus === 'Sold') {
      const machine = machines.find((m: any) => m.id === machineId);
      setSellingMachine(machine);
      return; 
    }
    setMachines((prev: any[]) => prev.map((m: any) => m.id === machineId ? { ...m, status: newStatus, sale_price: 0, sale_iva: 0, is_paid: false, invoice_date: null, due_date: null } : m));
    await supabase.from('inventory').update({ status: newStatus, sale_price: 0, sale_iva: 0, is_paid: false, invoice_date: null, due_date: null }).eq('id', machineId);
  };

  const handleInvoiceDateChange = (e: any, target: 'sellForm' | 'invoiceForm' | 'editInvoiceForm') => {
    const invDate = e.target.value;
    let newDueDate = '';
    
    if (invDate) {
      const [year, month, day] = invDate.split('-');
      const dateObj = new Date(Number(year), Number(month) - 1, Number(day));
      dateObj.setDate(dateObj.getDate() + 30);
      const y = dateObj.getFullYear();
      const m = String(dateObj.getMonth() + 1).padStart(2, '0');
      const d = String(dateObj.getDate()).padStart(2, '0');
      newDueDate = `${y}-${m}-${d}`;
    }

    if (target === 'sellForm') setSellForm({...sellForm, invoice_date: invDate, due_date: newDueDate});
    if (target === 'invoiceForm') setInvoiceForm({...invoiceForm, invoice_date: invDate, due_date: newDueDate});
    if (target === 'editInvoiceForm') setEditInvoiceForm({...editInvoiceForm, invoice_date: invDate, due_date: newDueDate});
  };

  async function handleSellMachine(e: any) {
    e.preventDefault();
    if (!isAdmin) return;
    setIsUploading(true);
    let saleInvoiceUrl = sellingMachine.sale_invoice_url;

    if (saleInvoiceFile) {
      const fileName = `sale-${Date.now()}-${sanitizeFileName(saleInvoiceFile.name)}`;
      const { error: uploadError } = await supabase.storage.from('machine-docs').upload(fileName, saleInvoiceFile);
      if (uploadError) { alert("Invoice upload failed: " + uploadError.message); setIsUploading(false); return; }
      saleInvoiceUrl = supabase.storage.from('machine-docs').getPublicUrl(fileName).data.publicUrl;
    }

    const { error } = await supabase.from('inventory').update({ 
      status: 'Sold', sale_price: parseFloat(sellForm.sale_price) || 0, sale_iva: parseFloat(sellForm.sale_iva) || 0,
      is_paid: sellForm.is_paid, invoice_date: sellForm.invoice_date || null, due_date: sellForm.due_date || null,
      sale_invoice_url: saleInvoiceUrl
    }).eq('id', sellingMachine.id);

    if (!error) { 
      setSellingMachine(null); setSellForm({ sale_price: '', sale_iva: '', is_paid: false, invoice_date: '', due_date: '' }); 
      setSaleInvoiceFile(null); fetchInventory(); 
    }
    setIsUploading(false);
  }

  async function handleTogglePaid(e: any, machineId: string, currentStatus: boolean) {
    e.stopPropagation();
    if (!isAdmin) return;
    const newStatus = !currentStatus;
    setMachines((prev: any[]) => prev.map(m => m.id === machineId ? { ...m, is_paid: newStatus } : m));
    await supabase.from('inventory').update({ is_paid: newStatus }).eq('id', machineId);
  }

  async function handleAddMachine(e: any) {
    e.preventDefault();
    if (!isAdmin) return;
    setIsUploading(true);
    let imageUrl = null;
    let pedimentoUrl = null;

    if (imageFile) {
      const fileName = `img-${Date.now()}-${sanitizeFileName(imageFile.name)}`;
      const { error: uploadError } = await supabase.storage.from('machine-images').upload(fileName, imageFile);
      if (!uploadError) imageUrl = supabase.storage.from('machine-images').getPublicUrl(fileName).data.publicUrl;
    }
    
    if (pedimentoFile) {
      const fileName = `pedimento-${Date.now()}-${sanitizeFileName(pedimentoFile.name)}`;
      const { error: uploadError } = await supabase.storage.from('machine-docs').upload(fileName, pedimentoFile);
      if (!uploadError) pedimentoUrl = supabase.storage.from('machine-docs').getPublicUrl(fileName).data.publicUrl;
    }

    const { error } = await supabase.from('inventory').insert([{
      machine_name: formData.machine_name, serial_number: formData.serial_number, category: formData.category || 'Other',
      purchase_price: parseFloat(formData.purchase_price) || 0, purchase_iva: parseFloat(formData.purchase_iva) || 0, 
      shipping_in_cost: parseFloat(formData.shipping_in_cost) || 0, import_fee: parseFloat(formData.import_fee) || 0,
      video_url: formData.video_url || null, status: 'Intake', image_url: imageUrl, pedimento_url: pedimentoUrl, is_paid: false
    }]);

    if (!error) { 
      setIsAdding(false); 
      setFormData({ machine_name: '', serial_number: '', category: '', purchase_price: '', purchase_iva: '', shipping_in_cost: '', import_fee: '', video_url: '' }); 
      setImageFile(null); setPedimentoFile(null); fetchInventory(); 
    } else {
      alert("Database error: " + error.message);
    }
    setIsUploading(false);
  }

  function openEditModal(machine: any) {
    if (!isAdmin) return;
    setEditingMachine(machine);
    setEditFormData({
      machine_name: machine.machine_name || '', serial_number: machine.serial_number || '', category: machine.category || '',
      purchase_price: machine.purchase_price || '', purchase_iva: machine.purchase_iva || '',
      shipping_in_cost: machine.shipping_in_cost || '', import_fee: machine.import_fee || '',
      invoice_date: machine.invoice_date || '', due_date: machine.due_date || '', video_url: machine.video_url || ''
    });
  }

  async function handleUpdateMachine(e: any) {
    e.preventDefault();
    if (!isAdmin) return;
    setIsUploading(true);
    let pedimentoUrl = editingMachine.pedimento_url;

    if (pedimentoFile) {
      const fileName = `pedimento-${Date.now()}-${sanitizeFileName(pedimentoFile.name)}`;
      const { error: uploadError } = await supabase.storage.from('machine-docs').upload(fileName, pedimentoFile);
      if (!uploadError) pedimentoUrl = supabase.storage.from('machine-docs').getPublicUrl(fileName).data.publicUrl;
    }

    const payload: any = {
      machine_name: editFormData.machine_name, serial_number: editFormData.serial_number, category: editFormData.category || 'Other',
      purchase_price: parseFloat(editFormData.purchase_price) || 0, purchase_iva: parseFloat(editFormData.purchase_iva) || 0,
      shipping_in_cost: parseFloat(editFormData.shipping_in_cost) || 0, import_fee: parseFloat(editFormData.import_fee) || 0,
      video_url: editFormData.video_url || null, pedimento_url: pedimentoUrl
    };

    if (editingMachine.status === 'Sold') {
       payload.invoice_date = editFormData.invoice_date || null;
       payload.due_date = editFormData.due_date || null;
    }

    const { error } = await supabase.from('inventory').update(payload).eq('id', editingMachine.id);
    if (!error) { setEditingMachine(null); setPedimentoFile(null); fetchInventory(); }
    setIsUploading(false);
  }

  // --- REPAIR MANAGER LOGIC ---
  async function handleAddRepair(e: any) {
    e.preventDefault(); if (!isAdmin) return;
    const payload: any = { inventory_id: selectedMachine.id, item_description: repairForm.item_description, part_cost: parseFloat(repairForm.part_cost) || 0, labor_hours: parseFloat(repairForm.labor_hours) || 0 };
    if (repairForm.invoice_id) payload.invoice_id = repairForm.invoice_id;
    await supabase.from('repair_logs').insert([payload]);
    setRepairForm({ item_description: '', part_cost: '', labor_hours: '', invoice_id: '' }); fetchInventory(); 
    const { data } = await supabase.from('inventory').select('*, repair_logs(*, parts_invoices(invoice_number, file_url, providers(name)))').eq('id', selectedMachine.id).single();
    setSelectedMachine(data);
  }
  async function handleDeleteRepair(repairId: any) {
    if (!isAdmin) return; await supabase.from('repair_logs').delete().eq('id', repairId); fetchInventory();
    const { data } = await supabase.from('inventory').select('*, repair_logs(*, parts_invoices(invoice_number, file_url, providers(name)))').eq('id', selectedMachine.id).single();
    setSelectedMachine(data);
  }

  // --- PROVIDER & INVOICE LOGIC ---
  async function handleToggleInvoicePaid(e: any, invoiceId: string, currentStatus: boolean) {
    e.stopPropagation(); if (!isAdmin) return;
    const newStatus = !currentStatus;
    setInvoices((prev: any[]) => prev.map(inv => inv.id === invoiceId ? { ...inv, is_paid: newStatus } : inv));
    await supabase.from('parts_invoices').update({ is_paid: newStatus }).eq('id', invoiceId);
  }
  async function handleAddProvider(e: any) {
    e.preventDefault(); if (!isAdmin) return;
    await supabase.from('providers').insert([providerForm]);
    setIsAddingProvider(false); setProviderForm({ name: '', contact_info: '', notes: '' }); fetchProvidersAndInvoices();
  }
  async function handleAddInvoice(e: any) {
    e.preventDefault(); if (!isAdmin) return;
    setIsUploadingInvoice(true); let fileUrl = null;
    if (invoiceFile) {
      const fileName = `inv-${Date.now()}-${sanitizeFileName(invoiceFile.name)}`;
      const { error: uploadError } = await supabase.storage.from('invoices').upload(fileName, invoiceFile);
      if (!uploadError) fileUrl = supabase.storage.from('invoices').getPublicUrl(fileName).data.publicUrl;
    }
    await supabase.from('parts_invoices').insert([{
      provider_id: invoiceForm.provider_id, invoice_number: invoiceForm.no_factura ? 'Sin Factura' : invoiceForm.invoice_number,
      total_amount: parseFloat(invoiceForm.total_amount) || 0, iva_amount: invoiceForm.no_factura ? 0 : (parseFloat(invoiceForm.iva_amount) || 0),
      invoice_date: invoiceForm.invoice_date || new Date().toISOString().split('T')[0], due_date: invoiceForm.due_date || null,
      notes: invoiceForm.notes, is_paid: invoiceForm.is_paid, file_url: fileUrl
    }]);
    setIsAddingInvoice(false); setInvoiceForm({ provider_id: '', invoice_number: '', total_amount: '', iva_amount: '', invoice_date: '', due_date: '', notes: '', no_factura: false, is_paid: false }); 
    setInvoiceFile(null); fetchProvidersAndInvoices(); setIsUploadingInvoice(false);
  }
  function openEditInvoiceModal(invoice: any) {
    if (!isAdmin) return; setEditingInvoice(invoice); setInvoiceFile(null); 
    setEditInvoiceForm({
      provider_id: invoice.provider_id || '', invoice_number: invoice.invoice_number || '', total_amount: invoice.total_amount || '',
      iva_amount: invoice.iva_amount || '', invoice_date: invoice.invoice_date || '', due_date: invoice.due_date || '',
      notes: invoice.notes || '', no_factura: invoice.invoice_number === 'Sin Factura', is_paid: invoice.is_paid || false
    });
  }
  async function handleUpdateInvoice(e: any) {
    e.preventDefault(); if (!isAdmin) return;
    setIsUploadingInvoice(true); let fileUrl = editingInvoice.file_url;
    if (invoiceFile) {
      const fileName = `inv-${Date.now()}-${sanitizeFileName(invoiceFile.name)}`;
      const { error: uploadError } = await supabase.storage.from('invoices').upload(fileName, invoiceFile);
      if (!uploadError) fileUrl = supabase.storage.from('invoices').getPublicUrl(fileName).data.publicUrl;
    }
    await supabase.from('parts_invoices').update({
      provider_id: editInvoiceForm.provider_id, invoice_number: editInvoiceForm.no_factura ? 'Sin Factura' : editInvoiceForm.invoice_number,
      total_amount: parseFloat(editInvoiceForm.total_amount) || 0, iva_amount: editInvoiceForm.no_factura ? 0 : (parseFloat(editInvoiceForm.iva_amount) || 0),
      invoice_date: editInvoiceForm.invoice_date, due_date: editInvoiceForm.due_date || null, notes: editInvoiceForm.notes, is_paid: editInvoiceForm.is_paid, file_url: fileUrl
    }).eq('id', editingInvoice.id);
    setEditingInvoice(null); setInvoiceFile(null); fetchProvidersAndInvoices(); setIsUploadingInvoice(false);
  }

  // --- SAT & CASH BOX LOGIC ---
  async function handleAddSatPayment(e: any) {
    e.preventDefault(); if (!isAdmin) return; setIsUploadingSat(true); let receiptUrl = null;
    if (satReceiptFile) {
      const fileName = `sat-${Date.now()}-${sanitizeFileName(satReceiptFile.name)}`;
      const { error: uploadError } = await supabase.storage.from('invoices').upload(fileName, satReceiptFile);
      if (!uploadError) receiptUrl = supabase.storage.from('invoices').getPublicUrl(fileName).data.publicUrl;
    }
    await supabase.from('iva_payments').insert([{ payment_date: satPaymentForm.payment_date || new Date().toISOString().split('T')[0], amount: parseFloat(satPaymentForm.amount) || 0, notes: satPaymentForm.notes, receipt_url: receiptUrl }]);
    setIsAddingSatPayment(false); setSatPaymentForm({ payment_date: '', amount: '', notes: '' }); setSatReceiptFile(null); fetchSatPayments(); setIsUploadingSat(false);
  }

  function openEditSatPaymentModal(payment: any) {
    if (!isAdmin) return; setEditingSatPayment(payment); setEditSatPaymentForm({ payment_date: payment.payment_date || '', amount: payment.amount || '', notes: payment.notes || '' });
  }

  async function handleUpdateSatPayment(e: any) {
    e.preventDefault(); if (!isAdmin) return; setIsUploadingSat(true); let receiptUrl = editingSatPayment.receipt_url;
    if (satReceiptFile) {
      const fileName = `sat-${Date.now()}-${sanitizeFileName(satReceiptFile.name)}`;
      const { error: uploadError } = await supabase.storage.from('invoices').upload(fileName, satReceiptFile);
      if (!uploadError) receiptUrl = supabase.storage.from('invoices').getPublicUrl(fileName).data.publicUrl;
    }
    await supabase.from('iva_payments').update({ payment_date: editSatPaymentForm.payment_date, amount: parseFloat(editSatPaymentForm.amount) || 0, notes: editSatPaymentForm.notes, receipt_url: receiptUrl }).eq('id', editingSatPayment.id);
    setEditingSatPayment(null); setSatReceiptFile(null); fetchSatPayments(); setIsUploadingSat(false);
  }

  async function handleAddCash(e: any) {
    e.preventDefault(); if (!isAdmin) return;
    await supabase.from('cash_box').insert([{ amount: parseFloat(cashForm.amount) || 0, notes: cashForm.notes, date: cashForm.date || new Date().toISOString().split('T')[0] }]);
    setIsAddingCash(false); setCashForm({ amount: '', notes: '', date: '' }); fetchCashBox();
  }

  const calculateIva = (amount: any) => (parseFloat(amount) * 0.16).toFixed(2);

  return (
    <>
      <div className={`min-h-screen bg-gray-100 p-8 ${specSheetMachine ? 'print:hidden hidden' : ''}`}>
        
        {/* DASHBOARD HEADER */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-gray-800">Fine Edge Machines - ERP</h1>
            <button onClick={handleAdminToggle} className={`text-xs px-3 py-1.5 rounded font-bold transition shadow-sm ${isAdmin ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-gray-200 text-gray-600 border border-gray-300'}`}>
              {isAdmin ? '🔓 Admin Unlocked' : '🔒 View Only'}
            </button>
          </div>
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
          
          <div className={`flex-1 min-w-[250px] bg-white p-6 rounded-lg shadow border-l-4 ${currentIvaOwed > 0 ? 'border-red-500' : 'border-teal-500'}`}>
            <div className="flex justify-between items-start mb-1">
               <h3 className="text-gray-500 text-sm font-bold uppercase tracking-wide">Current IVA Owed</h3>
               {isAdmin && (
                 <button onClick={() => setIsAddingSatPayment(true)} className="text-xs bg-red-50 text-red-600 hover:bg-red-100 font-bold px-2 py-1 rounded border border-red-200 transition shadow-sm">+ Pay SAT</button>
               )}
            </div>
            <p className={`text-3xl font-bold ${currentIvaOwed > 0 ? 'text-red-600' : 'text-teal-600'}`}>{formatMXN(currentIvaOwed)}</p>
            <div className="text-xs text-gray-600 mt-3 pt-2 border-t flex flex-col gap-1">
               <div className="flex justify-between"><span>Accrued Balance:</span> <span className="font-semibold">{formatMXN(grossIvaBalance)}</span></div>
               <div className="flex justify-between"><span>Paid to SAT:</span> <span className="font-semibold text-green-600">-{formatMXN(totalIvaPaidToSat)}</span></div>
            </div>
          </div>

          <div className={`flex-1 min-w-[250px] bg-white p-6 rounded-lg shadow border-l-4 ${netProfit >= 0 ? 'border-green-500' : 'border-red-500'}`}>
            <div className="flex justify-between items-start mb-1">
               <h3 className="text-gray-500 text-sm font-bold uppercase tracking-wide">Realized Profit</h3>
               <div className="flex items-center gap-1">
                 <span className="text-xs font-bold text-gray-500">Camnosa: $</span>
                 <input 
                   type="number" step="0.01" value={exchangeRate} onChange={(e) => setExchangeRate(e.target.value)}
                   className="w-16 p-1 text-xs border rounded text-black font-bold focus:outline-none focus:ring-1 focus:ring-green-500 bg-gray-50"
                   disabled={!isAdmin}
                 />
               </div>
            </div>
            <p className={`text-3xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatMXN(netProfit)}</p>
            <div className="mt-2 inline-block bg-green-50 border border-green-200 rounded px-2 py-1">
              <span className="text-sm font-bold text-green-800">
                USD {parseFloat(exchangeRate) > 0 ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(netProfit / parseFloat(exchangeRate)) : '$0.00'}
              </span>
            </div>
          </div>

          {/* NET CASH FLOW WIDGET */}
          <div className={`flex-1 min-w-[200px] bg-white p-6 rounded-lg shadow border-l-4 ${netCashFlow >= 0 ? 'border-purple-500' : 'border-red-500'}`}>
            <h3 className="text-gray-500 text-sm font-bold uppercase tracking-wide mb-1">Net Cash Flow</h3>
            <p className={`text-3xl font-bold ${netCashFlow >= 0 ? 'text-purple-600' : 'text-red-600'}`}>{formatMXN(netCashFlow)}</p>
            <p className="text-xs text-gray-400 mt-1">Total in vs. Total out</p>
          </div>

          {/* CASH BOX WIDGET */}
          <div className="flex-1 min-w-[200px] bg-white p-6 rounded-lg shadow border-l-4 border-green-800">
            <div className="flex justify-between items-start mb-1">
               <h3 className="text-gray-500 text-sm font-bold uppercase tracking-wide">Cash Box (Untaxed)</h3>
               {isAdmin && (
                 <div className="flex gap-2">
                   <button onClick={() => setShowCashHistory(true)} className="text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 font-bold px-2 py-1 rounded border border-gray-300 transition shadow-sm">📜 History</button>
                   <button onClick={() => setIsAddingCash(true)} className="text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 font-bold px-2 py-1 rounded border border-gray-300 transition shadow-sm">+/- Log</button>
                 </div>
               )}
            </div>
            <p className="text-3xl font-bold text-green-800">{formatMXN(cashBoxTotal)}</p>
            <p className="text-xs text-gray-400 mt-1">Off-the-books cash</p>
          </div>
        </div>

        {/* TABS & SEARCH */}
        <div className="flex justify-between items-end mb-8 border-b pb-4">
          <div className="flex gap-4">
            <button onClick={() => setActiveTab('kanban')} className={`px-6 py-2 rounded font-bold transition ${activeTab === 'kanban' ? 'bg-blue-600 text-white shadow' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>Machinery Board</button>
            <button onClick={() => setActiveTab('invoices')} className={`px-6 py-2 rounded font-bold transition ${activeTab === 'invoices' ? 'bg-blue-600 text-white shadow' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>Parts & Purchases</button>
            <button onClick={() => setActiveTab('sat')} className={`px-6 py-2 rounded font-bold transition ${activeTab === 'sat' ? 'bg-red-600 text-white shadow' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>SAT Records</button>
          </div>
          
          {activeTab === 'kanban' && (
            <div className="flex gap-4 items-center">
              <input type="text" placeholder="🔍 Search name or S/N..." className="p-2 border border-gray-300 rounded text-black w-64 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              {isAdmin && (
                <>
                  <button onClick={exportMachines} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-bold shadow transition">📊 Export CSV</button>
                  <button onClick={() => setIsAdding(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-bold shadow transition">+ Add Machine</button>
                </>
              )}
            </div>
          )}
          {activeTab === 'invoices' && isAdmin && (
            <div className="flex gap-4 items-center">
              <button onClick={exportInvoices} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-bold shadow transition">📊 Export CSV</button>
            </div>
          )}
        </div>

        {/* KANBAN BOARD */}
        {activeTab === 'kanban' && (
          <div className="flex gap-6 overflow-x-auto pb-4">
            {COLUMNS.map(column => (
              <div key={column} className="bg-gray-200 p-4 rounded-lg w-80 flex-shrink-0 min-h-[500px]" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, column)}>
                <h2 className="font-bold text-lg mb-4 text-gray-700 uppercase tracking-wide border-b-2 border-gray-300 pb-2">{column} ({filteredMachines.filter((m: any) => m.status === column).length})</h2>
                <div className="flex flex-col gap-4">
                  {filteredMachines.filter((m: any) => m.status === column).map((machine: any) => {
                    const machineProfit = Number(machine.sale_price) - calculateTotalCost(machine);
                    const isOverdue = machine.due_date ? (new Date(machine.due_date) < new Date()) : false;

                    return (
                      <div key={machine.id} draggable={isAdmin} onDragStart={(e) => handleDragStart(e, machine.id)} onClick={() => setSelectedMachine(machine)} className={`bg-white p-4 rounded shadow ${isAdmin ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} border-l-4 border-blue-500 hover:shadow-lg transition transform hover:-translate-y-1`}>
                        {machine.image_url && <img src={machine.image_url} alt="Machine" className="w-full h-40 object-cover rounded mb-3 border" />}
                        <h3 className="font-bold text-gray-800">{machine.machine_name}</h3>
                        
                        {/* Display Category Badge in Kanban */}
                        {machine.category && machine.category !== 'Other' && (
                          <span className="inline-block bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded font-bold mt-1 mb-2">{machine.category}</span>
                        )}
                        <p className="text-sm text-gray-500 mb-2">SN: {machine.serial_number}</p>
                        
                        {/* Video Indicator */}
                        {machine.video_url && (
                          <a href={machine.video_url} target="_blank" rel="noopener noreferrer" className="text-xs text-red-600 font-bold mb-2 flex items-center gap-1 hover:underline" onClick={(e) => e.stopPropagation()}>
                            ▶ Video Attached
                          </a>
                        )}

                        {machine.status === 'Sold' && (
                           <div className="bg-gray-50 border p-2 rounded text-xs mb-2 mt-2">
                             <span className="font-bold text-gray-700">Sold for:</span> {formatMXN(machine.sale_price)} <br/> 
                             <span className="font-bold text-gray-700">IVA:</span> {formatMXN(machine.sale_iva)} <br/>
                             
                             {!machine.is_paid && (machine.invoice_date || machine.due_date) && (
                               <div className="mt-2 mb-2 bg-yellow-50 border border-yellow-200 p-2 rounded text-xs flex justify-between items-center">
                                 <div>
                                   <span className="font-bold text-gray-700">Inv Sent:</span> {machine.invoice_date || 'N/A'} <br/>
                                   <span className="font-bold text-gray-700">Due Date:</span> <span className={isOverdue ? 'text-red-600 font-extrabold' : 'text-gray-800 font-bold'}>{machine.due_date || 'N/A'} {isOverdue && '(OVERDUE)'}</span>
                                 </div>
                                 {machine.due_date && (
                                   <button onClick={(e) => handleAddToCalendar(e, `Payment Due: ${machine.machine_name}`, machine.due_date, `Expected Amount: ${formatMXN(machine.sale_price)}`)} className="text-xl hover:scale-110 transition pr-2" title="Add to Calendar">📅</button>
                                 )}
                               </div>
                             )}

                             <span className={`font-bold mt-2 block border-t pt-1 ${machineProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>Profit: {formatMXN(machineProfit)}</span>
                             <div className="mt-2 pt-2 border-t flex justify-between items-center">
                                <span className="font-bold text-gray-600">Payment:</span>
                                <button onClick={(e) => handleTogglePaid(e, machine.id, machine.is_paid)} disabled={!isAdmin} className={`px-2 py-1 rounded font-bold text-xs transition shadow-sm ${machine.is_paid ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-yellow-100 text-yellow-700 border border-yellow-300'} ${!isAdmin && 'cursor-default'}`}>
                                  {machine.is_paid ? '✅ PAID' : '⏳ PENDING'}
                                </button>
                             </div>
                           </div>
                        )}

                        <div className="flex justify-between items-center text-sm font-medium text-gray-700 mt-4 border-t pt-2 border-b pb-2 mb-2">
                          <span>Total Invested:</span>
                          <span className="text-gray-800 font-bold">{formatMXN(calculateTotalCost(machine))}</span>
                        </div>

                        <div className="flex gap-2 text-xs font-bold mt-2">
                          {machine.pedimento_url && <a href={machine.pedimento_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline bg-blue-50 px-2 py-1 rounded" onClick={(e) => e.stopPropagation()}>📄 Pedimento</a>}
                          {machine.sale_invoice_url && <a href={machine.sale_invoice_url} target="_blank" rel="noreferrer" className="text-green-600 hover:underline bg-green-50 px-2 py-1 rounded" onClick={(e) => e.stopPropagation()}>🧾 Sale Invoice</a>}
                        </div>
                        
                        <div className="flex gap-2 mt-4">
                          <button onClick={(e) => { e.stopPropagation(); setSpecSheetMachine(machine); }} className={`bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold py-2 rounded transition border border-gray-300 ${isAdmin ? 'w-1/2' : 'w-full'}`}>📄 Spec Sheet</button>
                          {isAdmin && <button onClick={(e) => { e.stopPropagation(); openEditModal(machine); }} className="w-1/2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold py-2 rounded transition border border-blue-200">✏️ Edit</button>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* --- ADD MACHINE MODAL --- */}
        {isAdding && isAdmin && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto border-t-8 border-blue-600">
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
                  
                  {/* NEW CATEGORY INPUT */}
                  <input required placeholder="Category (e.g., Laser, CNC, Welder)" className="p-2 border rounded text-black bg-gray-50 font-semibold" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
                  
                  <input required placeholder="Serial Number" className="p-2 border rounded text-black" value={formData.serial_number} onChange={e => setFormData({...formData, serial_number: e.target.value})} />
                  <input type="url" placeholder="YouTube/Drive Video Link (Optional)" className="p-2 border rounded text-black" value={formData.video_url} onChange={e => setFormData({...formData, video_url: e.target.value})} />

                  <div className="flex gap-4">
                     <div className="w-1/2">
                       <label className="block text-xs font-bold text-gray-500 uppercase">Purchase Price</label>
                       <input type="number" step="0.01" className="p-2 w-full border rounded text-black" value={formData.purchase_price} onChange={e => setFormData({...formData, purchase_price: e.target.value})} />
                     </div>
                     <div className="w-1/2">
                       <label className="flex justify-between text-xs font-bold text-gray-500 uppercase">
                         <span>IVA Paid</span>
                         <button type="button" tabIndex={-1} onClick={() => setFormData({...formData, purchase_iva: calculateIva(formData.purchase_price || 0)})} className="text-blue-600 hover:underline">Auto 16%</button>
                       </label>
                       <input type="number" step="0.01" className="p-2 w-full border rounded text-black text-red-600" value={formData.purchase_iva} onChange={e => setFormData({...formData, purchase_iva: e.target.value})} />
                     </div>
                  </div>

                  <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase">Shipping & Import (No IVA)</label>
                     <div className="flex gap-4 mt-1">
                       <input type="number" step="0.01" placeholder="Shipping Cost" className="p-2 w-1/2 border rounded text-black" value={formData.shipping_in_cost} onChange={e => setFormData({...formData, shipping_in_cost: e.target.value})} />
                       <input type="number" step="0.01" placeholder="Import Fee" className="p-2 w-1/2 border rounded text-black" value={formData.import_fee} onChange={e => setFormData({...formData, import_fee: e.target.value})} />
                     </div>
                  </div>

                  <div className="flex justify-end gap-2 mt-4">
                    <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                    <button type="submit" disabled={isUploading} className="px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700">Save Machine</button>
                  </div>
               </form>
            </div>
          </div>
        )}

        {/* --- EDIT MACHINE MODAL --- */}
        {editingMachine && isAdmin && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl border-t-8 border-blue-500 max-h-[90vh] overflow-y-auto">
               <h2 className="text-2xl font-bold mb-4 text-gray-800">Edit Machine Details</h2>
               <form onSubmit={handleUpdateMachine} className="flex flex-col gap-4">
                  <input required placeholder="Machine Name" className="p-2 border rounded text-black" value={editFormData.machine_name} onChange={e => setEditFormData({...editFormData, machine_name: e.target.value})} />
                  
                  {/* NEW CATEGORY INPUT */}
                  <input required placeholder="Category (e.g., Laser, CNC, Welder)" className="p-2 border rounded text-black bg-gray-50 font-semibold" value={editFormData.category} onChange={e => setEditFormData({...editFormData, category: e.target.value})} />

                  <input required placeholder="Serial Number" className="p-2 border rounded text-black" value={editFormData.serial_number} onChange={e => setEditFormData({...editFormData, serial_number: e.target.value})} />
                  <input type="url" placeholder="YouTube/Drive Video Link (Optional)" className="p-2 border rounded text-black" value={editFormData.video_url} onChange={e => setEditFormData({...editFormData, video_url: e.target.value})} />

                  <div className="flex gap-4">
                     <div className="w-1/2">
                       <label className="block text-xs font-bold text-gray-500 uppercase">Purchase Price</label>
                       <input type="number" step="0.01" className="p-2 w-full border rounded text-black" value={editFormData.purchase_price} onChange={e => setEditFormData({...editFormData, purchase_price: e.target.value})} />
                     </div>
                     <div className="w-1/2">
                       <label className="flex justify-between text-xs font-bold text-gray-500 uppercase">
                         <span>IVA Paid</span>
                         <button type="button" tabIndex={-1} onClick={() => setEditFormData({...editFormData, purchase_iva: calculateIva(editFormData.purchase_price || 0)})} className="text-blue-600 hover:underline">Auto 16%</button>
                       </label>
                       <input type="number" step="0.01" className="p-2 w-full border rounded text-black text-red-600" value={editFormData.purchase_iva} onChange={e => setEditFormData({...editFormData, purchase_iva: e.target.value})} />
                     </div>
                  </div>

                  <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase">Shipping & Import (No IVA)</label>
                     <div className="flex gap-4 mt-1">
                       <input type="number" step="0.01" placeholder="Shipping Cost" className="p-2 w-1/2 border rounded text-black" value={editFormData.shipping_in_cost} onChange={e => setEditFormData({...editFormData, shipping_in_cost: e.target.value})} />
                       <input type="number" step="0.01" placeholder="Import Fee" className="p-2 w-1/2 border rounded text-black" value={editFormData.import_fee} onChange={e => setEditFormData({...editFormData, import_fee: e.target.value})} />
                     </div>
                  </div>

                  {editingMachine.status === 'Sold' && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded mt-2">
                      <h3 className="text-xs font-bold text-gray-700 mb-2 uppercase">Accounts Receivable Dates</h3>
                      <div className="flex gap-4">
                        <div className="w-1/2">
                          <label className="block text-xs font-bold text-gray-500 mb-1">Invoice Sent</label>
                          <input type="date" className="p-2 w-full border rounded text-black" value={editFormData.invoice_date} onChange={e => setEditFormData({...editFormData, invoice_date: e.target.value})} />
                        </div>
                        <div className="w-1/2">
                          <label className="block text-xs font-bold text-gray-500 mb-1">Due Date</label>
                          <input type="date" className="p-2 w-full border rounded text-black" value={editFormData.due_date} onChange={e => setEditFormData({...editFormData, due_date: e.target.value})} />
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1 mt-2">Upload/Replace Pedimento</label>
                    <input type="file" accept=".pdf,image/*" onChange={(e: any) => setPedimentoFile(e.target.files[0])} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700" />
                    {editingMachine.pedimento_url && <p className="text-xs text-blue-600 mt-1">A pedimento is currently attached.</p>}
                  </div>

                  <div className="flex justify-end gap-2 mt-4">
                    <button type="button" onClick={() => setEditingMachine(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                    <button type="submit" disabled={isUploading} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold">Update Details</button>
                  </div>
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
                        {isAdmin && (
                          <div className="flex items-center gap-4"><span className="font-medium text-green-700">{formatMXN(log.part_cost)}</span><button onClick={() => handleDeleteRepair(log.id)} className="text-red-500 hover:text-red-700 text-sm font-bold">X</button></div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              
              {isAdmin && (
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
              )}
            </div>
          </div>
        )}

        {/* TAB 2: INVOICES */}
        {activeTab === 'invoices' && (
          <div className="bg-white p-6 rounded-lg shadow min-h-[500px]">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="text-2xl font-bold text-gray-800">Parts & Purchases</h2>
              {isAdmin && (
                <div className="flex gap-4">
                  <button onClick={() => setIsAddingProvider(true)} className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded font-bold shadow transition">+ New Provider</button>
                  <button onClick={() => setIsAddingInvoice(true)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-bold shadow transition">+ Add Purchase</button>
                </div>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-700">
                    <th className="p-3 border-b">Inv Date</th><th className="p-3 border-b">Due Date</th><th className="p-3 border-b">Provider</th><th className="p-3 border-b">Inv / Ticket #</th><th className="p-3 border-b">Total Amount</th><th className="p-3 border-b">IVA Paid</th><th className="p-3 border-b">Receipt</th><th className="p-3 border-b">Status</th>
                    {isAdmin && <th className="p-3 border-b">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {invoices.length === 0 ? <tr><td colSpan={isAdmin ? 9 : 8} className="p-4 text-center text-gray-500">No purchases logged yet.</td></tr> : (
                    invoices.map((inv: any) => {
                      const isOverdue = inv.due_date ? (new Date(inv.due_date) < new Date()) : false;
                      return (
                      <tr key={inv.id} className="hover:bg-gray-50 border-b text-gray-800">
                        <td className="p-3 text-sm">{inv.invoice_date}</td>
                        <td className="p-3 text-sm">
                          {inv.due_date ? (
                            <div className="flex items-center gap-2">
                              <span className={isOverdue && !inv.is_paid ? 'text-red-600 font-bold' : ''}>{inv.due_date}</span>
                              {!inv.is_paid && (
                                <button onClick={(e) => handleAddToCalendar(e, `Pay Invoice: ${inv.providers?.name || 'Supplier'}`, inv.due_date, `Invoice #: ${inv.invoice_number} | Amount: ${formatMXN(inv.total_amount)}`)} className="text-lg hover:scale-110 transition" title="Add to Calendar">📅</button>
                              )}
                            </div>
                          ) : <span className="text-gray-400">N/A</span>}
                        </td>
                        <td className="p-3 font-semibold">{inv.providers?.name || 'Unknown'}</td>
                        <td className="p-3">{inv.invoice_number === 'Sin Factura' ? <span className="bg-gray-200 text-gray-600 px-2 py-1 rounded text-xs font-bold">Sin Factura</span> : inv.invoice_number}</td>
                        <td className="p-3 font-bold text-gray-800">{formatMXN(inv.total_amount)}</td>
                        <td className="p-3 text-red-600">{formatMXN(inv.iva_amount)}</td>
                        <td className="p-3">{inv.file_url ? <a href={inv.file_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm font-bold">View</a> : <span className="text-gray-400 text-sm">No file</span>}</td>
                        <td className="p-3">
                          <button onClick={(e) => handleToggleInvoicePaid(e, inv.id, inv.is_paid)} disabled={!isAdmin} className={`px-2 py-1 rounded font-bold text-xs transition shadow-sm ${inv.is_paid ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-yellow-100 text-yellow-700 border border-yellow-300'} ${!isAdmin && 'cursor-default'}`}>
                            {inv.is_paid ? '✅ PAID' : '⏳ PENDING'}
                          </button>
                        </td>
                        {isAdmin && (
                          <td className="p-3">
                            <button onClick={() => openEditInvoiceModal(inv)} className="text-blue-600 hover:text-blue-800 text-sm font-bold bg-blue-50 px-2 py-1 rounded border border-blue-200">✏️ Edit</button>
                          </td>
                        )}
                      </tr>
                    )})
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: SAT PAYMENTS */}
        {activeTab === 'sat' && (
          <div className="bg-white p-6 rounded-lg shadow min-h-[500px]">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="text-2xl font-bold text-gray-800">SAT Tax Declarations & Payments</h2>
              {isAdmin && (
                <button onClick={() => setIsAddingSatPayment(true)} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-bold shadow transition">+ Log SAT Payment</button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-700">
                    <th className="p-3 border-b">Payment Date</th><th className="p-3 border-b">Amount Paid to SAT</th><th className="p-3 border-b">Notes / Month Declared</th><th className="p-3 border-b">Acuse / Receipt</th>
                    {isAdmin && <th className="p-3 border-b">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {satPayments.length === 0 ? <tr><td colSpan={isAdmin ? 5 : 4} className="p-4 text-center text-gray-500">No SAT payments logged yet.</td></tr> : (
                    satPayments.map((payment: any) => (
                      <tr key={payment.id} className="hover:bg-gray-50 border-b text-gray-800">
                        <td className="p-3">{payment.payment_date}</td>
                        <td className="p-3 font-bold text-green-600">{formatMXN(payment.amount)}</td>
                        <td className="p-3 text-sm">{payment.notes}</td>
                        <td className="p-3">{payment.receipt_url ? <a href={payment.receipt_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm font-bold">View</a> : <span className="text-gray-400 text-sm">No file</span>}</td>
                        {isAdmin && (
                          <td className="p-3">
                            <button onClick={() => openEditSatPaymentModal(payment)} className="text-red-600 hover:text-red-800 text-sm font-bold bg-red-50 px-2 py-1 rounded border border-red-200">✏️ Edit</button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- CASH BOX HISTORY MODAL --- */}
        {showCashHistory && isAdmin && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-xl border-t-8 border-green-800 flex flex-col max-h-[90vh]">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Cash Box History</h2>
                <button onClick={() => setShowCashHistory(false)} className="text-gray-500 hover:text-red-500 text-2xl font-bold">&times;</button>
              </div>
              <div className="bg-gray-100 p-4 rounded mb-4 flex justify-between text-lg">
                <span className="font-semibold text-gray-700">Current Balance:</span>
                <span className="font-bold text-green-800">{formatMXN(cashBoxTotal)}</span>
              </div>
              <div className="overflow-y-auto mb-2 flex-grow">
                {cashBoxLogs.length === 0 ? <p className="text-gray-500 text-sm italic">No cash logged yet.</p> : (
                  <ul className="flex flex-col gap-2">
                    {[...cashBoxLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((log: any) => (
                      <li key={log.id} className="flex justify-between items-center bg-gray-50 p-3 border rounded text-black">
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-500 font-bold">{log.date}</span>
                          <span className="font-semibold text-sm">{log.notes || 'No notes'}</span>
                        </div>
                        <span className={`font-bold ${Number(log.amount) >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                          {Number(log.amount) >= 0 ? '+' : ''}{formatMXN(Number(log.amount))}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="flex justify-end mt-4 pt-4 border-t">
                <button onClick={() => setShowCashHistory(false)} className="px-6 py-2 bg-gray-200 text-gray-700 font-bold rounded hover:bg-gray-300">Close</button>
              </div>
            </div>
          </div>
        )}

        {/* --- ADD CASH BOX MODAL --- */}
        {isAddingCash && isAdmin && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-xl border-t-8 border-green-800">
              <h2 className="text-2xl font-bold mb-2 text-gray-800">Update Cash Box</h2>
              <form onSubmit={handleAddCash} className="flex flex-col gap-4 mt-4">
                <input required type="date" className="p-2 border rounded text-black" value={cashForm.date} onChange={e => setCashForm({...cashForm, date: e.target.value})} />
                <input required type="number" step="0.01" placeholder="Amount (Use - to subtract)" className="p-2 border rounded text-black font-bold text-lg" value={cashForm.amount} onChange={e => setCashForm({...cashForm, amount: e.target.value})} />
                <input type="text" placeholder="Notes (e.g., Sold scrap, bought lunch)" className="p-2 border rounded text-black" value={cashForm.notes} onChange={e => setCashForm({...cashForm, notes: e.target.value})} />
                <div className="flex justify-end gap-2 mt-2">
                  <button type="button" onClick={() => setIsAddingCash(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-green-800 hover:bg-green-900 text-white rounded font-bold shadow">Save Log</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* --- ADD INVOICE MODAL --- */}
        {isAddingInvoice && isAdmin && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-4 text-gray-800">Log Part Purchase</h2>
              <form onSubmit={handleAddInvoice} className="flex flex-col gap-4">
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
                  <div className="w-1/3">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Inv / Ticket #</label>
                    <input type="text" disabled={invoiceForm.no_factura} className="p-2 w-full border rounded text-black disabled:bg-gray-200 disabled:text-gray-500" value={invoiceForm.invoice_number} onChange={e => setInvoiceForm({...invoiceForm, invoice_number: e.target.value})} />
                  </div>
                  <div className="w-1/3">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Invoice Date</label>
                    <input required type="date" className="p-2 w-full border rounded text-black" value={invoiceForm.invoice_date} onChange={e => handleInvoiceDateChange(e, 'invoiceForm')} />
                  </div>
                  <div className="w-1/3">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Due Date</label>
                    <input type="date" className="p-2 w-full border rounded text-black" value={invoiceForm.due_date} onChange={e => setInvoiceForm({...invoiceForm, due_date: e.target.value})} />
                  </div>
                </div>
                <div className="flex gap-4 items-end">
                  <div className="w-1/2">
                    <label className="block text-xs font-bold text-gray-500 uppercase">{invoiceForm.no_factura ? 'Total Paid' : 'Subtotal / Total'}</label>
                    <input required type="number" step="0.01" className="p-2 w-full border rounded text-black font-bold" value={invoiceForm.total_amount} onChange={e => setInvoiceForm({...invoiceForm, total_amount: e.target.value})} />
                  </div>
                  <div className="w-1/2">
                    <label className="flex justify-between text-xs font-bold text-gray-500 uppercase">
                      <span>IVA Paid</span>
                      {!invoiceForm.no_factura && <button type="button" tabIndex={-1} onClick={() => setInvoiceForm({...invoiceForm, iva_amount: calculateIva(invoiceForm.total_amount || 0)})} className="text-blue-600 hover:underline">Auto 16%</button>}
                    </label>
                    <input required type="number" step="0.01" disabled={invoiceForm.no_factura} className="p-2 w-full border rounded text-black text-red-600 disabled:bg-gray-200 disabled:text-gray-500" value={invoiceForm.iva_amount} onChange={e => setInvoiceForm({...invoiceForm, iva_amount: e.target.value})} />
                  </div>
                </div>
                <label className="flex items-center gap-2 mt-2 p-3 bg-gray-50 border rounded cursor-pointer hover:bg-gray-100">
                  <input type="checkbox" className="w-5 h-5 text-green-600" checked={invoiceForm.is_paid} onChange={e => setInvoiceForm({...invoiceForm, is_paid: e.target.checked})} />
                  <span className="text-sm font-bold text-gray-700">Payment Sent Immediately?</span>
                </label>
                <textarea placeholder="Notes / Items Bought" className="p-2 border rounded text-black h-20" value={invoiceForm.notes} onChange={e => setInvoiceForm({...invoiceForm, notes: e.target.value})} />
                <input type="file" onChange={(e: any) => setInvoiceFile(e.target.files[0])} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700" />
                <div className="flex justify-end gap-2 mt-4"><button type="button" onClick={() => setIsAddingInvoice(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button><button type="submit" disabled={isUploadingInvoice} className="px-4 py-2 bg-green-600 text-white rounded font-bold">Save Purchase</button></div>
              </form>
            </div>
          </div>
        )}

        {/* --- EDIT INVOICE MODAL --- */}
        {editingInvoice && isAdmin && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl border-t-8 border-blue-500 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-4 text-gray-800">Edit Purchase</h2>
              <form onSubmit={handleUpdateInvoice} className="flex flex-col gap-4">
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
                  <div className="w-1/3">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Inv / Ticket #</label>
                    <input type="text" disabled={editInvoiceForm.no_factura} className="p-2 w-full border rounded text-black disabled:bg-gray-200 disabled:text-gray-500" value={editInvoiceForm.invoice_number} onChange={e => setEditInvoiceForm({...editInvoiceForm, invoice_number: e.target.value})} />
                  </div>
                  <div className="w-1/3">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Invoice Date</label>
                    <input required type="date" className="p-2 w-full border rounded text-black" value={editInvoiceForm.invoice_date} onChange={e => handleInvoiceDateChange(e, 'editInvoiceForm')} />
                  </div>
                  <div className="w-1/3">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Due Date</label>
                    <input type="date" className="p-2 w-full border rounded text-black" value={editInvoiceForm.due_date} onChange={e => setEditInvoiceForm({...editInvoiceForm, due_date: e.target.value})} />
                  </div>
                </div>
                <div className="flex gap-4 items-end">
                  <div className="w-1/2">
                    <label className="block text-xs font-bold text-gray-500 uppercase">{editInvoiceForm.no_factura ? 'Total Paid' : 'Subtotal / Total'}</label>
                    <input required type="number" step="0.01" className="p-2 w-full border rounded text-black font-bold" value={editInvoiceForm.total_amount} onChange={e => setEditInvoiceForm({...editInvoiceForm, total_amount: e.target.value})} />
                  </div>
                  <div className="w-1/2">
                    <label className="flex justify-between text-xs font-bold text-gray-500 uppercase">
                      <span>IVA Paid</span>
                      {!editInvoiceForm.no_factura && <button type="button" tabIndex={-1} onClick={() => setEditInvoiceForm({...editInvoiceForm, iva_amount: calculateIva(editInvoiceForm.total_amount || 0)})} className="text-blue-600 hover:underline">Auto 16%</button>}
                    </label>
                    <input required type="number" step="0.01" disabled={editInvoiceForm.no_factura} className="p-2 w-full border rounded text-black text-red-600 disabled:bg-gray-200 disabled:text-gray-500" value={editInvoiceForm.iva_amount} onChange={e => setEditInvoiceForm({...editInvoiceForm, iva_amount: e.target.value})} />
                  </div>
                </div>
                <label className="flex items-center gap-2 mt-2 p-3 bg-gray-50 border rounded cursor-pointer hover:bg-gray-100">
                  <input type="checkbox" className="w-5 h-5 text-green-600" checked={editInvoiceForm.is_paid} onChange={e => setEditInvoiceForm({...editInvoiceForm, is_paid: e.target.checked})} />
                  <span className="text-sm font-bold text-gray-700">Payment Sent Immediately?</span>
                </label>
                <textarea placeholder="Notes / Items Bought" className="p-2 border rounded text-black h-20" value={editInvoiceForm.notes} onChange={e => setEditInvoiceForm({...editInvoiceForm, notes: e.target.value})} />
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Upload/Replace Receipt</label>
                  <input type="file" accept=".pdf,image/*" onChange={(e: any) => setInvoiceFile(e.target.files[0])} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700" />
                  {editingInvoice.file_url && <p className="text-xs text-blue-600 mt-1">A receipt is currently attached.</p>}
                </div>
                <div className="flex justify-end gap-2 mt-4"><button type="button" onClick={() => {setEditingInvoice(null); setInvoiceFile(null);}} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button><button type="submit" disabled={isUploadingInvoice} className="px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700">Update Purchase</button></div>
              </form>
            </div>
          </div>
        )}

        {/* --- ADD PROVIDER MODAL --- */}
        {isAddingProvider && isAdmin && (
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

        {/* --- ADD SAT PAYMENT MODAL --- */}
        {isAddingSatPayment && isAdmin && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl border-t-8 border-red-500">
              <h2 className="text-2xl font-bold mb-4 text-gray-800">Log SAT Payment</h2>
              <form onSubmit={handleAddSatPayment} className="flex flex-col gap-4">
                <div>
                   <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Payment Date</label>
                   <input required type="date" className="p-2 w-full border rounded text-black" value={satPaymentForm.payment_date} onChange={e => setSatPaymentForm({...satPaymentForm, payment_date: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Amount Paid to SAT</label>
                  <input required type="number" step="0.01" className="p-2 w-full border rounded text-black font-bold text-red-600" value={satPaymentForm.amount} onChange={e => setSatPaymentForm({...satPaymentForm, amount: e.target.value})} />
                </div>
                <textarea placeholder="Notes (e.g., Declaration for March 2026)" className="p-2 border rounded text-black h-20" value={satPaymentForm.notes} onChange={e => setSatPaymentForm({...satPaymentForm, notes: e.target.value})} />
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Upload Acuse / Receipt</label>
                  <input type="file" accept=".pdf,image/*" onChange={(e: any) => setSatReceiptFile(e.target.files[0])} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700" />
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button type="button" onClick={() => setIsAddingSatPayment(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                  <button type="submit" disabled={isUploadingSat} className="px-4 py-2 bg-red-600 text-white rounded font-bold hover:bg-red-700">Save Payment</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* --- EDIT SAT PAYMENT MODAL --- */}
        {editingSatPayment && isAdmin && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl border-t-8 border-red-500">
              <h2 className="text-2xl font-bold mb-4 text-gray-800">Edit SAT Payment</h2>
              <form onSubmit={handleUpdateSatPayment} className="flex flex-col gap-4">
                <div>
                   <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Payment Date</label>
                   <input required type="date" className="p-2 w-full border rounded text-black" value={editSatPaymentForm.payment_date} onChange={e => setEditSatPaymentForm({...editSatPaymentForm, payment_date: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Amount Paid to SAT</label>
                  <input required type="number" step="0.01" className="p-2 w-full border rounded text-black font-bold text-red-600" value={editSatPaymentForm.amount} onChange={e => setEditSatPaymentForm({...editSatPaymentForm, amount: e.target.value})} />
                </div>
                <textarea placeholder="Notes (e.g., Declaration for March 2026)" className="p-2 border rounded text-black h-20" value={editSatPaymentForm.notes} onChange={e => setEditSatPaymentForm({...editSatPaymentForm, notes: e.target.value})} />
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Upload/Replace Acuse</label>
                  <input type="file" accept=".pdf,image/*" onChange={(e: any) => setSatReceiptFile(e.target.files[0])} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700" />
                  {editingSatPayment.receipt_url && <p className="text-xs text-blue-600 mt-1">A receipt is currently attached.</p>}
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button type="button" onClick={() => setEditingSatPayment(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                  <button type="submit" disabled={isUploadingSat} className="px-4 py-2 bg-red-600 text-white rounded font-bold hover:bg-red-700">Update Payment</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* PRINTABLE PDF SPEC SHEET */}
      {specSheetMachine && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-[100] p-4 overflow-y-auto print:bg-white print:p-0">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl p-8 print:shadow-none print:max-w-none print:p-0 relative">
            <div className="flex justify-between items-center mb-8 pb-4 border-b-2 border-gray-200 print:hidden">
              <h2 className="text-xl font-bold text-gray-700">Official Spec Sheet</h2>
              <div className="flex gap-4">
                <button onClick={() => setSpecSheetMachine(null)} className="px-4 py-2 bg-gray-200 text-gray-700 font-bold rounded hover:bg-gray-300">Close</button>
                <button onClick={() => window.print()} className="px-6 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 shadow">🖨️ Print / Save PDF</button>
              </div>
            </div>
            
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
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
