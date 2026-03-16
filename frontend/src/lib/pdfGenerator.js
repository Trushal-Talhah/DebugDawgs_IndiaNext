import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Helper to determine risk colors for the PDF
function getRiskColor(score) {
  if (score >= 80) return [239, 68, 68]; // Red
  if (score >= 60) return [249, 115, 22]; // Orange
  if (score >= 40) return [234, 179, 8]; // Yellow
  if (score >= 20) return [59, 130, 246]; // Blue
  return [34, 197, 94]; // Green
}

export function generateReportPDF(result) {
  // Create an A4 portrait PDF
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 20;
  let cursorY = 20;

  // -- Header --
  doc.setFillColor(30, 30, 36);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('SentinelAI', marginLeft, 20);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Threat Analysis Report', marginLeft, 28);

  const dateStr = new Date().toLocaleString();
  doc.setFontSize(10);
  doc.text(`Generated: ${dateStr}`, pageWidth - 20, 28, { align: 'right' });

  cursorY = 50;

  // -- Risk Score Panel --
  const riskColor = getRiskColor(result.score);
  
  // Background card for score
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(marginLeft, cursorY, pageWidth - 40, 30, 3, 3, 'FD');

  doc.setFontSize(14);
  doc.setTextColor(50, 50, 50);
  doc.setFont('helvetica', 'bold');
  doc.text('Overall Risk Assessment', marginLeft + 5, cursorY + 10);

  doc.setFontSize(28);
  doc.setTextColor(riskColor[0], riskColor[1], riskColor[2]);
  doc.text(`${result.score}/100`, pageWidth - 25, cursorY + 18, { align: 'right' });

  doc.setFontSize(12);
  doc.setTextColor(riskColor[0], riskColor[1], riskColor[2]);
  doc.text(`${result.level} Threat Level`, marginLeft + 5, cursorY + 20);

  cursorY += 40;

  // -- Key Signals --
  if (result.signals && result.signals.length > 0) {
    doc.setFontSize(14);
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'bold');
    doc.text('Key Signals Detected', marginLeft, cursorY);
    cursorY += 6;

    const signalsData = result.signals.map(s => [s]);
    autoTable(doc, {
      startY: cursorY,
      margin: { left: marginLeft },
      head: [],
      body: signalsData,
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 3, textColor: [60, 60, 60] },
      columnStyles: { 0: { cellWidth: pageWidth - 40 } },
    });
    cursorY = doc.lastAutoTable.finalY + 10;
  }

  //   // -- MITRE ATT&CK Predictions (if applicable) --
  if (result.mitreTactic) {
    if (cursorY > pageHeight - 40) { doc.addPage(); cursorY = 20; }
    
    doc.setFontSize(14);
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'bold');
    doc.text('MITRE ATT&CK Prediction', marginLeft, cursorY);
    cursorY += 6;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Tactic: ${result.mitreTactic} (Stage ${result.mitreStage} of ${result.mitreTotalStages || 14})`, marginLeft, cursorY);
    cursorY += 8;
  }

  // -- Recommended Actions --
  if (result.recommendations && result.recommendations.length > 0) {
    if (cursorY > pageHeight - 40) { doc.addPage(); cursorY = 20; }

    doc.setFontSize(14);
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'bold');
    doc.text('Recommended Actions', marginLeft, cursorY);
    cursorY += 6;

    const actionsData = result.recommendations.map((a, i) => [`${i + 1}.`, a]);
    autoTable(doc, {
      startY: cursorY,
      margin: { left: marginLeft },
      head: [],
      body: actionsData,
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 3, textColor: [60, 60, 60] },
      columnStyles: { 
        0: { cellWidth: 10, fontStyle: 'bold' },
        1: { cellWidth: pageWidth - 50 } 
      },
    });
    cursorY = doc.lastAutoTable.finalY + 10;
  }

  // -- Execution Tracing Pipeline --
  if (result.evidenceSteps && result.evidenceSteps.length > 0) {
    if (cursorY > pageHeight - 60) { doc.addPage(); cursorY = 20; }

    doc.setFontSize(14);
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'bold');
    doc.text('Execution Tracing Pipeline', marginLeft, cursorY);
    cursorY += 6;

    const evidenceData = result.evidenceSteps.map(step => [
      step.timestamp || '-',
      step.type || 'Trace',
      step.description
    ]);

    autoTable(doc, {
      startY: cursorY,
      margin: { left: marginLeft },
      head: [['Time', 'Type', 'Description']],
      body: evidenceData,
      theme: 'grid',
      headStyles: { fillColor: [240, 240, 240], textColor: [50, 50, 50], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: { 
        0: { cellWidth: 20 },
        1: { cellWidth: 30 },
        2: { cellWidth: pageWidth - 90 } 
      },
    });
  }

  // -- Feature Importance (Model Factors) --
  if (result.features && result.features.length > 0) {
    if (doc.lastAutoTable && doc.lastAutoTable.finalY > pageHeight - 60) { doc.addPage(); cursorY = 20; }
    else if (doc.lastAutoTable) { cursorY = doc.lastAutoTable.finalY + 10; }

    doc.setFontSize(14);
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'bold');
    doc.text('Heuristic Weight Factors', marginLeft, cursorY);
    cursorY += 6;

    const featureData = result.features.map(f => {
      const weight = (f.value * 100).toFixed(1) + '%';
      return [f.name, weight];
    });

    autoTable(doc, {
      startY: cursorY,
      margin: { left: marginLeft },
      head: [['Factor', 'Impact Weight']],
      body: featureData,
      theme: 'grid',
      headStyles: { fillColor: [240, 240, 240], textColor: [50, 50, 50], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: { 
        0: { cellWidth: pageWidth - 80 },
        1: { cellWidth: 40, halign: 'right' } 
      },
    });
  }

  // Save the PDF
  doc.save('SentinelAI_Threat_Report.pdf');
}
