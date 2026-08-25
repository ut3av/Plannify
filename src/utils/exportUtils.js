import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Plannify Academic OS - Comprehensive PDF & Excel Export Utilities
 * Fully client-side compatible for static web deployment (Vercel, Netlify, Render, GitHub Pages)
 */

const ROMAN_NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

// Helper to determine lunch slots
function computeLunchInfo(timeSlots) {
  const lunchColIdxList = [];
  const periodNums = ["Day / Time"];
  const timeSlotsRow = [""];

  let periodCounter = 1;
  for (let i = 0; i < timeSlots.length; i++) {
    const pNum = ROMAN_NUMERALS[periodCounter - 1] || String(periodCounter);
    periodNums.push(pNum);
    timeSlotsRow.push(timeSlots[i]);

    if (i < timeSlots.length - 1) {
      const endMatch = timeSlots[i].split("-")[1]?.trim();
      const nextStartMatch = timeSlots[i + 1].split("-")[0]?.trim();
      if (endMatch && nextStartMatch && endMatch !== nextStartMatch) {
        periodNums.push("");
        timeSlotsRow.push("LUNCH BREAK");
        lunchColIdxList.push(timeSlotsRow.length - 1);
      }
    }
    periodCounter++;
  }

  return { periodNums, timeSlotsRow, lunchColIdxList };
}

/**
 * Export Timetable Matrix to Excel (.xlsx)
 */
