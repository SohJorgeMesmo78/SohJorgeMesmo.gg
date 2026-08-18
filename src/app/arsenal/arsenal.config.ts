export type ArsenalIcon = 'keyboard' | 'mouse' | 'monitor' | 'microphone' | 'headphones';

export interface ArsenalStore {
  name: 'Amazon' | 'AliExpress';
  url: string;
}

export interface ArsenalItem {
  category: string;
  name: string;
  icon: ArsenalIcon;
  image?: string;
  stores: ArsenalStore[];
}

export const arsenalItems: ArsenalItem[] = [
  {
    category: 'Teclado',
    name: 'AULA F75',
    icon: 'keyboard',
    stores: [
      { name: 'Amazon', url: 'https://amzn.to/4xlyosZ' },
      { name: 'AliExpress', url: 'https://s.click.aliexpress.com/e/_c3bnOSUD' },
    ],
  },
  {
    category: 'Mouse',
    name: 'Rapoo VT7 MAX',
    icon: 'mouse',
    stores: [
      { name: 'AliExpress', url: 'https://s.click.aliexpress.com/e/_c3O7hnjF' },
    ],
  },
  {
    category: 'Monitor',
    name: 'Samsung S3 24" FHD 100 Hz',
    icon: 'monitor',
    stores: [
      { name: 'Amazon', url: 'https://amzn.to/3QhbPFi' },
    ],
  },
  {
    category: 'Microfone',
    name: 'Microfone RGB Condensador',
    icon: 'microphone',
    stores: [
      { name: 'Amazon', url: 'https://amzn.to/3S8Mj5A' },
      { name: 'AliExpress', url: 'https://s.click.aliexpress.com/e/_c4o9ROdb' },
    ],
  },
  {
    category: 'Fone sem fio',
    name: 'Fuxi-H7',
    icon: 'headphones',
    stores: [
      { name: 'Amazon', url: 'https://link.amazon/B0cc7wDlc' },
    ],
  },
];
