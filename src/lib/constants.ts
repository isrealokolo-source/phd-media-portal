export const APP_NAME = "PHD Services Release Management Portal";
export const DEFAULT_COMPANY_NAME = "PHD Services";
export const DEFAULT_ADMIN_EMAIL = "operations@phdservices.com";

export const RELEASE_STATUSES = [
  { key: "DRAFT", label: "Draft", badgeClass: "bg-zinc-800 text-zinc-300 border-zinc-700" },
  { key: "SUBMITTED_PENDING_APPROVAL", label: "Submitted (Pending Approval)", badgeClass: "bg-indigo-950 text-indigo-300 border-indigo-800" },
  { key: "REVISION_REQUESTED", label: "Revision Requested", badgeClass: "bg-amber-950 text-amber-300 border-amber-800" },
  { key: "RESUBMITTED", label: "Resubmitted", badgeClass: "bg-blue-950 text-blue-300 border-blue-800" },
  { key: "FULLY_EXECUTED_APPROVED", label: "Fully Executed & Approved", badgeClass: "bg-emerald-950 text-emerald-300 border-emerald-800" },
  { key: "ON_HOLD", label: "On Hold", badgeClass: "bg-rose-950 text-rose-300 border-rose-800" },
  { key: "WITHDRAWN", label: "Withdrawn", badgeClass: "bg-zinc-900 text-zinc-400 border-zinc-800" },
  { key: "TERMINATED", label: "Terminated", badgeClass: "bg-red-950 text-red-400 border-red-900" },
] as const;

export const CLEARANCE_CATEGORIES = [
  { id: "MASTER_OWNERSHIP_EVIDENCE", label: "Master ownership evidence", description: "Proof of ownership, assignment or original creation rights" },
  { id: "PRODUCER_AGREEMENT", label: "Producer agreement", description: "Signed agreement specifying producer rights, fee, master share and royalties" },
  { id: "BEAT_LICENCE_OR_PURCHASE_AGREEMENT", label: "Beat licence or purchase agreement", description: "Exclusive or non-exclusive beat licensing contract" },
  { id: "FEATURED_ARTIST_CONSENT_RELEASE", label: "Featured-artist consent/release", description: "Written permission, release and agreed terms for guest vocals/performances" },
  { id: "CO_OWNER_CONSENT_AGREEMENT", label: "Co-owner consent/agreement", description: "Written authority from all co-owners of the Master recording" },
  { id: "SAMPLE_CLEARANCE", label: "Sample clearance", description: "Master and publishing sample clearance agreements" },
  { id: "INTERPOLATION_COMPOSITION_PERMISSION", label: "Interpolation/composition permission", description: "Mechanical/composition permission for replayed or interpolated works" },
  { id: "SONGWRITER_COMPOSER_SPLIT_AGREEMENT", label: "Songwriter/composer split agreement", description: "Executed split sheet specifying musical composition ownership" },
  { id: "ARTWORK_PHOTOGRAPHY_LICENCE", label: "Artwork/photography licence", description: "Commercial visual art/photography release and designer agreement" },
  { id: "MUSIC_VIDEO_VISUAL_CONTENT_PERMISSIONS", label: "Music video/visual-content permissions", description: "Director, cast and location clearance for visual deliverables" },
  { id: "SESSION_MUSICIAN_PERFORMER_RELEASE", label: "Session musician/performer release, if required", description: "Work-for-hire or performance release for instrumentalists and backing vocalists" },
  { id: "PUBLISHER_COLLECTING_SOCIETY_INFORMATION", label: "Publisher/collecting-society information", description: "PRO/CMO affiliation details (PRS, BMI, ASCAP, SAMRO, COSON, MCSN)" },
  { id: "EXISTING_LICENCE_OR_DISTRIBUTION_AGREEMENT_REVIEW", label: "Existing licence or distribution agreement review", description: "Verification that prior distribution deals have expired or been lawfully released" },
  { id: "OTHER_THIRD_PARTY_PERMISSIONS", label: "Other third-party permissions", description: "Any additional third-party clearances, releases or waivers" },
] as const;

export const PENDING_CLEARANCE_WARNING = 
  "A clearance marked Pending must be resolved before the relevant Master is exploited in a manner requiring that clearance.";

