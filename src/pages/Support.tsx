import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Icon from "@/components/ui/icon";
import InfoPage from "@/components/fleet/InfoPage";
import { authApi } from "@/lib/api";

const FAQ: [string, string][] = [
  ["Забыл пароль", "На экране входа нажмите «Забыли пароль?» и введите код восстановления, который выдавался при регистрации. Новый код можно получить в профиле."],
  ["Как перенести данные на новый телефон", "Просто войдите под своим логином — всё хранится в облаке. Дополнительно можно сделать резервную копию в профиле."],
  ["Как удалить аккаунт", "Профиль → «Удалить аккаунт» → введите пароль. Аккаунт, машины, фото и история будут удалены безвозвратно."],
];

const Support = () => {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setState("sending");
    try {
      await authApi.support(name, contact, message);
      setState("sent");
    } catch (err) {
      setError((err as Error).message);
      setState("idle");
    }
  };

  return (
    <InfoPage title="Поддержка" subtitle="Приложение «Твой автопарк». Ответим в течение 1–2 рабочих дней.">
      <div className="space-y-5 mb-10">
        {FAQ.map(([q, a]) => (
          <div key={q}>
            <p className="font-medium mb-1">{q}</p>
            <p className="text-muted-foreground leading-relaxed text-sm">{a}</p>
          </div>
        ))}
      </div>

      <div className="rounded-3xl bg-card border border-border p-6">
        {state === "sent" ? (
          <div className="text-center py-6">
            <Icon name="CircleCheck" size={40} className="text-primary mx-auto" />
            <p className="font-head text-xl mt-3">Обращение отправлено</p>
            <p className="text-muted-foreground text-sm mt-1">Мы свяжемся с вами по указанному контакту.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <p className="font-head text-xl">Написать нам</p>
            <div className="space-y-1.5">
              <Label>Имя</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label>Email или телефон для ответа</Label>
              <Input value={contact} onChange={(e) => setContact(e.target.value)} required className="bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label>Вопрос</Label>
              <Textarea value={message} onChange={(e) => setMessage(e.target.value)} required className="bg-background min-h-[120px]" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={state === "sending"}
              className="w-full h-12 rounded-full bg-primary text-primary-foreground font-medium disabled:opacity-60"
            >
              {state === "sending" ? "Отправляем…" : "Отправить"}
            </button>
          </form>
        )}
      </div>
    </InfoPage>
  );
};

export default Support;
