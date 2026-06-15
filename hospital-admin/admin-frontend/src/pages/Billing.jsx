import { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Plus, 
  FileText, 
  TrendingUp, 
  ShieldAlert, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  X 
} from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../services/api';

export default function Billing() {
  const [activeTab, setActiveTab] = useState('invoices'); // invoices, insurance
  const [invoices, setInvoices] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [patientId, setPatientId] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemAmount, setItemAmount] = useState('');
  const [itemsList, setItemsList] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(5); // default 5%
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  
  // Insurance fields
  const [provider, setProvider] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');

  const fetchBillingData = async () => {
    setLoading(true);
    try {
      const invRes = await API.get('/billing/invoices');
      if (invRes.data.success) {
        setInvoices(invRes.data.data);
      }

      const patRes = await API.get('/patients');
      if (patRes.data.success) {
        setPatients(patRes.data.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load billing invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingData();
  }, []);

  const handleAddItem = () => {
    if (!itemName || !itemAmount) return toast.warning('Enter description and amount');
    setItemsList([...itemsList, { description: itemName, amount: Number(itemAmount) }]);
    setItemName('');
    setItemAmount('');
  };

  const handleRemoveItem = (idx) => {
    setItemsList(itemsList.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!patientId) return toast.warning('Please select a patient');
    if (itemsList.length === 0) return toast.warning('Please add at least one line item');

    const payload = {
      patientId,
      items: itemsList,
      discount: Number(discount) || 0,
      tax: Number(tax) || 0,
      paymentMethod,
      insurance: paymentMethod === 'Insurance' ? {
        provider,
        policyNumber,
        claimStatus: 'Pending',
        approvedAmount: 0
      } : {
        provider: '',
        policyNumber: '',
        claimStatus: 'None',
        approvedAmount: 0
      }
    };

    try {
      const res = await API.post('/billing/invoices', payload);
      if (res.data.success) {
        toast.success('Invoice generated successfully');
        setIsModalOpen(false);
        setItemsList([]);
        setDiscount(0);
        setTax(5);
        fetchBillingData();
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to create billing record');
    }
  };

  const handleProcessClaim = async (invoiceId, status, claimAmount) => {
    try {
      const res = await API.put(`/billing/invoices/${invoiceId}`, {
        paymentStatus: status === 'Approved' ? 'Paid' : 'Unpaid',
        amountPaid: status === 'Approved' ? claimAmount : 0,
        insurance: {
          claimStatus: status,
          approvedAmount: status === 'Approved' ? claimAmount : 0
        }
      });

      if (res.data.success) {
        toast.success(`Insurance Claim marked: ${status}`);
        fetchBillingData();
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to update insurance claim status');
    }
  };

  const handleMarkPaid = async (invoiceId) => {
    try {
      const res = await API.put(`/billing/invoices/${invoiceId}`, {
        paymentStatus: 'Paid',
        amountPaid: invoices.find(i => i._id === invoiceId).totalAmount
      });
      if (res.data.success) {
        toast.success('Invoice marked as paid');
        fetchBillingData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRefund = async (invoiceId) => {
    try {
      const res = await API.put(`/billing/invoices/${invoiceId}`, {
        paymentStatus: 'Refunded',
        amountPaid: 0
      });
      if (res.data.success) {
        toast.success('Payment successfully refunded');
        fetchBillingData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filter out invoices that have insurance
  const insuranceClaims = invoices.filter(i => i.paymentMethod === 'Insurance');

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight font-sans">Billing & Invoices</h1>
          <p className="text-sm text-slate-500 mt-1">Manage outpatient billing, invoice entries, and insurance claims.</p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('invoices')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'invoices' 
                ? 'bg-white text-primary shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Outpatient Invoices</span>
          </button>
          <button
            onClick={() => setActiveTab('insurance')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'insurance' 
                ? 'bg-white text-primary shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Insurance Claims</span>
          </button>
        </div>
      </div>

      {/* OUTPATIENT INVOICES QUEUE */}
      {activeTab === 'invoices' && (
        <div className="bg-white border border-slate-200 rounded-card p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Outpatient Invoice Logs</h3>
            <button
              onClick={() => {
                setPatientId('');
                setItemsList([]);
                setIsModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-lg transition-all shadow-sm"
            >
              <Plus className="w-4.5 h-4.5" />
              <span>Create Invoice</span>
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
            </div>
          ) : invoices.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-12">No invoices recorded</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold pb-3">
                    <th className="pb-3">Invoice Code</th>
                    <th className="pb-3">Date</th>
                    <th className="pb-3">Patient</th>
                    <th className="pb-3">Subtotal</th>
                    <th className="pb-3">Total Amount</th>
                    <th className="pb-3">Method</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv._id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="py-4 font-mono font-bold text-primary">{inv.invoiceNumber}</td>
                      <td className="py-4 text-slate-500">{new Date(inv.transactionDate).toLocaleDateString()}</td>
                      <td className="py-4 font-semibold text-slate-700">{inv.patient?.name || 'Walk-in Patient'}</td>
                      <td className="py-4 text-slate-500">${inv.subTotal}</td>
                      <td className="py-4 font-bold text-slate-700">${inv.totalAmount}</td>
                      <td className="py-4 text-slate-500">{inv.paymentMethod}</td>
                      <td className="py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          inv.paymentStatus === 'Paid' ? 'bg-emerald-50 text-emerald-600' :
                          inv.paymentStatus === 'Refunded' ? 'bg-rose-50 text-rose-600' :
                          'bg-amber-50 text-amber-600'
                        }`}>
                          {inv.paymentStatus}
                        </span>
                      </td>
                      <td className="py-4 text-right space-x-2">
                        {inv.paymentStatus === 'Unpaid' && (
                          <button
                            onClick={() => handleMarkPaid(inv._id)}
                            className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-[10px] font-semibold transition-all"
                          >
                            Mark Paid
                          </button>
                        )}
                        {inv.paymentStatus === 'Paid' && (
                          <button
                            onClick={() => handleRefund(inv._id)}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded text-[10px] font-semibold border border-rose-200 transition-all"
                          >
                            Refund
                          </button>
                        )}
                        {inv.paymentStatus === 'Refunded' && (
                          <span className="text-[10px] text-slate-400 font-semibold italic">Refunded</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* INSURANCE CLAIMS TAB PANEL */}
      {activeTab === 'insurance' && (
        <div className="bg-white border border-slate-200 rounded-card p-6 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Pending and Approved Claims</h3>
          
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
            </div>
          ) : insuranceClaims.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-12">No insurance claims in queue</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold pb-3">
                    <th className="pb-3">Invoice Number</th>
                    <th className="pb-3">Patient</th>
                    <th className="pb-3">Provider</th>
                    <th className="pb-3">Policy Number</th>
                    <th className="pb-3">Total Amount</th>
                    <th className="pb-3">Claim Status</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {insuranceClaims.map((claim) => (
                    <tr key={claim._id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="py-4 font-mono font-semibold text-slate-700">{claim.invoiceNumber}</td>
                      <td className="py-4 font-semibold text-slate-700">{claim.patient?.name || 'Walk-in'}</td>
                      <td className="py-4 text-slate-500">{claim.insurance?.provider}</td>
                      <td className="py-4 font-mono text-slate-500">{claim.insurance?.policyNumber}</td>
                      <td className="py-4 font-bold text-slate-700">${claim.totalAmount}</td>
                      <td className="py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          claim.insurance?.claimStatus === 'Approved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                          claim.insurance?.claimStatus === 'Rejected' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                          'bg-amber-50 text-amber-600 border border-amber-100'
                        }`}>
                          {claim.insurance?.claimStatus}
                        </span>
                      </td>
                      <td className="py-4 text-right space-x-2">
                        {claim.insurance?.claimStatus === 'Pending' && (
                          <div className="inline-flex gap-2">
                            <button
                              onClick={() => handleProcessClaim(claim._id, 'Approved', claim.totalAmount)}
                              className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-[10px] font-semibold transition-all flex items-center gap-1"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => handleProcessClaim(claim._id, 'Rejected', 0)}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded text-[10px] font-semibold border border-rose-200 transition-all flex items-center gap-1"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </div>
                        )}
                        {claim.insurance?.claimStatus !== 'Pending' && (
                          <span className="text-[10px] text-slate-400 font-semibold italic">Processed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* CREATE INVOICE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-card w-full max-w-lg shadow-xl overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800 uppercase tracking-wider">
                Generate Patient Invoice
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto scrollbar-none">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Select Patient*</label>
                <select
                  required
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                >
                  <option value="">Choose Patient</option>
                  {patients.map((p) => (
                    <option key={p._id} value={p._id}>{p.name} ({p.phone})</option>
                  ))}
                </select>
              </div>

              {/* Items Addition Area */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Add Line Items</span>
                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-8">
                    <input
                      type="text"
                      placeholder="Consultation, ECG, Lab work etc."
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      placeholder="Amount ($)"
                      value={itemAmount}
                      onChange={(e) => setItemAmount(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="col-span-1 flex items-center justify-center">
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="p-1.5 bg-primary hover:bg-primary-hover text-white rounded-lg transition-all"
                    >
                      <Plus className="w-4.5 h-4.5" />
                    </button>
                  </div>
                </div>

                {/* Listed Items */}
                {itemsList.length > 0 && (
                  <div className="space-y-1 mt-2">
                    {itemsList.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs text-slate-600 bg-white p-2 rounded-lg border border-slate-100">
                        <span>{item.description}</span>
                        <div className="flex items-center gap-3">
                          <span className="font-bold">${item.amount}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-rose-500 hover:text-rose-700 font-bold"
                          >
                            &times;
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tax & Discount */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Discount (%)</label>
                  <input
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tax (%)</label>
                  <input
                    type="number"
                    value={tax}
                    onChange={(e) => setTax(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Method */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                >
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="UPI">UPI / QR Scan</option>
                  <option value="NetBanking">Net Banking</option>
                  <option value="Insurance">Insurance Provider</option>
                </select>
              </div>

              {/* Insurance specifics if chosen */}
              {paymentMethod === 'Insurance' && (
                <div className="p-4 bg-blue-50/30 border border-blue-100 rounded-xl grid grid-cols-2 gap-3 animate-fade-in">
                  <div className="col-span-2 text-[10px] font-bold text-blue-700 uppercase tracking-wider">Insurance Details</div>
                  <div>
                    <label className="block text-[9px] font-semibold text-slate-500 uppercase mb-1">Insurance Provider</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Blue Cross"
                      value={provider}
                      onChange={(e) => setProvider(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-semibold text-slate-500 uppercase mb-1">Policy / Card No.</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. BCS-998"
                      value={policyNumber}
                      onChange={(e) => setPolicyNumber(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Action footer */}
              <div className="flex gap-4 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-primary/20"
                >
                  Generate Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
