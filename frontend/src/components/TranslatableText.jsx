import React, { useState, useEffect } from 'react';
import { useLocale } from '../contexts/LocaleContext';
import { translateText } from '../utils/translator';

/**
 * Component that automatically translates its children text
 * Usage: <TranslatableText>Hello World</TranslatableText>
 */
const TranslatableText = ({ children, className = '', as: Component = 'span', ...props }) => {
  const { language } = useLocale() || { language: 'en' };
  const [translated, setTranslated] = useState(children);

  useEffect(() => {
    if (language === 'en' || !children) {
      setTranslated(children);
      return;
    }

    const translate = async () => {
      if (typeof children === 'string') {
        try {
          const result = await translateText(children, language, 'en');
          setTranslated(result);
        } catch {
          setTranslated(children);
        }
      } else {
        setTranslated(children);
      }
    };

    translate();
  }, [children, language]);

  return <Component className={className} {...props}>{translated}</Component>;
};

export default TranslatableText;

