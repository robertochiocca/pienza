/**
 * Numeros de produto que o app usa, copiados de `product_settings`.
 *
 * Sao copia declarada, nao fonte de verdade. A fonte e o banco, onde cada linha carrega
 * natureza e motivo escritos; o app vai le-los de la quando estiver ligado ao Supabase.
 * Ate entao, este arquivo existe para que a copia seja uma so — App.tsx e o harness
 * liam o mesmo 180 de dois lugares diferentes, e duas copias de um numero divergem no
 * dia em que alguem ajusta uma.
 *
 * Aqui entra so o que vale independentemente de qual forma o grafico tomar. Os numeros
 * da escala radial ficam onde estao, no ponto de chamada do hexagono, porque eles
 * dependem de uma decisao que ainda nao foi tomada — ver ADR 0013 e 0014.
 */

/**
 * Ha quantos dias uma medida estrutural volta a ser proposta na sessao guiada.
 * `product_settings.structural_remeasure_days`.
 */
export const DIAS_PARA_REMEDIR_ESTRUTURAL = 180;
