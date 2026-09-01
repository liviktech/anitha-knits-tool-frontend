import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function LanguageToggle() {
  const { i18n } = useTranslation();
  
  const isTamil = i18n.language.startsWith('ta');

  const toggleLanguage = () => {
    i18n.changeLanguage(isTamil ? 'en' : 'ta');
  };

  return (
    <Button 
      variant="outline" 
      onClick={toggleLanguage}
      className="flex items-center gap-2 h-9 px-3 bg-white text-gray-800 border-gray-300 hover:bg-gray-100 font-inter font-medium text-xs shadow-sm"
    >
      <Languages className="w-4 h-4 text-gray-600" />
      {isTamil ? 'English' : 'தமிழ்'}
    </Button>
  );
}
