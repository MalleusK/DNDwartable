import { ConditionInfo } from '../types';


export const DND_CONDITIONS: ConditionInfo[] = [
  {
    id: 'concentration',
    nameRu: 'Концентрация',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-950/60',
    borderColor: 'border-cyan-500/50',
    description: 'Боец поддерживает заклинание. Получая урон, совершает спасбросок Телосложения (Сл 10 или половина полученного урона).'
  },
  {
    id: 'blinded',
    nameRu: 'Ослеплён',
    color: 'text-zinc-400',
    bgColor: 'bg-zinc-800/80',
    borderColor: 'border-zinc-500/50',
    description: 'Существо ничего не видит и автоматически проваливает проверки, требующие зрения. Атаки по нему с преимуществом, его атаки с помехой.'
  },
  {
    id: 'charmed',
    nameRu: 'Очарован',
    color: 'text-pink-400',
    bgColor: 'bg-pink-950/60',
    borderColor: 'border-pink-500/50',
    description: 'Не может атаковать пленителя. Пленитель имеет преимущество на социальные проверки.'
  },
  {
    id: 'deafened',
    nameRu: 'Оглохший',
    color: 'text-slate-400',
    bgColor: 'bg-slate-800/80',
    borderColor: 'border-slate-500/50',
    description: 'Ничего не слышит и проваливает проверки, требующие слуха.'
  },
  {
    id: 'frightened',
    nameRu: 'Испуган',
    color: 'text-purple-400',
    bgColor: 'bg-purple-950/60',
    borderColor: 'border-purple-500/50',
    description: 'Помеха на проверки и броски атаки, пока источник страха в поле зрения. Не может добровольно приблизиться к источнику.'
  },
  {
    id: 'grappled',
    nameRu: 'Схвачен',
    color: 'text-amber-400',
    bgColor: 'bg-amber-950/60',
    borderColor: 'border-amber-500/50',
    description: 'Скорость становится равна 0 и не увеличивается.'
  },
  {
    id: 'incapacitated',
    nameRu: 'Недееспособен',
    color: 'text-orange-400',
    bgColor: 'bg-orange-950/60',
    borderColor: 'border-orange-500/50',
    description: 'Не может совершать действия и реакции.'
  },
  {
    id: 'invisible',
    nameRu: 'Невидимый',
    color: 'text-sky-400',
    bgColor: 'bg-sky-950/60',
    borderColor: 'border-sky-500/50',
    description: 'Невозможно обнаружить без спецчувств. Атаки с преимуществом, атаки по существу с помехой.'
  },
  {
    id: 'paralyzed',
    nameRu: 'Парализован',
    color: 'text-red-400',
    bgColor: 'bg-red-950/60',
    borderColor: 'border-red-500/50',
    description: 'Недееспособен, не может двигаться и говорить. Проваливает спасброски Силы и Ловкости. Атаки с преимуществом, криты в пределах 5 футов.'
  },
  {
    id: 'petrified',
    nameRu: 'Окаменевший',
    color: 'text-stone-300',
    bgColor: 'bg-stone-800/80',
    borderColor: 'border-stone-500/50',
    description: 'Трансформирован в камень. Вес x10, недееспособен, иммунитет к ядам и болезням, сопротивление любому урону.'
  },
  {
    id: 'poisoned',
    nameRu: 'Отравлен',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-950/60',
    borderColor: 'border-emerald-500/50',
    description: 'Помеха на броски атаки и проверки характеристик.'
  },
  {
    id: 'prone',
    nameRu: 'Сбит с ног',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-950/60',
    borderColor: 'border-yellow-500/50',
    description: 'Может только ползать. Помеха на свои атаки. Атаки по существу с преимуществом в 5 футах, иначе с помехой.'
  },
  {
    id: 'restrained',
    nameRu: 'Опутан',
    color: 'text-rose-400',
    bgColor: 'bg-rose-950/60',
    borderColor: 'border-rose-500/50',
    description: 'Скорость 0. Атаки по существу с преимуществом, его атаки с помехой. Помеха на спасброски Ловкости.'
  },
  {
    id: 'stunned',
    nameRu: 'Оглушён',
    color: 'text-violet-400',
    bgColor: 'bg-violet-950/60',
    borderColor: 'border-violet-500/50',
    description: 'Недееспособен, не может двигаться, запинается в речи. Проваливает спасброски Силы и Ловкости. Атаки по нему с преимуществом.'
  },
  {
    id: 'unconscious',
    nameRu: 'Без сознания',
    color: 'text-red-500',
    bgColor: 'bg-red-950/90',
    borderColor: 'border-red-600/70',
    description: 'Недееспособен, роняет предметы, падает ничком. Проваливает спасброски Силы/Ловкости. Атаки с преимуществом, критические в 5 футах.'
  },
  {
    id: 'exhaustion',
    nameRu: 'Истощение',
    color: 'text-amber-500',
    bgColor: 'bg-amber-950/70',
    borderColor: 'border-amber-600/50',
    description: 'Накапливающиеся штрафы: 1: помеха на проверки; 2: скорость 1/2; 3: помеха на атаки/спасброски; 4: хиты 1/2; 5: скорость 0; 6: смерть.'
  }
];

