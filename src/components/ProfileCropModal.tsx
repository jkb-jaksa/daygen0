import React, { useState, useRef, useCallback } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import type { Crop, PixelCrop } from 'react-image-crop';
import { X, Check, RotateCcw } from 'lucide-react';
import 'react-image-crop/dist/ReactCrop.css';
import { buttons } from "../styles/designSystem";

interface ProfileCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  onCropComplete: (croppedImageBlob: Blob) => void;
}

export default function ProfileCropModal({ isOpen, onClose, imageSrc, onCropComplete }: ProfileCropModalProps) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [scale, setScale] = useState(1);
  const [rotate, setRotate] = useState(0);
  const [aspect] = useState<number | undefined>(1);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);


  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const crop = centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 90,
        },
        1,
        width,
        height
      ),
      width,
      height
    );
    setCrop(crop);
  }, []);

  const onDownloadCropClick = useCallback(() => {
    if (!completedCrop || !imgRef.current || !canvasRef.current) {
      return;
    }

    const image = imgRef.current;
    const canvas = canvasRef.current;
    const crop = completedCrop;

    // Get the actual displayed image dimensions
    const displayWidth = image.width;
    const displayHeight = image.height;
    
    // Calculate scale factors from display to natural dimensions
    const scaleX = image.naturalWidth / displayWidth;
    const scaleY = image.naturalHeight / displayHeight;
    
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    // Set canvas size to crop dimensions
    canvas.width = crop.width;
    canvas.height = crop.height;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Draw the cropped portion
    ctx.drawImage(
      image,
      crop.x * scaleX,           // Source x (scaled to natural dimensions)
      crop.y * scaleY,           // Source y (scaled to natural dimensions)
      crop.width * scaleX,       // Source width (scaled to natural dimensions)
      crop.height * scaleY,      // Source height (scaled to natural dimensions)
      0,                         // Destination x
      0,                         // Destination y
      crop.width,                // Destination width
      crop.height                // Destination height
    );

    canvas.toBlob((blob) => {
      if (blob) {
        onCropComplete(blob);
        onClose();
      }
    }, 'image/jpeg', 0.9);
  }, [completedCrop, onCropComplete, onClose]);

  const resetCrop = () => {
    if (imgRef.current) {
      const { width, height } = imgRef.current;
      const crop = centerCrop(
        makeAspectCrop(
          {
            unit: '%',
            width: 90,
          },
          1,
          width,
          height
        ),
        width,
        height
      );
      setCrop(crop);
    }
    setScale(1);
    setRotate(0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-black/80 flex items-center justify-center p-4">
      <div className="willchange-backdrop isolate bg-black/20 backdrop-blur-[72px] backdrop-brightness-[.7] backdrop-contrast-[1.05] backdrop-saturate-[.85] border border-d-dark rounded-[20px] p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-cabin text-d-text">Crop Profile Picture</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-orange-500/20 rounded-lg transition-colors group"
          >
            <X className="w-5 h-5 text-d-white group-hover:text-brand transition-colors" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Controls */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm text-d-white font-raleway">Scale:</label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={scale}
                onChange={(e) => setScale(Number(e.target.value))}
                className="w-20"
                style={{ accentColor: '#faaa16' }}
              />
              <span className="text-xs text-d-white font-raleway">{Math.round(scale * 100)}%</span>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm text-d-white font-raleway">Rotate:</label>
              <input
                type="range"
                min="-180"
                max="180"
                step="1"
                value={rotate}
                onChange={(e) => setRotate(Number(e.target.value))}
                className="w-20"
                style={{ accentColor: '#faaa16' }}
              />
              <span className="text-xs text-d-white font-raleway">{rotate}°</span>
            </div>

            <button
              onClick={resetCrop}
              className={`${buttons.secondary} text-sm`}
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          </div>

          {/* Image Crop Area */}
          <div className="flex justify-center">
            <div className="max-w-full max-h-[50vh] overflow-auto">
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={aspect}
                minWidth={100}
                minHeight={100}
              >
                <img
                  ref={imgRef}
                  alt="Crop me"
                  src={imageSrc}
                  style={{
                    transform: `scale(${scale}) rotate(${rotate}deg)`,
                    maxWidth: '100%',
                    maxHeight: '50vh',
                  }}
                  onLoad={onImageLoad}
                />
              </ReactCrop>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-d-dark">
            <button
              onClick={onClose}
              className={`${buttons.subtle} h-9 px-4`}
            >
              Cancel
            </button>
            <button
              onClick={onDownloadCropClick}
              disabled={!completedCrop}
              className={`${buttons.primary} font-semibold`}
            >
              <Check className="w-4 h-4" />
              Apply Crop
            </button>
          </div>
        </div>

        {/* Hidden canvas for processing */}
        <canvas
          ref={canvasRef}
          style={{
            display: 'none',
          }}
        />
      </div>
    </div>
  );
}
