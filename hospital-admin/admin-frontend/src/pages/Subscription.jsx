import { useState, useEffect } from 'react';
import { 
  CreditCard, CheckCircle, Zap, Shield, Sparkles, Building, 
  ChevronRight, RefreshCw, Calendar, Users, AlertCircle, FileText
} from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../services/api';

const PLANS = [
  {
    id: 'basic',
    name: 'Starter Plan',
    price: 299,
    features: ['Up to 5 doctors', 'Up to 500 patients', 'Patient Management', 'Appointment System', 'Basic Billing', 'Email Support'],
    color: 'emerald',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-100'
  },
  {
    id: 'standard',
    name: 'Professional Plan',
    price: 499,
    features: ['Up to 50 doctors', 'Up to 5,000 patients', 'Pharmacy Module', 'Laboratory Module', 'Analytics Dashboard', 'SMS Notifications', 'Priority Support'],
    color: 'blue',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-100'
  },
  {
    id: 'premium',
    name: 'Premium Suite',
    price: 699,
    features: ['Unlimited doctors & staff', 'Unlimited patients', 'Custom roles & permissions', 'Dedicated Server Config', 'SLA Uptime Guarantee', '24/7 Phone Support'],
    color: 'violet',
    badgeClass: 'bg-violet-50 text-violet-700 border-violet-100'
  }
];

