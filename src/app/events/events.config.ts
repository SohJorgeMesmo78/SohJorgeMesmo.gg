export interface WeeklyEvent {
  weekday: string;
  title: string;
  time: string;
  recurrence: string;
  description: string;
  url: string;
  type: 'live' | 'video';
}

export const weeklyEvents: WeeklyEvent[] = [
  {
    weekday: 'Terça', title: 'Live', time: '19h', recurrence: 'Toda terça-feira',
    description: 'Ao vivo às 19h', url: 'https://www.twitch.tv/sohjorgemesmo', type: 'live',
  },
  {
    weekday: 'Quarta', title: 'Live', time: '19h', recurrence: 'Toda quarta-feira',
    description: 'Ao vivo às 19h', url: 'https://www.twitch.tv/sohjorgemesmo', type: 'live',
  },
  {
    weekday: 'Quinta', title: 'Vídeo no canal', time: '16h', recurrence: 'Toda quinta-feira',
    description: 'Vídeo novo às 16h', url: 'https://www.youtube.com/@SohJorgeMesmo-gg', type: 'video',
  },
  {
    weekday: 'Sexta', title: 'Live', time: '19h', recurrence: 'Toda sexta-feira',
    description: 'Ao vivo às 19h', url: 'https://www.twitch.tv/sohjorgemesmo', type: 'live',
  },
];
