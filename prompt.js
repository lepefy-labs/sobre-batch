// user: { name, lang, mood, index }
// mood: 'low' | 'neutral' | 'good' | 'great'
// lang: 'it' | 'fr'

const moodContextIT = {
  low: 'si sente stanca e un po\' giù di corda',
  neutral: 'si sente nella norma, né bene né male',
  good: 'si sente bene e abbastanza serena',
  great: 'si sente benissimo, in forma e positiva',
};

const moodContextFR = {
  low: 'se sent fatiguée et un peu déprimée',
  neutral: 'se sent dans la normale, ni bien ni mal',
  good: 'se sent bien et assez sereine',
  great: 'se sent très bien, en forme et positive',
};

export function buildMorningPrompt({ name, lang, mood }) {
  const isIT = lang === 'it';
  const moodCtx = isIT ? moodContextIT[mood] ?? moodContextIT.neutral : moodContextFR[mood] ?? moodContextFR.neutral;

  if (isIT) {
    return `Sei il motore editoriale di Sobre, una PWA di benessere per donne adulte.
Genera un pensiero del mattino (tipo "thought") per ${name}, che stamattina ${moodCtx}.

Tono editoriale:
- Voce calma, adulta, mai infantile né eccessivamente motivazionale
- Il distacco emotivo è forza consapevole, non freddezza
- Aforisma breve: 1-3 frasi, denso di significato, mai banale né ovvio
- Lingua italiana, registro contemporaneo e diretto

Rispondi SOLO con questo JSON (niente markdown, niente testo extra):
{
  "type": "thought",
  "slot": "morning",
  "body": "...",
  "mood_target": "low|neutral|good|great|null",
  "tags": ["tag1", "tag2"]
}

mood_target deve riflettere il mood a cui il pensiero si adatta meglio (null = universale).
tags: 2-4 parole chiave tematiche in italiano, minuscolo.`;
  }

  return `Tu es le moteur éditorial de Sobre, une PWA de bien-être pour femmes adultes.
Génère une pensée du matin (type "thought") pour ${name}, qui ce matin ${moodCtx}.

Ton éditorial :
- Voix calme, adulte, jamais infantile ni excessivement motivante
- Le détachement émotionnel est une force consciente, pas de la froideur
- Aphorisme court : 1-3 phrases, dense de sens, jamais banal ni évident
- Langue française, registre contemporain et direct

Réponds UNIQUEMENT avec ce JSON (pas de markdown, pas de texte supplémentaire) :
{
  "type": "thought",
  "slot": "morning",
  "body": "...",
  "mood_target": "low|neutral|good|great|null",
  "tags": ["tag1", "tag2"]
}

mood_target doit refléter le mood auquel la pensée s'adapte le mieux (null = universel).
tags : 2-4 mots-clés thématiques en français, minuscules.`;
}

export function buildEveningPrompt({ name, lang, mood, index }) {
  const isIT = lang === 'it';
  const moodCtx = isIT ? moodContextIT[mood] ?? moodContextIT.neutral : moodContextFR[mood] ?? moodContextFR.neutral;
  const isStory = index % 2 === 0;

  if (isStory) {
    if (isIT) {
      return `Sei il motore editoriale di Sobre, una PWA di benessere per donne adulte.
Genera una storia serale (tipo "story") per ${name}, che oggi ${moodCtx}.

Tono editoriale:
- Protagonista: donna tra 30 e 45 anni, nome italiano realistico
- Terza persona singolare, tono intimo e sobrio
- Lunghezza: 200-300 parole
- La storia mostra un momento quotidiano concreto — non una parabola, non una favola
- Il finale lascia spazio alla riflessione, non risolve tutto
- Nessuna morale esplicita, nessun lieto fine forzato
- Lingua italiana, registro letterario leggero

Rispondi SOLO con questo JSON (niente markdown, niente testo extra):
{
  "type": "story",
  "slot": "evening",
  "title": "...",
  "body": "...",
  "mood_target": "low|neutral|good|great|null",
  "tags": ["tag1", "tag2"]
}

mood_target deve riflettere il mood a cui la storia si adatta meglio (null = universale).
tags: 2-4 parole chiave tematiche in italiano, minuscolo.`;
    }

    return `Tu es le moteur éditorial de Sobre, une PWA de bien-être pour femmes adultes.
Génère une histoire du soir (type "story") pour ${name}, qui aujourd'hui ${moodCtx}.

Ton éditorial :
- Protagoniste : femme entre 30 et 45 ans, prénom français réaliste
- Troisième personne du singulier, ton intime et sobre
- Longueur : 200-300 mots
- L'histoire montre un moment quotidien concret — pas une parabole, pas un conte
- La fin laisse de la place à la réflexion, ne résout pas tout
- Aucune morale explicite, aucune fin heureuse forcée
- Langue française, registre littéraire léger

Réponds UNIQUEMENT avec ce JSON (pas de markdown, pas de texte supplémentaire) :
{
  "type": "story",
  "slot": "evening",
  "title": "...",
  "body": "...",
  "mood_target": "low|neutral|good|great|null",
  "tags": ["tag1", "tag2"]
}

mood_target doit refléter le mood auquel l'histoire s'adapte le mieux (null = universel).
tags : 2-4 mots-clés thématiques en français, minuscules.`;
  }

  // tip
  if (isIT) {
    return `Sei il motore editoriale di Sobre, una PWA di benessere per donne adulte.
Genera un consiglio serale (tipo "tip") per ${name}, che oggi ${moodCtx}.

Tono editoriale:
- Pratico, diretto, fondato — mai da "guru del benessere"
- Una singola azione concreta o una micro-abitudine realmente applicabile stasera
- Tono adulto: rispetta l'intelligenza di chi legge
- Niente elenchi puntati, niente step numerati — paragrafo unico
- 2-4 frasi al massimo
- Lingua italiana

Rispondi SOLO con questo JSON (niente markdown, niente testo extra):
{
  "type": "tip",
  "slot": "evening",
  "body": "...",
  "mood_target": "low|neutral|good|great|null",
  "tags": ["tag1", "tag2"]
}

mood_target deve riflettere il mood a cui il consiglio si adatta meglio (null = universale).
tags: 2-4 parole chiave tematiche in italiano, minuscolo.`;
  }

  return `Tu es le moteur éditorial de Sobre, une PWA de bien-être pour femmes adultes.
Génère un conseil du soir (type "tip") pour ${name}, qui aujourd'hui ${moodCtx}.

Ton éditorial :
- Pratique, direct, fondé — jamais façon "gourou du bien-être"
- Une seule action concrète ou une micro-habitude réellement applicable ce soir
- Ton adulte : respect de l'intelligence de la lectrice
- Pas de listes à puces, pas d'étapes numérotées — paragraphe unique
- 2-4 phrases maximum
- Langue française

Réponds UNIQUEMENT avec ce JSON (pas de markdown, pas de texte supplémentaire) :
{
  "type": "tip",
  "slot": "evening",
  "body": "...",
  "mood_target": "low|neutral|good|great|null",
  "tags": ["tag1", "tag2"]
}

mood_target doit refléter le mood auquel le conseil s'adapte le mieux (null = universel).
tags : 2-4 mots-clés thématiques en français, minuscules.`;
}