export default function Subscription() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upgradingPlan, setUpgradingPlan] = useState(null); // plan object when modal is open
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Form states for checkout
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  const fetchSubscriptionData = async () => {
    setLoading(true);
    try {
      const res = await API.get('/hospitals/subscription');
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load subscription details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const calculateAmount = (plan) => {
    const rate = plan.price;
    return billingCycle === 'yearly' ? Math.round(rate * 12 * 0.85) : rate; // 15% discount
  };

  const handleUpgrade = async (e) => {
    e.preventDefault();
    if (!cardName || !cardNumber || !cardExpiry || !cardCvv) {
      return toast.warning('Please fill in all credit card details');
    }
    if (cardNumber.length < 16) {
      return toast.warning('Please enter a valid 16-digit card number');
    }

    setCheckoutLoading(true);
    try {
      const payload = {
        plan: upgradingPlan.id,
        billingCycle,
        amount: calculateAmount(upgradingPlan),
        paymentMethod: 'card'
      };

      const res = await API.post('/hospitals/subscription/upgrade', payload);
      if (res.data.success) {
        toast.success(`Successfully upgraded to ${upgradingPlan.name}!`);
        setUpgradingPlan(null);
        // Clear card state
        setCardName('');
        setCardNumber('');
        setCardExpiry('');
        setCardCvv('');
        fetchSubscriptionData();
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Upgrade transaction failed.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
        <span className="ml-3 text-slate-500 font-medium">Loading subscription details...</span>
      </div>
    );
  }

  const currentPlan = data?.hospital?.plan || 'basic';
  const planInfo = PLANS.find(p => p.id === currentPlan) || PLANS[0];
  const maxUsers = data?.hospital?.max_users || 10;
  const userCount = data?.userCount || 0;
  const utilizationPercentage = Math.min(100, Math.round((userCount / maxUsers) * 100));
  const isTrial = data?.hospital?.status === 'trial';
  const status = data?.hospital?.status || 'active';

  return (
    <div className="space-y-6">
      {/* Overview Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Card: Active Subscription Summary */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-card p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Active Subscription</h3>
                  <p className="text-xs text-slate-400">Hospital tenant licensing info</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase ${
                status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
              }`}>
                {status}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
              <div className="space-y-3 text-sm text-slate-500">
                <div className="flex justify-between items-center py-1">
                  <span className="font-medium text-slate-400">SaaS Plan Level:</span>
                  <span className="font-bold text-slate-800 capitalize flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                    {planInfo.name}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="font-medium text-slate-400">Hospital Code:</span>
                  <span className="font-mono font-bold text-slate-800 uppercase bg-slate-100 px-2 py-0.5 rounded text-xs">{data?.hospital?.code}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="font-medium text-slate-400">Renewal Cycle:</span>
                  <span className="font-semibold text-slate-800">Monthly</span>
                </div>
              </div>

              <div className="space-y-3 text-sm text-slate-500">
                <div className="flex justify-between items-center py-1">
                  <span className="font-medium text-slate-400">Expiration Date:</span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    {data?.hospital?.plan_expires_at ? new Date(data.hospital.plan_expires_at).toLocaleDateString() : 'Lifetime'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="font-medium text-slate-400">Staff Account limit:</span>
                  <span className="font-bold text-slate-800">{maxUsers} Max Users</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="font-medium text-slate-400">Database Mode:</span>
                  <span className="font-semibold text-slate-700">Shared Cloud DB</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-100 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <AlertCircle className="w-4 h-4 text-slate-400" />
              <span>To cancel renewals or request database export, contact CarePlus support.</span>
            </div>
            <a href="#plans-selector" className="px-4 py-2 bg-primary hover:bg-primary-dark text-white font-bold text-xs rounded-xl shadow-sm transition-all">
              Change SaaS Plan
            </a>
          </div>
        </div>

        {/* Right Card: User limits progress */}
        <div className="bg-white border border-slate-200 rounded-card p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
              <Users className="w-4.5 h-4.5 text-primary" />
              <span>Resource Limits</span>
            </h3>
            <p className="text-xs text-slate-400 mb-6">Staff licensing threshold utilization</p>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1.5">
                  <span className="text-slate-500">Staff Users Count</span>
                  <span className="text-slate-800 font-bold">Limit: {maxUsers}</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${utilizationPercentage}%` }}></div>
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>{userCount} active staff accounts</span>
                  <span>{utilizationPercentage}% Used</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mt-6">
            <div className="flex gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-800">Need more staff?</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">Upgrade to the Standard or Premium plan to increase limit thresholds up to unlimited staff members.</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Plan Selector Grid */}
      <div id="plans-selector" className="space-y-4">
        <h3 className="text-base font-bold text-slate-800">Available SaaS Plans & Upgrades</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map(plan => {
            const isCurrent = plan.id === currentPlan;
            return (
              <div 
                key={plan.id}
                className={`bg-white border rounded-card p-6 flex flex-col justify-between relative overflow-hidden transition-all ${
                  isCurrent ? `border-2 border-primary shadow-md` : 'border-slate-200 hover:shadow-md'
                }`}
              >
                {isCurrent && (
                  <div className="absolute top-0 right-0 bg-primary text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                    Current Plan
                  </div>
                )}
                
                <div>
                  <h4 className="text-lg font-bold text-slate-800 mb-1">{plan.name}</h4>
                  <p className="text-xs text-slate-400">License level access</p>
                  
                  <div className="my-6">
                    <span className="text-3xl font-extrabold text-slate-800">${plan.price}</span>
                    <span className="text-xs text-slate-400"> / month</span>
                  </div>

                  <ul className="space-y-3.5 text-xs text-slate-500 mb-8">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <CheckCircle className="w-4.5 h-4.5 text-primary shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  disabled={isCurrent}
                  onClick={() => setUpgradingPlan(plan)}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all border ${
                    isCurrent 
                      ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
                      : 'bg-primary text-white hover:bg-primary-dark border-transparent'
                  }`}
                >
                  {isCurrent ? 'Plan Active' : 'Select Plan Upgrade'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Transaction History Section */}
      <div className="bg-white border border-slate-200 rounded-card p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-1.5 flex items-center gap-2">
          <FileText className="w-4.5 h-4.5 text-primary" />
          <span>Billing & Transaction History</span>
        </h3>
        <p className="text-xs text-slate-400 mb-6">List of hospital license renewal receipts</p>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="pb-3 pl-2">Transaction ID</th>
                <th className="pb-3">SaaS Plan</th>
                <th className="pb-3">Method</th>
                <th className="pb-3">Paid Date</th>
                <th className="pb-3 text-right pr-2">Amount</th>
                <th className="pb-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {data?.payments?.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-6 text-slate-400 font-medium">No transactions logged yet</td>
                </tr>
              ) : (
                data?.payments?.map(pay => (
                  <tr key={pay.id} className="hover:bg-slate-50/50">
                    <td className="py-3.5 pl-2 font-mono font-bold text-slate-700">{pay.transaction_id}</td>
                    <td className="py-3.5 uppercase font-semibold text-slate-500">{planInfo.name}</td>
                    <td className="py-3.5 capitalize font-medium">{pay.payment_method}</td>
                    <td className="py-3.5">{new Date(pay.paid_at || pay.created_at).toLocaleDateString()}</td>
                    <td className="py-3.5 text-right font-bold text-slate-800 pr-2">INR {pay.amount}</td>
                    <td className="py-3.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        pay.status === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'
                      }`}>
                        {pay.status?.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upgrade Checkout Modal */}
      {upgradingPlan && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-card w-full max-w-md p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-slate-800 mb-1">Upgrade Hospital Subscription</h3>
            <p className="text-xs text-slate-400 mb-6">Securing upgrade to <b>{upgradingPlan.name}</b></p>

            <form onSubmit={handleUpgrade} className="space-y-4">
              {/* Billing Cycle Toggle */}
              <div className="flex bg-slate-100 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setBillingCycle('monthly')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    billingCycle === 'monthly' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Monthly Billing
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('yearly')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                    billingCycle === 'yearly' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  <span>Yearly</span>
                  <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">Save 15%</span>
                </button>
              </div>

              {/* Price Details */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-xs text-slate-500 space-y-2">
                <div className="flex justify-between">
                  <span>Upgrade Plan:</span>
                  <span className="font-semibold text-slate-800">{upgradingPlan.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cycle rate:</span>
                  <span className="font-semibold text-slate-800">${upgradingPlan.price} / month</span>
                </div>
                <div className="flex justify-between border-t border-slate-200/50 pt-2 font-bold text-slate-800">
                  <span>Amount to Pay (INR):</span>
                  <span className="text-emerald-600 text-sm">INR {calculateAmount(upgradingPlan)}</span>
                </div>
              </div>

              {/* Credit Card info */}
              <div className="space-y-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Name on Card *</label>
                  <input 
                    type="text" 
                    value={cardName} 
                    onChange={e => setCardName(e.target.value)} 
                    placeholder="John Doe" 
                    className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-primary" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Card Number *</label>
                  <input 
                    type="text" 
                    maxLength={16} 
                    value={cardNumber} 
                    onChange={e => setCardNumber(e.target.value.replace(/\D/g, ''))} 
                    placeholder="4111222233334444" 
                    className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-primary font-mono" 
                    required 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Expiry Date *</label>
                    <input 
                      type="text" 
                      maxLength={5} 
                      value={cardExpiry} 
                      onChange={e => setCardExpiry(e.target.value)} 
                      placeholder="MM/YY" 
                      className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-primary" 
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">CVV *</label>
                    <input 
                      type="password" 
                      maxLength={3} 
                      value={cardCvv} 
                      onChange={e => setCardCvv(e.target.value.replace(/\D/g, ''))} 
                      placeholder="123" 
                      className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-primary" 
                      required 
                    />
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-4 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setUpgradingPlan(null)}
                  className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={checkoutLoading}
                  className="flex-1 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-primary/20"
                >
                  {checkoutLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{checkoutLoading ? 'Processing...' : 'Complete Payment'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
