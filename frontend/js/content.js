// Memuat konten pelajaran (content/*.json). File ini juga di-cache service worker.

export async function loadContent() {
  const names = ['modules', 'quiz', 'problems', 'badges'];
  const files = await Promise.all(names.map(async (name) => {
    const res = await fetch(`/content/${name}.json`);
    if (!res.ok) throw new Error(`Gagal memuat ${name}.json`);
    return res.json();
  }));
  const [modules, quiz, problems, badges] = files;
  return {
    modules: modules.modules,
    quiz,
    problems: problems.problems,
    badges: badges.badges,
  };
}
