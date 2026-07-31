import React, { useState } from 'react';

const plans = [
  {
    name: 'Basic',
    price: 'Free',
    period: '',
    description: 'Perfect for exploring how AI can help you land your first job.',
    features: [
      '3 Resume Analyses per month',
      'Basic ATS Keyword Matching',
      'Standard Interview Kit generation',
      'Community support'
    ],
    buttonText: 'Current Plan',
    buttonClass: 'bg-[#27272A] text-white hover:bg-[#3F3F46]',
    highlight: false,
    icon: 'sentiment_satisfied'
  },
  {
    name: 'Pro',
    price: '$12',
    period: '/mo',
    description: 'For serious job seekers who want to maximize their interview chances.',
    features: [
      'Unlimited Resume Analyses',
      'Deep ATS Scanning & Optimization',
      'Advanced Mock Interview AI Bot',
      'Personalized Salary Negotiation Guide',
      'Priority email support'
    ],
    buttonText: 'Upgrade to Pro',
    buttonClass: 'bg-[#5B8CFF] text-white hover:bg-[#4F7DF3] shadow-[0_0_15px_rgba(91,140,255,0.4)]',
    highlight: true,
    icon: 'workspace_premium'
  },
  {
    name: 'Lifetime',
    price: '$99',
    period: ' one-time',
    description: 'Pay once and unlock all premium features for your entire career.',
    features: [
      'Everything in Pro, forever',
      'Early access to new AI features',
      '1-on-1 expert resume review (annual)',
      'Dedicated success manager'
    ],
    buttonText: 'Get Lifetime',
    buttonClass: 'bg-[#171A20] border border-[#5B8CFF]/50 text-[#5B8CFF] hover:bg-[#5B8CFF]/10',
    highlight: false,
    icon: 'diamond'
  }
];

export default function SubscriptionSection() {
  const [billingCycle, setBillingCycle] = useState('monthly');

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-12 animate-fade-in-up">
      {/* Header */}
      <div className="text-center mb-16">
        <h1 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight">
          Invest in your <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5B8CFF] to-[#8b5cf6]">Career</span>
        </h1>
        <p className="text-[#A1A1AA] text-lg max-w-2xl mx-auto">
          Choose the plan that fits your job search journey. Unlock advanced AI tools to get hired faster.
        </p>
        
        {/* Toggle */}
        <div className="flex items-center justify-center mt-8">
          <div className="bg-[#09090B] border border-[#27272A] rounded-full p-1 inline-flex">
            <button 
              className={`px-6 py-2 rounded-full font-label-caps text-xs tracking-widest transition-all ${billingCycle === 'monthly' ? 'bg-[#27272A] text-white shadow-md' : 'text-[#71717A] hover:text-white'}`}
              onClick={() => setBillingCycle('monthly')}
            >
              Monthly
            </button>
            <button 
              className={`px-6 py-2 rounded-full font-label-caps text-xs tracking-widest transition-all ${billingCycle === 'annual' ? 'bg-[#27272A] text-white shadow-md' : 'text-[#71717A] hover:text-white'}`}
              onClick={() => setBillingCycle('annual')}
            >
              Annually <span className="text-[#22C55E] ml-1">-20%</span>
            </button>
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {plans.map((plan, index) => (
          <div 
            key={plan.name} 
            className={`relative rounded-3xl p-8 flex flex-col ${
              plan.highlight 
                ? 'bg-[#171A20] border-2 border-[#5B8CFF] shadow-[0_20px_50px_rgba(91,140,255,0.15)] md:-mt-4 md:mb-4' 
                : 'bg-[#09090B] border border-[#27272A] hover:border-[#3F3F46] transition-colors'
            }`}
          >
            {plan.highlight && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <span className="bg-[#5B8CFF] text-white text-[10px] font-black tracking-widest uppercase px-4 py-1 rounded-full shadow-lg">
                  Most Popular
                </span>
              </div>
            )}
            
            <div className="mb-6">
              <span className="material-symbols-outlined text-4xl mb-4" style={{ color: plan.highlight ? '#5B8CFF' : '#71717A', fontVariationSettings: "'FILL' 1" }}>
                {plan.icon}
              </span>
              <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
              <p className="text-sm text-[#A1A1AA] h-10">{plan.description}</p>
            </div>
            
            <div className="mb-8">
              <div className="flex items-end gap-1">
                <span className="text-4xl font-black text-white">
                  {plan.price === '$12' && billingCycle === 'annual' ? '$9' : plan.price}
                </span>
                <span className="text-sm text-[#71717A] mb-1 font-semibold">{plan.period}</span>
              </div>
            </div>
            
            <button 
              className={`w-full py-3 rounded-xl font-bold transition-all mb-8 ${plan.buttonClass}`}
              onClick={() => alert('This is a demo. No real limits or charges are applied!')}
            >
              {plan.buttonText}
            </button>
            
            <div className="space-y-4 flex-1">
              <p className="text-[10px] font-label-caps tracking-widest text-[#71717A] mb-4">WHAT'S INCLUDED</p>
              {plan.features.map((feature, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-[16px] text-[#5B8CFF] shrink-0 mt-0.5">check_circle</span>
                  <span className="text-sm text-[#D4D4D8]">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      {/* FAQ or Trust Badge */}
      <div className="mt-20 text-center border-t border-[#27272A] pt-12 max-w-3xl mx-auto">
        <span className="material-symbols-outlined text-[#71717A] text-3xl mb-4">security</span>
        <h4 className="text-lg font-semibold text-white mb-2">Secure & Transparent</h4>
        <p className="text-sm text-[#A1A1AA]">
          You can cancel or change your plan at any time. Secure payments processed via Stripe. 
          No limits on your ambition.
        </p>
      </div>
    </div>
  );
}
