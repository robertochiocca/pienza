import type { MeasurementSpec, PreviousValue } from '@pienza/domain';

/**
 * Vocabulario e historico de exemplo para o harness.
 *
 * Nao e seed de banco e nao e fixture de teste: e o material com que eu olho a tela.
 * Os valores sao de uma pessoa plausivel e nao de um caso limite, porque o objetivo
 * aqui e julgar composicao e leitura, e caso limite distorce as duas coisas.
 */
export const VOCABULARIO: readonly MeasurementSpec[] = [
  {
    key: 'wrist',
    labelPtBr: 'punho',
    unit: 'cm',
    kind: 'structural',
    bilateral: true,
    displayOrder: 10,
  },
  {
    key: 'ankle',
    labelPtBr: 'tornozelo',
    unit: 'cm',
    kind: 'structural',
    bilateral: true,
    displayOrder: 20,
  },
  {
    key: 'neck',
    labelPtBr: 'pescoço',
    unit: 'cm',
    kind: 'variable',
    bilateral: false,
    displayOrder: 30,
  },
  {
    key: 'chest',
    labelPtBr: 'peito',
    unit: 'cm',
    kind: 'variable',
    bilateral: false,
    displayOrder: 40,
  },
  {
    key: 'arm',
    labelPtBr: 'braço',
    unit: 'cm',
    kind: 'variable',
    bilateral: true,
    displayOrder: 50,
  },
  {
    key: 'waist',
    labelPtBr: 'cintura',
    unit: 'cm',
    kind: 'variable',
    bilateral: false,
    displayOrder: 60,
  },
  {
    key: 'hip',
    labelPtBr: 'quadril',
    unit: 'cm',
    kind: 'variable',
    bilateral: false,
    displayOrder: 70,
  },
  {
    key: 'thigh',
    labelPtBr: 'coxa',
    unit: 'cm',
    kind: 'variable',
    bilateral: true,
    displayOrder: 80,
  },
  {
    key: 'calf',
    labelPtBr: 'panturrilha',
    unit: 'cm',
    kind: 'variable',
    bilateral: true,
    displayOrder: 90,
  },
];

function agoraMenos(dias: number): Date {
  return new Date(Date.now() - dias * 86_400_000);
}

/** Historico de quem ja tem baseline: as estruturais medidas ha 40 dias, o resto ha 33. */
export const ANTERIORES: readonly PreviousValue[] = [
  { key: 'wrist', side: 'l', value: 16.8, lastTypedAt: agoraMenos(40) },
  { key: 'wrist', side: 'r', value: 17.0, lastTypedAt: agoraMenos(40) },
  { key: 'ankle', side: 'l', value: 22.4, lastTypedAt: agoraMenos(40) },
  { key: 'ankle', side: 'r', value: 22.4, lastTypedAt: agoraMenos(40) },
  { key: 'neck', side: 'na', value: 38.5, lastTypedAt: agoraMenos(33) },
  { key: 'chest', side: 'na', value: 99.0, lastTypedAt: agoraMenos(33) },
  { key: 'arm', side: 'l', value: 34.2, lastTypedAt: agoraMenos(33) },
  { key: 'arm', side: 'r', value: 35.1, lastTypedAt: agoraMenos(33) },
  { key: 'waist', side: 'na', value: 82.0, lastTypedAt: agoraMenos(33) },
  { key: 'hip', side: 'na', value: 98.0, lastTypedAt: agoraMenos(33) },
  { key: 'thigh', side: 'l', value: 56.0, lastTypedAt: agoraMenos(33) },
  { key: 'thigh', side: 'r', value: 56.4, lastTypedAt: agoraMenos(33) },
  { key: 'calf', side: 'l', value: 37.0, lastTypedAt: agoraMenos(33) },
  { key: 'calf', side: 'r', value: 37.2, lastTypedAt: agoraMenos(33) },
];
