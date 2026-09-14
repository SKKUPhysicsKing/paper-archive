const fs = require('node:fs/promises');
const path = require('node:path');

const PDF_EXTENSION = /\.pdf$/i;
const EXPLANATION_TOKEN =
  /(?:^|[\s._\-[\]()])(?:해설|설명|주석|노트|강의노트|commentary|explanation|explained|notes?|guide|summary|annotated|analysis)(?=$|[\s._\-[\]()])/i;
const TRAILING_EXPLANATION_TOKEN =
  /(?:[\s._\-[\]()]+(?:해설|설명|주석|노트|강의노트|commentary|explanation|explained|notes?|guide|summary|annotated|analysis))+[\s._\-[\]()]*/gi;
const FEATURED_TOKEN =
  /(?:^|[\s._\-[\]()])(?:대표|representative|featured|main|overview|review|introduction)(?=$|[\s._\-[\]()])/i;

function isPdf(name) {
  return PDF_EXTENSION.test(name);
}

function withoutExtension(name) {
  return name.replace(PDF_EXTENSION, '');
}

function isExplanationName(name) {
  return EXPLANATION_TOKEN.test(withoutExtension(name));
}

function normalizeTitle(value) {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(TRAILING_EXPLANATION_TOKEN, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function displayTitle(name) {
  return withoutExtension(name)
    .replace(TRAILING_EXPLANATION_TOKEN, ' ')
    .replace(/[_.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function pairPdfNames(names, pairOverrides = {}) {
  const pdfNames = names.filter(isPdf).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }),
  );
  const forcedExplanationNames = new Set(
    Object.values(pairOverrides).filter((name) => pdfNames.includes(name)),
  );
  const originals = pdfNames.filter(
    (name) => !isExplanationName(name) && !forcedExplanationNames.has(name),
  );
  const explanations = pdfNames.filter(
    (name) => isExplanationName(name) || forcedExplanationNames.has(name),
  );
  const availableExplanations = new Set(explanations);

  const entries = originals.map((originalName) => {
    const overrideName = pairOverrides[originalName];
    let explanationName =
      overrideName && availableExplanations.has(overrideName) ? overrideName : undefined;

    if (!explanationName) {
      const originalKey = normalizeTitle(withoutExtension(originalName));
      explanationName = explanations.find(
        (candidate) =>
          availableExplanations.has(candidate) &&
          normalizeTitle(withoutExtension(candidate)) === originalKey,
      );
    }

    if (!explanationName && originals.length === 1 && explanations.length === 1) {
      explanationName = explanations[0];
    }

    if (explanationName) availableExplanations.delete(explanationName);

    return {
      originalName,
      explanationName,
      title: displayTitle(originalName),
    };
  });

  for (const unmatchedName of availableExplanations) {
    entries.push({
      originalName: unmatchedName,
      explanationName: undefined,
      title: displayTitle(unmatchedName),
    });
  }

  return entries;
}

function scoreRepresentative(candidate, folderName) {
  const stem = withoutExtension(path.basename(candidate.relativePath));
  const folderKey = normalizeTitle(folderName);
  const stemKey = normalizeTitle(stem);
  let score = 0;

  if (candidate.depth === 0) score += 180;
  score -= candidate.depth * 28;
  if (FEATURED_TOKEN.test(stem)) score += 260;
  if (folderKey && stemKey.includes(folderKey)) score += 95;
  score += Math.max(0, 28 - Math.floor(stem.length / 4));

  return score;
}

function chooseRepresentative(candidates, folderName) {
  return [...candidates]
    .filter((candidate) => !isExplanationName(path.basename(candidate.relativePath)))
    .sort((a, b) => {
      const scoreDifference =
        scoreRepresentative(b, folderName) - scoreRepresentative(a, folderName);
      if (scoreDifference !== 0) return scoreDifference;
      return a.relativePath.localeCompare(b.relativePath, undefined, {
        numeric: true,
        sensitivity: 'base',
      });
    })[0];
}

async function collectPdfCandidates(directory, relativeBase = '', options = {}) {
  const maxDepth = options.maxDepth ?? 8;
  const maxFiles = options.maxFiles ?? 160;
  const candidates = [];

  async function visit(absoluteDirectory, relativeDirectory, depth) {
    if (depth > maxDepth || candidates.length >= maxFiles) return;

    let entries;
    try {
      entries = await fs.readdir(absoluteDirectory, { withFileTypes: true });
    } catch {
      return;
    }

    entries.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }),
    );

    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.isSymbolicLink()) continue;
      const relativePath = path.join(relativeDirectory, entry.name);
      if (entry.isFile() && isPdf(entry.name)) {
        candidates.push({ relativePath: joinPortablePath(relativeBase, relativePath), depth });
      }
      if (entry.isDirectory() && candidates.length < maxFiles) {
        await visit(path.join(absoluteDirectory, entry.name), relativePath, depth + 1);
      }
      if (candidates.length >= maxFiles) break;
    }
  }

  await visit(directory, '', 0);
  return candidates;
}

