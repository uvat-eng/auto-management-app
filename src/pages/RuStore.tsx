import { useState } from "react";
import InfoPage from "@/components/fleet/InfoPage";
import RuStoreForm, { PERMISSIONS } from "@/components/fleet/RuStoreForm";
import Icon from "@/components/ui/icon";
import { toast } from "sonner";

const SITE = "https://xn--80aaf7asgim.su";

const FIELDS: { label: string; hint?: string; value: string }[] = [
  { label: "Название приложения", hint: "до 50 символов", value: "Твой автопарк" },
  {
    label: "Краткое описание",
    hint: "до 80 символов",
    value: "Машины, ТО, страховки и навигатор — весь автопарк в одном приложении",
  },
  {
    label: "Полное описание",
    hint: "до 4000 символов",
    value: `«Твой автопарк» — личный гараж в телефоне. Все машины, история обслуживания, страховки и документы собраны в одном месте и всегда под рукой.

МАШИНЫ
• Марка, модель, год, госномер, VIN и пробег каждой машины
• Фото автомобиля, СТС, ПТС и других документов
• Быстрая отметка пробега — приложение само посчитает, когда ТО
• Архив: продали машину — история сохранится

ТЕХОБСЛУЖИВАНИЕ
• История ТО: работы, запчасти, расходы и фото чеков
• Сколько километров и месяцев осталось до следующего ТО
• Сколько всего потрачено на каждую машину
• Руководство по обслуживанию под рукой

СТРАХОВКИ
• ОСАГО и КАСКО: страховая, номер полиса, срок действия
• Фото полиса
• Напоминания, когда страховка скоро закончится

НАВИГАТОР
• Карта с вашим местоположением и маршрутом
• Топографические карты Генштаба для поездок за город
• Офлайн-карты — работают без интернета

ДАННЫЕ В БЕЗОПАСНОСТИ
• Всё хранится в облаке и открывается с любого устройства
• Резервная копия в файл одним нажатием
• Без рекламы
• Удалить аккаунт и все данные можно в любой момент

Подойдёт владельцу одной машины, семье с несколькими автомобилями и небольшому автопарку.`,
  },
  { label: "Что нового (версия 2.0)", value: "Первая версия в RuStore. Машины, ТО, страховки, напоминания и навигатор с офлайн-картами." },
  { label: "Категория", value: "Транспорт и навигация" },
  { label: "Возрастное ограничение", value: "0+" },
  { label: "Политика конфиденциальности", value: `${SITE}/privacy` },
  { label: "Сайт / поддержка", value: `${SITE}/support` },
  { label: "Имя пакета (заполняется само из APK)", value: "dev.poehali.avtopark" },
];

const REVIEW = `Тестовый аккаунт с заполненными данными:
Логин: review
Пароль: Avtopark2026
На экране входа выберите «Войти» и введите эти данные.`;

const SHOTS = [1, 2, 3, 4, 5].map((i) => `/rustore/screen-${i}.jpg`);

const Copy = ({ value }: { value: string }) => {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setDone(true);
        toast.success("Скопировано");
        setTimeout(() => setDone(false), 1500);
      }}
      className="shrink-0 h-9 px-3 rounded-full border border-border text-sm inline-flex items-center gap-1.5 hover:border-primary"
    >
      <Icon name={done ? "Check" : "Copy"} size={15} /> {done ? "Готово" : "Копировать"}
    </button>
  );
};

const Download = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a
    href={href}
    download
    className="h-12 px-5 rounded-full bg-primary text-primary-foreground font-medium inline-flex items-center justify-center gap-2"
  >
    <Icon name="Download" size={18} /> {children}
  </a>
);

const RuStore = () => (
  <InfoPage title="Публикация в RuStore" subtitle="Всё для карточки приложения: файл, тексты, иконка и скриншоты">
    <div className="space-y-10">
      <section className="rounded-3xl border border-border bg-card p-5 space-y-4">
        <div>
          <h2 className="font-head text-xl">1. Файл приложения</h2>
          <p className="text-sm text-muted-foreground mt-1">Версия 2.0 (сборка 12), подписан ключом «Автопарка». Загрузите его в разделе «Версии».</p>
        </div>
        <Download href="/rustore/avtopark-2.0.apk">Скачать APK</Download>
      </section>

      <section className="space-y-4">
        <h2 className="font-head text-xl">2. Тексты карточки</h2>
        {FIELDS.map((f) => (
          <div key={f.label} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{f.label}</p>
                {f.hint && <p className="text-xs text-muted-foreground">{f.hint} · сейчас {f.value.length}</p>}
              </div>
              <Copy value={f.value} />
            </div>
            <p className="mt-3 text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{f.value}</p>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-head text-xl">3. Иконка</h2>
          <p className="text-sm text-muted-foreground mt-1">512×512, PNG.</p>
        </div>
        <div className="flex items-center gap-4">
          <img src="/rustore/icon-512.png" alt="Иконка" className="w-24 h-24 rounded-2xl border border-border" />
          <Download href="/rustore/icon-512.png">Скачать иконку</Download>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-head text-xl">4. Скриншоты</h2>
          <p className="text-sm text-muted-foreground mt-1">1080×1920, вертикальные. Загружайте по порядку. Нажмите на картинку, чтобы скачать.</p>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {SHOTS.map((s, i) => (
            <a key={s} href={s} download className="block group">
              <img src={s} alt={`Скриншот ${i + 1}`} className="rounded-xl border border-border group-hover:border-primary" loading="lazy" />
              <span className="block text-center text-xs text-muted-foreground mt-1">{i + 1}</span>
            </a>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-5 space-y-2 text-sm">
        <h2 className="font-head text-xl mb-2">5. Для модератора</h2>
        <p className="text-muted-foreground">Вставьте в поле «Комментарий для модератора». Тот же аккаунт подходит для Apple.</p>
        <div className="flex items-start justify-between gap-3 rounded-2xl bg-background border border-border p-4 mt-2">
          <p className="whitespace-pre-line">{REVIEW}</p>
          <Copy value={REVIEW} />
        </div>
      </section>

      <RuStoreForm copy={<Copy value={PERMISSIONS} />} />
    </div>
  </InfoPage>
);

export default RuStore;