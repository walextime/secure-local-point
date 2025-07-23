import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Download, 
  Printer, 
  FileText, 
  Image, 
  Archive, 
  X,
  Eye,
  File
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PreviewData, downloadFile, printFile, formatFileSize } from '@/services/backup/fileHandlers';

interface FilePreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  previewData: PreviewData | null;
}

const FilePreviewDialog: React.FC<FilePreviewDialogProps> = ({
  isOpen,
  onClose,
  previewData
}) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('preview');

  const handleDownload = async () => {
    if (!previewData) return;

    try {
      await downloadFile({
        filename: previewData.filename,
        contentType: getContentType(previewData.type),
        data: previewData.content
      });

      toast({
        title: "Download started",
        description: `${previewData.filename} is being downloaded`
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Failed to download file",
        variant: "destructive"
      });
    }
  };

  const handlePrint = async () => {
    if (!previewData) return;

    try {
      await printFile({
        filename: previewData.filename,
        contentType: getContentType(previewData.type),
        data: previewData.content
      });

      toast({
        title: "Print dialog opened",
        description: "Print dialog has been opened in a new window"
      });
    } catch (error) {
      toast({
        title: "Print failed",
        description: error instanceof Error ? error.message : "Failed to print file",
        variant: "destructive"
      });
    }
  };

  const getContentType = (type: PreviewData['type']): string => {
    switch (type) {
      case 'pdf': return 'application/pdf';
      case 'json': return 'application/json';
      case 'csv': return 'text/csv';
      case 'xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'zip': return 'application/zip';
      case 'image': return 'image/*';
      default: return 'text/plain';
    }
  };

  const renderPreview = () => {
    if (!previewData) return null;

    switch (previewData.type) {
      case 'pdf':
        return (
          <iframe
            src={URL.createObjectURL(previewData.content as Blob)}
            className="w-full h-96 border rounded"
            title={previewData.filename}
          />
        );

      case 'image':
        return (
          <div className="flex justify-center">
            <img
              src={URL.createObjectURL(previewData.content as Blob)}
              alt={previewData.filename}
              className="max-w-full max-h-96 object-contain rounded"
            />
          </div>
        );

      case 'json':
        return (
          <ScrollArea className="h-96 w-full">
            <pre className="p-4 bg-gray-50 rounded text-sm font-mono whitespace-pre-wrap">
              {previewData.content as string}
            </pre>
          </ScrollArea>
        );

      case 'csv':
        return (
          <ScrollArea className="h-96 w-full">
            <div className="p-4 bg-gray-50 rounded">
              <table className="w-full text-sm">
                <tbody>
                  {(previewData.content as string).split('\n').map((line, index) => (
                    <tr key={index}>
                      {line.split(',').map((cell, cellIndex) => (
                        <td key={cellIndex} className="border px-2 py-1">
                          {cell.replace(/^"|"$/g, '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ScrollArea>
        );

      case 'zip':
        return (
          <div className="text-center py-8">
            <Archive className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">ZIP archive preview not available</p>
            <p className="text-sm text-gray-500 mt-2">
              Use the download button to extract and view contents
            </p>
          </div>
        );

      case 'xlsx':
        return (
          <div className="text-center py-8">
            <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">Excel file preview not available</p>
            <p className="text-sm text-gray-500 mt-2">
              Use the download button to open in Excel
            </p>
          </div>
        );

      default:
        return (
          <ScrollArea className="h-96 w-full">
            <pre className="p-4 bg-gray-50 rounded text-sm font-mono whitespace-pre-wrap">
              {previewData.content as string}
            </pre>
          </ScrollArea>
        );
    }
  };

  const getFileIcon = (type: PreviewData['type']) => {
    switch (type) {
      case 'pdf': return <FileText className="h-5 w-5" />;
      case 'image': return <Image className="h-5 w-5" />;
      case 'zip': return <Archive className="h-5 w-5" />;
      default: return <File className="h-5 w-5" />;
    }
  };

  const getTypeBadge = (type: PreviewData['type']) => {
    const colors = {
      pdf: 'bg-red-100 text-red-800',
      json: 'bg-blue-100 text-blue-800',
      csv: 'bg-green-100 text-green-800',
      xlsx: 'bg-emerald-100 text-emerald-800',
      zip: 'bg-purple-100 text-purple-800',
      image: 'bg-pink-100 text-pink-800',
      text: 'bg-gray-100 text-gray-800'
    };

    return (
      <Badge className={colors[type] || colors.text}>
        {type.toUpperCase()}
      </Badge>
    );
  };

  if (!previewData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getFileIcon(previewData.type)}
              <div>
                <DialogTitle className="text-lg">{previewData.filename}</DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  {getTypeBadge(previewData.type)}
                  <span className="text-sm text-gray-500">
                    {formatFileSize(previewData.size)}
                  </span>
                </div>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="info" className="flex items-center gap-2">
              <File className="h-4 w-4" />
              Info
            </TabsTrigger>
            <TabsTrigger value="actions" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Actions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="mt-4">
            {renderPreview()}
          </TabsContent>

          <TabsContent value="info" className="mt-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Filename</label>
                  <p className="text-sm">{previewData.filename}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">File Type</label>
                  <p className="text-sm">{previewData.type.toUpperCase()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Size</label>
                  <p className="text-sm">{formatFileSize(previewData.size)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Content Type</label>
                  <p className="text-sm">{getContentType(previewData.type)}</p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="actions" className="mt-4">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  onClick={handleDownload}
                  className="flex items-center gap-2"
                  size="lg"
                >
                  <Download className="h-4 w-4" />
                  Download File
                </Button>
                
                <Button
                  onClick={handlePrint}
                  variant="outline"
                  className="flex items-center gap-2"
                  size="lg"
                  disabled={previewData.type === 'zip' || previewData.type === 'xlsx'}
                >
                  <Printer className="h-4 w-4" />
                  Print File
                </Button>
              </div>
              
              {(previewData.type === 'zip' || previewData.type === 'xlsx') && (
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> {previewData.type.toUpperCase()} files cannot be printed directly. 
                    Please download and open in the appropriate application.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default FilePreviewDialog; 