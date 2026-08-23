import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Mass, Reader, SpecialCelebration } from '@/react-app/types';
import { formatSpanishDate } from './dateFormat';

// Convert 24-hour time to 12-hour format with a.m./p.m.
function formatTime12Hour(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'p.m.' : 'a.m.';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

// Load image with opacity applied - using fetch to avoid CORS issues
async function loadImageWithOpacity(url: string, opacity: number): Promise<string> {
  try {
    // Fetch the image as a blob
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const blob = await response.blob();
    
    // Create object URL from blob
    const objectUrl = URL.createObjectURL(blob);
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        // Create canvas and apply opacity
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        // Set global alpha for opacity
        ctx.globalAlpha = opacity;
        ctx.drawImage(img, 0, 0);
        
        // Clean up object URL
        URL.revokeObjectURL(objectUrl);
        
        resolve(canvas.toDataURL('image/png'));
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to load image'));
      };
      
      img.src = objectUrl;
    });
  } catch (error) {
    throw new Error(`Failed to fetch image: ${error}`);
  }
}

export async function exportWeeklyAssignmentsPDF(
  masses: Mass[], 
  readers: Reader[], 
  startDate: Date,
  endDate: Date
) {
  const doc = new jsPDF();

  const formatDateRange = formatSpanishDate(startDate, { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  }) + ' - ' + formatSpanishDate(endDate, { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });

  // Filter masses for the date range
  const rangeMasses = masses.filter((mass) => {
    const massDate = new Date(mass.mass_date + 'T00:00:00');
    return massDate >= startDate && massDate <= endDate;
  }).sort((a, b) => {
    const dateA = new Date(`${a.mass_date}T${a.mass_time}`);
    const dateB = new Date(`${b.mass_date}T${b.mass_time}`);
    return dateA.getTime() - dateB.getTime();
  });

  // Helper function to get reader name
  const getReaderName = (id: number | null, customName: string | null) => {
    if (customName) return customName.toUpperCase();
    if (!id) return '** disponible **';
    const name = readers.find((r) => r.id === id)?.name || 'DESCONOCIDO';
    return name.toUpperCase();
  };

  // Try to load and add background image with opacity
  try {
    const imgData = await loadImageWithOpacity(
      '/bg-image.png',
      0.60
    );
    
    // Add watermark image centered on page
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    
    // Make image larger to cover most of the page
    const imgHeight = pageHeight * 0.90; // 90% of page height
    const imgWidth = imgHeight * 0.67; // Maintain aspect ratio (assuming portrait image)
    
    const x = (pageWidth - imgWidth) / 2;
    const y = (pageHeight - imgHeight) / 2;
    
    doc.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
    console.log('✓ Background image added successfully');
  } catch (error) {
    console.warn('⚠ Failed to load background image:', error);
    // Continue without background image
  }

  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('PROGRAMACIÓN DE EUCARISTÍAS', 105, 28, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('PROCLAMADORES - PARROQUIA EL DIVINO NIÑO', 105, 36, { align: 'center' });
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text(formatDateRange, 105, 43, { align: 'center' });

  if (rangeMasses.length === 0) {
    doc.setFontSize(12);
    doc.setTextColor(150);
    doc.text('No hay misas programadas para este período', 105, 50, { align: 'center' });
    doc.save(`asignaciones-${startDate.toISOString().split('T')[0]}-${endDate.toISOString().split('T')[0]}.pdf`);
    return;
  }

  // Group masses by date
  const massesByDate: Record<string, Mass[]> = {};
  rangeMasses.forEach((mass) => {
    if (!massesByDate[mass.mass_date]) {
      massesByDate[mass.mass_date] = [];
    }
    massesByDate[mass.mass_date].push(mass);
  });

  const sortedDates = Object.keys(massesByDate).sort();

  // Check if any mass has a commentator assigned AND enabled
  const hasAnyCommentator = rangeMasses.some(mass => 
    mass.has_commentator === 1 && (mass.commentator_reader_id !== null || mass.commentator_reader_custom !== null)
  );

  // Calculate font size based on number of masses
  const totalMasses = rangeMasses.length;
  let fontSize = 10;
  let headerFontSize = 10;
  let dateFontSize = 11;
  
  if (totalMasses > 20) {
    fontSize = 8;
    headerFontSize = 9;
    dateFontSize = 9;
  } else if (totalMasses > 15) {
    fontSize = 9;
    headerFontSize = 9;
    dateFontSize = 10;
  }

  // Create single table data with date separators
  const tableData: any[] = [];
  
  sortedDates.forEach((date) => {
    const dateMasses = massesByDate[date];
    const massDate = new Date(date + 'T00:00:00');
    const formattedDate = formatSpanishDate(massDate, { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long',
      year: 'numeric'
    });

    // Add date row
    tableData.push([
      { 
        content: formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1), 
        colSpan: hasAnyCommentator ? 5 : 4, 
        styles: { 
          fillColor: [79, 70, 229], 
          textColor: 255, 
          fontStyle: 'bold',
          fontSize: dateFontSize,
          halign: 'left',
          cellPadding: 2
        } 
      }
    ]);

    // Add mass rows for this date
    dateMasses.forEach((mass) => {
      const firstReader = getReaderName(mass.first_reader_id, mass.first_reader_custom);
      const psalmReader = getReaderName(mass.psalm_reader_id, mass.psalm_reader_custom);
      const secondReader = mass.has_second_reading === 1 
        ? getReaderName(mass.second_reader_id, mass.second_reader_custom) 
        : 'N/A';
      const commentator = hasAnyCommentator && mass.has_commentator === 1
        ? getReaderName(mass.commentator_reader_id, mass.commentator_reader_custom)
        : null;

      const row = [
        formatTime12Hour(mass.mass_time),
        firstReader,
        psalmReader,
        secondReader
      ];

      if (hasAnyCommentator) {
        row.push(commentator || '** disponible **');
      }

      tableData.push(row);
    });
  });

  // Generate single table - draw cells BEFORE content to allow background visibility
  const headerRow = hasAnyCommentator 
    ? ['Hora', '1ª Lectura', 'Salmo', '2ª Lectura', 'Comentarista']
    : ['Hora', '1ª Lectura', 'Salmo', '2ª Lectura'];

  const columnStyles: { [key: string]: any } = hasAnyCommentator 
    ? {
        0: { cellWidth: 24, halign: 'center', fontStyle: 'bold' },
        1: { cellWidth: 38 },
        2: { cellWidth: 38 },
        3: { cellWidth: 38 },
        4: { cellWidth: 38 }
      }
    : {
        0: { cellWidth: 30, halign: 'center', fontStyle: 'bold' },
        1: { cellWidth: 48 },
        2: { cellWidth: 48 },
        3: { cellWidth: 48 }
      };

  autoTable(doc, {
    startY: 88,
    head: [headerRow],
    body: tableData,
    theme: 'plain',
    headStyles: {
      fillColor: [245, 222, 179],
      textColor: 0,
      fontSize: headerFontSize,
      fontStyle: 'bold',
      halign: 'center',
      lineWidth: 0.1,
      lineColor: [200, 200, 200]
    },
    bodyStyles: {
      fontSize: fontSize,
      cellPadding: totalMasses > 20 ? 1 : 1.8,
      lineWidth: 0.1,
      lineColor: [200, 200, 200]
    },
    columnStyles: columnStyles,
    margin: { left: 18, right: 10 },
    didParseCell: function(data) {
      // Apply red color to "** disponible **" text before rendering
      if (data.cell.section === 'body' && data.cell.raw === '** disponible **') {
        data.cell.styles.textColor = [220, 38, 38]; // red-600
      }
    },
    willDrawCell: function(data) {
      // Draw backgrounds BEFORE cell content
      const firstCell = data.row.raw && (data.row.raw as any)[0];
      const isDateRow = firstCell && (firstCell.colSpan === 4 || firstCell.colSpan === 5);
      const isHeaderRow = data.row.section === 'head';
      
      if (!isHeaderRow && !isDateRow) {
        // Draw semi-transparent white background for regular cells
        const gState = doc.GState({ opacity: 0.75 });
        doc.setGState(gState);
        doc.setFillColor(255, 255, 255);
        doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
        doc.setGState(doc.GState({ opacity: 1 }));
      } else if (isDateRow) {
        // Solid color for date rows
        doc.setFillColor(79, 70, 229);
        doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
      }
    }
  });

  // Save the PDF
  const fileName = `asignaciones-${startDate.toISOString().split('T')[0]}-${endDate.toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}

export async function exportWeeklyReadingsToPDF(
  masses: Mass[],
  startDate: Date,
  endDate: Date
) {
  const doc = new jsPDF();

  const formatDateRange = formatSpanishDate(startDate, { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  }) + ' - ' + formatSpanishDate(endDate, { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });

  // Try to load and add background image with opacity
  try {
    const imgData = await loadImageWithOpacity(
      '/bg-image.png',
      0.60
    );
    
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    
    const imgHeight = pageHeight * 0.90;
    const imgWidth = imgHeight * 0.67;
    
    const x = (pageWidth - imgWidth) / 2;
    const y = (pageHeight - imgHeight) / 2;
    
    doc.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
    console.log('✓ Background image added successfully');
  } catch (error) {
    console.warn('⚠ Failed to load background image:', error);
  }

  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('LECTURAS DE LA SEMANA', 105, 28, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('PARROQUIA EL DIVINO NIÑO', 105, 36, { align: 'center' });
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text(formatDateRange, 105, 43, { align: 'center' });

  if (masses.length === 0) {
    doc.setFontSize(12);
    doc.setTextColor(150);
    doc.text('No hay misas programadas para este período', 105, 50, { align: 'center' });
    doc.save(`lecturas-${startDate.toISOString().split('T')[0]}-${endDate.toISOString().split('T')[0]}.pdf`);
    return;
  }

  // Group masses by date
  const massesByDate: Record<string, Mass[]> = {};
  masses.forEach((mass) => {
    if (!massesByDate[mass.mass_date]) {
      massesByDate[mass.mass_date] = [];
    }
    massesByDate[mass.mass_date].push(mass);
  });

  const sortedDates = Object.keys(massesByDate).sort();

  // Calculate font size based on number of masses
  const totalMasses = masses.length;
  let fontSize = 9;
  let headerFontSize = 10;
  let dateFontSize = 11;
  
  if (totalMasses > 15) {
    fontSize = 8;
    headerFontSize = 9;
    dateFontSize = 9;
  }

  // Create table data
  const tableData: any[] = [];
  
  sortedDates.forEach((date) => {
    const dateMasses = massesByDate[date];
    const massDate = new Date(date + 'T00:00:00');
    const formattedDate = formatSpanishDate(massDate, { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long',
      year: 'numeric'
    });

    // Add date row
    tableData.push([
      { 
        content: formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1), 
        colSpan: 4, 
        styles: { 
          fillColor: [79, 70, 229], 
          textColor: 255, 
          fontStyle: 'bold',
          fontSize: dateFontSize,
          halign: 'left',
          cellPadding: 2
        } 
      }
    ]);

    // Add mass rows for this date
    dateMasses.forEach((mass) => {
      const firstReading = mass.first_reading || 'No especificada';
      const psalm = mass.psalm || 'No especificado';
      const secondReading = mass.has_second_reading === 1 
        ? (mass.second_reading || 'No especificada')
        : 'N/A';
      const gospel = mass.gospel || 'No especificado';

      // Add first row with time and readings
      tableData.push([
        formatTime12Hour(mass.mass_time),
        firstReading,
        psalm,
        secondReading
      ]);

      // Add second row with gospel spanning all columns except first
      tableData.push([
        '',
        { 
          content: `Evangelio: ${gospel}`, 
          colSpan: 3,
          styles: {
            fontStyle: 'italic',
            textColor: [60, 60, 60]
          }
        }
      ]);
    });
  });

  // Generate table
  autoTable(doc, {
    startY: 50,
    head: [['Hora', '1ª Lectura', 'Salmo', '2ª Lectura']],
    body: tableData,
    theme: 'plain',
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: 255,
      fontSize: headerFontSize,
      fontStyle: 'bold',
      halign: 'center',
      lineWidth: 0.1,
      lineColor: [200, 200, 200]
    },
    bodyStyles: {
      fontSize: fontSize,
      cellPadding: totalMasses > 15 ? 1.5 : 2,
      lineWidth: 0.1,
      lineColor: [200, 200, 200]
    },
    columnStyles: {
      0: { cellWidth: 25, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 50 },
      2: { cellWidth: 45 },
      3: { cellWidth: 50 }
    },
    margin: { left: 15, right: 15 },
    willDrawCell: function(data) {
      const firstCell = data.row.raw && (data.row.raw as any)[0];
      const isDateRow = firstCell && firstCell.colSpan === 4;
      const isHeaderRow = data.row.section === 'head';
      
      if (!isHeaderRow && !isDateRow) {
        const gState = doc.GState({ opacity: 0.75 });
        doc.setGState(gState);
        doc.setFillColor(255, 255, 255);
        doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
        doc.setGState(doc.GState({ opacity: 1 }));
      } else if (isDateRow) {
        doc.setFillColor(79, 70, 229);
        doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
      }
    }
  });

  // Save the PDF
  const fileName = `lecturas-${startDate.toISOString().split('T')[0]}-${endDate.toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}

export async function exportSpecialCelebrationsToPDF(
  celebrations: SpecialCelebration[],
  readers: Reader[]
) {
  const doc = new jsPDF();

  // Helper function to get reader name
  const getReaderName = (id: number | null, customName: string | null) => {
    if (customName) return customName.toUpperCase();
    if (!id) return '** disponible **';
    const name = readers.find((r) => r.id === id)?.name || 'DESCONOCIDO';
    return name.toUpperCase();
  };

  // Try to load and add background image with opacity
  try {
    const imgData = await loadImageWithOpacity(
      '/bg-image.png',
      0.60
    );
    
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    
    const imgHeight = pageHeight * 0.90;
    const imgWidth = imgHeight * 0.67;
    
    const x = (pageWidth - imgWidth) / 2;
    const y = (pageHeight - imgHeight) / 2;
    
    doc.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
    console.log('✓ Background image added successfully');
  } catch (error) {
    console.warn('⚠ Failed to load background image:', error);
  }

  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('CELEBRACIONES ESPECIALES', 105, 28, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('PARROQUIA EL DIVINO NIÑO', 105, 36, { align: 'center' });

  if (celebrations.length === 0) {
    doc.setFontSize(12);
    doc.setTextColor(150);
    doc.text('No hay celebraciones seleccionadas para exportar', 105, 50, { align: 'center' });
    doc.save('celebraciones-especiales.pdf');
    return;
  }

  // Sort celebrations by date
  const sortedCelebrations = [...celebrations].sort((a, b) => {
    const dateA = new Date(`${a.celebration_date}T${a.celebration_time}`);
    const dateB = new Date(`${b.celebration_date}T${b.celebration_time}`);
    return dateA.getTime() - dateB.getTime();
  });

  // Build table data with all celebrations in a single table
  const tableData: any[] = [];
  
  sortedCelebrations.forEach((celebration) => {
    const celebrationDate = new Date(celebration.celebration_date + 'T00:00:00');
    const formattedDate = formatSpanishDate(celebrationDate, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    
    const formattedTime = formatTime12Hour(celebration.celebration_time);
    
    // Add celebration header row split into name and date
    tableData.push([
      { 
        content: celebration.name.toUpperCase(), 
        styles: { 
          fillColor: [79, 70, 229], 
          textColor: [255, 255, 255], 
          fontStyle: 'bold',
          fontSize: 10,
          halign: 'left',
          cellPadding: 2.5
        } 
      },
      { 
        content: `${formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1)} - ${formattedTime}`, 
        styles: { 
          fillColor: [79, 70, 229], 
          textColor: [255, 255, 255], 
          fontStyle: 'bold',
          fontSize: 10,
          halign: 'left',
          cellPadding: 2.5
        } 
      }
    ]);

    // Add roles for this celebration
    if (celebration.roles && celebration.roles.length > 0) {
      celebration.roles.forEach(role => {
        tableData.push([
          role.role_name,
          getReaderName(role.reader_id, role.custom_reader_name)
        ]);
      });
    } else {
      tableData.push([
        { 
          content: 'Sin proclamadores asignados', 
          colSpan: 2,
          styles: {
            textColor: [150, 150, 150],
            fontStyle: 'italic'
          }
        }
      ]);
    }
  });

  // Generate single table with all celebrations
  autoTable(doc, {
    startY: 95,
    head: [['CARGO', 'PROCLAMADOR']],
    body: tableData,
    theme: 'plain',
    headStyles: {
      fillColor: [245, 222, 179],
      textColor: 0,
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'center',
      lineWidth: 0.1,
      lineColor: [200, 200, 200]
    },
    bodyStyles: {
      fontSize: 9,
      cellPadding: 2,
      lineWidth: 0.1,
      lineColor: [200, 200, 200]
    },
    columnStyles: {
      0: { cellWidth: 70, fontStyle: 'bold', textColor: [60, 60, 60] },
      1: { cellWidth: 100 }
    },
    margin: { left: 20, right: 20 },
    didParseCell: function(data) {
      // Apply red color to "** disponible **" text before rendering
      if (data.cell.section === 'body' && data.cell.raw === '** disponible **') {
        data.cell.styles.textColor = [220, 38, 38]; // red-600
      }
    },
    willDrawCell: function(data) {
      const isHeaderRow = data.row.section === 'head';
      
      // Check if this cell has the celebration header background color
      const cellStyles = (data.cell.raw as any)?.styles;
      const isCelebrationHeader = cellStyles && 
        cellStyles.fillColor && 
        Array.isArray(cellStyles.fillColor) &&
        cellStyles.fillColor[0] === 79 && 
        cellStyles.fillColor[1] === 70 && 
        cellStyles.fillColor[2] === 229;
      
      if (!isHeaderRow && !isCelebrationHeader) {
        // Draw semi-transparent white background for regular cells
        const gState = doc.GState({ opacity: 0.8 });
        doc.setGState(gState);
        doc.setFillColor(255, 255, 255);
        doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
        doc.setGState(doc.GState({ opacity: 1 }));
      } else if (isCelebrationHeader) {
        // Blue background for celebration headers
        doc.setFillColor(79, 70, 229);
        doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
      }
    }
  });

  // Save the PDF
  const fileName = `celebraciones-especiales-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}