export const DELIVERABLES_CONFIG = [
  {
    key: "final_audio_master",
    name: "Final audio master",
    responsibleParty: "Artist",
    required: true,
    accept: ".wav,.aif,.aiff,.flac",
    description: "Lossless uncompressed WAV/AIFF master (24-bit / 44.1kHz or higher recommended)",
  },
  {
    key: "clean_radio_edit",
    name: "Clean/radio edit, if required",
    responsibleParty: "Artist",
    required: false,
    accept: ".wav,.aif,.aiff,.mp3",
    description: "Censored / clean broadcast edit for radio & playlist promotion",
  },
  {
    key: "instrumental_acapella",
    name: "Instrumental/acapella, if agreed",
    responsibleParty: "Artist",
    required: false,
    accept: ".wav,.aif,.aiff,.mp3",
    description: "Instrumental and acapella master recordings for sync licensing",
  },
  {
    key: "cover_artwork",
    name: "Cover artwork",
    responsibleParty: "Artist / agreed designer",
    required: true,
    accept: ".jpg,.jpeg,.png",
    description: "Square 1:1 image, minimum 3000 x 3000 pixels, RGB color space, no unapproved logos",
  },
  {
    key: "track_metadata_credits",
    name: "Track metadata and credits",
    responsibleParty: "Artist",
    required: true,
    accept: ".pdf,.docx,.txt,.csv,.xlsx",
    description: "Complete credits: legal names, stage names, ISRC, songwriters, producers, engineers",
  },
  {
    key: "lyrics_explicit_declaration",
    name: "Lyrics and explicit-content declaration",
    responsibleParty: "Artist",
    required: true,
    accept: ".txt,.pdf,.docx,.lrc",
    description: "Accurate lyrics with explicit language indication for DSP editorial and sync lyrics",
  },
  {
    key: "producer_featured_agreements",
    name: "Producer and featured-artist agreements",
    responsibleParty: "Relevant Party",
    required: true,
    accept: ".pdf,.docx,.jpg,.png",
    description: "Fully executed agreements covering producer fees, splits and guest releases",
  },
  {
    key: "sample_beat_clearances",
    name: "Sample, beat and other rights clearances",
    responsibleParty: "Relevant Party",
    required: true,
    accept: ".pdf,.docx,.jpg,.png",
    description: "Clearance licences, beat purchase contracts and mechanical permissions",
  },
  {
    key: "promotional_photos_bio",
    name: "Promotional photographs and biography",
    responsibleParty: "Artist",
    required: false,
    accept: ".jpg,.jpeg,.png,.pdf,.docx",
    description: "High-resolution artist press photos and updated biography for DSP pitches",
  },
  {
    key: "release_marketing_plan",
    name: "Release and marketing plan",
    responsibleParty: "PHD and Artist",
    required: false,
    accept: ".pdf,.docx,.xlsx",
    description: "Co-developed campaign schedule, rollout strategy and promotional initiatives",
  },
  {
    key: "dsp_submission",
    name: "DSP submission",
    responsibleParty: "PHD",
    required: false,
    accept: ".pdf,.png,.jpg",
    description: "Distribution delivery confirmation and pitching submissions to streaming platforms",
  },
  {
    key: "release_confirmation",
    name: "Release confirmation",
    responsibleParty: "PHD",
    required: false,
    accept: ".pdf,.png,.jpg",
    description: "Official release confirmation, live smartlinks and DSP distribution verification",
  },
] as const;

export const EXPENSE_CATEGORIES = [
  "Recording/mastering",
  "Artwork/design",
  "Music video/visual content",
  "Digital advertising",
  "Public relations/publicity",
  "Approved promotional campaign",
  "Other approved third-party costs",
] as const;

export const RECOUPMENT_LEGAL_NOTICE = 
  "Only costs permitted by the Agreement and approved in writing where required shall qualify as Recoupable Costs. PHD shall not deduct the same expense twice. Ordinary management and distribution services included in PHD's 30% share shall not be charged separately unless expressly agreed in writing. An unrecouped balance shall be treated in accordance with the Agreement and shall not automatically become the Artist's personal debt.";

export const GENERAL_SCHEDULE_TERMS = [
  {
    number: 1,
    title: "Incorporation",
    text: "Schedules A and B form part of the Agreement once duly approved and incorporated by the Parties.",
  },
  {
    number: 2,
    title: "Ownership",
    text: "Nothing in either Schedule transfers copyright ownership to PHD. The Artist or other lawful owner retains ownership as identified in the applicable register.",
  },
  {
    number: 3,
    title: "Scope of control",
    text: "PHD's distribution, management and exploitation authority is limited to the Masters accepted under the Agreement and remains subject to its duration, approval requirements and other terms.",
  },
  {
    number: 4,
    title: "Changes",
    text: "Additions or material changes to a Master's ownership, rights status or scope must be documented in writing and approved in accordance with the Agreement.",
  },
  {
    number: 5,
    title: "Conflicts",
    text: "If a Schedule conflicts with the main Agreement, the main Agreement prevails unless the Parties expressly agree in writing to vary the relevant provision.",
  },
  {
    number: 6,
    title: "Records",
    text: "Each Party shall retain relevant approvals, licences, clearances and expenditure records in accordance with the Agreement and applicable law.",
  },
];

export const ARTIST_DECLARATION_TEXT = 
  "The Artist confirms that the information provided in this declaration is accurate to the best of the Artist's knowledge, subject to the disclosures made above. The Artist has disclosed material third-party interests and restrictions known to the Artist and shall obtain the permissions required for the exploitation authorized under the Agreement. This declaration does not replace the warranties, indemnities or other obligations in the main Agreement.";

export const ARTIST_CONFIRMATION_TEXT = 
  "I confirm that I have disclosed the material ownership interests and third-party rights known to me relating to the Masters identified in Schedule A and have supplied the documents recorded in this Schedule, except for any items expressly marked pending or disclosed in writing.";

export const PHD_ACKNOWLEDGMENT_TEXT = 
  "PHD acknowledges receipt of the documents listed in this Schedule. Receipt or review does not constitute a guarantee that every third-party right has been independently verified, nor does it waive any right or obligation under the main Agreement.";

export const DEFAULT_DSPS = [
  "Spotify",
  "Apple Music",
  "YouTube Music",
  "Audiomack",
  "TIDAL",
  "Amazon Music",
  "TikTok/Meta",
  "Boomplay",
  "Deezer",
];

export const CURRENCIES = ["NGN", "USD", "GBP", "EUR"] as const;

