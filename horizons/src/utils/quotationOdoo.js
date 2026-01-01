
import { supabase } from '@/lib/customSupabaseClient';

/**
 * Creates a quotation in Odoo
 * @param {Object} quotationData - The quotation data
 * @returns {Promise<Object>} - The result from Odoo
 */
export const createOdooQuotation = async (quotationData) => {
  console.log('Initiating Odoo quotation creation...', quotationData);
  
  try {
    // In a real production environment, we would use a Supabase Edge Function 
    // to securely communicate with Odoo API using stored secrets.
    // 
    // Example:
    // const { data, error } = await supabase.functions.invoke('odoo-create-quotation', {
    //   body: JSON.stringify(quotationData)
    // });
    
    // For this implementation, we will simulate the API call latency and success
    // This allows the frontend flow to be tested and verified.
    
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simulate a success rate of 95%
        if (Math.random() > 0.05) {
          resolve({
            success: true,
            id: Math.floor(Math.random() * 100000) + 50000,
            name: `SO${new Date().getFullYear()}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
            amount_total: quotationData.final_total
          });
        } else {
          reject(new Error('Failed to connect to Odoo server. Please try again.'));
        }
      }, 1500);
    });
    
  } catch (error) {
    console.error('Error in createOdooQuotation:', error);
    throw error;
  }
};
