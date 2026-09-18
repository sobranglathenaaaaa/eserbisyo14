import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ExportPreviewModalProps {
  open: boolean;
  onClose: () => void;
  contentHtml: string;
  onConfirm: () => void;
  format: 'pdf' | 'docx';
}

export const ExportPreviewModal: React.FC<ExportPreviewModalProps> = ({ open, onClose, contentHtml, onConfirm, format }) => {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{`Preview ${format.toUpperCase()} Export`}</DialogTitle>
        </DialogHeader>
        <div className="p-4 border rounded" dangerouslySetInnerHTML={{ __html: contentHtml }} />
        <DialogFooter className="flex justify-end space-x-2 mt-4">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={onConfirm}>Download {format.toUpperCase()}</Button>
        </DialogFooter>
        <DialogClose />
      </DialogContent>
    </Dialog>
  );
};
