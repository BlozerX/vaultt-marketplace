import { CameraOff, Shirt, ShoppingBag, Watch, Glasses, Headphones, Package, Box } from 'lucide-react';

interface PlaceholderImageProps {
  className?: string;
  category?: string;
}

export default function PlaceholderImage({ className = "", category }: PlaceholderImageProps) {
  
  const renderIcon = () => {
    switch (category) {
      case 'Tops':
      case 'Outerwear':
      case 'Vintage':
        return <Shirt size={32} className="mb-2" />;
      case 'Bottoms':
        return <Shirt size={32} className="mb-2" />; // Lucide doesn't have pants, use Shirt or generic
      case 'Footwear':
        return <Package size={32} className="mb-2" />; // Footwear generic
      case 'Accessories':
      case 'Headwear':
      case 'Jewellery':
        return <Watch size={32} className="mb-2" />;
      case 'Bags':
        return <ShoppingBag size={32} className="mb-2" />;
      case 'Electronics':
        return <Headphones size={32} className="mb-2" />;
      default:
        return <CameraOff size={32} className="mb-2" />;
    }
  };

  return (
    <div className={`bg-neutral-100 flex flex-col items-center justify-center text-neutral-300 ${className}`}>
      {renderIcon()}
      <span className="font-mono text-xs font-bold tracking-widest uppercase">No Image</span>
    </div>
  );
}
