import { useState, useEffect } from 'react';
import { AlertCircle, Plus, Search, X, Check, Pencil } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { socket } from '../../sockets/socket';

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editStockValue, setEditStockValue] = useState('');
  
  // New medicine form state
  const [form, setForm] = useState({
    medicineName: '',
    currentStock: '',
    unit: 'Strip',
    reorderLevel: '10'
  });

  const fetchInventory = async () => {
    try {
      const res = await api.get('/api/inventory');
      setItems(res.data);
    } catch (error) {
      toast.error('Failed to fetch inventory');
    }
  };

  useEffect(() => {
    fetchInventory();

    socket.connect();
    socket.on('lowStockAlert', () => {
      fetchInventory();
      toast.warning('New Low Stock Alert!');
    });

    return () => {
      socket.off('lowStockAlert');
    };
  }, []);

  const handleUpdateStock = async (id, currentStock, status) => {
    try {
      await api.put(`/api/inventory/${id}`, { currentStock, status });
      toast.success('Stock updated');
      fetchInventory();
    } catch (error) {
      toast.error('Failed to update stock');
    }
  };

  const handleAddMedicine = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/api/inventory', {
        medicineName: form.medicineName,
        currentStock: Number(form.currentStock) || 0,
        unit: form.unit,
        reorderLevel: Number(form.reorderLevel) || 10
      });
      toast.success('Medicine added to inventory successfully');
      setShowModal(false);
      setForm({
        medicineName: '',
        currentStock: '',
        unit: 'Strip',
        reorderLevel: '10'
      });
      fetchInventory();
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to add medicine';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (item) => {
    setEditingId(item._id);
    setEditStockValue(item.currentStock.toString());
  };

  const handleSaveStock = async (id) => {
    const count = Number(editStockValue);
    if (isNaN(count) || count < 0) {
      toast.error('Stock count must be a non-negative number');
      return;
    }
    try {
      await api.put(`/api/inventory/${id}`, { currentStock: count });
      toast.success('Stock count updated');
      setEditingId(null);
      fetchInventory();
    } catch (error) {
      toast.error('Failed to update stock');
    }
  };

  const filteredItems = items.filter(item => 
    item.medicineName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStockCount = items.filter(item => item.status === 'Low Stock' || item.status === 'Out of Stock').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Title Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-[#0F9D8A] hover:bg-[#0B7F71] text-white px-4 py-2.5 rounded-[10px] text-sm font-semibold transition-colors flex items-center shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add New Medicine
        </button>
      </div>

      {/* Low Stock Banner Alert */}
      {lowStockCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-4 animate-in slide-in-from-top-2">
          <div className="bg-white rounded-full p-1 text-red-500 shadow-sm mt-0.5">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-red-800 font-bold">Low Stock Alert</h3>
            <p className="text-red-600 text-sm mt-1">You have {lowStockCount} medicines running low in stock. Please reorder soon to avoid disruption.</p>
          </div>
        </div>
      )}

      {/* Search Header panel */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex justify-between items-center">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-[10px] bg-[#F8FAFC] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0F9D8A]/20 focus:border-[#0F9D8A] sm:text-sm transition-all"
            placeholder="Search by Medicine Name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-[16px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                <th className="px-6 py-4 font-medium">Medicine Name</th>
                <th className="px-6 py-4 font-medium text-center">Current Stock</th>
                <th className="px-6 py-4 font-medium">Unit</th>
                <th className="px-6 py-4 font-medium text-center">Reorder Level</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredItems.map((item) => (
                <tr key={item._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-bold text-gray-900">{item.medicineName}</td>
                  <td className="px-6 py-4 text-sm text-center flex items-center justify-center">
                    {editingId === item._id ? (
                      <input
                        type="number"
                        min="0"
                        value={editStockValue}
                        onChange={(e) => setEditStockValue(e.target.value)}
                        className="w-20 px-2.5 py-1 text-center border border-gray-300 rounded-[8px] bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0F9D8A]/20 focus:border-[#0F9D8A] sm:text-xs"
                      />
                    ) : (
                      <span className={`font-bold ${item.status === 'Low Stock' ? 'text-red-600' : 'text-gray-900'}`}>
                        {item.currentStock}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{item.unit}</td>
                  <td className="px-6 py-4 text-sm text-gray-700 text-center">{item.reorderLevel}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${item.status === 'In Stock' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}
                    `}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-right">
                    {editingId === item._id ? (
                      <div className="flex gap-3 justify-end items-center">
                        <button 
                          onClick={() => handleSaveStock(item._id)}
                          className="text-emerald-600 hover:text-emerald-700 transition-colors font-bold cursor-pointer flex items-center gap-1"
                        >
                          <Check className="w-4 h-4" /> Save
                        </button>
                        <button 
                          onClick={() => setEditingId(null)}
                          className="text-red-500 hover:text-red-600 transition-colors font-bold cursor-pointer flex items-center gap-1"
                        >
                          <X className="w-4 h-4" /> Cancel
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => startEdit(item)}
                        className="text-[#0F9D8A] hover:text-[#0B7F71] transition-colors font-bold cursor-pointer flex items-center gap-1.5 ml-auto"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Edit Stock
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    No medicines found in the inventory.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Medicine Modal Overlay */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-[16px] border border-gray-100 shadow-2xl overflow-hidden p-6 space-y-5 animate-in scale-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-gray-900">Add New Medicine</h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-900 rounded-full p-1 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddMedicine} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Medicine Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Paracetamol 500mg"
                  value={form.medicineName}
                  onChange={(e) => setForm({ ...form, medicineName: e.target.value })}
                  className="w-full h-11 px-4 border border-gray-300 rounded-[10px] text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0F9D8A]/20 focus:border-[#0F9D8A] bg-white transition-all shadow-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Starting Stock</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="e.g. 100"
                    value={form.currentStock}
                    onChange={(e) => setForm({ ...form, currentStock: e.target.value })}
                    className="w-full h-11 px-4 border border-gray-300 rounded-[10px] text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0F9D8A]/20 focus:border-[#0F9D8A] bg-white transition-all shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Reorder Level</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 30"
                    value={form.reorderLevel}
                    onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })}
                    className="w-full h-11 px-4 border border-gray-300 rounded-[10px] text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0F9D8A]/20 focus:border-[#0F9D8A] bg-white transition-all shadow-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Unit</label>
                <select
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  className="w-full h-11 px-4 border border-gray-300 bg-white rounded-[10px] text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0F9D8A]/20 focus:border-[#0F9D8A] transition-all shadow-sm"
                >
                  <option value="Strip">Strip</option>
                  <option value="Bottle">Bottle</option>
                  <option value="Capsule">Capsule</option>
                  <option value="Tablet">Tablet</option>
                  <option value="Tube">Tube</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="h-10 px-5 border border-gray-300 hover:bg-gray-50 text-gray-600 font-semibold text-sm rounded-[10px] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-10 px-7 bg-[#0F9D8A] hover:bg-[#0B7F71] disabled:bg-gray-300 text-white font-bold text-sm rounded-[10px] transition-all shadow-sm shadow-[#0F9D8A]/10 cursor-pointer"
                >
                  {submitting ? 'Adding...' : 'Add Medicine'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
