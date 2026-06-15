import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Minus, RotateCcw, Save, Trash2, Search } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

const standardMedicines = [
  { name: 'Paracetamol 500mg', dosage: '500 mg', instructions: 'After meals' },
  { name: 'Amoxicillin 500mg', dosage: '500 mg', instructions: 'Twice a day' },
  { name: 'Cetirizine 10mg', dosage: '10 mg', instructions: 'At night' },
  { name: 'Dolo 650mg', dosage: '650 mg', instructions: 'When needed' },
  { name: 'Azithromycin 500mg', dosage: '500 mg', instructions: 'After lunch' },
  { name: 'Levocet 5mg', dosage: '5 mg', instructions: 'Once a day' },
  { name: 'Montair LC Syrup', dosage: '5 ml', instructions: 'At bedtime' },
  { name: 'Vicks Vapourub', dosage: '25 gm', instructions: 'Apply locally' },
  { name: 'Pantoprazole 40mg', dosage: '40 mg', instructions: 'Before breakfast' },
  { name: 'Vitamin D3 60K', dosage: '60000 IU', instructions: 'Once a week' }
];

export default function CreateOrder() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [dbMedicines, setDbMedicines] = useState([]);
  const [createdBy, setCreatedBy] = useState('');
  
  // Form fields states
  const [selectedPatient, setSelectedPatient] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [medicines, setMedicines] = useState([
    { name: '', dosage: '', quantity: 10, instructions: '' }
  ]);

  // Loading states
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchDropdownOptions = async () => {
      setLoadingOptions(true);
      try {
        const [patRes, docRes, invRes, profileRes] = await Promise.all([
          api.get('/api/pharmacy/patients'),
          api.get('/api/pharmacy/doctors'),
          api.get('/api/inventory'),
          api.get('/api/pharmacy/profile')
        ]);
        setPatients(patRes.data);
        setDoctors(docRes.data);
        setDbMedicines(invRes.data || []);
        setCreatedBy(profileRes.data?.fullName || '');
      } catch (err) {
        console.error(err);
        toast.error('Failed to load dropdown options');
      } finally {
        setLoadingOptions(false);
      }
    };
    fetchDropdownOptions();
  }, []);

  const handlePatientSelect = (e) => {
    const pId = e.target.value;
    setSelectedPatient(pId);
    const pat = patients.find(p => p._id === pId);
    if (pat) {
      setPhone(pat.phone);
    } else {
      setPhone('');
    }
  };

  const handleMedicineNameChange = (idx, nameValue) => {
    const updated = [...medicines];
    updated[idx].name = nameValue;
    
    // Auto-fill dosage and instructions if standard medicine is matched
    const match = standardMedicines.find(m => m.name.toLowerCase() === nameValue.toLowerCase());
    if (match) {
      updated[idx].dosage = match.dosage;
      updated[idx].instructions = match.instructions;
    } else {
      // Or try to extract a dosage pattern like "500mg" or "10mg" from the name if possible
      const dosageMatch = nameValue.match(/\d+\s*(mg|g|ml|mcg|iu|IU)/i);
      if (dosageMatch) {
        updated[idx].dosage = dosageMatch[0];
      } else {
        updated[idx].dosage = '';
      }
      updated[idx].instructions = '';
    }
    setMedicines(updated);
  };

  const handleMedicineFieldChange = (idx, field, value) => {
    const updated = [...medicines];
    updated[idx][field] = value;
    setMedicines(updated);
  };

  const handleQuantityStep = (idx, delta) => {
    const updated = [...medicines];
    const newQty = Math.max(1, updated[idx].quantity + delta);
    updated[idx].quantity = newQty;
    setMedicines(updated);
  };

  const handleAddMedicineRow = () => {
    setMedicines([
      ...medicines,
      { name: '', dosage: '', quantity: 10, instructions: '' }
    ]);
  };

  const handleRemoveMedicineRow = (idx) => {
    if (medicines.length === 1) return;
    setMedicines(medicines.filter((_, i) => i !== idx));
  };

  const handleReset = () => {
    setSelectedPatient('');
    setPhone('');
    setSelectedDoctor('');
    setMedicines([{ name: '', dosage: '', quantity: 10, instructions: '' }]);
    toast.info('Form reset cleared');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validations
    if (!selectedPatient) {
      toast.warning('Please select a patient.');
      return;
    }
    if (!phone) {
      toast.warning('Please enter a phone number.');
      return;
    }
    if (!selectedDoctor) {
      toast.warning('Please select a doctor.');
      return;
    }
    
    const invalidMed = medicines.some(m => !m.name || !m.dosage);
    if (invalidMed) {
      toast.warning('Please fill in Name and Dosage for all added medicines.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/api/pharmacy/orders/manual', {
        patientId: selectedPatient,
        doctorName: selectedDoctor,
        medicines: medicines
      });
      toast.success('Order created successfully');
      navigate('/pharmacy/prescription-queue');
    } catch (err) {
      console.error(err);
      toast.error('Failed to create manual order');
    } finally {
      setSubmitting(false);
    }
  };

  // Calculations
  const totalMedicines = medicines.length;
  const totalQuantity = medicines.reduce((sum, m) => sum + Number(m.quantity || 0), 0);
  const currentDateTime = format(new Date(), 'dd MMM yyyy, hh:mm a');

  return (
    <div className="space-y-6">
      {/* Header Back Link */}
      <div className="space-y-1">
        <button
          onClick={() => navigate('/pharmacy/prescription-queue')}
          className="flex items-center gap-1.5 text-sm font-semibold text-[#6B7280] hover:text-[#111827] transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Queue
        </button>
        <h1 className="text-2xl font-bold text-[#111827] tracking-tight">Add New Order (Manual)</h1>
      </div>

      {/* CORE FORM GRID */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr_300px] gap-5 items-start">
          
          {/* COLUMN 1: PATIENT DETAILS CARD */}
          <div className="bg-white rounded-[16px] border border-[#E5E7EB] p-5 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-[#111827] border-b pb-2 mb-2">Patient Details</h2>
            
            {/* Patient Select */}
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-[#6B7280] mb-1.5">Patient Name <span className="text-red-500">*</span></label>
              <select
                value={selectedPatient}
                onChange={handlePatientSelect}
                className="h-10 px-3 border border-[#E5E7EB] rounded-[8px] text-sm text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#0F9D8A]/20 focus:border-[#0F9D8A] bg-white transition-all"
              >
                <option value="">Select Patient</option>
                {patients.map(p => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Phone */}
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-[#6B7280] mb-1.5">Phone Number <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Patient phone number"
                className="h-10 px-3 border border-[#E5E7EB] rounded-[8px] text-sm text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#0F9D8A]/20 focus:border-[#0F9D8A] bg-white transition-all"
              />
            </div>

            {/* Doctor Name */}
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-[#6B7280] mb-1.5">Doctor Name <span className="text-red-500">*</span></label>
              <select
                value={selectedDoctor}
                onChange={(e) => setSelectedDoctor(e.target.value)}
                className="h-10 px-3 border border-[#E5E7EB] rounded-[8px] text-sm text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#0F9D8A]/20 focus:border-[#0F9D8A] bg-white transition-all"
              >
                <option value="">Select Doctor</option>
                {doctors.map(doc => (
                  <option key={doc} value={doc}>{doc}</option>
                ))}
              </select>
            </div>

            {/* Prescription Count */}
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-[#6B7280] mb-1.5">Prescription Count</label>
              <input
                type="text"
                value={totalMedicines}
                readOnly
                disabled
                className="h-10 px-3 border border-[#E5E7EB] bg-gray-50 rounded-[8px] text-sm text-gray-500 font-bold select-none cursor-not-allowed"
              />
            </div>
          </div>

          {/* COLUMN 2: ADD MEDICINES FORM */}
          <div className="bg-white rounded-[16px] border border-[#E5E7EB] p-5 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-[#111827] border-b pb-2 mb-2">Add Medicines</h2>
            
            <div className="space-y-5">
              {medicines.map((med, idx) => (
                <div key={idx} className="relative p-4 bg-[#F8FAFC] border border-[#E5E7EB] rounded-[12px] space-y-3">
                  
                  {/* Remove Row Button */}
                  {medicines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMedicineRow(idx)}
                      className="absolute top-3 right-3 text-[#6B7280] hover:text-red-500 p-1 rounded-md transition-colors cursor-pointer"
                      title="Remove Medicine"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Medicine Name (searchable selection) */}
                    <div className="flex flex-col">
                      <label className="text-xs font-semibold text-[#6B7280] mb-1">Medicine Name <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <select
                          value={med.name}
                          onChange={(e) => handleMedicineNameChange(idx, e.target.value)}
                          className="w-full h-10 pl-3 pr-8 border border-[#E5E7EB] rounded-[8px] text-sm text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#0F9D8A]/20 focus:border-[#0F9D8A] bg-white transition-all"
                        >
                          <option value="">Search or Select Medicine</option>
                          {dbMedicines.length > 0 ? (
                            dbMedicines.map(item => (
                              <option key={item._id} value={item.medicineName}>{item.medicineName}</option>
                            ))
                          ) : (
                            standardMedicines.map(item => (
                              <option key={item.name} value={item.name}>{item.name}</option>
                            ))
                          )}
                        </select>
                      </div>
                    </div>

                    {/* Dosage */}
                    <div className="flex flex-col">
                      <label className="text-xs font-semibold text-[#6B7280] mb-1">Dosage <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={med.dosage}
                        onChange={(e) => handleMedicineFieldChange(idx, 'dosage', e.target.value)}
                        placeholder="e.500 mg, 5 ml"
                        className="h-10 px-3 border border-[#E5E7EB] rounded-[8px] text-sm text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#0F9D8A]/20 focus:border-[#0F9D8A] bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Quantity Stepper */}
                    <div className="flex flex-col">
                      <label className="text-xs font-semibold text-[#6B7280] mb-1">Quantity <span className="text-red-500">*</span></label>
                      <div className="flex items-center h-10 w-[140px] border border-[#E5E7EB] rounded-[8px] overflow-hidden bg-white">
                        <button
                          type="button"
                          onClick={() => handleQuantityStep(idx, -1)}
                          className="w-10 h-full flex items-center justify-center text-gray-500 hover:bg-gray-55 transition-colors cursor-pointer border-r border-[#E5E7EB]"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <input
                          type="number"
                          value={med.quantity}
                          onChange={(e) => handleMedicineFieldChange(idx, 'quantity', Math.max(1, Number(e.target.value)))}
                          className="flex-1 h-full text-center text-sm font-bold text-[#111827] focus:outline-none bg-transparent"
                        />
                        <button
                          type="button"
                          onClick={() => handleQuantityStep(idx, 1)}
                          className="w-10 h-full flex items-center justify-center text-gray-500 hover:bg-gray-55 transition-colors cursor-pointer border-l border-[#E5E7EB]"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Instructions */}
                    <div className="flex flex-col">
                      <label className="text-xs font-semibold text-[#6B7280] mb-1">Instructions</label>
                      <input
                        type="text"
                        value={med.instructions}
                        onChange={(e) => handleMedicineFieldChange(idx, 'instructions', e.target.value)}
                        placeholder="e.g. Twice a day"
                        className="h-10 px-3 border border-[#E5E7EB] rounded-[8px] text-sm text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#0F9D8A]/20 focus:border-[#0F9D8A] bg-white transition-all"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add row dashed button */}
            <button
              type="button"
              onClick={handleAddMedicineRow}
              className="w-full h-11 border border-dashed border-[#0F9D8A] rounded-[10px] text-sm font-bold text-[#0F9D8A] hover:bg-[#0F9D8A]/5 transition-colors flex items-center justify-center gap-2 cursor-pointer mt-3"
            >
              <Plus className="h-4.5 w-4.5" />
              * Add Another Medicine
            </button>
          </div>

          {/* COLUMN 3: ORDER SUMMARY CARD */}
          <div className="bg-white rounded-[16px] border border-[#E5E7EB] p-5 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-[#111827] border-b pb-2 mb-2">Order Summary</h2>

            <div className="space-y-3.5 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-[#6B7280] font-medium">Total Medicines</span>
                <span className="font-bold text-[#111827] text-base">{totalMedicines}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#6B7280] font-medium">Total Quantity</span>
                <span className="font-bold text-[#111827] text-base">{totalQuantity}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#6B7280] font-medium">Created By</span>
                <span className="font-bold text-[#111827]">{createdBy || '—'}</span>
              </div>
              <div className="flex justify-between items-start pt-2 border-t border-gray-100">
                <span className="text-[#6B7280] font-medium mt-0.5">Date & Time</span>
                <span className="font-bold text-[#111827] text-right leading-relaxed">{currentDateTime}</span>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM ACTION BUTTONS */}
        <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E7EB]">
          <button
            type="button"
            onClick={handleReset}
            className="h-11 px-6 border border-[#E5E7EB] hover:bg-gray-50 text-[#374151] font-bold text-sm rounded-[10px] transition-colors cursor-pointer bg-white"
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="h-11 px-8 bg-[#0F9D8A] hover:bg-[#0B7F71] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold text-sm rounded-[10px] transition-all shadow-sm shadow-[#0F9D8A]/10 cursor-pointer"
          >
            Create Order
          </button>
        </div>
      </form>
    </div>
  );
}
