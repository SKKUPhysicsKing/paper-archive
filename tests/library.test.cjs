const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {
  chooseRepresentative,
  createLibraryService,
  isExplanationName,
  normalizeTitle,
  pairPdfNames,
} = require('../electron/library.cjs');

test('recognizes Korean and English explanation suffixes', () => {
  assert.equal(isExplanationName('BCS theory_해설.pdf'), true);
  assert.equal(isExplanationName('BCS theory-commentary.PDF'), true);
  assert.equal(isExplanationName('BCS theory.pdf'), false);
});

test('pairs an original with an explanation that shares its normalized title', () => {
  const [paper] = pairPdfNames([
    'Andreev_bound_states.pdf',
    'Andreev bound states - explanation.pdf',
  ]);

  assert.equal(paper.originalName, 'Andreev_bound_states.pdf');
  assert.equal(paper.explanationName, 'Andreev bound states - explanation.pdf');
});

test('pairs the only original and explanation even when their titles differ', () => {
  const [paper] = pairPdfNames(['original.pdf', '읽기 노트.pdf']);
  assert.equal(paper.explanationName, '읽기 노트.pdf');
});

test('manual pairing can designate a PDF without an explanation suffix', () => {
  const papers = pairPdfNames(['paper.pdf', 'companion.pdf'], {
    'paper.pdf': 'companion.pdf',
  });

  assert.equal(papers.length, 1);
  assert.equal(papers[0].explanationName, 'companion.pdf');
});

test('normalization removes separators and explanation markers', () => {
  assert.equal(normalizeTitle('Time-Domain_Braiding [해설]'), 'time domain braiding');
});

test('explicit representative papers outrank generic direct PDFs', () => {
  const chosen = chooseRepresentative(
    [
      { relativePath: 'topic/random.pdf', depth: 0 },
      { relativePath: 'topic/sub/representative review.pdf', depth: 1 },
    ],
    'topic',
  );

  assert.equal(chosen.relativePath, 'topic/sub/representative review.pdf');
});

test('library service returns folders, representative covers, and paired papers', async (context) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'paper-archive-test-'));
  context.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, 'Superconductivity'));
  await fs.writeFile(path.join(root, 'Superconductivity', 'BCS.pdf'), '%PDF-1.4');
  await fs.writeFile(path.join(root, 'Superconductivity', 'BCS_해설.pdf'), '%PDF-1.4');

  const service = createLibraryService({
    getRoot: () => root,
    getPairOverrides: () => ({}),
  });

  const rootListing = await service.listDirectory('');
  assert.equal(rootListing.folders[0].name, 'Superconductivity');
  assert.equal(
    rootListing.folders[0].representativePdfPath,
    'Superconductivity/BCS.pdf',
  );

  const topicListing = await service.listDirectory('Superconductivity');
  assert.equal(topicListing.papers.length, 1);
  assert.equal(topicListing.papers[0].originalPath, 'Superconductivity/BCS.pdf');
  assert.equal(
    topicListing.papers[0].explanationPath,
    'Superconductivity/BCS_해설.pdf',
  );
});

test('library service reads PDFs placed directly in the selected root', async (context) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'paper-archive-root-test-'));
  context.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.writeFile(path.join(root, 'root-paper.pdf'), '%PDF-1.4 root');
  await fs.writeFile(path.join(root, 'root-paper_해설.pdf'), '%PDF-1.4 notes');

  const service = createLibraryService({
    getRoot: () => root,
    getPairOverrides: () => ({}),
  });

  const listing = await service.listDirectory('');
  assert.equal(listing.relativePath, '');
  assert.equal(listing.papers.length, 1);
  assert.equal(listing.papers[0].originalPath, 'root-paper.pdf');
  assert.equal(listing.papers[0].explanationPath, 'root-paper_해설.pdf');

  const bytes = await service.readPdf(listing.papers[0].originalPath);
  assert.equal(bytes.toString(), '%PDF-1.4 root');
});

test('portable nested paths resolve on the host platform', async (context) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'paper-archive-path-test-'));
  context.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, 'topic', 'nested'), { recursive: true });
  await fs.writeFile(path.join(root, 'topic', 'nested', 'paper.pdf'), '%PDF-1.4');

  const service = createLibraryService({
    getRoot: () => root,
    getPairOverrides: () => ({}),
  });

  const bytes = await service.readPdf('topic/nested/paper.pdf');
  assert.equal(bytes.toString(), '%PDF-1.4');
});
