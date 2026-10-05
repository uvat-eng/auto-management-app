export interface LineItem {
  name: string;
  cost: number;
}

export interface ServiceRecord {
  id: string;
  date: string;
  mileage: number;
  title: string;
  works: LineItem[];
  parts: LineItem[];
  orderPhoto?: string;
  receiptPhoto?: string;
  note?: string;
}

export interface Policy {
  company: string;
  number: string;
  end: string;
}

export interface MileageEntry {
  date: string;
  km: number;
}

export interface Car {
  id: string;
  make: string;
  plate: string;
  year?: string;
  vin?: string;
  photos: string[];
  sts?: string;
  pts?: string;
  mileage: number;
  mileageLog: MileageEntry[];
  services: ServiceRecord[];
  nextServiceKm?: number;
  nextServiceDate?: string;
  osago?: Policy;
  kasko?: Policy;
}

export const MAX_PHOTOS = 30;

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

const DAY = 86400000;

export const isoDate = (d: Date) => d.toISOString().slice(0, 10);
export const shiftDays = (days: number) => isoDate(new Date(Date.now() + days * DAY));
export const today = () => isoDate(new Date());

export const daysUntil = (iso?: string) => {
  if (!iso) return null;
  const start = new Date(today()).getTime();
  const end = new Date(iso).getTime();
  return Math.round((end - start) / DAY);
};

export const formatKm = (n: number) => n.toLocaleString("ru-RU").replace(/,/g, " ");

export const formatMoney = (n: number) => `${formatKm(Math.round(n))} ₽`;

export const formatDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }) : "—";

export const formatTerm = (iso?: string) => {
  const d = daysUntil(iso);
  if (d === null) return "—";
  if (d < 0) return "истёк";
  if (d < 45) return `${d} дн.`;
  const m = Math.round(d / 30);
  if (m < 12) return `${m} мес.`;
  return `${Math.floor(m / 12)} г.`;
};

export const serviceLeft = (car: Car) => (car.nextServiceKm ? car.nextServiceKm - car.mileage : null);

export const serviceTotal = (s: ServiceRecord) =>
  [...s.works, ...s.parts].reduce((sum, i) => sum + (Number(i.cost) || 0), 0);

export type ReminderKind = "service-km" | "service-date" | "osago" | "kasko";

export interface Reminder {
  id: string;
  carId: string;
  carName: string;
  kind: ReminderKind;
  title: string;
  value: string;
  urgent: boolean;
  overdue: boolean;
  weight: number;
}

export const buildReminders = (cars: Car[]): Reminder[] => {
  const list: Reminder[] = [];
  cars.forEach((car) => {
    const name = `${car.make} · ${car.plate}`;
    const left = serviceLeft(car);
    if (left !== null) {
      list.push({
        id: `${car.id}-km`,
        carId: car.id,
        carName: name,
        kind: "service-km",
        title: "ТО по пробегу",
        value: left < 0 ? `просрочено на ${formatKm(-left)} км` : `через ${formatKm(left)} км`,
        urgent: left <= 1500,
        overdue: left < 0,
        weight: left / 50,
      });
    }
    const pairs: [ReminderKind, string, string | undefined][] = [
      ["service-date", "ТО по сроку", car.nextServiceDate],
      ["osago", "ОСАГО", car.osago?.end],
      ["kasko", "КАСКО", car.kasko?.end],
    ];
    pairs.forEach(([kind, title, date]) => {
      const d = daysUntil(date);
      if (d === null) return;
      list.push({
        id: `${car.id}-${kind}`,
        carId: car.id,
        carName: name,
        kind,
        title,
        value: d < 0 ? `истёк ${formatDate(date)}` : d === 0 ? "сегодня" : `через ${formatTerm(date)} · до ${formatDate(date)}`,
        urgent: d <= 30,
        overdue: d < 0,
        weight: d,
      });
    });
  });
  return list.sort((a, b) => a.weight - b.weight);
};

export const compressImage = (file: File, max = 1280, quality = 0.72): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("canvas"));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });

const IMG = "https://cdn.poehali.dev/projects/508cc4dd-a6fa-4f8a-b231-26fde3c72eed/files";

export const seedCars = (): Car[] => [
  {
    id: "car-s500",
    make: "Mercedes-Benz S 500",
    plate: "А 777 АА",
    year: "2019",
    vin: "WDD2221861A000777",
    photos: [`${IMG}/cf139825-62d4-47d1-b1fb-9d972547b449.jpg`],
    mileage: 184250,
    mileageLog: [
      { date: shiftDays(-30), km: 182900 },
      { date: shiftDays(-14), km: 183600 },
      { date: shiftDays(-2), km: 184250 },
    ],
    services: [
      {
        id: "s1",
        date: shiftDays(-120),
        mileage: 177000,
        title: "Плановое ТО-12",
        works: [
          { name: "Замена масла и фильтра", cost: 3500 },
          { name: "Диагностика ходовой", cost: 2000 },
        ],
        parts: [
          { name: "Масло Mobil 1 5W-30, 8 л", cost: 9600 },
          { name: "Фильтр масляный", cost: 1800 },
          { name: "Фильтр салона", cost: 2400 },
        ],
      },
    ],
    nextServiceKm: 187000,
    nextServiceDate: shiftDays(120),
    osago: { company: "Ингосстрах", number: "ХХХ 0123456789", end: shiftDays(12) },
    kasko: { company: "Ингосстрах", number: "КАСКО-77-001", end: shiftDays(92) },
  },
  {
    id: "car-lc100",
    make: "Toyota Land Cruiser 100",
    plate: "О 001 ОО",
    year: "2004",
    photos: [`${IMG}/a084900f-aa12-4287-8246-07f1ea3a53df.jpg`],
    mileage: 312480,
    mileageLog: [{ date: shiftDays(-5), km: 312480 }],
    services: [
      {
        id: "s2",
        date: shiftDays(-200),
        mileage: 303900,
        title: "ТО + замена ремня ГРМ",
        works: [{ name: "Замена ремня ГРМ с роликами", cost: 14000 }],
        parts: [{ name: "Комплект ГРМ Aisin", cost: 18500 }],
      },
    ],
    nextServiceKm: 313500,
    nextServiceDate: shiftDays(40),
    osago: { company: "РЕСО", number: "ХХХ 0987654321", end: shiftDays(210) },
  },
  {
    id: "car-e38",
    make: "BMW 740i E38",
    plate: "Е 038 КХ",
    year: "1998",
    photos: [`${IMG}/8075ef1c-6695-4cef-9c25-9af5f70df0d5.jpg`],
    mileage: 268900,
    mileageLog: [{ date: shiftDays(-20), km: 268900 }],
    services: [],
    nextServiceKm: 272000,
    nextServiceDate: shiftDays(75),
    osago: { company: "Альфа", number: "ХХХ 0555333111", end: shiftDays(25) },
    kasko: { company: "Альфа", number: "КАСКО-E38", end: shiftDays(-3) },
  },
];
