import { ReactNode } from "react";
import Icon from "@/components/ui/icon";

export const PERMISSIONS = `ACCESS_FINE_LOCATION и ACCESS_COARSE_LOCATION — для встроенного навигатора (вкладка «Карта»): показать текущее местоположение пользователя на карте и вести по маршруту. Геопозиция используется только на устройстве, пока открыт навигатор, на сервер не передаётся и не хранится.

CAMERA — чтобы сфотографировать автомобиль, документы (СТС, ПТС), страховой полис, заказ-наряд и чеки за ТО и прикрепить фото к карточке машины. Камера включается только по нажатию пользователя.

WRITE_EXTERNAL_STORAGE — только для Android 9 и ниже: сохранить резервную копию данных в память телефона по команде пользователя (Профиль → «Резервная копия»). На Android 10 и новее это разрешение не запрашивается.`;

const KEEP: [string, string][] = [
  ["Приблизительное местоположение", "навигатор на вкладке «Карта»"],
  ["Точное местоположение", "навигатор на вкладке «Карта»"],
  ["Фотографии", "фото машин, документов, полисов и чеков"],
  ["Файлы и документы", "резервная копия и PDF-руководство"],
  ["Другие данные", "логин, сведения о машинах, ТО и страховки"],
];

const REMOVE: [string, string][] = [
  ["Взаимодействие с приложением", "статистику в приложении не собираем"],
  ["События календаря", "доступа к календарю нет"],
  ["Видео", "работаем только с фото; если не удаляется — оставьте"],
];

const ANSWERS: [string, string][] = [
  ["Платёжные интеграции", "Пусто — оплаты в приложении нет"],
  ["Рекламные интеграции", "Пусто — рекламы нет"],
  ["Возрастное ограничение", "0+"],
  ["Платное / бесплатное", "Бесплатное, без встроенных покупок"],
];

const Row = ({ ok, title, note }: { ok: boolean; title: string; note: string }) => (
  <li className="flex items-start gap-3">
    <Icon name={ok ? "CircleCheck" : "CircleX"} size={18} className={`shrink-0 mt-0.5 ${ok ? "text-primary" : "text-destructive"}`} />
    <div>
      <p className="font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">{note}</p>
    </div>
  </li>
);

const RuStoreForm = ({ copy }: { copy: ReactNode }) => (
  <section className="space-y-4">
    <div>
      <h2 className="font-head text-xl">6. Анкета «Данные и разрешения»</h2>
      <p className="text-sm text-muted-foreground mt-1">Готовые ответы — при каждой новой версии заполняйте так же.</p>
    </div>

    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">Чувствительные разрешения → Обоснование</p>
          <p className="text-xs text-muted-foreground">Обязательное поле</p>
        </div>
        {copy}
      </div>
      <p className="mt-3 text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{PERMISSIONS}</p>
    </div>

    <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
      <p className="font-medium">Запрашиваемые данные → Типы данных</p>
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Оставить</p>
          <ul className="space-y-2.5 text-sm">
            {KEEP.map(([t, n]) => <Row key={t} ok title={t} note={n} />)}
          </ul>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Убрать (с треугольником ⚠)</p>
          <ul className="space-y-2.5 text-sm">
            {REMOVE.map(([t, n]) => <Row key={t} ok={false} title={t} note={n} />)}
          </ul>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Не добавляйте: контакты, телефон, почту, имя, платёжные данные, историю браузера, идентификаторы устройства.</p>
    </div>

    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="font-medium mb-3">Остальные поля</p>
      <dl className="space-y-2 text-sm">
        {ANSWERS.map(([q, a]) => (
          <div key={q} className="flex flex-col sm:flex-row sm:gap-4">
            <dt className="text-muted-foreground sm:w-56 shrink-0">{q}</dt>
            <dd>{a}</dd>
          </div>
        ))}
      </dl>
    </div>
  </section>
);

export default RuStoreForm;
