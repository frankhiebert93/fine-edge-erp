"use client";
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

const COLUMNS = ['Intake', 'Refurbishing', 'Ready', 'Sold'];
const RENTAL_COLUMNS = ['In Transit', 'Available', 'Out on Rent', 'Maintenance', 'Retired'];

export default function ERPPortal() {
  // --- SECURITY: HARD LOCK SCREEN ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  const [activeTab, setActiveTab] = useState('kanban');
  const [searchTerm, setSearchTerm] = useState('');

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

  const [formData, setFormData] = useState({ machine_name: '', serial_number: '', category: '', description: '', purchase_price: '', purchase_iva: '', shipping_in_cost: '', import_fee: '', video_url: '' });
  const [editingMachine, setEditingMachine] = useState<any>(null);
  const [editFormData, setEditFormData] = useState<any>({ machine_name: '', serial_number: '', category: '', description: '', purchase_price: '', purchase_iva: '', shipping_in_cost: '', import_fee: '', invoice_date: '', due_date: '', video_url: '' });

  const [repairForm, setRepairForm] = useState({ item_description: '', part_cost: '', labor_hours: '', invoice_id: '' });
  const [imageFile, setImageFile] = useState<any>(null);
  const [pedimentoFile, setPedimentoFile] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [sellingMachine, setSellingMachine] = useState<any>(null);
  const [sellForm, setSellForm] = useState({ sale_price: '', sale_iva: '', is_paid: false, invoice_date: '', due_date: '' });
  const [saleInvoiceFile, setSaleInvoiceFile] = useState<any>(null);

  // --- STATE: RENTALS & RENTAL FINANCES ---
  const [rentals, setRentals] = useState<any[]>([]);
  const [isAddingRental, setIsAddingRental] = useState(false);
  const [rentalForm, setRentalForm] = useState({ equipment_name: '', category: '', serial_number: '', purchase_cost: '', daily_rate: '', weekly_rate: '', description: '' });
  const [editingRental, setEditingRental] = useState<any>(null);
  const [editRentalForm, setEditRentalForm] = useState<any>({ equipment_name: '', category: '', serial_number: '', purchase_cost: '', daily_rate: '', weekly_rate: '', description: '', current_customer: '' });
  const [rentalImageFile, setRentalImageFile] = useState<any>(null);
  const [stickerRental, setStickerRental] = useState<any>(null); // NEW: QR Sticker Overlay State

  const [rentalLedger, setRentalLedger] = useState<any[]>([]);
  const [isAddingRentalPayment, setIsAddingRentalPayment] = useState(false);
  const [rentalPaymentForm, setRentalPaymentForm] = useState({ payment_date: '', equipment_id: '', customer_name: '', amount_paid: '', notes: '' });
  const [rentalPaymentFile, setRentalPaymentFile] = useState<any>(null);

  const [rentalMaintenance, setRentalMaintenance] = useState<any[]>([]);
  const [isAddingMaintenance, setIsAddingMaintenance] = useState(false);
  const [rentalMaintenanceForm, setRentalMaintenanceForm] = useState({ service_date: '', equipment_id: '', description: '', cost: '', invoice_number: '' });
  const [rentalMaintenanceFile, setRentalMaintenanceFile] = useState<any>(null);
  const [rentalLedgerView, setRentalLedgerView] = useState<'income' | 'maintenance'>('income');

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
    if (isAuthenticated) {
      fetchInventory();
      fetchRentals();
      fetchRentalLedger();
      fetchRentalMaintenance();
      fetchProvidersAndInvoices();
      fetchSatPayments();
      fetchCashBox();
    }
  }, [isAuthenticated]);

  async function fetchInventory() {
    const { data, error } = await supabase.from('inventory')
      .select('*, repair_logs(*, parts_invoices(invoice_number, file_url, providers(name)))')
      .order('date_acquired', { ascending: false });
    if (!error) setMachines(data || []);
  }

  async function fetchRentals() {
    const { data, error } = await supabase.from('rental_fleet')
      .select('*')
      .order('equipment_name', { ascending: true });
    if (!error) setRentals(data || []);
  }

  async function fetchRentalLedger() {
    const { data, error } = await supabase.from('rental_ledger')
      .select('*, rental_fleet(equipment_name, serial_number)')
      .order('payment_date', { ascending: false });
    if (!error) setRentalLedger(data || []);
  }

  async function fetchRentalMaintenance() {
    const { data, error } = await supabase.from('rental_maintenance')
      .select('*, rental_fleet(equipment_name, serial_number)')
      .order('service_date', { ascending: false });
    if (!error) setRentalMaintenance(data || []);
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

  const calculateTotalCost = (machine: any) => {
    return Number(machine.purchase_price) +
      Number(machine.shipping_in_cost) +
      Number(machine.import_fee || 0) +
      (machine.repair_logs?.reduce((sum: any, log: any) => sum + Number(log.part_cost), 0) || 0);
  };

  const formatMXN = (amount: any) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
  const formatUSD = (amount: any) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  const inShopMachines = machines.filter((m: any) => m.status !== 'Sold');
  const soldMachines = machines.filter((m: any) => m.status === 'Sold');

  const currentInventoryValue = inShopMachines.reduce((total: any, m: any) => total + calculateTotalCost(m), 0);
  const totalInvoicesValue = invoices.reduce((total: any, inv: any) => total + Number(inv.total_amount), 0);
  const netProfit = soldMachines.reduce((total: any, m: any) => total + (Number(m.sale_price) - calculateTotalCost(m)), 0);

  const totalIvaPaid = machines.reduce((sum: any, m: any) => sum + Number(m.purchase_iva || 0), 0) +
    invoices.filter((inv: any) => inv.is_paid).reduce((sum: any, inv: any) => sum + Number(inv.iva_amount || 0), 0);
  const totalIvaCollected = soldMachines.filter((m: any) => m.is_paid).reduce((sum: any, m: any) => sum + Number(m.sale_iva || 0), 0);
  const grossIvaBalance = totalIvaCollected - totalIvaPaid;
  const totalIvaPaidToSat = satPayments.reduce((sum: any, p: any) => sum + Number(p.amount), 0);
  const currentIvaOwed = grossIvaBalance - totalIvaPaidToSat;

  const totalCashIn = soldMachines.filter((m: any) => m.is_paid).reduce((sum: any, m: any) => sum + Number(m.sale_price) + Number(m.sale_iva || 0), 0);
  const paidInvoicesValue = invoices.filter((inv: any) => inv.is_paid).reduce((sum: any, inv: any) => sum + Number(inv.total_amount), 0);
  const totalMachineSpend = machines.reduce((sum: any, m: any) => sum + Number(m.purchase_price) + Number(m.purchase_iva || 0) + Number(m.shipping_in_cost) + Number(m.import_fee || 0), 0);
  const unlinkedRepairsCost = machines.reduce((sum: any, m: any) => sum + (m.repair_logs?.filter((log: any) => !log.invoice_id).reduce((s: any, l: any) => s + Number(l.part_cost), 0) || 0), 0);
  const totalCashOut = totalMachineSpend + paidInvoicesValue + totalIvaPaidToSat + unlinkedRepairsCost;
  const netCashFlow = totalCashIn - totalCashOut;

  const cashBoxTotal = cashBoxLogs.reduce((sum: any, log: any) => sum + Number(log.amount), 0);

  const totalRentalRevenue = rentalLedger.reduce((sum: any, log: any) => sum + Number(log.amount_paid), 0);
  const totalRentalMaintenanceCost = rentalMaintenance.reduce((sum: any, log: any) => sum + Number(log.cost), 0);
  const netRentalProfit = totalRentalRevenue - totalRentalMaintenanceCost;

  const filteredMachines = machines.filter((machine: any) =>
    machine.machine_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    machine.serial_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRentals = rentals.filter((rental: any) =>
    (rental.equipment_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (rental.serial_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (rental.current_customer || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const handleDragStart = (e: any, machineId: any) => { if (!isAdmin) return; e.dataTransfer.setData('machineId', machineId); e.dataTransfer.setData('type', 'machine'); };
  const handleDragOver = (e: any) => { if (!isAdmin) return; e.preventDefault(); };

  const handleDrop = async (e: any, newStatus: any) => {
    if (!isAdmin) return;
    e.preventDefault();
    const type = e.dataTransfer.getData('type');
    if (type !== 'machine') return;

    const machineId = e.dataTransfer.getData('machineId');
    if (newStatus === 'Sold') {
      const machine = machines.find((m: any) => String(m.id) === String(machineId));
      setSellingMachine(machine);
      return;
    }
    setMachines((prev: any[]) => prev.map((m: any) => String(m.id) === String(machineId) ? { ...m, status: newStatus, sale_price: 0, sale_iva: 0, is_paid: false, invoice_date: null, due_date: null } : m));
    await supabase.from('inventory').update({ status: newStatus, sale_price: 0, sale_iva: 0, is_paid: false, invoice_date: null, due_date: null }).eq('id', machineId);
  };

  const handleRentalDragStart = (e: any, rentalId: any) => { if (!isAdmin) return; e.dataTransfer.setData('rentalId', rentalId); e.dataTransfer.setData('type', 'rental'); };

  const handleRentalDrop = async (e: any, newStatus: any) => {
    if (!isAdmin) return;
    e.preventDefault();
    const type = e.dataTransfer.getData('type');
    if (type !== 'rental') return;

    const rentalId = e.dataTransfer.getData('rentalId');

    setTimeout(async () => {
      let customerName = null;
      if (newStatus === 'Out on Rent') {
        customerName = window.prompt("Who is renting this equipment? (Enter Customer Name):");
        if (customerName === null) return;
      }
      if (newStatus === 'Retired') {
        const confirmRetire = window.confirm("Are you sure you want to retire this machine? It will be removed from the public site.");
        if (!confirmRetire) return;
      }
      setRentals((prev: any[]) => prev.map((r: any) => String(r.id) === String(rentalId) ? { ...r, status: newStatus, current_customer: customerName } : r));
      const { error } = await supabase.from('rental_fleet').update({ status: newStatus, current_customer: customerName }).eq('id', rentalId);
      if (error) { alert("Database error: " + error.message); fetchRentals(); }
    }, 50);
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

    if (target === 'sellForm') setSellForm({ ...sellForm, invoice_date: invDate, due_date: newDueDate });
    if (target === 'invoiceForm') setInvoiceForm({ ...invoiceForm, invoice_date: invDate, due_date: newDueDate });
    if (target === 'editInvoiceForm') setEditInvoiceForm({ ...editInvoiceForm, invoice_date: invDate, due_date: newDueDate });
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
    setMachines((prev: any[]) => prev.map(m => String(m.id) === String(machineId) ? { ...m, is_paid: newStatus } : m));
    await supabase.from('inventory').update({ is_paid: newStatus }).eq('id', machineId);
  }

  async function handleAddMachine(e: any) {
    e.preventDefault();
    if (!isAdmin) return;
    setIsUploading(true);
    let imageUrl = null; let pedimentoUrl = null;

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
      description: formData.description || null,
      purchase_price: parseFloat(formData.purchase_price) || 0, purchase_iva: parseFloat(formData.purchase_iva) || 0,
      shipping_in_cost: parseFloat(formData.shipping_in_cost) || 0, import_fee: parseFloat(formData.import_fee) || 0,
      video_url: formData.video_url || null, status: 'Intake', image_url: imageUrl, pedimento_url: pedimentoUrl, is_paid: false
    }]);

    if (!error) {
      setIsAdding(false);
      setFormData({ machine_name: '', serial_number: '', category: '', description: '', purchase_price: '', purchase_iva: '', shipping_in_cost: '', import_fee: '', video_url: '' });
      setImageFile(null); setPedimentoFile(null); fetchInventory();
    } else { alert("Database error: " + error.message); }
    setIsUploading(false);
  }

  function openEditModal(machine: any) {
    if (!isAdmin) return;
    setEditingMachine(machine);
    setEditFormData({
      machine_name: machine.machine_name || '', serial_number: machine.serial_number || '', category: machine.category || '',
      description: machine.description || '',
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
      description: editFormData.description || null,
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

  async function handleAddRental(e: any) {
    e.preventDefault();
    if (!isAdmin) return;
    setIsUploading(true);
    let imageUrl = null;

    if (rentalImageFile) {
      const fileName = `rental-${Date.now()}-${sanitizeFileName(rentalImageFile.name)}`;
      const { error: uploadError } = await supabase.storage.from('machine-images').upload(fileName, rentalImageFile);
      if (!uploadError) imageUrl = supabase.storage.from('machine-images').getPublicUrl(fileName).data.publicUrl;
    }

    const { error } = await supabase.from('rental_fleet').insert([{
      equipment_name: rentalForm.equipment_name, category: rentalForm.category || 'Other', serial_number: rentalForm.serial_number,
      purchase_cost: parseFloat(rentalForm.purchase_cost) || 0,
      daily_rate: parseFloat(rentalForm.daily_rate) || 0, weekly_rate: parseFloat(rentalForm.weekly_rate) || 0,
      description: rentalForm.description || null, status: 'Available', image_url: imageUrl
    }]);

    if (!error) {
      setIsAddingRental(false); setRentalForm({ equipment_name: '', category: '', serial_number: '', purchase_cost: '', daily_rate: '', weekly_rate: '', description: '' });
      setRentalImageFile(null); fetchRentals();
    } else { alert("Database error: " + error.message); }
    setIsUploading(false);
  }

  function openEditRentalModal(rental: any) {
    if (!isAdmin) return;
    setEditingRental(rental);
    setRentalImageFile(null);
    setEditRentalForm({
      equipment_name: rental.equipment_name || '', category: rental.category || '', serial_number: rental.serial_number || '',
      purchase_cost: rental.purchase_cost || '',
      daily_rate: rental.daily_rate || '', weekly_rate: rental.weekly_rate || '', description: rental.description || '', current_customer: rental.current_customer || ''
    });
  }

  async function handleUpdateRental(e: any) {
    e.preventDefault();
    if (!isAdmin) return;
    setIsUploading(true);
    let imageUrl = editingRental.image_url;

    if (rentalImageFile) {
      const fileName = `rental-${Date.now()}-${sanitizeFileName(rentalImageFile.name)}`;
      const { error: uploadError } = await supabase.storage.from('machine-images').upload(fileName, rentalImageFile);
      if (!uploadError) imageUrl = supabase.storage.from('machine-images').getPublicUrl(fileName).data.publicUrl;
      else alert("Image upload failed: " + uploadError.message);
    }

    const payload: any = {
      equipment_name: editRentalForm.equipment_name, category: editRentalForm.category || 'Other', serial_number: editRentalForm.serial_number,
      purchase_cost: parseFloat(editRentalForm.purchase_cost) || 0,
      daily_rate: parseFloat(editRentalForm.daily_rate) || 0, weekly_rate: parseFloat(editRentalForm.weekly_rate) || 0,
      description: editRentalForm.description || null, current_customer: editRentalForm.current_customer || null, image_url: imageUrl
    };

    const { error } = await supabase.from('rental_fleet').update(payload).eq('id', editingRental.id);
    if (!error) { setEditingRental(null); setRentalImageFile(null); fetchRentals(); }
    else { alert("Database error: " + error.message); }
    setIsUploading(false);
  }

  async function handleAddRentalPayment(e: any) {
    e.preventDefault();
    if (!isAdmin) return;
    setIsUploading(true);
    let receiptUrl = null;

    if (rentalPaymentFile) {
      const fileName = `rental-pay-${Date.now()}-${sanitizeFileName(rentalPaymentFile.name)}`;
      const { error: uploadError } = await supabase.storage.from('invoices').upload(fileName, rentalPaymentFile);
      if (!uploadError) receiptUrl = supabase.storage.from('invoices').getPublicUrl(fileName).data.publicUrl;
    }

    const { error } = await supabase.from('rental_ledger').insert([{
      payment_date: rentalPaymentForm.payment_date || new Date().toISOString().split('T')[0],
      equipment_id: parseInt(rentalPaymentForm.equipment_id),
      customer_name: rentalPaymentForm.customer_name,
      amount_paid: parseFloat(rentalPaymentForm.amount_paid) || 0,
      notes: rentalPaymentForm.notes,
      receipt_url: receiptUrl
    }]);

    if (!error) {
      setIsAddingRentalPayment(false);
      setRentalPaymentForm({ payment_date: '', equipment_id: '', customer_name: '', amount_paid: '', notes: '' });
      setRentalPaymentFile(null);
      fetchRentalLedger();
    } else { alert("Database error: " + error.message); }
    setIsUploading(false);
  }

  async function handleAddRentalMaintenance(e: any) {
    e.preventDefault();
    if (!isAdmin) return;
    setIsUploading(true);
    let invoiceUrl = null;

    if (rentalMaintenanceFile) {
      const fileName = `rental-maint-${Date.now()}-${sanitizeFileName(rentalMaintenanceFile.name)}`;
      const { error: uploadError } = await supabase.storage.from('invoices').upload(fileName, rentalMaintenanceFile);
      if (!uploadError) invoiceUrl = supabase.storage.from('invoices').getPublicUrl(fileName).data.publicUrl;
    }

    const { error } = await supabase.from('rental_maintenance').insert([{
      service_date: rentalMaintenanceForm.service_date || new Date().toISOString().split('T')[0],
      equipment_id: parseInt(rentalMaintenanceForm.equipment_id),
      description: rentalMaintenanceForm.description,
      cost: parseFloat(rentalMaintenanceForm.cost) || 0,
      invoice_number: rentalMaintenanceForm.invoice_number,
      invoice_url: invoiceUrl
    }]);

    if (!error) {
      setIsAddingMaintenance(false);
      setRentalMaintenanceForm({ service_date: '', equipment_id: '', description: '', cost: '', invoice_number: '' });
      setRentalMaintenanceFile(null);
      fetchRentalMaintenance();
    } else { alert("Database error: " + error.message); }
    setIsUploading(false);
  }

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

  async function handleToggleInvoicePaid(e: any, invoiceId: string, currentStatus: boolean) {
    e.stopPropagation(); if (!isAdmin) return;
    const newStatus = !currentStatus;
    setInvoices((prev: any[]) => prev.map(inv => String(inv.id) === String(invoiceId) ? { ...inv, is_paid: newStatus } : inv));
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


  // --- SECURITY LOCK SCREEN ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center font-sans p-4">
        <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-sm border-t-8 border-blue-600">
          <div className="text-center mb-6">
            <div className="text-5xl mb-4">🔒</div>
            <h1 className="text-2xl font-extrabold text-gray-800 uppercase tracking-wide">Secure Access</h1>
            <p className="text-gray-500 text-sm mt-2">Fine Edge Machinery ERP</p>
          </div>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (pinInput === "6542") {
              setIsAuthenticated(true);
              setIsAdmin(true);
            } else {
              alert("Incorrect PIN.");
              setPinInput('');
            }
          }} className="flex flex-col gap-4">
            <input required type="password" value={pinInput} onChange={e => setPinInput(e.target.value)} placeholder="Enter PIN" className="p-4 border border-gray-300 rounded text-center text-3xl tracking-[0.5em] text-black shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-500" autoFocus />
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded transition shadow-md text-lg">Unlock Dashboard</button>
          </form>
        </div>
      </div>
    );
  }

  // --- MAIN ERP DASHBOARD ---
  // Ensure the main app hides if we are trying to print a spec sheet OR a QR sticker
  return (
    <>
      <div className={`min-h-screen bg-gray-100 p-8 ${(specSheetMachine || stickerRental) ? 'print:hidden hidden' : ''}`}>

        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-gray-800">Fine Edge Machines - ERP</h1>
            <button onClick={() => { setIsAuthenticated(false); setPinInput(''); setIsAdmin(false); }} className="text-xs px-3 py-1.5 rounded font-bold transition shadow-sm bg-red-100 text-red-700 border border-red-300 hover:bg-red-200">
              🔒 Lock & Exit
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-6 mb-8">
          <div className="flex-1 min-w-[200px] bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
            <h3 className="text-gray-500 text-sm font-bold uppercase tracking-wide mb-1">Active Shop Machines</h3>
            <p className="text-3xl font-bold text-gray-800">{inShopMachines.length}</p>
          </div>
          <div className="flex-1 min-w-[200px] bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
            <h3 className="text-gray-500 text-sm font-bold uppercase tracking-wide mb-1">Current Inventory Value</h3>
            <p className="text-3xl font-bold text-blue-600">{formatUSD(currentInventoryValue)}</p>
          </div>
          <div className="flex-1 min-w-[200px] bg-white p-6 rounded-lg shadow border-l-4 border-gray-400">
            <h3 className="text-gray-500 text-sm font-bold uppercase tracking-wide mb-1">Total Expenses</h3>
            <p className="text-3xl font-bold text-gray-600">{formatUSD(totalInvoicesValue)}</p>
          </div>

          <div className={`flex-1 min-w-[250px] bg-white p-6 rounded-lg shadow border-l-4 ${currentIvaOwed > 0 ? 'border-red-500' : 'border-teal-500'}`}>
            <div className="flex justify-between items-start mb-1">
              <h3 className="text-gray-500 text-sm font-bold uppercase tracking-wide">Current IVA Owed</h3>
              {isAdmin && <button onClick={() => setIsAddingSatPayment(true)} className="text-xs bg-red-50 text-red-600 hover:bg-red-100 font-bold px-2 py-1 rounded border border-red-200 transition shadow-sm">+ Pay SAT</button>}
            </div>
            <p className={`text-3xl font-bold ${currentIvaOwed > 0 ? 'text-red-600' : 'text-teal-600'}`}>{formatUSD(currentIvaOwed)}</p>
            <div className="text-xs text-gray-600 mt-3 pt-2 border-t flex flex-col gap-1">
              <div className="flex justify-between"><span>Accrued Balance:</span> <span className="font-semibold">{formatUSD(grossIvaBalance)}</span></div>
              <div className="flex justify-between"><span>Paid to SAT:</span> <span className="font-semibold text-green-600">-{formatUSD(totalIvaPaidToSat)}</span></div>
            </div>
          </div>

          <div className={`flex-1 min-w-[250px] bg-white p-6 rounded-lg shadow border-l-4 ${netProfit >= 0 ? 'border-green-500' : 'border-red-500'}`}>
            <div className="flex justify-between items-start mb-1">
              <h3 className="text-gray-500 text-sm font-bold uppercase tracking-wide">Realized Profit</h3>
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-gray-500">Camnosa: $</span>
                <input type="number" step="0.01" value={exchangeRate} onChange={(e) => setExchangeRate(e.target.value)} className="w-16 p-1 text-xs border rounded text-black font-bold focus:outline-none focus:ring-1 focus:ring-green-500 bg-gray-50" disabled={!isAdmin} />
              </div>
            </div>
            <p className={`text-3xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatUSD(netProfit)}</p>
            <div className="mt-2 inline-block bg-green-50 border border-green-200 rounded px-2 py-1">
              <span className="text-sm font-bold text-green-800">MXN {parseFloat(exchangeRate) > 0 ? formatMXN(netProfit * parseFloat(exchangeRate)) : '$0.00'}</span>
            </div>
          </div>

          <div className={`flex-1 min-w-[200px] bg-white p-6 rounded-lg shadow border-l-4 ${netCashFlow >= 0 ? 'border-purple-500' : 'border-red-500'}`}>
            <h3 className="text-gray-500 text-sm font-bold uppercase tracking-wide mb-1">Net Cash Flow</h3>
            <p className={`text-3xl font-bold ${netCashFlow >= 0 ? 'text-purple-600' : 'text-red-600'}`}>{formatUSD(netCashFlow)}</p>
            <p className="text-xs text-gray-400 mt-1">Total in vs. Total out</p>
          </div>

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

        <div className="flex justify-between items-end mb-8 border-b pb-4">
          <div className="flex gap-4">
            <button onClick={() => setActiveTab('kanban')} className={`px-6 py-2 rounded font-bold transition ${activeTab === 'kanban' ? 'bg-blue-600 text-white shadow' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>🏗️ Machinery Board</button>
            <button onClick={() => setActiveTab('rentals')} className={`px-6 py-2 rounded font-bold transition ${activeTab === 'rentals' ? 'bg-orange-600 text-white shadow' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>🚜 Rental Fleet</button>
            <button onClick={() => setActiveTab('invoices')} className={`px-6 py-2 rounded font-bold transition ${activeTab === 'invoices' ? 'bg-blue-600 text-white shadow' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>💰 Parts & Purchases</button>
            <button onClick={() => setActiveTab('sat')} className={`px-6 py-2 rounded font-bold transition ${activeTab === 'sat' ? 'bg-red-600 text-white shadow' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>🏛️ SAT Records</button>
            <button onClick={() => setActiveTab('rental_finances')} className={`px-6 py-2 rounded font-bold transition ${activeTab === 'rental_finances' ? 'bg-green-600 text-white shadow' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>📈 Rental Finances</button>
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
          {activeTab === 'rentals' && (
            <div className="flex gap-4 items-center">
              <input type="text" placeholder="🔍 Search fleet or customer..." className="p-2 border border-gray-300 rounded text-black w-64 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              {isAdmin && (
                <button onClick={() => setIsAddingRental(true)} className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded font-bold shadow transition">+ Add Equipment</button>
              )}
            </div>
          )}
          {activeTab === 'invoices' && isAdmin && (
            <div className="flex gap-4 items-center">
              <button onClick={exportInvoices} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-bold shadow transition">📊 Export CSV</button>
            </div>
          )}
          {activeTab === 'rental_finances' && isAdmin && (
            <div className="flex gap-4 items-center">
              <button onClick={() => setIsAddingMaintenance(true)} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-bold shadow transition">+ Log Maintenance</button>
              <button onClick={() => setIsAddingRentalPayment(true)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-bold shadow transition">+ Log Rental Income</button>
            </div>
          )}
        </div>


        {/* ==================== TAB 1: KANBAN BOARD (MACHINERY - USD) ==================== */}
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

                        {machine.category && machine.category !== 'Other' && (
                          <span className="inline-block bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded font-bold mt-1 mb-2">{machine.category}</span>
                        )}
                        <p className="text-sm text-gray-500 mb-2">SN: {machine.serial_number}</p>

                        {machine.video_url && (
                          <a href={machine.video_url} target="_blank" rel="noopener noreferrer" className="text-xs text-red-600 font-bold mb-2 flex items-center gap-1 hover:underline" onClick={(e) => e.stopPropagation()}>
                            ▶ Video Attached
                          </a>
                        )}

                        {machine.status === 'Sold' && (
                          <div className="bg-gray-50 border p-2 rounded text-xs mb-2 mt-2">
                            <span className="font-bold text-gray-700">Sold for:</span> {formatUSD(machine.sale_price)} <br />
                            <span className="font-bold text-gray-700">IVA:</span> {formatUSD(machine.sale_iva)} <br />

                            {!machine.is_paid && (machine.invoice_date || machine.due_date) && (
                              <div className="mt-2 mb-2 bg-yellow-50 border border-yellow-200 p-2 rounded text-xs flex justify-between items-center">
                                <div>
                                  <span className="font-bold text-gray-700">Inv Sent:</span> {machine.invoice_date || 'N/A'} <br />
                                  <span className="font-bold text-gray-700">Due Date:</span> <span className={isOverdue ? 'text-red-600 font-extrabold' : 'text-gray-800 font-bold'}>{machine.due_date || 'N/A'} {isOverdue && '(OVERDUE)'}</span>
                                </div>
                                {machine.due_date && (
                                  <button onClick={(e) => handleAddToCalendar(e, `Payment Due: ${machine.machine_name}`, machine.due_date, `Expected Amount: ${formatUSD(machine.sale_price)}`)} className="text-xl hover:scale-110 transition pr-2" title="Add to Calendar">📅</button>
                                )}
                              </div>
                            )}

                            <span className={`font-bold mt-2 block border-t pt-1 ${machineProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>Profit: {formatUSD(machineProfit)}</span>
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
                          <span className="text-gray-800 font-bold">{formatUSD(calculateTotalCost(machine))}</span>
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

        {/* ==================== TAB 2: KANBAN BOARD (RENTALS - MXN) ==================== */}
        {activeTab === 'rentals' && (
          <div className="flex gap-6 overflow-x-auto pb-4">
            {RENTAL_COLUMNS.map(column => (
              <div key={column} className="bg-gray-200 p-4 rounded-lg w-80 flex-shrink-0 min-h-[500px]" onDragOver={handleDragOver} onDrop={(e) => handleRentalDrop(e, column)}>
                <h2 className="font-bold text-lg mb-4 text-gray-700 uppercase tracking-wide border-b-2 border-gray-300 pb-2">{column} ({filteredRentals.filter((r: any) => r.status === column).length})</h2>
                <div className="flex flex-col gap-4">
                  {filteredRentals.filter((r: any) => r.status === column).map((rental: any) => (
                    <div key={rental.id} draggable={isAdmin} onDragStart={(e) => handleRentalDragStart(e, rental.id)} className={`bg-white p-4 rounded shadow ${isAdmin ? 'cursor-grab active:cursor-grabbing' : ''} border-l-4 ${column === 'Available' ? 'border-green-500' : column === 'Out on Rent' ? 'border-orange-500' : column === 'In Transit' ? 'border-blue-500' : column === 'Retired' ? 'border-gray-800 opacity-75' : 'border-red-500'} hover:shadow-lg transition transform hover:-translate-y-1`}>
                      {rental.image_url && <img src={rental.image_url} alt="Equipment" className="w-full h-32 object-cover rounded mb-3 border" />}
                      <h3 className="font-bold text-gray-800">{rental.equipment_name}</h3>
                      {rental.category && rental.category !== 'Other' && (
                        <span className="inline-block bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded font-bold mt-1 mb-2 border border-orange-200">{rental.category}</span>
                      )}
                      <p className="text-sm text-gray-500 mb-2">SN: {rental.serial_number || 'N/A'}</p>

                      <div className="bg-gray-50 border p-2 rounded text-xs mb-3">
                        <div className="flex justify-between mb-1"><span className="font-bold text-gray-700">Daily (MXN):</span> <span className="font-semibold">{formatMXN(rental.daily_rate)}</span></div>
                        <div className="flex justify-between"><span className="font-bold text-gray-700">Weekly (MXN):</span> <span className="font-semibold">{formatMXN(rental.weekly_rate)}</span></div>
                      </div>

                      {column === 'Out on Rent' && rental.current_customer && (
                        <div className="bg-orange-50 border border-orange-200 p-2 rounded text-xs mb-3">
                          <span className="font-bold text-orange-800 uppercase block mb-1">Current Renter:</span>
                          <span className="text-gray-800 font-semibold">{rental.current_customer}</span>
                        </div>
                      )}

                      {column === 'Retired' && (
                        <div className="bg-gray-200 border border-gray-300 p-2 rounded text-xs mb-3 text-center font-bold text-gray-600 uppercase tracking-widest">
                          Out of Service
                        </div>
                      )}

                      {isAdmin && (
                        <button onClick={() => openEditRentalModal(rental)} className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold py-2 rounded transition border border-blue-200 mt-2">
                          ✏️ Edit / Assign Renter
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ==================== TAB 3: INVOICES (UNTOUCHED) ==================== */}
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
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==================== TAB 4: SAT (UNTOUCHED) ==================== */}
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

        {/* ==================== TAB 5: ADVANCED RENTAL FINANCES ==================== */}
        {activeTab === 'rental_finances' && (
          <div className="bg-white p-6 rounded-lg shadow min-h-[500px]">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="text-2xl font-bold text-gray-800">Rental Ledger & ROI</h2>
              {isAdmin && (
                <div className="flex gap-4">
                  <button onClick={() => setIsAddingMaintenance(true)} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-bold shadow transition">+ Log Maintenance</button>
                  <button onClick={() => setIsAddingRentalPayment(true)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-bold shadow transition">+ Log Rental Income</button>
                </div>
              )}
            </div>

            {/* TOP METRICS ROW */}
            <div className="flex gap-6 mb-10">
              <div className="flex-1 bg-green-50 border-l-8 border-green-600 p-6 rounded-lg shadow-sm">
                <span className="text-xs font-extrabold text-green-800 uppercase tracking-widest block mb-1">Gross Rental Revenue</span>
                <span className="text-3xl font-black text-green-700">{formatMXN(totalRentalRevenue)}</span>
              </div>
              <div className="flex-1 bg-red-50 border-l-8 border-red-600 p-6 rounded-lg shadow-sm">
                <span className="text-xs font-extrabold text-red-800 uppercase tracking-widest block mb-1">Total Maintenance Costs</span>
                <span className="text-3xl font-black text-red-700">{formatMXN(totalRentalMaintenanceCost)}</span>
              </div>
              <div className="flex-1 bg-blue-50 border-l-8 border-blue-600 p-6 rounded-lg shadow-sm">
                <span className="text-xs font-extrabold text-blue-800 uppercase tracking-widest block mb-1">Net Rental Profit</span>
                <span className="text-3xl font-black text-blue-700">{formatMXN(netRentalProfit)}</span>
              </div>
            </div>

            {/* ROI CARDS (NOW INCLUDING CAPEX) */}
            <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Lifetime Machine ROI</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {rentals.map(machine => {
                const machineRevenue = rentalLedger.filter(p => String(p.equipment_id) === String(machine.id)).reduce((sum, p) => sum + Number(p.amount_paid), 0);
                const machineCost = rentalMaintenance.filter(m => String(m.equipment_id) === String(machine.id)).reduce((sum, m) => sum + Number(m.cost), 0);
                const machinePurchaseCost = Number(machine.purchase_cost) || 0;

                const netMachineROI = machineRevenue - machineCost - machinePurchaseCost;

                return (
                  <div key={machine.id} className={`bg-white border p-5 rounded-lg shadow-sm flex flex-col hover:shadow-md transition ${machine.status === 'Retired' ? 'border-gray-800 opacity-60' : 'border-gray-200'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-extrabold text-gray-800 text-lg leading-tight">{machine.equipment_name}</span>
                      {machine.status === 'Available' ? (
                        <span className="w-3 h-3 rounded-full bg-green-500 shadow" title="Available"></span>
                      ) : machine.status === 'Out on Rent' ? (
                        <span className="w-3 h-3 rounded-full bg-orange-500 shadow" title="Out on Rent"></span>
                      ) : machine.status === 'Retired' ? (
                        <span className="w-3 h-3 rounded-full bg-gray-800 shadow" title="Retired / Out of Service"></span>
                      ) : (
                        <span className="w-3 h-3 rounded-full bg-gray-400 shadow" title="Maintenance / Transit"></span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 font-mono mb-4 bg-gray-100 px-2 py-1 rounded self-start">SN: {machine.serial_number || 'N/A'}</span>

                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-gray-500 uppercase">Gross Revenue:</span>
                      <span className="text-green-600">{formatMXN(machineRevenue)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-gray-500 uppercase">Maintenance:</span>
                      <span className="text-red-600">-{formatMXN(machineCost)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold mb-4 pb-2 border-b">
                      <span className="text-gray-500 uppercase">CapEx (Purchase):</span>
                      <span className="text-red-600">-{formatMXN(machinePurchaseCost)}</span>
                    </div>

                    <div className="mt-auto pt-2 flex justify-between items-end">
                      <span className="text-xs font-extrabold text-gray-800 uppercase tracking-widest">True Net ROI</span>
                      <span className={`text-2xl font-black ${netMachineROI >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatMXN(netMachineROI)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* LEDGER TOGGLE AND TABLES */}
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="text-xl font-bold text-gray-800">Financial Ledgers</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setRentalLedgerView('income')}
                  className={`px-4 py-1.5 rounded font-bold text-sm transition ${rentalLedgerView === 'income' ? 'bg-green-600 text-white shadow' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                >
                  Income Ledger
                </button>
                <button
                  onClick={() => setRentalLedgerView('maintenance')}
                  className={`px-4 py-1.5 rounded font-bold text-sm transition ${rentalLedgerView === 'maintenance' ? 'bg-red-600 text-white shadow' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                >
                  Maintenance Ledger
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              {rentalLedgerView === 'income' ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-green-50 text-green-800">
                      <th className="p-3 border-b font-bold uppercase text-xs tracking-wider">Date</th>
                      <th className="p-3 border-b font-bold uppercase text-xs tracking-wider">Equipment Rented</th>
                      <th className="p-3 border-b font-bold uppercase text-xs tracking-wider">Customer Name</th>
                      <th className="p-3 border-b font-bold uppercase text-xs tracking-wider">Amount Paid</th>
                      <th className="p-3 border-b font-bold uppercase text-xs tracking-wider">Notes</th>
                      <th className="p-3 border-b font-bold uppercase text-xs tracking-wider">Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rentalLedger.length === 0 ? <tr><td colSpan={6} className="p-6 text-center text-gray-500 font-bold">No rental payments logged yet.</td></tr> : (
                      rentalLedger.map((log: any) => (
                        <tr key={log.id} className="hover:bg-gray-50 border-b text-gray-800">
                          <td className="p-3 text-sm font-semibold">{log.payment_date}</td>
                          <td className="p-3 text-sm font-bold text-gray-700">
                            {log.rental_fleet?.equipment_name || 'Deleted Equipment'}
                            <span className="block text-xs text-gray-400 font-mono font-normal">SN: {log.rental_fleet?.serial_number || 'N/A'}</span>
                          </td>
                          <td className="p-3 text-sm">{log.customer_name}</td>
                          <td className="p-3 font-extrabold text-green-700">+{formatMXN(log.amount_paid)}</td>
                          <td className="p-3 text-sm text-gray-600 italic max-w-xs truncate">{log.notes || '-'}</td>
                          <td className="p-3">
                            {log.receipt_url ? (
                              <a href={log.receipt_url} target="_blank" rel="noreferrer" className="text-green-600 hover:underline text-sm font-bold">📄 View</a>
                            ) : <span className="text-gray-400 text-sm">-</span>}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-red-50 text-red-800">
                      <th className="p-3 border-b font-bold uppercase text-xs tracking-wider">Service Date</th>
                      <th className="p-3 border-b font-bold uppercase text-xs tracking-wider">Equipment Serviced</th>
                      <th className="p-3 border-b font-bold uppercase text-xs tracking-wider">Service Description</th>
                      <th className="p-3 border-b font-bold uppercase text-xs tracking-wider">Invoice #</th>
                      <th className="p-3 border-b font-bold uppercase text-xs tracking-wider">Cost</th>
                      <th className="p-3 border-b font-bold uppercase text-xs tracking-wider">Invoice</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rentalMaintenance.length === 0 ? <tr><td colSpan={6} className="p-6 text-center text-gray-500 font-bold">No maintenance records logged yet.</td></tr> : (
                      rentalMaintenance.map((log: any) => (
                        <tr key={log.id} className="hover:bg-gray-50 border-b text-gray-800">
                          <td className="p-3 text-sm font-semibold">{log.service_date}</td>
                          <td className="p-3 text-sm font-bold text-gray-700">
                            {log.rental_fleet?.equipment_name || 'Deleted Equipment'}
                            <span className="block text-xs text-gray-400 font-mono font-normal">SN: {log.rental_fleet?.serial_number || 'N/A'}</span>
                          </td>
                          <td className="p-3 text-sm">{log.description}</td>
                          <td className="p-3 text-sm text-gray-500">{log.invoice_number || '-'}</td>
                          <td className="p-3 font-extrabold text-red-600">-{formatMXN(log.cost)}</td>
                          <td className="p-3">
                            {log.invoice_url ? (
                              <a href={log.invoice_url} target="_blank" rel="noreferrer" className="text-red-600 hover:underline text-sm font-bold">📄 View</a>
                            ) : <span className="text-gray-400 text-sm">-</span>}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* --- MODALS (MACHINERY - USD LABELS ADDED) --- */}
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
                <input required placeholder="Machine Name" className="p-2 border rounded text-black" value={formData.machine_name} onChange={e => setFormData({ ...formData, machine_name: e.target.value })} />
                <input required placeholder="Category (e.g., Laser, CNC, Welder)" className="p-2 border rounded text-black bg-gray-50 font-semibold" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} />
                <input required placeholder="Serial Number" className="p-2 border rounded text-black" value={formData.serial_number} onChange={e => setFormData({ ...formData, serial_number: e.target.value })} />
                <textarea placeholder="Machine Description / Specs" className="p-2 border rounded text-black h-24" value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                <input type="url" placeholder="YouTube/Drive Video Link (Optional)" className="p-2 border rounded text-black" value={formData.video_url} onChange={e => setFormData({ ...formData, video_url: e.target.value })} />
                <div className="flex gap-4">
                  <div className="w-1/2">
                    <label className="block text-xs font-bold text-gray-500 uppercase">Purchase Price (USD)</label>
                    <input type="number" step="0.01" className="p-2 w-full border rounded text-black font-bold" value={formData.purchase_price} onChange={e => setFormData({ ...formData, purchase_price: e.target.value })} />
                  </div>
                  <div className="w-1/2">
                    <label className="flex justify-between text-xs font-bold text-gray-500 uppercase">
                      <span>IVA Paid (USD)</span>
                      <button type="button" tabIndex={-1} onClick={() => setFormData({ ...formData, purchase_iva: calculateIva(formData.purchase_price || 0) })} className="text-blue-600 hover:underline">Auto 16%</button>
                    </label>
                    <input type="number" step="0.01" className="p-2 w-full border rounded text-black text-red-600" value={formData.purchase_iva} onChange={e => setFormData({ ...formData, purchase_iva: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase">Shipping & Import (USD - No IVA)</label>
                  <div className="flex gap-4 mt-1">
                    <input type="number" step="0.01" placeholder="Shipping Cost" className="p-2 w-1/2 border rounded text-black" value={formData.shipping_in_cost} onChange={e => setFormData({ ...formData, shipping_in_cost: e.target.value })} />
                    <input type="number" step="0.01" placeholder="Import Fee" className="p-2 w-1/2 border rounded text-black" value={formData.import_fee} onChange={e => setFormData({ ...formData, import_fee: e.target.value })} />
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

        {editingMachine && isAdmin && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl border-t-8 border-blue-500 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-4 text-gray-800">Edit Machine Details</h2>
              <form onSubmit={handleUpdateMachine} className="flex flex-col gap-4">
                <input required placeholder="Machine Name" className="p-2 border rounded text-black" value={editFormData.machine_name} onChange={e => setEditFormData({ ...editFormData, machine_name: e.target.value })} />
                <input required placeholder="Category (e.g., Laser, CNC, Welder)" className="p-2 border rounded text-black bg-gray-50 font-semibold" value={editFormData.category} onChange={e => setEditFormData({ ...editFormData, category: e.target.value })} />
                <input required placeholder="Serial Number" className="p-2 border rounded text-black" value={editFormData.serial_number} onChange={e => setEditFormData({ ...editFormData, serial_number: e.target.value })} />
                <textarea placeholder="Machine Description / Specs" className="p-2 border rounded text-black h-24" value={editFormData.description || ''} onChange={e => setEditFormData({ ...editFormData, description: e.target.value })} />
                <input type="url" placeholder="YouTube/Drive Video Link (Optional)" className="p-2 border rounded text-black" value={editFormData.video_url} onChange={e => setEditFormData({ ...editFormData, video_url: e.target.value })} />
                <div className="flex gap-4">
                  <div className="w-1/2">
                    <label className="block text-xs font-bold text-gray-500 uppercase">Purchase Price (USD)</label>
                    <input type="number" step="0.01" className="p-2 w-full border rounded text-black font-bold" value={editFormData.purchase_price} onChange={e => setEditFormData({ ...editFormData, purchase_price: e.target.value })} />
                  </div>
                  <div className="w-1/2">
                    <label className="flex justify-between text-xs font-bold text-gray-500 uppercase">
                      <span>IVA Paid (USD)</span>
                      <button type="button" tabIndex={-1} onClick={() => setEditFormData({ ...editFormData, purchase_iva: calculateIva(editFormData.purchase_price || 0) })} className="text-blue-600 hover:underline">Auto 16%</button>
                    </label>
                    <input type="number" step="0.01" className="p-2 w-full border rounded text-black text-red-600" value={editFormData.purchase_iva} onChange={e => setEditFormData({ ...editFormData, purchase_iva: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase">Shipping & Import (USD - No IVA)</label>
                  <div className="flex gap-4 mt-1">
                    <input type="number" step="0.01" placeholder="Shipping Cost" className="p-2 w-1/2 border rounded text-black" value={editFormData.shipping_in_cost} onChange={e => setEditFormData({ ...editFormData, shipping_in_cost: e.target.value })} />
                    <input type="number" step="0.01" placeholder="Import Fee" className="p-2 w-1/2 border rounded text-black" value={editFormData.import_fee} onChange={e => setEditFormData({ ...editFormData, import_fee: e.target.value })} />
                  </div>
                </div>
                {editingMachine.status === 'Sold' && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded mt-2">
                    <h3 className="text-xs font-bold text-gray-700 mb-2 uppercase">Accounts Receivable Dates</h3>
                    <div className="flex gap-4">
                      <div className="w-1/2">
                        <label className="block text-xs font-bold text-gray-500 mb-1">Invoice Sent</label>
                        <input type="date" className="p-2 w-full border rounded text-black" value={editFormData.invoice_date} onChange={e => setEditFormData({ ...editFormData, invoice_date: e.target.value })} />
                      </div>
                      <div className="w-1/2">
                        <label className="block text-xs font-bold text-gray-500 mb-1">Due Date</label>
                        <input type="date" className="p-2 w-full border rounded text-black" value={editFormData.due_date} onChange={e => setEditFormData({ ...editFormData, due_date: e.target.value })} />
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

        {/* --- MACHINERY SELL MODAL (USD) --- */}
        {sellingMachine && isAdmin && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl border-t-8 border-green-600">
              <h2 className="text-2xl font-bold mb-4 text-gray-800">Complete Sale: {sellingMachine.machine_name}</h2>
              <form onSubmit={handleSellMachine} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Sale Price (USD)</label>
                  <input required type="number" step="0.01" className="p-2 w-full border rounded text-black font-bold text-lg" value={sellForm.sale_price} onChange={e => setSellForm({ ...sellForm, sale_price: e.target.value })} />
                </div>
                <div>
                  <label className="flex justify-between text-xs font-bold text-gray-500 uppercase mb-1">
                    <span>IVA Charged (USD)</span>
                    <button type="button" tabIndex={-1} onClick={() => setSellForm({ ...sellForm, sale_iva: calculateIva(sellForm.sale_price || 0) })} className="text-blue-600 hover:underline">Auto 16%</button>
                  </label>
                  <input required type="number" step="0.01" className="p-2 w-full border rounded text-black text-red-600" value={sellForm.sale_iva} onChange={e => setSellForm({ ...sellForm, sale_iva: e.target.value })} />
                </div>
                <label className="flex items-center gap-2 mt-2 p-3 bg-gray-50 border rounded cursor-pointer hover:bg-gray-100">
                  <input type="checkbox" className="w-5 h-5 text-green-600" checked={sellForm.is_paid} onChange={e => setSellForm({ ...sellForm, is_paid: e.target.checked })} />
                  <span className="text-sm font-bold text-gray-700">Customer Paid in Full?</span>
                </label>
                <div className="flex gap-4">
                  <div className="w-1/2">
                    <label className="block text-xs font-bold text-gray-500 mb-1">Invoice Date</label>
                    <input type="date" className="p-2 w-full border rounded text-black" value={sellForm.invoice_date} onChange={e => handleInvoiceDateChange(e, 'sellForm')} />
                  </div>
                  <div className="w-1/2">
                    <label className="block text-xs font-bold text-gray-500 mb-1">Due Date</label>
                    <input type="date" className="p-2 w-full border rounded text-black" value={sellForm.due_date} onChange={e => setSellForm({ ...sellForm, due_date: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1 mt-2">Upload Outbound Invoice</label>
                  <input type="file" accept=".pdf,image/*" onChange={(e: any) => setSaleInvoiceFile(e.target.files[0])} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700" />
                </div>
                <div className="flex justify-end gap-2 mt-4 border-t pt-4">
                  <button type="button" onClick={() => { setSellingMachine(null); fetchInventory(); }} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded font-bold">Cancel</button>
                  <button type="submit" disabled={isUploading} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-bold">Finalize Sale</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* --- ADD RENTAL MODAL (MXN) --- */}
        {isAddingRental && isAdmin && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto border-t-8 border-orange-500">
              <h2 className="text-2xl font-bold mb-4 text-gray-800">Add Rental Equipment</h2>
              <form onSubmit={handleAddRental} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Equipment Photo</label>
                  <input type="file" accept="image/*" onChange={(e: any) => setRentalImageFile(e.target.files[0])} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700" />
                </div>
                <input required placeholder="Equipment Name (e.g., Genie Boom Lift)" className="p-2 border rounded text-black" value={rentalForm.equipment_name} onChange={e => setRentalForm({ ...rentalForm, equipment_name: e.target.value })} />
                <input required placeholder="Category (e.g., Lifts, Trenchers)" className="p-2 border rounded text-black bg-gray-50 font-semibold" value={rentalForm.category} onChange={e => setRentalForm({ ...rentalForm, category: e.target.value })} />
                <input placeholder="Serial Number (Optional)" className="p-2 border rounded text-black" value={rentalForm.serial_number} onChange={e => setRentalForm({ ...rentalForm, serial_number: e.target.value })} />

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Initial Purchase Cost (MXN)</label>
                  <input required type="number" step="0.01" placeholder="e.g. 150000" className="p-2 w-full border rounded text-black font-bold text-red-600" value={rentalForm.purchase_cost} onChange={e => setRentalForm({ ...rentalForm, purchase_cost: e.target.value })} />
                </div>

                <textarea placeholder="Equipment Description / Specs" className="p-2 border rounded text-black h-24" value={rentalForm.description || ''} onChange={e => setRentalForm({ ...rentalForm, description: e.target.value })} />
                <div className="flex gap-4">
                  <div className="w-1/2">
                    <label className="block text-xs font-bold text-gray-500 uppercase">Daily Rate (MXN)</label>
                    <input required type="number" step="0.01" className="p-2 w-full border rounded text-black font-bold text-orange-700" value={rentalForm.daily_rate} onChange={e => setRentalForm({ ...rentalForm, daily_rate: e.target.value })} />
                  </div>
                  <div className="w-1/2">
                    <label className="block text-xs font-bold text-gray-500 uppercase">Weekly Rate (MXN)</label>
                    <input required type="number" step="0.01" className="p-2 w-full border rounded text-black font-bold text-orange-700" value={rentalForm.weekly_rate} onChange={e => setRentalForm({ ...rentalForm, weekly_rate: e.target.value })} />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button type="button" onClick={() => setIsAddingRental(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                  <button type="submit" disabled={isUploading} className="px-4 py-2 bg-orange-600 text-white rounded font-bold hover:bg-orange-700">Save to Fleet</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* --- EDIT RENTAL MODAL (WITH PRO STICKER PREVIEW) --- */}
        {editingRental && isAdmin && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl border-t-8 border-orange-500 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-4 text-gray-800">Edit Rental Details</h2>
              <form onSubmit={handleUpdateRental} className="flex flex-col gap-4">
                <input required placeholder="Equipment Name" className="p-2 border rounded text-black" value={editRentalForm.equipment_name} onChange={e => setEditRentalForm({ ...editRentalForm, equipment_name: e.target.value })} />
                <input required placeholder="Category" className="p-2 border rounded text-black bg-gray-50 font-semibold" value={editRentalForm.category} onChange={e => setEditRentalForm({ ...editRentalForm, category: e.target.value })} />
                <input placeholder="Serial Number" className="p-2 border rounded text-black" value={editRentalForm.serial_number} onChange={e => setEditRentalForm({ ...editRentalForm, serial_number: e.target.value })} />

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Initial Purchase Cost (MXN)</label>
                  <input required type="number" step="0.01" className="p-2 w-full border rounded text-black font-bold text-red-600" value={editRentalForm.purchase_cost} onChange={e => setEditRentalForm({ ...editRentalForm, purchase_cost: e.target.value })} />
                </div>

                <textarea placeholder="Equipment Description / Specs" className="p-2 border rounded text-black h-24" value={editRentalForm.description || ''} onChange={e => setEditRentalForm({ ...editRentalForm, description: e.target.value })} />

                <div className="flex gap-4">
                  <div className="w-1/2">
                    <label className="block text-xs font-bold text-gray-500 uppercase">Daily Rate (MXN)</label>
                    <input required type="number" step="0.01" className="p-2 w-full border rounded text-black font-bold text-orange-700" value={editRentalForm.daily_rate} onChange={e => setEditRentalForm({ ...editRentalForm, daily_rate: e.target.value })} />
                  </div>
                  <div className="w-1/2">
                    <label className="block text-xs font-bold text-gray-500 uppercase">Weekly Rate (MXN)</label>
                    <input required type="number" step="0.01" className="p-2 w-full border rounded text-black font-bold text-orange-700" value={editRentalForm.weekly_rate} onChange={e => setEditRentalForm({ ...editRentalForm, weekly_rate: e.target.value })} />
                  </div>
                </div>

                <div className="bg-orange-50 p-3 rounded border border-orange-200 mt-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Current Renter / Customer Name</label>
                  <input placeholder="Leave blank if available" className="p-2 w-full border rounded text-black" value={editRentalForm.current_customer || ''} onChange={e => setEditRentalForm({ ...editRentalForm, current_customer: e.target.value })} />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1 mt-2">Upload/Replace Photo</label>
                  <input type="file" accept="image/*" onChange={(e: any) => setRentalImageFile(e.target.files[0])} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700" />
                  {editingRental.image_url && <p className="text-xs text-orange-600 mt-1">An image is currently attached.</p>}
                </div>

                {/* BRAND NEW: PRO STICKER PREVIEW BUTTON */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex flex-col items-center justify-center text-center mt-2">
                  <h3 className="text-sm font-bold text-gray-800 uppercase mb-2">Machine ID Sticker</h3>
                  <p className="text-xs text-gray-500 mb-4">Generate the physical, branded QR sticker for this machine.</p>
                  <button
                    type="button"
                    onClick={() => setStickerRental(editingRental)}
                    className="w-full bg-gray-800 hover:bg-black text-white font-bold py-3 px-4 rounded transition shadow uppercase tracking-wider text-sm"
                  >
                    👁️ Preview & Print Sticker
                  </button>
                </div>

                <div className="flex justify-end gap-2 mt-4 border-t pt-4">
                  <button type="button" onClick={() => setEditingRental(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                  <button type="submit" disabled={isUploading} className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded font-bold">Update Equipment</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* --- ADD RENTAL PAYMENT MODAL --- */}
        {isAddingRentalPayment && isAdmin && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl border-t-8 border-green-600 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-4 text-gray-800">Log Rental Payment</h2>
              <form onSubmit={handleAddRentalPayment} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Payment Date</label>
                  <input required type="date" className="p-2 w-full border rounded text-black" value={rentalPaymentForm.payment_date} onChange={e => setRentalPaymentForm({ ...rentalPaymentForm, payment_date: e.target.value })} />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Select Equipment</label>
                  <select required className="p-2 w-full border rounded text-black bg-gray-50" value={rentalPaymentForm.equipment_id} onChange={e => setRentalPaymentForm({ ...rentalPaymentForm, equipment_id: e.target.value })}>
                    <option value="">-- Choose Machine --</option>
                    {rentals.map((r: any) => (
                      <option key={r.id} value={r.id}>{r.equipment_name} (SN: {r.serial_number || 'N/A'})</option>
                    ))}
                  </select>
                </div>

                <input required placeholder="Customer Name" className="p-2 border rounded text-black" value={rentalPaymentForm.customer_name} onChange={e => setRentalPaymentForm({ ...rentalPaymentForm, customer_name: e.target.value })} />

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Amount Paid (MXN)</label>
                  <input required type="number" step="0.01" placeholder="e.g. 11000" className="p-2 w-full border rounded text-black font-extrabold text-green-700 text-lg" value={rentalPaymentForm.amount_paid} onChange={e => setRentalPaymentForm({ ...rentalPaymentForm, amount_paid: e.target.value })} />
                </div>

                <textarea placeholder="Notes (e.g. 1 Week Rental + Delivery Fee)" className="p-2 border rounded text-black h-20" value={rentalPaymentForm.notes} onChange={e => setRentalPaymentForm({ ...rentalPaymentForm, notes: e.target.value })} />

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Upload Receipt (Optional)</label>
                  <input type="file" accept=".pdf,image/*" onChange={(e: any) => setRentalPaymentFile(e.target.files[0])} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700" />
                </div>

                <div className="flex justify-end gap-2 mt-4 border-t pt-4">
                  <button type="button" onClick={() => setIsAddingRentalPayment(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded font-bold">Cancel</button>
                  <button type="submit" disabled={isUploading} className="px-4 py-2 bg-green-600 text-white rounded font-bold hover:bg-green-700 shadow">Save Payment</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* --- ADD RENTAL MAINTENANCE MODAL --- */}
        {isAddingMaintenance && isAdmin && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl border-t-8 border-red-600 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-4 text-gray-800">Log Rental Maintenance</h2>
              <form onSubmit={handleAddRentalMaintenance} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Service Date</label>
                  <input required type="date" className="p-2 w-full border rounded text-black" value={rentalMaintenanceForm.service_date} onChange={e => setRentalMaintenanceForm({ ...rentalMaintenanceForm, service_date: e.target.value })} />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Select Equipment</label>
                  <select required className="p-2 w-full border rounded text-black bg-gray-50" value={rentalMaintenanceForm.equipment_id} onChange={e => setRentalMaintenanceForm({ ...rentalMaintenanceForm, equipment_id: e.target.value })}>
                    <option value="">-- Choose Machine --</option>
                    {rentals.map((r: any) => (
                      <option key={r.id} value={r.id}>{r.equipment_name} (SN: {r.serial_number || 'N/A'})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Service Description</label>
                  <input required placeholder="e.g. New Tracks, Oil Change" className="p-2 w-full border rounded text-black" value={rentalMaintenanceForm.description} onChange={e => setRentalMaintenanceForm({ ...rentalMaintenanceForm, description: e.target.value })} />
                </div>

                <div className="flex gap-4">
                  <div className="w-1/2">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Invoice / Ref #</label>
                    <input placeholder="Optional" className="p-2 w-full border rounded text-black" value={rentalMaintenanceForm.invoice_number} onChange={e => setRentalMaintenanceForm({ ...rentalMaintenanceForm, invoice_number: e.target.value })} />
                  </div>
                  <div className="w-1/2">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Total Cost (MXN)</label>
                    <input required type="number" step="0.01" placeholder="e.g. 4500" className="p-2 w-full border rounded text-black font-extrabold text-red-600 text-lg" value={rentalMaintenanceForm.cost} onChange={e => setRentalMaintenanceForm({ ...rentalMaintenanceForm, cost: e.target.value })} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Upload Invoice (Optional)</label>
                  <input type="file" accept=".pdf,image/*" onChange={(e: any) => setRentalMaintenanceFile(e.target.files[0])} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700" />
                </div>

                <div className="flex justify-end gap-2 mt-4 border-t pt-4">
                  <button type="button" onClick={() => setIsAddingMaintenance(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded font-bold">Cancel</button>
                  <button type="submit" disabled={isUploading} className="px-4 py-2 bg-red-600 text-white rounded font-bold hover:bg-red-700 shadow">Save Expense</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* --- REPAIR MANAGER MODAL (MACHINERY - UNTOUCHED) --- */}
        {selectedMachine && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl shadow-xl flex flex-col max-h-[90vh]">
              <div className="flex justify-between items-start mb-4">
                <div><h2 className="text-2xl font-bold text-gray-800">{selectedMachine.machine_name}</h2><p className="text-gray-500">SN: {selectedMachine.serial_number}</p></div>
                <button onClick={() => setSelectedMachine(null)} className="text-gray-500 hover:text-red-500 text-2xl font-bold">&times;</button>
              </div>
              {selectedMachine.image_url && <img src={selectedMachine.image_url} alt="Machine" className="w-full h-48 object-cover rounded mb-4 border" />}
              <div className="bg-gray-100 p-4 rounded mb-4 flex justify-between text-lg"><span className="font-semibold text-gray-700">Total Invested Cost:</span><span className="font-bold text-orange-600">{formatUSD(calculateTotalCost(selectedMachine))}</span></div>
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
                          <div className="flex items-center gap-4"><span className="font-medium text-green-700">{formatUSD(log.part_cost)}</span><button onClick={() => handleDeleteRepair(log.id)} className="text-red-500 hover:text-red-700 text-sm font-bold">X</button></div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {isAdmin && (
                <form onSubmit={handleAddRepair} className="bg-blue-50 p-4 rounded border border-blue-100 flex flex-col gap-2">
                  <div className="flex gap-2 w-full">
                    <input required placeholder="Fix (e.g., New Motor)" className="flex-grow p-2 border rounded text-black" value={repairForm.item_description} onChange={e => setRepairForm({ ...repairForm, item_description: e.target.value })} />
                    <input required type="number" step="0.01" placeholder="Cost" className="w-24 p-2 border rounded text-black" value={repairForm.part_cost} onChange={e => setRepairForm({ ...repairForm, part_cost: e.target.value })} />
                    <input type="number" step="0.1" placeholder="Hours" className="w-24 p-2 border rounded text-black" value={repairForm.labor_hours} onChange={e => setRepairForm({ ...repairForm, labor_hours: e.target.value })} />
                    <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-4 rounded font-bold">+</button>
                  </div>
                  <select className="w-full p-2 border rounded text-sm text-gray-700 mt-1" value={repairForm.invoice_id} onChange={e => setRepairForm({ ...repairForm, invoice_id: e.target.value })}>
                    <option value="">-- Optional: Link to an Invoice --</option>
                    {invoices.map((inv: any) => <option key={inv.id} value={inv.id}>{inv.providers?.name} | Inv: {inv.invoice_number}</option>)}
                  </select>
                </form>
              )}
            </div>
          </div>
        )}

        {/* --- CASH BOX MODALS (UNTOUCHED) --- */}
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

        {isAddingCash && isAdmin && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-xl border-t-8 border-green-800">
              <h2 className="text-2xl font-bold mb-2 text-gray-800">Update Cash Box</h2>
              <form onSubmit={handleAddCash} className="flex flex-col gap-4 mt-4">
                <input required type="date" className="p-2 border rounded text-black" value={cashForm.date} onChange={e => setCashForm({ ...cashForm, date: e.target.value })} />
                <input required type="number" step="0.01" placeholder="Amount (Use - to subtract)" className="p-2 border rounded text-black font-bold text-lg" value={cashForm.amount} onChange={e => setCashForm({ ...cashForm, amount: e.target.value })} />
                <input type="text" placeholder="Notes (e.g., Sold scrap, bought lunch)" className="p-2 border rounded text-black" value={cashForm.notes} onChange={e => setCashForm({ ...cashForm, notes: e.target.value })} />
                <div className="flex justify-end gap-2 mt-2">
                  <button type="button" onClick={() => setIsAddingCash(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-green-800 hover:bg-green-900 text-white rounded font-bold shadow">Save Log</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* ========================================= BRANDED QR STICKER PRINTER ========================================= */}
      {stickerRental && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-90 flex items-center justify-center z-[100] p-4 print:bg-white print:p-0 print:block">

          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-sm w-full print:shadow-none print:p-0 print:max-w-none text-center border-t-8 border-orange-600 print:border-none">

            {/* Header (Hidden on Print) */}
            <div className="print:hidden flex justify-between items-center mb-6 border-b pb-2">
              <h2 className="font-bold text-gray-700 uppercase tracking-widest text-sm">Sticker Preview</h2>
              <button onClick={() => setStickerRental(null)} className="text-red-500 hover:text-red-700 font-bold text-2xl leading-none">&times;</button>
            </div>

            {/* THE ACTUAL PRINTABLE STICKER */}
            <div className="border-4 border-gray-900 p-6 rounded-xl bg-white inline-block w-full">

              <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase mb-0 leading-none">Fine Edge</h1>
              <h2 className="text-2xl font-extrabold text-orange-600 tracking-widest uppercase mb-4 leading-none">Rentals</h2>

              <div className="bg-gray-100 p-4 rounded-lg mb-4 inline-block border-2 border-dashed border-gray-300">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`https://fineedgemachinery.com/rentals/${stickerRental.id}`)}&margin=1`}
                  alt="QR Code"
                  className="w-48 h-48 mx-auto mix-blend-multiply"
                />
              </div>

              <div className="bg-gray-900 text-white py-3 px-4 rounded mb-4">
                <p className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-1">Scan To Rent</p>
                <p className="text-sm font-bold tracking-wide">Or Call: 625-119-1400</p>
              </div>

              <div className="text-left border-t-2 border-gray-200 pt-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Unit ID</p>
                <p className="text-sm font-black text-gray-800 leading-tight">{stickerRental.equipment_name}</p>
                <p className="text-xs font-mono text-gray-500 mt-1 font-bold">SN: {stickerRental.serial_number || 'N/A'}</p>
              </div>

            </div>

            {/* Print Button (Hidden on Print) */}
            <div className="print:hidden mt-8">
              <button onClick={() => window.print()} className="w-full px-6 py-4 bg-orange-600 text-white font-black rounded hover:bg-orange-700 shadow-lg uppercase tracking-widest text-sm transition transform hover:-translate-y-1">
                🖨️ Print Sticker
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================= PRINTABLE PDF SPEC SHEET ========================================= */}
      {specSheetMachine && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-start justify-center z-[100] p-4 pt-12 overflow-y-auto print:bg-white print:p-0 print:block">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl p-8 print:shadow-none print:max-w-none print:p-0 relative">
            <div className="flex justify-between items-center mb-8 pb-4 border-b-2 border-gray-200 print:hidden">
              <h2 className="text-xl font-bold text-gray-700">Official Spec Sheet</h2>
              <div className="flex gap-4">
                <button onClick={() => setSpecSheetMachine(null)} className="px-4 py-2 bg-gray-200 text-gray-700 font-bold rounded hover:bg-gray-300">Close</button>
                <button onClick={() => window.print()} className="px-6 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 shadow">🖨️ Save as PDF</button>
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

                {specSheetMachine.description && (
                  <div className="bg-gray-50 border border-gray-200 p-5 rounded-lg mb-6">
                    <h3 className="text-sm font-bold text-gray-800 uppercase mb-3 border-b pb-2">Machine Details & Specs</h3>
                    <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">{specSheetMachine.description}</p>
                  </div>
                )}

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