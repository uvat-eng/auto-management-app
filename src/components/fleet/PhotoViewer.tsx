import GalleryViewer from "./GalleryViewer";

interface Props {
  src: string | null;
  onClose: () => void;
}

const PhotoViewer = ({ src, onClose }: Props) => <GalleryViewer photos={src ? [src] : []} index={src ? 0 : null} onClose={onClose} />;

export default PhotoViewer;
