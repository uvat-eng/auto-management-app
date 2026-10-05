import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface Props {
  src: string | null;
  onClose: () => void;
}

const PhotoViewer = ({ src, onClose }: Props) => (
  <Dialog open={!!src} onOpenChange={(v) => !v && onClose()}>
    <DialogContent className="max-w-[95vw] w-auto p-0 bg-background border-border overflow-hidden rounded-2xl">
      <DialogTitle className="sr-only">Фото</DialogTitle>
      {src && <img src={src} alt="Фото" className="max-h-[85vh] max-w-[95vw] object-contain" />}
    </DialogContent>
  </Dialog>
);

export default PhotoViewer;
