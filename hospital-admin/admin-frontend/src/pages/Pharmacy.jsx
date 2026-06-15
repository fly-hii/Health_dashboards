import { useState, useEffect } from 'react';
import { 
  Activity, 
  ShoppingCart, 
  Package, 
  Plus, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Edit, 
  Trash2,
  X 
} from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../services/api';
import socket from '../sockets/socket';

export default function Pharmacy() {
  const [activeTab, setActiveTab] = useState('orders'); // orders, inventory
  const [orders, setOrders] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingInv, setLoadingInv] = useState(true);

  // Inventory Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [medicineName, setMedicineName] = useState('');
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState(50);
  const [unit, setUnit] = useState('tablets');
  const [price, setPrice] = useState(10);
  const [minStockLevel, setMinStockLevel] = useState(20);
  const [supplier, setSupplier] = useState('');

  // Fetch Pharmacy Orders
  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const res = await API.get('/pharmacy/orders');
      if (res.data.success) {
        setOrders(res.data.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load pharmacy orders');
    } finally {
      setLoadingOrders(false);
    }
  };

  // Fetch Inventory Stock
  const fetchInventory = async () => {
    setLoadingInv(true);
    try {
      const res = await API.get('/pharmacy/inventory');
      if (res.data.success) {
        setInventory(res.data.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load medicine stock inventory');
    } finally {
      setLoadingInv(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'orders') {
      fetchOrders();
    } else {
      fetchInventory();
    }
  }, [activeTab]);

  useEffect(() => {
    // Setup socket listener for order updates
    socket.connect();
    socket.on('pharmacy_order_update', () => {
      if (activeTab === 'orders') fetchOrders();
    });

    return () => {
      socket.off('pharmacy_order_update');
    };
  }, [activeTab]);

  const handleUpdateStatus = async (id, status, paymentStatus) => {
    try {
      const res = await API.put(`/pharmacy/orders/${id}`, { status, paymentStatus });
      if (res.data.success) {
        toast.success(`Order status updated to: ${status}`);
        fetchOrders();
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to update pharmacy order state');
    }
  };

  const openAddModal = () => {
    setEditingItem(null);
    setMedicineName('');
    setCategory('Antibiotic');
    setQuantity(100);
    setUnit('tablets');
    setPrice(10);
    setMinStockLevel(20);
    setSupplier('');
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setMedicineName(item.medicineName);
    setCategory(item.category);
    setQuantity(item.quantity);
    setUnit(item.unit || 'tablets');
    setPrice(item.price);
    setMinStockLevel(item.minStockLevel);
    setSupplier(item.supplier || '');
    setIsModalOpen(true);
  };

  const handleInventorySubmit = async (e) => {
    e.preventDefault();
    if (!medicineName || !category || !price) {
      return toast.warning('Please enter required details');
    }

    const payload = {
      medicineName,
      category,
      quantity: Number(quantity),
      unit,
      price: Number(price),
      minStockLevel: Number(minStockLevel),
      supplier
    };

    try {
      if (editingItem) {
        await API.put(`/pharmacy/inventory/${editingItem._id}`, payload);
        toast.success(`Medicine ${medicineName} updated successfully`);
      } else {
        await API.post('/pharmacy/inventory', payload);
        toast.success(`Medicine ${medicineName} added to inventory`);
      }
      setIsModalOpen(false);
      fetchInventory();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save inventory medicine details');
    }
  };

  const handleDeleteInventory = async (id, medName) => {
    if (window.confirm(`Are you sure you want to remove ${medName} from inventory?`)) {
      try {
        await API.delete(`/pharmacy/inventory/${id}`);
        toast.success(`${medName} removed`);
        fetchInventory();
      } catch (err) {
        console.error(err);
        toast.error('Failed to delete inventory item');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Pharmacy Control</h1>
          <p className="text-sm text-slate-500 mt-1">Manage prescription fulfillment orders and medicine inventory.</p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'orders' 
                ? 'bg-white text-primary shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Orders Queue</span>
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'inventory' 
                ? 'bg-white text-primary shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Inventory Stock</span>
          </button>
        </div>
      </div>

      {/* ORDERS TAB PANEL */}
      {activeTab === 'orders' && (
        <div className="bg-white border border-slate-200 rounded-card p-6 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Pending and Processing Orders</h3>
          
          {loadingOrders ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
            </div>
          ) : orders.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-12">No orders in the pharmacy queue</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold pb-3">
                    <th className="pb-3">Order Date</th>
                    <th className="pb-3">Patient</th>
                    <th className="pb-3">Prescribed Medicines</th>
                    <th className="pb-3">Total Amount</th>
                    <th className="pb-3">Payment Status</th>
                    <th className="pb-3">Fulfillment Status</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((ord) => (
                    <tr key={ord._id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="py-4 text-slate-500">{new Date(ord.orderDate).toLocaleDateString()}</td>
                      <td className="py-4 font-semibold text-slate-700">{ord.patient?.name || 'Walk-in'}</td>
                      <td className="py-4">
                        <div className="space-y-1">
                          {ord.items.map((item, idx) => (
                            <span key={idx} className="inline-block bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-semibold mr-1.5">
                              {item.name} (x{item.quantity})
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-4 font-bold text-slate-700">${ord.totalAmount}</td>
                      <td className="py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          ord.paymentStatus === 'Paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                        }`}>
                          {ord.paymentStatus}
                        </span>
                      </td>
                      <td className="py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          ord.status === 'Delivered' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                          ord.status === 'Ready' ? 'bg-sky-50 text-sky-600 border border-sky-100' :
                          ord.status === 'Processing' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                          'bg-slate-50 text-slate-600 border border-slate-200'
                        }`}>
                          {ord.status}
                        </span>
                      </td>
                      <td className="py-4 text-right space-x-2">
                        {ord.status === 'Pending' && (
                          <button
                            onClick={() => handleUpdateStatus(ord._id, 'Processing', ord.paymentStatus)}
                            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded text-[10px] font-semibold transition-all"
                          >
                            Mark Processing
                          </button>
                        )}
                        {ord.status === 'Processing' && (
                          <button
                            onClick={() => handleUpdateStatus(ord._id, 'Ready', ord.paymentStatus)}
                            className="px-2.5 py-1 bg-sky-500 hover:bg-sky-600 text-white rounded text-[10px] font-semibold transition-all"
                          >
                            Mark Ready
                          </button>
                        )}
                        {ord.status === 'Ready' && (
                          <button
                            onClick={() => handleUpdateStatus(ord._id, 'Delivered', 'Paid')}
                            className="px-2.5 py-1 bg-primary hover:bg-primary-hover text-white rounded text-[10px] font-semibold transition-all"
                          >
                            Mark Delivered
                          </button>
                        )}
                        {ord.status === 'Delivered' && (
                          <span className="text-[10px] text-slate-400 font-semibold italic">Completed</span>
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

      {/* INVENTORY TAB PANEL */}
      {activeTab === 'inventory' && (
        <div className="bg-white border border-slate-200 rounded-card p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Medicine Stock Inventory</h3>
            <button
              onClick={openAddModal}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-lg transition-all shadow-sm"
            >
              <Plus className="w-4.5 h-4.5" />
              <span>Add Medicine</span>
            </button>
          </div>

          {loadingInv ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
            </div>
          ) : inventory.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-12">Inventory is empty</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold pb-3">
                    <th className="pb-3">Medicine Name</th>
                    <th className="pb-3">Category</th>
                    <th className="pb-3">Price / Unit</th>
                    <th className="pb-3">Current Stock</th>
                    <th className="pb-3">Min Level</th>
                    <th className="pb-3">Stock Status</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((item) => {
                    const isLow = item.quantity <= item.minStockLevel;
                    return (
                      <tr key={item._id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="py-4 font-semibold text-slate-700">{item.medicineName}</td>
                        <td className="py-4 text-slate-500">{item.category}</td>
                        <td className="py-4 font-semibold text-slate-700">${item.price} <span className="text-[10px] text-slate-400 font-normal">/{item.unit}</span></td>
                        <td className="py-4">
                          <span className={`font-bold ${isLow ? 'text-rose-600' : 'text-slate-800'}`}>
                            {item.quantity}
                          </span>
                        </td>
                        <td className="py-4 text-slate-400">{item.minStockLevel}</td>
                        <td className="py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            item.quantity === 0 ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                            isLow ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                            'bg-emerald-50 text-emerald-600 border border-emerald-100'
                          }`}>
                            {item.quantity === 0 ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                          </span>
                        </td>
                        <td className="py-4 text-right space-x-2">
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded"
                          >
                            <Edit className="w-4.5 h-4.5 inline" />
                          </button>
                          <button
                            onClick={() => handleDeleteInventory(item._id, item.medicineName)}
                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                          >
                            <Trash2 className="w-4.5 h-4.5 inline" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* INVENTORY ADD/EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-card w-full max-w-md shadow-xl overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800 uppercase tracking-wider">
                {editingItem ? 'Edit Medicine Stock' : 'Add New Medicine'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInventorySubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Medicine Name*</label>
                <input
                  type="text"
                  required
                  value={medicineName}
                  onChange={(e) => setMedicineName(e.target.value)}
                  placeholder="e.g. Lipitor 20mg"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Category*</label>
                  <input
                    type="text"
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Statin, Antibiotic"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Stock Unit</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="tablets, bottles"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Quantity*</label>
                  <input
                    type="number"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Price / Unit*</label>
                  <input
                    type="number"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Min Level*</label>
                  <input
                    type="number"
                    required
                    value={minStockLevel}
                    onChange={(e) => setMinStockLevel(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Supplier Name</label>
                <input
                  type="text"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  placeholder="Pfizer Biotech"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                />
              </div>

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
                  {editingItem ? 'Save Changes' : 'Add Medicine'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
