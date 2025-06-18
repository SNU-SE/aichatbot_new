
// Language code mapping
export const LANGUAGE_CODES = {
  'Korean': 'ko',
  'English': 'en', 
  'Chinese': 'zh',
  'Japanese': 'ja'
} as const;

export type SupportedLanguage = keyof typeof LANGUAGE_CODES;

// Get language code from mother tongue
export const getLanguageCode = (motherTongue: string): string => {
  return LANGUAGE_CODES[motherTongue as SupportedLanguage] || 'ko';
};

// Format bilingual text (mother tongue first, then Korean)
export const formatBilingualText = (
  nativeText: string | null, 
  koreanText: string | null,
  motherTongue: string
): string => {
  if (motherTongue === 'Korean') {
    return koreanText || '';
  }
  
  const native = nativeText || '';
  const korean = koreanText || '';
  
  if (native && korean && native !== korean) {
    return `${native} / ${korean}`;
  }
  
  return native || korean || '';
};

// Get description based on language
export const getMultilingualDescription = (
  item: any,
  motherTongue: string
): string => {
  const langCode = getLanguageCode(motherTongue);
  
  if (motherTongue === 'Korean') {
    return item.description_ko || item.description || '';
  }
  
  const nativeDesc = item[`description_${langCode}`];
  const koreanDesc = item.description_ko || item.description;
  
  return formatBilingualText(nativeDesc, koreanDesc, motherTongue);
};
