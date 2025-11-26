import React, { useEffect, useState } from 'react';
import { useLocale } from '../contexts/LocaleContext';

/**
 * Component that automatically formats and converts currency
 * Usage: <CurrencyDisplay amount={10000} baseCurrency="RWF" />
 */
const CurrencyDisplay = ({ 
  amount, 
  baseCurrency = 'RWF', 
  className = '', 
  showSymbol = true,
  precision = 0,
  ...props 
}) => {
  const { formatCurrency, currency } = useLocale() || {};
  const [display, setDisplay] = useState('');

  useEffect(() => {
    if (formatCurrency) {
      const formatted = formatCurrency(amount, baseCurrency);
      setDisplay(formatted);
    } else {
      // Fallback
      const amt = Number(amount || 0);
      setDisplay(`${baseCurrency} ${amt.toLocaleString()}`);
    }
  }, [amount, baseCurrency, formatCurrency, currency]);

  return (
    <span className={className} {...props}>
      {display}
    </span>
  );
};

export default CurrencyDisplay;

