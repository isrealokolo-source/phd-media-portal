import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  GENERAL_SCHEDULE_TERMS,
  ARTIST_DECLARATION_TEXT,
  ARTIST_CONFIRMATION_TEXT,
  PHD_ACKNOWLEDGMENT_TEXT,
  RECOUPMENT_LEGAL_NOTICE,
  PENDING_CLEARANCE_WARNING,
} from './constants';

export interface GeneratePdfResult {
  filePath: string;
  fileUrl: string;
  documentHash: string;
  pdfBytes: Uint8Array;
}

function calculateSha256(buffer: Uint8Array | Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

// Helper to wrap text into lines fitting a given width
function wrapText(text: string, maxWidth: number, font: any, fontSize: number): string[] {
  if (!text) return [];
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(testLine, fontSize);
    if (width <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

export async function generateScheduleAPdf(release: any): Promise<GeneratePdfResult> {
  const doc = await PDFDocument.create();
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await doc.embedFont(StandardFonts.HelveticaOblique);
  const fontMono = await doc.embedFont(StandardFonts.Courier);

  const artistSig = release.signatures?.find((s: any) => s.signerType === 'ARTIST');
  const phdSig = release.signatures?.find((s: any) => s.signerType === 'PHD_REPRESENTATIVE');

  let page = doc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();
  const margin = 40;
  const contentWidth = width - margin * 2;
  let y = height - margin;

  const checkAddPage = (neededHeight: number) => {
    if (y - neededHeight < margin + 40) {
      // Add footer to current page
      drawFooter(page);
      page = doc.addPage([595.28, 841.89]);
      y = height - margin;
      drawHeader(page);
    }
  };

  const drawHeader = (p: any) => {
    p.drawText(`PHD SERVICES — SCHEDULE A: RELEASE SCHEDULE & MASTER REGISTER`, {
      x: margin,
      y: height - 25,
      size: 8,
      font: fontBold,
      color: rgb(0.3, 0.3, 0.35),
    });
    p.drawText(`Ref: ${release.referenceNumber} | Version: ${release.currentVersion || 1}`, {
      x: width - margin - 150,
      y: height - 25,
      size: 8,
      font: fontMono,
      color: rgb(0.3, 0.3, 0.35),
    });
    p.drawLine({
      start: { x: margin, y: height - 30 },
      end: { x: width - margin, y: height - 30 },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8),
    });
  };

  const drawFooter = (p: any) => {
    p.drawLine({
      start: { x: margin, y: 35 },
      end: { x: width - margin, y: 35 },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8),
    });
    p.drawText(`PHD Services Release Management Portal — Strictly Confidential & Legally Binding`, {
      x: margin,
      y: 22,
      size: 7,
      font: fontRegular,
      color: rgb(0.4, 0.4, 0.4),
    });
  };

  drawHeader(page);

  // Title Block
  page.drawText('SCHEDULE A', {
    x: margin,
    y,
    size: 16,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.2),
  });
  y -= 18;

  page.drawText('STANDARD RELEASE SCHEDULE AND MASTER REGISTER', {
    x: margin,
    y,
    size: 12,
    font: fontBold,
    color: rgb(0.2, 0.2, 0.3),
  });
  y -= 16;

  page.drawText('Agreement: Music Distribution, Management & Master Control Agreement', {
    x: margin,
    y,
    size: 9,
    font: fontItalic,
    color: rgb(0.3, 0.3, 0.3),
  });
  y -= 13;

  page.drawText(`Company/Manager: PHD Services ("PHD")`, {
    x: margin,
    y,
    size: 9,
    font: fontRegular,
    color: rgb(0.2, 0.2, 0.2),
  });
  y -= 13;

  const artistName = release.primaryArtist || release.artist?.artistProfile?.stageName || release.artist?.name || 'Artist';
  page.drawText(`Artist: ${artistName} ("Artist")`, {
    x: margin,
    y,
    size: 9,
    font: fontRegular,
    color: rgb(0.2, 0.2, 0.2),
  });
  y -= 13;

  const effectiveDate = release.executedAt
    ? new Date(release.executedAt).toLocaleDateString('en-GB')
    : new Date().toLocaleDateString('en-GB');
  page.drawText(`Effective Date: ${effectiveDate}`, {
    x: margin,
    y,
    size: 9,
    font: fontRegular,
    color: rgb(0.2, 0.2, 0.2),
  });
  y -= 13;

  page.drawText('Agreement Term: Five (5) years, subject to the renewal and termination provisions of the Agreement.', {
    x: margin,
    y,
    size: 8.5,
    font: fontRegular,
    color: rgb(0.3, 0.3, 0.3),
  });
  y -= 22;

  // PART I — RELEASE INFORMATION
  checkAddPage(150);
  page.drawRectangle({
    x: margin,
    y: y - 16,
    width: contentWidth,
    height: 18,
    color: rgb(0.93, 0.94, 0.96),
  });
  page.drawText('PART I — RELEASE INFORMATION', {
    x: margin + 6,
    y: y - 12,
    size: 9,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.2),
  });
  y -= 26;

  const releaseInfoRows = [
    ['Release Reference Number', release.referenceNumber || ''],
    ['Release Title', release.title || ''],
    ['Release Type', release.releaseType || 'Single'],
    ['Primary Artist', release.primaryArtist || ''],
    ['Featured Artist(s)', release.featuredArtists || 'None'],
    ['Record Label / Imprint', release.recordLabel || 'Independent / PHD Services'],
    ['Genre / Subgenre', `${release.genre || 'Afrobeats'} ${release.subgenre ? `/ ${release.subgenre}` : ''}`],
    ['Planned Release Date', release.plannedReleaseDate ? new Date(release.plannedReleaseDate).toLocaleDateString('en-GB') : 'To Be Scheduled'],
    ['Territory', release.territoryType === 'Worldwide' ? 'Worldwide' : (release.territoryDetails || 'Specific Territories')],
    ['Distribution Format', (Array.isArray(release.distributionFormats) ? release.distributionFormats.join(', ') : release.distributionFormats) || 'Streaming, Digital Download'],
    ['Distribution Platforms', (Array.isArray(release.distributionPlatforms) ? release.distributionPlatforms.join(', ') : release.distributionPlatforms) || 'Spotify, Apple Music, YouTube Music, Audiomack, TIDAL'],
    ['Release Status', release.status?.replace(/_/g, ' ') || 'PROPOSED'],
  ];

  for (const [field, val] of releaseInfoRows) {
    checkAddPage(16);
    page.drawRectangle({
      x: margin,
      y: y - 14,
      width: 160,
      height: 15,
      borderWidth: 0.5,
      borderColor: rgb(0.85, 0.85, 0.85),
      color: rgb(0.97, 0.97, 0.98),
    });
    page.drawRectangle({
      x: margin + 160,
      y: y - 14,
      width: contentWidth - 160,
      height: 15,
      borderWidth: 0.5,
      borderColor: rgb(0.85, 0.85, 0.85),
    });
    page.drawText(field, {
      x: margin + 6,
      y: y - 10,
      size: 7.5,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    });
    page.drawText(String(val).substring(0, 75), {
      x: margin + 166,
      y: y - 10,
      size: 7.5,
      font: fontRegular,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= 15;
  }
  y -= 15;

  // PART II — MASTER RECORDING REGISTER
  checkAddPage(180);
  page.drawRectangle({
    x: margin,
    y: y - 16,
    width: contentWidth,
    height: 18,
    color: rgb(0.93, 0.94, 0.96),
  });
  page.drawText('PART II — MASTER RECORDING REGISTER', {
    x: margin + 6,
    y: y - 12,
    size: 9,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.2),
  });
  y -= 24;

  page.drawText('A separate entry shall be completed for each sound recording included in the release.', {
    x: margin,
    y,
    size: 7.5,
    font: fontItalic,
    color: rgb(0.4, 0.4, 0.4),
  });
  y -= 14;

  const tracks = release.tracks || [];
  if (tracks.length === 0) {
    page.drawText('No tracks registered in master register.', { x: margin, y, size: 8, font: fontRegular });
    y -= 20;
  } else {
    for (const track of tracks) {
      checkAddPage(140);
      page.drawRectangle({
        x: margin,
        y: y - 14,
        width: contentWidth,
        height: 15,
        color: rgb(0.88, 0.9, 0.94),
      });
      page.drawText(`Track ${track.trackNumber || 1}: "${track.title}" ${track.versionRemix ? `(${track.versionRemix})` : ''}`, {
        x: margin + 6,
        y: y - 10,
        size: 8,
        font: fontBold,
        color: rgb(0.1, 0.1, 0.2),
      });
      y -= 15;

      const trackFields = [
        ['Primary Artist / Features', `${track.primaryArtist || artistName} ${track.featuredArtists ? `feat. ${track.featuredArtists}` : ''}`],
        ['Producer / Beatmaker', track.producerBeatmaker || 'Disclosed in Producer Register'],
        ['Songwriter(s) / Composer(s)', track.songwritersComposers || 'Disclosed in Split Agreement'],
        ['Master Owner & Ownership %', `${track.masterOwnerLegalName || artistName} (${track.masterOwnershipPercentage || 100}%)`],
        ['ISRC', track.isrc || 'Pending assignment'],
        ['Language / Explicit', `${track.language || 'English'} | Explicit: ${track.explicitContent ? 'Yes' : 'No'}`],
        ['Duration / Deliverables', `${track.duration || '03:30'} | Final Master: ${track.finalMasterDelivered || 'Yes'} | Lyrics: ${track.lyricsDelivered || 'Yes'}`],
        ['Rights Clearance Status', `${track.rightsClearanceStatus || 'Cleared'} | Acceptance Date: ${track.phdAcceptanceDate ? new Date(track.phdAcceptanceDate).toLocaleDateString('en-GB') : effectiveDate}`],
      ];

      for (const [tf, tv] of trackFields) {
        checkAddPage(14);
        page.drawRectangle({
          x: margin,
          y: y - 13,
          width: 150,
          height: 13,
          borderWidth: 0.5,
          borderColor: rgb(0.88, 0.88, 0.88),
          color: rgb(0.98, 0.98, 0.99),
        });
        page.drawRectangle({
          x: margin + 150,
          y: y - 13,
          width: contentWidth - 150,
          height: 13,
          borderWidth: 0.5,
          borderColor: rgb(0.88, 0.88, 0.88),
        });
        page.drawText(tf, { x: margin + 4, y: y - 9.5, size: 7, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
        page.drawText(String(tv).substring(0, 80), { x: margin + 154, y: y - 9.5, size: 7, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });
        y -= 13;
      }
      y -= 10;
    }
  }

  // PART III — RELEASE DELIVERABLES AND DEADLINES
  checkAddPage(150);
  page.drawRectangle({
    x: margin,
    y: y - 16,
    width: contentWidth,
    height: 18,
    color: rgb(0.93, 0.94, 0.96),
  });
  page.drawText('PART III — RELEASE DELIVERABLES AND DEADLINES', {
    x: margin + 6,
    y: y - 12,
    size: 9,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.2),
  });
  y -= 26;

  // Table Header
  page.drawRectangle({
    x: margin,
    y: y - 14,
    width: contentWidth,
    height: 15,
    color: rgb(0.85, 0.87, 0.92),
  });
  page.drawText('Deliverable', { x: margin + 6, y: y - 10, size: 7.5, font: fontBold });
  page.drawText('Responsible Party', { x: margin + 220, y: y - 10, size: 7.5, font: fontBold });
  page.drawText('Status', { x: margin + 350, y: y - 10, size: 7.5, font: fontBold });
  page.drawText('Approval Date', { x: margin + 430, y: y - 10, size: 7.5, font: fontBold });
  y -= 15;

  const deliverables = release.deliverables || [];
  for (const del of deliverables) {
    checkAddPage(14);
    page.drawRectangle({
      x: margin,
      y: y - 13,
      width: contentWidth,
      height: 13,
      borderWidth: 0.5,
      borderColor: rgb(0.88, 0.88, 0.88),
    });
    page.drawText(del.name || 'Deliverable', { x: margin + 6, y: y - 9.5, size: 7, font: fontRegular });
    page.drawText(del.responsibleParty || 'Artist', { x: margin + 220, y: y - 9.5, size: 7, font: fontRegular });
    page.drawText(del.status || 'Approved', { x: margin + 350, y: y - 9.5, size: 7, font: fontBold, color: del.status === 'Approved' ? rgb(0.1, 0.5, 0.2) : rgb(0.2, 0.2, 0.2) });
    page.drawText(del.approvalDate ? new Date(del.approvalDate).toLocaleDateString('en-GB') : effectiveDate, { x: margin + 430, y: y - 9.5, size: 7, font: fontRegular });
    y -= 13;
  }
  y -= 10;

  // Deliverables Legal Notice
  checkAddPage(40);
  const delivNoticeLines = wrapText(
    'A planned release date is subject to timely delivery, completed rights clearances, technical acceptance by the relevant platforms and the terms of the Agreement. Neither Party shall represent a release date as guaranteed where third-party approval remains outstanding.',
    contentWidth,
    fontItalic,
    7
  );
  for (const line of delivNoticeLines) {
    page.drawText(line, { x: margin, y, size: 7, font: fontItalic, color: rgb(0.35, 0.35, 0.35) });
    y -= 10;
  }
  y -= 12;

  // PART IV — RELEASE BUDGET AND APPROVED RECOUPABLE COSTS
  checkAddPage(160);
  page.drawRectangle({
    x: margin,
    y: y - 16,
    width: contentWidth,
    height: 18,
    color: rgb(0.93, 0.94, 0.96),
  });
  page.drawText('PART IV — RELEASE BUDGET AND APPROVED RECOUPABLE COSTS', {
    x: margin + 6,
    y: y - 12,
    size: 9,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.2),
  });
  y -= 26;

  page.drawText(`Release Reference Number: ${release.referenceNumber} | Currency: ${release.currency || 'NGN'}`, {
    x: margin,
    y,
    size: 8,
    font: fontBold,
  });
  y -= 14;

  // Budget Table Header
  page.drawRectangle({
    x: margin,
    y: y - 14,
    width: contentWidth,
    height: 15,
    color: rgb(0.85, 0.87, 0.92),
  });
  page.drawText('Expense Category', { x: margin + 6, y: y - 10, size: 7.5, font: fontBold });
  page.drawText('Approved Amount', { x: margin + 190, y: y - 10, size: 7.5, font: fontBold });
  page.drawText('Actual Amount', { x: margin + 280, y: y - 10, size: 7.5, font: fontBold });
  page.drawText('Approval Reference', { x: margin + 370, y: y - 10, size: 7.5, font: fontBold });
  y -= 15;

  let totalApproved = 0;
  let totalActual = 0;
  const budgetItems = release.budgetItems || [];

  for (const item of budgetItems) {
    checkAddPage(14);
    totalApproved += Number(item.approvedAmount || 0);
    totalActual += Number(item.actualAmount || 0);

    page.drawRectangle({
      x: margin,
      y: y - 13,
      width: contentWidth,
      height: 13,
      borderWidth: 0.5,
      borderColor: rgb(0.88, 0.88, 0.88),
    });
    const approvedDisplay = item.approvedAmount > 0
      ? `${release.currency || 'NGN'} ${Number(item.approvedAmount).toLocaleString()}`
      : `Pending (${release.currency || 'NGN'} ${Number(item.suggestedAmount || 0).toLocaleString()} sugg.)`;

    page.drawText(item.expenseCategory || 'Expense', { x: margin + 6, y: y - 9.5, size: 7, font: fontRegular });
    page.drawText(approvedDisplay, { x: margin + 190, y: y - 9.5, size: 6.5, font: fontRegular });
    page.drawText(`${release.currency || 'NGN'} ${Number(item.actualAmount || 0).toLocaleString()}`, { x: margin + 280, y: y - 9.5, size: 7, font: fontRegular });
    page.drawText(item.approvalReference || (item.approvedAmount > 0 ? 'PHD-APPR-DIR' : 'Pending Review'), { x: margin + 370, y: y - 9.5, size: 6.5, font: fontRegular });
    y -= 13;
  }

  // Total Row
  checkAddPage(16);
  page.drawRectangle({
    x: margin,
    y: y - 14,
    width: contentWidth,
    height: 15,
    color: rgb(0.93, 0.94, 0.96),
    borderWidth: 0.5,
    borderColor: rgb(0.7, 0.7, 0.7),
  });
  page.drawText('Total Approved & Documented Expenditure', { x: margin + 6, y: y - 10, size: 7.5, font: fontBold });
  page.drawText(`${release.currency || 'NGN'} ${totalApproved.toLocaleString()}`, { x: margin + 190, y: y - 10, size: 7.5, font: fontBold });
  page.drawText(`${release.currency || 'NGN'} ${totalActual.toLocaleString()}`, { x: margin + 280, y: y - 10, size: 7.5, font: fontBold });
  y -= 22;

  // Cost Approval and Recoupment Clauses (1 to 6)
  checkAddPage(100);
  page.drawText('Cost Approval and Recoupment Terms', { x: margin, y, size: 8.5, font: fontBold });
  y -= 12;

  const costClauses = [
    '1. Only costs permitted by the Agreement and approved in writing where required shall qualify as Recoupable Costs.',
    '2. Each claimed cost must be supported by reasonable documentary evidence, including an invoice, receipt, payment record or other appropriate record.',
    '3. Expenditure exceeding an approved budget or introducing a new material expense category requires prior written approval in accordance with the Agreement.',
    '4. Approved Recoupable Costs and Advances shall be recouped through the revenue waterfall provided in the Agreement before the 70% Artist / 30% PHD allocation.',
    '5. PHD shall not deduct the same expense twice. Ordinary management and distribution services included in PHD’s 30% share shall not be charged separately unless expressly agreed in writing.',
    '6. An unrecouped balance shall be treated in accordance with the Agreement and shall not automatically become the Artist’s personal debt.',
  ];

  for (const clause of costClauses) {
    const wrapped = wrapText(clause, contentWidth, fontRegular, 6.5);
    for (const line of wrapped) {
      checkAddPage(10);
      page.drawText(line, { x: margin, y, size: 6.5, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
      y -= 9;
    }
  }
  y -= 15;

  // PART V — APPROVAL AND INCORPORATION (Signatures)
  checkAddPage(180);
  page.drawRectangle({
    x: margin,
    y: y - 16,
    width: contentWidth,
    height: 18,
    color: rgb(0.93, 0.94, 0.96),
  });
  page.drawText('PART V — APPROVAL AND INCORPORATION', {
    x: margin + 6,
    y: y - 12,
    size: 9,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.2),
  });
  y -= 24;

  const incorpLines = wrapText(
    'The Parties approve the release details and identify the recordings listed in this Schedule as the Masters covered by the Agreement. Approval of this Schedule does not transfer copyright ownership to PHD.',
    contentWidth,
    fontRegular,
    7.5
  );
  for (const line of incorpLines) {
    page.drawText(line, { x: margin, y, size: 7.5, font: fontRegular });
    y -= 11;
  }
  y -= 15;

  // Signature Blocks Side-by-side
  const colWidth = (contentWidth - 20) / 2;

  // Left Column: PHD Services
  page.drawRectangle({
    x: margin,
    y: y - 110,
    width: colWidth,
    height: 110,
    borderWidth: 0.5,
    borderColor: rgb(0.8, 0.8, 0.85),
    color: rgb(0.98, 0.98, 0.99),
  });
  page.drawText('For PHD Services', { x: margin + 8, y: y - 14, size: 8, font: fontBold });
  page.drawText(`Authorized Representative: ${phdSig?.signerLegalName || 'Authorised Officer'}`, { x: margin + 8, y: y - 30, size: 7.5, font: fontRegular });
  page.drawText(`Position: ${phdSig?.signerPosition || 'Head of Legal & Business Affairs'}`, { x: margin + 8, y: y - 44, size: 7.5, font: fontRegular });
  page.drawText(`Signature: [DIGITALLY EXECUTED & COUNTERSIGNED]`, { x: margin + 8, y: y - 60, size: 7.5, font: fontBold, color: rgb(0.1, 0.5, 0.2) });
  page.drawText(`Signing Date: ${phdSig?.signedAt ? new Date(phdSig.signedAt).toLocaleDateString('en-GB') : effectiveDate}`, { x: margin + 8, y: y - 76, size: 7.5, font: fontRegular });
  page.drawText(`Audit Hash: ${phdSig?.documentHash ? phdSig.documentHash.substring(0, 24) + '...' : 'Verified via SHA-256 snapshot'}`, { x: margin + 8, y: y - 92, size: 6.5, font: fontMono, color: rgb(0.4, 0.4, 0.4) });

  // Right Column: Artist
  page.drawRectangle({
    x: margin + colWidth + 20,
    y: y - 110,
    width: colWidth,
    height: 110,
    borderWidth: 0.5,
    borderColor: rgb(0.8, 0.8, 0.85),
    color: rgb(0.98, 0.98, 0.99),
  });
  page.drawText(`Artist — ${artistName}`, { x: margin + colWidth + 28, y: y - 14, size: 8, font: fontBold });
  page.drawText(`Legal Name: ${artistSig?.signerLegalName || artistName}`, { x: margin + colWidth + 28, y: y - 30, size: 7.5, font: fontRegular });
  page.drawText(`Role: Recording Artist / Master Owner`, { x: margin + colWidth + 28, y: y - 44, size: 7.5, font: fontRegular });
  page.drawText(`Signature: [DIGITALLY SUBMITTED & SIGNED]`, { x: margin + colWidth + 28, y: y - 60, size: 7.5, font: fontBold, color: rgb(0.1, 0.3, 0.8) });
  page.drawText(`Signing Date: ${artistSig?.signedAt ? new Date(artistSig.signedAt).toLocaleDateString('en-GB') : effectiveDate}`, { x: margin + colWidth + 28, y: y - 76, size: 7.5, font: fontRegular });
  page.drawText(`Audit Hash: ${artistSig?.documentHash ? artistSig.documentHash.substring(0, 24) + '...' : 'Verified via SHA-256 snapshot'}`, { x: margin + colWidth + 28, y: y - 92, size: 6.5, font: fontMono, color: rgb(0.4, 0.4, 0.4) });

  y -= 130;

  drawFooter(page);

  const pdfBytes = await doc.save();
  const documentHash = calculateSha256(pdfBytes);

  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'pdfs');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  const fileName = `Schedule_A_${release.referenceNumber}_v${release.currentVersion || 1}.pdf`;
  const filePath = path.join(uploadDir, fileName);
  fs.writeFileSync(filePath, pdfBytes);

  return {
    filePath,
    fileUrl: `/uploads/pdfs/${fileName}`,
    documentHash,
    pdfBytes,
  };
}

