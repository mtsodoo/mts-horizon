
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

// Create styles
const styles = StyleSheet.create({
  page: {
    padding: 30,
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica', // Using standard font as fallback for reliability
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
    paddingBottom: 10,
  },
  headerLeft: {
    flexDirection: 'column',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a365d',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 10,
    color: '#718096',
  },
  infoSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    backgroundColor: '#f7fafc',
    padding: 10,
    borderRadius: 4,
  },
  infoColumn: {
    flexDirection: 'column',
  },
  label: {
    fontSize: 8,
    color: '#718096',
    marginBottom: 2,
  },
  value: {
    fontSize: 10,
    color: '#2d3748',
    marginBottom: 8,
    fontWeight: 'bold',
  },
  table: {
    display: 'table',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRightWidth: 0,
    borderBottomWidth: 0,
    marginBottom: 20,
  },
  tableRow: {
    margin: 'auto',
    flexDirection: 'row',
  },
  tableColHeader: {
    width: '25%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderColor: '#e2e8f0',
    backgroundColor: '#edf2f7',
    padding: 8,
  },
  tableColHeaderName: {
    width: '40%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderColor: '#e2e8f0',
    backgroundColor: '#edf2f7',
    padding: 8,
  },
  tableCol: {
    width: '25%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderColor: '#e2e8f0',
    padding: 8,
  },
  tableColName: {
    width: '40%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderColor: '#e2e8f0',
    padding: 8,
  },
  tableCellHeader: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#4a5568',
  },
  tableCell: {
    fontSize: 9,
    color: '#2d3748',
  },
  totalsSection: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    marginTop: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 4,
    width: 200,
  },
  totalLabel: {
    fontSize: 9,
    color: '#718096',
    marginRight: 10,
    textAlign: 'right',
    width: 100,
  },
  totalValue: {
    fontSize: 9,
    color: '#2d3748',
    textAlign: 'right',
    width: 80,
  },
  finalTotal: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1a365d',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 4,
    marginTop: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 8,
    color: '#a0aec0',
    borderTopWidth: 1,
    borderTopColor: '#eeeeee',
    paddingTop: 10,
  },
});

const QuotationPDF = ({ quotation }) => {
  if (!quotation) return null;

  const items = Array.isArray(quotation.items) ? quotation.items : [];
  
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Quotation</Text>
            <Text style={styles.subtitle}>Ref: {quotation.quotation_number}</Text>
          </View>
          <View>
             <Text style={{ fontSize: 10, color: '#718096' }}>{format(new Date(), 'PP')}</Text>
          </View>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoColumn}>
            <Text style={styles.label}>Bill To:</Text>
            <Text style={styles.value}>{quotation.customer_name}</Text>
            {quotation.customer_email && (
              <Text style={{ fontSize: 9, color: '#4a5568' }}>{quotation.customer_email}</Text>
            )}
          </View>
          <View style={styles.infoColumn}>
            <Text style={styles.label}>Date:</Text>
            <Text style={styles.value}>
              {quotation.created_at ? format(new Date(quotation.created_at), 'yyyy-MM-dd') : '-'}
            </Text>
            <Text style={styles.label}>Status:</Text>
            <Text style={styles.value}>{quotation.status}</Text>
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableRow}>
            <View style={styles.tableColHeaderName}>
              <Text style={styles.tableCellHeader}>Item Description</Text>
            </View>
            <View style={styles.tableColHeader}>
              <Text style={styles.tableCellHeader}>Quantity</Text>
            </View>
            <View style={styles.tableColHeader}>
              <Text style={styles.tableCellHeader}>Unit Price</Text>
            </View>
            <View style={styles.tableColHeader}>
              <Text style={styles.tableCellHeader}>Total</Text>
            </View>
          </View>

          {/* Table Rows */}
          {items.map((item, index) => {
             const qty = Number(item.quantity) || 0;
             const price = Number(item.unit_price) || 0;
             const total = qty * price;
             
             return (
              <View style={styles.tableRow} key={index}>
                <View style={styles.tableColName}>
                  <Text style={styles.tableCell}>{item.name || item.Item || 'Item'}</Text>
                </View>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCell}>{qty}</Text>
                </View>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCell}>{price.toFixed(2)}</Text>
                </View>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCell}>{total.toFixed(2)}</Text>
                </View>
              </View>
             );
          })}
        </View>

        {/* Totals Section */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Original Total:</Text>
            <Text style={styles.totalValue}>
              {Number(quotation.original_total || 0).toFixed(2)} SAR
            </Text>
          </View>
          
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Markup ({quotation.markup_percentage || 0}%):</Text>
            <Text style={styles.totalValue}>
              {(Number(quotation.final_total || 0) - Number(quotation.original_total || 0)).toFixed(2)} SAR
            </Text>
          </View>
          
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, styles.finalTotal]}>Final Total:</Text>
            <Text style={[styles.totalValue, styles.finalTotal]}>
              {Number(quotation.final_total || 0).toFixed(2)} SAR
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Thank you for your business</Text>
          <Text style={{ marginTop: 5 }}>Generated by MTS ERP System</Text>
        </View>
      </Page>
    </Document>
  );
};

export default QuotationPDF;
