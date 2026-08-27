// Generates a downloadable PDF certificate using jsPDF (loaded globally
// via CDN in index.html as window.jspdf.jsPDF).

export function generateCertificate({ name, points, date }) {
  const { jsPDF } = window.jspdf || {};
  if (!jsPDF) {
    alert("Certificate generator failed to load. Please refresh and try again.");
    return;
  }

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Decorative border
  doc.setDrawColor(56, 189, 248);
  doc.setLineWidth(6);
  doc.rect(20, 20, pageWidth - 40, pageHeight - 40);
  doc.setDrawColor(15, 118, 110);
  doc.setLineWidth(1.5);
  doc.rect(32, 32, pageWidth - 64, pageHeight - 64);

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(34);
  doc.setTextColor(15, 76, 129);
  doc.text("NEERAKSH", pageWidth / 2, 110, { align: "center" });

  doc.setFontSize(18);
  doc.setTextColor(50, 50, 50);
  doc.text("Certificate of Water Conservation Achievement", pageWidth / 2, 140, { align: "center" });

  // Body
  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.text("This certificate is proudly presented to", pageWidth / 2, 190, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(22, 101, 52);
  doc.text(name || "NEERAKSH Participant", pageWidth / 2, 230, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.setTextColor(50, 50, 50);
  doc.text(
    `for actively participating in NEERAKSH's water conservation initiative and`,
    pageWidth / 2, 270, { align: "center" }
  );
  doc.text(
    `earning ${points} points through documented water-saving actions and community awareness.`,
    pageWidth / 2, 292, { align: "center" }
  );

  // Footer
  doc.setFontSize(12);
  doc.text(`Issued on: ${date}`, 80, pageHeight - 70);
  doc.text("NEERAKSH Initiative", pageWidth - 80, pageHeight - 70, { align: "right" });

  doc.save(`NEERAKSH_Certificate_${(name || "participant").replace(/\s+/g, "_")}.pdf`);
}
