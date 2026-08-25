/**
 * Static demo data for the "Add new Daily production details" screen.
 * No API calls — everything here is hard-coded sample content.
 */

export type ColorName = 'Blue' | 'Green' | 'White';

export type GroupIcon = 'material' | 'waste' | 'kora' | 'yarn' | 'delivery';

export interface Metric {
  label: string;
  value: string;
  /** Renders as plain text rather than a number. */
  text?: boolean;
}

export interface MetricGroup {
  title: string;
  icon: GroupIcon;
  metrics: Metric[];
}

export interface ProductionEntry {
  id: string;
  size: string;
  color: ColorName;
  groups: MetricGroup[];
  result: { label: string; value: string };
}

export type TabId = 'extruder' | 'looms' | 'checking' | 'delivered';

export const inventoryBalances = {
  hdpe: [
    { name: 'Grail', value: '1500.00' },
    { name: 'Iraldis', value: '1500.00' },
    { name: 'Opal', value: '1500.00' },
    { name: 'Reliance', value: '1500.00' },
  ],
  chemical: [
    { name: 'ACM', value: '150.00' },
    { name: 'DN-MB', value: '150.00' },
  ],
  color: [
    { name: 'Blue', value: '60.00' },
    { name: 'Green', value: '60.00' },
    { name: 'White', value: '60.00' },
  ],
};

const extruderEntries: ProductionEntry[] = [
  {
    id: 'ex-1',
    size: '40"',
    color: 'Blue',
    groups: [
      {
        title: 'Raw Material Input',
        icon: 'material',
        metrics: [
          { label: 'Brand', value: 'Reliance', text: true },
          { label: 'Chemical', value: 'ACM', text: true },
          { label: 'HDPE (kg)', value: '450.00 kg' },
          { label: 'Chem. Wt (kg)', value: '12.00 kg' },
          { label: 'Color Used (kg)', value: '8.00 kg' },
        ],
      },
      {
        title: 'Wastages',
        icon: 'waste',
        metrics: [
          { label: 'Lumps (kg)', value: '6.50 kg' },
          { label: 'Yarn Wastage (kg)', value: '9.00 kg' },
        ],
      },
    ],
    result: { label: 'Yarn Output (kg)', value: '454.50 kg' },
  },
  {
    id: 'ex-2',
    size: '30"',
    color: 'Green',
    groups: [
      {
        title: 'Raw Material Input',
        icon: 'material',
        metrics: [
          { label: 'Brand', value: 'Grail', text: true },
          { label: 'Chemical', value: 'DN-MB', text: true },
          { label: 'HDPE (kg)', value: '380.00 kg' },
          { label: 'Chem. Wt (kg)', value: '10.00 kg' },
          { label: 'Color Used (kg)', value: '6.50 kg' },
        ],
      },
      {
        title: 'Wastages',
        icon: 'waste',
        metrics: [
          { label: 'Lumps (kg)', value: '5.00 kg' },
          { label: 'Yarn Wastage (kg)', value: '7.50 kg' },
        ],
      },
    ],
    result: { label: 'Yarn Output (kg)', value: '384.00 kg' },
  },
  {
    id: 'ex-3',
    size: '20"',
    color: 'White',
    groups: [
      {
        title: 'Raw Material Input',
        icon: 'material',
        metrics: [
          { label: 'Brand', value: 'Opal', text: true },
          { label: 'Chemical', value: 'ACM', text: true },
          { label: 'HDPE (kg)', value: '300.00 kg' },
          { label: 'Chem. Wt (kg)', value: '8.00 kg' },
          { label: 'Color Used (kg)', value: '5.00 kg' },
        ],
      },
      {
        title: 'Wastages',
        icon: 'waste',
        metrics: [
          { label: 'Lumps (kg)', value: '4.00 kg' },
          { label: 'Yarn Wastage (kg)', value: '6.00 kg' },
        ],
      },
    ],
    result: { label: 'Yarn Output (kg)', value: '303.00 kg' },
  },
];

const loomsEntries: ProductionEntry[] = [
  {
    id: 'lo-1',
    size: '40"',
    color: 'Blue',
    groups: [
      {
        title: 'Yarn & Fabric Production',
        icon: 'yarn',
        metrics: [
          { label: 'Yarn Input (kg)', value: '454.50 kg' },
          { label: 'Fabric Production (kg)', value: '442.00 kg' },
        ],
      },
      {
        title: 'Wastages',
        icon: 'waste',
        metrics: [{ label: 'Looms Wastage (kg)', value: '12.50 kg' }],
      },
    ],
    result: { label: 'Fabric Output (kg)', value: '442.00 kg' },
  },
  {
    id: 'lo-2',
    size: '30"',
    color: 'Green',
    groups: [
      {
        title: 'Yarn & Fabric Production',
        icon: 'yarn',
        metrics: [
          { label: 'Yarn Input (kg)', value: '384.00 kg' },
          { label: 'Fabric Production (kg)', value: '374.00 kg' },
        ],
      },
      {
        title: 'Wastages',
        icon: 'waste',
        metrics: [{ label: 'Looms Wastage (kg)', value: '10.00 kg' }],
      },
    ],
    result: { label: 'Fabric Output (kg)', value: '374.00 kg' },
  },
  {
    id: 'lo-3',
    size: '20"',
    color: 'White',
    groups: [
      {
        title: 'Yarn & Fabric Production',
        icon: 'yarn',
        metrics: [
          { label: 'Yarn Input (kg)', value: '303.00 kg' },
          { label: 'Fabric Production (kg)', value: '294.50 kg' },
        ],
      },
      {
        title: 'Wastages',
        icon: 'waste',
        metrics: [{ label: 'Looms Wastage (kg)', value: '8.50 kg' }],
      },
    ],
    result: { label: 'Fabric Output (kg)', value: '294.50 kg' },
  },
];

