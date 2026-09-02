import React, { useState } from 'react';

const plans = [
  {
    name: 'Basic', price: 'Free', period: '',
    description: 'Perfect for exploring how AI can help you land your first job.',
    features: ['3 Resume Analyses per month', 'Basic ATS Keyword Matching', 'Standard Interview Kit generation', 'Community support'],
    buttonText: 'Current Plan', highlight: false, icon: 'sentiment_satisfied'
  },
  {
    name: 'Pro', price: '$12', period: '/mo',
    description: 'For serious job seekers who want to maximize their interview chances.',
    features: ['Unlimited Resume Analyses', 'Deep ATS Scanning & Optimization', 'Advanced Mock Interview AI Bot', 'Personalized Salary Negotiation Guide', 'Priority email support'],
    buttonText: 'Upgrade to Pro', highlight: true, icon: 'workspace_premium'
  },
  {
    name: 'Lifetime', price: '$99', period: ' one-time',
    description: 'Pay once and unlock all premium features for your entire career.',
    features: ['Everything in Pro, forever', 'Early access to new AI features', '1-on-1 expert resume review (annual)', 'Dedicated success manager'],
    buttonText: 'Get Lifetime', highlight: false, icon: 'diamond'
  }
];

export default function SubscriptionSection() {
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [toast, setToast] = useState('');
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  return (
    <div className="max-w-[1100px] mx-auto px-4 py-10 animate-fade-in-up">
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-lg shadow-xl z-50 animate-fade-in-up text-[11px] font-semibold tracking-wide text-accent" style={{ background: 'var(--color-card)', border: '1px solid var(--color-accent)' }}>
          {toast}
        </div>
      )}

      <div className="text-center mb-12">
        <h1 className="text-[28px] md:text-[38px] font-bold text-text-heading mb-3 tracking-tight">
          Invest in your <span className="text-accent">Career</span>
        </h1>
        <p className="text-text-body text-[15px] max-w-xl mx-auto">Choose the plan that fits your job search journey.</p>
        <div className="flex items-center justify-center mt-6">
          <div className="rounded-full p-0.5 inline-flex" style={{ background: 'var(--color-card-inset)', border: '1px solid var(--color-border-subtle)' }}>
            {['monthly', 'annual'].map(c => (
              <button key={c} className={`px-5 py-1.5 rounded-full text-[11px] font-semibold tracking-wide transition-colors ${billingCycle === c ? 'text-text-heading' : 'text-text-muted hover:text-text-body'}`}
                style={billingCycle === c ? { background: 'var(--color-card)', border: '1px solid var(--color-border-subtle)' } : {}}
                onClick={() => setBillingCycle(c)}>
                {c === 'monthly' ? 'Monthly' : 'Annually'} {c === 'annual' && <span className="text-[#22C55E] ml-1">-20%</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-[960px] mx-auto">
        {plans.map((plan) => (
          <div key={plan.name} className="relative rounded-xl p-6 flex flex-col" style={{
            background: 'var(--color-card)',
            border: plan.highlight ? '2px solid var(--color-accent)' : '1px solid var(--color-border-default)',
          }}>
            {plan.highlight && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <span className="bg-accent text-white text-[9px] font-bold tracking-wider uppercase px-3 py-1 rounded-full">Most Popular</span>
              </div>
            )}
            <div className="mb-4">
              <span className="material-symbols-outlined text-[28px] mb-3 block text-accent" style={{ fontVariationSettings: "'FILL' 1" }}>{plan.icon}</span>
              <h3 className="text-[16px] font-semibold text-text-heading mb-1.5">{plan.name}</h3>
              <p className="text-[12px] text-text-muted leading-relaxed h-9">{plan.description}</p>
            </div>
            <div className="mb-5">
              <div className="flex items-end gap-1">
                <span className="text-[32px] font-bold text-text-heading leading-none">
                  {plan.price === '$12' && billingCycle === 'annual' ? '$9' : plan.price}
                </span>
                <span className="text-[12px] text-text-muted mb-0.5 font-medium">{plan.period}</span>
              </div>
            </div>
            <button
              className={`w-full py-2.5 rounded-lg font-semibold text-[13px] transition-colors mb-5 ${plan.highlight ? 'bg-accent text-white hover:opacity-90' : 'text-text-body'}`}
              style={!plan.highlight ? { background: 'var(--color-card-inset)', border: '1px solid var(--color-border-subtle)' } : {}}
              onClick={() => showToast('This is a demo. No real charges applied!')}
            >
              {plan.buttonText}
            </button>
            <div className="space-y-3 flex-1">
              <p className="font-label-caps text-[9px] text-text-muted mb-2">What's Included</p>
              {plan.features.map((f) => (
                <div key={f} className="flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-[15px] text-accent shrink-0 mt-px">check_circle</span>
                  <span className="text-[12px] text-text-body leading-relaxed">{f}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-14 text-center pt-10 max-w-lg mx-auto" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
        <span className="material-symbols-outlined text-text-muted text-[28px] mb-3 block">security</span>
        <h4 className="text-[14px] font-semibold text-text-heading mb-1.5">Secure & Transparent</h4>
        <p className="text-[12px] text-text-muted leading-relaxed">Cancel or change your plan at any time. Secure payments via Stripe.</p>
      </div>
    </div>
  );
}
