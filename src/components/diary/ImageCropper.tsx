import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { RotateCw, ZoomIn, Check, X, AlertCircle } from 'lucide-react';

interface ImageCropperProps {
  imageSrc: string;
  onCropComplete: (croppedImage: string) => void;
  onCancel: () => void;
}

export function ImageCropper({ imageSrc, onCropComplete, onCancel }: ImageCropperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load image with memory-safe approach
  useEffect(() => {
    setError(null);
    const img = new Image();
    
    img.onload = () => {
      // Check if image is too large (>4000px in any dimension)
      if (img.width > 4000 || img.height > 4000) {
        setError('Afbeelding is te groot. Gebruik een kleinere foto.');
        return;
      }
      imageRef.current = img;
      setImageLoaded(true);
      setPosition({ x: 0, y: 0 });
    };
    
    img.onerror = () => {
      setError('Kon afbeelding niet laden. Probeer een andere foto.');
    };
    
    img.src = imageSrc;

    // Cleanup
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [imageSrc]);

  // Draw canvas with try-catch for memory issues
  useEffect(() => {
    if (!canvasRef.current || !imageRef.current || !imageLoaded) return;
    
    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setError('Canvas niet beschikbaar');
        return;
      }

      const img = imageRef.current;
      const size = 280; // Smaller crop area to reduce memory
      canvas.width = size;
      canvas.height = size;

      // Clear canvas
      ctx.fillStyle = '#f5f5f5';
      ctx.fillRect(0, 0, size, size);

      // Save context state
      ctx.save();

      // Move to center, rotate, then draw
      ctx.translate(size / 2 + position.x, size / 2 + position.y);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(zoom, zoom);

      // Calculate dimensions to cover the canvas
      const scale = Math.max(size / img.width, size / img.height);
      const scaledWidth = img.width * scale;
      const scaledHeight = img.height * scale;

      ctx.drawImage(
        img,
        -scaledWidth / 2,
        -scaledHeight / 2,
        scaledWidth,
        scaledHeight
      );

      // Restore context state
      ctx.restore();

      // Draw crop overlay (circular)
      ctx.save();
      ctx.globalCompositeOperation = 'destination-in';
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2 - 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Draw border
      ctx.strokeStyle = 'hsl(var(--primary))';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2 - 10, 0, Math.PI * 2);
      ctx.stroke();
    } catch (e) {
      console.error('Canvas draw error:', e);
      setError('Onvoldoende geheugen. Gebruik een kleinere foto of sla bijsnijden over.');
    }

  }, [imageSrc, zoom, rotation, position, imageLoaded]);

  // Handle drag
  const handleMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX - position.x, y: clientY - position.y });
  }, [position]);

  const handleMouseMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setPosition({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y,
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle crop complete with error handling
  const handleCropComplete = () => {
    if (!canvasRef.current) return;
    try {
      const croppedImage = canvasRef.current.toDataURL('image/jpeg', 0.7);
      onCropComplete(croppedImage);
    } catch (e) {
      console.error('Crop export error:', e);
      setError('Kon afbeelding niet bijsnijden. Sla bijsnijden over.');
    }
  };

  // Skip crop option
  const handleSkipCrop = () => {
    onCropComplete(imageSrc);
  };

  if (error) {
    return (
      <div className="space-y-4">
        <div className="p-4 rounded-lg bg-destructive/10 text-destructive flex items-start gap-3">
          <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Probleem met bijsnijden</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            <X className="h-4 w-4 mr-2" />
            Annuleren
          </Button>
          <Button className="flex-1" onClick={handleSkipCrop}>
            <Check className="h-4 w-4 mr-2" />
            Ga door zonder bijsnijden
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <p className="text-sm font-medium text-foreground">Snij de foto bij</p>
        <p className="text-xs text-muted-foreground">
          Alleen het bord/eten in beeld voor betere analyse en privacy
        </p>
      </div>

      {/* Canvas container */}
      <div 
        ref={containerRef}
        className="relative flex justify-center touch-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
      >
        <canvas
          ref={canvasRef}
          className="rounded-full cursor-move shadow-lg"
          style={{ touchAction: 'none' }}
        />
      </div>

      {/* Controls */}
      <div className="space-y-3">
        {/* Zoom */}
        <div className="flex items-center gap-3">
          <ZoomIn className="h-4 w-4 text-muted-foreground" />
          <Slider
            value={[zoom]}
            onValueChange={([v]) => setZoom(v)}
            min={0.5}
            max={3}
            step={0.1}
            className="flex-1"
          />
          <span className="text-sm text-muted-foreground w-12">{zoom.toFixed(1)}x</span>
        </div>

        {/* Rotate */}
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRotation((r) => (r + 90) % 360)}
          >
            <RotateCw className="h-4 w-4 mr-2" />
            Roteren
          </Button>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={onCancel}
        >
          <X className="h-4 w-4 mr-2" />
          Annuleren
        </Button>
        <Button
          variant="ghost"
          className="text-muted-foreground"
          onClick={handleSkipCrop}
        >
          Overslaan
        </Button>
        <Button
          className="flex-1"
          onClick={handleCropComplete}
        >
          <Check className="h-4 w-4 mr-2" />
          Bijsnijden
        </Button>
      </div>
    </div>
  );
}
