import React, { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

const brand = {
  primary: '#a06b42',
  primaryHover: '#8f5a32',
};

const SectionWrapper = ({ title, children, subtitle }) => (
  <div className="min-h-screen bg-[#fff8f1]">
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-2xl shadow-sm border border-[#eadfcc]">
        <div className="p-6 border-b border-[#f1e6d5]">
          <h1 className="text-2xl font-bold text-[#4b2a00]">{title}</h1>
          {subtitle ? <p className="text-sm text-[#6b5744] mt-1">{subtitle}</p> : null}
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
      <div className="mt-4 text-sm">
        <Link to="/profile" className="text-[#a06b42] hover:text-[#8f5a32]">← Back to profile</Link>
      </div>
    </div>
  </div>
);

const Toggle = ({ label, checked, onChange }) => (
  <label className="flex items-center justify-between py-3">
    <span className="text-sm text-[#4b2a00]">{label}</span>
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-11 h-6 rounded-full transition-colors relative ${checked ? 'bg-[#a06b42]' : 'bg-gray-300'}`}
      aria-pressed={checked}
    >
      <span className={`absolute top-0.5 ${checked ? 'right-0.5' : 'left-0.5'} w-5 h-5 rounded-full bg-white shadow transition-all`}></span>
    </button>
  </label>
);

export default function SettingsSection() {
  const { section } = useParams();

  const [prefs, setPrefs] = useState({
    marketingEmails: true,
    bookingUpdates: true,
    productNews: false,
    smsAlerts: false,
  });

  const [cards, setCards] = useState([
    { id: 'demo-1', brand: 'Visa', last4: '4242', exp: '12/27', primary: true },
  ]);

  const meta = useMemo(() => {
    switch (section) {
      case 'rewards':
        return { title: 'Rewards & Wallet', subtitle: 'Track rewards and wallet balance' };
      case 'payments':
        return { title: 'Payment Methods', subtitle: 'Manage saved cards for faster checkout' };
      case 'transactions':
        return { title: 'Transactions', subtitle: 'Your recent charges and payouts' };
      case 'security':
        return { title: 'Security Settings', subtitle: 'Keep your account safe' };
      case 'other-travelers':
        return { title: 'Other Travelers', subtitle: 'Manage profiles of your travel companions' };
      case 'customization':
        return { title: 'Customization Preferences', subtitle: 'Personalize your experience' };
      case 'email-preferences':
        return { title: 'Email Preferences', subtitle: 'Choose what you want to hear about' };
      case 'saved-lists':
        return { title: 'Saved Lists', subtitle: 'Places and properties you saved' };
      case 'reviews':
        return { title: 'My Reviews', subtitle: 'Your feedback on past stays' };
      case 'safety':
        return { title: 'Safety Resource Center', subtitle: 'Guides and tools for safer travel' };
      case 'disputes':
        return { title: 'Dispute Resolution', subtitle: 'Open and track disputes' };
      default:
        return { title: 'Account', subtitle: '' };
    }
  }, [section]);

  const PrimaryButton = ({ children, ...rest }) => (
    <button
      {...rest}
      className="px-4 py-2 rounded-lg text-white"
      style={{ backgroundColor: brand.primary }}
      onMouseOver={(e) => (e.currentTarget.style.backgroundColor = brand.primaryHover)}
      onFocus={(e) => (e.currentTarget.style.backgroundColor = brand.primaryHover)}
      onMouseOut={(e) => (e.currentTarget.style.backgroundColor = brand.primary)}
    >
      {children}
    </button>
  );

  const Card = ({ c }) => (
    <div className="flex items-center justify-between p-4 rounded-lg border border-[#eadfcc]">
      <div>
        <div className="font-semibold text-[#4b2a00]">{c.brand} •••• {c.last4}</div>
        <div className="text-xs text-[#6b5744]">Expires {c.exp}</div>
        {c.primary && <div className="text-xs text-emerald-700 mt-1">Primary</div>}
      </div>
      <div className="flex items-center gap-2">
        {!c.primary && (
          <button
            className="text-sm px-3 py-1 rounded border"
            onClick={() => setCards(prev => prev.map(x => ({ ...x, primary: x.id === c.id })))}
          >Set Primary</button>
        )}
        <button
          className="text-sm px-3 py-1 rounded border border-red-300 text-red-700"
          onClick={() => setCards(prev => prev.filter(x => x.id !== c.id))}
        >Remove</button>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (section) {
      case 'payments':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#4b2a00]">Saved Cards</h2>
              <PrimaryButton onClick={() => setCards(prev => [...prev, { id: 'tmp-' + Date.now(), brand: 'Mastercard', last4: '4444', exp: '01/29', primary: false }])}>Add Card</PrimaryButton>
            </div>
            <div className="space-y-3">
              {cards.map(c => <Card key={c.id} c={c} />)}
              {cards.length === 0 && <div className="text-sm text-[#6b5744]">No cards yet.</div>}
            </div>
          </div>
        );
      case 'email-preferences':
        return (
          <div className="space-y-2">
            <Toggle label="Booking updates" checked={prefs.bookingUpdates} onChange={(v) => setPrefs(p => ({ ...p, bookingUpdates: v }))} />
            <Toggle label="Marketing emails" checked={prefs.marketingEmails} onChange={(v) => setPrefs(p => ({ ...p, marketingEmails: v }))} />
            <Toggle label="Product news" checked={prefs.productNews} onChange={(v) => setPrefs(p => ({ ...p, productNews: v }))} />
            <Toggle label="SMS alerts" checked={prefs.smsAlerts} onChange={(v) => setPrefs(p => ({ ...p, smsAlerts: v }))} />
            <div className="pt-4">
              <PrimaryButton onClick={() => window.alert('Preferences saved')}>Save Preferences</PrimaryButton>
            </div>
          </div>
        );
      case 'transactions':
        return (
          <div className="space-y-3">
            <div className="text-sm text-[#6b5744]">Recent transactions will appear here.</div>
            <div className="p-4 rounded-lg bg-[#f9f3ea] border border-[#eadfcc] text-sm">This is a lightweight placeholder wired for later backend integration.</div>
          </div>
        );
      case 'security':
        return (
          <form className="space-y-4" onSubmit={(e)=>{e.preventDefault(); window.alert('Security settings saved')}}>
            <div>
              <label className="block text-sm text-[#4b2a00] mb-1">Current Password</label>
              <input type="password" className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-[#4b2a00] mb-1">New Password</label>
                <input type="password" className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm text-[#4b2a00] mb-1">Confirm Password</label>
                <input type="password" className="w-full px-3 py-2 border rounded-lg" />
              </div>
            </div>
            <PrimaryButton type="submit">Update Password</PrimaryButton>
          </form>
        );
      default:
        return (
          <div className="space-y-3">
            <div className="text-sm text-[#6b5744]">This section is available and ready for future backend hookup.</div>
            <div className="p-4 rounded-lg bg-[#f9f3ea] border border-[#eadfcc] text-sm">Choose items in the profile to navigate here.</div>
          </div>
        );
    }
  };

  return (
    <SectionWrapper title={meta.title} subtitle={meta.subtitle}>
      {renderContent()}
    </SectionWrapper>
  );
}
