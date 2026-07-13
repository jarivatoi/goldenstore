import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Cropper from 'react-easy-crop';
import { X, ZoomIn, ZoomOut, Check } from 'lucide-react';

interface ImageCropperModalProps {
  image: string;
  onComplete: (croppedImage: string) => void;
  onCancel: () => void;
}

interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

const ImageCropperModal: React.FC<ImageCropperModalProps> = ({ image, onComplete, onCancel }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', error => reject(error));
      image.src = url;
    });

  const getCroppedImg = async (imageSrc: string, pixelCrop: Area): Promise<string> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          return;
        }
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
      }, 'image/jpeg', 0.95);
    });
  };

  const handleComplete = async () => {
    if (!croppedAreaPixels) return;

    try {
      const croppedImage = await getCroppedImg(image, croppedAreaPixels);
      onComplete(croppedImage);
    } catch (error) {
      console.error('Error cropping image:', error);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex flex-col z-[10000]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-900 text-white">
        <h2 className="text-lg font-semibold">Crop Photo</h2>
        <button
          onClick={onCancel}
          className="p-2 hover:bg-gray-800 rounded-full transition-colors"
        >
          <X size={24} />
        </button>
      </div>

      {/* Cropper Area */}
      <div className="flex-1 relative">
        <Cropper
          image={image}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={setCrop}
          onCropComplete={onCropComplete}
          onZoomChange={setZoom}
        />
      </div>

      {/* Controls */}
      <div className="bg-gray-900 p-6 space-y-4">
        {/* Zoom Slider */}
        <div className="flex items-center gap-4">
          <ZoomOut size={20} className="text-white flex-shrink-0" />
          <input
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((zoom - 1) / 2) * 100}%, #374151 ${((zoom - 1) / 2) * 100}%, #374151 100%)`
            }}
          />
          <ZoomIn size={20} className="text-white flex-shrink-0" />
        </div>

        <p className="text-center text-sm text-gray-400">
          Drag to reposition • Pinch or scroll to zoom
        </p>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleComplete}
            className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium flex items-center justify-center gap-2"
          >
            <Check size={20} />
            Apply
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default ImageCropperModal;
