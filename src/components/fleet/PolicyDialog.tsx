import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const SECTIONS: [string, string][] = [
  ["Какие данные мы храним", "Логин, пароль в зашифрованном виде, сведения об автомобилях (марка, модель, год, госномер, VIN, пробег), записи о ТО, страховки, фото автомобилей и документов, которые вы загружаете."],
  ["Зачем", "Чтобы хранить ваш автопарк в облаке, напоминать о ТО и страховках и открывать данные с любого устройства."],
  [
    "Обезличенная статистика",
    "Технические сведения об автомобилях (марка, модель, год, пробег, история обслуживания) без привязки к вашему логину и без фото документов могут использоваться в обобщённом виде для развития сервиса и новых функций — например, поиска и оценки автомобилей.",
  ],
  ["Кому передаём", "Мы не продаём и не передаём ваши персональные данные третьим лицам, кроме случаев, предусмотренных законом."],
  ["Архив и удаление", "Машину можно убрать в архив — данные сохранятся. Чтобы удалить аккаунт и все данные полностью, напишите в поддержку."],
];

const PolicyDialog = ({ open, onOpenChange }: Props) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="bg-card border-border max-w-[520px] max-h-[85dvh] overflow-y-auto rounded-3xl">
      <DialogHeader>
        <DialogTitle className="font-head text-2xl">Условия и данные</DialogTitle>
        <DialogDescription>Регистрируясь, вы даёте согласие на обработку данных на этих условиях.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 text-sm">
        {SECTIONS.map(([t, d]) => (
          <div key={t}>
            <p className="font-medium mb-1">{t}</p>
            <p className="text-muted-foreground leading-relaxed">{d}</p>
          </div>
        ))}
      </div>
    </DialogContent>
  </Dialog>
);

export default PolicyDialog;