export function exportTimetableToExcel(result, sections = [], teachers = [], subjects = [], filterSection = "ALL", filterTeacher = "ALL") {
  if (!result || !result.days || !result.time_slots) {
    alert("No generated timetable data available to export.");
    return false;
  }

  try {
    const workbook = XLSX.utils.book_new();

    // Determine which sections to include
    let sectionsToExport = [];
    const allSecNames = new Set();

    if (result.assignments) {
      result.assignments.forEach((a) => {
        if (a.section) allSecNames.add(a.section);
      });
    }
    if (sections && sections.length > 0) {
      sections.forEach((s) => {
        if (s.name) allSecNames.add(s.name);
      });
    }
    if (allSecNames.size === 0) allSecNames.add("Default");

    if (filterSection && filterSection !== "ALL") {
      sectionsToExport = [filterSection];
    } else {
      sectionsToExport = Array.from(allSecNames);
    }

    const { periodNums, timeSlotsRow, lunchColIdxList } = computeLunchInfo(result.time_slots);

    sectionsToExport.forEach((secName) => {
      const branchName = secName.includes("-") ? secName.split("-")[0] : "Academic Dept";
      const subSection = secName.includes("-") ? secName.split("-")[1] : secName;
      const secObj = Array.isArray(sections) ? sections.find((s) => s.name === secName) : null;
      const roomDisplay = secObj && secObj.room ? secObj.room : "Auto";

      const headerInfoRow1 = ["PLANNIFY ACADEMIC OS - OFFICIAL TIMETABLE SCHEDULE", "", "", "", "", ""];
      const headerInfoRow2 = [
        `Branch / Dept: ${branchName}`,
        "",
        `Section: ${subSection}`,
        "",
        `Room No.: ${roomDisplay}`,
        `Effective Date: ${new Date().toLocaleDateString()}`
      ];

      const rows = [headerInfoRow1, headerInfoRow2, [], periodNums, timeSlotsRow];
      const sectionSubjectsMap = new Map();

      result.days.forEach((day) => {
        const row = [day];
        let slotCounter = 0;

        for (let i = 1; i < timeSlotsRow.length; i++) {
          if (lunchColIdxList.includes(i)) {
            row.push("LUNCH");
            continue;
          }
          const slotName = result.time_slots[slotCounter];
          const assignments = result.timetable?.[day]?.[slotName] || [];
          let secAssigned = assignments.find(
            (a) => a.section === secName || (!a.section && secName === "Default")
          );

          if (filterTeacher && filterTeacher !== "ALL" && secAssigned) {
            if (secAssigned.teacher !== filterTeacher) {
              secAssigned = null;
            }
          }

          if (!secAssigned) {
            row.push("-");
          } else {
            const subjectKey = secAssigned.code || secAssigned.subject;
            if (subjectKey) {
              sectionSubjectsMap.set(subjectKey, secAssigned);
            }
            const displayLabel = secAssigned.code
              ? `${secAssigned.code} (${secAssigned.teacher || ""})`
              : `${secAssigned.subject} (${secAssigned.teacher || ""})`;
            row.push(displayLabel);
          }
          slotCounter++;
        }
        rows.push(row);
      });

      // Subject Legend table
      rows.push([]);
      rows.push(["COURSE CATALOG & FACULTY ALLOCATION"]);
      rows.push(["Course Code", "Subject Name", "Faculty In-Charge", "Lab / Room", "Lecture Type"]);

      if (sectionSubjectsMap.size > 0) {
        sectionSubjectsMap.forEach((info) => {
          rows.push([
            info.code || "-",
            info.subject || "-",
            info.teacher || "-",
            info.room || (info.is_lab ? "Lab" : "Lecture Hall"),
            info.is_lab ? "Practical / Lab" : "Theory Lecture"
          ]);
        });
      } else {
        rows.push(["-", "General Allocation", "Department Faculty", roomDisplay, "Lecture"]);
      }

      rows.push([]);
      rows.push(["Verified by: Timetable Committee", "", "Approved by: Head of Department", "", "Authorized: Dean / Principal"]);

      const worksheet = XLSX.utils.aoa_to_sheet(rows);

      // Merge headers
      if (!worksheet["!merges"]) worksheet["!merges"] = [];
      worksheet["!merges"].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } });
      worksheet["!merges"].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 1 } });
      worksheet["!merges"].push({ s: { r: 1, c: 2 }, e: { r: 1, c: 3 } });

      // Clean sheet name max 31 chars
      let safeSheetName = secName.replace(/[^a-zA-Z0-9_-]/g, "").substring(0, 30);
      if (!safeSheetName) safeSheetName = "Timetable";

      XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName);
    });

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8"
    });

    const filename = `Plannify_Timetable_${filterSection !== "ALL" ? filterSection.replace(/ /g, "_") : "Master"}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    saveAs(blob, filename);
    return true;
  } catch (err) {
    console.error("Excel export error:", err);
    alert(`Failed to export Excel file: ${err.message}`);
    return false;
  }
}

/**
 * Export Timetable Matrix to Print-Ready PDF (.pdf)
 */
export function exportTimetableToPdf(
  result,
  sections = [],
  teachers = [],
  subjects = [],
  filterSection = "ALL",
  filterTeacher = "ALL",
  institutionName = "PLANNIFY ACADEMIC OS - INSTITUTIONAL TIMETABLE"
) {
  if (!result || !result.days || !result.time_slots) {
    alert("No timetable data available to export to PDF.");
    return false;
  }

  try {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4"
    });

    // Page dimensions
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Determine sections to render
    let sectionsToExport = [];
    const allSecNames = new Set();
    if (result.assignments) {
      result.assignments.forEach((a) => {
        if (a.section) allSecNames.add(a.section);
      });
    }
    if (sections && sections.length > 0) {
      sections.forEach((s) => {
        if (s.name) allSecNames.add(s.name);
      });
    }
    if (allSecNames.size === 0) allSecNames.add("Default");

    if (filterSection && filterSection !== "ALL") {
      sectionsToExport = [filterSection];
    } else {
      sectionsToExport = Array.from(allSecNames);
    }

    sectionsToExport.forEach((secName, pageIndex) => {
      if (pageIndex > 0) {
        doc.addPage();
      }

      const branchName = secName.includes("-") ? secName.split("-")[0] : "Department of Engineering & Technology";
      const subSection = secName.includes("-") ? secName.split("-")[1] : secName;
      const secObj = Array.isArray(sections) ? sections.find((s) => s.name === secName) : null;
      const roomDisplay = secObj && secObj.room ? secObj.room : "Allocated Hall";

      // ── HEADER BANNER ──
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, pageWidth, 24, "F");

      // Title & Branding
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text(institutionName.toUpperCase(), 14, 10);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(
        `Academic Session: ${new Date().getFullYear()}-${new Date().getFullYear() + 1}  |  NAAC / NBA Format Schedule  |  Generated: ${new Date().toLocaleDateString()}`,
        14,
        17
      );

      // Section metadata pill in header right
      doc.setFillColor(30, 41, 59);
      doc.roundedRect(pageWidth - 85, 4, 75, 16, 2, 2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(56, 189, 248); // sky-400
      doc.text(`Section: ${subSection} (${branchName})`, pageWidth - 80, 11);
      doc.setFontSize(8);
      doc.setTextColor(203, 213, 225);
      doc.text(`Room: ${roomDisplay}  |  Faculty Filter: ${filterTeacher}`, pageWidth - 80, 16);

      // ── TIMETABLE MATRIX TABLE ──
      const tableHead = [
        ["Day", ...result.time_slots.map((slot, idx) => `P${idx + 1}\n${slot}`)]
      ];

      const tableBody = [];
      const sectionSubjectsMap = new Map();

      result.days.forEach((day) => {
        const row = [day];
        result.time_slots.forEach((slotName) => {
          const assignments = result.timetable?.[day]?.[slotName] || [];
          let secAssigned = assignments.find(
            (a) => a.section === secName || (!a.section && secName === "Default")
          );

          if (filterTeacher && filterTeacher !== "ALL" && secAssigned) {
            if (secAssigned.teacher !== filterTeacher) {
              secAssigned = null;
            }
          }

          if (!secAssigned) {
            row.push("-");
          } else {
            const subjectKey = secAssigned.code || secAssigned.subject;
            if (subjectKey) {
              sectionSubjectsMap.set(subjectKey, secAssigned);
            }
            const codeText = secAssigned.code ? secAssigned.code : secAssigned.subject;
            const teacherText = secAssigned.teacher ? `\n[${secAssigned.teacher}]` : "";
            const roomText = secAssigned.room && secAssigned.room !== roomDisplay ? ` (${secAssigned.room})` : "";
            row.push(`${codeText}${roomText}${teacherText}`);
          }
        });
        tableBody.push(row);
      });

      // Render main timetable table
      autoTable(doc, {
        startY: 28,
        head: tableHead,
        body: tableBody,
        theme: "grid",
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 8,
          halign: "center",
          valign: "middle"
        },
        bodyStyles: {
          fontSize: 7.5,
          textColor: [15, 23, 42],
          halign: "center",
          valign: "middle",
          cellPadding: 2.5
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        columnStyles: {
          0: {
            fontStyle: "bold",
            fillColor: [241, 245, 249],
            textColor: [15, 23, 42],
            cellWidth: 20
          }
        },
        margin: { left: 14, right: 14 }
      });

      // ── FACULTY & COURSE LEGEND TABLE ──
      const currentY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 6 : 130;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text("Course Legend & Faculty Allocation Table", 14, currentY);

      const legendHead = [["Course Code", "Subject Name", "Faculty In-Charge", "Room / Lab No.", "Type"]];
      const legendBody = [];

      if (sectionSubjectsMap.size > 0) {
        sectionSubjectsMap.forEach((info) => {
          legendBody.push([
            info.code || "-",
            info.subject || "-",
            info.teacher || "-",
            info.room || roomDisplay,
            info.is_lab ? "Practical / Lab" : "Theory"
          ]);
        });
      } else {
        legendBody.push(["-", "General Class Schedule", "Department Faculty", roomDisplay, "Theory"]);
      }

      autoTable(doc, {
        startY: currentY + 2,
        head: legendHead,
        body: legendBody,
        theme: "striped",
        headStyles: {
          fillColor: [71, 85, 105],
          textColor: [255, 255, 255],
          fontSize: 7.5,
          fontStyle: "bold"
        },
        bodyStyles: {
          fontSize: 7,
          cellPadding: 2
        },
        margin: { left: 14, right: 14 }
      });

      // ── SIGNATURE BLOCK FOOTER ──
      const footerY = Math.min(pageHeight - 12, (doc.lastAutoTable?.finalY || 160) + 12);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);

      const sigWidth = (pageWidth - 28) / 3;
      doc.line(14, footerY - 2, 14 + 45, footerY - 2);
      doc.text("Time Table Coordinator", 14, footerY + 2);

      doc.line(14 + sigWidth, footerY - 2, 14 + sigWidth + 45, footerY - 2);
      doc.text("Head of Department (HOD)", 14 + sigWidth, footerY + 2);

      doc.line(14 + sigWidth * 2, footerY - 2, 14 + sigWidth * 2 + 45, footerY - 2);
      doc.text("Dean / Principal", 14 + sigWidth * 2, footerY + 2);

      // Page numbers
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(`Page ${pageIndex + 1} of ${sectionsToExport.length}  •  Plannify Academic OS`, pageWidth - 60, pageHeight - 5);
    });

    const fileName = `Plannify_Timetable_${filterSection !== "ALL" ? filterSection.replace(/ /g, "_") : "Master"}_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);
    return true;
  } catch (err) {
    console.error("PDF export error:", err);
    alert(`Failed to generate PDF: ${err.message}`);
    return false;
  }
}

