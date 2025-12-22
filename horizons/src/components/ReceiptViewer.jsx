import React from 'react';
import { Modal, Image, Button } from 'antd';
import { Download } from 'lucide-react';

const ReceiptViewer = ({ url, visible, onClose }) => {
    const isPdf = url && (url.toLowerCase().endsWith('.pdf') || url.includes('.pdf?'));

    return (
        <Modal
            title="عرض الإيصال"
            open={visible}
            onCancel={onClose}
            footer={[
                <Button key="download" icon={<Download size={16} />} href={url} target="_blank" download>
                    تحميل
                </Button>,
                <Button key="close" type="primary" onClick={onClose}>
                    إغلاق
                </Button>,
            ]}
            width={isPdf ? '80vw' : 'auto'}
            style={{ top: 20 }}
            bodyStyle={isPdf ? { height: '80vh' } : {}}
            destroyOnClose
        >
            {isPdf ? (
                <iframe
                    src={url}
                    title="Receipt PDF"
                    style={{ width: '100%', height: '100%', border: 'none' }}
                />
            ) : (
                <Image
                    width="100%"
                    src={url}
                    alt="Receipt"
                    preview={{
                        mask: 'عرض مكبر'
                    }}
                />
            )}
        </Modal>
    );
};

export default ReceiptViewer;