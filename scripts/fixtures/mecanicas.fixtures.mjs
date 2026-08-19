// Fixtures do gate de mecanicas proibidas.
//
// Vivem fora do script por um motivo concreto: uma fixture e, por construcao, uma
// string que contem exatamente o que outro gate procura. A do gate de segredos
// continha "Xp" e foi acusada como gamificacao — dois gates corretos se
// atropelando. Cada gate pula `scripts/fixtures/`, e so carrega o proprio arquivo.

export const POSITIVAS = [
  ['continuidade', 'const streakDays = 7;'],
  ['continuidade', 'const userStreak = contarSemanas();'],
  ['continuidade', 'texto: "3 semanas seguidas"'],
  ['recompensa', 'render(<Badge value={3} />)'],
  ['recompensa', 'const experienceXP = 120;'],
  ['recompensa', 'const award_medal = true;'],
  ['notificacao', "import * as N from 'expo-notifications';"],
  ['notificacao', 'await Notifications.scheduleNotificationAsync(cfg);'],
  ['social', 'const leaderboardQuery = sql;'],
  ['social', 'label: "seguidores"'],
  ['ingestao', "const meta = 'meta calorica diaria';"],
  ['ingestao', 'const alvo = 2000; // kcal'],
  ['ingestao', 'const deficit = 500;'],
  ['corpo-simulado', 'titulo: "antes e depois"'],
  ['assimetria', 'const asymmetryIndex = dir - esq;'],
  ['assimetria', 'const indiceDeAssimetria = calcular();'],
  ['assimetria', 'const scoreAssimetria = 0.4;'],
  ['peso-como-progresso', 'label: "seu progresso de peso"'],
  ['inspiracao-como-alvo', 'const d = distanciaAteInspiracao(meta);'],
];

export const NEGATIVAS = [
  'const expression = /abc/;',
  'const carregamentoProgressivo = true;',
  'select * from sequencia_de_migrations;',
  'const rankByDate = (a, b) => a.date - b.date;',
  'const weight = medidas.weight;',
  '<ProgressBar value={0.4} />',
  'const experimento = false;',
  'const mediaDosLados = (l + r) / 2;',
  'const dif = direito - esquerdo;',
  'const diferencaEntreLados = d - e;',
  'label: "D 38,2 · E 37,4 · dif 0,8"',
];
