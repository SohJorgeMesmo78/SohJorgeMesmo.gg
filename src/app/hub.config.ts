export type HubPlatformIcon = 'youtube' | 'twitch' | 'instagram' | 'tiktok' | 'x' | 'livepix';

export interface SocialLink {
  id: string;
  name: string;
  url: string;
  label: string;
  description: string;
  priority: 'primary' | 'secondary';
  icon: HubPlatformIcon;
}

export interface HeroData {
  title: string;
  pretitle: string;
  handle: string;
  description: string;
  accent: string;
  liveStatusLabel: string;
  liveStatusHint: string;
}

export interface YouTubeChannelInfo {
  externalUrl: string;
  name: string;
  description: string;
  channelLabel: string;
  statusNote: string;
  subscriberCount: string;
}

export interface LatestVideoInfo {
  externalUrl: string;
  title: string;
  date: string;
  thumbnailUrl: string;
  note: string;
}

export interface TwitchInfo {
  externalUrl: string;
  schedule: string;
  title: string;
  status: string;
  note: string;
  isLive?: boolean;
  liveTitle?: string;
  gameName?: string;
  viewerCount?: number | null;
}

export const heroData: HeroData = {
  title: 'SohJorgeMesmo',
  pretitle: 'Hub oficial do criador de conteúdo',
  handle: '@sohjorgemesmo.gg',
  description: 'Jogando, descobrindo e me perdendo pelo caminho entre games, lives e vídeos.',
  accent: 'Jogador, aventureiro e criador com identidade própria.',
  liveStatusLabel: '🔴 AO VIVO',
  liveStatusHint: 'Espaço reservado para o indicador de live em tempo real',
};

export const socialLinks: SocialLink[] = [
  {
    id: 'youtube',
    name: 'YouTube',
    url: 'https://www.youtube.com/@SohJorgeMesmo-gg',
    label: 'YouTube',
    description: 'Vídeos e novidades do canal',
    priority: 'primary',
    icon: 'youtube',
  },
  {
    id: 'twitch',
    name: 'Twitch',
    url: 'https://www.twitch.tv/sohjorgemesmo',
    label: 'Twitch',
    description: 'Assista às lives ao vivo',
    priority: 'primary',
    icon: 'twitch',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    url: 'https://www.instagram.com/sohjorgemesmo.gg/',
    label: 'Instagram',
    description: 'Acompanhe os bastidores',
    priority: 'secondary',
    icon: 'instagram',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    url: 'https://www.tiktok.com/@sohjorgemesmo.gg',
    label: 'TikTok',
    description: 'Clipes rápidos e destaque',
    priority: 'secondary',
    icon: 'tiktok',
  },
  {
    id: 'x',
    name: 'X',
    url: 'https://x.com/sohjorgemesmo78',
    label: 'X',
    description: 'Atualizações rápidas e comunidade',
    priority: 'secondary',
    icon: 'x',
  },
  {
    id: 'livepix',
    name: 'LivePix',
    url: 'https://livepix.gg/sohjorgemesmo',
    label: 'Apoie no LivePix',
    description: 'Conexão direta com o público',
    priority: 'secondary',
    icon: 'livepix',
  },
];

export const youtubeChannelPlaceholder: YouTubeChannelInfo = {
  externalUrl: 'https://www.youtube.com/@SohJorgeMesmo-gg',
  name: 'SohJorgeMesmo',
  description: 'Canal pronto para exibir dados reais via YouTube Data API. Sem valores fictícios, apenas estrutura preparada.',
  channelLabel: 'Canal no YouTube',
  statusNote: 'Inscritos e estatísticas serão preenchidos em breve com integração oficial.',
  subscriberCount: '---',
};

export const latestVideoPlaceholder: LatestVideoInfo = {
  externalUrl: 'https://www.youtube.com/@SohJorgeMesmo-gg',
  title: 'Último vídeo ainda não carregado automaticamente',
  date: 'Data disponível com integração YouTube',
  thumbnailUrl: '',
  note: 'O card está estruturado para receber thumb, título e data diretamente do YouTube.',
};

export const twitchInfoPlaceholder: TwitchInfo = {
  externalUrl: 'https://www.twitch.tv/sohjorgemesmo',
  schedule: 'Lives às 19h',
  title: 'Status de live offline por enquanto',
  status: 'Pronto para integrar status ao vivo e espectadores.',
  note: 'A estrutura permite adicionar status online/offline e informações da live atual.',
};
