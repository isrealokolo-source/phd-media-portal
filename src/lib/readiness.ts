export interface ReadinessEvaluation {
  score: number;
  submissionReady: boolean;
  clearanceReady: boolean;
  criticalBlockers: string[];
  warnings: string[];
  completedItems: string[];
  outstandingItems: string[];
  breakdown: {
    releaseInfo: { score: number; complete: boolean; details: string };
    tracks: { score: number; complete: boolean; details: string };
    ownershipSplits: { score: number; complete: boolean; details: string };
    rightsClearance: { score: number; complete: boolean; details: string };
    deliverables: { score: number; complete: boolean; details: string };
    budget: { score: number; complete: boolean; details: string };
  };
}

export function evaluateReleaseReadiness(release: any): ReadinessEvaluation {
  const criticalBlockers: string[] = [];
  const warnings: string[] = [];
  const completedItems: string[] = [];
  const outstandingItems: string[] = [];

  // 1. Release Information (Weight: 15%)
  let releaseInfoScore = 0;
  if (release.title && release.title.trim()) {
    releaseInfoScore += 5;
    completedItems.push('Release title specified');
  } else {
    criticalBlockers.push('Release title is missing');
    outstandingItems.push('Add release title');
  }

  if (release.primaryArtist && release.primaryArtist.trim()) {
    releaseInfoScore += 5;
    completedItems.push('Primary artist defined');
  } else {
    criticalBlockers.push('Primary artist is missing');
    outstandingItems.push('Specify primary artist');
  }

  if (release.plannedReleaseDate) {
    releaseInfoScore += 5;
    completedItems.push('Planned release date chosen');
  } else {
    warnings.push('Planned release date not set');
    outstandingItems.push('Set planned release date');
  }

  // 2. Tracks & Master Recording Register (Weight: 25%)
  let tracksScore = 0;
  const tracks = release.tracks || [];
  if (tracks.length > 0) {
    tracksScore += 10;
    completedItems.push(`${tracks.length} track(s) registered`);

    let allHaveAudio = true;
    let allHaveIsrc = true;
    let allHaveDuration = true;

    for (const t of tracks) {
      if (!t.audioFileUrl && t.finalMasterDelivered !== 'Yes') {
        allHaveAudio = false;
      }
      if (!t.isrc) {
        allHaveIsrc = false;
      }
      if (!t.duration) {
        allHaveDuration = false;
      }
    }

    if (allHaveAudio) {
      tracksScore += 10;
      completedItems.push('Audio master provided for all tracks');
    } else {
      criticalBlockers.push('One or more tracks are missing an audio master');
      outstandingItems.push('Upload audio master for all registered tracks');
    }

    if (allHaveIsrc) {
      tracksScore += 5;
      completedItems.push('ISRCs assigned');
    } else {
      warnings.push('Some tracks are missing assigned ISRC codes');
      outstandingItems.push('Assign ISRCs to all tracks');
    }
  } else {
    criticalBlockers.push('No tracks added to release');
    outstandingItems.push('Add at least one track to the Master Recording Register');
  }

  // 3. Ownership & Splits (Weight: 20%)
  let ownershipScore = 0;
  if (tracks.length > 0) {
    let splitsValid = true;
    let anyDeclared = false;

    for (const t of tracks) {
      const percentage = Number(t.masterOwnershipPercentage || 0);
      if (percentage > 0) anyDeclared = true;
      if (percentage !== 100) {
        splitsValid = false;
        warnings.push(`Track "${t.title}" master ownership declared at ${percentage}% (must total 100% unless disclosed exception)`);
      }
    }

    if (anyDeclared && splitsValid) {
      ownershipScore = 20;
      completedItems.push('Master ownership totals exactly 100% across all tracks');
    } else if (anyDeclared) {
      ownershipScore = 12;
      outstandingItems.push('Verify and reconcile master ownership splits to 100%');
    } else {
      criticalBlockers.push('Master ownership percentages not completed');
      outstandingItems.push('Complete legal master ownership percentages in Schedule B');
    }
  }

  // 4. Rights Documentation & Clearances (Weight: 20%)
  let clearanceScore = 0;
  const clearances = release.clearanceItems || [];
  if (clearances.length > 0) {
    const pendingItems = clearances.filter((c: any) => c.status === 'Pending');
    const obtainedItems = clearances.filter((c: any) => c.status === 'Obtained');

    if (obtainedItems.length > 0) {
      completedItems.push(`${obtainedItems.length} clearance documentation item(s) obtained`);
    }

    if (pendingItems.length > 0) {
      warnings.push(`${pendingItems.length} clearance item(s) currently marked Pending (must be resolved before commercial exploitation)`);
      outstandingItems.push('Resolve pending clearance items');
      clearanceScore = Math.max(5, 20 - pendingItems.length * 2);
    } else {
      clearanceScore = 20;
      completedItems.push('All rights clearance checklist categories assessed');
    }
  } else {
    warnings.push('Rights clearance checklist not yet completed');
    outstandingItems.push('Complete the 14-item Rights Clearance Checklist in Schedule B');
  }

  // 5. Deliverables (Weight: 15%)
  let deliverablesScore = 0;
  const deliverables = release.deliverables || [];
  const artworkDel = deliverables.find((d: any) => d.deliverableKey === 'cover_artwork');
  const masterDel = deliverables.find((d: any) => d.deliverableKey === 'final_audio_master');

  if (artworkDel && (artworkDel.status === 'Uploaded' || artworkDel.status === 'Approved' || artworkDel.fileUrl)) {
    deliverablesScore += 8;
    completedItems.push('Cover artwork uploaded');
  } else {
    criticalBlockers.push('Cover artwork has not been uploaded');
    outstandingItems.push('Upload cover artwork (square 1:1, 3000x3000px)');
  }

  if (masterDel && (masterDel.status === 'Uploaded' || masterDel.status === 'Approved' || masterDel.fileUrl)) {
    deliverablesScore += 7;
    completedItems.push('Final master deliverable verified');
  } else if (tracksScore >= 20) {
    deliverablesScore += 7;
    completedItems.push('Final master deliverable accounted for in track register');
  } else {
    warnings.push('Deliverables schedule pending final master verification');
    outstandingItems.push('Confirm final audio master deliverable');
  }

  // 6. Budget (Weight: 5%)
  let budgetScore = 5;
  const budgetItems = release.budgetItems || [];
  if (budgetItems.length > 0) {
    completedItems.push(`${budgetItems.length} budget item(s) logged in expense ledger`);
  } else {
    completedItems.push('Release budget ledger ready');
  }

  const totalScore = Math.min(100, Math.round(
    releaseInfoScore + tracksScore + ownershipScore + clearanceScore + deliverablesScore + budgetScore
  ));

  const submissionReady = criticalBlockers.length === 0 && totalScore >= 70;
  const clearanceReady = (release.clearanceItems || []).some((c: any) => c.status === 'Obtained') &&
    !(release.clearanceItems || []).some((c: any) => c.status === 'Pending' && c.category === 'MASTER_OWNERSHIP_EVIDENCE');

  return {
    score: totalScore,
    submissionReady,
    clearanceReady,
    criticalBlockers,
    warnings,
    completedItems,
    outstandingItems,
    breakdown: {
      releaseInfo: { score: releaseInfoScore, complete: releaseInfoScore >= 15, details: 'Title, primary artist, and planned release date' },
      tracks: { score: tracksScore, complete: tracksScore >= 25, details: 'Master recording register and audio master files' },
      ownershipSplits: { score: ownershipScore, complete: ownershipScore >= 20, details: '100% reconciled master ownership shares' },
      rightsClearance: { score: clearanceScore, complete: clearanceScore >= 20, details: '14-point Schedule B checklist and licence attachments' },
      deliverables: { score: deliverablesScore, complete: deliverablesScore >= 15, details: 'WAV masters, 3000x3000px cover artwork, credits' },
      budget: { score: budgetScore, complete: true, details: 'Expense ledger and recoupment terms' },
    },
  };
}

