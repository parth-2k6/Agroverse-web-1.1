
// src/components/disease-detector/DiseaseUpload.tsx
"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Camera, Upload, Image as ImageIcon, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface DiseaseUploadProps {
    onImageUpload: (dataUri: string, fileUrl: string) => void;
    currentImage: string | null; // To display the currently uploaded image preview
}

export default function DiseaseUpload({ onImageUpload, currentImage }: DiseaseUploadProps) {
    const [previewUrl, setPreviewUrl] = useState<string | null>(currentImage);
    const [error, setError] = useState<string | null>(null);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    // Update preview if currentImage prop changes (e.g., when parent state updates)
    useEffect(() => {
        setPreviewUrl(currentImage);
    }, [currentImage]);


    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setError(null);
        const file = event.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // Limit file size (e.g., 5MB)
                setError('File size exceeds 5MB limit.');
                toast({
                    title: 'Upload Error',
                    description: 'File size must be less than 5MB.',
                    variant: 'destructive',
                });
                setPreviewUrl(null); // Clear preview on error
                 if(fileInputRef.current) fileInputRef.current.value = ""; // Reset file input
                return;
            }
            if (!file.type.startsWith('image/')) {
                setError('Invalid file type. Please upload an image.');
                 toast({
                    title: 'Upload Error',
                    description: 'Only image files (JPEG, PNG, GIF, WebP) are allowed.',
                    variant: 'destructive',
                });
                setPreviewUrl(null); // Clear preview on error
                if(fileInputRef.current) fileInputRef.current.value = ""; // Reset file input
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                const dataUri = reader.result as string;
                const fileUrl = URL.createObjectURL(file); // Create temporary URL for preview
                setPreviewUrl(fileUrl); // Show preview immediately
                onImageUpload(dataUri, fileUrl); // Pass Data URI and File URL up
            };
            reader.onerror = () => {
                 setError('Failed to read the file.');
                 toast({ title: 'Error', description: 'Could not read the selected file.', variant: 'destructive' });
                 setPreviewUrl(null);
                 if(fileInputRef.current) fileInputRef.current.value = "";
            }
            reader.readAsDataURL(file);
        } else {
            setPreviewUrl(null); // Clear preview if no file selected
        }
    };

    const getCameraPermission = async () => {
      if (hasCameraPermission === true) {
        return true; // Already have permission
      }
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
         setError('Camera access is not supported by your browser or device.');
         toast({ title: 'Error', description: 'Camera not supported.', variant: 'destructive' });
         return false;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }); // Prefer rear camera
        setHasCameraPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
         return true; // Permission granted
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        setError('Camera access denied. Please enable camera permissions in your browser settings.');
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings.',
        });
        return false; // Permission denied
      }
    };

     const openCamera = async () => {
        const permissionGranted = await getCameraPermission();
        if (permissionGranted) {
            setIsCameraOpen(true);
             // Ensure video starts playing after permission is granted and modal opens
             setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.play().catch(err => console.error("Video play failed:", err));
                }
            }, 100); // Small delay to allow modal transition
        }
     };


     const closeCamera = () => {
         setIsCameraOpen(false);
         if (videoRef.current && videoRef.current.srcObject) {
             (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
             videoRef.current.srcObject = null; // Release the camera stream
         }
     };


    const captureImage = () => {
        if (!videoRef.current || !canvasRef.current) {
            setError("Camera components not ready.");
            return;
        }
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        if (!context) {
             setError("Could not get canvas context.");
             return;
        }

        // Set canvas dimensions to video dimensions
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw the current video frame onto the canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Get the image data as a data URI (e.g., PNG)
        const dataUri = canvas.toDataURL('image/png');

        // Create a temporary URL for the captured image for preview
        canvas.toBlob(blob => {
             if (blob) {
                 const fileUrl = URL.createObjectURL(blob);
                 setPreviewUrl(fileUrl); // Show captured image preview
                 onImageUpload(dataUri, fileUrl); // Pass Data URI and File URL up
                 closeCamera(); // Close the camera modal after capture
                 toast({ title: "Image Captured", description: "Ready for diagnosis." });
             } else {
                 setError("Failed to create blob from canvas.");
                 toast({ title: 'Error', description: 'Could not process captured image.', variant: 'destructive' });
             }
        }, 'image/png');
    };

    const handleRemoveImage = () => {
        setPreviewUrl(null);
        setError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = ""; // Reset the file input
        }
        // Notify parent component that image is removed (by passing null)
        // You might need a specific prop for this or adapt onImageUpload
        onImageUpload("", ""); // Indicate removal, adjust based on parent logic
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 {/* File Upload Button */}
                 <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full">
                    <Upload className="mr-2 h-4 w-4" /> Select Image File
                 </Button>
                 <Input
                    ref={fileInputRef}
                    id="image-upload"
                    type="file"
                    accept="image/*" // Allow any image type
                    onChange={handleFileChange}
                    className="hidden" // Hide the default input, trigger via button
                 />

                 {/* Camera Button */}
                 <AlertDialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
                    <AlertDialogTrigger asChild>
                         <Button variant="outline" onClick={openCamera} className="w-full">
                            <Camera className="mr-2 h-4 w-4" /> Use Camera
                         </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="max-w-xl w-full">
                         <AlertDialogHeader>
                           <AlertDialogTitle>Capture Crop Image</AlertDialogTitle>
                           <AlertDialogDescription>
                                Position the diseased plant part clearly in the frame.
                           </AlertDialogDescription>
                         </AlertDialogHeader>
                         <div className="relative aspect-video bg-muted rounded-md overflow-hidden mt-4">
                            <video
                                ref={videoRef}
                                className={`w-full h-full object-contain transition-opacity duration-300 ${hasCameraPermission === false ? 'opacity-0' : 'opacity-100'}`}
                                autoPlay
                                playsInline // Important for mobile browsers
                                muted // Mute to avoid feedback loops if needed
                            />
                             {/* Hidden canvas for capturing */}
                            <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>

                             {/* Loading/Permission indicator */}
                             {hasCameraPermission === null && (
                                <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                                    Requesting camera access...
                                </div>
                             )}
                              {hasCameraPermission === false && (
                                <div className="absolute inset-0 flex items-center justify-center bg-background/80 p-4 text-center">
                                    <p className="text-destructive">Camera access denied. Please enable permissions in your browser settings.</p>
                                </div>
                            )}
                         </div>
                         <AlertDialogFooter>
                           <AlertDialogCancel onClick={closeCamera}>Cancel</AlertDialogCancel>
                            {/* Disable capture button until permission is granted */}
                            <Button onClick={captureImage} disabled={hasCameraPermission !== true}>
                                <Camera className="mr-2 h-4 w-4" /> Capture
                            </Button>
                         </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

            </div>

            {error && (
                <p className="text-sm text-destructive text-center mt-2">{error}</p>
            )}

            {/* Image Preview */}
            {previewUrl && (
                <div className="mt-4 p-4 border rounded-lg relative max-w-md mx-auto bg-muted/50">
                    <Label className="text-sm font-medium block mb-2 text-center">Image Preview:</Label>
                     <Image
                        src={previewUrl}
                        alt="Uploaded Crop Image Preview"
                        width={300} // Adjust as needed
                        height={200} // Adjust as needed
                        className="rounded-md object-contain mx-auto" // Center the image
                    />
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6 bg-background/50 hover:bg-destructive/80 hover:text-destructive-foreground rounded-full"
                        onClick={handleRemoveImage}
                        aria-label="Remove image"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            )}
             {!previewUrl && (
                <div className="mt-4 p-6 border border-dashed rounded-lg text-center text-muted-foreground bg-muted/30">
                    <ImageIcon className="mx-auto h-10 w-10 mb-2" />
                     <p>Image preview will appear here.</p>
                 </div>
            )}
        </div>
    );
}

    