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
  X,
  Users,
  Mail,
  Phone,
  Building,
  Eye,
  EyeOff,
  Copy,
  Check
} from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../services/api';
import socket from '../sockets/socket';

export default function Pharmacy() {
  const [activeTab, setActiveTab] = useState('orders'); // orders, inventory, users
  const [orders, setOrders] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [pharmaUsers, setPharmaUsers] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingInv, setLoadingInv] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);

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

  // Pharmacist Modal & Form states
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userPassword, setUserPassword] = useState('pharma123'); // default
  const [userEmployeeId, setUserEmployeeId] = useState('');
  const [userStatus, setUserStatus] = useState('Active');
  const [userShift, setUserShift] = useState('Morning');
  const [userShowPassword, setUserShowPassword] = useState(false);

  // Credentials block state
  const [createdUserCredentials, setCreatedUserCredentials] = useState(null);
  const [userCredentialsCopied, setUserCredentialsCopied] = useState(false);

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

  // Fetch Pharmacists List
  const fetchPharmaUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await API.get('/users?role=PHARMACIST');
      if (res.data.success) {
        setPharmaUsers(res.data.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load pharmacy users');
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'orders') {
      fetchOrders();
    } else if (activeTab === 'inventory') {
      fetchInventory();
    } else {
      fetchPharmaUsers();
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

  const openAddUserModal = () => {
    setEditingUser(null);
    setUserName('');
    setUserEmail('');
    setUserPhone('');
    setUserPassword('pharma123');
    setUserEmployeeId('');
    setUserStatus('Active');
    setUserShift('Morning');
    setUserShowPassword(false);
    setCreatedUserCredentials(null);
    setIsUserModalOpen(true);
  };

  const openEditUserModal = (user) => {
    setEditingUser(user);
    setUserName(user.name);
    setUserEmail(user.email);
    setUserPhone(user.phone || '');
    setUserPassword(''); // blank unless changing
    setUserEmployeeId(user.employeeId || '');
    setUserStatus(user.status || 'Active');
    setUserShift(user.shift || 'Morning');
    setUserShowPassword(false);
    setIsUserModalOpen(true);
  };

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    if (!userName || !userEmail) {
      return toast.warning('Please enter name and email');
    }

    const payload = {
      name: userName,
      email: userEmail,
      phone: userPhone,
      role: 'PHARMACIST',
      department: 'PHARMACY',
      shift: userShift,
      status: userStatus,
      employeeId: userEmployeeId.trim() || undefined
    };

    if (userPassword) payload.password = userPassword;

    try {
      if (editingUser) {
        const res = await API.put(`/users/${editingUser._id}`, payload);
        if (res.data.success) {
          toast.success(`Profile for ${userName} updated`);
        }
      } else {
        const res = await API.post('/users', payload);
        if (res.data.success) {
          toast.success(`${userName} registered successfully as Pharmacist`);
          setCreatedUserCredentials({ name: userName, email: userEmail, password: userPassword, employeeId: userEmployeeId.trim() || null });
        }
      }
      setIsUserModalOpen(false);
      fetchPharmaUsers();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error saving pharmacist profile');
    }
  };

  const handleDeleteUser = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete pharmacist ${name}?`)) {
      try {
        const res = await API.delete(`/users/${id}`);
        if (res.data.success) {
          toast.success(`${name} removed successfully`);
          fetchPharmaUsers();
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to delete pharmacist record');
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
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'users' 
                ? 'bg-white text-primary shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Store Users</span>
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

      {/* STORE USERS TAB PANEL */}
      {activeTab === 'users' && (
        <div className="space-y-6 animate-fade-in">
          {/* CREATED CREDENTIALS BANNER */}
          {createdUserCredentials && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 shadow-sm animate-fade-in">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 text-emerald-700">
                  <CheckCircle className="w-5 h-5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider">Account Created — Share These Credentials</p>
                    <p className="text-[11px] text-emerald-600 mt-0.5">The user can log in immediately with the details below.</p>
                  </div>
                </div>
                <button onClick={() => setCreatedUserCredentials(null)} className="text-emerald-400 hover:text-emerald-600 transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-3 bg-white border border-emerald-100 rounded-lg p-3 font-mono text-xs text-slate-700 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans font-semibold">Name</span>
                  <span className="font-semibold">{createdUserCredentials.name}</span>
                </div>
                {createdUserCredentials.employeeId && (
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans font-semibold">Employee ID</span>
                    <span className="font-semibold text-amber-600 tracking-widest">{createdUserCredentials.employeeId}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans font-semibold">Email</span>
                  <span className="font-semibold text-primary">{createdUserCredentials.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans font-semibold">Password</span>
                  <span className="font-semibold tracking-widest">{createdUserCredentials.password}</span>
                </div>
              </div>
              <button
                onClick={() => {
                  const idLine = createdUserCredentials.employeeId ? `\nEmployee ID: ${createdUserCredentials.employeeId}` : '';
                  const text = `Name: ${createdUserCredentials.name}${idLine}\nEmail: ${createdUserCredentials.email}\nPassword: ${createdUserCredentials.password}`;
                  navigator.clipboard.writeText(text);
                  setUserCredentialsCopied(true);
                  setTimeout(() => setUserCredentialsCopied(false), 2500);
                }}
                className="mt-3 w-full flex items-center justify-center gap-2 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg transition-all"
              >
                {userCredentialsCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{userCredentialsCopied ? 'Copied to Clipboard!' : 'Copy Credentials'}</span>
              </button>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-700">Pharmacy Store Directory</h3>
              <p className="text-xs text-slate-400 mt-0.5">Manage pharmacist staff access, credentials, and shifts.</p>
            </div>
            <button
              onClick={openAddUserModal}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-primary/20"
            >
              <Plus className="w-5 h-5" />
              <span>Add Pharmacist</span>
            </button>
          </div>

          {loadingUsers ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
            </div>
          ) : pharmaUsers.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-card p-12 text-center text-slate-400 shadow-sm">
              No pharmacist accounts registered. Click "Add Pharmacist" to register one.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {pharmaUsers.map((u) => (
                <div key={u._id} className="bg-white border border-slate-200 rounded-card p-5 shadow-sm hover:shadow-md hover:scale-[1.01] transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img
                          src={u.profileImage || `https://api.dicebear.com/7.x/adventurer/svg?seed=${u.name}`}
                          alt="Pharmacist Avatar"
                          className="w-12 h-12 rounded-xl border border-slate-100"
                        />
                        {u.status === 'Inactive' && (
                          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500 border-2 border-white" title="Inactive" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-sm font-bold text-slate-700 leading-tight">{u.name}</h3>
                          {u.status === 'Inactive' && (
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-rose-50 text-rose-600 border border-rose-100 uppercase">
                              Inactive
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] font-semibold text-slate-400 mt-0.5">{u.email}</p>
                        {u.employeeId && (
                          <span className="inline-block mt-1 px-1.5 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 font-mono text-[9px] font-bold rounded uppercase tracking-wider">
                            {u.employeeId}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-6 space-y-2.5 text-xs text-slate-500">
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>Department: <span className="font-semibold text-slate-700">Pharmacy</span></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>Shift: <span className="font-semibold text-slate-700">{u.shift || 'Morning'}</span></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>{u.phone || 'Phone unassigned'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
                    <button
                      onClick={() => openEditUserModal(u)}
                      className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5"
                    >
                      <Edit className="w-3.5 h-3.5 text-slate-400" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDeleteUser(u._id, u.name)}
                      className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 rounded-lg transition-all flex items-center justify-center"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pharmacist Add/Edit Modal */}
          {isUserModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
              <div className="bg-white border border-slate-200 rounded-card w-full max-w-md shadow-xl overflow-hidden animate-fade-in animate-duration-200">
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                  <h2 className="text-base font-bold text-slate-800 uppercase tracking-wider">
                    {editingUser ? 'Edit Pharmacist Profile' : 'Register New Pharmacist'}
                  </h2>
                  <button onClick={() => setIsUserModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleUserSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto scrollbar-none">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Pharmacist Name*</label>
                    <input
                      type="text"
                      required
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="e.g. Pharmacist Miller"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Email Address*</label>
                    <input
                      type="email"
                      required
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      placeholder="pharmacist@careplus.com"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Phone number</label>
                    <input
                      type="text"
                      value={userPhone}
                      onChange={(e) => setUserPhone(e.target.value)}
                      placeholder="+1 555-0103"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Assign Shift</label>
                      <select
                        value={userShift}
                        onChange={(e) => setUserShift(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                      >
                        <option value="Morning">Morning</option>
                        <option value="Evening">Evening</option>
                        <option value="Night">Night</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Account Status</label>
                      <select
                        value={userStatus}
                        onChange={(e) => setUserStatus(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                  </div>

                  {/* Employee ID field */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Employee ID
                      <span className="ml-1 text-slate-300 font-normal normal-case">(used as login ID on staff dashboards)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={userEmployeeId}
                        onChange={(e) => setUserEmployeeId(e.target.value.toUpperCase())}
                        placeholder="e.g. CPH001"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary font-mono tracking-widest uppercase"
                      />
                      {userEmployeeId && (
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                          ID SET
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">💡 Leave blank to skip. Pharmacists use this ID to log into the Pharmacy Dashboard.</p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Security Password*</label>
                    <div className="relative">
                      <input
                        type={userShowPassword ? 'text' : 'password'}
                        value={userPassword}
                        onChange={(e) => setUserPassword(e.target.value)}
                        placeholder={editingUser ? 'Leave blank to retain current' : 'Default: pharma123'}
                        className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-primary"
                      />
                      <button
                        type="button"
                        onClick={() => setUserShowPassword(!userShowPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                      >
                        {userShowPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    {!editingUser && (
                      <p className="text-[10px] text-slate-400 mt-1">💡 Make sure to note or copy this password — you'll need it to share with the user.</p>
                    )}
                  </div>

                  <div className="flex gap-4 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsUserModalOpen(false)}
                      className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-primary/20"
                    >
                      {editingUser ? 'Save Changes' : 'Register Pharmacist'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
