import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReviewSettlementModal from '@/components/ReviewSettlementModal';

const CustodySettlementReviewPage = () => {
    const { settlementId } = useParams();
    const navigate = useNavigate();

    // This page is now largely redundant due to the modal implementation,
    // but we can keep it for direct link access if needed in the future.
    // For now, it will just redirect or show a message.
    
    React.useEffect(() => {
        // Redirect to the main financial management page as the review flow is now modal-based.
        navigate('/financial-management', { replace: true });
    }, [navigate]);

    return (
        <div className="p-8 text-center">
            <h1 className="text-2xl font-bold">إعادة توجيه...</h1>
            <p className="text-gray-600">
                مراجعة التسويات تتم الآن مباشرة في صفحة الإدارة المالية.
            </p>
        </div>
    );
};

export default CustodySettlementReviewPage;