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
