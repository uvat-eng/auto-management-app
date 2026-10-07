import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { POLICY_SECTIONS } from "@/lib/policy";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const PolicyDialog = ({ open, onOpenChange }: Props) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="bg-card border-border max-w-[520px] max-h-[85dvh] overflow-y-auto rounded-3xl">
      <DialogHeader>
        <DialogTitle className="font-head text-2xl">Условия и данные</DialogTitle>
        <DialogDescription>Регистрируясь, вы даёте согласие на обработку данных на этих условиях.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 text-sm">
        {POLICY_SECTIONS.map(([t, d]) => (
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