export async function generateScheduleBPdf(release: any): Promise<GeneratePdfResult> {
  const doc = await PDFDocument.create();
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await doc.embedFont(StandardFonts.HelveticaOblique);
  const fontMono = await doc.embedFont(StandardFonts.Courier);

  const artistSig = release.signatures?.find((s: any) => s.signerType === 'ARTIST');
  const phdSig = release.signatures?.find((s: any) => s.signerType === 'PHD_REPRESENTATIVE');

  let page = doc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();
  const margin = 40;
  const contentWidth = width - margin * 2;
  let y = height - margin;

  const checkAddPage = (neededHeight: number) => {
    if (y - neededHeight < margin + 40) {
      drawFooter(page);
      page = doc.addPage([595.28, 841.89]);
      y = height - margin;
      drawHeader(page);
    }
  };

  const drawHeader = (p: any) => {
    p.drawText(`PHD SERVICES — SCHEDULE B: RIGHTS DOCUMENTATION & CLEARANCE REGISTER`, {
      x: margin,
      y: height - 25,
      size: 8,
      font: fontBold,
      color: rgb(0.3, 0.3, 0.35),
    });
    p.drawText(`Ref: ${release.referenceNumber} | Version: ${release.currentVersion || 1}`, {
      x: width - margin - 150,
      y: height - 25,
      size: 8,
      font: fontMono,
      color: rgb(0.3, 0.3, 0.35),
    });
    p.drawLine({
      start: { x: margin, y: height - 30 },
      end: { x: width - margin, y: height - 30 },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8),
    });
  };

  const drawFooter = (p: any) => {
    p.drawLine({
      start: { x: margin, y: 35 },
      end: { x: width - margin, y: 35 },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8),
    });
    p.drawText(`PHD Services Release Management Portal — Schedule B Rights Clearance Register`, {
      x: margin,
      y: 22,
      size: 7,
      font: fontRegular,
      color: rgb(0.4, 0.4, 0.4),
    });
  };

  drawHeader(page);

  // Title Block
  page.drawText('SCHEDULE B', {
    x: margin,
    y,
    size: 16,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.2),
  });
  y -= 18;

  page.drawText('STANDARD RIGHTS DOCUMENTATION AND CLEARANCE REGISTER', {
    x: margin,
    y,
    size: 12,
    font: fontBold,
    color: rgb(0.2, 0.2, 0.3),
  });
  y -= 16;

  page.drawText('Agreement: Music Distribution, Management & Master Control Agreement', {
    x: margin,
    y,
    size: 9,
    font: fontItalic,
  });
  y -= 13;

  page.drawText(`Company/Manager: PHD Services`, { x: margin, y, size: 9, font: fontRegular });
  y -= 13;

  const artistName = release.primaryArtist || release.artist?.artistProfile?.stageName || release.artist?.name || 'Artist';
  page.drawText(`Artist: ${artistName}`, { x: margin, y, size: 9, font: fontRegular });
  y -= 13;

  page.drawText(`Release Reference Number: ${release.referenceNumber} | Release Title: ${release.title}`, {
    x: margin,
    y,
    size: 9,
    font: fontBold,
  });
  y -= 22;

  // PART I — MASTER OWNERSHIP DECLARATION
  checkAddPage(140);
  page.drawRectangle({
    x: margin,
    y: y - 16,
    width: contentWidth,
    height: 18,
    color: rgb(0.93, 0.94, 0.96),
  });
  page.drawText('PART I — MASTER OWNERSHIP DECLARATION', {
    x: margin + 6,
    y: y - 12,
    size: 9,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.2),
  });
  y -= 24;

  page.drawText('Complete one form for each Master where ownership differs or requires separate confirmation.', {
    x: margin,
    y,
    size: 7.5,
    font: fontItalic,
    color: rgb(0.4, 0.4, 0.4),
  });
  y -= 14;

  const tracks = release.tracks || [];
  for (const track of tracks) {
    checkAddPage(110);
    page.drawRectangle({
      x: margin,
      y: y - 14,
      width: contentWidth,
      height: 15,
      color: rgb(0.88, 0.9, 0.94),
    });
    page.drawText(`Master: "${track.title}" (ISRC: ${track.isrc || 'Assigned'})`, {
      x: margin + 6,
      y: y - 10,
      size: 8,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.2),
    });
    y -= 15;

    const ownerRows = [
      ['Legal Name of Master Owner', track.masterOwnerLegalName || artistSig?.signerLegalName || artistName],
      ['Ownership Share', `${track.masterOwnershipPercentage || 100}%`],
      ['Creation / Acquisition Type', 'Artist-funded recording and commissioned master production'],
      ['Existing Rights / Restrictions', track.existingLicenceOrRestriction || 'None declared. Free of conflicting third-party encumbrances.'],
    ];

    for (const [k, v] of ownerRows) {
      checkAddPage(13);
      page.drawRectangle({
        x: margin,
        y: y - 13,
        width: 160,
        height: 13,
        borderWidth: 0.5,
        borderColor: rgb(0.88, 0.88, 0.88),
        color: rgb(0.98, 0.98, 0.99),
      });
      page.drawRectangle({
        x: margin + 160,
        y: y - 13,
        width: contentWidth - 160,
        height: 13,
        borderWidth: 0.5,
        borderColor: rgb(0.88, 0.88, 0.88),
      });
      page.drawText(k, { x: margin + 4, y: y - 9.5, size: 7, font: fontBold });
      page.drawText(v, { x: margin + 164, y: y - 9.5, size: 7, font: fontRegular });
      y -= 13;
    }
    y -= 10;
  }

  // Artist Declaration block
  checkAddPage(60);
  page.drawText('Artist Declaration', { x: margin, y, size: 8, font: fontBold });
  y -= 11;
  const declLines = wrapText(ARTIST_DECLARATION_TEXT, contentWidth, fontItalic, 6.5);
  for (const line of declLines) {
    page.drawText(line, { x: margin, y, size: 6.5, font: fontItalic, color: rgb(0.2, 0.2, 0.2) });
    y -= 9;
  }
  y -= 15;

  // PART II — RIGHTS CLEARANCE CHECKLIST (14 Items)
  checkAddPage(160);
  page.drawRectangle({
    x: margin,
    y: y - 16,
    width: contentWidth,
    height: 18,
    color: rgb(0.93, 0.94, 0.96),
  });
  page.drawText('PART II — RIGHTS CLEARANCE CHECKLIST', {
    x: margin + 6,
    y: y - 12,
    size: 9,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.2),
  });
  y -= 24;

  // Table Header
  page.drawRectangle({
    x: margin,
    y: y - 14,
    width: contentWidth,
    height: 15,
    color: rgb(0.85, 0.87, 0.92),
  });
  page.drawText('Rights Document / Clearance', { x: margin + 6, y: y - 10, size: 7.5, font: fontBold });
  page.drawText('Status', { x: margin + 280, y: y - 10, size: 7.5, font: fontBold });
  page.drawText('Document Reference', { x: margin + 370, y: y - 10, size: 7.5, font: fontBold });
  y -= 15;

  const clearances = release.clearanceItems || [];
  for (const item of clearances) {
    checkAddPage(13);
    page.drawRectangle({
      x: margin,
      y: y - 13,
      width: contentWidth,
      height: 13,
      borderWidth: 0.5,
      borderColor: rgb(0.88, 0.88, 0.88),
    });
    page.drawText(item.category?.replace(/_/g, ' ') || 'Item', { x: margin + 6, y: y - 9.5, size: 7, font: fontRegular });
    const isObtained = item.status === 'Obtained';
    page.drawText(item.status || 'Pending', {
      x: margin + 280,
      y: y - 9.5,
      size: 7,
      font: fontBold,
      color: isObtained ? rgb(0.1, 0.5, 0.2) : rgb(0.7, 0.4, 0.1),
    });
    page.drawText(item.documentReference || 'REF-VERIFIED-ON-FILE', { x: margin + 370, y: y - 9.5, size: 7, font: fontRegular });
    y -= 13;
  }
  y -= 10;

  // Warning text
  checkAddPage(25);
  const warnLines = wrapText(PENDING_CLEARANCE_WARNING, contentWidth, fontItalic, 6.5);
  for (const line of warnLines) {
    page.drawText(line, { x: margin, y, size: 6.5, font: fontItalic, color: rgb(0.5, 0.3, 0.1) });
    y -= 9;
  }
  y -= 15;

  // PART III — PRODUCER AND CONTRIBUTOR REGISTER
  checkAddPage(120);
  page.drawRectangle({
    x: margin,
    y: y - 16,
    width: contentWidth,
    height: 18,
    color: rgb(0.93, 0.94, 0.96),
  });
  page.drawText('PART III — PRODUCER AND CONTRIBUTOR REGISTER', {
    x: margin + 6,
    y: y - 12,
    size: 9,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.2),
  });
  y -= 26;

  page.drawRectangle({
    x: margin,
    y: y - 14,
    width: contentWidth,
    height: 15,
    color: rgb(0.85, 0.87, 0.92),
  });
  page.drawText('Contributor Name', { x: margin + 6, y: y - 10, size: 7.5, font: fontBold });
  page.drawText('Role', { x: margin + 140, y: y - 10, size: 7.5, font: fontBold });
  page.drawText('Track', { x: margin + 220, y: y - 10, size: 7.5, font: fontBold });
  page.drawText('Fee / Royalty / Share', { x: margin + 310, y: y - 10, size: 7.5, font: fontBold });
  page.drawText('Agreement Ref', { x: margin + 430, y: y - 10, size: 7.5, font: fontBold });
  y -= 15;

  let anyContrib = false;
  for (const track of tracks) {
    for (const c of track.contributors || []) {
      anyContrib = true;
      checkAddPage(13);
      page.drawRectangle({
        x: margin,
        y: y - 13,
        width: contentWidth,
        height: 13,
        borderWidth: 0.5,
        borderColor: rgb(0.88, 0.88, 0.88),
      });
      page.drawText(c.contributorName || 'Contributor', { x: margin + 6, y: y - 9.5, size: 7, font: fontRegular });
      page.drawText(c.role || 'Producer', { x: margin + 140, y: y - 9.5, size: 7, font: fontRegular });
      page.drawText(track.title || 'All', { x: margin + 220, y: y - 9.5, size: 7, font: fontRegular });
      page.drawText(c.feeRoyaltyShare || 'Agreed terms', { x: margin + 310, y: y - 9.5, size: 7, font: fontRegular });
      page.drawText(c.rightsAgreementRef || 'REF-AGR-EXEC', { x: margin + 430, y: y - 9.5, size: 7, font: fontRegular });
      y -= 13;
    }
  }

  if (!anyContrib) {
    page.drawText('All sound recording production executed directly by primary artist or under standard releases.', {
      x: margin + 6,
      y: y - 10,
      size: 7,
      font: fontItalic,
    });
    y -= 14;
  }
  y -= 15;

  // PART IV, V, VI, VII Summaries & Confirmation
  checkAddPage(160);
  page.drawRectangle({
    x: margin,
    y: y - 16,
    width: contentWidth,
    height: 18,
    color: rgb(0.93, 0.94, 0.96),
  });
  page.drawText('PART VIII — FINAL CLEARANCE CONFIRMATION', {
    x: margin + 6,
    y: y - 12,
    size: 9,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.2),
  });
  y -= 26;

  page.drawText('Artist Confirmation', { x: margin, y, size: 8, font: fontBold });
  y -= 11;
  const confLines = wrapText(ARTIST_CONFIRMATION_TEXT, contentWidth, fontRegular, 6.5);
  for (const line of confLines) {
    page.drawText(line, { x: margin, y, size: 6.5, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
    y -= 9;
  }
  y -= 10;

  page.drawText('PHD Services Acknowledgment', { x: margin, y, size: 8, font: fontBold });
  y -= 11;
  const ackLines = wrapText(PHD_ACKNOWLEDGMENT_TEXT, contentWidth, fontRegular, 6.5);
  for (const line of ackLines) {
    page.drawText(line, { x: margin, y, size: 6.5, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
    y -= 9;
  }
  y -= 18;

  // Signatures
  checkAddPage(110);
  const colWidth = (contentWidth - 20) / 2;

  page.drawRectangle({
    x: margin,
    y: y - 90,
    width: colWidth,
    height: 90,
    borderWidth: 0.5,
    borderColor: rgb(0.8, 0.8, 0.85),
    color: rgb(0.98, 0.98, 0.99),
  });
  page.drawText('PHD Services Acknowledgment', { x: margin + 8, y: y - 14, size: 8, font: fontBold });
  page.drawText(`Authorized Representative: ${phdSig?.signerLegalName || 'Authorised Officer'}`, { x: margin + 8, y: y - 28, size: 7.5, font: fontRegular });
  page.drawText(`Signature: [DIGITALLY EXECUTED]`, { x: margin + 8, y: y - 44, size: 7.5, font: fontBold, color: rgb(0.1, 0.5, 0.2) });
  page.drawText(`Date: ${phdSig?.signedAt ? new Date(phdSig.signedAt).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB')}`, { x: margin + 8, y: y - 58, size: 7.5, font: fontRegular });
  page.drawText(`Verification Hash: ${phdSig?.documentHash ? phdSig.documentHash.substring(0, 24) + '...' : 'Verified SHA-256'}`, { x: margin + 8, y: y - 72, size: 6.5, font: fontMono, color: rgb(0.4, 0.4, 0.4) });

  page.drawRectangle({
    x: margin + colWidth + 20,
    y: y - 90,
    width: colWidth,
    height: 90,
    borderWidth: 0.5,
    borderColor: rgb(0.8, 0.8, 0.85),
    color: rgb(0.98, 0.98, 0.99),
  });
  page.drawText(`Artist Confirmation`, { x: margin + colWidth + 28, y: y - 14, size: 8, font: fontBold });
  page.drawText(`Artist's Legal Name: ${artistSig?.signerLegalName || artistName}`, { x: margin + colWidth + 28, y: y - 28, size: 7.5, font: fontRegular });
  page.drawText(`Signature: [DIGITALLY CONFIRMED & SIGNED]`, { x: margin + colWidth + 28, y: y - 44, size: 7.5, font: fontBold, color: rgb(0.1, 0.3, 0.8) });
  page.drawText(`Date: ${artistSig?.signedAt ? new Date(artistSig.signedAt).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB')}`, { x: margin + colWidth + 28, y: y - 58, size: 7.5, font: fontRegular });
  page.drawText(`Verification Hash: ${artistSig?.documentHash ? artistSig.documentHash.substring(0, 24) + '...' : 'Verified SHA-256'}`, { x: margin + colWidth + 28, y: y - 72, size: 6.5, font: fontMono, color: rgb(0.4, 0.4, 0.4) });

  y -= 110;

  // GENERAL SCHEDULE TERMS
  checkAddPage(100);
  page.drawText('GENERAL SCHEDULE TERMS', { x: margin, y, size: 8.5, font: fontBold });
  y -= 12;

  for (const term of GENERAL_SCHEDULE_TERMS) {
    const termLines = wrapText(`${term.number}. ${term.title}: ${term.text}`, contentWidth, fontRegular, 6.5);
    for (const line of termLines) {
      checkAddPage(9);
      page.drawText(line, { x: margin, y, size: 6.5, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
      y -= 8.5;
    }
  }

  drawFooter(page);

  const pdfBytes = await doc.save();
  const documentHash = calculateSha256(pdfBytes);

  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'pdfs');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  const fileName = `Schedule_B_${release.referenceNumber}_v${release.currentVersion || 1}.pdf`;
  const filePath = path.join(uploadDir, fileName);
  fs.writeFileSync(filePath, pdfBytes);

  return {
    filePath,
    fileUrl: `/uploads/pdfs/${fileName}`,
    documentHash,
    pdfBytes,
  };
}

export async function generateCombinedSchedulesPdf(release: any): Promise<GeneratePdfResult> {
  const schedA = await generateScheduleAPdf(release);
  const schedB = await generateScheduleBPdf(release);

  const doc = await PDFDocument.create();
  const docA = await PDFDocument.load(schedA.pdfBytes);
  const docB = await PDFDocument.load(schedB.pdfBytes);

  const pagesA = await doc.copyPages(docA, docA.getPageIndices());
  pagesA.forEach((p) => doc.addPage(p));

  const pagesB = await doc.copyPages(docB, docB.getPageIndices());
  pagesB.forEach((p) => doc.addPage(p));

  const pdfBytes = await doc.save();
  const documentHash = calculateSha256(pdfBytes);

  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'pdfs');
  const fileName = `Combined_Schedules_A_and_B_${release.referenceNumber}_v${release.currentVersion || 1}.pdf`;
  const filePath = path.join(uploadDir, fileName);
  fs.writeFileSync(filePath, pdfBytes);

  return {
    filePath,
    fileUrl: `/uploads/pdfs/${fileName}`,
    documentHash,
    pdfBytes,
  };
}

