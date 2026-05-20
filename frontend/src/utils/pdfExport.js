/**
 * PDF Export Utility for TADA Claims
 * Generates a formatted PDF of claim details
 */

export const generateClaimPDF = (claim) => {
  // Note: jsPDF and html2canvas need to be installed
  // npm install jspdf html2canvas

  const { jsPDF } = window.jspdf;
  const html2canvas = window.html2canvas;

  if (!jsPDF || !html2canvas) {
    console.error('PDF libraries not loaded');
    return null;
  }

  const fmt = (n) => {
    const formatted = parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    return `₹${formatted}`;
  };

  const calculateExpenseTotal = (exp) =>
    ['fare', 'accommodation', 'conveyance', 'da', 'phone', 'internet', 'guest_entertainment', 'others']
      .reduce((s, k) => s + (parseFloat(exp[k]) || 0), 0);

  // Create a temporary div to render the PDF content
  const pdfContent = document.createElement('div');
  pdfContent.style.padding = '20px';
  pdfContent.style.backgroundColor = 'white';
  pdfContent.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
  pdfContent.style.lineHeight = '1.6';

  // Header
  const header = document.createElement('div');
  header.style.textAlign = 'center';
  header.style.marginBottom = '30px';
  header.style.borderBottom = '3px solid #1a3a52';
  header.style.paddingBottom = '15px';
  header.innerHTML = `
    <h1 style="color: #1a3a52; margin: 0 0 5px 0; font-size: 24px;">TADA CLAIM FORM</h1>
    <p style="color: #666; margin: 0; font-size: 12px;">Travel Allowance & Daily Allowance Management System</p>
  `;
  pdfContent.appendChild(header);

  // Claim Header Info
  const claimHeader = document.createElement('div');
  claimHeader.style.display = 'grid';
  claimHeader.style.gridTemplateColumns = '1fr 1fr 1fr';
  claimHeader.style.gap = '20px';
  claimHeader.style.marginBottom = '20px';
  claimHeader.style.padding = '15px';
  claimHeader.style.backgroundColor = '#f5f7fa';
  claimHeader.style.borderRadius = '4px';

  const claimNumber = document.createElement('div');
  claimNumber.innerHTML = `<strong style="display: block; color: #666; font-size: 11px; text-transform: uppercase;">Claim Number</strong><span style="font-size: 13px; font-weight: bold; color: #1a3a52;">${claim.claim_number}</span>`;
  claimHeader.appendChild(claimNumber);

  const claimStatus = document.createElement('div');
  claimStatus.innerHTML = `<strong style="display: block; color: #666; font-size: 11px; text-transform: uppercase;">Status</strong><span style="font-size: 13px; font-weight: bold; color: #b8860b; text-transform: capitalize;">${claim.status}</span>`;
  claimHeader.appendChild(claimStatus);

  const claimDate = document.createElement('div');
  claimDate.innerHTML = `<strong style="display: block; color: #666; font-size: 11px; text-transform: uppercase;">Submitted Date</strong><span style="font-size: 13px; font-weight: bold; color: #1a3a52;">${new Date(claim.submitted_at).toLocaleDateString('en-IN')}</span>`;
  claimHeader.appendChild(claimDate);

  pdfContent.appendChild(claimHeader);

  // Trip Information Section
  const tripSection = createSection('Trip Information', [
    ['Purpose of Travel', claim.purpose_of_travel],
    ['Travel From', claim.travel_from],
    ['Travel To', claim.travel_to],
    ['Departure Date', new Date(claim.departure_date).toLocaleDateString('en-IN', { dateStyle: 'long' })],
    ['Return Date', new Date(claim.return_date).toLocaleDateString('en-IN', { dateStyle: 'long' })],
  ]);
  pdfContent.appendChild(tripSection);

  // Expenses Table
  if (claim.expenses && claim.expenses.length > 0) {
    const expenseTable = document.createElement('div');
    expenseTable.style.marginBottom = '20px';

    const expenseTitle = document.createElement('h2');
    expenseTitle.textContent = 'Expense Breakdown';
    expenseTitle.style.fontSize = '14px';
    expenseTitle.style.color = '#1a3a52';
    expenseTitle.style.marginBottom = '10px';
    expenseTitle.style.fontWeight = '600';
    expenseTitle.style.borderBottom = '2px solid #c9a84c';
    expenseTitle.style.paddingBottom = '5px';
    expenseTable.appendChild(expenseTitle);

    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.fontSize = '12px';

    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr style="background: #1a3a52; color: white;">
        <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">Date</th>
        <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">Place</th>
        <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">Fare</th>
        <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">Accom.</th>
        <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">Convey.</th>
        <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">DA</th>
        <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">Phone</th>
        <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">Internet</th>
        <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">Guest Ent.</th>
        <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">Others</th>
        <th style="padding: 10px; text-align: center; border: 1px solid #ddd; font-weight: bold;">Total</th>
      </tr>
    `;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    claim.expenses.forEach((exp) => {
      const row = document.createElement('tr');
      const total = calculateExpenseTotal(exp);
      row.innerHTML = `
        <td style="padding: 8px; text-align: center; border: 1px solid #ddd;">${new Date(exp.expense_date).toLocaleDateString('en-IN')}</td>
        <td style="padding: 8px; text-align: center; border: 1px solid #ddd; font-size: 11px;">${exp.place_from ? `${exp.place_from}` : '—'}</td>
        <td style="padding: 8px; text-align: right; border: 1px solid #ddd;">${fmt(exp.fare)}</td>
        <td style="padding: 8px; text-align: right; border: 1px solid #ddd;">${fmt(exp.accommodation)}</td>
        <td style="padding: 8px; text-align: right; border: 1px solid #ddd;">${fmt(exp.conveyance)}</td>
        <td style="padding: 8px; text-align: right; border: 1px solid #ddd;">${fmt(exp.da)}</td>
        <td style="padding: 8px; text-align: right; border: 1px solid #ddd;">${fmt(exp.phone)}</td>
        <td style="padding: 8px; text-align: right; border: 1px solid #ddd;">${fmt(exp.internet)}</td>
        <td style="padding: 8px; text-align: right; border: 1px solid #ddd;">${fmt(exp.guest_entertainment)}</td>
        <td style="padding: 8px; text-align: right; border: 1px solid #ddd;">${fmt(exp.others)}</td>
        <td style="padding: 8px; text-align: right; border: 1px solid #ddd; font-weight: bold; background: #f5f7fa;">${fmt(total)}</td>
      `;
      tbody.appendChild(row);
    });

    // Grand Total Row
    const grandTotalRow = document.createElement('tr');
    grandTotalRow.style.background = '#1a3a52';
    grandTotalRow.style.color = 'white';
    grandTotalRow.innerHTML = `
      <td colSpan="10" style="padding: 10px; text-align: right; border: 1px solid #ddd; font-weight: 600;">GRAND TOTAL</td>
      <td style="padding: 10px; text-align: right; border: 1px solid #ddd; font-weight: bold; font-size: 14px; color: #c9a84c;">${fmt(claim.total_amount)}</td>
    `;
    tbody.appendChild(grandTotalRow);

    table.appendChild(tbody);
    expenseTable.appendChild(table);
    pdfContent.appendChild(expenseTable);
  }

  // Bank Details Section
  if (claim.bank_details) {
    const bankSection = createSection('Bank Details', [
      ['Account Holder', claim.bank_details.account_holder_name],
      ['Account Number', claim.bank_details.account_number],
      ['Bank Name', claim.bank_details.bank_name],
      ['Branch', claim.bank_details.branch_name],
      ['IFSC Code', claim.bank_details.ifsc_code],
      ['Account Type', claim.bank_details.account_type],
    ]);
    pdfContent.appendChild(bankSection);
  }

  // Footer
  const footer = document.createElement('div');
  footer.style.marginTop = '30px';
  footer.style.paddingTop = '20px';
  footer.style.borderTop = '1px solid #ddd';
  footer.style.fontSize = '11px';
  footer.style.color = '#666';
  footer.innerHTML = `
    <p style="margin: 0;">Generated on: ${new Date().toLocaleString('en-IN')}</p>
    <p style="margin: 5px 0 0 0;">This is a computer-generated document.</p>
  `;
  pdfContent.appendChild(footer);

  // Append to body temporarily
  pdfContent.style.position = 'absolute';
  pdfContent.style.left = '-9999px';
  pdfContent.style.top = '-9999px';
  pdfContent.style.width = '210mm';
  document.body.appendChild(pdfContent);

  // Generate PDF
  html2canvas(pdfContent, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff'
  }).then((canvas) => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgData = canvas.toDataURL('image/png');
    const imgWidth = 210;
    const pageHeight = 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`${claim.claim_number}-${new Date().getTime()}.pdf`);

    // Remove temporary element
    document.body.removeChild(pdfContent);
  });
};

// Helper function to create a section
function createSection(title, fields) {
  const section = document.createElement('div');
  section.style.marginBottom = '20px';
  section.style.padding = '15px';
  section.style.backgroundColor = '#f9f9f9';
  section.style.borderRadius = '4px';
  section.style.border = '1px solid #e0e0e0';

  const sectionTitle = document.createElement('h3');
  sectionTitle.textContent = title;
  sectionTitle.style.fontSize = '13px';
  sectionTitle.style.fontWeight = '600';
  sectionTitle.style.color = '#1a3a52';
  sectionTitle.style.marginBottom = '10px';
  sectionTitle.style.margin = '0 0 10px 0';
  section.appendChild(sectionTitle);

  const grid = document.createElement('div');
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = '1fr 1fr';
  grid.style.gap = '15px';

  fields.forEach(([label, value]) => {
    const field = document.createElement('div');
    field.style.fontSize = '12px';

    const labelDiv = document.createElement('div');
    labelDiv.textContent = label;
    labelDiv.style.fontWeight = '600';
    labelDiv.style.color = '#666';
    labelDiv.style.fontSize = '11px';
    labelDiv.style.textTransform = 'uppercase';
    labelDiv.style.letterSpacing = '0.5px';
    labelDiv.style.marginBottom = '3px';

    const valueDiv = document.createElement('div');
    valueDiv.textContent = value;
    valueDiv.style.color = '#1a3a52';
    valueDiv.style.fontWeight = '500';

    field.appendChild(labelDiv);
    field.appendChild(valueDiv);
    grid.appendChild(field);
  });

  section.appendChild(grid);
  return section;
}
