import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const HEADER_COLOR: [number, number, number] = [30, 64, 120];
const ACCENT_COLOR: [number, number, number] = [59, 130, 246];

function addHeader(doc: jsPDF, title: string, subtitle?: string) {
  doc.setFillColor(...HEADER_COLOR);
  doc.rect(0, 0, doc.internal.pageSize.width, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('PAAVAI ENGINEERING COLLEGE', 14, 18);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Department of Computer Science & Engineering', 14, 28);
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, doc.internal.pageSize.width - 14, 36, { align: 'right' });

  doc.setTextColor(30, 30, 30);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 54);
  if (subtitle) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(subtitle, 14, 62);
  }
}

export function generateStudentListPDF(students: any[]) {
  const doc = new jsPDF();
  addHeader(doc, 'Student List Report', `Total Students: ${students.length}`);

  autoTable(doc, {
    startY: 68,
    head: [['#', 'Name', 'Roll Number', 'Register No', 'Section', 'Year', 'DOB']],
    body: students.map((s, i) => [
      i + 1,
      s.name,
      s.roll_number,
      s.register_number,
      s.section,
      s.year,
      new Date(s.dob).toLocaleDateString(),
    ]),
    headStyles: { fillColor: HEADER_COLOR, fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { left: 14, right: 14 },
  });

  doc.save('student-list-report.pdf');
}

export function generateAttendanceReportPDF(
  studentName: string,
  rollNumber: string,
  section: string,
  attendanceData: { subject: string; present: number; total: number; percentage: number }[],
  overallPercentage: number
) {
  const doc = new jsPDF();
  addHeader(doc, 'Attendance Report', `${studentName} | ${rollNumber} | ${section}`);

  // Summary box
  const y = 68;
  doc.setFillColor(240, 245, 255);
  doc.roundedRect(14, y, 80, 24, 3, 3, 'F');
  doc.setTextColor(...ACCENT_COLOR);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(`${overallPercentage}%`, 54, y + 16, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Overall Attendance', 54, y + 22, { align: 'center' });

  autoTable(doc, {
    startY: y + 32,
    head: [['Subject', 'Present', 'Total Classes', 'Percentage']],
    body: attendanceData.map((a) => [
      a.subject,
      a.present,
      a.total,
      `${a.percentage}%`,
    ]),
    headStyles: { fillColor: HEADER_COLOR, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { left: 14, right: 14 },
  });

  doc.save(`attendance-${rollNumber}.pdf`);
}

export function generateAcademicReportPDF(
  studentName: string,
  rollNumber: string,
  section: string,
  records: { semester: number; cgpa: number | null; subjects: { name: string; internal: number | null; external: number | null; total: number | null; grade: string | null }[] }[]
) {
  const doc = new jsPDF();
  addHeader(doc, 'Academic Progress Report', `${studentName} | ${rollNumber} | ${section}`);

  let currentY = 68;

  records.forEach((rec) => {
    if (currentY > 240) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(`Semester ${rec.semester}`, 14, currentY);
    if (rec.cgpa !== null) {
      doc.setFontSize(10);
      doc.setTextColor(...ACCENT_COLOR);
      doc.text(`CGPA: ${rec.cgpa}`, 80, currentY);
    }
    currentY += 4;

    if (rec.subjects.length > 0) {
      autoTable(doc, {
        startY: currentY,
        head: [['Subject', 'Internal', 'External', 'Total', 'Grade']],
        body: rec.subjects.map((s) => [
          s.name,
          s.internal ?? '-',
          s.external ?? '-',
          s.total ?? '-',
          s.grade ?? '-',
        ]),
        headStyles: { fillColor: HEADER_COLOR, fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        margin: { left: 14, right: 14 },
        didDrawPage: () => { },
      });
      currentY = (doc as any).lastAutoTable.finalY + 10;
    } else {
      currentY += 10;
    }
  });

  doc.save(`academic-report-${rollNumber}.pdf`);
}

export function generateFacultyListPDF(faculty: any[]) {
  const doc = new jsPDF();
  addHeader(doc, 'Faculty List Report', `Total Faculty: ${faculty.length}`);

  autoTable(doc, {
    startY: 68,
    head: [['#', 'Name', 'Faculty ID', 'Section', 'Role', 'Qualification', 'Experience']],
    body: faculty.map((f, i) => [
      i + 1,
      f.name,
      f.faculty_id,
      f.section || '-',
      f.is_tutor ? 'Tutor' : 'Faculty',
      f.qualification || '-',
      f.years_of_experience ? `${f.years_of_experience} yrs` : '-',
    ]),
    headStyles: { fillColor: HEADER_COLOR, fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { left: 14, right: 14 },
  });

  doc.save('faculty-list-report.pdf');
}

export function generateODReportPDF(odRequests: any[]) {
  const doc = new jsPDF();
  addHeader(doc, 'OD Requests Report', `Total Requests: ${odRequests.length}`);

  autoTable(doc, {
    startY: 68,
    head: [['#', 'Student', 'Reason', 'Start', 'End', 'Status']],
    body: odRequests.map((o, i) => [
      i + 1,
      o.student_name || o.student_id?.substring(0, 8),
      o.reason?.substring(0, 40) + (o.reason?.length > 40 ? '...' : ''),
      new Date(o.start_date).toLocaleDateString(),
      new Date(o.end_date).toLocaleDateString(),
      o.status,
    ]),
    headStyles: { fillColor: HEADER_COLOR, fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { left: 14, right: 14 },
  });

  doc.save('od-requests-report.pdf');
}

export function generateAuditLogPDF(logs: any[]) {
  const doc = new jsPDF();
  addHeader(doc, 'Audit Log Report', `Total Entries: ${logs.length}`);

  autoTable(doc, {
    startY: 68,
    head: [['Timestamp', 'Action', 'Table', 'Details']],
    body: logs.map((l) => [
      new Date(l.created_at).toLocaleString(),
      l.action,
      l.table_name || '-',
      l.details ? JSON.stringify(l.details).substring(0, 50) : '-',
    ]),
    headStyles: { fillColor: HEADER_COLOR, fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { left: 14, right: 14 },
  });

  doc.save('audit-log-report.pdf');
}

/* -------------------------- OD Approval Letter -------------------------- */
export function generateODLetterPDF(od: {
  reference?: string;
  studentName: string;
  rollNumber: string;
  registerNumber?: string;
  section: string;
  year: string | number;
  reason: string;
  startDate: string;
  endDate: string;
  tutorName?: string;
  hodName?: string;
  approvedOn?: string;
}) {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.width;

  // Letterhead
  doc.setFillColor(...HEADER_COLOR);
  doc.rect(0, 0, w, 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('PAAVAI ENGINEERING COLLEGE', w / 2, 14, { align: 'center' });
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Department of Computer Science & Engineering', w / 2, 22, { align: 'center' });
  doc.setFontSize(9);
  doc.text('(An Autonomous Institution) • Namakkal, Tamil Nadu', w / 2, 28, { align: 'center' });

  doc.setTextColor(30, 30, 30);
  const ref = od.reference || `OD/${new Date().getFullYear()}/${Math.floor(Math.random() * 9000 + 1000)}`;
  const approvedOn = od.approvedOn || new Date().toLocaleDateString('en-IN');

  doc.setFontSize(10);
  doc.text(`Ref: ${ref}`, 14, 44);
  doc.text(`Date: ${approvedOn}`, w - 14, 44, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('ON DUTY APPROVAL LETTER', w / 2, 58, { align: 'center' });
  doc.setDrawColor(...ACCENT_COLOR);
  doc.line(w / 2 - 40, 60, w / 2 + 40, 60);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  let y = 74;
  doc.text('To Whom It May Concern,', 14, y);
  y += 10;

  const body = `This is to certify that ${od.studentName} (Roll No: ${od.rollNumber}${od.registerNumber ? `, Register No: ${od.registerNumber}` : ''
    }), a student of ${od.section}, Year ${od.year}, of the Department of Computer Science & Engineering, has been granted On Duty leave from ${new Date(od.startDate).toLocaleDateString('en-IN')} to ${new Date(od.endDate).toLocaleDateString('en-IN')}.`;
  const wrapped = doc.splitTextToSize(body, w - 28);
  doc.text(wrapped, 14, y);
  y += wrapped.length * 6 + 4;

  doc.setFont('helvetica', 'bold');
  doc.text('Reason:', 14, y);
  doc.setFont('helvetica', 'normal');
  const reasonWrap = doc.splitTextToSize(od.reason, w - 28);
  doc.text(reasonWrap, 14, y + 6);
  y += reasonWrap.length * 6 + 12;

  doc.text('The absence during the above period may kindly be treated as On Duty.', 14, y);
  y += 20;

  // Signatures
  doc.setFont('helvetica', 'bold');
  doc.text('_________________________', 14, y + 20);
  doc.text('_________________________', w - 14, y + 20, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(od.tutorName || 'Class Tutor', 14, y + 26);
  doc.text('Class Tutor', 14, y + 32);
  doc.text(od.hodName || 'Head of the Department', w - 14, y + 26, { align: 'right' });
  doc.text('HOD, CSE', w - 14, y + 32, { align: 'right' });

  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text('This is a system-generated letter. Verify authenticity via reference number.', w / 2, doc.internal.pageSize.height - 10, { align: 'center' });

  doc.save(`OD-Letter-${od.rollNumber}.pdf`);
}

/* -------------------------- Student Portfolio -------------------------- */
export function generatePortfolioPDF(data: {
  studentName: string;
  rollNumber: string;
  registerNumber?: string;
  section: string;
  year: string | number;
  email?: string;
  cgpa?: number | null;
  achievements: { title: string; category: string; date: string; description?: string | null; verified?: boolean }[];
  activities?: { title: string; category: string; event_date: string; status: string }[];
}) {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.width;

  // Cover header
  doc.setFillColor(...HEADER_COLOR);
  doc.rect(0, 0, w, 46, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(data.studentName, 14, 22);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.rollNumber} • ${data.section} • Year ${data.year}`, 14, 30);
  if (data.email) doc.text(data.email, 14, 37);
  doc.setFontSize(9);
  doc.text('CSE Portfolio', w - 14, 22, { align: 'right' });
  doc.text('Paavai Engineering College', w - 14, 30, { align: 'right' });

  doc.setTextColor(30, 30, 30);

  // Academic summary
  let y = 58;
  doc.setFillColor(240, 245, 255);
  doc.roundedRect(14, y, w - 28, 22, 3, 3, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...ACCENT_COLOR);
  doc.text('ACADEMIC SUMMARY', 20, y + 8);
  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'normal');
  doc.text(`Current CGPA: ${data.cgpa != null ? data.cgpa.toFixed(2) : 'N/A'}`, 20, y + 16);
  doc.text(`Verified Achievements: ${data.achievements.filter(a => a.verified).length}`, 90, y + 16);
  doc.text(`Total Activities: ${(data.activities || []).length}`, 160, y + 16);
  y += 32;

  // Achievements
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...HEADER_COLOR);
  doc.text('Achievements & Certifications', 14, y);
  y += 4;

  if (data.achievements.length === 0) {
    y += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(120, 120, 120);
    doc.text('No achievements recorded yet.', 14, y);
    y += 10;
  } else {
    autoTable(doc, {
      startY: y + 2,
      head: [['Title', 'Category', 'Date', 'Verified']],
      body: data.achievements.map(a => [
        a.title,
        a.category,
        new Date(a.date).toLocaleDateString('en-IN'),
        a.verified ? '✓' : '—',
      ]),
      headStyles: { fillColor: HEADER_COLOR, fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // Activities
  if (data.activities && data.activities.length > 0) {
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...HEADER_COLOR);
    doc.text('Weekly Activities & Participations', 14, y);
    autoTable(doc, {
      startY: y + 4,
      head: [['Title', 'Category', 'Date', 'Status']],
      body: data.activities.map(a => [
        a.title,
        a.category,
        new Date(a.event_date).toLocaleDateString('en-IN'),
        a.status,
      ]),
      headStyles: { fillColor: HEADER_COLOR, fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      margin: { left: 14, right: 14 },
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `Generated ${new Date().toLocaleDateString('en-IN')} • Page ${i}/${pageCount} • Paavai CSE Portal`,
      w / 2,
      doc.internal.pageSize.height - 8,
      { align: 'center' }
    );
  }

  doc.save(`Portfolio-${data.rollNumber}.pdf`);
}

