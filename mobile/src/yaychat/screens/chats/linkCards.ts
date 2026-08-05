export type ChatLinkCard =
  | {
      type: 'action';
      url: string;
      host: string;
      productName: string;
      label: string;
      icon: string;
    }
  | {
      type: 'warning';
      url: string;
      host: string;
    };

type EcosystemLink = {
  productName: string;
  label: string;
  icon: string;
  domains: string[];
};

const ECOSYSTEM_LINKS: EcosystemLink[] = [
  {
    productName: 'YaysApp',
    label: 'Open chat route',
    icon: 'chatbubble-ellipses',
    domains: ['yay.chat', 'yaysapp.com'],
  },
  {
    productName: 'BTCY',
    label: 'Open BTCY action',
    icon: 'logo-bitcoin',
    domains: ['bitcoinyay.com'],
  },
  {
    productName: 'Indexx',
    label: 'Open Indexx action',
    icon: 'stats-chart',
    domains: ['indexx.ai'],
  },
  {
    productName: 'aiainai',
    label: 'Open aiainai action',
    icon: 'sparkles',
    domains: ['aiainai.com'],
  },
  {
    productName: 'ShoperPal',
    label: 'Open ShoperPal action',
    icon: 'cart',
    domains: ['shoperpal.com'],
  },
  {
    productName: 'ReHuman',
    label: 'Open ReHuman action',
    icon: 'leaf',
    domains: ['rehumansystem.com'],
  },
  {
    productName: 'EMMM',
    label: 'Open EMMM action',
    icon: 'ticket',
    domains: ['emmm.io'],
  },
];

const URL_RE = /https?:\/\/[^\s<>()]+/i;
const TRAILING_URL_TRIM_RE = /[.,!?;:\]"'}]+$/;

const normalizeHost = (url: string): string | null => {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.startsWith('www.') ? host.slice(4) : host;
  } catch {
    return null;
  }
};

const hostMatches = (host: string, domain: string): boolean =>
  host === domain || host.endsWith(`.${domain}`);

export const extractFirstUrl = (text: string): string | null => {
  const match = text.match(URL_RE);
  return match ? match[0].replace(TRAILING_URL_TRIM_RE, '') : null;
};

export const classifyChatLink = (text: string): ChatLinkCard | null => {
  const url = extractFirstUrl(text);
  if (!url) {
    return null;
  }
  const host = normalizeHost(url);
  if (!host) {
    return null;
  }
  const ecosystem = ECOSYSTEM_LINKS.find(link =>
    link.domains.some(domain => hostMatches(host, domain)),
  );
  if (ecosystem) {
    return {
      type: 'action',
      url,
      host,
      productName: ecosystem.productName,
      label: ecosystem.label,
      icon: ecosystem.icon,
    };
  }
  return {type: 'warning', url, host};
};