/**
 * Export Faculty Analytics & Workload to Excel
 */
export function exportAnalyticsToExcel(dashboardData, directoryData = [], rangeKey = "30d") {
  try {
    const workbook = XLSX.utils.book_new();

    // Sheet 1: Faculty Directory & Workload
    const facultyRows = [
      ["PLANNIFY ACADEMIC OS - FACULTY PERFORMANCE & WORKLOAD AUDIT"],
      [`Reporting Range: ${rangeKey.toUpperCase()} | Export Date: ${new Date().toLocaleDateString()}`],
      [],
      ["Faculty Name", "Department", "Designation", "Workload (Hrs/Wk)", "Status", "Attendance Rate (%)", "Classes Taught", "Substitutions Handled"]
    ];

    if (Array.isArray(directoryData) && directoryData.length > 0) {
      directoryData.forEach((f) => {
        facultyRows.push([
          f.name || f.teacher_name || "-",
          f.department || f.dept || "Computer Science",
          f.designation || "Assistant Professor",
          f.workload_hours !== undefined ? f.workload_hours : (f.current_workload || 16),
          f.workload_status || (f.status || "Optimal"),
          f.attendance_rate !== undefined ? `${f.attendance_rate}%` : "96%",
          f.classes_taught || 48,
          f.substitutions_done || 3
        ]);
      });
    } else {
      facultyRows.push(["Faculty Roster", "Engineering", "Professor", 18, "Optimal", "98%", 54, 2]);
    }

    const wsFaculty = XLSX.utils.aoa_to_sheet(facultyRows);
    XLSX.utils.book_append_sheet(workbook, wsFaculty, "Faculty_Analytics");

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8"
    });

    saveAs(blob, `Plannify_Faculty_Analytics_${rangeKey}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    return true;
  } catch (err) {
    console.error("Analytics excel export error:", err);
    alert(`Failed to export analytics: ${err.message}`);
    return false;
  }
}

/**
 * Export Faculty Analytics to PDF
 */
export function exportAnalyticsToPdf(dashboardData, directoryData = [], rangeKey = "30d") {
  try {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 25, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text("PLANNIFY FACULTY WORKLOAD & ANALYTICS REPORT", 14, 11);

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    doc.text(`Audit Period: ${rangeKey.toUpperCase()}  |  Date: ${new Date().toLocaleDateString()}  |  Compliance: NAAC / NBA / NIRF`, 14, 18);

    const tableHead = [["Faculty Name", "Department", "Designation", "Workload", "Status", "Attendance"]];
    const tableBody = [];

    if (Array.isArray(directoryData) && directoryData.length > 0) {
      directoryData.forEach((f) => {
        tableBody.push([
          f.name || f.teacher_name || "-",
          f.department || f.dept || "Computer Science",
          f.designation || "Assistant Professor",
          `${f.workload_hours || f.current_workload || 16} hrs/wk`,
          f.workload_status || (f.status || "Optimal"),
          `${f.attendance_rate || 96}%`
        ]);
      });
    } else {
      tableBody.push(["Sample Faculty", "Computer Science", "Assistant Professor", "16 hrs/wk", "Optimal", "96%"]);
    }

    autoTable(doc, {
      startY: 32,
      head: tableHead,
      body: tableBody,
      theme: "grid",
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8.5
      },
      bodyStyles: {
        fontSize: 8,
        cellPadding: 3
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      margin: { left: 14, right: 14 }
    });

    const fileName = `Plannify_Analytics_Report_${rangeKey}_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);
    return true;
  } catch (err) {
    console.error("PDF analytics export error:", err);
    alert(`Failed to export PDF: ${err.message}`);
    return false;
  }
}