const checkingEntries: ProductionEntry[] = [
  {
    id: 'fc-1',
    size: '40"',
    color: 'Blue',
    groups: [
      {
        title: 'Kora & Fabric Production',
        icon: 'kora',
        metrics: [
          { label: 'Kora (rolls)', value: '12', text: true },
          { label: 'Fabric Production (kg)', value: '1,250.00 kg' },
        ],
      },
      {
        title: 'Wastages',
        icon: 'waste',
        metrics: [
          { label: 'Bit Wastage (kg)', value: '25.00 kg' },
          { label: 'Fabric Wastage (kg)', value: '15.00 kg' },
        ],
      },
    ],
    result: { label: 'Fabric Stock (kg)', value: '1,210.00 kg' },
  },
  {
    id: 'fc-2',
    size: '30"',
    color: 'Green',
    groups: [
      {
        title: 'Kora & Fabric Production',
        icon: 'kora',
        metrics: [
          { label: 'Kora (rolls)', value: '12', text: true },
          { label: 'Fabric Production (kg)', value: '1,250.00 kg' },
        ],
      },
      {
        title: 'Wastages',
        icon: 'waste',
        metrics: [
          { label: 'Bit Wastage (kg)', value: '25.00 kg' },
          { label: 'Fabric Wastage (kg)', value: '15.00 kg' },
        ],
      },
    ],
    result: { label: 'Fabric Stock (kg)', value: '1,210.00 kg' },
  },
  {
    id: 'fc-3',
    size: '20"',
    color: 'White',
    groups: [
      {
        title: 'Kora & Fabric Production',
        icon: 'kora',
        metrics: [
          { label: 'Kora (rolls)', value: '12', text: true },
          { label: 'Fabric Production (kg)', value: '1,250.00 kg' },
        ],
      },
      {
        title: 'Wastages',
        icon: 'waste',
        metrics: [
          { label: 'Bit Wastage (kg)', value: '25.00 kg' },
          { label: 'Fabric Wastage (kg)', value: '15.00 kg' },
        ],
      },
    ],
    result: { label: 'Fabric Stock (kg)', value: '1,210.00 kg' },
  },
];

const deliveredEntries: ProductionEntry[] = [
  {
    id: 'fd-1',
    size: '40"',
    color: 'Blue',
    groups: [
      {
        title: 'Delivery Details',
        icon: 'delivery',
        metrics: [
          { label: 'Party Name', value: 'Sri Traders', text: true },
          { label: 'Vehicle No', value: 'TN 45 AB 1234', text: true },
          { label: 'Rolls', value: '8', text: true },
        ],
      },
      {
        title: 'Fabric Sent',
        icon: 'yarn',
        metrics: [
          { label: 'Fabric Stock (kg)', value: '1,210.00 kg' },
          { label: 'Balance (kg)', value: '590.00 kg' },
        ],
      },
    ],
    result: { label: 'Delivered (kg)', value: '620.00 kg' },
  },
  {
    id: 'fd-2',
    size: '30"',
    color: 'Green',
    groups: [
      {
        title: 'Delivery Details',
        icon: 'delivery',
        metrics: [
          { label: 'Party Name', value: 'Anand Textiles', text: true },
          { label: 'Vehicle No', value: 'TN 38 CJ 8890', text: true },
          { label: 'Rolls', value: '6', text: true },
        ],
      },
      {
        title: 'Fabric Sent',
        icon: 'yarn',
        metrics: [
          { label: 'Fabric Stock (kg)', value: '1,210.00 kg' },
          { label: 'Balance (kg)', value: '730.00 kg' },
        ],
      },
    ],
    result: { label: 'Delivered (kg)', value: '480.00 kg' },
  },
  {
    id: 'fd-3',
    size: '20"',
    color: 'White',
    groups: [
      {
        title: 'Delivery Details',
        icon: 'delivery',
        metrics: [
          { label: 'Party Name', value: 'KPR Knits', text: true },
          { label: 'Vehicle No', value: 'TN 41 BD 4521', text: true },
          { label: 'Rolls', value: '4', text: true },
        ],
      },
      {
        title: 'Fabric Sent',
        icon: 'yarn',
        metrics: [
          { label: 'Fabric Stock (kg)', value: '1,210.00 kg' },
          { label: 'Balance (kg)', value: '895.00 kg' },
        ],
      },
    ],
    result: { label: 'Delivered (kg)', value: '315.00 kg' },
  },
];

export const entriesByTab: Record<TabId, ProductionEntry[]> = {
  extruder: extruderEntries,
  looms: loomsEntries,
  checking: checkingEntries,
  delivered: deliveredEntries,
};

export const colorSwatch: Record<ColorName, string> = {
  Blue: '#2563EB',
  Green: '#16A34A',
  White: '#FFFFFF',
};