function createLibraryService({ getRoot, getPairOverrides }) {
  function resolveInsideRoot(relativePath = '') {
    const root = getRoot();
    if (!root) throw new Error('먼저 논문 폴더를 선택해 주세요.');

    const absoluteRoot = path.resolve(root);
    const absolutePath = path.resolve(absoluteRoot, fromPortablePath(relativePath));
    const insideRoot =
      absolutePath === absoluteRoot || absolutePath.startsWith(`${absoluteRoot}${path.sep}`);
    if (!insideRoot) throw new Error('선택한 논문 폴더 밖에는 접근할 수 없습니다.');
    return absolutePath;
  }

  async function listDirectory(relativePath = '') {
    const absoluteDirectory = resolveInsideRoot(relativePath);
    const directoryEntries = await fs.readdir(absoluteDirectory, { withFileTypes: true });
    const visibleEntries = directoryEntries.filter(
      (entry) => !entry.name.startsWith('.') && !entry.isSymbolicLink(),
    );

    const folderEntries = visibleEntries.filter((entry) => entry.isDirectory());
    const fileNames = visibleEntries.filter((entry) => entry.isFile()).map((entry) => entry.name);
    const allOverrides = getPairOverrides();
    const portableDirectoryPath = toPortablePath(relativePath);
    const directoryOverrides = {};
    const directOverrideTargets = new Set();
    for (const [originalPath, explanationPath] of Object.entries(allOverrides)) {
      if (portableDirname(originalPath) !== portableDirectoryPath) continue;
      directoryOverrides[portableBasename(originalPath)] = portableBasename(explanationPath);
      if (portableDirname(explanationPath) === portableDirectoryPath) {
        directOverrideTargets.add(portableBasename(explanationPath));
      }
    }

    const folders = await mapLimit(folderEntries, 6, async (entry) => {
      const childRelativePath = joinPortablePath(relativePath, entry.name);
      const candidates = await collectPdfCandidates(
        path.join(absoluteDirectory, entry.name),
        childRelativePath,
      );
      const representative = chooseRepresentative(candidates, entry.name);
      return {
        kind: 'folder',
        name: entry.name,
        relativePath: toPortablePath(childRelativePath),
        representativePdfPath: representative
          ? toPortablePath(representative.relativePath)
          : undefined,
      };
    });

    folders.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }),
    );

    const visibleFileNames = fileNames.filter((name) => !directOverrideTargets.has(name));
    const papers = pairPdfNames(visibleFileNames, directoryOverrides).map((entry) => {
      const originalPath = joinPortablePath(relativePath, entry.originalName);
      const overriddenExplanationPath = allOverrides[originalPath];
      const explanationPath = overriddenExplanationPath
        ? toPortablePath(overriddenExplanationPath)
        : entry.explanationName
          ? joinPortablePath(relativePath, entry.explanationName)
          : undefined;
      return {
        kind: 'paper',
        title: entry.title,
        originalName: entry.originalName,
        explanationName: explanationPath ? portableBasename(explanationPath) : undefined,
        originalPath,
        explanationPath,
      };
    });

    return {
      relativePath: toPortablePath(relativePath),
      folders,
      papers,
    };
  }

  async function readPdf(relativePath) {
    const absolutePath = resolveInsideRoot(relativePath);
    if (!isPdf(absolutePath)) throw new Error('PDF 파일만 열 수 있습니다.');
    return fs.readFile(absolutePath);
  }

  function relativeFromAbsolute(absolutePath) {
    const resolved = resolveInsideRoot(path.relative(getRoot(), absolutePath));
    return toPortablePath(path.relative(getRoot(), resolved));
  }

  return { listDirectory, readPdf, resolveInsideRoot, relativeFromAbsolute };
}

async function mapLimit(values, limit, mapper) {
  const output = new Array(values.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < values.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      output[currentIndex] = await mapper(values[currentIndex], currentIndex);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, values.length) }, () => worker()),
  );
  return output;
}

function toPortablePath(value = '') {
  return String(value)
    .replace(/\\/g, '/')
    .replace(/^\.\/+/, '')
    .replace(/\/+/g, '/')
    .replace(/\/$/, '');
}

function fromPortablePath(value = '') {
  return toPortablePath(value).split('/').filter(Boolean).join(path.sep);
}

function joinPortablePath(...parts) {
  return parts.map(toPortablePath).filter(Boolean).join('/');
}

function portableDirname(value) {
  const parts = toPortablePath(value).split('/').filter(Boolean);
  parts.pop();
  return parts.join('/');
}

function portableBasename(value) {
  return toPortablePath(value).split('/').filter(Boolean).at(-1) ?? '';
}

module.exports = {
  chooseRepresentative,
  createLibraryService,
  displayTitle,
  isExplanationName,
  normalizeTitle,
  pairPdfNames,
  scoreRepresentative,
};