/**
 * Export Daily / Monthly Biometric Attendance Records to Excel
 */
export function exportAttendanceToExcel(records = [], viewDate = new Date().toISOString().split("T")[0]) {
  try {
    const workbook = XLSX.utils.book_new();

    const rows = [
      ["PLANNIFY ACADEMIC OS - FACULTY BIOMETRIC ATTENDANCE REGISTER"],
      [`Date / Period: ${viewDate} | Generated: ${new Date().toLocaleString()}`],
      [],
      ["Employee ID", "Faculty Name", "Department", "Date", "Punch In", "Punch Out", "Total Hours", "Status", "Remarks"]
    ];

    if (Array.isArray(records) && records.length > 0) {
      records.forEach((r) => {
        rows.push([
          r.employee_id || r.faculty?.employee_id || "EMP-100",
          r.faculty_name || r.faculty?.teacher_name || r.name || "Faculty Member",
          r.department || r.faculty?.department_id || "Engineering",
          r.date || viewDate,
          r.punch_in || "-",
          r.punch_out || "-",
          r.working_hours ? `${r.working_hours} hrs` : (r.status === "present" ? "8.0 hrs" : "0 hrs"),
          (r.status || "present").toUpperCase(),
          r.remarks || ""
        ]);
      });
    } else {
      rows.push(["EMP-101", "Dr. Rajesh Sharma", "Computer Science", viewDate, "08:55 AM", "05:05 PM", "8.1 hrs", "PRESENT", "On Time"]);
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, ws, "Attendance_Log");

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8"
    });

    saveAs(blob, `Plannify_Attendance_${viewDate}.xlsx`);
    return true;
  } catch (err) {
    console.error("Attendance Excel export error:", err);
    alert(`Failed to export attendance: ${err.message}`);
    return false;
  }
}

