import { useMemo } from 'react';
import siteCopy from '../content/site-copy-ar.json';
import experience from '../content/coffee-experience-ar.json';
import drinkDefaults from '../content/drinks-ar.json';
import { useStore, type Settings } from './lib';

export type Drink = {
  id: string;
  name: string;
  category: 'hot' | 'cold';
  description: string;
  image: string;
  price: number | null;
  active: boolean;
};
export const defaultSiteContent = {
  siteCopy,
  experience,
  drinks: drinkDefaults as Drink[],
  appearance: {
    accent: '#ffd200',
    background: '#f8f5ef',
    text: '#251e18',
    logo: '/images/dar-logo.webp',
  },
  social: {
    facebook: 'https://www.facebook.com/thehouseofbraziliancoffee/',
    instagram: 'https://www.instagram.com/braziliancaffe/',
    whatsapp: '',
  },
  home: {
    storeTitle: 'حكايتك تبدأ باختيارك.',
    storeDescription: 'العبوة، التحميص، سادة أو محوج. فنجان معمول على مزاجك.',
    storeCta: 'افتح المتجر',
    quizTitle: 'لسه بتدور على قهوتك؟',
    quizDescription: '٣ اختيارات بسيطة عن طريقتك وذوقك. نرشّح لك عبوة تناسبك، ونقول لك ليه.',
    quizCta: 'اكتشف فنجانك',
    learnTitle: 'القهوة الحلوة تبدأ من طريقة تحضيرها.',
    learnDescription:
      'من الكنكة للفلتر. خطوات بسيطة، ومقادير واضحة، وحكاية تستاهل تتعمل على الهادي.',
    learnCta: 'اكتشف طرق التحضير',
    storyImage: '/images/coffee-story.webp',
    quizImage: '/images/drink-espresso.webp',
    recipesImage: '/images/coffee-recipes.webp',
    journeyImage: '/images/coffee-journey.webp',
    brewingImage: '/images/brewing-editorial.webp',
  },
  ritual: [
    { title: 'اختار قهوتك', text: 'عبوة تناسبك، ووزن على قد احتياجك.', href: '/shop' },
    { title: 'ظبّطها على مزاجك', text: 'التحميص والطحنة، سادة أو محوج.', href: '/quiz' },
    { title: 'كمّل طلبك', text: 'استلام من الفرع أو توصيل حسب المتاح.', href: '/cart' },
  ],
};
export type SiteContent = typeof defaultSiteContent;

function merge(base: unknown, value: unknown): unknown {
  if (value === undefined || value === null) return structuredClone(base);
  if (Array.isArray(base)) {
    if (!Array.isArray(value)) return structuredClone(base);
    return value.map((item, index) => merge(base[index] ?? base[0], item));
  }
  if (base && typeof base === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return structuredClone(base);
    return Object.fromEntries(
      Object.entries(base).map(([key, entry]) => [
        key,
        merge(entry, (value as Record<string, unknown>)[key]),
      ]),
    );
  }
  return typeof value === typeof base ? value : base;
}
export function resolveSiteContent(settings: Settings): SiteContent {
  const resolved = merge(defaultSiteContent, settings.cms) as SiteContent;
  // Prices are nullable, and blank menus remain an intentional owner choice.
  if (settings.cms?.drinks) resolved.drinks = settings.cms.drinks.map((drink) => ({ ...drink }));
  resolved.siteCopy.brand.name = settings.brand;
  resolved.siteCopy.hero.title = settings.heroTitle;
  resolved.siteCopy.hero.subtitle = settings.heroSubtitle;
  return resolved;
}
export function useSiteContent() {
  const { settings } = useStore();
  return useMemo(() => resolveSiteContent(settings), [settings]);
}