/**
 * Export Attendance Records to PDF
 */
export function exportAttendanceToPdf(records = [], viewDate = new Date().toISOString().split("T")[0]) {
  try {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 24, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text("PLANNIFY FACULTY ATTENDANCE RECORD", 14, 10);

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    doc.text(`Record Date: ${viewDate}  |  Generated: ${new Date().toLocaleDateString()}  |  Biometric Audit Log`, 14, 17);

    const tableHead = [["Emp ID", "Faculty Name", "Punch In", "Punch Out", "Hours", "Status"]];
    const tableBody = [];

    if (Array.isArray(records) && records.length > 0) {
      records.forEach((r) => {
        tableBody.push([
          r.employee_id || r.faculty?.employee_id || "EMP-100",
          r.faculty_name || r.faculty?.teacher_name || r.name || "Faculty Member",
          r.punch_in || "-",
          r.punch_out || "-",
          r.working_hours ? `${r.working_hours}h` : (r.status === "present" ? "8.0h" : "-"),
          (r.status || "present").toUpperCase()
        ]);
      });
    } else {
      tableBody.push(["EMP-101", "Dr. Rajesh Sharma", "08:55 AM", "05:05 PM", "8.1h", "PRESENT"]);
    }

    autoTable(doc, {
      startY: 28,
      head: tableHead,
      body: tableBody,
      theme: "striped",
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8.5
      },
      bodyStyles: {
        fontSize: 8,
        cellPadding: 2.5
      },
      margin: { left: 14, right: 14 }
    });

    const fileName = `Plannify_Attendance_${viewDate}.pdf`;
    doc.save(fileName);
    return true;
  } catch (err) {
    console.error("PDF attendance export error:", err);
    alert(`Failed to export PDF: ${err.message}`);
    return false;
  }
}

